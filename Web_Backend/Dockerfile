# Use Node.js 18 (compatible with canvas)
FROM node:18-bullseye-slim

# Install system dependencies required for canvas and image processing
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY steganography-service.js ./

# Create temp directory (don't copy from host, create fresh)
RUN mkdir -p temp_images

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set NODE_ENV
ENV NODE_ENV=production

# Start the application
CMD ["node", "steganography-service.js"] 