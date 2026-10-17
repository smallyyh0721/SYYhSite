"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { environmentArt } from "@/lib/v2-assets";
import { useTheme } from "@/state/Theme";
import GreetingImage from "./GreetingImage";
import type { GreetingReason } from "./greetingMedia";
import styles from "./Gate.module.css";

function usePortrait() {
  const [portrait, setPortrait] = useState(false);
  useLayoutEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return portrait;
}

function GateSky() {
  const { theme } = useTheme();
  const portrait = usePortrait();
  const src = environmentArt(theme, portrait);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={styles.environment} data-gate-sky data-failed={failed} aria-hidden="true">
      {!failed && <img key={src} src={src} alt="" draggable={false} onError={() => setFailed(true)} />}
    </div>
  );
}

export default function Gate() {
  const root = useRef<HTMLElement>(null);
  const entered = useRef(false);
  const [connecting, setConnecting] = useState(false);
  const [note, setNote] = useState("很高兴遇见你。");
  const router = useRouter();
  const enter = (reason: GreetingReason) => {
    if (entered.current) return;
    entered.current = true;
    try {
      sessionStorage.setItem("syyh-greeting-reason", reason);
    } catch {}
    router.push("/hub/");
  };
  useEffect(() => {
    router.prefetch("/hub/");
  }, [router]);
  useEffect(() => {
    if (!connecting) return;
    root.current?.querySelector<HTMLButtonElement>("[data-skip]")?.focus();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-hello]", { y: reduced.matches ? 0 : 16, opacity: 0 }, { y: 0, opacity: 1, duration: reduced.matches ? 0 : 0.45 });
      gsap.fromTo("[data-stranger]", { y: reduced.matches ? 0 : 16, opacity: 0 }, { y: 0, opacity: 1, duration: reduced.matches ? 0 : 0.45, delay: reduced.matches ? 0 : 0.12 });
    }, root);
    return () => ctx.revert();
  }, [connecting]);
  return (
    <section ref={root} className={styles.gate} data-phase={connecting ? "greeting" : "welcome"}>
      {!connecting && <GateSky />}
      {connecting && <GreetingImage onComplete={enter} onNote={setNote} />}
      {connecting ? (
        <div className={`${styles.copy} ${styles.greeting}`}>
          <div>
            <h1 tabIndex={-1} className={styles.title}>
              <span data-hello>HELLO</span>
              <span data-stranger className={styles.accent}>STRANGER.</span>
            </h1>
            <p className={styles.subline} role="status" aria-live="polite">{note}</p>
          </div>
          <button className={styles.skip} data-skip type="button" onClick={() => enter("skip")}>跳过</button>
        </div>
      ) : (
        <div className={`${styles.copy} ${styles.welcome}`}>
          <h1 tabIndex={-1} className={styles.title}>WELCOME TO<br />MY WORLD.</h1>
          <p className={styles.subline}>作品、灵感，与一些还在发生的故事。</p>
          <button className={styles.connect} type="button" onClick={() => setConnecting(true)}>CONNECT <span aria-hidden="true">↗</span></button>
          <Link className={styles.direct} href="/works/">直接看作品</Link>
        </div>
      )}
      {!connecting && (
        <div className={styles.bottom}>
          <Link href="/draft/">素材状态</Link>
        </div>
      )}
    </section>
  );
}
