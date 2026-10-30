"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { environmentArt, greetingImageArt } from "@/lib/v2-assets";
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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Gate() {
  const root = useRef<HTMLElement>(null);
  const entered = useRef(false);
  const connecting = useRef(false);
  const revealed = useRef(false);
  const handoff = useRef<gsap.core.Timeline | null>(null);
  const [phase, setPhase] = useState<"welcome" | "greeting">("welcome");
  const [welcomeOn, setWelcomeOn] = useState(true);
  const [skyOn, setSkyOn] = useState(true);
  const [note, setNote] = useState("很高兴遇见你。");
  const router = useRouter();
  const enter = (reason: GreetingReason) => {
    if (entered.current) return;
    entered.current = true;
    handoff.current?.kill();
    try {
      sessionStorage.setItem("syyh-greeting-reason", reason);
    } catch {}
    router.push("/hub/");
  };
  const connect = () => {
    if (entered.current || connecting.current) return;
    connecting.current = true;
    setPhase("greeting");
  };
  const onGreetingReady = () => {
    if (revealed.current || entered.current) return;
    revealed.current = true;
    const scope = root.current;
    if (!scope) return;
    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set(scope.querySelector("[data-welcome]"), { autoAlpha: 0 });
      gsap.set(scope.querySelector("[data-gate-sky]"), { autoAlpha: 0 });
      gsap.set(scope.querySelector("[data-greeting]"), { autoAlpha: 1 });
      gsap.set(scope.querySelector("[data-greeting-shade]"), { opacity: 1 });
      gsap.set(scope.querySelectorAll("[data-hello], [data-stranger], [data-note], [data-skip]"), {
        autoAlpha: 1,
        y: 0,
      });
      setWelcomeOn(false);
      setSkyOn(false);
      return;
    }
    const sky = scope.querySelector("[data-gate-sky]");
    const stage = scope.querySelector("[data-greeting]");
    const shade = scope.querySelector("[data-greeting-shade]");
    const hello = scope.querySelector("[data-hello]");
    const stranger = scope.querySelector("[data-stranger]");
    const line = scope.querySelector("[data-note]");
    const tl = gsap.timeline({
      onComplete: () => {
        if (!entered.current) setSkyOn(false);
      },
    });
    handoff.current = tl;
    tl.to(sky, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, 0.16)
      .to(stage, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, 0.16)
      .to(shade, { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0.16)
      .to(hello, { autoAlpha: 1, y: 0, duration: 0.48, ease: "power2.out" }, 0.42)
      .to(stranger, { autoAlpha: 1, y: 0, duration: 0.48, ease: "power2.out" }, 0.54)
      .to(line, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.66);
  };
  useEffect(() => {
    router.prefetch("/hub/");
  }, [router]);
  useEffect(() => {
    for (const src of [greetingImageArt.sheet, greetingImageArt.fallback]) {
      const image = new Image();
      image.src = src;
      image.decode?.().catch(() => {});
    }
  }, []);
  useEffect(() => {
    return () => {
      handoff.current?.kill();
    };
  }, []);
  useLayoutEffect(() => {
    if (phase !== "greeting") return;
    let alive = true;
    const reduced = prefersReducedMotion();
    root.current?.querySelector<HTMLButtonElement>("[data-skip]")?.focus();
    if (reduced) {
      gsap.set(root.current?.querySelector("[data-welcome]") ?? [], { autoAlpha: 0 });
      gsap.set(root.current?.querySelector("[data-greeting]") ?? [], { autoAlpha: 0 });
      gsap.set(root.current?.querySelector("[data-skip]") ?? [], { autoAlpha: 1, y: 0 });
      return () => {
        alive = false;
      };
    }
    const ctx = gsap.context(() => {
      gsap.set("[data-greeting]", { autoAlpha: 0 });
      gsap.set("[data-greeting-shade]", { opacity: 0 });
      gsap.set("[data-hello], [data-stranger], [data-note]", { autoAlpha: 0, y: 14 });
      gsap.set("[data-skip]", { opacity: 0, y: 8 });
      gsap
        .timeline({
          onComplete: () => {
            if (alive) setWelcomeOn(false);
          },
        })
        .to("[data-welcome-title]", { autoAlpha: 0, y: -16, duration: 0.42, ease: "power2.inOut" }, 0)
        .to("[data-welcome-sub]", { autoAlpha: 0, y: -10, duration: 0.36, ease: "power2.inOut" }, 0.04)
        .to("[data-welcome-actions]", { autoAlpha: 0, y: 8, duration: 0.32, ease: "power2.inOut" }, 0.06)
        .to("[data-skip]", { opacity: 1, y: 0, duration: 0.36, ease: "power2.out" }, 0.14);
    }, root);
    return () => {
      alive = false;
      ctx.revert();
    };
  }, [phase]);
  return (
    <section ref={root} className={styles.gate} data-phase={phase}>
      {skyOn && <GateSky />}
      {phase === "greeting" && (
        <GreetingImage onComplete={enter} onNote={setNote} onReady={onGreetingReady} />
      )}
      {phase === "greeting" && (
        <div className={`${styles.copy} ${styles.greeting}`}>
          <div className={styles.shade} data-greeting-shade aria-hidden="true" />
          <div>
            <h1 tabIndex={-1} className={styles.title}>
              <span data-hello>HELLO</span>
              <span data-stranger className={styles.accent}>STRANGER.</span>
            </h1>
            <p className={styles.subline} data-note role="status" aria-live="polite">{note}</p>
          </div>
          <button className={styles.skip} data-skip type="button" onClick={() => enter("skip")}>跳过</button>
        </div>
      )}
      {welcomeOn && (
        <div
          className={`${styles.copy} ${styles.welcome}`}
          data-welcome
          data-leaving={phase === "greeting" ? "true" : "false"}
          aria-hidden={phase === "greeting" ? true : undefined}
        >
          <h1 tabIndex={-1} className={styles.title} data-welcome-title>WELCOME TO<br />MY WORLD.</h1>
          <p className={styles.subline} data-welcome-sub>作品、灵感，与一些还在发生的故事。</p>
          <div className={styles.actions} data-welcome-actions>
            <button className={styles.connect} type="button" onClick={connect}>CONNECT <span aria-hidden="true">↗</span></button>
            <Link className={styles.direct} href="/works/">直接看作品</Link>
          </div>
        </div>
      )}
    </section>
  );
}
