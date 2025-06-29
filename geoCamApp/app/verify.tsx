import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Dimensions, 
  Modal, 
  Animated, 
  Easing,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyImagePurePng } from '../utils/backendService';
import { getGalleryImages} from '../utils/galleryStorage';
import CircularProgress from '../components/CircularProgress';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = 150;
const BOTTOM_SHEET_HEIGHT = 200;

export default function Verify() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<Array<{icon: string, label: string, value: string, type: string}> | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [signatureVerification, setSignatureVerification] = useState<{valid: boolean, message: string} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [accelerateProgress, setAccelerateProgress] = useState(false);
  
  // Animation for scroll indicator
  const scrollIndicatorAnim = useRef(new Animated.Value(0)).current;
  
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

  // Start scroll indicator animation when image is selected
  useEffect(() => {
    if (selectedImage && !isVerifying) {
      const animateScrollIndicator = () => {
        Animated.sequence([
          Animated.timing(scrollIndicatorAnim, {
            toValue: 10,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scrollIndicatorAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Repeat animation
          animateScrollIndicator();
        });
      };
      animateScrollIndicator();
    }
  }, [selectedImage, isVerifying, scrollIndicatorAnim]);
  
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
    
    startFakeProgress(25000); // 25 seconds fake progress

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
          
          // Process the decoded data into structured metadata items
          const metadataItems = [];
          
          // Handle device information
          if (decodedData.geocamDevice || decodedData.deviceModel) {
            const deviceInfo = decodedData.geocamDevice 
              ? (decodedData.deviceModel ? `${decodedData.geocamDevice} (${decodedData.deviceModel})` : decodedData.geocamDevice)
              : decodedData.deviceModel;
            metadataItems.push({
              icon: 'phone-portrait-outline',
              label: 'Device',
              value: deviceInfo,
              type: 'device'
            });
          }
          
          // Add time information
          if (decodedData.Time || decodedData.time) {
            const timeValue = decodedData.Time || decodedData.time;
            metadataItems.push({
              icon: 'time-outline',
              label: 'Captured',
              value: timeValue,
              type: 'time'
            });
          }
          
          // Handle location information
          if (decodedData.location) {
            setLocation(decodedData.location); // Set location for map
            metadataItems.push({
              icon: 'location-outline',
              label: 'Location',
              value: `${decodedData.location.latitude.toFixed(6)}, ${decodedData.location.longitude.toFixed(6)}`,
              type: 'location'
            });
          }
          
          // Add any other information
          for (const key in decodedData) {
            if (decodedData.hasOwnProperty(key)) {
              if (key === 'location' || key === 'deviceModel' || key === 'geocamDevice' || key === 'Time' || key === 'time') {
                // Skip keys we've already processed
                continue;
              } else {
                const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                metadataItems.push({
                  icon: 'information-circle-outline',
                  label: formattedKey,
                  value: String(decodedData[key]),
                  type: 'other'
                });
              }
            }
          }
          
          setDecodedInfo(metadataItems);
        } else {
          setDecodedInfo([]);
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
        <View style={styles.mapHeader}>
          <View style={styles.mapTitle}>
            <Ionicons name="location" size={24} color="#03A9F4" style={{marginRight: 8}} />
            <View>
              <Text style={styles.mapTitleText}>Photo Location</Text>
              <Text style={styles.mapSubtitle}>GPS coordinates embedded in image</Text>
            </View>
          </View>
        </View>
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
            pinColor="#03DAC6"
            tracksViewChanges={false}
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
            estimatedDuration={20000}
            showPercentage={true}
            showTimeRemaining={true}
            message="Verifying image authenticity..."
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
            <Text style={styles.newImageButtonText}>Browse Images</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.resultSection}>
        <View style={styles.fullscreenImageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.fullscreenOverlay}
          >
            <View style={styles.imageStatusBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
              <Text style={styles.imageStatusText}>Analyzed</Text>
            </View>
            <Animated.View style={[
              styles.scrollIndicator,
              {
                transform: [{ translateY: scrollIndicatorAnim }]
              }
            ]}>
              <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.scrollHintText}>Scroll for details</Text>
            </Animated.View>
          </LinearGradient>
        </View>

        {signatureVerification && (
          <View style={[
            styles.resultCard, 
            styles.infoCardSpacing,
            signatureVerification.valid ? styles.successCard : styles.errorCard
          ]}>
            <View style={styles.resultHeaderRow}>
              <Ionicons 
                name={signatureVerification.valid ? "shield-checkmark" : "shield-outline"} 
                size={32} 
                color={signatureVerification.valid ? "#4caf50" : "#f44336"} 
              />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>
                  {signatureVerification.valid ? 'Verification Successful' : 'Verification Failed'}
                </Text>
                <Text style={styles.resultSubtitle}>
                  {signatureVerification.valid ? 'Image authenticity confirmed' : 'Unable to verify authenticity'}
                </Text>
              </View>
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultText}>
                {signatureVerification.message}
              </Text>
            </View>
          </View>
        )}

        {decodedInfo && decodedInfo.length > 0 && (
          <View style={[styles.infoCard, styles.infoCardSpacing]}>
            <View style={styles.resultHeaderRow}>
              <Ionicons name="information-circle" size={32} color="#03DAC6" />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>Image Metadata</Text>
                <Text style={styles.resultSubtitle}>Embedded information</Text>
              </View>
            </View>
            <View style={styles.metadataContainer}>
              {decodedInfo.map((item, index) => (
                <View key={index} style={styles.metadataItem}>
                  <View style={styles.metadataIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color="#03DAC6" />
                  </View>
                  <View style={styles.metadataContent}>
                    <Text style={styles.metadataLabel}>{item.label}</Text>
                    <Text style={styles.metadataValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {decodedInfo !== null && decodedInfo.length === 0 && (
          <View style={[styles.infoCard, styles.infoCardSpacing]}>
            <View style={styles.resultHeaderRow}>
              <Ionicons name="information-circle-outline" size={32} color="#888" />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>No Metadata Found</Text>
                <Text style={styles.resultSubtitle}>No hidden information detected</Text>
              </View>
            </View>
          </View>
        )}

        {renderMap()}
        
        {errorText && (
          <View style={[styles.resultCard, styles.errorCard, styles.infoCardSpacing]}>
            <View style={styles.resultHeaderRow}>
              <Ionicons name="alert-circle" size={32} color="#f44336" />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>Error</Text>
                <Text style={styles.resultSubtitle}>Verification failed</Text>
              </View>
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.newImageButton} 
            onPress={selectNewImage}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="image" size={22} color="#000000" />
              <Text style={styles.newImageButtonText}>Verify Another Image</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={[styles.topBar, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.topBarTitle}>
          Verify Image
        </Text>
        
        {selectedImage && (
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot, 
              signatureVerification?.valid ? styles.statusDotValid : styles.statusDotInvalid
            ]} />
            <Text style={styles.statusText}>
              {isVerifying ? 'Verifying...' : signatureVerification?.valid ? 'Verified' : 'Not verified'}
            </Text>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#373c40',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    position: 'relative',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#888',
    marginRight: 6,
  },
  statusDotValid: {
    backgroundColor: '#4caf50',
  },
  statusDotInvalid: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    paddingTop: 16, // Add back some top padding for the new layout
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 20,
    backgroundColor: 'rgba(55, 60, 64, 0.5)',
    borderRadius: 16,
    marginVertical: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    maxWidth: '90%',
    lineHeight: 22,
  },
  resultSection: {
    marginTop: 0, // Remove margin for fullscreen effect
  },
  infoCardSpacing: {
    marginTop: 24, // Add spacing after fullscreen image
  },
  fullscreenImageContainer: {
    height: height - 120, // Reduce space taken by top bar, make it fit better
    width: width - 32, // Account for padding
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Change from 'contain' to 'cover' for better screen fit
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  imageStatusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  imageStatusText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  scrollIndicator: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scrollHintText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  resultCard: {
    backgroundColor: '#373c40',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: '#373c40',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(3, 218, 198, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  successCard: {
    backgroundColor: 'rgba(27, 77, 62, 0.9)',
    borderColor: '#4caf50',
    borderWidth: 1.5,
    borderLeftWidth: 5,
  },
  errorCard: {
    backgroundColor: 'rgba(77, 27, 27, 0.9)',
    borderColor: '#f44336',
    borderWidth: 1.5,
    borderLeftWidth: 5,
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
    flex: 1,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
    fontWeight: '500',
  },
  resultHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  resultText: {
    fontSize: 16,
    color: '#e0e0e0',
    textAlign: 'left',
    lineHeight: 24,
  },
  resultContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    marginTop: 12,
  },
  metadataContainer: {
    marginTop: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#03DAC6',
  },
  metadataIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(3, 218, 198, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metadataContent: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#03DAC6',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  decodedText: {
    fontSize: 15,
    color: '#e0e0e0',
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    fontSize: 16,
    color: '#ff8a80',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    marginVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55, 60, 64, 0.5)',
    borderRadius: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapContainer: {
    backgroundColor: '#373c40',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#03A9F4',
  },
  mapHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapTitle: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapTitleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  mapSubtitle: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT + 30, // Make map taller
  },
  newImageButton: {
    backgroundColor: '#03DAC6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newImageButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  actionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#373c40',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 40,
    minHeight: BOTTOM_SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#888',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 22,
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  bottomSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25292e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bottomSheetButtonIcon: {
    fontSize: 26,
    marginRight: 18,
  },
  bottomSheetButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
}); 