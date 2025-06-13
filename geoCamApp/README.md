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

1. Start the development server:

 under a same wifi
   ```bash
   npx expo start
   ```
not under a same wifi
   ```bash
   npx expo start --tunnel
   ```

2. Use Expo Go(your physical device):
   - Download and open the Expo Go app on your mobile device
   - Scan the QR code with your mobile device's camera





