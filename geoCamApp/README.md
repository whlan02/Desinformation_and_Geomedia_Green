# Geo Cam

Welcome to the Camera App repository! This is a React Native mobile application built with Expo that allows users to capture, manage, and geotag photos. The app is written in TypeScript and provides a seamless camera experience with location tracking function.

## Features

- 📸 Photo capture using device camera
- 📱 Image picker from device gallery
- 📍 Location tracking and geotagging
- 💾 Local storage for captured images
- 🔒 Permission handling for camera and location
- 📱 Cross-platform support (iOS and Android)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js 18.0.0 or higher
- Expo CLI installed globally:
  ```bash
  npm install -g expo-cli
  ```
- A mobile device with Expo Go installed ([iOS App Store](https://apps.apple.com/app/expo-go/id982107779) | [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Android: an Android device with USB debugging enabled and the Android SDK path set in `android/local.properties`
- iOS: macOS with Xcode installed and a valid provisioning profile or Apple Developer account (or use the iOS simulator)


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/camera-app.git
   ```

2. Navigate to the project directory:
   ```bash
   cd camera-app
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```


## Required Permissions

The app requires the following permissions:
- Camera access
- Photo library access
- Location services
- Storage access

These will be requested automatically when needed.

## Development（testing）

1. Change into the project directory:
   ```bash
   cd Desinformation_and_Geomedia_Green/geoCamApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Classic Expo Go) Start Metro and launch in Expo Go:
   ```bash
   npm run start  # or expo start
   ```
   - In the Expo CLI UI, under "Connected Devices", click "Run on Android device/emulator" or "Run on iOS simulator"
   - Or open Expo Go on your phone and scan the "Expo Go" QR code

4. (Custom Dev Client) Build & install the development client on your device:
   ```bash
   npm run android  # builds and installs dev client on Android
   npm run ios      # builds and installs dev client on iOS
   ```
   - After installation, scan the "Dev Client" QR code in the Expo CLI UI to launch the app

5. Connect a physical device:
   - Android: enable USB debugging and connect with USB (or via `adb connect <ip>`)
   - iOS: open the workspace in Xcode and select your device as the run destination, or enable network debugging





