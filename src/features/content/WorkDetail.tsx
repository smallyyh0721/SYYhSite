"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { works, workThemes, type Work } from "@/lib/contracts";
import { useTheme } from "@/state/Theme";
import GalleryMedia from "./GalleryMedia";
import styles from "./Gallery.module.css";
import { readSnapshot } from "./galleryHistory";
import { formalTheme, workArt, workHref } from "./galleryModel";

export default function WorkDetail({ work }: { work: Work }) {
  const { theme } = useTheme();
  const [backHref, setBackHref] = useState("/works/");
  const label = formalTheme(work.themeId).label;
  const usage = formalTheme(work.themeId).usage;
  const index = works.findIndex((item) => item.slug === work.slug);
  const prev = index > 0 ? works[index - 1] : null;
  const next = index >= 0 && index < works.length - 1 ? works[index + 1] : null;

  useEffect(() => {
    const saved = readSnapshot();
    if (saved?.path) setBackHref(saved.path);
  }, []);

  return (
    <article className={styles.page} data-gallery="detail">
      <Link className={styles.softBtn} href={backHref}>
        返回作品列表
      </Link>

      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {label} · 本站设计研究
          </p>
          <h1 tabIndex={-1}>{work.title}</h1>
        </div>
        <p>
          {usage}。这是本站浮岛概念研究，不是真实客户项目，也不是独立的另一件个人作品。
        </p>
      </header>

      <nav className={styles.themes} aria-label="四个主题作品">
        {workThemes.map((item) => (
          <Link
            key={item.id}
            className={styles.chip}
            href={item.href}
            aria-current={item.id === work.themeId ? "page" : undefined}
          >
            {formalTheme(item.id).label}
          </Link>
        ))}
      </nav>

      <div className={styles.detailGrid}>
        <GalleryMedia
          className={styles.detailMedia}
          src={workArt(work, theme)}
          alt={`${label} 概念图，本站设计研究，非正式客户作品`}
          fit="contain"
          priority
        />
        <div className={styles.detailCopy}>
          <span className={styles.mark}>本站设计研究</span>
          <h2 className={styles.detailTitle}>{label}</h2>
          <p className={styles.detailBody}>{work.description}</p>
          <p className={styles.hint}>{work.subtitle}</p>
          <p className={styles.hint}>类别来自本站研究条目，没有客户、日期或热度数据。</p>
        </div>
      </div>

      <section className={styles.process} aria-labelledby="process-title">
        <h2 id="process-title">过程图</h2>
        <p className={styles.processCopy}>过程图尚未提供。当前没有可显示的制作过程。</p>
        <div className={`${styles.stage} ${styles.processStage}`} data-image-state="empty">
          <p className={styles.stageCopy}>缺失过程图。这一项会保持可见的空状态，不会用其他图顶替。</p>
        </div>
      </section>

      <nav className={styles.returns} aria-label="相邻研究条目">
        {prev ? (
          <Link className={styles.softBtn} href={workHref(prev.slug)}>
            上一篇 {formalTheme(prev.themeId).label}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className={styles.detailLink} href={workHref(next.slug)}>
            下一篇 {formalTheme(next.themeId).label}
          </Link>
        ) : (
          <span />
        )}
        <Link className={styles.softBtn} href="/hub/">
          返回四岛
        </Link>
      </nav>
    </article>
  );
}
