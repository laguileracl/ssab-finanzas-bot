#!/bin/bash

# Production deployment script
echo "Building for production..."

# Set production environment
export NODE_ENV=production

# Build the client
echo "Building client..."
npx vite build

# Build the server
echo "Building server..."
mkdir -p dist
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --external:@neondatabase/serverless \
  --external:node-telegram-bot-api \
  --external:ws \
  --external:drizzle-orm \
  --external:drizzle-kit

# Copy necessary files
cp -r server/vite.ts dist/ 2>/dev/null || true
cp -r shared dist/ 2>/dev/null || true

echo "Build complete!"
echo "Starting production server..."

# Start the production server
exec node dist/index.js