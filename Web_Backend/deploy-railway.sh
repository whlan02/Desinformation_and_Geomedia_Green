#!/bin/bash

# Railway Deployment Script for GeoCam Steganography Service
# This script helps deploy the steganography service to Railway

echo "🚀 Railway Deployment Script for GeoCam Steganography Service"
echo "=============================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Please install it first: npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    railway login
fi

echo "📁 Current directory: $(pwd)"
echo "🔍 Checking for required files..."

# Check for required files
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the Web_Backend directory."
    exit 1
fi

if [ ! -f "steganography-service.js" ]; then
    echo "❌ steganography-service.js not found. Please run this script from the Web_Backend directory."
    exit 1
fi

echo "✅ Required files found."

# Initialize Railway project if not already initialized
if [ ! -f "railway.json" ] && [ ! -d ".railway" ]; then
    echo "🚂 Initializing Railway project..."
    railway init
else
    echo "✅ Railway project already initialized."
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
railway variables set NODE_ENV=production
railway variables set NODE_OPTIONS="--max-old-space-size=2048"

echo "📦 Deploying to Railway..."
railway up

echo "🌐 Generating domain..."
railway domain

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the Railway URL from above"
echo "2. Update your main API service to use this new URL"
echo "3. Add the Railway URL to your CORS_ORIGINS environment variable if needed"
echo "4. Test the integration"
echo ""
echo "🔍 Useful commands:"
echo "  railway logs     - View deployment logs"
echo "  railway status   - Check deployment status"
echo "  railway shell    - Open shell in deployment"
echo "  railway open     - Open Railway dashboard" 