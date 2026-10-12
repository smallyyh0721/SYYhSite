# SYYH Signal

## 当前完整交接 / 2026-10-12

阶段1draft已交付，用户已批准v3并启动阶段2入口/全屏四岛修正：[公开草稿](http://124.220.190.120/)，GitHub分支`codex/draft-v1`。新版本为WELCOME→CONNECT→HELLO STRANGER→全屏四岛：图范围即时悬停点亮居中、整图点击进入频道。入口真3D代理人物融入背景并看向鼠标，Day/Night贯穿全站；原真实留言服务继续保留。后续agent先读 [当前P2交接](docs/agent-work/phases/P2/handoff.md)、[完整交接包](docs/agent-handoff/README.md) 和 [AGENTS.md](AGENTS.md)。运行SHA及实际验证以交接为准。正式素材仍待P3，P3–P5未启动。

[完整方案合订本](docs/agent-handoff/complete-plan.md) 已合并部署流程；后续按 [用户指定五阶段](docs/agent-handoff/07-phased-plan.md) 开展：draft → 修正完善 → 素材完善 → 正式建设 → 正式修补。本次P2继续交付GitHub和云端draft Docker更新，不开展未要求的正式素材/正式建设。

设计图：[全站初稿](design/review-v1/index.html) · [日夜主题与四岛](design/review-v2/index.html) · [已批准v3入口/全屏世界](design/review-v3/index.html)。运行截图在 [P2验收记录](docs/agent-work/reports/P2-05.md)，正式人物仍待设计。下文保留早期项目介绍。

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
