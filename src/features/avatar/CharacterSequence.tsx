"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./CharacterSequence.module.css";

export type SequenceView = "loading" | "ready" | "poster" | "empty";
export type SequenceMode = "pointer" | "scroll";

const SEQUENCE_ID = "v002";
const SEQUENCE_BASE = "/media/v3/about-sequence/v002";
const MANIFEST_URL = `${SEQUENCE_BASE}/manifest.json`;
const FRAME_COUNT = 9;
const CENTER_INDEX = 4;
const CENTER_SRC = `${SEQUENCE_BASE}/frames/frame-005.webp`;
const FILL = "#e8edf1";
const LOAD_ORDER = [4, 3, 5, 2, 6, 1, 7, 0, 8];

function defaultUrls() {
  return Array.from(
    { length: FRAME_COUNT },
    (_, index) => `${SEQUENCE_BASE}/frames/frame-${String(index + 1).padStart(3, "0")}.webp`,
  );
}

function resolveUrl(url: string) {
  if (/^(https?:)?\/\//.test(url) || url.startsWith("/")) return url;
  return `${SEQUENCE_BASE}/${url.replace(/^\.\//, "")}`;
}

function clampFrame(value: number) {
  return Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(value)));
}

function decodeImage(src: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (signal.aborted) {
      resolve(null);
      return;
    }
    const image = new Image();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", onAbort);
      resolve(ok && image.naturalWidth > 0 ? image : null);
    };
    const onAbort = () => {
      image.onload = null;
      image.onerror = null;
      image.src = "";
      finish(false);
    };
    const startDecode = () => {
      if (signal.aborted) {
        finish(false);
        return;
      }
      if (image.decode) {
        void image.decode().then(
          () => finish(true),
          () => finish(image.naturalWidth > 0),
        );
        return;
      }
      finish(image.naturalWidth > 0);
    };
    signal.addEventListener("abort", onAbort);
    image.decoding = "async";
    image.onload = startDecode;
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) startDecode();
  });
}

async function readUrls(signal: AbortSignal) {
  const fallback = defaultUrls();
  try {
    const response = await fetch(MANIFEST_URL, { signal });
    if (!response.ok) return fallback;
    const manifest = (await response.json()) as {
      frames?: { index?: number; url?: string }[];
    };
    const urls = fallback.slice();
    for (const frame of manifest.frames ?? []) {
      if (
        typeof frame.index === "number" &&
        frame.index >= 0 &&
        frame.index < FRAME_COUNT &&
        typeof frame.url === "string"
      ) {
        urls[frame.index] = resolveUrl(frame.url);
      }
    }
    return urls;
  } catch (error) {
    if (signal.aborted) return fallback;
    if (error instanceof DOMException && error.name === "AbortError") return fallback;
    return fallback;
  }
}

export default function CharacterSequence({
  onView,
  showReviewControls = false,
}: {
  onView?: (view: SequenceView) => void;
  showReviewControls?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(Array(FRAME_COUNT).fill(null));
  const urlsRef = useRef(defaultUrls());
  const frameRef = useRef(CENTER_INDEX);
  const modeRef = useRef<SequenceMode>("pointer");
  const stateRef = useRef<SequenceView>("loading");
  const playingRef = useRef(false);
  const reducedRef = useRef(false);
  const dragRef = useRef(false);
  const phaseRef = useRef(0);
  const previousTimeRef = useRef(0);
  const rafRef = useRef(0);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  const [state, setState] = useState<SequenceView>("loading");
  const [frame, setFrame] = useState(CENTER_INDEX);
  const [mode, setMode] = useState<SequenceMode>("pointer");
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const canvasLiveRef = useRef(false);
  const [canvasLive, setCanvasLive] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(CENTER_SRC);
  const [note, setNote] = useState("");

  const draw = () => {
    const canvas = canvasRef.current;
    const portrait = portraitRef.current;
    let context = contextRef.current;
    if (!canvas || !portrait) return;
    if (!context) {
      context = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
      contextRef.current = context;
    }
    if (!context) return;
    if (portrait.clientWidth < 8 || portrait.clientHeight < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(portrait.clientWidth * dpr));
    const height = Math.max(1, Math.round(portrait.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.fillStyle = FILL;
    context.fillRect(0, 0, width, height);
    const image = imagesRef.current[frameRef.current];
    if (!image) return;
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    if (!canvasLiveRef.current) {
      canvasLiveRef.current = true;
      setCanvasLive(true);
    }
  };

  const applyFrame = (value: number) => {
    const next = clampFrame(value);
    const image = imagesRef.current[next];
    if (!image) return;
    if (next === frameRef.current) return;
    frameRef.current = next;
    setFrame(next);
    const url = urlsRef.current[next] || CENTER_SRC;
    setFallbackSrc((current) => (current === url ? current : url));
    draw();
  };

  const stopPlay = () => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    previousTimeRef.current = 0;
    setPlaying(false);
  };

  const tick = (time: number) => {
    if (!playingRef.current) return;
    if (document.hidden) {
      stopPlay();
      return;
    }
    if (!previousTimeRef.current) previousTimeRef.current = time;
    phaseRef.current += Math.min(time - previousTimeRef.current, 80) / 2000;
    previousTimeRef.current = time;
    applyFrame((1 - Math.cos(phaseRef.current * Math.PI)) * 4);
    rafRef.current = requestAnimationFrame(tick);
  };

  const startPlay = () => {
    if (stateRef.current !== "ready" || reducedRef.current || playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    const ratio = 1 - frameRef.current / 4;
    const clamped = Math.max(-1, Math.min(1, ratio));
    phaseRef.current = Math.acos(clamped) / Math.PI;
    previousTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  };

  const applyScrollFrame = () => {
    if (modeRef.current !== "scroll" || playingRef.current || reducedRef.current) return;
    if (stateRef.current !== "ready") return;
    const scrolling = document.scrollingElement || document.documentElement;
    const max = scrolling.scrollHeight - scrolling.clientHeight;
    if (max <= 0) return;
    applyFrame((scrolling.scrollTop / max) * (FRAME_COUNT - 1));
  };

  const pointerFrame = (clientX: number) => {
    if (modeRef.current !== "pointer" || playingRef.current || reducedRef.current) return;
    if (stateRef.current !== "ready") return;
    const bounds = portraitRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    applyFrame(((clientX - bounds.left) / bounds.width) * (FRAME_COUNT - 1));
  };

  useEffect(() => {
    stateRef.current = state;
    onViewRef.current?.(state);
  }, [state]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    contextRef.current = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    void (async () => {
      setNote("人物画面载入中。");
      const urls = await readUrls(signal);
      if (signal.aborted) return;
      urlsRef.current = urls;
      let loaded = 0;
      for (const index of LOAD_ORDER) {
        const image = await decodeImage(urls[index], signal);
        if (signal.aborted) return;
        if (!image) continue;
        imagesRef.current[index] = image;
        loaded += 1;
        if (index === CENTER_INDEX) {
          frameRef.current = CENTER_INDEX;
          setFrame(CENTER_INDEX);
          setFallbackSrc(urls[CENTER_INDEX] || CENTER_SRC);
          draw();
          setNote("正面已显示，正在载入其余朝向。");
        } else if (!imagesRef.current[frameRef.current]) {
          applyFrame(index);
        }
        if (loaded < FRAME_COUNT) {
          setNote(`已载入 ${loaded} / ${FRAME_COUNT} 个朝向。`);
        }
      }
      if (signal.aborted) return;
      const available = imagesRef.current.filter(Boolean).length;
      if (available === FRAME_COUNT) {
        stateRef.current = "ready";
        setState("ready");
        setNote("");
        applyFrame(frameRef.current);
        return;
      }
      if (available > 0) {
        const still =
          imagesRef.current[CENTER_INDEX] ? CENTER_INDEX : imagesRef.current.findIndex(Boolean);
        applyFrame(still);
        stateRef.current = "poster";
        setState("poster");
        setNote("其余朝向暂不可用。");
        return;
      }
      stateRef.current = "empty";
      setState("empty");
      setNote("人物画面暂不可用。");
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const portrait = portraitRef.current;
    const root = rootRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced = () => {
      const next = reduce.matches;
      reducedRef.current = next;
      setReduced(next);
      if (next) stopPlay();
    };
    updateReduced();
    reduce.addEventListener("change", updateReduced);

    const onScroll = () => applyScrollFrame();
    const onVisibility = () => {
      if (document.hidden) stopPlay();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const resize = new ResizeObserver(() => draw());
    if (portrait) resize.observe(portrait);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || entry.isIntersecting) return;
        const box = entry.boundingClientRect;
        if (box.width <= 0 || box.height <= 0) return;
        if (box.bottom < 0 || box.top > window.innerHeight) stopPlay();
      },
      { threshold: 0, rootMargin: "20% 0px 20% 0px" },
    );
    if (root) io.observe(root);

    return () => {
      reduce.removeEventListener("change", updateReduced);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      resize.disconnect();
      io.disconnect();
      stopPlay();
    };
  }, []);

  const manual = state === "ready";
  const drive = manual && !reduced;
  const status =
    state === "empty"
      ? "人物画面暂不可用。"
      : state === "poster"
        ? "其余朝向暂不可用。"
        : state === "loading"
          ? note
          : "";

  return (
    <div
      ref={rootRef}
      className={reduced ? `${styles.root} ${styles.reduced}` : styles.root}
      data-character-sequence={SEQUENCE_ID}
      data-sequence-state={state}
      data-frame-index={String(frame)}
      data-frame-count={String(FRAME_COUNT)}
      data-sequence-mode={mode}
      data-sequence-playing={playing ? "true" : "false"}
      onKeyDown={(event) => {
        if (!manual) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        let next: number | null = null;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = frameRef.current - 1;
        else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = frameRef.current + 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = FRAME_COUNT - 1;
        else return;
        event.preventDefault();
        stopPlay();
        applyFrame(next);
      }}
    >
      <div
        ref={portraitRef}
        className={styles.portrait}
        tabIndex={manual ? 0 : undefined}
        aria-label="人物画面，可用方向键选择朝向"
        onPointerDown={(event) => {
          if (!drive || modeRef.current !== "pointer") return;
          stopPlay();
          dragRef.current = true;
          portraitRef.current?.setPointerCapture(event.pointerId);
          pointerFrame(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!drive || modeRef.current !== "pointer") return;
          if (event.pointerType !== "mouse" && !dragRef.current) return;
          pointerFrame(event.clientX);
        }}
        onPointerUp={() => {
          dragRef.current = false;
        }}
        onPointerCancel={() => {
          dragRef.current = false;
        }}
      >
        {state !== "empty" && (
          <img
            className={canvasLive ? `${styles.fallback} ${styles.fallbackHidden}` : styles.fallback}
            src={fallbackSrc}
            alt={canvasLive ? "" : "人物肖像"}
            width={418}
            height={418}
            decoding="async"
            draggable={false}
            onError={() => {
              if (stateRef.current === "loading" && !imagesRef.current.some(Boolean)) {
                setNote("人物画面载入中。");
              }
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          className={canvasLive ? styles.canvas : `${styles.canvas} ${styles.canvasIdle}`}
          width={418}
          height={418}
          aria-hidden="true"
        />
        {state === "empty" && <p className={styles.empty}>人物画面暂不可用。</p>}
      </div>
      {status && state !== "empty" && (
        <p className={styles.note} role="status">
          {status}
        </p>
      )}
      {state === "empty" && (
        <p className={styles.note} role="status">
          人物画面暂不可用。
        </p>
      )}
      {showReviewControls && (
        <div className={styles.controls}>
          <div className={styles.modes} role="group" aria-label="查看方式">
            <button
              type="button"
              className={styles.control}
              aria-label="指针或拖动选择朝向"
              aria-pressed={mode === "pointer"}
              disabled={!manual}
              onClick={() => {
                stopPlay();
                modeRef.current = "pointer";
                setMode("pointer");
              }}
            >
              指针 / 拖动
            </button>
            <button
              type="button"
              className={styles.control}
              aria-label="随页面滚动选择朝向"
              aria-pressed={mode === "scroll"}
              disabled={!manual}
              onClick={() => {
                stopPlay();
                modeRef.current = "scroll";
                setMode("scroll");
                applyScrollFrame();
              }}
            >
              随滚动
            </button>
          </div>
          <button
            type="button"
            className={styles.control}
            aria-label={playing ? "暂停自动播放" : "自动往返播放"}
            aria-pressed={playing}
            disabled={!drive}
            onClick={() => {
              if (playingRef.current) stopPlay();
              else startPlay();
            }}
          >
            {playing ? "暂停播放" : "自动播放"}
          </button>
        </div>
      )}
      {showReviewControls && (
        <label className={styles.scrubber}>
          <span>左转</span>
          <input
            type="range"
            min={0}
            max={FRAME_COUNT - 1}
            step={1}
            value={frame}
            disabled={!manual}
            aria-label="人物朝向，左转至右转"
            aria-valuetext={`第 ${frame + 1} 帧，共 ${FRAME_COUNT} 帧`}
            onChange={(event) => {
              stopPlay();
              applyFrame(Number(event.target.value));
            }}
          />
          <span>右转</span>
        </label>
      )}
    </div>
  );
}
