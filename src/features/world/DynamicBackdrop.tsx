"use client";
import { useEffect, useState } from "react";
import styles from "./DynamicBackdrop.module.css";
export default function DynamicBackdrop({ paused }: { paused: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return <div className={styles.environment} data-dynamic-background data-paused={paused || hidden} aria-hidden="true">
    <div className={styles.scenery} /><div className={styles.glow} /><div className={styles.mist} />
    <div className={styles.stars}>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: (i * 37 + 11) % 100 + "%", top: (i * 23 + 7) % 70 + "%", animationDelay: i * -.9 + "s", animationDuration: 4 + i % 5 + "s" }} />)}</div>
    <div className={styles.shade} />
  </div>;
}
