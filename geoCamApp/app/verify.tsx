import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Dimensions, Modal, Animated, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { verifyImagePurePng } from '../utils/backendService';
import { getGalleryImages} from '../utils/galleryStorage';
import CircularProgress from '../components/CircularProgress';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = 150;
const BOTTOM_SHEET_HEIGHT = 200;

export default function Verify() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [signatureVerification, setSignatureVerification] = useState<{valid: boolean, message: string} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [accelerateProgress, setAccelerateProgress] = useState(false);
  
  // Start fake progress animation
  const startFakeProgress = (durationMs: number) => {
    setProgress(0);
    setAccelerateProgress(false);
    const intervalMs = 100; // Update every 100ms
    const increment = 100 / (durationMs / intervalMs);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 100;
        }
        return newProgress;
      });
    }, intervalMs);
  };
  
  // Complete progress with acceleration
  const completeProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setAccelerateProgress(true);
    setProgress(100);
    setTimeout(() => {
      setProgress(0);
      setAccelerateProgress(false);
    }, 500);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  const bottomSheetY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  // Check for selected image from gallery when screen is focused
  useFocusEffect(
    useCallback(() => {
      const checkSelectedImage = async () => {
        try {
          const uri = await AsyncStorage.getItem('selectedUriForVerify');
          if (uri) {
            await AsyncStorage.removeItem('selectedUriForVerify');
            setSelectedImage(uri);
            verifyImage(uri);
          }
        } catch (e) {
          console.error('Failed to get selected URI', e);
        }
      };
      checkSelectedImage();
    }, [])
  );

  const showBottomSheetModal = () => {
    setShowBottomSheet(true);
    Animated.timing(bottomSheetY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideBottomSheetModal = (callback?: () => void) => {
    Animated.timing(bottomSheetY, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
      if (callback) {
        callback();
      }
    });
  };

  const resetState = () => {
    setSelectedImage(null);
    setDecodedInfo(null);
    setErrorText(null);
    setSignatureVerification(null);
    setLocation(null);
    setProgress(0);
  };

  const verifyImage = async (uri: string) => {
    setIsVerifying(true);
    setErrorText(null);
    setSignatureVerification(null);
    setDecodedInfo(null);
    setLocation(null);
    
    startFakeProgress(6500); // 6.5 seconds fake progress

    try {
      console.log('🔍 Startingverification for image:', uri);
      
      // Read the original file directly
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('📄 Image converted to base64, length:', base64Data.length);
      
      // Verify the image
      const verificationResult = await verifyImagePurePng(base64Data);
      
      console.log('📥 Backend verification result:', verificationResult);
      
      if (verificationResult.success) {
        if (verificationResult.verification_result?.decoded_data) {
          const decodedData = verificationResult.verification_result.decoded_data;
          let formattedString = '';
          
          // Handle device information first
          if (decodedData.geocamDevice && decodedData.deviceModel) {
            formattedString += `Device: ${decodedData.geocamDevice} (${decodedData.deviceModel})\n`;
          } else if (decodedData.geocamDevice) {
            formattedString += `Device: ${decodedData.geocamDevice}\n`;
          } else if (decodedData.deviceModel) {
            formattedString += `Device: ${decodedData.deviceModel}\n`;
          }

          for (const key in decodedData) {
            if (decodedData.hasOwnProperty(key)) {
              if (key === 'location' && decodedData[key]) {
                setLocation(decodedData[key]); // Set location for map
                formattedString += `Location:\nLat: ${decodedData[key].latitude}\nLon: ${decodedData[key].longitude}\n`;
              } else if (key === 'deviceModel' || key === 'geocamDevice') {
                // Skip these keys as they were handled before
                continue;
              } else {
                formattedString += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${decodedData[key]}\n`;
              }
            }
          }
          
          setDecodedInfo(formattedString.trim());
        } else {
          setDecodedInfo('No hidden information found in the image');
        }
        
        setSignatureVerification({
          valid: verificationResult.verification_result?.signature_valid || false,
          message: verificationResult.message || 'Verification completed'
        });
        
        completeProgress();
      } else {
        // Silently handle verification failure
        setErrorText('Image verification failed. Please make sure the image was taken with GeoCam.');
        setSignatureVerification({
          valid: false,
          message: 'Verification failed'
        });
      }
    } catch (error) {
      // Silently handle error without logging
      setErrorText('Unable to verify this image. Please try with a different image or try again later.');
      setSignatureVerification({
        valid: false,
        message: 'Verification failed'
      });
      completeProgress();
    } finally {
      setIsVerifying(false);
    }
  };

  const pickFromPhone = () => {
    hideBottomSheetModal(() => {
      // 添加延迟确保Modal完全关闭
      setTimeout(async () => {
        resetState();

        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 1,
        });

        if (result.canceled) {
          return;
        }

        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (asset.uri) {
            setSelectedImage(asset.uri);
            await verifyImage(asset.uri);
          } else {
            setErrorText("Selected image has no URI.");
          }
        } else {
          setErrorText("No image selected or an error occurred.");
        }
      }, 500); // 延迟500ms确保Modal动画完成
    });
  };

  const pickFromGeoCamGallery = () => {
    hideBottomSheetModal(() => {
      // 添加延迟确保Modal完全关闭
      setTimeout(async () => {
        try {
          const galleryImages = await getGalleryImages();
          
          if (galleryImages.length === 0) {
            Alert.alert("No Images", "No images found in GeoCam gallery.");
            return;
          }

          resetState();
          router.push({
            pathname: '/gallery',
            params: { mode: 'select' }
          });
          
        } catch (error) {
          Alert.alert("Error", "Failed to access GeoCam gallery");
        }
      }, 500); // 延迟500ms确保Modal动画完成
    });
  };

  const selectNewImage = () => {
    showBottomSheetModal();
  };

  const renderMap = () => {
    if (!location) return null;

    return (
      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Photo Location</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          mapType="none"
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
          />
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Photo Location"
          />
        </MapView>
      </View>
    );
  };

  const renderVerificationResult = () => {
    if (isVerifying) {
      return (
        <View style={styles.progressContainer}>
          <CircularProgress 
            progress={progress}
            acceleratedCompletion={accelerateProgress}
          />
        </View>
      );
    }

    if (!selectedImage) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Select an image to verify</Text>
          <Text style={styles.emptyStateSubtext}>Choose from your gallery to check authenticity</Text>
          <TouchableOpacity 
            style={styles.newImageButton} 
            onPress={showBottomSheetModal}
          >
            <Text style={styles.newImageButtonText}>Select Image to Verify</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.resultSection}>
        <View style={styles.imageCard}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
        </View>

        {signatureVerification && (
          <View style={[
            styles.resultCard, 
            signatureVerification.valid ? styles.successCard : styles.errorCard
          ]}>
            <Text style={styles.resultTitle}>
              {signatureVerification.valid ? '✓ Verification Successful' : '✗ Verification Failed'}
            </Text>
            <Text style={styles.resultText}>
              {signatureVerification.message}
            </Text>
          </View>
        )}

        {decodedInfo && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Decoded Information</Text>
            <Text style={styles.decodedText}>{decodedInfo}</Text>
          </View>
        )}

        {renderMap()}
        
        {errorText && (
          <View style={[styles.resultCard, styles.errorCard]}>
            <Text style={styles.resultTitle}>Error</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.newImageButton} 
          onPress={selectNewImage}
        >
          <Text style={styles.newImageButtonText}>Select New Image</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBottomSheet = () => {
    if (!showBottomSheet) return null;

    return (
      <Modal
        visible={showBottomSheet}
        transparent
        animationType="none"
        onRequestClose={() => hideBottomSheetModal()}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => hideBottomSheetModal()}
        >
          <Animated.View 
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: bottomSheetY }]
              }
            ]}
          >
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Select Image Source</Text>
            
            <TouchableOpacity 
              style={styles.bottomSheetButton} 
              onPress={pickFromPhone}
            >
              <Text style={styles.bottomSheetButtonIcon}>🖼️</Text>
              <Text style={styles.bottomSheetButtonText}>Phone Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bottomSheetButton} 
              onPress={pickFromGeoCamGallery}
            >
              <Text style={styles.bottomSheetButtonIcon}>📸</Text>
              <Text style={styles.bottomSheetButtonText}>GeoCam Gallery</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Image</Text>
          <Text style={styles.subtitle}>Check authenticity and extract hidden data</Text>
        </View>

        {renderVerificationResult()}
      </ScrollView>

      {renderBottomSheet()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  resultSection: {
    marginTop: 8,
  },
  imageCard: {
    backgroundColor: '#373c40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
  },
  imagePreview: {
    width: width - 64,
    height: 250,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  resultCard: {
    backgroundColor: '#373c40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  successCard: {
    backgroundColor: '#1b4d3e',
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: '#4d1b1b',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  decodedText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    color: '#e57373',
    textAlign: 'center',
  },
  progressContainer: {
    marginVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    backgroundColor: '#25292e',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  newImageButton: {
    backgroundColor: '#03DAC6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    width: '80%',
  },
  newImageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#373c40',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    minHeight: BOTTOM_SHEET_HEIGHT,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25292e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  bottomSheetButtonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  bottomSheetButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
}); 