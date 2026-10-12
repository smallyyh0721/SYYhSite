"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTheme } from "@/state/Theme";
import styles from "./Shell.module.css";
const links = [
  ["/hub/", "探索"],
  ["/works/", "作品"],
  ["/about/", "关于"],
  ["/story/", "故事"],
  ["/board/", "留言"],
];
export default function Shell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const path = usePathname();
  const immersive = path === "/" || path === "/hub/" || path === "/hub";
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  const previous = useRef(path);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const from = previous.current;
    previous.current = path;
    if (path === "/works/" && /^\/works\/[^/]+/.test(from)) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("syyh-works") || "null",
        );
        if (saved && Number.isFinite(saved.scroll)) {
          const frame = requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.scrollTo({ top: saved.scroll, behavior: "instant" });
              const matching = [
                ...document.querySelectorAll<HTMLAnchorElement>("a"),
              ].filter((a) => a.getAttribute("href") === saved.href);
              matching[saved.index || 0]?.focus({ preventScroll: true });
            }),
          );
          return () => cancelAnimationFrame(frame);
        }
      } catch {}
    }
    main.current
      ?.querySelector<HTMLElement>("h1")
      ?.focus({ preventScroll: true });
  }, [path]);
  return (
    <div className={immersive ? styles.immersive : styles.content}>
      <a className={styles.skip} href="#main">
        跳到内容
      </a>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="SYYH Signal 首页">
          SYYH<span>●</span>
        </Link>
        <span className={styles.signal}>SIGNAL / PERSONAL BROADCAST</span>
        <nav aria-label="频道导航">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.theme} aria-label="颜色主题">
          {(["day", "night"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
            >
              {t === "day" ? "☀ DAY" : "◐ NIGHT"}
            </button>
          ))}
        </div>
      </header>
      <main
        ref={main}
        id="main"
        className={styles.main}
        onClickCapture={(e) => {
          if (path !== "/works/") return;
          const anchor = (e.target as Element).closest<HTMLAnchorElement>("a");
          const href = anchor?.getAttribute("href");
          if (anchor && href && /^\/works\/[^/]+/.test(href)) {
            try {
              const matching = [
                ...document.querySelectorAll<HTMLAnchorElement>("a"),
              ].filter((a) => a.getAttribute("href") === href);
              sessionStorage.setItem(
                "syyh-works",
                JSON.stringify({
                  scroll: window.scrollY,
                  href,
                  index: matching.indexOf(anchor),
                }),
              );
            } catch {}
          }
        }}
      >
        {children}
      </main>
      {!immersive && <footer className={styles.footer}>
        <span>PERSONAL BROADCAST / EST. 2026</span>
        <Link href="/draft/">DRAFT V1 · 素材与完成状态 ↗</Link>
        <span>SYYH — SIGNAL RECEIVED</span>
      </footer>}
    </div>
  );
}
