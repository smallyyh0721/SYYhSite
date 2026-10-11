#!/usr/bin/env node
// Compile design/tokens.json into design/tokens.css (same layout the design-system page generates).
// Usage: node scripts/tokens-to-css.mjs [in=design/tokens.json] [out=design/tokens.css]
import { readFileSync, writeFileSync } from 'node:fs';

export function compile(tokens) {
  const themes = tokens.color.themes.map((t) => t.id);
  const [first] = themes;
  const ref = (v) => (typeof v === 'string' && /^\{.+\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);
  const valueFor = (tok, theme) => (typeof tok.value === 'string' ? tok.value : tok.value[theme] ?? tok.value[first]);
  const themed = [...tokens.color.tokens, ...(tokens.shadow?.tokens ?? [])];
  const isAlias = (tok) => themes.some((t) => /^\{.+\}$/.test(valueFor(tok, t)));

  const block = (sel, theme, onlyChanged) => {
    const lines = themed
      .filter((tok) => !onlyChanged || isAlias(tok) || valueFor(tok, theme) !== valueFor(tok, first))
      .map((tok) => `  --${tok.name}: ${ref(valueFor(tok, theme))};`);
    return `${sel} {\n${lines.join('\n')}\n}`;
  };

  const out = [`/* ${tokens.name} — generated from tokens.json */`];
  out.push(block(`:root, [data-theme="${first}"]`, first, false));
  for (const t of themes.slice(1)) out.push(block(`[data-theme="${t}"]`, t, true));

  const statics = [];
  for (const [key, fam] of Object.entries(tokens)) {
    if (['name', 'version', 'color', 'type', 'shadow'].includes(key) || !fam?.tokens) continue;
    for (const tok of fam.tokens) statics.push(`  --${tok.name}: ${tok.value};`);
  }
  for (const [k, stack] of Object.entries(tokens.type.families)) statics.push(`  --font-${k}: ${stack};`);
  out.push(`:root {\n${statics.join('\n')}\n}`);

  const px = (v) => (typeof v === 'number' ? `${v}px` : v);
  for (const g of tokens.type.groups) {
    for (const s of g.styles) {
      const decl = [
        `font-family: var(--font-${s.family ?? g.family})`,
        `font-size: ${px(s.fontSize)}`,
        s.lineHeight != null && `line-height: ${s.lineHeight}`,
        s.fontWeight != null && `font-weight: ${s.fontWeight}`,
        s.fontStyle && `font-style: ${s.fontStyle}`,
        s.letterSpacing && `letter-spacing: ${s.letterSpacing}`,
      ].filter(Boolean);
      out.push(`.${s.name} { ${decl.join('; ')}; }`);
    }
  }
  return out.join('\n\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inPath = 'design/tokens.json', outPath = 'design/tokens.css'] = process.argv.slice(2);
  writeFileSync(outPath, compile(JSON.parse(readFileSync(inPath, 'utf8'))));
  console.log(`wrote ${outPath}`);
}
