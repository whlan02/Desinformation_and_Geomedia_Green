# GeoCam Mobile App 📱

<div align="center">

![GeoCam Logo](./assets/icon.png)

**Secure Geo-Verified Photography for Mobile Devices**

[![React Native](https://img.shields.io/badge/React%20Native-0.79.3-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.11-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*Part of the Desinformation and Geomedia Research Project*

[🔗 **Main Repository**](https://github.com/whlan02/Desinformation_and_Geomedia_Green) • [📱 **Live Demo**](#demo) • [📚 **Documentation**](#documentation)

</div>

---

## 🎯 Overview

GeoCam is a revolutionary mobile application that captures cryptographically signed, location-verified photographs to combat digital disinformation. Built with React Native and Expo, it provides journalists, researchers, and citizens with tools to create tamper-evident visual evidence.

### **Core Security Features**
- **Cryptographic Signatures**: secp256k1 elliptic curve digital signatures with secure key generation
- **Location Verification**: High-accuracy GPS-anchored, tamper-evident location data
- **Device Authentication**: Unique device fingerprinting and secure backend registration
- **Steganographic Embedding**: Advanced metadata embedding within image data using pure PNG format
- **Offline Capability**: Full security operation without internet connectivity
- **Pure PNG Workflow**: Innovative single-canvas steganography for maximum compatibility

## ✨ Features

### 📸 **Photography & Capture**
- Modern theme-aware camera interface with dark/light mode support
- Advanced gesture controls (pinch-to-zoom, tap-to-focus, double-tap zoom reset)
- Real-time GPS coordinate embedding with high accuracy
- Automatic timestamp generation with device metadata
- High-resolution photo capture with quality settings
- Timer functionality (3s, 10s) with haptic feedback
- Grid lines overlay for composition assistance
- Focus indicator with smooth animations
- Volume button capture support

### 🔒 **Security & Verification**
- Device-specific cryptographic key generation
- ECDSA signature creation and validation
- Secure key storage (Keychain/Keystore)
- Image integrity verification
- Tamper detection algorithms

### 🗂️ **Gallery & Management**
- Organized photo library with metadata
- Search and filter capabilities
- Export and sharing functionality
- Detailed EXIF data viewing
- Verification status indicators

### 🌍 **Location & Mapping**
- Precise GPS coordinate capture
- Interactive map visualization
- Location history tracking
- Offline map caching
- Geographic search functionality

### 🎨 **User Experience**
- Comprehensive dark/light theme support with dynamic color adaptation
- Theme-aware UI components throughout the application
- Responsive design optimized for all screen sizes and orientations
- Smooth animations and haptic feedback for enhanced interaction
- Modern gesture-based navigation and controls
- Accessibility features with proper contrast and touch targets
- Intuitive settings modal for camera configuration
- Real-time visual feedback for user actions
- Seamless navigation with Expo Router file-based routing

## 🆕 Recent Updates & Features

### **Enhanced Camera Interface** ✨
- **Modern UI Design**: Completely redesigned camera interface with theme-aware components
- **Advanced Gesture Support**: Comprehensive touch interactions for professional photography
- **Settings Modal**: In-app configuration for camera settings without leaving the capture flow
- **Haptic Feedback**: Tactile responses for all major interactions and controls
- **Visual Feedback**: Smooth animations for focus, capture, and UI state changes

### **Improved User Experience** 🎯
- **Theme Consistency**: All UI elements now follow the selected theme (light/dark)
- **Enhanced Accessibility**: Better contrast ratios and touch targets for all users
- **Performance Optimization**: Reduced memory usage and faster loading times
- **Error Handling**: Improved error messages and recovery mechanisms

### **Technical Improvements** ⚡
- **Gesture Handler Integration**: Native gesture recognition for smooth interactions
- **Safe Area Support**: Proper handling of device notches and home indicators
- **TypeScript Coverage**: Enhanced type safety throughout the application
- **Code Organization**: Improved project structure and component modularity

## �️ Technology Stack

### **Core Framework**
- **React Native**: 0.79.3 - Cross-platform mobile development
- **Expo**: 53.0.11 - Development and build platform
- **TypeScript**: 5.8.3 - Type-safe development
- **Expo Router**: 5.1.0 - File-based navigation

### **Security & Cryptography**
- **@noble/curves**: secp256k1 elliptic curve operations
- **expo-crypto**: Cryptographic utilities
- **expo-secure-store**: Secure key storage
- **react-native-get-random-values**: Cryptographically secure randomness

### **Device Integration**
- **expo-camera**: Camera functionality
- **expo-location**: GPS and location services
- **expo-device**: Device information
- **expo-media-library**: Photo library access
- **expo-file-system**: File system operations

### **UI & User Experience**
- **@expo/vector-icons**: Comprehensive icon library
- **react-native-svg**: Scalable vector graphics
- **react-native-maps**: Interactive mapping functionality
- **expo-linear-gradient**: Modern gradient effects
- **react-native-gesture-handler**: Advanced gesture recognition
- **expo-haptics**: Tactile feedback integration
- **react-native-safe-area-context**: Safe area handling

## 🚀 Installation & Setup

### **Prerequisites**

Ensure you have the following installed:

- **Node.js**: 18.0.0 or higher
- **npm** or **yarn**: Latest version
- **Expo CLI**: Global installation required
- **Git**: For version control

```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Verify installation
expo --version
```

### **Mobile Development Environment**

For **Android**:
- Android Studio with SDK Platform 33+
- Android Virtual Device (AVD) or physical device

For **iOS** (macOS only):
- Xcode 14+
- iOS Simulator or physical device
- Apple Developer account (for device testing)

### **Quick Start**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/whlan02/Desinformation_and_Geomedia_Green.git
   cd Desinformation_and_Geomedia_Green/geoCamApp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start Development Server**
   ```bash
   # Local network (same WiFi)
   npm start
   
   # Or with tunnel (different networks)
   npm start -- --tunnel
   ```

4. **Run on Device/Simulator**
   ```bash
   # iOS Simulator (macOS only)
   npm run ios
   
   # Android Emulator/Device
   npm run android
   
   # Web (for testing)
   npm run web
   ```

## 📱 Development & Testing

### **Development Commands**

```bash
# Start Metro bundler
npm start

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Lint code
npx eslint . --ext .ts,.tsx

# Format code
npx prettier --write .
```

### **Testing on Physical Devices**

#### **Using Expo Go App**
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Scan QR code from terminal/browser
3. App loads directly on your device

#### **Development Builds**
```bash
# Create development build
npx expo run:ios --device
npx expo run:android --device
```

### **Debugging Tools**

- **React Native Debugger**: Advanced debugging
- **Flipper**: Mobile app debugging platform
- **Expo DevTools**: Built-in debugging tools
- **Chrome DevTools**: Remote debugging

## 🔐 Security Configuration

### **Key Generation**
The app automatically generates unique secp256k1 key pairs on first launch:

```typescript
// Automatic key generation and secure storage
const keyPair = await generateSecp256k1KeyPair();
await storeSecp256k1KeyPair(
  keyPair.privateKey, 
  keyPair.publicKey, 
  keyPair.fingerprint
);
```

### **Device Registration**
Devices are registered with the backend service:

```typescript
// Device registration with backend
const registrationResult = await ensureDeviceRegistration();
```

### **Required Permissions**

The app requires the following device permissions:

| Permission | Purpose | Platform |
|------------|---------|----------|
| `CAMERA` | Photo capture | iOS/Android |
| `ACCESS_FINE_LOCATION` | GPS coordinates | Android |
| `ACCESS_COARSE_LOCATION` | Approximate location | Android |
| `WRITE_EXTERNAL_STORAGE` | Photo storage | Android |
| `READ_EXTERNAL_STORAGE` | Gallery access | Android |
| `NSCameraUsageDescription` | Camera access | iOS |
| `NSLocationWhenInUseUsageDescription` | Location access | iOS |
| `NSPhotoLibraryUsageDescription` | Photo library | iOS |

## 📖 Usage Guide

### **First Launch**
1. **Permission Requests**: Grant camera and location permissions
2. **Key Generation**: Automatic cryptographic key creation
3. **Device Registration**: Secure device onboarding
4. **Ready to Capture**: Start taking secure photos

### **Taking Secure Photos**
1. Open the **Camera** tab
2. **Adjust Settings**: Tap the settings icon to configure:
   - Grid lines for composition
   - Image quality (Standard/High)
   - Aspect ratio (16:9, 4:3, 1:1)
3. **Use Gesture Controls**:
   - Pinch to zoom in/out
   - Tap to focus on specific areas
   - Double-tap to reset zoom
4. **Set Timer** (optional): Choose 3s or 10s delay
5. **Capture**: Tap the capture button or use volume buttons
6. GPS coordinates and device metadata are automatically embedded
7. Photo is cryptographically signed and securely stored

### **Viewing Gallery**
1. Navigate to **Gallery** tab
2. Browse captured photos
3. Tap any photo for detailed view
4. View metadata, location, and verification status

### **Verifying Photos**
1. Go to **Verify** tab
2. Select photo from gallery or import external image
3. View verification results and authenticity status

### **Device Information**
1. Access **Device Info** tab
2. View device registration status
3. See cryptographic key information
4. Check system security details

## 🏗️ Project Structure

```
geoCamApp/
├── app/                          # App screens (Expo Router)
│   ├── (tabs)/                   # Tab navigation
│   ├── camera.tsx               # Camera interface
│   ├── gallery.tsx              # Photo gallery
│   ├── image-detail.tsx         # Photo details
│   ├── index.tsx                # Main menu
│   ├── security-info.tsx        # Device info
│   └── verify.tsx               # Verification
├── assets/                       # Static assets
│   ├── images/                  # App images
│   └── icons/                   # Icon files
├── components/                   # Reusable UI components
│   ├── CircularProgress.tsx     # Animated progress indicator
│   └── [Additional components]  # Theme-aware UI elements
├── contexts/                     # React contexts
│   └── ThemeContext.tsx         # Comprehensive theme management
├── utils/                        # Utility functions
│   ├── backendConfig.ts         # API configuration
│   ├── backendService.ts        # API services
│   ├── deviceSecurityInfo.ts    # Device info
│   ├── galleryStorage.ts        # Local storage
│   └── secp256k1Utils.ts        # Cryptography
├── android/                      # Android-specific files
├── ios/                          # iOS-specific files
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

## 🔗 Integration

### **Backend Services**
The app integrates with companion services:

- **Python Flask API**: Device registration and photo management
- **Node.js Steganography Service**: Metadata embedding and extraction
- **Web Dashboard**: Administrative interface

### **API Endpoints**
```typescript
// Device registration
POST /api/devices/register

// Photo upload
POST /api/photos/upload

// Photo verification
POST /api/verify

// Device status
GET /api/devices/{deviceId}
```

## 🚢 Deployment

### **Production Builds**

#### **Android APK**
```bash
# Build Android APK
npx expo build:android --type apk

# Or using EAS Build
npx eas build --platform android
```

#### **iOS App**
```bash
# Build iOS app (requires macOS)
npx expo build:ios

# Or using EAS Build
npx eas build --platform ios
```

### **App Store Deployment**
```bash
# Submit to app stores
npx eas submit --platform ios
npx eas submit --platform android
```

## 🧪 Testing

### **Unit Tests**
```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

### **E2E Testing**
```bash
# Install Detox (iOS/Android E2E testing)
npm install -g detox-cli

# Run E2E tests
detox test
```

### **Performance Testing**
- Use React Native Performance Monitor
- Profile with Flipper
- Monitor memory usage and frame rates

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### **Code Style**
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add JSDoc comments for functions
- Follow React Native conventions

### **Testing Requirements**
- Unit tests for utility functions
- Component tests for UI elements
- Integration tests for API calls
- E2E tests for critical user flows

## 🐛 Troubleshooting

### **Common Issues**

#### **Metro Bundler Issues**
```bash
# Clear Metro cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache
```

#### **Dependency Conflicts**
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Or with yarn
yarn install --force
```

#### **iOS Build Issues**
```bash
# Clear iOS build cache
cd ios && xcodebuild clean && cd ..

# Reset iOS simulator
npx expo run:ios --simulator --clear-cache
```

#### **Android Build Issues**
```bash
# Clear Android build cache
cd android && ./gradlew clean && cd ..

# Reset Android build
npx expo run:android --clear-cache
```

### **Permission Issues**
- Ensure all required permissions are granted
- Check device settings for app permissions
- Restart app after granting permissions

## 📚 Documentation

### **Additional Resources**
- [📖 API Documentation](../Web_Backend/README.md)
- [🌐 Web Frontend](../Web_Frontend/README.md)
- [🏗️ Architecture Overview](../README.md)
- [🔒 Security Implementation](../docs/security.md)

### **External References**
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 👥 Support & Community

### **Getting Help**
- 🐛 [Report Issues](https://github.com/whlan02/Desinformation_and_Geomedia_Green/issues)
- 💬 [GitHub Discussions](https://github.com/whlan02/Desinformation_and_Geomedia_Green/discussions)
- 📧 [Contact Team](mailto:team@geocam.app)

### **Research Context**
This application is part of the **Desinformation and Geomedia** research project, exploring technological solutions to combat misinformation through verifiable digital media.

---

<div align="center">

**[🏠 Main Repository](https://github.com/whlan02/Desinformation_and_Geomedia_Green)** • **[📱 Mobile App](.)** • **[🌐 Web Frontend](../Web_Frontend)** • **[⚙️ Backend](../Web_Backend)**

*Built with ❤️ for digital authenticity and truth*

</div>





