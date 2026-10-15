# Both local and Ubuntu builds use these exact Linux base manifests.
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
ARG NGINX_IMAGE=nginx:stable-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
RUN npm install -g pnpm@10.32.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/guestbook/package.json ./services/guestbook/package.json
RUN pnpm install --frozen-lockfile
FROM dependencies AS web-build
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=2048
COPY app ./app
COPY src ./src
COPY public ./public
COPY design/tokens.css ./design/tokens.css
COPY next.config.ts tsconfig.json ./
COPY scripts/normalize-static-prefetch.mjs ./scripts/normalize-static-prefetch.mjs
RUN pnpm build
FROM ${NGINX_IMAGE} AS web
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SYYH Signal draft" org.opencontainers.image.revision=$VCS_REF
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=20s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
FROM dependencies AS api-dependencies
RUN pnpm --filter @syyh/guestbook --prod deploy /runtime
FROM ${NODE_IMAGE} AS api
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SYYH guestbook" org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production DB_PATH=/data/guestbook.sqlite PORT=3001
WORKDIR /app
COPY --from=api-dependencies /runtime/node_modules ./node_modules
COPY services/guestbook/*.mjs ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=20s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
