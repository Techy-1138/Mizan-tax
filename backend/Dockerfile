# ============================================================================
# Mizan (ميزان) - Production Dockerfile for Google Cloud Run
# Multi-stage build for NestJS + Prisma Client (Neon PostgreSQL + Firebase)
# ============================================================================

# --- Stage 1: Build ---
FROM node:22-slim AS builder

WORKDIR /app

# Install OpenSSL required by Prisma query engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

# Copy TypeScript source and compile to dist/
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Prune devDependencies for a smaller production node_modules
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080

# Copy compiled JS, production dependencies, and Prisma schema/client
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

# Cloud Run injects PORT=8080; main.ts binds to 0.0.0.0:PORT
CMD ["node", "dist/main.js"]
