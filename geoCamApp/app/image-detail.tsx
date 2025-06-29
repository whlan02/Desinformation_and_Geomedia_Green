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
      metadataItems.push({
        icon: hasSignature ? 'shield-checkmark-outline' : 'shield-outline',
        label: 'Digital Signature',
        value: hasSignature ? 'Verified' : 'Not Available',
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

  const mapOpacity = scrollY.interpolate({
    inputRange: [height * 0.3, height * 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const mapTranslateY = scrollY.interpolate({
    inputRange: [height * 0.3, height * 0.5],
    outputRange: [50, 0],
    extrapolate: 'clamp'
  });

  const infoOpacity = scrollY.interpolate({
    inputRange: [height * 0.5, height * 0.7],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const infoTranslateY = scrollY.interpolate({
    inputRange: [height * 0.5, height * 0.7],
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
        
        {location && (
          <Animated.View style={[
            styles.mapContainer, 
            { 
              opacity: mapOpacity,
              transform: [{ translateY: mapTranslateY }],
              backgroundColor: colors.surface
            }
          ]}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitle}>
                <Ionicons name="location" size={24} color="#03A9F4" style={{marginRight: 8}} />
                <View>
                  <Text style={styles.mapTitleText}>Image Location</Text>
                  <Text style={styles.mapSubtitle}>GPS coordinates embedded in image</Text>
                </View>
              </View>
            </View>
            <MapView
              style={styles.map}
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
          </Animated.View>
        )}
        
        <Animated.View style={[
          styles.infoContainer, 
          { 
            opacity: infoOpacity,
            transform: [{ translateY: infoTranslateY }],
            backgroundColor: colors.surface
          }
        ]}>
          {metadataItems && metadataItems.length > 0 ? (
            <View style={styles.infoCard}>
              <View style={styles.resultHeaderRow}>
                <Ionicons name="information-circle" size={32} color="#03DAC6" />
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Image Metadata</Text>
                  <Text style={styles.resultSubtitle}>Embedded information</Text>
                </View>
              </View>
              <View style={styles.metadataContainer}>
                {metadataItems.map((item, index) => (
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
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.resultHeaderRow}>
                <Ionicons name="information-circle-outline" size={32} color="#888" />
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Processing Metadata</Text>
                  <Text style={styles.resultSubtitle}>Image information is being processed</Text>
                </View>
              </View>
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>
                  This image was just captured and may not have complete metadata yet. Try viewing it from the gallery after a moment.
                </Text>
              </View>
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
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultHeaderText: {
    flex: 1,
    marginLeft: 12,
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
  fallbackContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
    marginTop: 12,
  },
  fallbackText: {
    fontSize: 15,
    color: '#e0e0e0',
    lineHeight: 22,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
  },
  map: {
    width: '100%',
    height: 180, // Adjust height to match verification page
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
});