import test from "node:test";
import assert from "node:assert/strict";
import { isFreshPointer } from "../src/lib/world-focus.mjs";

test("the first hover activates, and even a small real movement may switch islands", () => {
  assert.equal(isFreshPointer(null, { x: 0, y: 0 }), true);
  assert.equal(isFreshPointer({ x: 200, y: 100 }, { x: 200.25, y: 100 }), true);
});
test("moving scene geometry under a stationary cursor does not cause focus oscillation", () => {
  const pointer = { x: 420, y: 300 };
  for (let frame = 0; frame < 20; frame++) assert.equal(isFreshPointer(pointer, { ...pointer }), false);
  assert.equal(isFreshPointer(pointer, { x: 421, y: 300 }), true);
});
