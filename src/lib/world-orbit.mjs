export const HOVER_DELAY_MS = 260;
export const TRAVEL_SECONDS = 1.35;
export const orbitSlots = ['front', 'left', 'back', 'right'];
export function slotFor(index, focusIndex) { return orbitSlots[(index - focusIndex + 4) % 4]; }
export function diamondTargets(width, height, viewportHeight, compact) {
  const frontSize = Math.min(width * (compact ? .70 : .48), viewportHeight * (compact ? .37 : .54));
  const sideSize = Math.min(width * (compact ? .30 : .22), viewportHeight * .30);
  const backSize = Math.min(width * (compact ? .26 : .16), viewportHeight * .22);
  const backY = compact ? .10 : .08;
  const sideY = (backY + .50) / 2;
  return {
    front: { x: width * .50, y: height * .50, size: frontSize },
    left: { x: width * .16, y: height * sideY, size: sideSize },
    back: { x: width * .50, y: height * backY, size: backSize },
    right: { x: width * .84, y: height * sideY, size: sideSize },
  };
}
// A bowed quadratic path preserves endpoints and remains continuous on retarget.
export function orbitPoint(from, to, progress, direction = 1) {
  const t = Math.max(0, Math.min(1, progress));
  const dx = to.x - from.x, dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const bend = Math.min(distance * .24, 110) * direction;
  const controlX = (from.x + to.x) / 2 - (distance ? dy / distance : 0) * bend;
  const controlY = (from.y + to.y) / 2 + (distance ? dx / distance : 0) * bend;
  return {
    x: (1-t)**2 * from.x + 2*(1-t)*t*controlX + t*t*to.x,
    y: (1-t)**2 * from.y + 2*(1-t)*t*controlY + t*t*to.y,
    size: from.size + (to.size - from.size) * t,
  };
}
// A drag never counts as a tap; an unarmed centered island still needs a first tap.
export function touchDecision({ target, focused, armed, moving, distance }) {
  if (distance > 8) return 'cancel';
  if (target === focused && target === armed && !moving) return 'enter';
  return 'select';
}
