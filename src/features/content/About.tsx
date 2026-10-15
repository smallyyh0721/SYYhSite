"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PosterFallback from "@/features/avatar/PosterFallback";
import styles from "./Content.module.css";
type FigureView = "loading" | "live" | "poster" | "empty";
const FIGURE: Record<FigureView, string> = {
  loading: "人物画面载入中。",
  live: "移动指针，目光会轻轻跟随。",
  poster: "人物静帧。",
  empty: "人物画面暂不可用。",
};
const Avatar = dynamic(() => import("@/features/avatar/Avatar"), {
  ssr: false,
  loading: () => <PosterFallback pending />,
});

export default function About() {
  const [paper, setPaper] = useState(false);
  const [figure, setFigure] = useState<FigureView>("loading");
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const reset = () => { pointer.current = { x: 0, y: 0 }; };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current = {
        x: Math.max(-1, Math.min(1, (event.clientX / innerWidth - .5) * 2)),
        y: Math.max(-1, Math.min(1, (event.clientY / innerHeight - .5) * 2)),
      };
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) reset(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerout", leave);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("blur", reset);
    };
  }, []);
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
        <p>自我介绍、兴趣与经历待补充。</p>
      </header>

      <section className="grid2">
        <div className={styles.heroCopy}>
          <p className="muted">
            个人简介待补充。
          </p>
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
          <div className={styles.avatarStage} aria-hidden="true"><Avatar pointer={pointer} pointerTracking onView={setFigure} /></div>
          <figcaption>{FIGURE[figure]}</figcaption>
        </figure>
      </section>

      <div className={styles.trio}>
        <section className="panel">
          <h2>兴趣</h2>
          <p className="muted">还没有提供。</p>
        </section>
        <section className="panel">
          <h2>工具</h2>
          <p className="muted">还没有提供。</p>
        </section>
        <section className="panel">
          <h2>经历</h2>
          <p className="muted">还没有提供。</p>
        </section>
      </div>
    </article>
  );
}
