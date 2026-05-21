FROM node:18-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Cache-bust: force Docker to re-copy source every build
ARG CACHEBUST=1

# Copy source and prisma
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application (clean incremental cache first)
RUN rm -f tsconfig.build.tsbuildinfo && npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Re-generate prisma client after pruning
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3333

CMD ["node", "dist/main"]
