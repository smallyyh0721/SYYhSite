import Link from "next/link";
import ConceptImage from "@/components/ConceptImage";
import { workThemes, works } from "@/lib/contracts";
import styles from "./Content.module.css";
import themeStyles from "./ThemeWorks.module.css";

export default function Works() {
  const featured = works[0];
  return (
    <article className={styles.page}>
      <header className="pageHeading">
        <div>
          <p className="eyebrow">CH-01 / SELECTED WORKS</p>
          <h1 className="display" lang="en" tabIndex={-1}>
            WORKS
          </h1>
        </div>
        <p>作品比介绍更先抵达。四个浮岛概念，四段关于空间与想象的设计研究。</p>
      </header>

      <div className={styles.notice}>
        <p>
          DRAFT / DESIGN STUDIES ·
          当前展示本站浮岛概念，个人真实作品将在后续补充。
        </p>
      </div>

      <section className={themeStyles.entries} aria-labelledby="theme-entries-title">
        <h2 id="theme-entries-title" className={themeStyles.entryTitle}>
          四个主题作品
        </h2>
        <p className="muted">
          每座岛进入自己的主题。这里只链到本站已有的设计研究。
        </p>
        <nav className={themeStyles.themes} aria-label="四个主题作品">
          {workThemes.map((theme) => (
            <Link key={theme.id} href={theme.href}>
              <span>{theme.name}</span>
              <small>{theme.title}</small>
            </Link>
          ))}
        </nav>
      </section>

      {featured ? (
        <section className="grid2" aria-labelledby="featured-title">
          <div className={styles.heroMedia}>
            <ConceptImage
              className={styles.wide}
              src={featured.image}
              alt={`${featured.title}概念图，设计研究，非正式客户作品`}
              priority
            />
            <p className={styles.stamp}>FEATURED / NO.{featured.number}</p>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              NO.{featured.number} / {featured.category}
            </p>
            <p className={styles.english} lang="en">
              {featured.subtitle}
            </p>
            <h2 id="featured-title" className={styles.workName}>
              {featured.title}
            </h2>
            {featured.draft ? (
              <p className={styles.badge}>DRAFT / DESIGN STUDY</p>
            ) : null}
            <p className="muted">{featured.description}</p>
            <Link className="button" href={`/works/${featured.slug}/`}>
              查看作品 / VIEW WORK ↗
            </Link>
          </div>
        </section>
      ) : (
        <div className="panel">
          <h2 className={styles.workName}>还没有公开作品</h2>
          <p className="muted">
            真实项目将在资料齐备后录入。此频道保持可阅读的空状态。
          </p>
        </div>
      )}

      {works.length > 0 ? (
        <ol className={styles.list}>
          {works.map((work) => (
            <li key={work.slug}>
              <Link
                className={styles.row}
                href={`/works/${work.slug}/`}
                aria-label={`${work.number} ${work.title}`}
              >
                <span className={styles.num} aria-hidden="true">
                  {work.number}
                </span>
                <span className={styles.rowBody}>
                  <strong className={styles.workName}>{work.title}</strong>
                  <p className="muted" lang="en">
                    {work.subtitle}
                  </p>
                </span>
                <span className={styles.rowMeta}>
                  <span>{work.category}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    ↗
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}
