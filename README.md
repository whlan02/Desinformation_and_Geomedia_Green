# GeoCam: Secure Geo-Verified Photography Platform
**Group 2 - Desinformation and Geomedia Project**

<div align="center">

![GeoCam Logo](./Web_Frontend/public/geocam-logo.png)

*Combating disinformation through cryptographically secure, location-verified photography*

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.3-blue.svg)](https://reactnative.dev/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5.13-green.svg)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-red.svg)](https://nodejs.org/)

</div>

## 🎯 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Work Flow](#-work-flow)
- [Technology Stack](#-technology-stack)
- [Installation & Usage](#-installation--usage)
- [API Documentation](#-api-documentation)
- [License](#-license)
- [Contributing](#-contributing)
- [Team](#-team)

## 📖 About the Project

GeoCam is a comprehensive platform designed to combat digital disinformation by providing cryptographically secure, location-verified photography. In an era where deepfakes and manipulated media threaten information integrity, GeoCam ensures photo authenticity through advanced cryptographic techniques and geographic verification.

### 🎯 **Mission Statement**
To provide journalists, researchers, legal professionals, and citizens with tools to capture and verify authentic, tamper-proof photographic evidence with verifiable location data.

### 🔍 **Problem Statement**
- **Digital Manipulation**: Easy photo editing tools make content manipulation trivial
- **Location Spoofing**: GPS data can be easily falsified or removed
- **Chain of Custody**: Difficult to prove photo authenticity in legal/journalistic contexts
- **Disinformation Spread**: Manipulated images fuel misinformation campaigns

### 💡 **Our Solution**
GeoCam combines multiple security layers:
- **Cryptographic Signatures**: secp256k1 elliptic curve signatures
- **Steganographic Embedding**: Hidden metadata within image data
- **Device Registration**: Unique device fingerprinting
- **Real-time Verification**: Instant authenticity checking
- **Geographic Anchoring**: Tamper-evident location data

## ✨ Key Features

### 📱 **Mobile Application (React Native)**
- **Modern Camera Interface**: Theme-aware UI with advanced gesture controls
- **Enhanced User Experience**: Haptic feedback, smooth animations, and intuitive navigation
- **Real-time GPS Integration**: High-accuracy location embedding with metadata
- **Advanced Camera Features**: Timer, grid lines, zoom controls, tap-to-focus
- **Cryptographic Key Management**: Secure device-specific key generation and storage
- **Offline Capability**: Full functionality without internet connectivity
- **Gallery Management**: Organized photo storage with comprehensive metadata viewing
- **Image Verification**: On-device authenticity checking with detailed results
- **Comprehensive Theme Support**: Dynamic dark/light mode with consistent styling
- **Cross-platform**: Optimized for both iOS and Android devices

### 🌐 **Web Frontend (Vue.js)**
- **Administrative Dashboard**: Device and photo management
- **Verification Portal**: Public image authenticity checking
- **Interactive Architecture Diagram**: System visualization
- **Statistics Dashboard**: Usage analytics and insights
- **Responsive Design**: Mobile and desktop optimized
- **Real-time Updates**: Live status monitoring

### ⚙️ **Backend Services (Node.js/Python)**
- **RESTful API**: Comprehensive endpoint coverage
- **Steganography Engine**: Advanced metadata embedding
- **Database Management**: PostgreSQL with migration support
- **Device Registration**: Secure device onboarding
- **Image Processing**: Multi-format support
- **Verification Engine**: Cryptographic validation

## 🔐 Work Flow

### 📸 Image Signing Process

![Signing Process](asset/Signing.png)

**Signing Process:**

1. **Image Capture**: User takes a photo through the GeoCam mobile application
2. **Metadata Collection**: System automatically collects GPS location, timestamp, device information and other metadata
3. **Backend Initial Processing**: Mobile app sends JPEG image, metadata, and public key to backend
   - Turning the Jpeg image into PNG image by adding an alpha channel
   - Encodes basic metadata into alpha channels using LSB steganography(excluding last row)
   - Generates hash from the image
4. **Device Signing**: Mobile app receives hash from backend, then signs hash using private key stored in device
5. **Backend Final Assembly**: Mobile app sends signature  back to backend, then backend embeds signature and public key into last row of alpha channels using LSB steganography
6. **Secure Storage**: Final signed PNG is returned to mobile app and saved to device local gallery


### 🔍 Image Verification Process

![Verification Process](asset/Verifiying.png)

**Verification Process:**

1. **Image Upload**: Mobile app sends PNG image to backend verification service
2. **Steganographic Extraction**: Backend extracts metadata, public key, and signature from image using steganography
3. **Signature Removal**: Backend removes public key and signature from the last row of the alpha channel
4. **Hash Generation**: Backend computes hash of the cleaned image
5. **Cryptographic Verification**: Backend uses extracted hash, public key, and signature to verify image authenticity
6. **Result Response**: Backend sends verification results back to mobile app with authenticity status and metadata


### **Key Security Principles**

1. **🔐 Private Key Isolation**: Private keys never leave the device and are stored in secure hardware-backed storage
2. **🔑 Public Key Distribution**: Only public keys are transmitted to the backend for verification
3. **✅ Signature Verification**: Backend uses stored public keys to cryptographically verify image signatures
4. **🛡️ Secure Storage**: Private keys are protected by device secure storage (Android Keystore/iOS Keychain)
5. **🚫 No Key Transmission**: The verification process never requires transmitting private keys


## 💻 Technology Stack

### **Mobile Application**
- **Framework**: React Native 0.79.3 with Expo 53.0.11
- **Navigation**: Expo Router 5.1.0 with file-based routing
- **State Management**: React Hooks + Context API with TypeScript
- **Cryptography**: @noble/curves (secp256k1) for secure signatures
- **Device Integration**: expo-location, expo-camera, expo-haptics
- **Storage**: expo-secure-store for keys, AsyncStorage for app data
- **UI/UX**: @expo/vector-icons, react-native-gesture-handler, react-native-safe-area-context
- **Maps & Visualization**: react-native-maps (mobile), react-native-svg
- **Theme System**: Custom context-based theme management

### **Backend Services**
- **Python Backend**: Flask 3.0.3 + PostgreSQL
- **Node.js Service**: Express + TypeScript
- **Image Processing**: Sharp, PNGJS
- **Cryptography**: @noble/curves (secp256k1)
- **Database**: PostgreSQL with migrations
- **API Documentation**: RESTful endpoints

### **Web Frontend**
- **Framework**: Vue.js 3.5.13
- **Build Tool**: Vite 6.2.4
- **State Management**: Pinia 3.0.3
- **Routing**: Vue Router 4.5.1
- **HTTP Client**: Axios 1.10.0
- **Visualization**: D3.js 7.9.0, OpenLayers 10.6.1

### **DevOps & Deployment**
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **Package Management**: npm/yarn
- **Build Tools**: Expo CLI, TypeScript, Babel

## 🚀 Installation & Usage

### **Prerequisites**
Before getting started, ensure you have the following installed on your system:

- **Node.js 18+** and **npm/yarn** - [Download Node.js](https://nodejs.org/)
- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **Expo CLI** - Install globally: `npm install -g @expo/cli`
- **Android Studio** (for Android development) - [Download Android Studio](https://developer.android.com/studio)
- **Xcode** (for iOS development, macOS only) - [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
- **Docker & Docker Compose** (optional, for containerized deployment) - [Download Docker](https://www.docker.com/get-started)

### **🚀 Quick Start (Recommended)**

The fastest way to get GeoCam running is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/whlan02/Desinformation_and_Geomedia_Green.git
cd Desinformation_and_Geomedia_Green

# 2. Start all services with Docker
cd Web_Backend
docker-compose up -d

# 3. Access the applications
# Web Frontend: http://localhost:3000
# Python Backend API: http://localhost:5000
# Node.js Steganography Service: http://localhost:3001
```

### **📱 Manual Installation & Setup**

#### **Step 1: Clone and Setup Repository**
```bash
# Clone the repository
git clone https://github.com/whlan02/Desinformation_and_Geomedia_Green.git
cd Desinformation_and_Geomedia_Green
```

#### **Step 2: Backend Services Setup**

**Python Backend (Flask API):**
```bash
# Navigate to backend directory
cd Web_Backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env file with your configuration if needed

# Start Python backend
python app.py
# Backend will run on http://localhost:5000
```

**Node.js Steganography Service:**
```bash
# In a new terminal, navigate to backend directory
cd Web_Backend

# Install Node.js dependencies
npm install

# Build the TypeScript service
npm run build

# Start the steganography service
npm start
# Service will run on http://localhost:3001
```

#### **Step 3: Web Frontend Setup**
```bash
# In a new terminal, navigate to frontend directory
cd Web_Frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend will run on http://localhost:3000
```

#### **Step 4: Mobile Application Setup**
```bash
# In a new terminal, navigate to mobile app directory
cd geoCamApp

# Install dependencies
npm install

# Start Expo development server
npm start
# or
expo start
```

**For iOS Development:**
```bash
# Run on iOS simulator (macOS only)
npm run ios
# or
expo run:ios
```

**For Android Development:**
```bash
# Run on Android emulator or device
npm run android
# or
expo run:android
```

### **📋 Usage Guide**

#### **🌐 Web Application Usage**

1. **Access the Web Dashboard:**
   - Open your browser and navigate to `http://localhost:3000`
   - The dashboard provides device management and image verification features

2. **Device Registration:**
   - Use the web interface to view registered devices
   - Monitor device activity and statistics

3. **Image Verification:**
   - Upload images through the web portal to verify their authenticity
   - View detailed verification results and metadata

#### **📱 Mobile Application Usage**

1. **Install the Mobile App:**
   - Use Expo Go app to scan the QR code from `expo start`
   - Or build and install the app directly on your device

2. **First Time Setup:**
   - Open the GeoCam app
   - The app will automatically generate cryptographic keys
   - Grant location and camera permissions when prompted

3. **Taking Secure Photos:**
   - Tap the camera icon to open the camera interface
   - Take photos with automatic GPS location embedding
   - Photos are cryptographically signed and stored securely

4. **Viewing Gallery:**
   - Access your secure photo gallery
   - View metadata including location, timestamp, and verification status

5. **Verifying Images:**
   - Select any image from your gallery or device
   - Tap "Verify" to check authenticity
   - View detailed verification results

### **🔧 Configuration**

#### **Backend Configuration**
Edit `Web_Backend/.env` file:
```env
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/geocam_db

# API configuration
FLASK_ENV=development
FLASK_DEBUG=True

# CORS settings
CORS_ORIGINS=http://localhost:3000
```

#### **Mobile App Configuration**
Edit `geoCamApp/utils/backendConfig.ts`:
```typescript
export const BACKEND_CONFIG = {
  PYTHON_API_URL: 'http://localhost:5000',
  STEGANOGRAPHY_API_URL: 'http://localhost:3001',
  // For physical device testing, use your computer's IP:
  // PYTHON_API_URL: 'http://192.168.1.100:5000',
  // STEGANOGRAPHY_API_URL: 'http://192.168.1.100:3001',
};
```

### **🧪 Testing the Setup**

1. **Verify Backend Services:**
   ```bash
   # Test Python API
   curl http://localhost:5000/api/health
   
   # Test Node.js service
   curl http://localhost:3001/health
   ```

2. **Test Web Frontend:**
   - Navigate to `http://localhost:3000`
   - Check that the dashboard loads correctly

3. **Test Mobile App:**
   - Open the app in Expo Go or on device
   - Try taking a photo and verifying it

### **🚨 Troubleshooting**

**Common Issues:**

- **Port conflicts:** If ports 3000, 3001, or 5000 are in use, modify the port configurations in the respective service files
- **CORS errors:** Ensure the backend CORS settings include your frontend URL
- **Mobile app connection issues:** Use your computer's IP address instead of localhost when testing on physical devices
- **Permission errors:** Ensure camera and location permissions are granted on mobile devices

**Getting Help:**
- Check the individual component READMEs for detailed troubleshooting
- Review the API documentation below for endpoint details
- Open an issue on GitHub if you encounter persistent problems

## 📚 API Documentation

### **Core Endpoints (Python Flask Service - Port 5001)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register-device-secure` | Register new device with secp256k1 keys |
| `GET` | `/api/devices-secure` | List registered devices |
| `POST` | `/api/verify-image-secure` | Verify image authenticity |
| `GET` | `/api/health` | API service health check |
| `GET` | `/api/stats` | System statistics |

### **Steganography Endpoints (Node.js Service - Port 3001)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/process-geocam-image` | Process JPEG image and get hash to sign |
| `POST` | `/complete-geocam-image` | Complete processing with signature |
| `POST` | `/pure-png-verify` | Verify PNG image with embedded signature |
| `GET` | `/health` | Steganography service health check |


## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Code Standards**
- **JavaScript/TypeScript**: ESLint + Prettier
- **Python**: PEP 8 + Black formatter
- **Vue.js**: Vue Style Guide
- **Git**: Conventional Commits

### **Definition of Done** ✅
- ✅ All specified criteria met and thoroughly tested
- ✅ Code reviewed and approved by team members
- ✅ Comprehensive documentation updated
- ✅ No known bugs or critical issues
- ✅ Unit and integration tests passing
- ✅ Performance benchmarks met
- ✅ Accessibility standards compliance
- ✅ Successfully deployed and verified

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**Group 2 - Desinformation and Geomedia**

### **Core Development Team**
- **Ahmad** 
- **Ajay**
- **WenHao** 
- **Prince** 

### **Contributions**
- **Mobile Application**: Enhanced camera interface, gesture controls, theme system
- **Web Platform**: Administrative dashboard, verification portal, interactive architecture
- **Backend Services**: Cryptographic security, steganography engine, API development
- **DevOps & Testing**: Containerization, CI/CD, comprehensive testing suite

---

## 📞 Support & Community

### **Getting Help**
For questions, issues, or contributions:
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/whlan02/Desinformation_and_Geomedia_Green/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/whlan02/Desinformation_and_Geomedia_Green/discussions)
- **📚 Documentation**: Check the individual component READMEs for detailed guides

### **Project Links**
- **📱 Mobile App**: [GeoCam App Documentation](./geoCamApp/README.md)
- **🌐 Web Frontend**: [Frontend Documentation](./Web_Frontend/README.md)
- **⚙️ Backend Services**: [Backend Documentation](./Web_Backend/README.md)

### **Research Context**
This project is part of the **Desinformation and Geomedia** research initiative, exploring technological solutions to combat misinformation through verifiable digital media and secure authentication systems.

---

<div align="center">

**[🏠 Main Repository](https://github.com/whlan02/Desinformation_and_Geomedia_Green)** • **[📱 Mobile App](./geoCamApp/)** • **[🌐 Web Frontend](./Web_Frontend/)** • **[⚙️ Backend Services](./Web_Backend/)**

*Built with ❤️ for digital authenticity and truth*

**GeoCam Platform - Securing Digital Media Through Innovation**

</div>

