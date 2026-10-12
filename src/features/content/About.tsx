"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./Content.module.css";

export default function About() {
  const [paper, setPaper] = useState(false);
  return (
    <article
      className={`${styles.page} ${paper ? styles.paper : ""}`}
      data-paper={paper ? "on" : undefined}
    >
      <header className="pageHeading">
        <div>
          <p className="eyebrow">CH-02 / THE PERSON BEHIND THE SIGNAL</p>
          <h1 className="display" lang="en" tabIndex={-1}>
            BEHIND THE SIGNAL.
          </h1>
        </div>
        <p>一个关于创作、灵感与日常的个人频道。个人介绍将在下一版补充。</p>
      </header>

      <div className={styles.notice}>
        <p>个人资料正在整理。可开启纸页模式，换一个舒适的阅读底色。</p>
      </div>

      <section className="grid2">
        <div className={styles.heroCopy}>
          <p>
            把想象调到自己的频率。作品之外，这里还会记录思考、经历与生活里的小小发现。
          </p>
          <p className="muted">
            更多介绍与联系方式待补充。现在，可以在留言板留下你的信号。
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className="button secondary"
              aria-pressed={paper}
              onClick={() => setPaper((value) => !value)}
            >
              {paper ? "退出纸页 / EXIT PAPER ◀" : "纸页阅读 / PAPER MODE"}
            </button>
            <Link className="button" href="/board/">
              留言板 ↗
            </Link>
          </div>
        </div>
        <figure className={styles.poster}>
          <img
            src="/media/avatar-poster.png"
            alt="入口人物概念海报，非正式最终角色"
            width={420}
            height={560}
            decoding="async"
          />
          <figcaption className="muted">
            CONCEPT POSTER / 概念海报 · 非正式角色
          </figcaption>
        </figure>
      </section>

      <div className={styles.trio}>
        <section className="panel">
          <p className={styles.kicker}>01 / LIKES</p>
          <h2>兴趣</h2>
          <p className="muted">兴趣清单正在整理。</p>
        </section>
        <section className="panel">
          <p className={styles.kicker}>02 / TOOLS</p>
          <h2>工具</h2>
          <p className="muted">常用工具正在整理。</p>
        </section>
        <section className="panel">
          <p className={styles.kicker}>03 / TIMELINE</p>
          <h2>时间线</h2>
          <p className="muted">经历与时间线正在整理。</p>
        </section>
      </div>
    </article>
  );
}
