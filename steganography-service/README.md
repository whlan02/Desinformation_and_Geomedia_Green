# GeoCam Steganography Service

A standalone Node.js service for image steganography operations, designed for deployment on Railway.

## Features

- Image steganography encoding/decoding
- PNG and JPEG support
- Digital signature verification
- RESTful API endpoints

## API Endpoints

- `POST /encode` - Encode message into image
- `POST /decode` - Decode message from image
- `POST /verify` - Verify image authenticity
- `GET /health` - Health check

## Deployment

This service is optimized for Railway deployment with better performance than Render's free tier.

## Environment Variables

- `PORT` - Service port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `NODE_OPTIONS` - Node.js options (e.g., --max-old-space-size=2048)
- `CORS_ORIGINS` - Additional CORS origins (comma-separated)

## Local Development

```bash
npm install
npm start
```

## Health Check

```bash
curl http://localhost:3001/health
``` 