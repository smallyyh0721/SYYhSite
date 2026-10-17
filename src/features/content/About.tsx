"use client";
import { useState } from "react";
import Link from "next/link";
import CharacterSequence, { type SequenceView } from "@/features/avatar/CharacterSequence";
import styles from "./Content.module.css";

const FIGURE: Record<SequenceView, string> = {
  loading: "人物肖像。",
  ready: "人物肖像。",
  poster: "人物静帧。其余朝向暂不可用。",
  empty: "人物画面暂不可用。",
};

export default function About() {
  const [paper, setPaper] = useState(false);
  const [figure, setFigure] = useState<SequenceView>("loading");
  return (
    <article
      className={`${styles.page} ${paper ? styles.paper : ""}`}
      data-paper={paper ? "on" : undefined}
      data-about="true"
    >
      <header className="pageHeading">
        <div>
          <h1 className="display" tabIndex={-1}>
            关于
          </h1>
        </div>
      </header>

      <section className="grid2">
        <div className={styles.heroCopy}>
          <p className="muted">
            I人，有点意思但不多。
          </p>
          <p className="muted">穿越到异世界过上了天天躺平的日子。</p>
          <div className={styles.actions}>
            <button
              type="button"
              className="button secondary"
              aria-pressed={paper}
              onClick={() => setPaper((value) => !value)}
            >
              {paper ? "退出纸页" : "纸页阅读"}
            </button>
            <Link className="button" href="/board/">
              去留言
            </Link>
          </div>
        </div>
        <figure className={styles.poster}>
          <CharacterSequence
            onView={setFigure}
            showReviewControls={process.env.NODE_ENV !== "production"}
          />
          <figcaption>{FIGURE[figure]}</figcaption>
        </figure>
      </section>

      <div className={styles.trio}>
        <section className="panel">
          <h2>兴趣</h2>
          <p className="muted">动漫喜欢但是没空看。</p>
        </section>
        <section className="panel">
          <h2>工具</h2>
          <p className="muted">AIGC/Agent技术懂点也不通。</p>
        </section>
        <section className="panel">
          <h2>别处见</h2>
          <p><a href="https://www.xiaohongshu.com/user/profile/69aa2b070000000033033a92" target="_blank" rel="noopener noreferrer">去小红书看看 ↗</a></p>
        </section>
      </div>
    </article>
  );
}
