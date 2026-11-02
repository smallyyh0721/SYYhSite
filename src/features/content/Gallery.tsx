"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { works as seedWorks, workThemes, type Work, type WorkThemeId } from "@/lib/contracts";
import GalleryMedia from "./GalleryMedia";
import styles from "./Gallery.module.css";
import {
  listPathFrom,
  overlayFromState,
  pushHistory,
  readSnapshot,
  replaceHistory,
  writeSnapshot,
  type OverlayHistory,
} from "./galleryHistory";
import {
  coverAlt,
  emptyCopy,
  formalTheme,
  galleryItems,
  isFilterId,
  shouldOpenFromClick,
  visibleItems,
  workArt,
  workHref,
  type FilterId,
} from "./galleryModel";

const focusableSelector =
  "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[hidden]"),
  );
}

export default function Gallery({ initialThemeId, works = seedWorks }: { initialThemeId?: WorkThemeId; works?: Work[] }) {
  const pathname = usePathname();
  const listPath = useRef(listPathFrom(pathname));
  const items = useMemo(() => galleryItems(works), [works]);
  const [filter, setFilter] = useState<FilterId>(initialThemeId ?? "all");
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef(0);
  const pushedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastNavRef = useRef<"prev" | "next" | "close">("close");
  const visible = useMemo(() => visibleItems(filter, items), [filter, items]);
  const groups = useMemo(() => {
    const themes = initialThemeId ? workThemes.filter((theme) => theme.id === initialThemeId) : workThemes;
    return themes
      .map((theme) => ({
        id: theme.id,
        label: theme.name,
        items: visible.filter((item) => item.themeId === theme.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [initialThemeId, visible]);
  const current = dialogId ? visible.find((item) => item.id === dialogId) ?? null : null;
  const dialogPosition = current ? visible.findIndex((item) => item.id === current.id) : -1;

  useEffect(() => {
    const saved = readSnapshot();
    const fromWork = Boolean(saved?.href && /^\/works\/(?!themes\/)[^/]+/.test(saved.href));
    if (fromWork && saved && saved.path === listPath.current && isFilterId(saved.filter)) {
      setFilter(saved.filter);
    }
    setHydrated(true);
    setMounted(true);
  }, []);

  const persist = useCallback(
    (extra: Partial<{ href: string; itemId: string; index: number; scroll: number }> = {}) => {
      writeSnapshot({
        path: listPath.current,
        scroll: extra.scroll ?? window.scrollY,
        href: extra.href,
        index: extra.index,
        filter,
        itemId: extra.itemId,
      });
    },
    [filter],
  );

  useEffect(() => {
    if (!hydrated) return;
    persist();
  }, [filter, persist, hydrated]);

  const hideDialog = useCallback(() => {
    const trigger = triggerRef.current;
    const y = scrollRef.current;
    setDialogId(null);
    document.body.style.overflow = "";
    document.getElementById("main")?.removeAttribute("inert");
    window.scrollTo({ top: y, behavior: "instant" });
    if (trigger && typeof trigger.focus === "function") {
      trigger.focus({ preventScroll: true });
      trigger.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
    }
  }, []);

  const applyOverlay = useCallback(
    (overlay: OverlayHistory | null) => {
      if (overlay?.open && overlay.itemId) {
        const nextFilter = isFilterId(overlay.filter) ? overlay.filter : filter;
        const group = visibleItems(nextFilter, items);
        const item = group.find((entry) => entry.id === overlay.itemId);
        if (item) {
          setFilter(nextFilter);
          setDialogId(item.id);
          document.body.style.overflow = "hidden";
          return;
        }
      }
      hideDialog();
    },
    [filter, hideDialog, items],
  );

  const openDialog = useCallback(
    (id: string, trigger?: HTMLElement | null) => {
      const item = visible.find((entry) => entry.id === id);
      if (!item) return;
      triggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      scrollRef.current = window.scrollY;
      lastNavRef.current = "close";
      setDialogId(item.id);
      document.body.style.overflow = "hidden";
      const index = visible.findIndex((entry) => entry.id === item.id);
      persist({ href: workHref(item.work.slug), itemId: item.id, index, scroll: scrollRef.current });
      replaceHistory(listPath.current, {
        v: 1,
        open: false,
        filter,
        listPath: listPath.current,
        itemId: item.id,
      });
      pushHistory(workHref(item.work.slug), {
        v: 1,
        open: true,
        filter,
        listPath: listPath.current,
        itemId: item.id,
        slug: item.work.slug,
      });
      pushedRef.current = true;
    },
    [filter, persist, visible],
  );

  const requestClose = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
      return;
    }
    hideDialog();
  }, [hideDialog]);

  const moveDialog = useCallback(
    (step: number) => {
      if (!dialogId || visible.length < 2) return;
      const index = visible.findIndex((item) => item.id === dialogId);
      if (index < 0) return;
      const next = visible[(index + step + visible.length) % visible.length];
      lastNavRef.current = step < 0 ? "prev" : "next";
      setDialogId(next.id);
      persist({ href: workHref(next.work.slug), itemId: next.id, index: (index + step + visible.length) % visible.length, scroll: scrollRef.current });
      replaceHistory(workHref(next.work.slug), {
        v: 1,
        open: true,
        filter,
        listPath: listPath.current,
        itemId: next.id,
        slug: next.work.slug,
      });
    },
    [dialogId, filter, persist, visible],
  );

  useEffect(() => {
    if (!hydrated || !dialogId) return;
    if (visible.some((item) => item.id === dialogId)) return;
    requestClose();
  }, [dialogId, hydrated, requestClose, visible]);

  useEffect(() => {
    const onPop = () => {
      const overlay = overlayFromState(history.state);
      pushedRef.current = Boolean(overlay?.open);
      applyOverlay(overlay);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyOverlay]);

  useEffect(() => {
    if (!current) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = focusables(dialog);
    const prev = nodes.find((node) => node.textContent === "上一件");
    const next = nodes.find((node) => node.textContent === "下一件");
    const close = nodes.find((node) => node.classList.contains(styles.closeBtn) || node.textContent === "关闭");
    if (lastNavRef.current === "prev" && prev) prev.focus();
    else if (lastNavRef.current === "next" && next) next.focus();
    else close?.focus();
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveDialog(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveDialog(1);
        return;
      }
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const nodes = focusables(dialog);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, moveDialog, requestClose]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (current) main?.setAttribute("inert", "");
    else main?.removeAttribute("inert");
    return () => main?.removeAttribute("inert");
  }, [current]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.getElementById("main")?.removeAttribute("inert");
    };
  }, []);

  return (
    <article className={styles.page} data-gallery="works" data-filter={filter} data-count={visible.length}>
      <header className={styles.heading}>
        <h1 tabIndex={-1}>{filter === "all" ? "作品" : formalTheme(filter).label}</h1>
      </header>

      {groups.length ? (
        <div className={styles.seriesList}>
          {groups.map((group) => (
            <section key={group.id} className={styles.series} aria-label={group.label}>
              {filter === "all" ? <h2 className={styles.seriesName}>{group.label}</h2> : null}
              <div className={styles.plates}>
                {group.items.map((item, index) => (
                  <article key={item.id} className={styles.plate} data-work={item.work.slug} data-theme={item.themeId}>
                    <GalleryMedia
                      className={styles.quietStage}
                      src={workArt(item.work)}
                      alt={coverAlt(item.work)}
                      fit="contain"
                      priority={index === 0}
                      fallbackLabel={item.work.title}
                      openLabel={`查看大图：${item.work.title}`}
                      onOpen={(stage) => openDialog(item.id, stage)}
                    />
                    <h3 className={styles.plateTitle}>
                      <a className={styles.cardLink} href={workHref(item.work.slug)} data-gallery-id={item.id}>
                        {item.work.title}
                      </a>
                    </h3>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.empty} data-empty={filter}>
          {emptyCopy(filter)}
        </p>
      )}

      {initialThemeId ? (
        <nav className={styles.returns} aria-label="返回">
          <Link className={styles.textBack} href="/works/">
            作品
          </Link>
        </nav>
      ) : null}

      {mounted && current
        ? createPortal(
            <div className={styles.dialogRoot} data-open="true">
              <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="gallery-dialog-title"
              >
                <div className={styles.chrome}>
                  <div>
                    <h2 id="gallery-dialog-title" className={styles.dialogTitle} aria-live="polite">
                      {current.work.title}
                    </h2>
                    <p className={styles.hint}>
                      {dialogPosition + 1} / {visible.length}
                    </p>
                  </div>
                  <button type="button" className={styles.closeBtn} onClick={requestClose}>
                    关闭
                  </button>
                </div>
                <GalleryMedia
                  className={styles.dialogStage}
                  src={workArt(current.work)}
                  alt={coverAlt(current.work)}
                  fit="contain"
                  priority
                  fallbackLabel={current.work.title}
                />
                <div className={styles.dialogNav}>
                  <button type="button" className={styles.navBtn} disabled={visible.length < 2} onClick={() => moveDialog(-1)}>
                    上一件
                  </button>
                  <Link
                    className={styles.detailLink}
                    href={workHref(current.work.slug)}
                    onClick={(event) => {
                      if (!shouldOpenFromClick(event)) return;
                      persist({
                        href: workHref(current.work.slug),
                        itemId: current.id,
                        scroll: scrollRef.current,
                      });
                      document.body.style.overflow = "";
                      const url = workHref(current.work.slug);
                      const here = window.location.pathname.endsWith("/")
                        ? window.location.pathname
                        : `${window.location.pathname}/`;
                      if (here === url) {
                        event.preventDefault();
                        window.location.assign(url);
                      }
                    }}
                  >
                    查看
                  </Link>
                  <button type="button" className={styles.navBtn} disabled={visible.length < 2} onClick={() => moveDialog(1)}>
                    下一件
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
