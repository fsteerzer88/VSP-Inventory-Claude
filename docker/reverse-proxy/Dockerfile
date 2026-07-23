FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY docker/reverse-proxy/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/reverse-proxy/docker-entrypoint.sh /docker-entrypoint.d/50-vsp-certs.sh
RUN chmod +x /docker-entrypoint.d/50-vsp-certs.sh

EXPOSE 80 443
