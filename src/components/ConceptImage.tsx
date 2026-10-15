"use client";
import { useState } from "react";
import styles from "./ConceptImage.module.css";
export default function ConceptImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!src);
  const [ready, setReady] = useState(false);
  return (
    <div className={`${styles.window} ${className}`}>
      {failed ? (
        <div className={styles.fallback}>
          <strong>这张图还没有放进来</strong>
          <span>{alt}</span>
        </div>
      ) : (
        <img
          className={ready ? styles.image : styles.holding}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width="1200"
          height="800"
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
