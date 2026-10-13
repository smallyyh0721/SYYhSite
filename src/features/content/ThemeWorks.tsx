import Link from "next/link";
import ConceptImage from "@/components/ConceptImage";
import { workThemes, works, type WorkThemeId } from "@/lib/contracts";
import styles from "./ThemeWorks.module.css";

export default function ThemeWorks({ themeId }: { themeId: WorkThemeId }) {
  const theme = workThemes.find((item) => item.id === themeId);
  const themed = works.filter((work) => work.themeId === themeId);
  const islandName = theme?.name ?? themeId;

  return (
    <article className={styles.page}>
      <nav className={styles.themes} aria-label="四个主题作品">
        {workThemes.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={item.id === themeId ? "page" : undefined}
          >
            <span>{item.name}</span>
            <small>{item.subtitle}</small>
          </Link>
        ))}
      </nav>

      <header className="pageHeading">
        <div>
          <p className="eyebrow">{theme?.subtitle ?? "THEME WORKS"}</p>
          <h1 className="display" tabIndex={-1}>
            {islandName}
          </h1>
        </div>
        <p>{theme?.description ?? "这个主题的本站设计研究。"}</p>
      </header>

      <div className={styles.notice}>
        <p>DESIGN STUDY · 本站设计研究</p>
        <p>
          当前展示本站浮岛设计研究。更多个人作品将在资料齐备后上线。
        </p>
      </div>

      <p className={styles.facts}>
        <span>岛名 / {islandName}</span>
        <span>主题 / {theme?.title ?? themeId}</span>
      </p>

      {themed.length > 0 ? (
        <ul className={styles.list}>
          {themed.map((work, index) => (
            <li key={work.slug} className={styles.card}>
              <ConceptImage
                className={styles.media}
                src={work.image}
                alt={`${work.title}概念图，本站设计研究`}
                priority={index === 0}
              />
              <div className={styles.copy}>
                <p className={styles.badge}>DRAFT / 本站设计研究</p>
                <p className={styles.meta}>
                  <span>类别</span>
                  {work.category}
                </p>
                <h2 className={styles.workName}>{work.title}</h2>
                <p className={styles.subtitle} lang="en">
                  {work.subtitle}
                </p>
                <p className="muted">{work.description}</p>
                <Link className="button" href={`/works/${work.slug}/`}>
                  查看作品详情 ↗
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel">
          <h2 className={styles.workName}>这个主题还没有设计研究</h2>
          <p className="muted">
            这个主题的作品正在整理，更多内容将在资料齐备后上线。
          </p>
        </div>
      )}

      <nav className={styles.returns} aria-label="返回">
        <Link className="button secondary" href="/hub/">
          返回四岛
        </Link>
        <Link className="button" href="/works/">
          全部作品
        </Link>
      </nav>
    </article>
  );
}
