#!/bin/bash

# SSAB Chile Finance Bot Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Deploying SSAB Finance Bot to $ENVIRONMENT environment"

# Check if required files exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy .env.example to .env and configure your values."
    exit 1
fi

# Verify environment variables
echo "🔍 Checking environment configuration..."
source .env

REQUIRED_VARS=(
    "TELEGRAM_BOT_TOKEN"
    "DATABASE_URL"
    "SESSION_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Database setup
echo "🗄️ Setting up database..."
npm run db:push

# Build application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

if [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment with PM2
    echo "🏭 Starting production deployment..."
    
    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Stop existing processes
    pm2 stop ssab-finance-bot 2>/dev/null || true
    pm2 delete ssab-finance-bot 2>/dev/null || true
    
    # Start new process
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup startup script
    pm2 startup
    
    echo "✅ Production deployment complete"
    echo "📊 Monitor with: pm2 logs ssab-finance-bot"
    
elif [ "$ENVIRONMENT" = "development" ]; then
    # Development deployment
    echo "🔧 Starting development server..."
    NODE_ENV=development npm run dev
    
else
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "   Valid options: production, development"
    exit 1
fi

# Health check
echo "🏥 Performing health check..."
sleep 5

if [ "$ENVIRONMENT" = "production" ]; then
    # Check if process is running
    if pm2 show ssab-finance-bot > /dev/null 2>&1; then
        echo "✅ Bot process is running"
    else
        echo "❌ Bot process failed to start"
        exit 1
    fi
fi

# Test API endpoints
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ API health check passed"
else
    echo "⚠️  API health check failed (server may still be starting)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Test bot with /start command in Telegram"
echo "   2. Monitor logs: tail -f logs/combined.log"
echo "   3. Check health: curl http://localhost:5000/api/health"
echo ""
echo "🔗 Useful commands:"
echo "   pm2 logs ssab-finance-bot  # View logs"
echo "   pm2 restart ssab-finance-bot  # Restart bot"
echo "   pm2 status  # Check status"
echo ""