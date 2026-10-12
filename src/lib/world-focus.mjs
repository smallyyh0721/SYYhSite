// Pointer-enter can also fire when a moving island passes a stationary cursor.
// Only a new pointer position may switch focus; layout animation is not input.
export function isFreshPointer(previous, next) {
  return !previous || previous.x !== next.x || previous.y !== next.y;
}
