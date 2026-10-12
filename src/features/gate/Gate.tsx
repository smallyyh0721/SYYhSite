"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./Gate.module.css";
const Avatar = dynamic(() => import("@/features/avatar/Avatar"), {
  ssr: false,
  loading: () => <img src="/media/avatar-poster.png" alt="代理人物" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
});
export default function Gate() {
  const pointer = useRef({ x: 0, y: 0 });
  const root = useRef<HTMLElement>(null);
  const greeting = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();
  const enter = () => {
    if (entered.current) return;
    entered.current = true;
    router.push("/hub/");
  };
  useEffect(() => { router.prefetch("/hub/"); }, [router]);
  useEffect(() => {
    if (!connecting) return;
    greeting.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: enter })
        .fromTo("[data-hello]", { y: reduced.matches ? 0 : 24, opacity: 0 }, { y: 0, opacity: 1, duration: reduced.matches ? 0 : 0.6 })
        .fromTo("[data-stranger]", { y: reduced.matches ? 0 : 24, opacity: 0 }, { y: 0, opacity: 1, duration: reduced.matches ? 0 : 0.6 }, reduced.matches ? 0 : "-=0.25")
        .fromTo("[data-linking-line]", { scaleX: 0 }, { scaleX: 1, duration: reduced.matches ? 0 : 1.3 }, reduced.matches ? 0 : "-=0.1")
        .to({}, { duration: reduced.matches ? 0.8 : 0.6 })
        .to(root.current, { opacity: reduced.matches ? 1 : 0, duration: reduced.matches ? 0 : 0.35 });
    }, root);
    const onChange = () => { if (reduced.matches) enter(); };
    reduced.addEventListener("change", onChange);
    return () => { ctx.revert(); reduced.removeEventListener("change", onChange); };
  }, [connecting]);
  return (
    <section ref={root} className={styles.gate} data-phase={connecting ? "greeting" : "welcome"}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const box = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width - 0.5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height - 0.5) * 2)) };
      }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
      <div className={styles.environment} aria-hidden="true" />
      <div className={styles.portal} aria-hidden="true" />
      <div className={styles.figure}><Avatar pointer={pointer} /></div>
      {connecting ? (
        <div ref={greeting} className={styles.copy} role="status" aria-live="polite">
          <div className="eyebrow">02 / SIGNAL RECEIVED</div>
          <h1 tabIndex={-1} className={styles.title}><span data-hello>HELLO</span><span data-stranger className={styles.accent}>STRANGER.</span></h1>
          <div className={styles.linkTrack} aria-hidden="true"><span data-linking-line /></div>
          <p className={styles.subline}>很高兴遇见你。世界正在打开。</p>
          <button className={styles.skip} onClick={enter}>跳过 / SKIP ↗</button>
        </div>
      ) : (
        <div className={styles.copy}>
          <div className="eyebrow">01 / VISITOR ACCESS</div>
          <h1 tabIndex={-1} className={styles.title}>WELCOME TO<br />MY WORLD.</h1>
          <p className={styles.subline}>作品、灵感，与一些还在发生的故事。</p>
          <button className={styles.connect} onClick={() => setConnecting(true)}>CONNECT <span>↗</span></button>
          <Link className={styles.direct} href="/works/">直接看作品 ↗</Link>
        </div>
      )}
      <div className={styles.bottom}><span><i /> PERSONAL BROADCAST</span><Link href="/draft/">DRAFT V1 / 素材状态 ↗</Link></div>
    </section>
  );
}
