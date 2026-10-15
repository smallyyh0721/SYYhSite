"use client";
import { useEffect, useState } from "react";
import { avatarArt } from "@/lib/v2-assets";
import { useTheme } from "@/state/Theme";
import styles from "./Avatar.module.css";

export type PosterPhase = "loading" | "poster" | "empty";

export default function PosterFallback({
  pending = false,
  onPhase,
}: {
  pending?: boolean;
  onPhase?: (phase: PosterPhase) => void;
}) {
  const { theme } = useTheme();
  const src = avatarArt.poster(theme);
  const [phase, setPhase] = useState<PosterPhase>("loading");
  const [seen, setSeen] = useState(src);
  if (seen !== src) {
    setSeen(src);
    setPhase("loading");
  }
  useEffect(() => {
    onPhase?.(phase);
  }, [onPhase, phase]);
  const sync = (node: HTMLImageElement | null) => {
    if (!node?.complete || node.getAttribute("src") !== src) return;
    setPhase(node.naturalWidth > 0 ? "poster" : "empty");
  };
  const message =
    phase === "poster" ? null : phase === "empty" && !pending ? "画面还没放进来" : "载入中";
  return (
    <div className={styles.fill} data-avatar-poster={phase === "poster" ? theme : phase} data-avatar-poster-src={src}>
      {phase !== "empty" && (
        <img
          key={src}
          ref={sync}
          className={phase === "poster" ? styles.posterImg : styles.posterPending}
          src={src}
          alt=""
          onLoad={() => setPhase("poster")}
          onError={() => setPhase("empty")}
        />
      )}
      {message && <p className={styles.blank}>{message}</p>}
    </div>
  );
}
