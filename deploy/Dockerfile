FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_CAREERS_URL
ARG VITE_SPACES_URL
ENV VITE_CAREERS_URL=${VITE_CAREERS_URL} VITE_SPACES_URL=${VITE_SPACES_URL}
RUN npm run build
FROM nginx:1.28-alpine
ARG SPACES_REVISION
LABEL org.opencontainers.image.source="https://github.com/OneSmarterInc/kormic-spaces-frontend" org.opencontainers.image.revision="${SPACES_REVISION}"
ENV NGINX_ENVSUBST_FILTER=^PUBLIC_HOST$
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
