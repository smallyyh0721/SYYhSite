"use client";
import { Component, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  Euler,
  Quaternion,
  type Object3D,
  type Bone,
  type Mesh,
  type Material,
} from "three";
import { useTheme } from "@/state/Theme";
import { damp } from "@/lib/motion.mjs";
type Pointer = { x: number; y: number };
function dispose(scene: Object3D) {
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      const materials = Array.isArray(m.material) ? m.material : [m.material];
      materials.forEach((v: Material) => v.dispose());
    }
  });
}
function Model({
  pointer,
  still,
  follow,
  onReady,
  onFail,
}: {
  pointer: RefObject<Pointer>;
  still: boolean;
  follow: boolean;
  onReady: () => void;
  onFail: () => void;
}) {
  const [scene, setScene] = useState<Object3D | null>(null);
  const rig = useRef<{
    head: Bone;
    spine: Bone;
    eyes: Bone[];
    rest: Quaternion[];
  } | null>(null);
  const pose = useRef({ x: 0, y: 0 });
  const eyePose = useRef({ x: 0, y: 0 });
  const scratch = useRef(new Quaternion());
  useEffect(() => {
    let cancelled = false;
    let owned: Object3D | null = null;
    new GLTFLoader().load(
      "/media/avatar-proxy.glb",
      (gltf) => {
        owned = gltf.scene;
        if (cancelled) {
          dispose(owned);
          return;
        }
        const head = owned.getObjectByName("Head") as Bone;
        const spine = owned.getObjectByName("Spine") as Bone;
        const eyes = ["L", "R"].map(
          (side) =>
            (owned!.getObjectByName("Eye" + side) ||
              owned!.getObjectByName("Eye." + side)) as Bone,
        );
        if (!head || !spine || eyes.some((e) => !e)) {
          onFail();
          dispose(owned);
          owned = null;
          return;
        }
        rig.current = {
          head,
          spine,
          eyes,
          rest: [
            head.quaternion.clone(),
            spine.quaternion.clone(),
            ...eyes.map((e) => e.quaternion.clone()),
          ],
        };
        setScene(owned);
        onReady();
      },
      undefined,
      onFail,
    );
    return () => {
      cancelled = true;
      rig.current = null;
      if (owned) dispose(owned);
    };
  }, [onReady, onFail]);
  useFrame(({ clock, gl }, dt) => {
    const r = rig.current;
    if (!r) return;
    const p = pose.current;
    p.x = still || !follow ? 0 : damp(p.x, pointer.current.x, 6, dt);
    p.y = still || !follow ? 0 : damp(p.y, pointer.current.y, 6, dt);
    const ep = eyePose.current;
    ep.x = still || !follow ? 0 : damp(ep.x, pointer.current.x, 12, dt);
    ep.y = still || !follow ? 0 : damp(ep.y, pointer.current.y, 12, dt);
    const apply = (bone: Bone, base: Quaternion, x: number, y: number) => {
      scratch.current.setFromEuler(new Euler(x, y, 0, "YXZ"));
      bone.quaternion.copy(base).multiply(scratch.current);
    };
    apply(r.head, r.rest[0], p.y * 0.175, p.x * 0.314);
    apply(r.spine, r.rest[1], p.y * 0.035, p.x * 0.07);
    const t = clock.elapsedTime;
    const blink = still ? 1 : t % 4.7 < 0.14 ? 0.18 : 1;
    r.eyes.forEach((eye, i) => {
      apply(eye, r.rest[i + 2], ep.y * 0.065, ep.x * 0.09);
      eye.scale.y = blink;
    });
    if (scene) scene.position.y = still ? 0 : Math.sin(t * 1.4) * 0.012;
    gl.domElement.dataset.pose = `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  });
  return scene ? <primitive object={scene} /> : null;
}
class Boundary extends Component<
  { children: React.ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function Avatar({ pointer, pointerTracking = false }: { pointer: RefObject<Pointer>; pointerTracking?: boolean }) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(true);
  const [follow, setFollow] = useState(false);
  const [visible, setVisible] = useState(true);
  const callbacks = useRef({
    ready: () => setReady(true),
    fail: () => setFailed(true),
  }).current;
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)"),
      touch = matchMedia("(pointer: coarse)");
    const update = () => {
      setStill(motion.matches);
      setFollow(!touch.matches);
    };
    update();
    motion.addEventListener("change", update);
    touch.addEventListener("change", update);
    const change = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => {
      motion.removeEventListener("change", update);
      touch.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", change);
    };
  }, []);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-label={pointerTracking ? "3D代理人物：随鼠标转动头部，正式形象待设计" : "3D代理人物，正式形象待设计"}
      data-avatar-mode={pointerTracking ? "pointer" : "idle"}
      data-avatar-ready={ready && !failed}
      role="img"
    >
      {(!ready || failed) && (
        <img
          src="/media/avatar-poster.png"
          alt="中性代理人物海报"
          style={{
            height: "100%",
            width: "100%",
            objectFit: "contain",
            position: "absolute",
            inset: 0,
          }}
        />
      )}
      {!failed && (
        <Boundary onFail={callbacks.fail}>
          <Canvas
            dpr={[1, 1.5]}
            frameloop={visible ? (still ? "demand" : "always") : "never"}
            camera={{ position: [0, 1.9, 5.2], fov: 37 }}
            gl={{ alpha: true, antialias: true }}
            style={{ opacity: ready ? 1 : 0 }}
            onCreated={({ camera, gl }) => {
              camera.lookAt(0, 1.55, 0);
              gl.domElement.setAttribute("aria-hidden", "true");
              gl.domElement.addEventListener(
                "webglcontextlost",
                callbacks.fail,
                { once: true },
              );
            }}
          >
            <ambientLight intensity={theme === "day" ? 1.5 : 0.9} />
            <directionalLight
              position={[3, 4, 4]}
              intensity={theme === "day" ? 3 : 2}
              color={theme === "day" ? "#eef8ff" : "#b4cdff"}
            />
            <pointLight
              position={[-3, 2, 2]}
              intensity={12}
              color={theme === "day" ? "#badcff" : "#d6ff9d"}
            />
            <directionalLight
              position={[0, 4, -3]}
              intensity={4}
              color="#3375ff"
            />
            <Model
              pointer={pointer}
              still={still}
              follow={pointerTracking && follow}
              onReady={callbacks.ready}
              onFail={callbacks.fail}
            />
          </Canvas>
        </Boundary>
      )}
      <span
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          font: "10px monospace",
          color: "var(--muted)",
        }}
      >
        {failed
          ? "轻量海报模式"
          : ready
            ? "3D PROXY / IDENTITY PENDING"
            : "连接人物信号…"}
      </span>
    </div>
  );
}
