"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./Gate.module.css";
const Avatar = dynamic(() => import("@/features/avatar/Avatar"), {
  ssr: false,
  loading: () => (
    <img
      src="/media/avatar-poster.png"
      alt="代理人物"
      style={{ height: "100%", objectFit: "contain" }}
    />
  ),
});
export default function Gate() {
  const pointer = useRef({ x: 0, y: 0 });
  const [name, setName] = useState("");
  const [intro, setIntro] = useState(false);
  const introEl = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    try {
      setName(sessionStorage.getItem("syyh-callsign") || "");
      if (
        !sessionStorage.getItem("syyh-intro") &&
        !matchMedia("(prefers-reduced-motion:reduce)").matches
      ) {
        setIntro(true);
        sessionStorage.setItem("syyh-intro", "seen");
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!intro) return;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setIntro(false) });
      tl.fromTo(
        "[data-intro-line]",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.55 },
      )
        .fromTo(
          "[data-intro-title]",
          { y: 45, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
        )
        .fromTo(
          "[data-intro-hint]",
          { opacity: 0 },
          { opacity: 1, duration: 0.5 },
        )
        .to({}, { duration: 1.1 })
        .to(introEl.current, { opacity: 0, duration: 0.55 });
    }, introEl);
    return () => context.revert();
  }, [intro]);
  const enter = () => {
    try {
      sessionStorage.setItem(
        "syyh-callsign",
        [...name.trim()].slice(0, 24).join(""),
      );
    } catch {}
    router.push("/hub/");
  };
  return (
    <>
      <section
        className={styles.gate}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          const box = e.currentTarget.getBoundingClientRect();
          pointer.current = {
            x: Math.max(
              -1,
              Math.min(1, ((e.clientX - box.left) / box.width - 0.5) * 2),
            ),
            y: Math.max(
              -1,
              Math.min(1, ((e.clientY - box.top) / box.height - 0.5) * 2),
            ),
          };
        }}
        onPointerLeave={() => {
          pointer.current = { x: 0, y: 0 };
        }}
      >
        <div className={styles.copy}>
          <div className="eyebrow">PROTOCOL 00 / TUNE INTO MY WORLD</div>
          <h1 tabIndex={-1} className="display">
            YOU’RE
            <br />
            TUNED IN.
          </h1>
          <p className={styles.lead}>这里是 SYYH 的个人频道。</p>
          <p className="muted">作品、灵感与一些还在发生的故事。</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enter();
            }}
          >
            <label htmlFor="callsign">CALLSIGN / 怎么称呼你？</label>
            <input
              id="callsign"
              value={name}
              onChange={(e) =>
                setName([...e.target.value].slice(0, 24).join(""))
              }
              autoComplete="nickname"
              placeholder="输入昵称（可选）"
            />
            <div className={styles.actions}>
              <button className="button" type="submit">
                ENTER AS GUEST <span>▶</span>
              </button>
              <Link href="/works/">直接看作品 ↗</Link>
            </div>
          </form>
          <p className={styles.note}>昵称仅保存在当前浏览器会话。无需注册。</p>
        </div>
        <div className={styles.figure}>
          <div className={styles.orbit} />
          <Avatar pointer={pointer} />
          <span className={styles.figureNumber}>VISITOR 00 / 信号を受信中</span>
        </div>
        <span className={styles.corner}>CH-00</span>
      </section>
      {intro && (
        <div
          className={styles.intro}
          ref={introEl}
          role="dialog"
          aria-label="信号接入动画"
        >
          <button
            autoFocus
            onClick={() => setIntro(false)}
            className={styles.skip}
          >
            跳过 / SKIP ↗
          </button>
          <div data-intro-line className={styles.line} />
          <h2 data-intro-title className="display">
            SYYH /<br />
            SIGNAL.
          </h2>
          <p data-intro-hint className="eyebrow">
            MOVE · EXPLORE · CONNECT
          </p>
        </div>
      )}
    </>
  );
}
