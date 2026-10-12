# SYYH Signal

## 当前完整交接 / 2026-10-12

阶段1draft已完成本机开发与云端Docker部署：[公开草稿](http://124.220.190.120/)，运行SHA `e590059ca96620aab024f4bcee27005633e3db08`，GitHub分支`codex/draft-v1`。包含Next/React/TS、真实3D代理人物、四岛探索与真实留言服务。后续agent先读 [阶段1执行交接](docs/agent-work/phases/P1/handoff.md)、[完整交接包](docs/agent-handoff/README.md) 和 [AGENTS.md](AGENTS.md)。正式素材仍待后续阶段；公网浏览器工具读取超时的限制见交接，P2–P5未启动。

[完整方案合订本](docs/agent-handoff/complete-plan.md) 已合并部署流程；后续按 [用户指定五阶段](docs/agent-handoff/07-phased-plan.md) 开展：draft → 修正完善 → 素材完善 → 正式建设 → 正式修补。本次P1明确包含GitHub交付和云端Docker部署；P2–P5未启动。

设计图：[全站初稿](design/review-v1/index.html) · [日夜主题与四岛](design/review-v2/index.html)。入口右侧人物的现行需求是真3D人物跟随鼠标；旧线稿只是占位。下文保留早期项目介绍。

部署目标已指定Ubuntu服务器，网站运行在Docker中；见 [本机开发与Docker部署流程](docs/agent-handoff/06-development-deployment.md)。当前优先本机Linux验证、Git固定版本、云端同输入构建并复核；镜像传输路线按带宽与构建实测结果选择。

A personal site you *tune into*: a CRT visitor gate, then a night sky of floating islands you jump between. The style is ZZZ street-pop broadcast printed on manga pages.

## 运行 draft

需Node24、pnpm10.32.1和Docker。`pnpm install --frozen-lockfile`；`pnpm dev`启动前端，另开终端 `pnpm --filter @syyh/guestbook start` 启动API。

完整Linux生产预览：`docker compose --env-file deploy/.env.example -f deploy/compose.yaml up -d --build --wait`，访问 `http://127.0.0.1:8080/`。

`pnpm typecheck` / `pnpm test` / `pnpm build`。详见 [Docker与运维](deploy/README.md)，[素材缺口与验收](docs/agent-work/phases/P1/handoff.md)。历史prototype/设计图原位保留，主站由app/src实现。

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

This paragraph describes the historical prototype. The current runnable draft is implemented in app/src; use the Docker and pnpm commands above and read the P1 handoff for deployment status.
