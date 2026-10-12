import Link from "next/link";
import ConceptImage from "@/components/ConceptImage";
import { works, type Work } from "@/lib/contracts";
import styles from "./Content.module.css";

export default function WorkDetail({ work }: { work: Work }) {
  const index = works.findIndex((item) => item.slug === work.slug);
  const prev = index > 0 ? works[index - 1] : null;
  const next = index >= 0 && index < works.length - 1 ? works[index + 1] : null;

  return (
    <article className={styles.page}>
      <Link className={styles.back} href="/works/">
        ◀ 全部作品 / ALL WORKS
      </Link>
      <header className="pageHeading">
        <div>
          <p className="eyebrow">
            NO.{work.number} / {work.category}
          </p>
          <h1 className="display" lang="en" tabIndex={-1}>
            {work.subtitle}
          </h1>
        </div>
        <p>{work.title}。这是设计研究条目，不是真实客户项目。</p>
      </header>

      <div className="grid2">
        <div className={styles.heroMedia}>
          <ConceptImage
            className={styles.wide}
            src={work.image}
            alt={`${work.title}概念图，设计研究，非正式客户作品`}
            priority
          />
        </div>
        <div className={styles.heroCopy}>
          {work.draft ? (
            <p className={styles.badge}>DRAFT / DESIGN STUDY</p>
          ) : null}
          <h2 className={styles.workName}>{work.title}</h2>
          <p>{work.description}</p>
          <ul className={styles.facts}>
            <li>
              <span>CATEGORY</span>
              {work.category}
            </li>
            <li>
              <span>STATUS</span>
              {work.draft ? "Draft concept / 非正式作品" : "Published"}
            </li>
            <li>
              <span>PROCESS</span>过程图尚未提供。当前只有这一张概念图。
            </li>
          </ul>
          <p className="muted">设计过程与更多画面将在后续补充。</p>
        </div>
      </div>

      <nav className={styles.pager} aria-label="相邻作品">
        {prev ? (
          <Link className="button secondary" href={`/works/${prev.slug}/`}>
            ◀ {prev.number} {prev.title}
          </Link>
        ) : (
          <span className={styles.slot} />
        )}
        {next ? (
          <Link className="button" href={`/works/${next.slug}/`}>
            {next.number} {next.title} ▶
          </Link>
        ) : (
          <span className={styles.slot} />
        )}
      </nav>
    </article>
  );
}
