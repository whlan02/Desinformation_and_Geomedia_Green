#!/bin/bash

echo "🚀 GeoCam Backend Setup Script"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://geocam:geocam@postgres:5432/geocam_db

# Service URLs
STEGANOGRAPHY_SERVICE_URL=http://steganography-service:3001

# Flask Configuration
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False

# Ports
API_PORT=5000
STEGANOGRAPHY_PORT=3001
EOL
    echo "✅ Created .env file with random secret key"
else
    echo "✅ .env file already exists"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check PostgreSQL
echo -n "📀 PostgreSQL: "
if docker-compose exec -T postgres pg_isready -U geocam > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not ready"
fi

# Check Steganography Service
echo -n "🎨 Steganography Service: "
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not ready"
fi

# Check API Service
echo -n "🌐 API Service: "
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not ready"
fi

echo ""
echo "🎉 GeoCam Backend Setup Complete!"
echo ""
echo "📋 Service URLs:"
echo "   • API Service: http://localhost:5000"
echo "   • Steganography Service: http://localhost:3001"
echo "   • PostgreSQL: localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo ""
echo "📖 Check README.md for API documentation and usage examples" 