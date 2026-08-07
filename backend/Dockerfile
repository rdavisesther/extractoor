# Build stage
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies (needs dev deps to compile TypeScript)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY tsconfig.json ./
COPY .eslintrc.json ./
COPY .prettierrc ./
COPY src ./src
COPY data ./data
RUN npm run build
RUN npm prune --omit=dev

# Runtime stage
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Runtime user for security
RUN useradd -r -s /bin/false subgen && mkdir -p /app/data && chown subgen:subgen /app/data

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data

USER subgen
EXPOSE 4000

# DATABASE_PATH overridable at runtime (docker-compose mounts a volume)
ENV DATABASE_PATH=/app/data/subdomain-generator.db
CMD ["node", "dist/server.js"]
