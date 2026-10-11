The hub: a pannable night-sky world holding the islands, and the owner of the island-jump animation.

Provide `islands` (each with `x`/`y` in world pixels inside `worldWidth` × `worldHeight`, default 1600 × 1000) and `onArrive`, which fires when the jump ends so the app can route to that island. The container needs a height. The jump runs lift (250ms), pan with speed lines and a `hazard` flash (450ms), then dive (220ms). With reduced motion it is a 200ms fade. Timings are exposed as `IslandMap.timing` for tests.
