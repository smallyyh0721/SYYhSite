"use client";
import { useLayoutEffect, useState } from "react";
import { cloudArt, environmentArt } from "@/lib/v2-assets";
import { useTheme } from "@/state/Theme";
import styles from "./DynamicBackdrop.module.css";

const STARS: Array<[number, number]> = [
  [8, 18],
  [18, 40],
  [31, 12],
  [44, 30],
  [57, 10],
  [69, 36],
  [78, 16],
  [88, 28],
  [94, 8],
];

export default function DynamicBackdrop({ paused }: { paused: boolean }) {
  const { theme } = useTheme();
  const [portrait, setPortrait] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  useLayoutEffect(() => {
    const portraitQuery = window.matchMedia("(orientation: portrait)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPortrait = () => setPortrait(portraitQuery.matches);
    const syncReduced = () => setReduced(reducedQuery.matches);
    const syncHidden = () => setHidden(document.hidden);
    syncPortrait();
    syncReduced();
    syncHidden();
    portraitQuery.addEventListener("change", syncPortrait);
    reducedQuery.addEventListener("change", syncReduced);
    document.addEventListener("visibilitychange", syncHidden);
    return () => {
      portraitQuery.removeEventListener("change", syncPortrait);
      reducedQuery.removeEventListener("change", syncReduced);
      document.removeEventListener("visibilitychange", syncHidden);
    };
  }, []);
  const plate = environmentArt(theme, portrait);
  const far = cloudArt(theme, "far");
  const near = cloudArt(theme, "near");
  const frozen = paused || hidden || reduced;
  const miss = (key: string) => setFailed((old) => (old[key] ? old : { ...old, [key]: true }));
  const watch = (src: string) => (node: HTMLImageElement | null) => {
    if (!node?.complete) return;
    if (node.naturalWidth > 0) node.dataset.ready = "true";
    else queueMicrotask(() => miss(src));
  };
  return (
    <div
      className={styles.environment}
      data-dynamic-background
      data-paused={paused || hidden}
      data-frozen={frozen}
      data-reduced={reduced}
      data-portrait={portrait}
      aria-hidden="true"
    >
      <div className={styles.plate} data-layer="plate">
        {!failed[plate] && (
          <img key={plate} src={plate} alt="" draggable={false} decoding="async" ref={watch(plate)} onLoad={(event) => { event.currentTarget.dataset.ready = "true"; }} onError={() => miss(plate)} />
        )}
      </div>
      <div className={`${styles.cloud} ${styles.far}`} data-layer="far">
        {!failed[far] && (
          <img key={far} className={styles.drift} src={far} alt="" draggable={false} decoding="async" ref={watch(far)} onLoad={(event) => { event.currentTarget.dataset.ready = "true"; }} onError={() => miss(far)} />
        )}
      </div>
      {theme === "night" && (
        <div className={styles.stars} data-layer="stars">
          {STARS.map(([left, top]) => <i key={`${left}-${top}`} style={{ left: `${left}%`, top: `${top}%` }} />)}
        </div>
      )}
      <div className={`${styles.cloud} ${styles.near}`} data-layer="near">
        {!failed[near] && (
          <img key={near} className={styles.drift} src={near} alt="" draggable={false} decoding="async" ref={watch(near)} onLoad={(event) => { event.currentTarget.dataset.ready = "true"; }} onError={() => miss(near)} />
        )}
      </div>
      <div className={styles.shade} data-layer="shade" />
    </div>
  );
}
