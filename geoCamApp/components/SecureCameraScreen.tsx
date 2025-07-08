import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { 
  generateSecureKeyPair,
  signImageDataSecurely,
  hasSecureKeys,
  getKeyMetadata
} from '../utils/secureKeyManager';
import { 
  registerDeviceSecure, 
  checkBackendHealthSecure 
} from '../utils/secureBackendService';

/**
 * Secure Camera Component
 * Uses enhanced security model where private keys never leave device
 */
export default function SecureCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [mediaPermission, setMediaPermission] = useState<boolean>(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [keysInitialized, setKeysInitialized] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [keyMetadata, setKeyMetadata] = useState<any>(null);
  
  const cameraRef = useRef<CameraView>(null);

  // Initialize secure keys and permissions on component mount
  useEffect(() => {
    initializeSecureCamera();
  }, []);

  const initializeSecureCamera = async () => {
    try {
      console.log('🔐 Initializing secure camera...');

      // Check backend health
      const healthy = await checkBackendHealthSecure();
      setBackendHealthy(healthy);

      // Request permissions
      await requestAllPermissions();

      // Initialize secure keys
      const hasKeys = await hasSecureKeys();
      let keyResult = { success: hasKeys, message: '' };
      
      if (!hasKeys) {
        // Generate new keys if they don't exist
        try {
          await generateSecureKeyPair();
          keyResult = { success: true, message: 'Keys generated successfully' };
        } catch (error) {
          keyResult = { 
            success: false, 
            message: error instanceof Error ? error.message : 'Key generation failed' 
          };
        }
      }
      
      if (keyResult.success) {
        setKeysInitialized(true);
        
        // Get key metadata
        const metadata = await getKeyMetadata();
        setKeyMetadata(metadata);
        
        // Register device if keys are initialized
        if (healthy) {
          await registerDeviceIfNeeded();
        }
      } else {
        Alert.alert('Security Error', keyResult.message);
      }

    } catch (error) {
      console.error('❌ Failed to initialize secure camera:', error);
      Alert.alert('Initialization Error', 'Failed to initialize secure camera');
    }
  };

  const requestAllPermissions = async () => {
    try {
      // Camera permission
      if (!permission?.granted) {
        const cameraResult = await requestPermission();
        if (!cameraResult.granted) {
          Alert.alert('Permission Required', 'Camera access is required for GeoCam');
          return;
        }
      }

      // Location permission
      const locationResult = await Location.requestForegroundPermissionsAsync();
      if (locationResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for geo-verification');
        return;
      }
      setLocationPermission(true);

      // Media library permission
      const mediaResult = await MediaLibrary.requestPermissionsAsync();
      if (mediaResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Media library access is required to save photos');
        return;
      }
      setMediaPermission(true);

    } catch (error) {
      console.error('❌ Permission request failed:', error);
    }
  };

  const registerDeviceIfNeeded = async () => {
    try {
      console.log('📱 Checking device registration...');
      
      const registrationResult = await registerDeviceSecure();
      if (registrationResult.success) {
        setDeviceRegistered(true);
        console.log('✅ Device registered successfully');
      } else {
        console.warn('⚠️ Device registration failed:', registrationResult.message);
        Alert.alert('Registration Warning', registrationResult.message);
      }
    } catch (error) {
      console.error('❌ Device registration error:', error);
    }
  };

  const captureSecurePhoto = async () => {
    if (!cameraRef.current || isCapturing || !keysInitialized) return;

    setIsCapturing(true);

    try {
      console.log('📸 Capturing secure photo...');

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: true,
        skipProcessing: false,
      });

      if (!photo.base64) {
        throw new Error('Failed to capture photo data');
      }

      // Get current location
      let locationData = null;
      if (locationPermission) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            timestamp: location.timestamp,
          };
        } catch (locationError) {
          console.warn('⚠️ Failed to get location:', locationError);
        }
      }

      // Prepare metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        location: locationData,
        captureSettings: {
          quality: 0.8,
          facing: facing,
        },
        device: {
          model: keyMetadata?.deviceModel || 'unknown',
          os: keyMetadata?.osName || 'unknown',
          version: keyMetadata?.osVersion || 'unknown',
        },
        security: {
          keyId: keyMetadata?.keyId || 'unknown',
          fingerprint: keyMetadata?.fingerprint || 'unknown',
          securityLevel: keyMetadata?.securityLevel || 'unknown',
        }
      };

      console.log('📝 Prepared metadata:', metadata);

      // Sign image securely (private key never leaves device)
      const signedData = await signImageDataSecurely(photo.base64, metadata);
      
      console.log('✅ Image signed successfully');
      console.log('🔐 Signature created with key:', signedData.publicKeyId);

      // Save signed image
      await saveSignedImage(photo.base64, signedData);

      Alert.alert('Success', 'Secure photo captured and signed successfully!');

    } catch (error) {
      console.error('❌ Failed to capture secure photo:', error);
      Alert.alert('Capture Error', `Failed to capture secure photo: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const saveSignedImage = async (imageBase64: string, signedData: any) => {
    try {
      console.log('💾 Saving signed image...');

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `geocam-secure-${timestamp}.jpg`;
      const filePath = FileSystem.documentDirectory + filename;

      // Save image file
      await FileSystem.writeAsStringAsync(filePath, imageBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to media library
      if (mediaPermission) {
        await MediaLibrary.saveToLibraryAsync(filePath);
      }

      // Save signature and metadata separately
      const signatureData = {
        signature: signedData.signature,
        publicKeyId: signedData.publicKeyId,
        timestamp: signedData.timestamp,
        metadata: signedData.metadata,
        imageFile: filename,
      };

      const signatureFilePath = FileSystem.documentDirectory + `${filename}.signature.json`;
      await FileSystem.writeAsStringAsync(signatureFilePath, JSON.stringify(signatureData, null, 2));

      console.log('✅ Signed image saved successfully');
      console.log('📁 Image file:', filePath);
      console.log('📁 Signature file:', signatureFilePath);

    } catch (error) {
      console.error('❌ Failed to save signed image:', error);
      throw error;
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is required for GeoCam</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.overlay}>
          {/* Status indicators */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusItem, { backgroundColor: keysInitialized ? '#4CAF50' : '#FF9800' }]}>
              <Ionicons name="key" size={16} color="white" />
              <Text style={styles.statusText}>Keys</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: deviceRegistered ? '#4CAF50' : '#FF9800' }]}>
              <Ionicons name="shield-checkmark" size={16} color="white" />
              <Text style={styles.statusText}>Registered</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: backendHealthy ? '#4CAF50' : '#FF5722' }]}>
              <Ionicons name="server" size={16} color="white" />
              <Text style={styles.statusText}>Backend</Text>
            </View>
          </View>

          {/* Camera controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={captureSecurePhoto}
              disabled={isCapturing || !keysInitialized}
            >
              <Ionicons 
                name={isCapturing ? "hourglass" : "camera"} 
                size={32} 
                color="white" 
              />
            </TouchableOpacity>

            <View style={styles.controlButton}>
              {/* Placeholder for future controls */}
            </View>
          </View>

          {/* Security info */}
          {keyMetadata && (
            <View style={styles.securityInfo}>
              <Text style={styles.securityText}>🔑 Key: {keyMetadata.fingerprint}</Text>
              <Text style={styles.securityText}>🔐 Security: {keyMetadata.securityLevel}</Text>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 50,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    backgroundColor: '#999',
  },
  securityInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  securityText: {
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
