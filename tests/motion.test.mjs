import { test } from "node:test";
import assert from "node:assert/strict";
import { damp, selectFocus, clamp } from "../src/lib/motion.mjs";
const islands = [
  { id: "one", x: 0, y: 0 },
  { id: "two", x: 600, y: 0 },
];
test("focus hysteresis keeps focus until exit threshold and ignores distant islands", () => {
  assert.equal(selectFocus({ x: 185, y: 0 }, islands, null), "one");
  assert.equal(selectFocus({ x: 215, y: 0 }, islands, "one"), "one");
  assert.equal(selectFocus({ x: 250, y: 0 }, islands, "one"), null);
  assert.equal(selectFocus({ x: 450, y: 0 }, islands, null), "two");
});
test("damping is frame-rate independent and bounded after a suspended tab", () => {
  let a = 0,
    b = 0;
  for (let i = 0; i < 60; i++) a = damp(a, 1, 6, 1 / 60);
  for (let i = 0; i < 120; i++) b = damp(b, 1, 6, 1 / 120);
  assert.ok(Math.abs(a - b) < 1e-10);
  assert.ok(damp(0, 1, 6, 10) < 0.3);
  assert.equal(clamp(1000, -600, 600), 600);
});
