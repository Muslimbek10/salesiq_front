# ============================================================
# Frontend Dockerfile — React + Vite (Production)
# Stage 1: Build the app
# Stage 2: Serve with lightweight static server
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
FROM node:20-alpine

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
