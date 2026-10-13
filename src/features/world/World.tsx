"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { islands, workThemes } from "@/lib/contracts";
import { isFreshPointer } from "@/lib/world-focus.mjs";
import { diamondTargets, HOVER_DELAY_MS, orbitPoint, slotFor, touchDecision, TRAVEL_SECONDS } from "@/lib/world-orbit.mjs";
import DynamicBackdrop from "./DynamicBackdrop";
import styles from "./World.module.css";
type Point = { x: number; y: number };
type Pose = Point & { size: number };
type Press = { id: string; start: Point; pointerId: number; touch: boolean };
export default function World() {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});
  const poses = useRef<Record<string, Pose>>({});
  const initialized = useRef(false);
  const skipTravel = useRef(false);
  const current = useRef(islands[0].id);
  const currentIndex = useRef(0);
  const motion = useRef(false);
  const lastPointer = useRef<Point | null>(null);
  const pressed = useRef<Press | null>(null);
  const entering = useRef(false);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCandidate = useRef<string | null>(null);
  const queuedHover = useRef<string | null>(null);
  const armed = useRef<string | null>(null);
  const touchTime = useRef(-Infinity);
  const [focus, setFocus] = useState(islands[0].id);
  const [moving, setMoving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [touchArmed, setTouchArmed] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const save = () => { try { sessionStorage.setItem("syyh-world-focus", current.current); } catch {} };
  const clearHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null; hoverCandidate.current = null; queuedHover.current = null;
  };
  const select = (id: string) => {
    if (entering.current || current.current === id) return;
    current.current = id; setFocus(id); save();
  };
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("syyh-world-focus");
      if (saved && saved !== current.current && islands.some((i) => i.id === saved)) { skipTravel.current = true; select(saved); }
    } catch {}
    return () => { clearHover(); if (routeTimer.current) clearTimeout(routeTimer.current); };
  }, []);
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let tween: gsap.core.Tween | null = null;
    let lastWidth = 0, lastHeight = 0;
    const paint = (id: string, point: Pose, tilt = 0) => {
      poses.current[id] = point;
      const element = nodes.current[id];
      if (!element) return;
      element.style.left = point.x + "px"; element.style.top = point.y + "px";
      element.style.width = point.size + "px"; element.style.height = point.size + "px";
      element.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
    };
    const draw = (animate: boolean) => {
      tween?.kill();
      const box = node.getBoundingClientRect();
      lastWidth = box.width; lastHeight = box.height;
      const targets = diamondTargets(box.width, box.height, window.innerHeight, window.innerWidth <= 600);
      const nextIndex = islands.findIndex((i) => i.id === focus);
      const direction = (nextIndex - currentIndex.current + 4) % 4 <= 2 ? 1 : -1;
      currentIndex.current = nextIndex;
      const paths = islands.map((island, i) => ({ id: island.id, start: poses.current[island.id] || targets[slotFor(i, nextIndex) as keyof typeof targets], end: targets[slotFor(i, nextIndex) as keyof typeof targets] }));
      const shifted = paths.some((path) => Math.hypot(path.start.x - path.end.x, path.start.y - path.end.y) > .5 || Math.abs(path.start.size - path.end.size) > .5);
      const duration = animate && shifted && !reduced.matches && !paused ? TRAVEL_SECONDS : 0;
      motion.current = duration > 0; setMoving(duration > 0);
      const progress = { value: 0 };
      const update = () => paths.forEach((path) => paint(path.id, orbitPoint(path.start, path.end, progress.value, direction), Math.sin(progress.value * Math.PI) * direction * 2));
      const finish = () => {
        paths.forEach((path) => paint(path.id, path.end));
        motion.current = false; setMoving(false);
        const queued = queuedHover.current; queuedHover.current = null;
        if (queued && queued === hoverCandidate.current && !hoverTimer.current) select(queued);
      };
      if (!duration) { progress.value = 1; update(); finish(); }
      else tween = gsap.to(progress, { value: 1, duration, ease: "power2.inOut", onUpdate: update, onComplete: finish });
    };
    draw(initialized.current && !skipTravel.current);
    initialized.current = true; skipTravel.current = false;
    const observer = new ResizeObserver(() => {
      const box = node.getBoundingClientRect();
      if (Math.abs(box.width - lastWidth) > .5 || Math.abs(box.height - lastHeight) > .5) draw(false);
    });
    observer.observe(node);
    const onChange = () => draw(false);
    reduced.addEventListener("change", onChange);
    return () => { observer.disconnect(); reduced.removeEventListener("change", onChange); tween?.kill(); };
  }, [focus, paused]);
  const touchMode = (pointerType: string) => pointerType === "touch" || matchMedia("(max-width: 600px), (hover: none), (pointer: coarse)").matches;
  const hover = (id: string | undefined, e: React.PointerEvent<HTMLElement>) => {
    if (touchMode(e.pointerType) || pressed.current || entering.current) return;
    const next = { x: e.clientX, y: e.clientY };
    if (!isFreshPointer(lastPointer.current, next)) return;
    lastPointer.current = next;
    if (!id || id === current.current) { clearHover(); return; }
    if (hoverCandidate.current === id) return;
    clearHover(); hoverCandidate.current = id;
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      if (hoverCandidate.current !== id) return;
      armed.current = null; setTouchArmed(null);
      if (motion.current) queuedHover.current = id;
      else select(id);
    }, HOVER_DELAY_MS);
  };
  const enter = (id: string) => {
    if (entering.current) return;
    const island = islands.find((i) => i.id === id);
    if (!island) return;
    clearHover(); select(id); save(); entering.current = true; setLeaving(true);
    routeTimer.current = setTimeout(() => router.push(island.href), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
  };
  const selected = islands.find((i) => i.id === focus)!;
  const selectedTheme = workThemes.find((i) => i.id === selected.themeId)!;
  const focusedIndex = islands.findIndex((i) => i.id === focus);
  return (
    <section className={styles.world} data-focused-island={focus} data-moving={moving} data-touch-armed={touchArmed || ""} data-paused={paused} data-leaving={leaving} aria-label="四岛主题作品世界"
      onPointerMove={(e) => { const hit = (e.target as Element).closest<HTMLElement>("[data-island]"); hover(hit?.dataset.island, e); }}
      onPointerLeave={() => { lastPointer.current = null; clearHover(); }}>
      <DynamicBackdrop paused={paused} />
      <h1 tabIndex={-1} className={styles.srOnly}>探索四个主题作品岛</h1>
      <div className={styles.hint}>04 ISLANDS / 04 CREATIVE WORLDS</div>
      <div ref={stage} className={styles.stage} aria-label="菱形轨道；悬停停留后聚焦，点击岛图片查看主题作品">
        {islands.map((island, i) => {
          const active = focus === island.id;
          return <div key={island.id} ref={(el) => { nodes.current[island.id] = el; }} className={styles.island} data-slot={slotFor(i, focusedIndex)} data-active={active} style={{ "--delay": String(i * -1.7) + "s" } as React.CSSProperties}>
            <button className={styles.hit} data-island={island.id} aria-label={island.name + "，聚焦或查看主题作品"}
              onPointerEnter={(e) => hover(island.id, e)}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                clearHover(); pressed.current = { id: island.id, start: { x: e.clientX, y: e.clientY }, pointerId: e.pointerId, touch: touchMode(e.pointerType) };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                const p = pressed.current; pressed.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                if (!p || p.id !== island.id) return;
                const distance = Math.hypot(e.clientX - p.start.x, e.clientY - p.start.y);
                if (p.touch) {
                  touchTime.current = performance.now();
                  const action = touchDecision({ target: island.id, focused: current.current, armed: armed.current, moving: motion.current, distance });
                  if (action === "enter") enter(island.id);
                  else if (action === "select") { select(island.id); armed.current = island.id; setTouchArmed(island.id); }
                } else if (distance <= 8) enter(island.id);
              }}
              onPointerCancel={() => { pressed.current = null; }} onLostPointerCapture={() => { pressed.current = null; }}
              onFocus={() => { if (!pressed.current) { clearHover(); select(island.id); } }}
              onClick={(e) => { if (e.detail === 0 && performance.now() - touchTime.current > 600) enter(island.id); }} disabled={leaving}>
              {failedImages.includes(island.id) ? <span className={styles.imageFallback}>{island.name}<small>画面暂未接通 · 主题作品仍可浏览 ↗</small></span> : <img src={"/media/world-v3/" + island.id + ".webp"} width={1200} height={1200} alt={island.name + "浮岛"} draggable={false} loading="eager" decoding="async" onError={() => setFailedImages((old) => [...old, island.id])} />}
            </button>
            <span className={styles.label} aria-hidden="true">{island.number} / {island.name}</span>
          </div>;
        })}
      </div>
      <div className={styles.caption} aria-live="polite">
        <span className={styles.channel}>{selected.number} / {selected.channel}</span><h2>{selected.name}</h2><span className={styles.themeTitle}>{selectedTheme.title}</span>
        <span className={styles.desktopHint}>CLICK ISLAND TO VIEW WORKS ↗</span>
        <span className={styles.mobileHint}>{moving ? "正在移到中央…" : touchArmed === focus ? "再点一次岛图片，查看主题作品 ↗" : "先点选岛，再点一次查看作品"}</span>
      </div>
      <div className={styles.bottom}>
        <span className={styles.instruction}>TAKE YOUR TIME / DISCOVER A WORLD</span>
        <nav className={styles.channels} aria-label="切换聚焦岛屿">
          {islands.map((i) => <button key={i.id} aria-label={"聚焦" + i.name} aria-pressed={focus === i.id} onClick={() => { clearHover(); armed.current = i.id; setTouchArmed(i.id); select(i.id); }} onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault(); clearHover();
              const idx = islands.findIndex((v) => v.id === i.id), next = islands[(idx + (e.key === "ArrowRight" ? 1 : 3)) % 4];
              select(next.id); (e.currentTarget.parentElement?.querySelector('[aria-label="聚焦' + next.name + '"]') as HTMLButtonElement)?.focus();
            }
          }}>{i.number}<i /></button>)}
        </nav>
        <div className={styles.utility}><button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "恢复动态" : "暂停动态"}</button><Link href="/draft/">DRAFT / 状态 ↗</Link></div>
      </div>
      <nav className={styles.accessibleNav} aria-label="直接查看主题作品">{islands.map((i) => <Link key={i.id} href={i.href} onClick={save}>{i.name} ↗</Link>)}</nav>
      {leaving && <div className={styles.transition} role="status">OPENING A CREATIVE WORLD…</div>}
    </section>
  );
}
