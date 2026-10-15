"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { workThemes, type WorkThemeId } from "@/lib/contracts";
import { useTheme } from "@/state/Theme";
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
  FILTERS,
  featuredWork,
  formalTheme,
  galleryItems,
  isFilterId,
  layoutCopy,
  themeRecord,
  visibleItems,
  workArt,
  workHref,
  type FilterId,
  type GalleryItem,
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

export default function Gallery({ initialThemeId }: { initialThemeId?: WorkThemeId }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const listPath = useRef(listPathFrom(pathname));
  const items = useMemo(() => galleryItems(), []);
  const [filter, setFilter] = useState<FilterId>(initialThemeId ?? "all");
  const [dialogIndex, setDialogIndex] = useState<number | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef(0);
  const pushedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastNavRef = useRef<"prev" | "next" | "close">("close");
  const visible = useMemo(() => visibleItems(filter, items), [filter, items]);
  const featured = featuredWork(filter);
  const featuredItem =
    featured &&
    visible.find((item) => item.work.slug === featured.slug && item.crop.key === "wide");

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
    setDialogIndex(null);
    setExplainOpen(false);
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
        const index = group.findIndex((item) => item.id === overlay.itemId);
        if (index >= 0) {
          setFilter(nextFilter);
          setDialogIndex(index);
          document.body.style.overflow = "hidden";
          return;
        }
      }
      hideDialog();
    },
    [filter, hideDialog, items],
  );

  const openDialog = useCallback(
    (index: number, trigger?: HTMLElement | null) => {
      const item = visible[index];
      if (!item) return;
      triggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      scrollRef.current = window.scrollY;
      lastNavRef.current = "close";
      setExplainOpen(false);
      setDialogIndex(index);
      document.body.style.overflow = "hidden";
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
      if (dialogIndex == null || visible.length < 2) return;
      const next = (dialogIndex + step + visible.length) % visible.length;
      const item = visible[next];
      lastNavRef.current = step < 0 ? "prev" : "next";
      setDialogIndex(next);
      persist({ href: workHref(item.work.slug), itemId: item.id, index: next, scroll: scrollRef.current });
      replaceHistory(workHref(item.work.slug), {
        v: 1,
        open: true,
        filter,
        listPath: listPath.current,
        itemId: item.id,
        slug: item.work.slug,
      });
    },
    [dialogIndex, filter, persist, visible],
  );

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
    if (dialogIndex == null) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = focusables(dialog);
    const prev = nodes.find((node) => node.textContent === "上一件");
    const next = nodes.find((node) => node.textContent === "下一件");
    const close = nodes.find((node) => node.classList.contains(styles.closeBtn) || node.textContent === "关闭");
    if (lastNavRef.current === "prev" && prev) prev.focus();
    else if (lastNavRef.current === "next" && next) next.focus();
    else close?.focus();
  }, [dialogIndex]);

  useEffect(() => {
    if (dialogIndex == null) return;
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
  }, [dialogIndex, moveDialog, requestClose]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (dialogIndex != null) main?.setAttribute("inert", "");
    else main?.removeAttribute("inert");
    return () => main?.removeAttribute("inert");
  }, [dialogIndex]);

  const current = dialogIndex != null ? visible[dialogIndex] : null;
  const themeMeta = initialThemeId ? formalTheme(initialThemeId) : null;
  const themeCopy = initialThemeId ? themeRecord(initialThemeId) : null;

  const onTileActivate = (item: GalleryItem, index: number, event: { currentTarget: EventTarget | null; preventDefault: () => void }) => {
    event.preventDefault();
    const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    openDialog(index, target);
  };

  return (
    <article className={styles.page} data-gallery="works" data-filter={filter}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{initialThemeId ? themeCopy?.subtitle ?? "THEME WORKS" : "CH-01 / SELECTED WORKS"}</p>
          <h1 tabIndex={-1}>{initialThemeId ? themeMeta?.label ?? initialThemeId : "WORKS"}</h1>
        </div>
        <p>
          {initialThemeId
            ? `${themeMeta?.usage ?? ""}。当前用本站概念图做布局占位，不是这个分类的真实个人作品。`
            : "作品展示先看位置和交互。当前四张概念图做成每主题横、竖、方三种布局占位，共 12 格，不是 12 件作品。"}
        </p>
      </header>

      <div className={styles.banner}>
        <p>
          布局占位 · 同一素材的三种安全裁切，用来看错落排布。没有日期、客户、点赞或热度。精选是目前唯一的顺序。
        </p>
      </div>

      <section className={styles.heroCard} aria-labelledby="gallery-hero">
        <GalleryMedia
          className={styles.heroStage}
          src={featured ? workArt(featured, theme) : ""}
          alt={featured ? `${formalTheme(featured.themeId).label} 精选主视觉，布局占位` : "精选主视觉"}
          fit="contain"
          priority
          openLabel={featuredItem ? `打开大图：${featuredItem.label} 横幅布局占位` : undefined}
          onOpen={
            featuredItem
              ? (stage) => {
                  const index = visible.findIndex((item) => item.id === featuredItem.id);
                  if (index >= 0) openDialog(index, stage);
                }
              : undefined
          }
        />
        <div className={styles.heroCopy}>
          <h2 id="gallery-hero">精选主视觉</h2>
          <p className={styles.hint}>
            {featured
              ? `当前用 ${formalTheme(featured.themeId).label} 的概念图占这个位置。同一张图，不是另一件作品。`
              : "这个分类还没有可展示的概念图。"}
          </p>
          {featured ? <span className={styles.mark}>布局占位</span> : null}
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="作品主题">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.chip}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.sorts} role="group" aria-label="排序">
          <button type="button" className={styles.chip} aria-pressed="true">
            精选
          </button>
        </div>
      </div>

      {visible.length ? (
        <div className={styles.gallery}>
          {visible.map((item, index) => (
            <article
              key={item.id}
              className={styles.card}
              data-theme={item.label}
              data-crop={item.crop.key}
            >
              <a
                className={styles.cardLink}
                href={workHref(item.work.slug)}
                data-gallery-id={item.id}
                aria-label={`打开大图：${item.label} ${item.crop.hint}布局占位`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return;
                  onTileActivate(item, index, event);
                }}
                onKeyDown={(event: ReactKeyboardEvent<HTMLAnchorElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onTileActivate(item, index, event);
                  }
                }}
              >
                <GalleryMedia
                  className={styles.workStage}
                  src={workArt(item.work, theme)}
                  alt={`${item.label} 布局占位，同一张概念图的${item.crop.hint}`}
                  fit="cover"
                  position={item.crop.position}
                  ratio={item.crop.key}
                />
                <div className={styles.meta}>
                  <span className={styles.mark}>布局占位</span>
                  <h3>{item.label}</h3>
                  <p className={styles.hint}>同一张概念图的{item.crop.hint}，用来看排布。</p>
                </div>
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          {filter === "all"
            ? "这个布局还在等概念图进入。主题筛选和三列错落会留在这里。"
            : `${FILTERS.find((item) => item.id === filter)?.label ?? filter} 还没有概念图。筛选位置会留着。`}
        </p>
      )}

      {initialThemeId ? (
        <nav className={styles.returns} aria-label="返回">
          <Link className={styles.softBtn} href="/hub/">
            返回四岛
          </Link>
          <Link className={styles.detailLink} href="/works/">
            全部作品
          </Link>
        </nav>
      ) : (
        <nav className={styles.themes} aria-label="四个主题作品">
          {workThemes.map((item) => (
            <Link key={item.id} className={styles.chip} href={item.href}>
              {formalTheme(item.id).label}
            </Link>
          ))}
        </nav>
      )}

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
                      {current.label} · {current.crop.hint}布局占位
                    </h2>
                    <p className={styles.hint}>
                      {dialogIndex! + 1} / {visible.length}
                    </p>
                  </div>
                  <button type="button" className={styles.closeBtn} onClick={requestClose}>
                    关闭
                  </button>
                </div>
                <GalleryMedia
                  className={styles.dialogStage}
                  src={workArt(current.work, theme)}
                  alt={`${current.label} 全图，布局占位`}
                  fit="contain"
                  priority
                />
                <div className={styles.dialogNav}>
                  <button type="button" className={styles.navBtn} disabled={visible.length < 2} onClick={() => moveDialog(-1)}>
                    上一件
                  </button>
                  <button
                    type="button"
                    className={styles.explainToggle}
                    aria-expanded={explainOpen}
                    aria-controls="gallery-dialog-explain"
                    onClick={() => setExplainOpen((open) => !open)}
                  >
                    {explainOpen ? "收起说明" : "展开说明"}
                  </button>
                  <button type="button" className={styles.navBtn} disabled={visible.length < 2} onClick={() => moveDialog(1)}>
                    下一件
                  </button>
                </div>
                <div id="gallery-dialog-explain" className={styles.explain} hidden={!explainOpen}>
                  <p>{layoutCopy(current)}</p>
                  <p className={styles.hint}>过程图尚未提供。当前只有这一张概念图。</p>
                  <Link
                    className={styles.detailLink}
                    href={workHref(current.work.slug)}
                    onClick={(event) => {
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
                    完整详情
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
