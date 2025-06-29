import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Platform, 
  Dimensions,
  Animated
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { getGalleryImages, type GalleryImage } from '../utils/galleryStorage';
import * as Sharing from 'expo-sharing';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 200;

export default function ImageDetail() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { imageId, imageUri } = useLocalSearchParams<{ imageId?: string; imageUri?: string }>();
  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [metadataItems, setMetadataItems] = useState<Array<{icon: string, label: string, value: string, type: string}> | null>(null);
  
  // Gallery navigation state
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  
  // Touch tracking for swipe detection
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  // Touch handlers for swipe detection
  const handleTouchStart = (event: any) => {
    if (!showNavigation) return;
    
    const touch = event.nativeEvent.touches[0];
    setTouchStart({
      x: touch.pageX,
      y: touch.pageY,
      time: Date.now()
    });
  };

  const handleTouchEnd = (event: any) => {
    if (!showNavigation || !touchStart) return;
    
    const touch = event.nativeEvent.changedTouches[0];
    const deltaX = touch.pageX - touchStart.x;
    const deltaY = touch.pageY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Check if it's a valid swipe
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    const isQuick = deltaTime < 500; // Less than 500ms
    const hasDistance = Math.abs(deltaX) > 50; // At least 50px
    
    if (isHorizontal && isQuick && hasDistance) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous image
        navigateToPreviousImage();
      } else if (deltaX < 0 && currentIndex < allImages.length - 1) {
        // Swipe left - go to next image
        navigateToNextImage();
      }
    }
    
    setTouchStart(null);
  };

  useEffect(() => {
    loadImage();
  }, [imageId, imageUri]);

  const loadImage = async () => {
    try {
      console.log('Loading image with ID:', imageId, 'URI:', imageUri);
      
      // Load all gallery images first
      const images = await getGalleryImages();
      setAllImages(images);
      
      if (imageId) {
        // Gallery mode - find image by ID and set up navigation
        const foundIndex = images.findIndex(img => img.id === imageId);
        
        if (foundIndex !== -1) {
          const foundImage = images[foundIndex];
          setCurrentIndex(foundIndex);
          setShowNavigation(images.length > 1); // Show navigation if there are multiple images
          loadImageData(foundImage);
        } else {
          console.error('Image not found by ID');
          setImage(null);
        }
      } else if (imageUri) {
        // Camera preview mode - use URI directly
        const decodedUri = decodeURIComponent(imageUri);
        console.log('Using direct URI from camera:', decodedUri);
        
        // Try to find the image in gallery by URI first
        const foundIndex = images.findIndex(img => img.uri === decodedUri);
        
        if (foundIndex !== -1) {
          // Found in gallery, use full data and enable navigation
          const foundImage = images[foundIndex];
          setCurrentIndex(foundIndex);
          setShowNavigation(images.length > 1);
          loadImageData(foundImage);
        } else {
          // Not found in gallery, create minimal image object for display
          console.log('Image not in gallery, creating minimal display object');
          const fallbackImage: GalleryImage = {
            id: 'camera-preview',
            uri: decodedUri,
            encodedInfo: JSON.stringify({ 
              fallback: true,
              message: 'Preview from camera - metadata may be processing' 
            }),
            timestamp: Date.now()
          };
          setImage(fallbackImage);
          setMetadataItems(null); // No metadata for fallback
          setShowNavigation(false); // No navigation for fallback images
        }
      } else {
        console.error('No imageId or imageUri provided');
        setImage(null);
      }
    } catch (error) {
      console.error('Error loading image:', error);
      Alert.alert('Error', 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const loadImageData = (imageData: GalleryImage) => {
    setImage(imageData);
    
    // Extract location and metadata from encoded info
    try {
      const info = JSON.parse(imageData.encodedInfo);
      if (info.location) {
        setLocation(info.location);
      } else {
        setLocation(null);
      }
      
      // Set metadata items
      const metadata = formatEncodedInfo(imageData.encodedInfo, imageData.signature, imageData.publicKey);
      setMetadataItems(metadata);
    } catch (e) {
      console.error('Error parsing image data:', e);
      setLocation(null);
      setMetadataItems(null);
    }
  };

  const handleShare = async () => {
    if (!image) return;
    
    setSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(image.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share GeoCam Photo',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image');
    } finally {
      setSharing(false);
    }
  };

  const navigateToNextImage = () => {
    if (currentIndex < allImages.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextImage = allImages[nextIndex];
      setCurrentIndex(nextIndex);
      loadImageData(nextImage);
    }
  };

  const navigateToPreviousImage = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevImage = allImages[prevIndex];
      setCurrentIndex(prevIndex);
      loadImageData(prevImage);
    }
  };

  const formatEncodedInfo = (encodedInfo: string, signature?: string, publicKey?: string) => {
    try {
      const parsed = JSON.parse(encodedInfo);
      
      // Handle fallback case for camera preview
      if (parsed.fallback) {
        return null; // Return null to show fallback message in UI
      }
      
      const metadataItems = [];
      
      // Device Information - combined format
      const geocamDevice = parsed.geocamDevice;
      const deviceModel = parsed.deviceModel;
      
      if (geocamDevice || deviceModel) {
        const deviceInfo = geocamDevice 
          ? (deviceModel ? `${geocamDevice} (${deviceModel})` : geocamDevice)
          : deviceModel;
        metadataItems.push({
          icon: 'phone-portrait-outline',
          label: 'Device',
          value: deviceInfo,
          type: 'device'
        });
      }
      
      // Timestamp
      if (parsed.Time) {
        metadataItems.push({
          icon: 'time-outline',
          label: 'Captured',
          value: parsed.Time,
          type: 'time'
        });
      }
      
      // Location Information (will be handled separately in map)
      if (parsed.location) {
        metadataItems.push({
          icon: 'location-outline',
          label: 'Location',
          value: `${parsed.location.latitude.toFixed(6)}, ${parsed.location.longitude.toFixed(6)}`,
          type: 'location'
        });
      }
      
      // Digital Signature
      const hasSignature = signature || parsed.signature;
      const isVerified = hasSignature === 'verified' || (hasSignature && hasSignature !== 'Not Available');
      metadataItems.push({
        icon: isVerified ? 'shield-checkmark-outline' : 'shield-outline',
        label: 'Digital Signature',
        value: isVerified ? 'Verified' : 'Not Available',
        type: 'signature'
      });
      
      // Add any other information
      for (const key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          if (key === 'location' || key === 'deviceModel' || key === 'geocamDevice' || key === 'Time' || key === 'signature') {
            // Skip keys we've already processed
            continue;
          } else {
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
            metadataItems.push({
              icon: 'information-circle-outline',
              label: formattedKey,
              value: String(parsed[key]),
              type: 'other'
            });
          }
        }
      }
      
      return metadataItems;
    } catch (e) {
      console.error('Error parsing encoded info:', e);
      return null;
    }
  };

  // Map rendering is now handled directly in the JSX for animation purposes

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={styles.floatingBackButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading photo...</Text>
        </View>
      </View>
    );
  }

  if (!image) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={styles.floatingBackButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Image not found</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.buttonBackground }]}
            onPress={() => {
              setLoading(true);
              loadImage();
            }}
          >
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const infoOpacity = scrollY.interpolate({
    inputRange: [height * 0.3, height * 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const infoTranslateY = scrollY.interpolate({
    inputRange: [height * 0.3, height * 0.5],
    outputRange: [50, 0],
    extrapolate: 'clamp'
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[
        styles.header, 
        { 
          opacity: headerOpacity,
          backgroundColor: colors.headerBackground + 'F0' // Adding transparency
        }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Image Details</Text>
        <TouchableOpacity 
          style={[styles.shareButton, { backgroundColor: colors.buttonBackground }]} 
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.buttonText} />
          ) : (
            <Text style={[styles.shareButtonText, { color: colors.buttonText }]}>Share</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        scrollEnabled={true}
      >
        <View 
          style={styles.imageContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image 
            source={{ uri: image.uri }} 
            style={[styles.fullImage, {height: height}]} 
            resizeMode="contain"
            onError={(error) => {
              console.error('Image loading error:', error);
              Alert.alert('Error', 'Failed to load image. The image file may be corrupted or moved.');
            }}
          />
        </View>
        
        <Animated.View style={[
          styles.infoContainer, 
          { 
            opacity: infoOpacity,
            transform: [{ translateY: infoTranslateY }],
            backgroundColor: colors.surface
          }
        ]}>
          {metadataItems && metadataItems.length > 0 ? (
            <View style={styles.enhancedInfoCard}>
              <LinearGradient
                colors={[
                  'rgba(45, 52, 60, 0.98)', 
                  'rgba(35, 42, 50, 0.99)', 
                  'rgba(30, 37, 45, 1)',
                  'rgba(25, 32, 40, 1)'
                ]}
                locations={[0, 0.3, 0.7, 1]}
                style={styles.enhancedCardGradient}
              >
                {/* Enhanced Header with better visual hierarchy */}
                <View style={styles.enhancedHeaderSection}>
                  <View style={styles.enhancedHeaderContent}>
                    <View style={styles.enhancedIconWrapper}>
                      <LinearGradient
                        colors={['rgba(3, 218, 198, 0.2)', 'rgba(3, 218, 198, 0.05)']}
                        style={styles.enhancedIconBackground}
                      >
                        <Ionicons name="information-circle" size={28} color="#03DAC6" />
                      </LinearGradient>
                    </View>
                    <View style={styles.enhancedHeaderTextContainer}>
                      <Text style={styles.enhancedTitle}>Image Information</Text>
                      <Text style={styles.enhancedSubtitle}>Captured metadata and location data</Text>
                    </View>
                  </View>
                  <View style={styles.enhancedHeaderDivider} />
                </View>
                
                {/* Enhanced Location Map Section */}
                {location && (
                  <View style={styles.enhancedLocationSection}>
                    <View style={styles.enhancedSectionHeader}>
                      <View style={styles.enhancedSectionIconContainer}>
                        <Ionicons name="location" size={20} color="#03A9F4" />
                      </View>
                      <Text style={styles.enhancedSectionTitle}>Capture Location</Text>
                    </View>
                    <View style={styles.enhancedMapWrapper}>
                      <MapView
                        style={styles.enhancedMap}
                        initialRegion={{
                          latitude: location.latitude,
                          longitude: location.longitude,
                          latitudeDelta: 0.008,
                          longitudeDelta: 0.008,
                        }}
                        mapType="none"
                        zoomEnabled={true}
                        pitchEnabled={true}
                        rotateEnabled={true}
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
                      <View style={styles.enhancedCoordinatesOverlay}>
                        <Text style={styles.enhancedCoordinatesText}>
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                
                {/* Enhanced Metadata Section */}
                <View style={styles.enhancedMetadataSection}>
                  <View style={styles.enhancedSectionHeader}>
                    <View style={styles.enhancedSectionIconContainer}>
                      <Ionicons name="document-text" size={20} color="#03DAC6" />
                    </View>
                    <Text style={styles.enhancedSectionTitle}>Metadata Details</Text>
                  </View>
                  <View style={styles.enhancedMetadataGrid}>
                    {metadataItems.map((item, index) => (
                      <View key={index} style={styles.enhancedMetadataItem}>
                        <LinearGradient
                          colors={['rgba(55, 62, 70, 0.6)', 'rgba(45, 52, 60, 0.4)']}
                          style={styles.enhancedMetadataItemGradient}
                        >
                          <View style={styles.enhancedMetadataItemContent}>
                            <View style={styles.enhancedMetadataIcon}>
                              <Ionicons name={item.icon as any} size={18} color="#03DAC6" />
                            </View>
                            <View style={styles.enhancedMetadataText}>
                              <Text style={styles.enhancedMetadataLabel}>{item.label}</Text>
                              <Text style={styles.enhancedMetadataValue} numberOfLines={2}>
                                {item.value}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.enhancedInfoCard}>
              <LinearGradient
                colors={[
                  'rgba(45, 52, 60, 0.98)', 
                  'rgba(35, 42, 50, 0.99)', 
                  'rgba(30, 37, 45, 1)',
                  'rgba(25, 32, 40, 1)'
                ]}
                locations={[0, 0.3, 0.7, 1]}
                style={styles.enhancedCardGradient}
              >
                <View style={styles.enhancedHeaderSection}>
                  <View style={styles.enhancedHeaderContent}>
                    <View style={styles.enhancedIconWrapper}>
                      <LinearGradient
                        colors={['rgba(136, 136, 136, 0.2)', 'rgba(136, 136, 136, 0.05)']}
                        style={styles.enhancedIconBackground}
                      >
                        <Ionicons name="information-circle-outline" size={28} color="#888" />
                      </LinearGradient>
                    </View>
                    <View style={styles.enhancedHeaderTextContainer}>
                      <Text style={styles.enhancedTitle}>Processing Information</Text>
                      <Text style={styles.enhancedSubtitle}>Image metadata is being processed</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.enhancedFallbackContainer}>
                  <Text style={styles.enhancedFallbackText}>
                    This image was just captured and may not have complete metadata yet. Try viewing it from the gallery after a moment.
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}
        </Animated.View>
        
        {/* Empty space to allow scrolling beyond the content for animation effect */}
        <View style={{height: 100}} />
      </Animated.ScrollView>
      
      {/* Fixed back button overlay for easy navigation when header is hidden */}
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Image counter - shows when there are multiple images */}
      {showNavigation && (
        <>
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1} of {allImages.length}
            </Text>
          </View>
          
          {/* Swipe instruction hint */}
          <View style={styles.swipeInstruction}>
            <Text style={styles.swipeInstructionText}>
              Swipe left or right to navigate
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  shareButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  infoContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#373c40',
    borderRadius: 20,
    padding: 0, // Remove padding since gradient will handle it
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(3, 218, 198, 0.4)',
    borderLeftWidth: 6,
    borderLeftColor: '#03DAC6',
    shadowColor: '#03DAC6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  resultHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resultSubtitle: {
    fontSize: 15,
    color: '#b8c6db',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metadataContainer: {
    marginTop: 16,
    gap: 12,
  },
  embeddedMapContainer: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(3, 169, 244, 0.4)',
    shadowColor: 'rgba(3, 169, 244, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  embeddedMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 169, 244, 0.15)',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(3, 169, 244, 0.3)',
  },
  embeddedMapTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  embeddedMap: {
    width: '100%',
    height: 160,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    shadowColor: 'rgba(3, 218, 198, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  metadataIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(3, 218, 198, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(3, 218, 198, 0.4)',
  },
  metadataContent: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#03DAC6',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(3, 218, 198, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metadataValue: {
    fontSize: 17,
    color: '#ffffff',
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fallbackContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    marginTop: 16,
    shadowColor: 'rgba(3, 218, 198, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  fallbackText: {
    fontSize: 16,
    color: '#e0e0e0',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 22,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 95,
  },
  imageCounterText: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  swipeInstruction: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 95,
  },
  swipeInstructionText: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    textAlign: 'center',
  },
  // Enhanced unified info card styles that blend with dark theme
  enhancedInfoCard: {
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Subtle border that blends with background
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  enhancedCardGradient: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  // Enhanced header section
  enhancedHeaderSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  enhancedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enhancedIconWrapper: {
    marginRight: 16,
  },
  enhancedIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(3, 218, 198, 0.15)',
  },
  enhancedHeaderTextContainer: {
    flex: 1,
  },
  enhancedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  enhancedSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  enhancedHeaderDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 16,
  },
  // Enhanced location section
  enhancedLocationSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  enhancedSectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enhancedSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  enhancedMapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  enhancedMap: {
    width: '100%',
    height: 180,
  },
  enhancedCoordinatesOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  enhancedCoordinatesText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Enhanced metadata section
  enhancedMetadataSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  enhancedMetadataGrid: {
    gap: 12,
  },
  enhancedMetadataItem: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  enhancedMetadataItemGradient: {
    borderRadius: 12,
  },
  enhancedMetadataItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  enhancedMetadataIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(3, 218, 198, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(3, 218, 198, 0.2)',
  },
  enhancedMetadataText: {
    flex: 1,
  },
  enhancedMetadataLabel: {
    fontSize: 12,
    color: 'rgba(3, 218, 198, 0.9)',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  enhancedMetadataValue: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  enhancedFallbackContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    marginTop: 16,
    shadowColor: 'rgba(3, 218, 198, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedFallbackText: {
    fontSize: 16,
    color: '#e0e0e0',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});