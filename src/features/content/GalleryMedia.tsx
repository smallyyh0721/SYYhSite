"use client";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
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
  const [status, setStatus] = useState<"pending" | "loading" | "loaded" | "fail">("pending");
  const [nonce, setNonce] = useState(0);
  const url = nonce ? `${src}${src.includes("?") ? "&" : "?"}r=${nonce}` : src;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    if (!src) {
      setStatus("fail");
      return;
    }
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setStatus("loaded");
    };
    probe.onerror = () => {
      if (!cancelled) setStatus("fail");
    };
    probe.src = url;
    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [src, url]);

  const canOpen = Boolean(onOpen) && status === "loaded";

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
      data-image-state={status}
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
      {status === "loaded" ? (
        <img
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          style={{ objectFit: fit, objectPosition: fit === "contain" ? "center" : position || "center" }}
        />
      ) : null}
      {status === "loading" ? <p className={styles.stageCopy}>正在载入。</p> : null}
      {status === "fail" ? (
        <>
          <p className={styles.stageCopy}>
            {fallbackLabel ? `${fallbackLabel}。这张图还没有载入成功。` : "这张图还没有载入成功。"}
          </p>
          <button type="button" className={styles.retry} onClick={retry}>
            重新加载
          </button>
        </>
      ) : null}
    </div>
  );
}
