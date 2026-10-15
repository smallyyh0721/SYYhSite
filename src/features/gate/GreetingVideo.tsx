"use client";
import { useEffect, useRef, useState } from "react";
import {
  DEGRADE_HOLD_MS,
  GREETING_TIMEOUT_MS,
  REDUCED_HOLD_MS,
  greetingSources,
  readPortrait,
  readTheme,
  releaseVideo,
  type GreetingReason,
  type GreetingSources,
} from "./greetingMedia";
import styles from "./GreetingVideo.module.css";

type Phase = "pending" | "playing" | "reduced" | "degraded" | "done";
type Snapshot = { media: GreetingSources; reduced: boolean };

// One play is locked to the sources chosen when CONNECT starts.
// Later theme or orientation changes must not reload the film or finish twice.
export default function GreetingVideo({
  onComplete,
  onNote,
}: {
  onComplete: (reason: GreetingReason) => void;
  onNote?: (note: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onNoteRef = useRef(onNote);
  onCompleteRef.current = onComplete;
  onNoteRef.current = onNote;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("pending");
  const [reason, setReason] = useState<GreetingReason | "">("");
  const [posterFailed, setPosterFailed] = useState(false);
  const [posterReady, setPosterReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot({ media: greetingSources(readTheme(), readPortrait()), reduced });
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const { media, reduced } = snapshot;
    const video = videoRef.current;
    let stopped = false;
    let settled = false;
    let degrading: GreetingReason | null = null;
    let timeout = 0;
    let hold = 0;
    let hidePaused = false;
    const note = (text: string) => onNoteRef.current?.(text);
    const clearTimers = () => {
      window.clearTimeout(timeout);
      window.clearTimeout(hold);
    };
    const complete = (next: GreetingReason) => {
      if (stopped || settled) return;
      settled = true;
      clearTimers();
      setReason(next);
      setPhase("done");
      try {
        sessionStorage.setItem("syyh-greeting-reason", next);
      } catch {}
      onCompleteRef.current(next);
    };
    const degrade = (next: "error" | "abort") => {
      if (stopped || settled || degrading) return;
      degrading = next;
      setPhase("degraded");
      note("影片稍后再见。");
      video?.pause();
      window.clearTimeout(hold);
      hold = window.setTimeout(() => complete(next), DEGRADE_HOLD_MS);
    };
    timeout = window.setTimeout(() => complete("timeout"), GREETING_TIMEOUT_MS);

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const beginReduced = () => {
      if (stopped || settled) return;
      setPhase("reduced");
      note("很高兴遇见你。");
      video?.pause();
      window.clearTimeout(hold);
      hold = window.setTimeout(() => complete("reduced"), REDUCED_HOLD_MS);
    };
    const onReduced = () => {
      if (reducedQuery.matches) beginReduced();
    };
    reducedQuery.addEventListener("change", onReduced);

    if (reduced) {
      beginReduced();
      return () => {
        stopped = true;
        clearTimers();
        reducedQuery.removeEventListener("change", onReduced);
      };
    }

    if (!video) {
      degrade("error");
      return () => {
        stopped = true;
        clearTimers();
        reducedQuery.removeEventListener("change", onReduced);
      };
    }

    setPhase("playing");
    note("很高兴遇见你。");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;
    const sources = video.querySelectorAll("source");
    sources[0]?.setAttribute("src", media.video);
    sources[1]?.setAttribute("src", media.webm);
    const onEnded = () => complete("ended");
    const onError = () => degrade("error");
    const onAbort = () => {
      if (video.ended || (video.readyState > 0 && !video.error)) return;
      degrade("abort");
    };
    const onVis = () => {
      if (settled || stopped || degrading) return;
      if (document.hidden) {
        if (!video.paused && !video.ended) {
          video.pause();
          hidePaused = true;
        }
        return;
      }
      if (hidePaused && !reducedQuery.matches) {
        hidePaused = false;
        video.play()?.catch(() => degrade("error"));
      }
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("abort", onAbort);
    document.addEventListener("visibilitychange", onVis);
    video.play()?.catch(() => degrade("error"));

    return () => {
      stopped = true;
      clearTimers();
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("abort", onAbort);
      document.removeEventListener("visibilitychange", onVis);
      reducedQuery.removeEventListener("change", onReduced);
      releaseVideo(video);
    };
  }, [snapshot]);

  useEffect(() => {
    if (posterFailed && (phase === "degraded" || phase === "reduced")) onNoteRef.current?.("画面还在准备。");
  }, [posterFailed, phase]);

  if (!snapshot) return <div className={styles.stage} data-greeting data-greeting-state="pending" />;

  const { media } = snapshot;
  const showVideo = !snapshot.reduced;
  const hideMotion = phase === "reduced" || phase === "degraded";

  return (
    <div
      className={styles.stage}
      data-greeting
      data-greeting-state={phase}
      data-greeting-reason={reason}
      data-greeting-video={media.video}
      data-greeting-poster={media.poster}
      data-greeting-portrait={media.portrait}
      aria-hidden="true"
    >
      {!posterFailed && (
        <img
          className={styles.poster}
          src={media.poster}
          alt=""
          data-ready={posterReady ? "true" : "false"}
          onLoad={() => setPosterReady(true)}
          onError={() => setPosterFailed(true)}
        />
      )}
      {showVideo && (
        <video
          ref={videoRef}
          className={hideMotion ? styles.hidden : styles.video}
          poster={posterFailed ? undefined : media.poster}
          muted
          playsInline
          preload={snapshot.reduced ? "none" : "auto"}
          disablePictureInPicture
        >
          <source src={media.video} type="video/mp4" />
          <source src={media.webm} type="video/webm" />
        </video>
      )}
    </div>
  );
}
