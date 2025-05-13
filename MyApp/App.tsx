import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraPermissionStatus,
} from 'react-native-vision-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();             
  const device = devices.back;                    

  // 1) Splash-Timer: nach 3s zum Kamera-Screen wechseln
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // 2) Berechtigungen anfragen
  useEffect(() => {
    const setupPermissions = async () => {
      // 2a) Android Runtime-Permission
      if (Platform.OS === 'android') {
        const camPerm = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (camPerm !== PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(false);
          return;
        }
      }
      // 2b) Vision-Camera Permission-API
      //   erst Status auslesen, dann nur bei Bedarf neu anfragen
      let status: CameraPermissionStatus = await Camera.getCameraPermissionStatus();
      if (status !== 'authorized') {
        status = await Camera.requestCameraPermission();
      }
      setHasPermission(status === 'authorized');
    };

    setupPermissions();
  }, []);

  // 3) Render-Logik
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
      </View>
    );
  }

  if (!device || !hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Keine Kamera gefunden oder Berechtigung verweigert.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      <TouchableOpacity
        style={styles.shutterButton}
        onPress={() => console.log('Shutter gedrückt')}
      >
        <View style={styles.innerCircle} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  shutterButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
  },
});
