"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { greetingImageArt } from "@/lib/v2-assets";
import {
  DEGRADE_HOLD_MS,
  GREETING_TIMEOUT_MS,
  REDUCED_HOLD_MS,
  readPortrait,
  readTheme,
  type GreetingReason,
} from "./greetingMedia";
import styles from "./GreetingImage.module.css";

type Frame = "cold" | "smile" | "reach";
type Phase = "loading" | "playing" | "reduced" | "degraded" | "done";
type Source = "sheet" | "fallback" | "none";
type Snapshot = { theme: "day" | "night"; portrait: boolean; reduced: boolean };
type Mix = { cold: number; smile: number; reach: number };

const FRAMES: Frame[] = ["cold", "smile", "reach"];
const PLAY_MS = 3500;
const SMILE_AT = 900;
const SMILE_FADE = 450;
const REACH_AT = 2000;
const REACH_FADE = 500;
function opacitiesAt(elapsed: number): Mix {
  return {
    cold: 1,
    smile: Math.min(1, Math.max(0, (elapsed - SMILE_AT) / SMILE_FADE)),
    reach: Math.min(1, Math.max(0, (elapsed - REACH_AT) / REACH_FADE)),
  };
}

function frameAt(elapsed: number): Frame {
  if (elapsed >= REACH_AT + REACH_FADE) return "reach";
  if (elapsed >= SMILE_AT + SMILE_FADE) return "smile";
  return "cold";
}

function loadDecoded(src: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const image = new Image();
    const finish = (ok: boolean) => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", onAbort);
      if (ok) resolve();
      else reject(new Error(src));
    };
    const onAbort = () => {
      image.onload = null;
      image.onerror = null;
      image.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };
    image.onload = () => {
      if (image.decode) {
        image.decode().then(() => finish(true), () => finish(true));
        return;
      }
      finish(true);
    };
    image.onerror = () => finish(false);
    signal.addEventListener("abort", onAbort);
    image.src = src;
  });
}

function PoseCrop({
  src,
  frame,
  row,
}: {
  src: string;
  frame: Frame;
  row: 0 | 1;
}) {
  const col = FRAMES.indexOf(frame);
  return (
    <div className={styles.crop} data-pose={frame}>
      <div className={styles.zoom}>
        <img
          className={styles.sheet}
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          style={{ left: `${-col * 100}%`, top: `${-row * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function GreetingImage({
  onComplete,
  onNote,
}: {
  onComplete: (reason: GreetingReason) => void;
  onNote?: (note: string) => void;
}) {
  const onCompleteRef = useRef(onComplete);
  const onNoteRef = useRef(onNote);
  onCompleteRef.current = onComplete;
  onNoteRef.current = onNote;
  const stageRef = useRef<HTMLDivElement>(null);
  const mixRef = useRef<Mix>({ cold: 1, smile: 0, reach: 0 });
  const [snapshot] = useState<Snapshot>(() => ({
    theme: typeof window === "undefined" ? "night" : readTheme(),
    portrait: typeof window === "undefined" ? false : readPortrait(),
    reduced: typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  const [phase, setPhase] = useState<Phase>("loading");
  const [frame, setFrame] = useState<Frame>(snapshot.reduced ? "reach" : "cold");
  const [source, setSource] = useState<Source>("none");
  const [paused, setPaused] = useState(false);
  const [reason, setReason] = useState<GreetingReason | "">("");

  const paint = (next: Mix) => {
    mixRef.current = next;
    const root = stageRef.current;
    if (!root) return;
    for (const name of FRAMES) {
      root.querySelectorAll<HTMLElement>(`[data-greeting-figure] [data-pose="${name}"]`).forEach((node) => {
        node.style.opacity = String(next[name]);
      });
    }
  };

  useLayoutEffect(() => {
    paint(mixRef.current);
  });

  useEffect(() => {
    const { reduced } = snapshot;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const abort = new AbortController();
    let stopped = false;
    let settled = false;
    let raf = 0;
    let timeout = 0;
    let hold = 0;
    let mode: "load" | "play" | "reduced" | "degrade" = "load";
    let using: Source = "none";
    let wantReduced = reduced || reducedQuery.matches;
    let elapsed = 0;
    let last = 0;
    let holdLeft = REDUCED_HOLD_MS;
    let holdMark = 0;
    const clearTimers = () => {
      window.clearTimeout(timeout);
      window.clearTimeout(hold);
      cancelAnimationFrame(raf);
    };
    const complete = (next: GreetingReason) => {
      if (stopped || settled) return;
      settled = true;
      abort.abort();
      clearTimers();
      setReason(next);
      setPhase("done");
      setPaused(false);
      try {
        sessionStorage.setItem("syyh-greeting-reason", next);
      } catch {}
      onCompleteRef.current(next);
    };
    const armHold = (next: GreetingReason, remaining: number) => {
      window.clearTimeout(hold);
      holdMark = 0;
      if (document.hidden) return;
      holdMark = performance.now();
      hold = window.setTimeout(() => complete(next), remaining);
    };
    const goReduced = () => {
      if (stopped || settled || mode === "reduced") return;
      mode = "reduced";
      cancelAnimationFrame(raf);
      paint({ cold: 1, smile: 1, reach: 1 });
      setFrame("reach");
      setPhase("reduced");
      setPaused(false);
      onNoteRef.current?.("很高兴遇见你。");
      holdLeft = REDUCED_HOLD_MS;
      armHold("reduced", holdLeft);
    };
    const tick = (now: number) => {
      if (stopped || settled || mode !== "play") return;
      if (!document.hidden) {
        elapsed += now - last;
        if (using === "sheet") {
          paint(opacitiesAt(elapsed));
          const nextFrame = frameAt(elapsed);
          setFrame((current) => (current === nextFrame ? current : nextFrame));
        }
        if (elapsed >= PLAY_MS) {
          complete("ended");
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    const startPlay = (next: Source) => {
      if (stopped || settled) return;
      using = next;
      window.clearTimeout(timeout);
      setSource(next);
      if (wantReduced || reducedQuery.matches) {
        paint({ cold: 1, smile: 1, reach: 1 });
        setFrame("reach");
        goReduced();
        return;
      }
      mode = "play";
      setPhase("playing");
      if (next === "fallback") {
        paint({ cold: 1, smile: 1, reach: 1 });
        setFrame("reach");
      } else {
        paint({ cold: 1, smile: 0, reach: 0 });
        setFrame("cold");
      }
      onNoteRef.current?.("很高兴遇见你。");
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (stopped || settled) return;
      if (document.hidden) {
        setPaused(true);
        if (mode === "reduced" || mode === "degrade") {
          if (holdMark) holdLeft = Math.max(0, holdLeft - (performance.now() - holdMark));
          window.clearTimeout(hold);
          holdMark = 0;
        }
        return;
      }
      setPaused(false);
      last = performance.now();
      if (mode === "reduced") armHold("reduced", holdLeft);
      if (mode === "degrade") armHold("error", holdLeft);
    };
    const onReduced = () => {
      if (!reducedQuery.matches) return;
      wantReduced = true;
      if (mode === "play") goReduced();
    };
    timeout = window.setTimeout(() => complete("timeout"), GREETING_TIMEOUT_MS);
    reducedQuery.addEventListener("change", onReduced);
    document.addEventListener("visibilitychange", onVis);

    (async () => {
      try {
        await loadDecoded(greetingImageArt.sheet, abort.signal);
        startPlay("sheet");
      } catch {
        if (stopped || settled) return;
        try {
          await loadDecoded(greetingImageArt.fallback, abort.signal);
          startPlay("fallback");
        } catch {
          if (stopped || settled) return;
          window.clearTimeout(timeout);
          mode = "degrade";
          setSource("none");
          setPhase("degraded");
          onNoteRef.current?.("画面还在准备。");
          holdLeft = DEGRADE_HOLD_MS;
          armHold("error", holdLeft);
        }
      }
    })();

    return () => {
      stopped = true;
      abort.abort();
      clearTimers();
      reducedQuery.removeEventListener("change", onReduced);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [snapshot]);

  const row: 0 | 1 = snapshot.theme === "day" ? 0 : 1;
  const sheet = greetingImageArt.sheet;
  const fallback = greetingImageArt.fallback;
  const showSheet = source === "sheet";
  const showFallback = source === "fallback";
  const motionOff = phase === "reduced" || phase === "degraded" || snapshot.reduced;

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-greeting
      data-greeting-renderer="animated-images"
      data-greeting-state={phase}
      data-greeting-frame={frame}
      data-greeting-source={source}
      data-greeting-theme={snapshot.theme}
      data-greeting-portrait={snapshot.portrait ? "true" : "false"}
      data-greeting-row={row}
      data-greeting-reason={reason}
      data-paused={paused ? "true" : "false"}
      aria-hidden="true"
    >
      {showSheet && (
        <div className={styles.figure} data-greeting-figure data-portrait={snapshot.portrait ? "true" : "false"}>
          <div className={motionOff ? styles.still : styles.ken}>
            <div className={styles.stack}>
              {FRAMES.map((name) => (
                <PoseCrop key={name} src={sheet} frame={name} row={row} />
              ))}
            </div>
          </div>
        </div>
      )}
      {showFallback && (
        <div className={styles.fallbackFigure} data-greeting-figure data-portrait={snapshot.portrait ? "true" : "false"}>
          <div className={motionOff ? styles.still : styles.ken}>
            <img className={styles.fallback} src={fallback} alt="" draggable={false} decoding="async" />
          </div>
        </div>
      )}
    </div>
  );
}
