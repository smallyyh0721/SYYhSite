"use client";
import { Component, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  Box3,
  NoToneMapping,
  PerspectiveCamera,
  Quaternion,
  SRGBColorSpace,
  type Mesh,
  type Object3D,
} from "three";
import { useTheme } from "@/state/Theme";
import { avatarArt } from "@/lib/v2-assets";
import { damp } from "@/lib/motion.mjs";
import {
  FOLLOW_RATE,
  LOOK,
  SMILE,
  blinkWeight,
  breathPitch,
  captureBone,
  composeLocalLook,
  createLookScratch,
  describeMorphs,
  findRig,
  frameBust,
} from "./rig.mjs";
import { disposeScene } from "./disposeScene.mjs";
import PosterFallback, { type PosterPhase } from "./PosterFallback";
import styles from "./Avatar.module.css";

type Pointer = { x: number; y: number };
export type AvatarView = "loading" | "live" | "poster" | "empty";
type Motion = { still: boolean; follow: boolean };
type LoadedInfo = { bones: number; morphs: string; clips: number };

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function Lights({ theme }: { theme: "day" | "night" }) {
  if (theme === "day") {
    return (
      <>
        <hemisphereLight color="#f4f8fc" groundColor="#d7e4f3" intensity={1.1} />
        <directionalLight position={[1.8, 2.5, 2.6]} intensity={2.4} color="#f7fbff" />
        <directionalLight position={[-1.7, 1.3, 1.9]} intensity={0.7} color="#c9daf0" />
      </>
    );
  }
  return (
    <>
      <hemisphereLight color="#8ca7c6" groundColor="#263547" intensity={0.55} />
      <directionalLight position={[-1.5, 2.8, 1.8]} intensity={1.45} color="#bdd3ec" />
      <directionalLight position={[1.55, 1.05, 2.15]} intensity={0.7} color="#f6d9ba" />
    </>
  );
}

function Model({
  url,
  pointer,
  motion,
  onLoaded,
  onFail,
  onPresented,
}: {
  url: string;
  pointer: RefObject<Pointer>;
  motion: RefObject<Motion>;
  onLoaded: (info: LoadedInfo) => void;
  onFail: () => void;
  onPresented: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const cameraRef = useRef(camera);
  const invalidateRef = useRef(invalidate);
  cameraRef.current = camera;
  invalidateRef.current = invalidate;
  const [scene, setScene] = useState<Object3D | null>(null);
  const rig = useRef<{
    head: ReturnType<typeof captureBone>;
    spine: ReturnType<typeof captureBone>;
    eyes: ReturnType<typeof captureBone>[];
    body: Mesh;
    blink: number;
    smile: number;
    bones: number;
  } | null>(null);
  const restBox = useRef<Box3 | null>(null);
  const pose = useRef({ x: 0, y: 0 });
  const eyePose = useRef({ x: 0, y: 0 });
  const scratch = useRef(createLookScratch());
  const target = useRef(new Quaternion());
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const ac = new AbortController();
    let dropped = false;
    let owned: Object3D | null = null;
    const fail = () => {
      if (dropped) return;
      onFail();
    };
    const finish = (next: Object3D | null) => {
      if (owned && owned !== next) disposeScene(owned);
      owned = next;
    };
    void (async () => {
      try {
        const absolute = new URL(url, window.location.origin).href;
        const response = await fetch(absolute, { signal: ac.signal });
        if (!response.ok) throw new Error(String(response.status));
        const buffer = await response.arrayBuffer();
        if (dropped) return;
        const base = absolute.slice(0, absolute.lastIndexOf("/") + 1);
        await new Promise<void>((resolve) => {
          new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(
            buffer,
            base,
            (gltf) => {
              if (dropped) {
                disposeScene(gltf.scene);
                resolve();
                return;
              }
              gltf.scene.updateMatrixWorld(true);
              const found = findRig(gltf.scene);
              if (!found) {
                disposeScene(gltf.scene);
                fail();
                resolve();
                return;
              }
              const body = found.body as Mesh;
              const morphs = describeMorphs(body);
              const box = new Box3().setFromObject(gltf.scene);
              restBox.current = box.clone();
              const view = sizeRef.current;
              const aspect = view.width > 0 && view.height > 0 ? view.width / view.height : 1;
              const activeCamera = cameraRef.current;
              if (activeCamera instanceof PerspectiveCamera) frameBust(activeCamera, box, aspect);
              const dictionary = body.morphTargetDictionary;
              rig.current = {
                head: captureBone(found.bones.Head),
                spine: captureBone(found.bones.Spine),
                eyes: [captureBone(found.bones.EyeL), captureBone(found.bones.EyeR)],
                body,
                blink: morphs.Blink === "ok" && dictionary ? dictionary.Blink : -1,
                smile: morphs.Smile === "ok" && dictionary ? dictionary.Smile : -1,
                bones: found.boneCount,
              };
              body.onAfterRender = () => {
                if (dropped) return;
                body.onAfterRender = () => {};
                onPresented();
              };
              finish(gltf.scene);
              setScene(gltf.scene);
              invalidateRef.current();
              onLoaded({
                bones: found.boneCount,
                morphs: `blink:${morphs.Blink},smile:${morphs.Smile}`,
                clips: gltf.animations.length,
              });
              resolve();
            },
            () => {
              fail();
              resolve();
            },
          );
        });
      } catch {
        fail();
      }
    })();
    return () => {
      dropped = true;
      ac.abort();
      rig.current = null;
      restBox.current = null;
      finish(null);
    };
  }, [onFail, onLoaded, onPresented, url]);

  useEffect(() => {
    if (!restBox.current || !(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1;
    frameBust(camera, restBox.current, aspect);
  }, [camera, size.width, size.height]);

  useFrame(({ clock, gl }, dt) => {
    const current = rig.current;
    if (!current) return;
    const flags = motion.current;
    const hold = flags.still || !flags.follow;
    const aim = hold ? { x: 0, y: 0 } : pointer.current;
    if (flags.still) {
      pose.current.x = 0;
      pose.current.y = 0;
      eyePose.current.x = 0;
      eyePose.current.y = 0;
    } else {
      pose.current.x = damp(pose.current.x, aim.x, FOLLOW_RATE.head, dt);
      pose.current.y = damp(pose.current.y, aim.y, FOLLOW_RATE.head, dt);
      eyePose.current.x = damp(eyePose.current.x, aim.x, FOLLOW_RATE.eye, dt);
      eyePose.current.y = damp(eyePose.current.y, aim.y, FOLLOW_RATE.eye, dt);
    }
    const time = clock.getElapsedTime();
    const apply = (
      bone: ReturnType<typeof captureBone>,
      yaw: number,
      pitch: number,
    ) => {
      composeLocalLook(bone.parentWorld, bone.rest, yaw, pitch, target.current, scratch.current);
      bone.bone.quaternion.copy(target.current);
    };
    apply(current.head, pose.current.x * LOOK.head.yaw, pose.current.y * LOOK.head.pitch);
    apply(
      current.spine,
      pose.current.x * LOOK.spine.yaw,
      pose.current.y * LOOK.spine.pitch + breathPitch(time, flags.still),
    );
    current.eyes.forEach((eye) => {
      apply(eye, eyePose.current.x * LOOK.eye.yaw, eyePose.current.y * LOOK.eye.pitch);
    });
    const influences = current.body?.morphTargetInfluences;
    if (influences) {
      if (current.blink >= 0) influences[current.blink] = blinkWeight(time, flags.still);
      if (current.smile >= 0) influences[current.smile] = SMILE;
    }
    const el = gl.domElement;
    el.dataset.pose = `${pose.current.x.toFixed(3)},${pose.current.y.toFixed(3)}`;
    el.dataset.follow = `${pose.current.x.toFixed(3)},${eyePose.current.x.toFixed(3)}`;
    el.dataset.blink = current.blink >= 0 && influences ? influences[current.blink].toFixed(3) : "missing";
    el.dataset.smile = current.smile >= 0 && influences ? influences[current.smile].toFixed(3) : "missing";
    el.dataset.breath = breathPitch(time, flags.still).toFixed(4);
    el.dataset.eyeScale = current.eyes.map((eye) => eye.bone.scale.y.toFixed(3)).join(",");
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

const LABELS: Record<AvatarView, string> = {
  live: "实时人物半身",
  poster: "人物海报，不是实时三维",
  empty: "人物画面还没放进来",
  loading: "人物画面载入中",
};

export default function Avatar({
  pointer,
  pointerTracking = false,
  onView,
}: {
  pointer: RefObject<Pointer>;
  pointerTracking?: boolean;
  onView?: (view: AvatarView) => void;
}) {
  const { theme } = useTheme();
  const [webgl] = useState(canUseWebGL);
  const [loaded, setLoaded] = useState(false);
  const [presented, setPresented] = useState(false);
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(true);
  const [coarse, setCoarse] = useState(false);
  const [visible, setVisible] = useState(true);
  const [posterPhase, setPosterPhase] = useState<PosterPhase>("loading");
  const [meta, setMeta] = useState<LoadedInfo>({ bones: 0, morphs: "untested", clips: 0 });
  const motion = useRef<Motion>({ still: true, follow: false });
  const onPosterPhase = useRef(setPosterPhase);
  onPosterPhase.current = setPosterPhase;
  const handlers = useRef({
    loaded: (info: LoadedInfo) => {
      setMeta(info);
      setLoaded(true);
    },
    presented: () => setPresented(true),
    fail: () => setFailed(true),
  }).current;
  motion.current = { still, follow: pointerTracking && !coarse };
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const touch = matchMedia("(pointer: coarse)");
    const update = () => {
      setStill(reduce.matches);
      setCoarse(touch.matches);
    };
    update();
    reduce.addEventListener("change", update);
    touch.addEventListener("change", update);
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      reduce.removeEventListener("change", update);
      touch.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  const live = presented && !failed && webgl;
  const view: AvatarView = live
    ? "live"
    : (failed || !webgl) && posterPhase === "poster"
      ? "poster"
      : failed || !webgl
        ? posterPhase === "loading"
          ? "loading"
          : "empty"
        : posterPhase === "poster"
          ? "poster"
          : "loading";
  useEffect(() => {
    onView?.(view);
  }, [onView, view]);
  const mode = still ? "still" : coarse || !pointerTracking ? "coarse" : "pointer";
  return (
    <div
      className={styles.root}
      aria-label={LABELS[view]}
      data-avatar-mode={mode}
      data-avatar-theme={theme}
      data-avatar-model={avatarArt.model}
      data-avatar-loaded={loaded && !failed ? "true" : "false"}
      data-avatar-ready={live ? "true" : "false"}
      data-avatar-view={view}
      data-avatar-visible={visible ? "true" : "false"}
      data-avatar-morphs={loaded ? meta.morphs : "untested"}
      data-avatar-bones={loaded ? String(meta.bones) : "0"}
      data-avatar-clips={loaded ? String(meta.clips) : "0"}
      role="img"
    >
      <div className={live ? `${styles.poster} ${styles.parked}` : styles.poster}>
        <PosterFallback
          pending={!failed && webgl && !presented}
          onPhase={(phase) => onPosterPhase.current(phase)}
        />
      </div>
      {webgl && !failed && (
        <Boundary onFail={handlers.fail}>
          <Canvas
            dpr={[1, 1.5]}
            frameloop={visible ? (still ? "demand" : "always") : "never"}
            camera={{ position: [0, 1.27, 2.4], fov: 28, near: 0.05, far: 30 }}
            gl={{ alpha: true, antialias: true, toneMapping: NoToneMapping }}
            style={{ position: "absolute", inset: 0, opacity: live ? 1 : 0 }}
            onCreated={({ camera, gl }) => {
              gl.outputColorSpace = SRGBColorSpace;
              camera.lookAt(0, 1.27, 0);
              gl.domElement.setAttribute("aria-hidden", "true");
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  handlers.fail();
                },
                { once: true },
              );
            }}
          >
            <Lights theme={theme} />
            <Model
              url={avatarArt.model}
              pointer={pointer}
              motion={motion}
              onLoaded={handlers.loaded}
              onFail={handlers.fail}
              onPresented={handlers.presented}
            />
          </Canvas>
        </Boundary>
      )}
    </div>
  );
}
