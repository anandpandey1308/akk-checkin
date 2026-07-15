# Stage 1: Build the Vite frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies for frontend and build
RUN npm ci --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build:frontend

# Stage 2: Run the production Express application
FROM node:20-slim AS runner
WORKDIR /app

# Install native dependencies for better-sqlite3 compilation
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

# Install production dependencies for the backend
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend files and utility scripts
COPY src/ ./src/
COPY scripts/ ./scripts/

# Copy static frontend files from Stage 1
COPY --from=frontend-builder /app/public ./public/

# Ensure the data directory exists for SQLite persistent volume
RUN mkdir -p /app/data

# Environment configuration
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
