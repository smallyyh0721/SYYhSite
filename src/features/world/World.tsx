"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { islands } from "@/lib/contracts";
import { isFreshPointer } from "@/lib/world-focus.mjs";
import styles from "./World.module.css";
type Point = { x: number; y: number };
export default function World() {
  const router = useRouter();
  const current = useRef(islands[0].id);
  const lastPointer = useRef<Point | null>(null);
  const pressed = useRef<{ id: string; start: Point; pointerId: number } | null>(null);
  const entering = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focus, setFocus] = useState(islands[0].id);
  const [restoring, setRestoring] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("syyh-world-focus");
      if (islands.some((i) => i.id === saved)) {
        current.current = saved!;
        setFocus(saved!);
      }
    } catch {}
    const frame = requestAnimationFrame(() => setRestoring(false));
    return () => { cancelAnimationFrame(frame); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const save = () => {
    try { sessionStorage.setItem("syyh-world-focus", current.current); } catch {}
  };
  const select = (id: string) => {
    if (entering.current || current.current === id) return;
    current.current = id;
    setFocus(id);
    save();
  };
  const hover = (id: string | undefined, e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch" || pressed.current || entering.current) return;
    const next = { x: e.clientX, y: e.clientY };
    if (!isFreshPointer(lastPointer.current, next)) return;
    lastPointer.current = next;
    if (id) select(id);
  };
  const enter = (id: string) => {
    if (entering.current) return;
    const island = islands.find((i) => i.id === id);
    if (!island) return;
    select(id);
    save();
    entering.current = true;
    setLeaving(true);
    timer.current = setTimeout(() => router.push(island.href), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
  };
  const selected = islands.find((i) => i.id === focus)!;
  const peripheral = islands.filter((i) => i.id !== focus);
  return (
    <section className={styles.world} data-focused-island={focus} data-restoring={restoring} data-paused={paused} data-leaving={leaving} aria-label="四岛世界">
      <div className={styles.environment} aria-hidden="true" />
      <h1 tabIndex={-1} className={styles.srOnly}>探索四岛世界</h1>
      <div className={styles.hint}>THE WORLD IS OPEN / 04 CHANNELS</div>
      <div className={styles.stage} aria-label="鼠标悬停岛图片切换焦点，点击图片进入频道"
        onPointerMove={(e) => {
          const hit = (e.target as Element).closest<HTMLElement>("[data-island]");
          hover(hit?.dataset.island, e);
        }}
        onPointerLeave={() => { lastPointer.current = null; }}>
        {islands.map((island, i) => {
          const active = focus === island.id;
          const slot = active ? "center" : ["left", "upper", "lower"][peripheral.findIndex((v) => v.id === island.id)];
          return (
            <div key={island.id} className={styles.island} data-slot={slot} data-active={active}
              style={{ "--delay": String(i * -1.7) + "s" } as React.CSSProperties}>
              <button className={styles.hit} data-island={island.id}
                aria-label={island.name + " / " + island.channel + "，点击岛图片进入频道"}
                onPointerEnter={(e) => hover(island.id, e)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  pressed.current = { id: island.id, start: { x: e.clientX, y: e.clientY }, pointerId: e.pointerId };
                  e.currentTarget.setPointerCapture(e.pointerId);
                  select(island.id);
                }}
                onPointerUp={(e) => {
                  const p = pressed.current;
                  pressed.current = null;
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                  if (p?.id === island.id && Math.hypot(e.clientX - p.start.x, e.clientY - p.start.y) <= 8) enter(island.id);
                }}
                onPointerCancel={() => { pressed.current = null; }}
                onLostPointerCapture={() => { pressed.current = null; }}
                onFocus={() => { if (!pressed.current) select(island.id); }}
                onClick={(e) => { if (e.detail === 0) enter(island.id); }}
                disabled={leaving}>
                {failedImages.includes(island.id) ? (
                  <span className={styles.imageFallback}>{island.name}<small>画面暂未接通 · 点击仍可进入频道 ↗</small></span>
                ) : (
                  <img src={"/media/world-v3/" + island.id + ".webp"} width={1280} height={1280}
                    alt={island.name + "浮岛"} draggable={false} loading="eager" decoding="async"
                    onError={() => setFailedImages((old) => [...old, island.id])} />
                )}
              </button>
              <span className={styles.label} aria-hidden="true">{island.number} / {island.channel}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.caption} aria-live="polite">
        <span className={styles.channel}>{selected.number} / {selected.channel}</span>
        <h2>{selected.name}</h2>
        <span className={styles.enterHint}>CLICK ISLAND TO ENTER ↗</span>
      </div>
      <div className={styles.bottom}>
        <span className={styles.instruction}>MOVE TO FOCUS / CLICK ISLAND TO ENTER</span>
        <nav className={styles.channels} aria-label="切换聚焦岛屿">
          {islands.map((i) => <button key={i.id} aria-label={"聚焦" + i.name} aria-pressed={focus === i.id}
            onClick={() => select(i.id)} onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const idx = islands.findIndex((v) => v.id === i.id);
                const next = islands[(idx + (e.key === "ArrowRight" ? 1 : 3)) % 4];
                select(next.id);
                (e.currentTarget.parentElement?.querySelector('[aria-label="聚焦' + next.name + '"]') as HTMLButtonElement)?.focus();
              }
            }}>{i.number}<i /></button>)}
        </nav>
        <div className={styles.utility}>
          <button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "恢复漂浮" : "暂停漂浮"}</button>
          <Link href="/draft/">DRAFT / 状态 ↗</Link>
        </div>
      </div>
      <nav className={styles.accessibleNav} aria-label="直接进入频道">
        {islands.map((i) => <Link key={i.id} href={i.href} onClick={save}>{i.channel} ↗</Link>)}
      </nav>
      {leaving && <div className={styles.transition} role="status">TUNING IN…</div>}
    </section>
  );
}
