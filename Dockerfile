# MSG CTF 프론트엔드 — 프로덕션 이미지
# Vite 정적 빌드를 nginx로 서빙한다. (Vite 5 / react-router-dom v7 → Node 20+ 필요)

# 1) 빌드 스테이지
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2) 서빙 스테이지 — 정적 파일 + /api/v1 리버스 프록시
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:aa8c9087d36d93e9d650c5365f883b421e8214aedbad24ade52b844c583358f1 AS runtime

USER root
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*
USER 101

# NGINX_ENVSUBST_FILTER: envsubst 치환 대상을 PORT/BACKEND_URL 두 개로만 제한한다.
# 지정하지 않으면 컨테이너의 모든 환경변수가 치환 대상이 되고, 값이 없는 변수는
# 빈 문자열로 치환돼 $host 같은 nginx 자체 변수가 깨질 수 있다.
ENV NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_URL)$'
# 로컬 docker-compose 기본값. 실제 배포 시 런타임이 오버라이드한다.
ENV PORT=80
ENV BACKEND_URL=http://backend:8000

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
