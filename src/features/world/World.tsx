"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ConceptImage from "@/components/ConceptImage";
import { islands } from "@/lib/contracts";
import { clamp, damp, selectFocus } from "@/lib/motion.mjs";
import styles from "./World.module.css";
type Point = { x: number; y: number };
export default function World() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const current = useRef<Point>({ x: 0, y: 55 });
  const target = useRef<Point>({ x: 0, y: 55 });
  const projection = useRef({ x: 0.92, y: 0.56 });
  const entering = useRef(false);
  const focusRef = useRef<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pausedRef = useRef(false);
  const drag = useRef<{
    x: number;
    y: number;
    start: Point;
    moved: boolean;
  } | null>(null);
  const router = useRouter();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = () => {
    try {
      sessionStorage.setItem("syyh-world", JSON.stringify(current.current));
    } catch {}
  };
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion:reduce)");
    setStill(q.matches);
    const update = () => setStill(q.matches);
    q.addEventListener("change", update);
    try {
      const p = JSON.parse(sessionStorage.getItem("syyh-world") || "null");
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        current.current = target.current = {
          x: clamp(p.x, -600, 600),
          y: clamp(p.y, -440, 440),
        };
      }
    } catch {}
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const c = current.current;
      c.x = q.matches ? target.current.x : damp(c.x, target.current.x, 7, dt);
      c.y = q.matches ? target.current.y : damp(c.y, target.current.y, 7, dt);
      const width = root.current?.clientWidth || 900;
      const mobile = width < 600;
      const sx = Math.min(
        0.92,
        Math.max(0.12, (width - (mobile ? 136 : 250) - 40) / 800),
      );
      const sy = Math.min(
        0.8,
        Math.max(
          0.3,
          ((stage.current?.clientHeight || 620) - (mobile ? 200 : 320) - 40) /
            480,
        ),
      );
      projection.current = { x: sx, y: sy };
      root.current?.style.setProperty("--map-x", `${c.x * sx}px`);
      root.current?.style.setProperty("--map-y", `${c.y * sy}px`);
      root.current?.style.setProperty("--map-scale-x", String(sx));
      root.current?.style.setProperty("--map-scale-y", String(sy));
      if (root.current) {
        root.current.dataset.camera = `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
      }
      const f = selectFocus(c, islands, focusRef.current);
      if (f !== focusRef.current) {
        focusRef.current = f;
        setFocus(f);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onHide = () => {
      if (document.hidden) save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(frame);
      q.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onHide);
      save();
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);
  useEffect(() => {
    pausedRef.current = paused || leaving;
  }, [paused, leaving]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (pausedRef.current) return;
      target.current = {
        x: clamp(target.current.x + e.deltaX * 0.7, -600, 600),
        y: clamp(target.current.y + e.deltaY * 0.7, -440, 440),
      };
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const enter = (id: string) => {
    if (entering.current || focusRef.current !== id || drag.current?.moved)
      return;
    const island = islands.find((i) => i.id === id)!;
    save();
    entering.current = true;
    setLeaving(true);
    pausedRef.current = true;
    timeout.current = setTimeout(
      () => router.push(island.href),
      still ? 0 : 650,
    );
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pausedRef.current) return;
    if (e.pointerType === "touch" && drag.current) {
      const d = drag.current;
      const dx = e.clientX - d.x,
        dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) > 8) d.moved = true;
      target.current = {
        x: clamp(d.start.x - dx / projection.current.x, -600, 600),
        y: clamp(d.start.y - dy / projection.current.y, -440, 440),
      };
      return;
    }
    if (
      e.pointerType === "touch" ||
      (e.target instanceof Element && e.target.closest("[data-hud]"))
    )
      return;
    const box = e.currentTarget.getBoundingClientRect();
    target.current = {
      x: clamp(((e.clientX - box.left) / box.width - 0.5) * 1200, -600, 600),
      y: clamp(((e.clientY - box.top) / box.height - 0.5) * 880, -440, 440),
    };
  };
  const focused = islands.find((i) => i.id === focus);
  return (
    <>
      <div className="pageHeading">
        <div>
          <div className="eyebrow">CH-00 → CH-04 / THE WORLD IS OPEN</div>
          <h1 tabIndex={-1} className="display">
            FIND YOUR
            <br />
            FREQUENCY.
          </h1>
        </div>
        <p>
          移动、抵达，再进入。
          <br />
          四座岛屿，四个可以调入的频道。
        </p>
      </div>
      <div
        ref={root}
        className={`${styles.world} ${leaving ? styles.leaving : ""}`}
        data-still={still}
      >
        <div
          ref={stage}
          className={styles.stage}
          tabIndex={0}
          role="region"
          aria-label="浮岛探索地图，方向键移动，抵达后按Enter进入"
          onPointerMove={move}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                start: { ...target.current },
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") {
              const d = drag.current;
              if (d && !d.moved) {
                const hit = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>("[data-island]");
                if (hit?.dataset.island) enter(hit.dataset.island);
              }
              setTimeout(() => {
                drag.current = null;
              }, 0);
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            const moves: Record<string, Point> = {
              ArrowLeft: { x: -90, y: 0 },
              ArrowRight: { x: 90, y: 0 },
              ArrowUp: { x: 0, y: -90 },
              ArrowDown: { x: 0, y: 90 },
            };
            if (e.target !== e.currentTarget) return;
            if (moves[e.key]) {
              e.preventDefault();
              if (pausedRef.current) return;
              target.current = {
                x: clamp(target.current.x + moves[e.key].x, -600, 600),
                y: clamp(target.current.y + moves[e.key].y, -440, 440),
              };
            }
            if (e.key === "Enter" && focusRef.current) {
              e.preventDefault();
              enter(focusRef.current);
            }
          }}
        >
          <div className={styles.grid} />
          <div className={styles.crosshair} aria-hidden="true">
            +
          </div>
          {islands.map((island, i) => (
            <button
              key={island.id}
              data-island={island.id}
              className={`${styles.island} ${focus === island.id ? styles.active : ""}`}
              style={
                {
                  "--x": `${island.x}px`,
                  "--y": `${island.y}px`,
                  "--delay": `${i * -1.3}s`,
                } as React.CSSProperties
              }
              onClick={(e) => {
                if (e.detail === 0 || e.nativeEvent instanceof MouseEvent)
                  enter(island.id);
              }}
              aria-label={`${island.name} / ${island.channel}${focus === island.id ? "，已抵达，点击进入" : "，需抵达后进入"}`}
              aria-disabled={focus !== island.id}
            >
              <div className={styles.islandArt}>
                <ConceptImage
                  src={island.image}
                  alt={`${island.name}概念图`}
                  priority={i < 2}
                />
              </div>
              <span className={styles.tag}>
                <b>
                  CH-{island.number} / {island.channel}
                </b>
                <span>
                  {island.name} {focus === island.id ? "↗" : "·"}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div
          className={styles.hud}
          data-hud
        >
          <div className={styles.status} aria-live="polite">
            <span className="eyebrow">
              {focused ? "SIGNAL FOUND" : "SEARCHING / 調律中"}
            </span>
            <strong>
              {focused
                ? `${focused.name} · ${focused.channel}`
                : "移动视角，靠近一座岛"}
            </strong>
          </div>
          <div className={styles.controls}>
            {focused && (
              <button className="button" onClick={() => enter(focused.id)}>
                进入频道 ↗
              </button>
            )}
            <button
              className="button secondary"
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "恢复视角" : "暂停视角"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                target.current = { x: 0, y: 55 };
                setPaused(false);
              }}
            >
              总览
            </button>
          </div>
        </div>
        <div className={styles.map} data-hud aria-label="位置小地图">
          <svg viewBox="0 0 120 100" aria-hidden="true">
            <path
              d="M8 8H112V92H8Z M60 8V92 M8 50H112"
              fill="none"
              stroke="currentColor"
              opacity=".3"
            />
            {islands.map((i) => (
              <circle
                key={i.id}
                cx={60 + i.x / 12}
                cy={50 + i.y / 11}
                r={focus === i.id ? 5 : 3}
                fill={focus === i.id ? "var(--primary)" : "currentColor"}
              />
            ))}
          </svg>
          <span>WORLD / 4 CHANNELS</span>
        </div>
        {leaving && <div className={styles.transition}>TUNING IN…</div>}
      </div>
      <div className={styles.below}>
        <p>
          鼠标上下左右 · 滚轮双轴 · 触摸拖动 · 方向键 / Enter
          <br />
          <small>
            岛屿与频道为 draft 临时绑定，后续可调整。未抵达的岛屿点击不会跳转。
          </small>
        </p>
        <nav aria-label="直接进入频道">
          {islands.map((i) => (
            <Link key={i.id} href={i.href} onClick={save}>
              {i.number} / {i.channel} ↗
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
