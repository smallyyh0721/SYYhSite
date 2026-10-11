# Handoff: continue locally with Chrome

The cloud session that built this draft could not open any reference site (rikkazzz.com, ryuse1-studio.com, steffieharner.netlify.app, cyberfiction-five.vercel.app): its network blocks them. Everything here was designed from the owner's written description only. **The next step is to study the real sites and revise the design to match them.**

## Set up

```sh
git clone https://github.com/smallyyh0721/SYYhSite.git
cd SYYhSite
git checkout claude/personal-website-design-hf0xbi
npm run draft          # serves the repo; open http://localhost:3000/prototype/
claude --chrome        # Claude Code with browser control (or the Claude in Chrome extension)
```

## Prompt for the local session

> Read `docs/HANDOFF.md`, `design/README.md` and `design/site-map.md`. Open each reference site in Chrome and study it: take screenshots at 1440px and 390px, record the entrance sequence frame by frame, and note the colours, fonts, line work, layout grid and how navigation responds to mouse movement and scrolling. Write the findings to `docs/reference-notes.md`. Then compare them with our draft (`prototype/index.html`) and list the gaps, before changing any code.

## What to extract from each site

| Site | Used for | Look closely at |
|---|---|---|
| rikkazzz.com | Overall style, entrance animation, visitor guidance, line design, and travel between areas | Entrance timing and steps; how lines are drawn (weight, colour, dashes, what they connect); how mouse movement moves the view (direct mapping or inertia, both axes, parallax layers); how visitors are told what to do; fonts and palette |
| ryuse1-studio.com | Island A: Works | Gallery layout, how a work opens, transitions, type scale, numbering |
| steffieharner.netlify.app | Island B: About | Page rhythm, intro type, how the personal details are laid out |
| cyberfiction-five.vercel.app | Island C: Story (proposed) | Scroll-scrubbed image sequence: frame count, pinning, captions |

## Where things live

- `design/tokens.json`: every colour, type style, space, radius and line value. Run `npm run tokens` after editing to regenerate `design/tokens.css`.
- `design/components/bundle.js` / `bundle.css`: components (`window.SYYH`). The hub travel logic is `IslandMap`, and its tuning is in `IslandMap.timing`. The entrance is `IntroSequence`.
- `design/components/site/draft.js`: the draft site (Entrance → Gate → Hub → islands A–D).
- The design system artifact mirrors `design/`: https://claude.ai/artifact/9UtGQ41vPAbwBCq8RLcFpV

## Owner's direction so far

- Overall style, entrance animation and guidance follow rikkazzz.com.
- Mature (adult) anime style with a Zenless Zone Zero animation theme.
- Moving between islands follows **mouse movement, horizontal and vertical**, not clicks. The reference uses line design.
- Four areas A, B, C, D (names to change later). All pages share one style and similar colours.
