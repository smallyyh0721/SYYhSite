SYYH Signal is a personal site you **tune into**. A line-drawn entrance opens on a visitor gate, then the visitor **travels by moving the mouse** across a night sky of floating islands. The tone is grown-up anime, like a ZZZ-style animated short: cinematic, mostly dark, drawn in thin precise lines, with neon used sparingly. Street-pop broadcast (pixel HUD, hazard stripes, leaning buttons) meets manga (panel frames, screentone, speed lines, katakana). Every page uses these tokens, so the entrance, the hub and all four islands read as one world.

## Content fundamentals

- **Voice:** first person, short, a little cocky, like a channel host. "You're tuned in." "Jump to Works." Not corporate, not cute.
- **Casing:** HUD, buttons and stickers are UPPERCASE Latin in `hud`. Headings are Title or UPPER in `display-*`. Body copy is sentence case.
- **Languages:** Body copy may be Chinese, Japanese or English, all in `body` (Zen Kaku Gothic New covers all three). Katakana appears as decoration under headings in `kana`, e.g. WORKS / サクヒン, ABOUT / ジコショウカイ.
- **Numbers:** index everything like a broadcast. Islands are channels (CH-01…CH-04), works are numbered `No.07`, and coordinates or times sit in `hud-sm`.
- **No emoji.** Use the pixel glyphs ● ▶ ■ ◆ ✕ ↗ in `hud` instead.

Real copy to reuse: gate title "VISITOR ACCESS", gate button "ENTER AS GUEST", hub prompt "PICK AN ISLAND ▶", jump label "JUMPING TO CH-02…", lost state "NO SIGNAL — RETURN TO HUB".

## Visual foundations

**Mature tone.** Keep about 80% of any screen as `void` and lines, 15% as `ink` type, and at most 5% accent. Neon is a signal, not a wallpaper. Let the visitor's own key visuals (character art) carry the anime; the UI frames them and never competes. Prefer one quiet `caption-jp` line over a loud `sfx`, and keep `sfx` for island pages and big moments such as the dive.

**Line language.** Structure is drawn, not boxed. Use 1px `line-hair` for frames, crosshairs, route lines, orbit rings, leader lines and coordinate ticks, and `ink` at 1.5px for the outlines of drawn objects (islands, the title stroke). Lines animate by drawing (stroke-dashoffset, 400–600ms, cubic-bezier(.7,0,.2,1)) and dashed routes flow while active. Corner brackets (2px `ink`, 24px) mark a framed area's corners instead of a full heavy border. Label things like a technical drawing: `hud-sm` coordinates (X0560 Y0470), channel plates, short leader lines.

**Colour.** Pages sit on `void`. Panels use `surface`, and a nested panel or input uses `surface-raised`. Text is `ink`, with `ink-muted` for metadata. The four accents (`signal`, `hazard`, `pop` and `tube`) are **fills**. Put `on-accent` text on them and never set accent text on Paper. For accent-coloured text, use `signal-text`. Each island owns one accent through `island-a`…`island-d`, and its page tints buttons, stickers and the jump flash with it. Use at most two accents per screen: the island's own plus `signal` for the primary action.

**Themes.** `night` is the default site theme. `paper` is the manga-page theme: use it for the About island's reading view or a print-like mode. Both are fully specified, so a page must never hard-code a hex value.

**Type.** Use `hero` once per page. Section openers are `display-lg`, panels `display-md`, tiles `title`. Display faces are always italic and heavy: the lean is the brand. `sfx` (Dela Gothic One) is for katakana sound effects, rotated by `tilt`, and never carries information. `hud` / `hud-sm` (DotGothic16) are for anything that feels like a machine is talking.

**Shape.** Everything is square (`radius-0`). Only stickers and inputs take `radius-sm`, and only HUD chips and dots take `radius-pill`. Panels have a `stroke-panel` border in `line`. Buttons, the HUD tab and index plates lean with `skewX(var(--slant))`, and their text is counter-skewed so it stays upright.

**Depth.** No blur shadows. On hover or focus, a panel or tile lifts by translating (-3px, -3px) and gains `shadow-pop`. On night, `shadow-glow` is reserved for the live dot and the gate title.

**Texture.** Screentone is a radial-dot pattern in `screentone`, 6px pitch. Use it in empty image slots, panel corners and the void behind islands. Scanlines (1px `line-soft` rules at 4px pitch, low opacity) appear only on the gate and the jump overlay. Hazard stripes (45° bands of `hazard` / `on-accent`, 12px) mark edges and "under construction" areas.

**Spacing and layout.** The desktop gutter is `space-12` and the phone gutter `space-4`. Gaps between tiles are `space-6` and gaps between sections `space-16`. Island pages follow a 12-column grid. The hub is not a grid: it is a pannable world, about 2× the viewport, with islands placed by hand.

**Motion.** Motion is part of the identity.
- *Entrance (about 3.5s, skippable by any click or key).* A single `ink` line sweeps across the centre (500ms). It splits into a top and bottom line that slide out to form the frame while the side rules draw (500ms), and the corner metadata fades in. The title then draws in stroke by stroke and fills while LOADING counts 000→100 and a vertical `caption-jp` appears (1.4s). Next, the travel guide shows a line-drawn mouse with four arrows and "MOVE YOUR MOUSE TO TRAVEL / マウスを動かして、島から島へ" (1s). Finally the gate fades in inside the frame, and the frame stays as the page border.
- *Travel (the signature).* Pointer position across the hub maps to the camera's position in the world, easing at 0.075 per frame, so moving right flies right and moving down flies down. Wheel and trackpad scroll nudge the same value. Islands within 340px of the target pull the camera in, so it settles on an island. The island nearest the camera is focused: its top fills, its leader line draws, its orbit ring and adjacent routes light up in its accent and start flowing, and a dashed tether joins the cursor to it. Crosshair hairlines and a world-coordinate readout follow the cursor. The screentone background moves at 0.4× and foreground captions at 1.25×, which gives the parallax depth.
- *Enter (650ms).* Clicking the focused island zooms the camera into it (×2.6) while speed lines burst in its accent, a `hazard` flash runs for 90ms and the world fades. The island page then wipes in diagonally. Clicking an island that is not focused only travels there.
- *Idle:* islands bob 6px over 5s, each on a different phase, and their beacons blink.
- *Hover:* 120ms translate plus `shadow-pop` on panels, tiles and buttons.
- *Reduced motion:* the entrance is skipped, travel has no easing, the dive becomes a 200ms fade, and route flow, bobbing and blinking stop.

**States.** Focus is a `focus` ring, 3px solid with a 3px offset, on every interactive element. Disabled elements drop to `ink-muted` with no shadow. Errors are `danger` text with a word, never colour alone.

## Iconography

There is no icon set and no logo yet. Set the name **SYYH** in `display-lg` italic with a `signal` live dot ●. For icons, use the pixel glyphs listed above in `hud`. When real icons arrive, use 2px-stroke square-cap line icons in `ink`, as SVG in `assets/Icons/`. Islands are line art (an isometric plateau with a hatched top, a small building and a radio mast with an accent beacon) drawn from the tokens as SVG until bespoke art replaces them. Character key visuals go in 3:4 slots framed by a dashed `line-hair` inset.
