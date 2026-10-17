"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { works, workThemes, type Work, type WorkMedia } from "@/lib/contracts";
import GalleryMedia from "./GalleryMedia";
import WorkVideo from "./WorkVideo";
import styles from "./Gallery.module.css";
import { overlayFromState, pushHistory, readSnapshot, replaceHistory } from "./galleryHistory";
import {
  coverAlt,
  coverCaption,
  formalTheme,
  isStillStoryboard,
  mediaHeading,
  processHeading,
  processNote,
  stillNote,
  workArt,
  workHref,
} from "./galleryModel";

type ViewerGroup = "media" | "process" | "cover";
type ViewerState = { group: ViewerGroup; index: number };

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

function framesFor(work: Work, group: ViewerGroup): WorkMedia[] {
  if (group === "process") return work.processMedia ?? [];
  if (group === "cover") return [{ src: work.image, alt: coverAlt(work), caption: `封面 · ${coverCaption(work)}` }];
  return work.media;
}

function frameId(group: ViewerGroup, index: number) {
  return `${group}:${index}`;
}

function parseFrameId(value: string | undefined, work: Work): ViewerState | null {
  if (!value) return null;
  const match = /^(media|process|cover):(\d+)$/.exec(value);
  if (!match) return null;
  const group = match[1] as ViewerGroup;
  const index = Number(match[2]);
  const length = framesFor(work, group).length;
  if (!Number.isInteger(index) || index < 0 || index >= length) return null;
  return { group, index };
}

function groupLabel(work: Work, group: ViewerGroup) {
  if (group === "process") return processHeading;
  if (group === "cover") return "封面";
  return mediaHeading(work);
}

export default function WorkDetail({ work, relatedWorks = works, preview = false }: { work: Work; relatedWorks?: Work[]; preview?: boolean }) {
  const [backHref, setBackHref] = useState("/works/");
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef(0);
  const pushedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastNavRef = useRef<"prev" | "next" | "close">("close");
  const label = formalTheme(work.themeId).label;
  const index = relatedWorks.findIndex((item) => item.slug === work.slug);
  const prev = index > 0 ? relatedWorks[index - 1] : null;
  const next = index >= 0 && index < relatedWorks.length - 1 ? relatedWorks[index + 1] : null;
  const still = isStillStoryboard(work);
  const processMedia = work.processMedia ?? [];
  const frames = viewer ? framesFor(work, viewer.group) : [];
  const frame = viewer ? frames[viewer.index] ?? null : null;

  useEffect(() => {
    setViewer(null);
    pushedRef.current = false;
    document.body.style.overflow = "";
    const saved = readSnapshot();
    if (saved?.path) setBackHref(saved.path);
    const overlay = preview ? null : overlayFromState(history.state);
    const restored = overlay?.open && overlay.slug === work.slug ? parseFrameId(overlay.itemId, work) : null;
    if (restored) {
      setViewer(restored);
      pushedRef.current = true;
      document.body.style.overflow = "hidden";
    }
    setMounted(true);
  }, [work.slug, preview]);

  const hideViewer = useCallback(() => {
    const trigger = triggerRef.current;
    const y = scrollRef.current;
    setViewer(null);
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

  const writeViewerHistory = useCallback(
    (next: ViewerState, mode: "push" | "replace") => {
      const overlay = {
        v: 1 as const,
        open: true,
        filter: work.themeId,
        listPath: backHref,
        itemId: frameId(next.group, next.index),
        slug: work.slug,
      };
      const href = workHref(work.slug);
      if (mode === "push") pushHistory(href, overlay);
      else replaceHistory(href, overlay);
    },
    [backHref, work.slug, work.themeId],
  );

  const openViewer = useCallback(
    (group: ViewerGroup, frameIndex: number, trigger?: HTMLElement | null) => {
      const next = { group, index: frameIndex };
      if (!framesFor(work, group)[frameIndex]) return;
      triggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      scrollRef.current = window.scrollY;
      lastNavRef.current = "close";
      setViewer(next);
      document.body.style.overflow = "hidden";
      if (!preview) {
        writeViewerHistory(next, pushedRef.current ? "replace" : "push");
        pushedRef.current = true;
      }
    },
    [work, writeViewerHistory, preview],
  );

  const requestClose = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
      return;
    }
    hideViewer();
  }, [hideViewer]);

  const moveViewer = useCallback(
    (step: number) => {
      if (!viewer || frames.length < 2) return;
      const nextIndex = (viewer.index + step + frames.length) % frames.length;
      const next = { group: viewer.group, index: nextIndex };
      lastNavRef.current = step < 0 ? "prev" : "next";
      setViewer(next);
      if (!preview) writeViewerHistory(next, "replace");
    },
    [frames.length, viewer, writeViewerHistory, preview],
  );

  useEffect(() => {
    const onPop = () => {
      const overlay = overlayFromState(history.state);
      const restored = overlay?.open && overlay.slug === work.slug ? parseFrameId(overlay.itemId, work) : null;
      pushedRef.current = Boolean(restored);
      if (restored) {
        setViewer(restored);
        document.body.style.overflow = "hidden";
        return;
      }
      hideViewer();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hideViewer, work]);

  useEffect(() => {
    if (!frame) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = focusables(dialog);
    const prevButton = nodes.find((node) => node.textContent === "上一张");
    const nextButton = nodes.find((node) => node.textContent === "下一张");
    const close = nodes.find((node) => node.classList.contains(styles.closeBtn) || node.textContent === "关闭");
    if (lastNavRef.current === "prev" && prevButton) prevButton.focus();
    else if (lastNavRef.current === "next" && nextButton) nextButton.focus();
    else close?.focus();
  }, [frame, viewer]);

  useEffect(() => {
    if (!frame) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveViewer(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveViewer(1);
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
  }, [frame, moveViewer, requestClose]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (frame) main?.setAttribute("inert", "");
    else main?.removeAttribute("inert");
    return () => main?.removeAttribute("inert");
  }, [frame]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.getElementById("main")?.removeAttribute("inert");
    };
  }, []);

  const openCover = (stage: HTMLElement) => {
    const coverIndex = work.media.findIndex((item) => item.src === work.image);
    if (coverIndex >= 0) openViewer("media", coverIndex, stage);
    else openViewer("cover", 0, stage);
  };

  return (
    <article
      className={styles.page}
      data-gallery="detail"
      data-work={work.slug}
      data-still={still ? "true" : "false"}
      data-media-count={work.media.length}
      data-process-count={processMedia.length}
    >
      <Link className={styles.softBtn} href={preview ? "/owner/" : backHref}>
        {preview ? "返回站主管理" : "返回作品列表"}
      </Link>

      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{label}</p>
          <h1 tabIndex={-1}>{work.title}</h1>
        </div>
        <p>{work.description}</p>
      </header>

      <nav className={styles.themes} aria-label="四个主题作品">
        {workThemes.map((item) => (
          <Link
            key={item.id}
            className={styles.chip}
            href={item.href}
            aria-current={item.id === work.themeId ? "page" : undefined}
          >
            {formalTheme(item.id).label}
          </Link>
        ))}
      </nav>

      <div className={styles.detailGrid}>
        <figure className={styles.figure}>
          <GalleryMedia
            className={styles.detailMedia}
            src={workArt(work)}
            alt={coverAlt(work)}
            fit="contain"
            priority
            fallbackLabel={`封面 · ${coverCaption(work)}`}
            openLabel={`放大查看：${coverCaption(work)}`}
            onOpen={openCover}
          />
          <figcaption className={styles.caption}>封面 · {coverCaption(work)}</figcaption>
        </figure>
        <div className={styles.detailCopy}>
          <span className={styles.mark}>{work.category}</span>
          <p className={styles.detailBody}>{work.subtitle}</p>
          <p className={styles.hint}>{label}</p>
        </div>
      </div>

      <section className={styles.sequence} aria-labelledby="media-title">
        <h2 id="media-title">{mediaHeading(work)}</h2>
        {stillNote(work) ? <p className={styles.note}>{stillNote(work)}</p> : null}
        <p className={styles.hint}>点开单张可以放大查看，左右方向键或按钮会在这一组里切换。页面向下滚动可以看完全部图片。</p>
        <ol className={styles.mediaList}>
          {work.media.map((item, frameIndex) => (
            <li key={item.src}>
              <figure className={styles.figure}>
                {item.kind === "video" ? <WorkVideo src={item.src} poster={item.poster} alt={item.alt} /> : <GalleryMedia
                  className={styles.frameStage}
                  src={item.src}
                  alt={item.alt}
                  fit="contain"
                  priority={frameIndex === 0}
                  fallbackLabel={item.caption}
                  openLabel={`放大查看：${item.caption || item.alt || work.title}`}
                  onOpen={(stage) => openViewer("media", frameIndex, stage)}
                />}
                <figcaption className={styles.caption}>{item.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </section>

      {processMedia.length ? (
        <section className={styles.process} aria-labelledby="process-title">
          <h2 id="process-title">{processHeading}</h2>
          {processNote(work) ? <p className={styles.processCopy}>{processNote(work)}</p> : null}
          <ul className={styles.processGrid}>
            {processMedia.map((item, frameIndex) => (
              <li key={item.src}>
                <figure className={styles.figure}>
                  {item.kind === "video" ? <WorkVideo src={item.src} poster={item.poster} alt={item.alt} /> : <GalleryMedia
                    className={styles.frameStage}
                    src={item.src}
                    alt={item.alt}
                    fit="contain"
                    fallbackLabel={item.caption}
                    openLabel={`放大查看：${item.caption || item.alt || work.title}`}
                    onOpen={(stage) => openViewer("process", frameIndex, stage)}
                  />}
                  <figcaption className={styles.caption}>{item.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className={styles.returns} aria-label="相邻作品">
        {prev ? (
          <Link className={styles.softBtn} href={workHref(prev.slug)}>
            上一件 {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className={styles.detailLink} href={workHref(next.slug)}>
            下一件 {next.title}
          </Link>
        ) : (
          <span />
        )}
        <Link className={styles.softBtn} href="/hub/">
          返回四岛
        </Link>
      </nav>

      {mounted && frame && viewer
        ? createPortal(
            <div className={styles.dialogRoot} data-open="true" data-viewer={viewer.group}>
              <div
                ref={dialogRef}
                className={`${styles.dialog} ${styles.dialogFrame}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="work-frame-title"
              >
                <div className={styles.chrome}>
                  <div>
                    <h2 id="work-frame-title" className={styles.dialogTitle} aria-live="polite">
                      {frame.caption}
                    </h2>
                    <p className={styles.hint}>
                      {groupLabel(work, viewer.group)} · {viewer.index + 1} / {frames.length}
                    </p>
                  </div>
                  <button type="button" className={styles.closeBtn} onClick={requestClose}>
                    关闭
                  </button>
                </div>
                {frame.kind === "video" ? <WorkVideo src={frame.src} poster={frame.poster} alt={frame.alt} /> : <GalleryMedia
                  className={styles.dialogStage}
                  src={frame.src}
                  alt={frame.alt}
                  fit="contain"
                  priority
                  fallbackLabel={frame.caption}
                />}
                <div className={styles.dialogNav}>
                  <button type="button" className={styles.navBtn} disabled={frames.length < 2} onClick={() => moveViewer(-1)}>
                    上一张
                  </button>
                  <button type="button" className={styles.navBtn} disabled={frames.length < 2} onClick={() => moveViewer(1)}>
                    下一张
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
