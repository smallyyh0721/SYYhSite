"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTheme } from "@/state/Theme";
import { IconMoon, IconSun } from "@/components/Icons";
import styles from "./Shell.module.css";
import { siteName, xiaohongshuUrl } from "@/lib/site";
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
  const workCollection = path === "/works/" || /^\/works\/themes\/[^/]+\/?$/.test(path);
  const main = useRef<HTMLElement>(null);
  const previous = useRef(path);
  useEffect(() => {
    if (previous.current === path) return;
    const from = previous.current;
    previous.current = path;
    if (workCollection && /^\/works\/(?!themes\/)[^/]+/.test(from)) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("syyh-works") || "null",
        );
        if (saved && (saved.path || "/works/") === path && Number.isFinite(saved.scroll)) {
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
        <Link className={styles.logo} href="/" aria-label="SYYH 首页">
          SYYH
        </Link>
        <span className={styles.signal}>个人频道</span>
        <nav aria-label="页面">
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
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
            >
              {t === "day" ? <IconSun /> : <IconMoon />}
              {t === "day" ? "日间" : "夜间"}
            </button>
          ))}
        </div>
      </header>
      <main
        ref={main}
        id="main"
        className={styles.main}
        onClickCapture={(e) => {
          if (!workCollection) return;
          const anchor = (e.target as Element).closest<HTMLAnchorElement>("a");
          const href = anchor?.getAttribute("href");
          if (anchor && href && /^\/works\/(?!themes\/)[^/]+/.test(href)) {
            try {
              const matching = [
                ...document.querySelectorAll<HTMLAnchorElement>("a"),
              ].filter((a) => a.getAttribute("href") === href);
              sessionStorage.setItem(
                "syyh-works",
                JSON.stringify({
                  path,
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
      {!immersive && (
        <footer className={styles.footer}>
          <span>{siteName}</span>
          <div className={styles.footerLinks}>
            <a href={xiaohongshuUrl} target="_blank" rel="noopener noreferrer">小红书 ↗</a>
            <Link href="/owner/">站主管理</Link>
          </div>
        </footer>
      )}
    </div>
  );
}
