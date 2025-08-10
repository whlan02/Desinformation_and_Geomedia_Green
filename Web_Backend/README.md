# GeoCam Backend Services

This backend consists of two microservices:

1. **Node.js Steganography Service** (Port 3001) - Handles image steganography encoding/decoding
2. **Python Flask API Service** (Port 5001) - Handles device registration and verification logic

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GeoCam App    │    │  Python Flask   │    │  Node.js Steg   │
│  (React Native) │◄──►│   API Service   │◄──►│    Service      │
└─────────────────┘    │   (Port 5001)   │    │   (Port 3001)   │
                       └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    └─────────────────┘
```

## Setup Instructions

### Prerequisites

#### For Docker Deployment (Recommended)
- Docker 20.10+
- Docker Compose 2.0+

#### For Local Development
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### Quick Start with Docker

1. **Clone and navigate to backend directory:**
   ```bash
   cd Web_Backend
   ```

2. **Configure environment (optional):**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env file with your preferred settings
   # For production, change SECRET_KEY and database passwords
   ```

3. **Start all services:**
   ```bash
   # Build and start all services in detached mode
   docker-compose up --build -d
   
   # Or start with logs visible
   docker-compose up --build
   ```

4. **Check service health:**
   ```bash
   # Check API service
   curl http://localhost:5001/api/health
   
   # Check steganography service
   curl http://localhost:3001/health
   
   # Check all services status
   docker-compose ps
   ```

5. **Stop services:**
   ```bash
   # Stop all services
   docker-compose down
   
   # Stop and remove volumes (WARNING: This will delete database data)
   docker-compose down -v
   ```

### Local Development Setup

#### 1. Database Setup
```bash
# Install PostgreSQL and create database
createdb geocam_db
createuser geocam --password  # Set password as 'geocam'
```

#### 2. Node.js Steganography Service
```bash
# Install dependencies
npm install

# Start service
npm start
# Or for development:
npm run dev
```

#### 3. Python Flask API Service
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://geocam:geocam@localhost:5432/geocam_db"
export STEGANOGRAPHY_SERVICE_URL="http://localhost:3001"

# Start service
python app.py
```



## Database Schema

### `geocam_devices` table:
- `id` (Primary Key)
- `installation_id` (Unique)
- `device_model`
- `os_name`
- `os_version`
- `public_key_hash`
- `public_key_data` (JSONB)
- `registration_date`
- `geocam_sequence` (GeoCam1, GeoCam2, etc.)
- `last_activity`
- `is_active`

### `verification_history` table:
- `id` (Primary Key)
- `device_id` (Foreign Key)
- `verification_timestamp`
- `image_hash`
- `verification_result`
- `verification_message`
- `signature_data` (JSONB)

## Configuration

### Environment Variables

The following environment variables can be configured:

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
  - Docker default: `postgresql://geocam:geocam@postgres:5432/geocam_db`
  - Local default: `postgresql://geocam:geocam@localhost:5432/geocam_db`

#### Service URLs
- `STEGANOGRAPHY_SERVICE_URL` - Node.js steganography service URL
  - Docker default: `http://steganography-service:3001`
  - Local default: `http://localhost:3001`

#### Flask Configuration
- `SECRET_KEY` - Flask secret key (⚠️ **Change in production!**)
- `DEBUG` - Enable debug mode (`true`/`false`)
- `PORT` - API service port (default: `5001`)

#### Node.js Configuration
- `NODE_ENV` - Node environment (`development`/`production`)

### Docker Environment

When using Docker Compose, environment variables are automatically configured in `docker-compose.yml`. You can override them by:

1. **Using .env file** (recommended):
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Direct environment variables**:
   ```bash
   export SECRET_KEY="your-secure-key"
   docker-compose up
   ```

## Local Testing Guide (Hybrid Mode, under the same wifi)

This guide explains how to run steganography service locally while keeping the remote database connection.

### Step 1: Configure Local Environment

1. **Get Your Local IP Address**:
   ```bash
   # On Windows
   ipconfig
   
   # On macOS/Linux
   ifconfig
   # or
   ip addr
   ```
   Note down your local IP address (usually starts with 192.168.x.x or 10.0.x.x)

2. **Update Mobile App Configuration**:
   - Open `geoCamApp/utils/backendConfig.ts`
   - Set the following variables:
     ```typescript
     // Keep main API service in production
     const USE_LOCAL_FOR_TESTING = false;
     // But use local steganography service
     const USE_LOCAL_STEGANOGRAPHY_ONLY = true;
     
     // Update IP address to your local IP (only for steganography service)
     const DEV_STEG_URL = Platform.OS === 'web' 
       ? 'http://localhost:3001' 
       : 'http://YOUR_IP_ADDRESS:3001';
     ```

3. **Update Backend Configuration**:
   - Open `Web_Backend/config.py`
   - Set the steganography service URL to local:
     ```python
     STEGANOGRAPHY_SERVICE_URL = os.getenv('STEGANOGRAPHY_SERVICE_URL', 'http://localhost:3001')
     ```

### Step 2: Start Local Steganography Service

1. **Start Node.js Steganography Service**:
   ```bash
   # Navigate to Web_Backend
   cd Web_Backend
   
   # Install dependencies if not done
   npm install
   
   # Start steganography service
   node steganography-service.js
   ```

2. **Start Mobile App** (in a new terminal):
   ```bash
   # Navigate to geoCamApp
   cd geoCamApp
   
   # Install dependencies if not done
   npm install
   
   # Start Expo development server
   npx expo start
   ```

### Step 3: Verify Services

1. **Check Local Steganography Service**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check Remote API Service**:
   ```bash
   curl https://geocam-api.onrender.com/health
   ```

### Troubleshooting

1. **Connection Issues**:
   - Ensure steganography service is running on port 3001
   - Check if your phone and computer are on the same network
   - Verify the IP address in `backendConfig.ts` is correct
   - Try disabling firewall temporarily

2. **Port Conflicts**:
   - Check if port 3001 is available:
     ```bash
     # On Windows
     netstat -ano | findstr "3001"
     
     # On macOS/Linux
     lsof -i :3001
     ```

### Switching Back to Production

To switch back to full production environment:

1. **Update Mobile App Configuration**:
   - In `geoCamApp/utils/backendConfig.ts`:
     ```typescript
     const USE_LOCAL_FOR_TESTING = false;
     const USE_LOCAL_STEGANOGRAPHY_ONLY = false;
     ```

2. **Update Backend Configuration**:
   - In `Web_Backend/config.py`:
     ```python
     STEGANOGRAPHY_SERVICE_URL = os.getenv('STEGANOGRAPHY_SERVICE_URL', 'https://geocam-steganography.onrender.com')
     ```
