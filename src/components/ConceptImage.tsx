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
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${styles.window} ${className}`}>
      {failed ? (
        <div
          style={{ padding: 24, color: "var(--muted)" }}
          role="img"
          aria-label={alt}
        >
          画面暂未接通
          <br />
          <small>{alt}</small>
        </div>
      ) : (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width="1200"
          height="800"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
