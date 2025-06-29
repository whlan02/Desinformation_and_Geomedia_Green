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

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 200;

export default function ImageDetail() {
  const router = useRouter();
  const { imageId, imageUri } = useLocalSearchParams<{ imageId?: string; imageUri?: string }>();
  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  useEffect(() => {
    loadImage();
  }, [imageId, imageUri]);

  const loadImage = async () => {
    try {
      console.log('Loading image with ID:', imageId, 'URI:', imageUri);
      
      if (imageId) {
        // Gallery mode - find image by ID
        const images = await getGalleryImages();
        const foundImage = images.find(img => img.id === imageId);
        
        if (foundImage) {
          setImage(foundImage);
          
          // Extract location from encoded info
          try {
            const info = JSON.parse(foundImage.encodedInfo);
            if (info.location) {
              setLocation(info.location);
            }
          } catch (e) {
            console.error('Error parsing location:', e);
          }
        } else {
          console.error('Image not found by ID');
          setImage(null);
        }
      } else if (imageUri) {
        // Camera preview mode - use URI directly
        const decodedUri = decodeURIComponent(imageUri);
        console.log('Using direct URI from camera:', decodedUri);
        
        // Try to find the image in gallery by URI first
        const images = await getGalleryImages();
        const foundImage = images.find(img => img.uri === decodedUri);
        
        if (foundImage) {
          // Found in gallery, use full data
          setImage(foundImage);
          
          // Extract location from encoded info
          try {
            const info = JSON.parse(foundImage.encodedInfo);
            if (info.location) {
              setLocation(info.location);
            }
          } catch (e) {
            console.error('Error parsing location:', e);
          }
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

  const formatEncodedInfo = (encodedInfo: string, signature?: string, publicKey?: string) => {
    try {
      const parsed = JSON.parse(encodedInfo);
      
      // Handle fallback case for camera preview
      if (parsed.fallback) {
        return parsed.message || 'Photo information is being processed...\n\nThis image was just captured and may not have complete metadata yet. Try viewing it from the gallery after a moment.';
      }
      
      let formatted = '';
      
      // Device Information - combined format
      const geocamDevice = parsed.geocamDevice;
      const deviceModel = parsed.deviceModel;
      
      if (geocamDevice && deviceModel) {
        formatted += ` Device: ${geocamDevice} (${deviceModel})\n`;
      } else if (geocamDevice) {
        formatted += ` Device: ${geocamDevice}\n`;
      } else if (deviceModel) {
        formatted += ` Device: ${deviceModel}\n`;
      }
      
      // Timestamp
      if (parsed.Time) {
        formatted += `Captured: ${parsed.Time}\n`;
      }
      
      // Location Information
      if (parsed.location) {
        formatted += `Location:\n`;
        formatted += `   Lat: ${parsed.location.latitude.toFixed(6)}\n`;
        formatted += `   Lon: ${parsed.location.longitude.toFixed(6)}\n`;
      }
      
      formatted += '\n'; // Add spacing
      
      // Security and Authentication - simplified
      const hasSignature = signature || parsed.signature;
      
      if (hasSignature) {
        formatted += ` Digital Signed: YES\n`;
      } else {
        formatted += ` Digital Signed: NO\n`;
      }
      
      return formatted.trim();
    } catch (e) {
      console.error('Error parsing encoded info:', e);
      return 'Unable to read photo information';
    }
  };

  // Map rendering is now handled directly in the JSX for animation purposes

  if (loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.floatingBackButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading photo...</Text>
        </View>
      </View>
    );
  }

  if (!image) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.floatingBackButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Image not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadImage();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
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
    <View style={styles.container}>
      <Animated.View style={[
        styles.header, 
        { opacity: headerOpacity }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Photo Details</Text>
        <TouchableOpacity 
          style={styles.shareButton} 
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.shareButtonText}>Share</Text>
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
        
        {location && (
          <Animated.View style={[
            styles.mapContainer, 
            { 
              opacity: mapOpacity,
              transform: [{ translateY: mapTranslateY }] 
            }
          ]}>
            <Text style={styles.sectionTitle}>Photo Location</Text>
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
                pinColor="#6200EE"
              />
            </MapView>
          </Animated.View>
        )}
        
        <Animated.View style={[
          styles.infoContainer, 
          { 
            opacity: infoOpacity,
            transform: [{ translateY: infoTranslateY }] 
          }
        ]}>
          <Text style={styles.infoTitle}>Photo Information</Text>
          <Text style={styles.infoText}>
            {formatEncodedInfo(image.encodedInfo, image.signature, image.publicKey)}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
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
    backgroundColor: 'rgba(55, 60, 64, 0.95)', // Semi-transparent header
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
    color: 'white',
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
    color: 'white',
  },
  shareButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: '#25292e',
    // Padding to account for the absolute positioned header
    paddingTop: 0,
  },
  fullImage: {
    width: '100%',
    resizeMode: 'cover',
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  infoContainer: {
    backgroundColor: '#373c40',
    padding: 20,
    paddingBottom: 40,
  },
  infoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  infoText: {
    color: '#e0e0e0',
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
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
  mapContainer: {
    backgroundColor: '#25292e',
    overflow: 'hidden',
    marginBottom: 0,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#373c40',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  map: {
    width: '100%',
    height: 250, // Larger map for better visibility
  },
});