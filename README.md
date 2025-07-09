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
- [Architecture](#-architecture)
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

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Mobile App (React Native)"
        A[Camera Interface] --> B[Crypto Engine]
        B --> C[GPS Service]
        C --> D[Local Storage]
    end
    
    subgraph "Backend Services"
        E[Python Flask API] --> F[SQLite Database]
        G[Node.js Steganography] --> H[Image Processing]
    end
    
    subgraph "Web Frontend (Vue.js)"
        I[Admin Dashboard] --> J[Verification Portal]
        K[Architecture Viewer] --> L[Statistics]
    end
    
    D --> E
    E --> G
    G --> I
    H --> J
```

## 🔍 Image Verification Flow

The GeoCam platform implements a comprehensive image verification system that ensures authenticity through cryptographic signatures and steganographic metadata embedding. Below is the complete verification flow:

### **Complete Verification Process**

```mermaid
graph TB
    %% User Actions
    A[User Opens Verify Screen] --> B{Image Selected?}
    B -->|No| C[Show Empty State]
    C --> D[User Taps 'Browse Images']
    D --> E[Show Bottom Sheet Modal]
    
    %% Image Selection Options
    E --> F[Phone Gallery Option]
    E --> G[GeoCam Gallery Option]
    
    F --> H[Launch Image Picker]
    G --> I[Navigate to Gallery with Select Mode]
    
    H --> J[User Selects Image]
    I --> K[User Selects from GeoCam Gallery]
    
    J --> L[Set Selected Image URI]
    K --> M[Store URI in AsyncStorage]
    M --> N[Navigate Back to Verify Screen]
    N --> O[Read URI from AsyncStorage]
    O --> L
    
    %% Start Verification Process
    L --> P[Start Verification Process]
    P --> Q[Show Progress Animation]
    P --> R[Convert Image to Base64]
    
    %% Steganography Extraction
    R --> S[Call Steganography Service]
    S --> T[Extract Hidden Metadata]
    T --> U{Metadata Found?}
    
    U -->|Yes| V[Parse Decoded Data]
    U -->|No| W[Set Empty Metadata]
    
    %% Signature Verification Process
    V --> X{Signature & Public Key ID Found?}
    X -->|Yes| Y[Call Secure Backend Service]
    X -->|No| Z[Skip Signature Verification]
    
    Y --> AA[Backend Retrieves Public Key]
    AA --> BB[Verify Signature with Public Key]
    BB --> CC{Signature Valid?}
    
    CC -->|Yes| DD[Mark as Authentic]
    CC -->|No| EE[Mark as Not Authentic]
    
    %% Process Results
    DD --> FF[Combine Results]
    EE --> FF
    Z --> FF
    W --> FF
    
    FF --> GG[Update UI with Results]
    GG --> HH[Show Verification Status]
    HH --> II[Display Metadata Items]
    II --> JJ{Location Data Available?}
    
    JJ -->|Yes| KK[Show Map with Location]
    JJ -->|No| LL[Skip Map Display]
    
    KK --> MM[Show Action Button]
    LL --> MM
    
    %% Key Management (Background Process)
    subgraph "Key Management (Device Only)"
        S1[Private Key Generated on Device]
        S2[Private Key Stored in Secure Store]
        S3[Public Key Derived from Private Key]
        S4[Public Key Sent to Backend]
        S5[Backend Stores Public Key with Device ID]
        
        S1 --> S2
        S1 --> S3
        S3 --> S4
        S4 --> S5
    end
    
    %% Backend Services
    subgraph "Backend Services"
        B1[Steganography Service<br/>Port 3001]
        B2[Secure Backend Service<br/>Port 5001]
        B3[Public Key Storage]
        B4[Signature Verification]
        
        B1 --> B2
        B2 --> B3
        B2 --> B4
    end
    
    %% Connect flows
    S --> B1
    Y --> B2
    AA --> B3
    BB --> B4

    %% Styling
    classDef userAction fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class A,C,D,F,G,H,I,J,K userAction
    class P,Q,R,S,T,V,FF,GG,HH,II,MM process
    class B,U,X,CC,JJ decision
    class S1,S2,S3,S4,S5 security
    class B1,B2,B3,B4 backend
```

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

### **Environment Configuration**

#### **Backend (.env)**
```env
DATABASE_URL=sqlite:///geocam.db
SECRET_KEY=your-secret-key
API_PORT=5000
STEGANOGRAPHY_SERVICE_URL=http://localhost:3001
```

#### **Mobile App (app.json)**
```json
{
  "expo": {
    "name": "GeoCam",
    "slug": "geocam-app",
    "platforms": ["ios", "android"],
    "permissions": [
      "CAMERA",
      "LOCATION",
      "WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

## 📖 Usage

### **Mobile App Workflow**

1. **Initial Setup**
   ```
   Launch App → Key Generation → Device Registration → Ready to Capture
   ```

2. **Taking Secure Photos**
   ```
   Camera Interface → Configure Settings → Use Gesture Controls → Capture Photo → 
   GPS + Metadata → Cryptographic Signing → Steganographic Embedding → Save
   ```

3. **Camera Features**
   ```
   Settings Modal → Grid Lines/Quality/Aspect Ratio → 
   Timer Setup → Focus Gestures → Zoom Controls → Volume Button Capture
   ```

3. **Viewing Gallery**
   ```
   Gallery View → Select Photo → View Detailed Metadata → 
   Verify Authenticity → Check Location Data → Share/Export
   ```

4. **Advanced Verification**
   ```
   Verify Tab → Select/Import Image → Steganographic Analysis → 
   Signature Validation → Device Lookup → Comprehensive Results Display
   ```

### **Web Dashboard**

1. **Admin Access**
   ```
   Navigate to /admin → View Devices → Manage Photos → System Statistics
   ```

2. **Public Verification**
   ```
   Upload Image → Extraction Process → Verification Results → Download Report
   ```

### **API Integration**

#### **Device Registration**
```javascript
POST /api/devices/register
{
  "publicKey": "04a1b2c3...",
  "deviceInfo": {...},
  "fingerprint": "abc123..."
}
```

#### **Photo Upload**
```javascript
POST /api/photos/upload
{
  "image": "base64-encoded-image",
  "metadata": {...},
  "signature": "signature-string"
}
```

#### **Verification**
```javascript
POST /api/verify
{
  "image": "base64-encoded-image"
}
```

## 📚 API Documentation

### **Core Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/devices/register` | Register new device |
| `GET` | `/api/devices` | List registered devices |
| `POST` | `/api/photos/upload` | Upload signed photo |
| `GET` | `/api/photos` | List photos |
| `POST` | `/api/verify` | Verify photo authenticity |
| `GET` | `/api/stats` | System statistics |

### **Authentication**
```javascript
// Device authentication using public key signatures
Headers: {
  'X-Device-ID': 'device-fingerprint',
  'X-Signature': 'request-signature',
  'Content-Type': 'application/json'
}
```

### **Response Format**
```javascript
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully",
  "timestamp": "2025-06-29T10:30:00Z"
}
```

## 🔐 Security Implementation

### **Cryptographic Foundation**
- **Elliptic Curve**: secp256k1 (Bitcoin/Ethereum standard)
- **Key Generation**: Cryptographically secure random generation
- **Signature Algorithm**: ECDSA with SHA-256
- **Key Storage**: Hardware-backed secure enclaves when available

### **Steganography Technique**
```javascript
// Metadata embedding in PNG least significant bits
const embeddedData = {
  signature: "ecdsa-signature",
  location: { lat: 52.520008, lng: 13.404954 },
  timestamp: 1719659400000,
  deviceId: "device-fingerprint",
  hash: "image-hash"
};
```

### **Verification Process**
1. **Steganographic Extraction**: Hidden metadata retrieval
2. **Signature Validation**: ECDSA verification
3. **Device Lookup**: Public key validation
4. **Integrity Check**: Image hash verification
5. **Timestamp Validation**: Chronological verification

### **Security Considerations**
- **Key Rotation**: Periodic key updates
- **Device Revocation**: Compromised device handling
- **Replay Attacks**: Timestamp-based protection
- **Man-in-the-middle**: Certificate pinning
- **Local Storage**: Encrypted secure storage

## 🧪 Testing

### **Mobile App Testing**
```bash
cd geoCamApp
npm test
npm run test:e2e
```

### **Backend Testing**
```bash
cd Web_Backend
python -m pytest tests/
npm run test  # Node.js service
```

### **Integration Testing**
```bash
# Full system test
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

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

## 🆕 Latest Updates & Enhancements

### **Mobile App Improvements** 📱
- **Enhanced Camera Interface**: Complete redesign with modern, theme-aware UI components
- **Advanced Gesture Controls**: Pinch-to-zoom, tap-to-focus, and double-tap zoom reset
- **Haptic Feedback Integration**: Tactile responses for all camera controls and interactions
- **Settings Modal**: In-app camera configuration (grid lines, quality, aspect ratio)
- **Visual Feedback**: Smooth animations for focus indicators, capture effects, and state changes
- **Theme Consistency**: All UI elements now follow the selected theme throughout the app

### **User Experience Enhancements** ✨
- **Improved Accessibility**: Better contrast ratios, touch targets, and navigation
- **Performance Optimization**: Reduced memory usage and faster loading times
- **Error Handling**: Enhanced error messages and graceful failure recovery
- **Gesture Navigation**: Intuitive touch interactions for professional camera controls

### **Technical Improvements** ⚡
- **TypeScript Coverage**: Enhanced type safety across all components
- **Code Organization**: Improved project structure and component modularity
- **Safe Area Handling**: Proper support for device notches and home indicators
- **Gesture Handler Integration**: Native gesture recognition for smooth interactions

### **Security & Verification Enhancements** 🔐
- **Complete Verification Flow**: Comprehensive image authenticity verification system
- **Cryptographic Security**: Private keys never leave device, only public keys transmitted
- **Steganographic Analysis**: Advanced metadata extraction and validation
- **Signature Verification**: Backend cryptographic validation using stored public keys
- **Security Architecture**: Multi-layered security with device isolation and secure storage
- **Detailed Flow Documentation**: Complete technical diagrams and security explanations

## 🔧 Key Management & Verification Libraries

### **Mobile App Libraries for Secure Key Management**

#### **1. @noble/curves v1.9.2**
- **Purpose**: Production-grade secp256k1 elliptic curve cryptography
- **Implementation**: Pure JavaScript implementation with security focus
- **Key Features**:
  - Secure random key generation: `secp256k1.utils.randomPrivateKey()`
  - Public key derivation: `secp256k1.getPublicKey(privateKey)`
  - Digital signature creation: `secp256k1.sign(hash, privateKey)`
  - No native dependencies, fully auditable JavaScript code

```javascript
// Key generation implementation
const privateKeyBytes = secp256k1.utils.randomPrivateKey();
const publicKeyPoint = secp256k1.getPublicKey(privateKeyBytes);
const signature = secp256k1.sign(imageHash, privateKeyBytes);
```

#### **2. expo-secure-store v14.2.3**
- **Purpose**: Hardware-backed secure key storage
- **Implementation**: Uses iOS Keychain and Android Keystore
- **Security Features**:
  - Hardware security module (HSM) integration when available
  - Biometric authentication support
  - Keychain services isolation
  - Encrypted storage with device-specific keys

```javascript
// Secure storage configuration
const SECURE_STORE_OPTIONS = {
  requireAuthentication: false, // Can be enabled for biometric auth
  authenticationPrompt: 'Authenticate to access GeoCam keys',
  keychainService: 'com.geocam.secure.keychain',
  showModal: true,
  cancelable: false,
};
```

#### **3. expo-crypto v13.1.0**
- **Purpose**: Cryptographic hash functions and secure random generation
- **Implementation**: Native crypto operations
- **Key Features**:
  - SHA-256/SHA-512 hashing: `Crypto.digestStringAsync()`
  - Secure random bytes: `Crypto.getRandomBytesAsync()`
  - Device fingerprint generation using hardware characteristics

```javascript
// Device fingerprint generation
const fingerprint = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  deviceInfo,
  { encoding: Crypto.CryptoEncoding.HEX }
);
```

### **Backend Libraries for Signature Verification**

#### **1. coincurve v19.0.1**
- **Purpose**: Production-grade secp256k1 verification library
- **Implementation**: Python bindings to libsecp256k1 (Bitcoin Core library)
- **Security Features**:
  - Constant-time operations to prevent timing attacks
  - Comprehensive signature verification
  - Memory-safe operations
  - Industry-standard cryptographic implementation

```python
# Signature verification implementation
public_key = coincurve.PublicKey(public_key_bytes)
signature_verified = public_key.verify(signature_bytes, hash_bytes, hasher=None)
```

#### **2. cryptography v41.0.7**
- **Purpose**: Fallback cryptographic operations and certificate handling
- **Implementation**: Python cryptographic toolkit
- **Features**:
  - Hash function implementations
  - Key format conversions
  - Certificate and key serialization

#### **3. hashlib (Python Standard Library)**
- **Purpose**: SHA-512 image hashing for signature verification
- **Implementation**: Built-in Python cryptographic hashing
- **Usage**: `hashlib.sha512(image_data).hexdigest()`

### **Implementation Architecture**

#### **Mobile App Security Implementation**
```typescript
// Private key generation (never transmitted)
export const generateSecureKeyPair = async (): Promise<SecureKeyPair> => {
  const privateKeyBytes = secp256k1.utils.randomPrivateKey();
  const publicKeyPoint = secp256k1.getPublicKey(privateKeyBytes);
  
  // Store private key securely on device
  await SecureStore.setItemAsync(
    PRIVATE_KEY_STORAGE_KEY,
    JSON.stringify({
      keyId,
      keyBase64: privateKeyBase64,
      algorithm: 'secp256k1',
      generatedAt,
      deviceFingerprint
    }),
    SECURE_STORE_OPTIONS
  );
  
  return { privateKey, publicKey, metadata };
};

// Image signing (private key never leaves device)
export const signImageDataSecurely = async (imageData: string, metadata: any) => {
  const privateKeyData = JSON.parse(await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY));
  const imageDataHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    imageData,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  
  const signature = secp256k1.sign(hashBytes, privateKeyBytes);
  return { signature, publicKeyId, timestamp, metadata };
};
```

#### **Backend Verification Implementation**
```python
def verify_secp256k1_signature(signature_base64: str, data_hash: str, public_key_base64: str) -> dict:
    """Secure signature verification using coincurve library"""
    
    # Multi-layer security checks
    verification_result = {
        'valid': False,
        'security_checks': {
            'signature_format': False,
            'public_key_format': False,
            'hash_format': False,
            'signature_verified': False
        }
    }
    
    # 1. Validate signature format (64 bytes for secp256k1)
    signature_bytes = base64.b64decode(signature_base64)
    if len(signature_bytes) != 64:
        return verification_result
    
    # 2. Validate public key format (33 bytes compressed)
    public_key_bytes = base64.b64decode(public_key_base64)
    if len(public_key_bytes) != 33 or public_key_bytes[0] not in [0x02, 0x03]:
        return verification_result
    
    # 3. Cryptographic verification using coincurve
    try:
        public_key = coincurve.PublicKey(public_key_bytes)
        hash_bytes = bytes.fromhex(data_hash)
        signature_verified = public_key.verify(signature_bytes, hash_bytes, hasher=None)
        
        verification_result['valid'] = signature_verified
        verification_result['security_checks']['signature_verified'] = signature_verified
        
    except Exception as e:
        verification_result['error'] = f'Cryptographic verification failed: {str(e)}'
    
    return verification_result
```

### **Security Guarantees**

#### **Private Key Protection**
1. **Never Transmitted**: Private keys remain on the device at all times
2. **Hardware Security**: Stored in iOS Keychain/Android Keystore with hardware backing
3. **Encrypted Storage**: Device-specific encryption keys protect stored data
4. **Biometric Protection**: Optional biometric authentication for key access

#### **Public Key Infrastructure**
1. **Secure Transmission**: Only public keys are sent to the backend
2. **Database Storage**: Public keys stored in SQLite with device registration
3. **Key Rotation**: Support for key updates and device re-registration
4. **Device Revocation**: Ability to deactivate compromised devices

#### **Signature Verification**
1. **Production-Grade Crypto**: Uses libsecp256k1 (Bitcoin Core library)
2. **Constant-Time Operations**: Prevents timing-based attacks
3. **Comprehensive Validation**: Multi-layer security checks before verification
4. **Audit Trail**: Complete logging of verification attempts

### **Implementation Success Factors**

#### **Mobile App**
- **@noble/curves**: Provides secure, auditable secp256k1 implementation
- **expo-secure-store**: Ensures private keys never leave secure hardware
- **expo-crypto**: Provides cryptographic primitives for hashing and random generation
- **Device Fingerprinting**: Creates unique device identifiers for registration

#### **Backend**
- **coincurve**: Production-grade signature verification with libsecp256k1
- **Security Checks**: Multi-layer validation before cryptographic operations
- **Audit Logging**: Complete tracking of all verification attempts
- **Rate Limiting**: Protection against abuse and replay attacks

This implementation ensures that private keys remain secure on the device while enabling robust image authenticity verification through public key cryptography.
