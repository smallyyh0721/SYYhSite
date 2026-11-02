"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { noscriptImageMarkup, shouldOpenFromClick, shouldOpenFromKey } from "./galleryModel";
import styles from "./Gallery.module.css";

type Props = {
  src: string;
  alt: string;
  className: string;
  fit: "contain" | "cover";
  position?: string;
  ratio?: "portrait" | "wide" | "square";
  priority?: boolean;
  openLabel?: string;
  fallbackLabel?: string;
  onOpen?: (stage: HTMLElement) => void;
};

export default function GalleryMedia({
  src,
  alt,
  className,
  fit,
  position,
  priority = false,
  ratio,
  openLabel,
  fallbackLabel,
  onOpen,
}: Props) {
  const [nonce, setNonce] = useState(0);
  const sourceKey = `${src}#${nonce}`;
  const [tracked, setTracked] = useState(sourceKey);
  const [status, setStatus] = useState<"pending" | "loaded" | "fail">(src ? "pending" : "fail");
  if (tracked !== sourceKey) {
    setTracked(sourceKey);
    setStatus(src ? "pending" : "fail");
  }
  const url = nonce ? `${src}${src.includes("?") ? "&" : "?"}r=${nonce}` : src;
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;
    if (node.complete && node.naturalWidth > 0) setStatus("loaded");
    else if (node.complete && node.naturalWidth === 0 && src) setStatus("fail");
  }, [src, url]);

  const canOpen = Boolean(onOpen) && Boolean(src) && status !== "fail";

  const open = (stage: HTMLElement) => {
    if (canOpen) onOpen?.(stage);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!shouldOpenFromKey(event) || !canOpen) return;
    event.preventDefault();
    open(event.currentTarget);
  };

  const retry = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNonce(Date.now());
  };

  return (
    <div
      className={`${styles.stage} ${className}`}
      data-image-state={status === "fail" ? "fail" : "loaded"}
      data-ratio={ratio}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? openLabel : undefined}
      onClick={(event) => {
        if (!shouldOpenFromClick(event) || !canOpen) return;
        open(event.currentTarget);
      }}
      onKeyDown={onKey}
    >
      <noscript dangerouslySetInnerHTML={{ __html: noscriptImageMarkup(src, alt) }} />
      {status !== "fail" ? (
        <img
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          style={{ objectFit: fit, objectPosition: fit === "contain" ? "center" : position || "center" }}
          ref={imgRef}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("fail")}
        />
      ) : (
        <>
          <p className={styles.stageCopy}>
            {fallbackLabel ? `${fallbackLabel}。这张图还没有载入成功。` : "这张图还没有载入成功。"}
          </p>
          <button type="button" className={styles.retry} onClick={retry}>
            重新加载
          </button>
        </>
      )}
    </div>
  );
}
