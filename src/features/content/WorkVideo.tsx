"use client";
import { useState } from "react";
import styles from "./Gallery.module.css";
export default function WorkVideo({ src, poster, alt, className = "" }: { src: string; poster?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const url = retry ? `${src}${src.includes("?") ? "&" : "?"}r=${retry}` : src;
  return <div className={`${styles.videoStage} ${className}`}>
    <video key={url} src={url} poster={poster} aria-label={alt} controls playsInline preload="metadata" onError={() => setFailed(true)} />
    {failed && <div role="status"><p>视频暂时未能载入。</p><button className={styles.retry} onClick={() => { setFailed(false); setRetry(Date.now()); }}>重新加载视频</button></div>}
  </div>;
}
