# GeoCam Backend Services

This backend consists of two microservices:

1. **Node.js Steganography Service** (Port 3001) - Handles image steganography encoding/decoding
2. **Python Flask API Service** (Port 5000) - Handles device registration and verification logic

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GeoCam App    │    │  Python Flask   │    │  Node.js Steg   │
│  (React Native) │◄──►│   API Service   │◄──►│    Service      │
└─────────────────┘    │   (Port 5000)   │    │   (Port 3001)   │
                       └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    └─────────────────┘
```

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- PostgreSQL 15+ (for local development)

### Quick Start with Docker

1. **Clone and navigate to backend directory:**
   ```bash
   cd Web_Backend
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service health:**
   ```bash
   # Check API service
   curl http://localhost:5000/health
   
   # Check steganography service
   curl http://localhost:3001/health
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

## API Endpoints

### Python Flask API (Port 5000)

#### Device Registration
- **POST** `/api/register-device`
  ```json
  {
    "installation_id": "install_abc123_def456",
    "device_model": "iPhone 14 Pro",
    "os_name": "iOS",
    "os_version": "17.0",
    "public_key_data": { ... }
  }
  ```

#### Get All Devices
- **GET** `/api/devices`

#### Image Verification
- **POST** `/api/verify-image`
  - Form data with `image` file
  - Optional `installation_id` parameter

#### Device Info
- **GET** `/api/device/{installation_id}`

#### System Statistics
- **GET** `/api/stats`

### Node.js Steganography Service (Port 3001)

#### Decode Image
- **POST** `/decode-image`
  - Form data with `image` file

#### Encode Image (for future use)
- **POST** `/encode-image`
  - Form data with `image` file and `message`

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

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `STEGANOGRAPHY_SERVICE_URL` - Node.js service URL
- `SECRET_KEY` - Flask secret key
- `DEBUG` - Enable debug mode

## Security Features

- **Hardware-backed Key Storage**: Uses device secure storage
- **Digital Signatures**: SHA256-based signature verification
- **Steganography**: Hidden data in images using LSB technique
- **Activity Logging**: All verification attempts are logged

## Troubleshooting

### Common Issues

1. **Canvas installation fails on Node.js**:
   ```bash
   # On Ubuntu/Debian:
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   
   # On macOS:
   brew install pkg-config cairo pango libpng jpeg giflib librsvg
   ```

2. **PostgreSQL connection fails**:
   - Check if PostgreSQL is running
   - Verify database credentials
   - Ensure database exists

3. **Steganography service unreachable**:
   - Check if Node.js service is running on port 3001
   - Verify STEGANOGRAPHY_SERVICE_URL in Python service

### Logs

```bash
# View Docker logs
docker-compose logs -f api-service
docker-compose logs -f steganography-service

# View individual service logs
docker logs geocam-api-service
docker logs geocam-steganography-service
```

## Development

### Adding New Endpoints

1. **Python API**: Add routes in `app.py`
2. **Database**: Add functions in `database.py`
3. **Node.js**: Add routes in `steganography-service.js`

### Database Migrations

The system automatically creates tables on startup. For schema changes:

1. Update `database.py`
2. Add migration logic if needed
3. Restart services

## Testing

```bash
# Test device registration
curl -X POST http://localhost:5000/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "installation_id": "test_install_123",
    "device_model": "Test Device",
    "os_name": "TestOS",
    "os_version": "1.0"
  }'

# Test image verification
curl -X POST http://localhost:5000/api/verify-image \
  -F "image=@test_image.jpg"
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
