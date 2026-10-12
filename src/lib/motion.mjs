export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const damp = (current, target, rate, dt) =>
  current + (target - current) * (1 - Math.exp(-rate * Math.min(dt, 0.05)));
export function selectFocus(position, islands, previous) {
  const distance = (i) => Math.hypot(i.x - position.x, i.y - position.y);
  const old = islands.find((i) => i.id === previous);
  if (old && distance(old) < 240) return old.id;
  const nearest = [...islands].sort((a, b) => distance(a) - distance(b))[0];
  return nearest && distance(nearest) < 190 ? nearest.id : null;
}
