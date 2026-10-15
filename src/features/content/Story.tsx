"use client";
import { useEffect, useState } from "react";
import ConceptImage from "@/components/ConceptImage";
import styles from "./Content.module.css";

const slots = [
  { id: "signal", label: "第一个位置" },
  { id: "ascent", label: "第二个位置" },
  { id: "arrival", label: "第三个位置" },
] as const;

export default function Story() {
  const [current, setCurrent] = useState<(typeof slots)[number]["id"]>(slots[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id === "signal" || id === "ascent" || id === "arrival") setCurrent(id);
          }
        }
      },
      { rootMargin: "-20% 0px -50% 0px" },
    );
    for (const slot of slots) {
      const section = document.getElementById(slot.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);
  const currentLabel = slots.find((slot) => slot.id === current)?.label ?? slots[0].label;
  return (
    <article className={styles.page}>
      <header className="pageHeading">
        <div>
          <h1 className="display" tabIndex={-1}>
            故事
          </h1>
        </div>
        <p>
          主题、章节名、正文和关键帧都还没有提供。下面留着三个位置，方便以后补上，也方便知道读到哪里。
        </p>
      </header>

      <div className={styles.notice}>
        <p>岛上的场景图不是这些章节的画面，所以这里不拿来填。</p>
      </div>

      <p className={styles.where} aria-live="polite">
        阅读位置：{currentLabel}
      </p>

      <nav aria-label="章节位置">
        <ol className={styles.chapters}>
          {slots.map((slot) => (
            <li key={slot.id}>
              <a
                href={`#${slot.id}`}
                aria-current={current === slot.id ? "location" : undefined}
                onClick={() => setCurrent(slot.id)}
              >
                {slot.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {slots.map((slot) => (
        <section
          id={slot.id}
          key={slot.id}
          className={styles.chapter}
          aria-labelledby={`${slot.id}-title`}
        >
          <div className={styles.chapterCopy}>
            <h2 id={`${slot.id}-title`} className={styles.chapterTitle}>
              {slot.label}
            </h2>
            <div className={styles.caption}>
              <p>这一章的标题和正文还没有写。</p>
              <p className="muted">关键帧也还没有，先留白。</p>
            </div>
          </div>
          <ConceptImage
            className={styles.frame}
            src=""
            alt={`${slot.label}还没有关键帧`}
          />
        </section>
      ))}
    </article>
  );
}
