"use client";
import { useEffect, useState } from "react";
import { story } from "@/lib/story-content";
import styles from "./Story.module.css";

export default function Story() {
  const [current, setCurrent] = useState(story.chapters[0].id);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id);
    }, { rootMargin: "-15% 0px -45% 0px" });
    for (const chapter of story.chapters) {
      const section = document.getElementById(chapter.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <article className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{story.subtitle} · {story.fictionLabel}</p>
        <h1 tabIndex={-1}>{story.title}</h1>
        <p className={styles.intro}>{story.introduction}</p>
      </header>
      <div className={styles.characters} aria-label="故事人物">
        {story.characters.map((character) => (
          <section key={character.name}>
            <h2>{character.name}</h2>
            <p>{character.description}</p>
          </section>
        ))}
      </div>
      <nav className={styles.chapterNav} aria-label="故事章节">
        {story.chapters.map((chapter) => (
          <a key={chapter.id} href={`#${chapter.id}`} aria-current={current === chapter.id ? "location" : undefined} onClick={() => setCurrent(chapter.id)}>
            <span>{chapter.number}</span> {chapter.title}
          </a>
        ))}
      </nav>
      {story.chapters.map((chapter, index) => (
        <section id={chapter.id} key={chapter.id} className={styles.chapter} aria-labelledby={`${chapter.id}-title`}>
          <figure>
            <img src={chapter.image} alt={chapter.alt} width={1672} height={941} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
            <figcaption>{story.subtitle} / {chapter.number}</figcaption>
          </figure>
          <div className={styles.copy}>
            <span className={styles.number}>{chapter.number}</span>
            <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
            {chapter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      ))}
    </article>
  );
}
