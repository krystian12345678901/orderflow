# OrderFlow Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies (including dev for build)
RUN cd frontend && npm install
RUN cd backend && npm install

# Copy source code
COPY frontend ./frontend
COPY backend ./backend

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install production deps only
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source code
COPY backend ./backend

# Copy built frontend from builder
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create directories for data
RUN mkdir -p backend/data backend/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

WORKDIR /app/backend

CMD ["node", "server.js"]
