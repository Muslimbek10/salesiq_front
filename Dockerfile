# ============================================================
# Frontend Dockerfile — React + Vite (Production)
# Stage 1: Build the app
# Stage 2: Serve with nginx
# ============================================================

# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

# Accept API URL at build time so Vite can bake it in
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# --- Serve Stage ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/bin/sh", "-c", "sed -i 's/__PORT__/'${PORT:-80}'/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
