FROM node:22-bookworm-slim

WORKDIR /app

ARG ZIWEI_RELEASE_VERSION=development
ARG ZIWEI_RELEASE_COMMIT=
ARG ZIWEI_RELEASE_SOURCE=local

ENV NODE_ENV=production
ENV PORT=3000
ENV ZIWEI_RELEASE_VERSION=$ZIWEI_RELEASE_VERSION
ENV ZIWEI_RELEASE_COMMIT=$ZIWEI_RELEASE_COMMIT
ENV ZIWEI_RELEASE_SOURCE=$ZIWEI_RELEASE_SOURCE

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public
COPY data ./data
COPY examples ./examples
COPY README.md ./README.md
COPY docs ./docs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "serve"]
