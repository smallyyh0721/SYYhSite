SYYH Signal is a personal site you **tune into**. A visitor passes a CRT visitor gate, lands on a map of floating islands, and *jumps* from island to island. The look is late-night street-pop broadcast (neon fills, hazard stripes, pixel HUD) printed on manga pages (heavy panel frames, screentone, speed lines, katakana SFX). Every page uses these tokens, so the gate, the hub and all four islands read as one world.

## Content fundamentals

- **Voice:** first person, short, a little cocky, like a channel host. "You're tuned in." "Jump to Works." Not corporate, not cute.
- **Casing:** HUD, buttons and stickers are UPPERCASE Latin in `hud`. Headings are Title or UPPER in `display-*`. Body copy is sentence case.
- **Languages:** Body copy may be Chinese, Japanese or English, all in `body` (Zen Kaku Gothic New covers all three). Katakana appears as decoration under headings in `kana`, e.g. WORKS / サクヒン, ABOUT / ジコショウカイ.
- **Numbers:** index everything like a broadcast. Islands are channels (CH-01…CH-04), works are numbered `No.07`, and coordinates or times sit in `hud-sm`.
- **No emoji.** Use the pixel glyphs ● ▶ ■ ◆ ✕ ↗ in `hud` instead.

Real copy to reuse: gate title "VISITOR ACCESS", gate button "ENTER AS GUEST", hub prompt "PICK AN ISLAND ▶", jump label "JUMPING TO CH-02…", lost state "NO SIGNAL — RETURN TO HUB".

## Visual foundations

**Colour.** Pages sit on `void`. Panels use `surface`, and a nested panel or input uses `surface-raised`. Text is `ink`, with `ink-muted` for metadata. The four accents (`signal`, `hazard`, `pop` and `tube`) are **fills**. Put `on-accent` text on them and never set accent text on Paper. For accent-coloured text, use `signal-text`. Each island owns one accent through `island-a`…`island-d`, and its page tints buttons, stickers and the jump flash with it. Use at most two accents per screen: the island's own plus `signal` for the primary action.

**Themes.** `night` is the default site theme. `paper` is the manga-page theme: use it for the About island's reading view or a print-like mode. Both are fully specified, so a page must never hard-code a hex value.

**Type.** Use `hero` once per page. Section openers are `display-lg`, panels `display-md`, tiles `title`. Display faces are always italic and heavy: the lean is the brand. `sfx` (Dela Gothic One) is for katakana sound effects, rotated by `tilt`, and never carries information. `hud` / `hud-sm` (DotGothic16) are for anything that feels like a machine is talking.

**Shape.** Everything is square (`radius-0`). Only stickers and inputs take `radius-sm`, and only HUD chips and dots take `radius-pill`. Panels have a `stroke-panel` border in `line`. Buttons, the HUD tab and index plates lean with `skewX(var(--slant))`, and their text is counter-skewed so it stays upright.

**Depth.** No blur shadows. On hover or focus, a panel or tile lifts by translating (-3px, -3px) and gains `shadow-pop`. On night, `shadow-glow` is reserved for the live dot and the gate title.

**Texture.** Screentone is a radial-dot pattern in `screentone`, 6px pitch. Use it in empty image slots, panel corners and the void behind islands. Scanlines (1px `line-soft` rules at 4px pitch, low opacity) appear only on the gate and the jump overlay. Hazard stripes (45° bands of `hazard` / `on-accent`, 12px) mark edges and "under construction" areas.

**Spacing and layout.** The desktop gutter is `space-12` and the phone gutter `space-4`. Gaps between tiles are `space-6` and gaps between sections `space-16`. Island pages follow a 12-column grid. The hub is not a grid: it is a pannable world, about 2× the viewport, with islands placed by hand.

**Motion.** Motion is part of the identity.
- *Island jump* (the signature move, 900ms total). The current view zooms out (scale 0.85, 250ms). Speed lines burst from the target in its island colour and a `hazard` flash runs for 80ms. The camera pans to the target island (450ms, cubic-bezier(.7,0,.2,1)), then zooms into it while the island page wipes in diagonally along `slant`.
- *Idle float:* islands bob 6px over 4–6s, each on a different phase.
- *Hover:* 120ms translate plus `shadow-pop`. Nothing eases slower than 450ms except the idle float.
- *Reduced motion:* replace the whole jump with a 200ms crossfade and stop the bobbing. Scroll-scrubbed sequences (island C) become static keyframes.

**States.** Focus is a `focus` ring, 3px solid with a 3px offset, on every interactive element. Disabled elements drop to `ink-muted` with no shadow. Errors are `danger` text with a word, never colour alone.

## Iconography

There is no icon set and no logo yet. Set the name **SYYH** in `display-lg` italic with a `signal` live dot ●. For icons, use the pixel glyphs listed above in `hud`. When real icons arrive, use 2px-stroke square-cap line icons in `ink`, as SVG in `assets/Icons/`. Island art (the floating chunks on the hub) is drawn from the tokens as SVG shapes, not illustrations, until bespoke art replaces it.
