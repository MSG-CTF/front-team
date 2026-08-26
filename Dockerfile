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
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
