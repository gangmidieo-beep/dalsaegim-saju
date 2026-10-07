# 달새김사주 웹(정적) — 저장소 루트에서 빌드: docker build -f web/Dockerfile .
# 빌드 때 API_ORIGIN·PUBLIC_WEB_ORIGIN·KAKAO_JS_KEY 가 화면 코드에 들어간다(Railway 는 서비스 변수를 빌드 인자로 넘김).
FROM node:22-slim AS build
WORKDIR /app
ARG API_ORIGIN=
ARG PUBLIC_WEB_ORIGIN=
ARG KAKAO_JS_KEY=
ENV API_ORIGIN=$API_ORIGIN PUBLIC_WEB_ORIGIN=$PUBLIC_WEB_ORIGIN KAKAO_JS_KEY=$KAKAO_JS_KEY
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build -w web

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv
EXPOSE 8080
