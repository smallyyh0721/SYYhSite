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
COPY proxy.ts ./
COPY scripts/normalize-static-prefetch.mjs ./scripts/normalize-static-prefetch.mjs
RUN pnpm build
FROM ${NGINX_IMAGE} AS web
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SYYH edge" org.opencontainers.image.revision=$VCS_REF
COPY deploy/nginx-v3.conf /etc/nginx/syyh/production.conf
COPY deploy/nginx-local.conf /etc/nginx/syyh/local.conf
COPY deploy/nginx-locations.conf /etc/nginx/syyh/locations.conf
COPY deploy/nginx-security.conf /etc/nginx/syyh/security.conf
COPY deploy/nginx-proxy.conf /etc/nginx/syyh/proxy.conf
COPY deploy/nginx-upstreams.conf /etc/nginx/syyh/upstreams.conf
COPY deploy/start-edge.sh /usr/local/bin/start-edge.sh
USER 11001:11001
EXPOSE 8080 8443
HEALTHCHECK --interval=20s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-edge.sh"]
FROM ${NODE_IMAGE} AS frontend
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SYYH frontend" org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=web-build --chown=node:node /app/.next/standalone ./
COPY --from=web-build --chown=node:node /app/.next/static ./.next/static
COPY --from=web-build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/about/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
FROM dependencies AS api-dependencies
RUN pnpm --filter @syyh/guestbook --prod deploy /runtime
FROM ${NODE_IMAGE} AS api
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SYYH guestbook" org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production DB_PATH=/data/guestbook.sqlite PORT=3001 CONTENT_DB_PATH=/content/content.sqlite STAGING_ROOT=/uploads DERIVED_ROOT=/media OWNER_PASSWORD_FILE=/run/secrets/owner-password.json
WORKDIR /app
COPY --from=api-dependencies /runtime/node_modules ./node_modules
COPY services/guestbook/*.mjs ./
RUN mkdir /data /content /uploads && chown node:node /data /content /uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=20s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
FROM api AS worker
USER root
ARG DEBIAN_MIRROR=https://deb.debian.org
# The slim runtime has no OS CA bundle. Bootstrap HTTPS trust from the pinned Node
# binary's built-in Mozilla roots; APT also keeps its Debian signature verification.
RUN node -e 'require("node:fs").writeFileSync("/tmp/syyh-build-ca.pem",require("node:tls").rootCertificates.join("\n"))' \
    && sed -i "s|http://deb.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::https::CaInfo=/tmp/syyh-build-ca.pem -o Acquire::https::Timeout=30 -o Acquire::Retries=2 update \
    && apt-get -o Acquire::https::CaInfo=/tmp/syyh-build-ca.pem -o Acquire::https::Timeout=30 -o Acquire::Retries=2 install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/* /tmp/syyh-build-ca.pem
USER node
ENV COS_SITE_ROOT=/store DERIVED_ROOT=/store/derived FFMPEG_PATH=/usr/bin/ffmpeg FFPROBE_PATH=/usr/bin/ffprobe
HEALTHCHECK NONE
CMD ["node", "media-worker.mjs"]
