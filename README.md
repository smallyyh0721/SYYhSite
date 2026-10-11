# SYYH Signal

A personal site you *tune into*: a CRT visitor gate, then a night sky of floating islands you jump between. The style is ZZZ street-pop broadcast printed on manga pages.

- **Design system (live):** https://claude.ai/artifact/9UtGQ41vPAbwBCq8RLcFpV
- **Brand book:** [`design/README.md`](design/README.md) · **Site map:** [`design/site-map.md`](design/site-map.md)
- **Clickable draft:** [`prototype/index.html`](prototype/index.html)
- **Continue locally:** [`docs/HANDOFF.md`](docs/HANDOFF.md) (the reference sites must be studied in a local browser)

## Layout

| Path | What |
|---|---|
| `design/tokens.json` | Single source for colours, type, spacing, radii, shadows |
| `design/tokens.css` | Generated: `npm run tokens` |
| `design/components/` | Component bundle (`window.SYYH`), styles, types, per-component guidelines and previews |
| `design/components/site/draft.js` | The draft site: Gate → Hub → islands A–D |
| `prototype/` | Opens the draft in a browser |

## Run the draft

```sh
npm run draft   # then open http://localhost:3000/prototype/
```

This is a design-phase draft. The production stack and code plan come next.
