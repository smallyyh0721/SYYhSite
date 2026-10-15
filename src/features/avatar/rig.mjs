import { Euler, Quaternion } from "three";

/** Half-body limits, radians. Yaw is left/right, pitch is up/down. */
export const LOOK = {
  head: { yaw: (18 * Math.PI) / 180, pitch: (10 * Math.PI) / 180 },
  spine: { yaw: (4 * Math.PI) / 180, pitch: (2 * Math.PI) / 180 },
  eye: { yaw: (8 * Math.PI) / 180, pitch: (6 * Math.PI) / 180 },
};

/** Eyes converge faster than the head. Spine shares the head rate. */
export const FOLLOW_RATE = { head: 6, eye: 12 };

/** Static friendly expression. Not a greeting clip. */
export const SMILE = 0.16;

export const REQUIRED_BONES = ["Head", "Spine", "EyeL", "EyeR"];
export const MORPH_NAMES = ["Blink", "Smile"];

const BLINK_CLOSE = 0.06;
const BLINK_HOLD = 0.03;
const BLINK_OPEN = 0.09;
const BLINK_LEN = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;

export function createLookScratch() {
  return {
    delta: new Quaternion(),
    inv: new Quaternion(),
    parentDelta: new Quaternion(),
    euler: new Euler(0, 0, 0, "YXZ"),
  };
}

/**
 * Incremental look on top of the file rest pose.
 * `yaw`/`pitch` are world axes (Y up, X right), not the bone's local axes.
 * Parent rest world is captured once; animated parents are not folded back in,
 * so a rolled parent cannot turn a nod into a head tilt.
 * Result world quaternion is `D * restWorld`.
 */
export function composeLocalLook(parentRestWorld, restLocal, yaw, pitch, target, scratch) {
  scratch.euler.set(pitch, yaw, 0, "YXZ");
  scratch.delta.setFromEuler(scratch.euler);
  scratch.inv.copy(parentRestWorld).invert();
  scratch.parentDelta.copy(scratch.inv).multiply(scratch.delta).multiply(parentRestWorld);
  target.copy(scratch.parentDelta).multiply(restLocal);
  return target;
}

/** Gap before blink `index`, always inside 4–6 seconds. */
export function blinkGap(index) {
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return 4 + frac * 2;
}

function smooth(u) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

function blinkCurve(dt) {
  if (dt <= BLINK_CLOSE) return smooth(dt / BLINK_CLOSE);
  if (dt <= BLINK_CLOSE + BLINK_HOLD) return 1;
  return 1 - smooth((dt - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN);
}

/** Blink morph weight. Reduced motion stays open. Never a scale squash. */
export function blinkWeight(time, reduced) {
  if (reduced || !(time >= 0)) return 0;
  let cursor = 0;
  for (let index = 0; index < 100000; index += 1) {
    const at = cursor + blinkGap(index);
    if (time < at) return 0;
    const dt = time - at;
    if (dt <= BLINK_LEN) return blinkCurve(dt);
    cursor = at;
  }
  return 0;
}

/** Tiny spine pitch. The whole figure is not translated. */
export function breathPitch(time, reduced) {
  if (reduced) return 0;
  return Math.sin(time * 1.35) * 0.008;
}

/** Clearance above the head, as a fraction of height. Keeps the skull inside the frame. */
export const BUST_TOP_MARGIN = 0.025;

/**
 * Lower edge of the bust window, as a fraction of height above the bbox minimum.
 * 0.60 of a 1.7 m figure is 1.02 m: the waist stays in for a half-body view,
 * with clearance for the head and no need to include the knees or feet.
 */
export const BUST_BOTTOM_RATIO = 0.60;

/**
 * Bust camera for a figure about 1.7 m tall.
 * Frames the top of the head through the waist. A narrow viewport fits the
 * face width and may crop the outer silhouette; it does not dolly out to the
 * full shoulder box, which would drop the lower edge toward the knee.
 * Not the old 2.7 m proxy camera.
 */
export function frameBust(camera, box, aspect) {
  if (!box || !Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) return null;
  const height = Math.max(1e-4, box.max.y - box.min.y);
  const top = box.max.y + height * BUST_TOP_MARGIN;
  const bottom = box.min.y + height * BUST_BOTTOM_RATIO;
  const span = Math.max(0.2, top - bottom);
  const fov = 28;
  const fovRad = (fov * Math.PI) / 180;
  const mid = (top + bottom) / 2;
  const vTan = Math.tan(fovRad / 2);
  const distY = span / 2 / vTan;
  const cx = (box.min.x + box.max.x) / 2;
  const bodyHalf = Math.max(0, box.max.x - cx, cx - box.min.x);
  const faceHalf = Math.min(Math.max(height * 0.07, bodyHalf * 0.45), height * 0.11);
  const safeAspect = Math.max(0.35, Math.min(Number.isFinite(aspect) && aspect > 0 ? aspect : 1, 2.4));
  const distFace = (faceHalf * 1.06) / (vTan * safeAspect);
  const dist = Math.max(distY, distFace);
  const front = Number.isFinite(box.max.z) ? box.max.z : 0;
  const focusZ = Number.isFinite(box.min.z) ? (box.min.z + box.max.z) / 2 : 0;
  camera.fov = fov;
  camera.near = 0.05;
  camera.far = Math.max(30, dist + height * 4);
  camera.position.set(cx, mid, front + dist);
  camera.lookAt(cx, mid, focusZ);
  camera.updateProjectionMatrix();
  const visibleHalf = dist * vTan;
  return {
    top,
    bottom,
    mid,
    dist,
    visibleBottom: mid - visibleHalf,
    visibleTop: mid + visibleHalf,
  };
}

export function findRig(root) {
  const head = root.getObjectByName("Head");
  const spine = root.getObjectByName("Spine");
  const eyeL = root.getObjectByName("EyeL");
  const eyeR = root.getObjectByName("EyeR");
  let body = null;
  let boneCount = 0;
  root.traverse((obj) => {
    if (obj.isBone) boneCount += 1;
    if (!body && obj.isMesh && obj.name === "VisitorBody") body = obj;
  });
  if (!head || !head.isBone || !spine || !spine.isBone || !eyeL || !eyeL.isBone || !eyeR || !eyeR.isBone || !body) {
    return null;
  }
  return {
    bones: { Head: head, Spine: spine, EyeL: eyeL, EyeR: eyeR },
    body,
    boneCount,
  };
}

export function describeMorphs(body) {
  const dict = body && body.morphTargetDictionary ? body.morphTargetDictionary : {};
  const named = (name) => (Object.prototype.hasOwnProperty.call(dict, name) ? "ok" : "missing");
  return { Blink: named("Blink"), Smile: named("Smile") };
}

export function captureBone(bone) {
  const parentWorld = new Quaternion();
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);
  return {
    bone,
    rest: bone.quaternion.clone(),
    parentWorld,
  };
}
