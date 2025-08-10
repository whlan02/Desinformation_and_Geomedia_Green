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
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Security Implementation](#-security-implementation)
- [Contributing](#-contributing)
- [License](#-license)
- [Team](#-team)
- [Latest Updates & Enhancements](#-latest-updates--enhancements)

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
- **Database Management**: SQLite with migration support
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

### **Verification Process Steps**

1. **📱 Image Selection**: User selects image from phone gallery or GeoCam gallery
2. **🔍 Steganography Extraction**: Hidden metadata is extracted from the image
3. **🔐 Signature Verification**: If signature is present, backend verifies it using stored public key
4. **📊 Result Processing**: Combines steganographic and cryptographic verification results
5. **📋 UI Display**: Shows verification status, metadata, and location data if available

### **Security Architecture**

```mermaid
graph TB
    subgraph "Device Security Boundary"
        PK[Private Key<br/>🔒 Secure Storage]
        SIG[Sign Image<br/>🔐 Private Key]
        META[Embed Metadata<br/>📊 Steganography]
    end
    
    subgraph "Network Layer"
        PUB[Public Key<br/>📤 Transmitted]
        IMG[Signed Image<br/>📸 With Metadata]
    end
    
    subgraph "Backend Verification"
        STORE[Public Key Storage<br/>🗃️ Database]
        VERIFY[Signature Verification<br/>✅ Public Key]
        RESULT[Verification Result<br/>📋 Authentic/Invalid]
    end
    
    PK --> SIG
    SIG --> META
    META --> IMG
    PK --> PUB
    PUB --> STORE
    IMG --> VERIFY
    STORE --> VERIFY
    VERIFY --> RESULT
    
    classDef secure fill:#ffcdd2,stroke:#d32f2f,stroke-width:3px
    classDef network fill:#e1f5fe,stroke:#1976d2,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class PK,SIG,META secure
    class PUB,IMG network
    class STORE,VERIFY,RESULT backend
```

For a complete technical overview of the verification process, see the [detailed flow diagram](./GeoCam_Verification_Flow_Diagram.md).

## 💻 Technology Stack

### **Mobile Application**
- **Framework**: React Native 0.79.3 with Expo 53.0.11
- **Navigation**: Expo Router 5.1.0 with file-based routing
- **State Management**: React Hooks + Context API with TypeScript
- **Cryptography**: @noble/curves (secp256k1) for secure signatures
- **Device Integration**: expo-location, expo-camera, expo-haptics
- **Storage**: expo-secure-store for keys, AsyncStorage for app data
- **UI/UX**: @expo/vector-icons, react-native-gesture-handler, react-native-safe-area-context
- **Maps & Visualization**: react-native-maps, react-native-svg
- **Theme System**: Custom context-based theme management

### **Backend Services**
- **Python Backend**: Flask + SQLite
- **Node.js Service**: Express + TypeScript
- **Image Processing**: Sharp, Canvas, PNGJS
- **Cryptography**: @noble/curves, @noble/ed25519
- **Database**: SQLite with migrations
- **API Documentation**: RESTful endpoints

### **Web Frontend**
- **Framework**: Vue.js 3.5.13
- **Build Tool**: Vite 6.2.4
- **State Management**: Pinia 3.0.3
- **Routing**: Vue Router 4.5.1
- **HTTP Client**: Axios 1.10.0
- **Visualization**: D3.js 7.9.0

### **DevOps & Deployment**
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **Package Management**: npm/yarn
- **Build Tools**: Expo CLI, TypeScript, Babel

## 🚀 Installation

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Python 3.8+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Docker & Docker Compose (optional)

### **Quick Start with Docker**
```bash
# Clone the repository
git clone https://github.com/whlan02/Desinformation_and_Geomedia_Green
cd geocam-platform

# Start all services
docker-compose up -d

# Access the applications
# Web Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Steganography Service: http://localhost:3001
```

### **Manual Installation**

#### **1. Backend Services**
```bash
# Python Backend
cd Web_Backend
pip install -r requirements.txt
python app.py

# Node.js Steganography Service
npm install
npm run build
npm start
```

#### **2. Web Frontend**
```bash
cd Web_Frontend
npm install
npm run dev
# Access at http://localhost:3000
```

#### **3. Mobile Application**
```bash
cd geoCamApp
npm install

# For iOS
npm run ios

# For Android
npm run android

# For development
npm start
```



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
- **📧 Contact**: geocam-support@university.edu
- **📚 Documentation**: Check the individual component READMEs for detailed guides

### **Project Links**
- **📱 Mobile App**: [GeoCam App Documentation](./geoCamApp/README.md)
- **🌐 Web Frontend**: [Frontend Documentation](./Web_Frontend/README.md)
- **⚙️ Backend Services**: [Backend Documentation](./Web_Backend/README.md)
- **🔍 Verification Flow**: [Complete Verification Flow Diagram](./GeoCam_Verification_Flow_Diagram.md)

### **Research Context**
This project is part of the **Desinformation and Geomedia** research initiative, exploring technological solutions to combat misinformation through verifiable digital media and secure authentication systems.

---

<div align="center">

**[🏠 Main Repository](https://github.com/whlan02/Desinformation_and_Geomedia_Green)** • **[📱 Mobile App](./geoCamApp/)** • **[🌐 Web Frontend](./Web_Frontend/)** • **[⚙️ Backend Services](./Web_Backend/)**

*Built with ❤️ for digital authenticity and truth*

**GeoCam Platform - Securing Digital Media Through Innovation**

</div>

