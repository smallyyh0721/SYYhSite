import ConceptImage from "@/components/ConceptImage";
import { works } from "@/lib/contracts";
import styles from "./Content.module.css";

const chapters = [
  {
    id: "signal",
    number: "01",
    title: "SIGNAL",
    slug: "sky-city",
    caption: "夜空里先出现一条信号。这一章只说明「接通」这件事。",
    body: "穿过安静的夜色，远处的轮廓逐渐亮起。我们沿着那条微弱的线，寻找一座尚未命名的城。",
  },
  {
    id: "ascent",
    number: "02",
    title: "ASCENT",
    slug: "ancient-landform",
    caption: "岛屿从雾里抬升。时间在岩层上留下纹理。",
    body: "越过古老的石环和峡谷，水流在空中划出新的航线。每一层岩石，都藏着一个还没被听见的故事。",
  },
  {
    id: "arrival",
    number: "03",
    title: "ARRIVAL",
    slug: "anime-home",
    caption: "抵达一座可以坐下创作的宅岛。",
    body: "窗内的灯还亮着，桌上留着一本打开的书。旅行可以暂时停下，新的创作正要开始。",
  },
] as const;

export default function Story() {
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  return (
    <article className={styles.page}>
      <header className="pageHeading">
        <div>
          <p className="eyebrow">CH-03 / KEYFRAME STUDY</p>
          <h1 className="display" lang="en" tabIndex={-1}>
            THE CITY THAT FLOATS.
          </h1>
        </div>
        <p>
          三章 SIGNAL / ASCENT / ARRIVAL
          是概念叙事初稿。沿着三个章节，慢慢读完这次空中旅行。
        </p>
      </header>

      <div className={styles.notice}>
        <p>
          DRAFT / KEYFRAME STUDY ·
          现有浮岛概念图作为章节预览，正式故事素材将在后续补充。
        </p>
      </div>

      <nav aria-label="章节">
        <ol className={styles.chapters}>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a href={`#${chapter.id}`}>
                {chapter.number} {chapter.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {chapters.map((chapter) => {
        const image = bySlug.get(chapter.slug);
        return (
          <section
            id={chapter.id}
            key={chapter.id}
            className={styles.chapter}
            aria-labelledby={`${chapter.id}-title`}
          >
            <div className={styles.chapterCopy}>
              <p className={styles.kicker}>EP.{chapter.number} / KEYFRAME</p>
              <h2
                id={`${chapter.id}-title`}
                className={styles.chapterTitle}
                lang="en"
              >
                {chapter.title}
              </h2>
              <div className={styles.caption}>
                <p>{chapter.caption}</p>
                <p className="muted">{chapter.body}</p>
              </div>
            </div>
            {image ? (
              <ConceptImage
                className={styles.frame}
                src={image.image}
                alt={`${image.title}概念图，用作 ${chapter.title} 章节占位`}
              />
            ) : (
              <div className={`panel ${styles.frame}`}>
                <p className="muted">{chapter.title} 图像尚未接入。</p>
              </div>
            )}
          </section>
        );
      })}
    </article>
  );
}
