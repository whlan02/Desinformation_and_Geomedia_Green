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

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 200;

export default function ImageDetail() {
  const router = useRouter();
  const { imageId, imageUri } = useLocalSearchParams<{ imageId: string, imageUri: string }>();
  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [directUriMode, setDirectUriMode] = useState<boolean>(false);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');

  useEffect(() => {
    loadImage();
  }, [imageId, imageUri]);

  const loadImage = async () => {
    try {
      // Case 1: Direct URI provided from camera preview or other source
      if (imageUri) {
        console.log('Loading image from direct URI:', decodeURIComponent(imageUri));
        const uri = decodeURIComponent(imageUri);
        setDirectUriMode(true);
        
        // Create a simple image object with the URI
        setImage({
          id: 'preview-' + Date.now(),
          uri: uri,
          encodedInfo: '{}', // Default empty info
          timestamp: Date.now()
        });
        
        setLoading(false);
        return;
      }
      
      // Case 2: Loading from gallery by ID
      const images = await getGalleryImages();
      const foundImage = images.find(img => img.id === imageId);
      
      if (foundImage) {
        setImage(foundImage);
        setDirectUriMode(false);
        
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
        console.log('Image not found by ID:', imageId);
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
      // Handle possible empty encodedInfo (for images loaded directly from URI)
      if (!encodedInfo || encodedInfo === '{}') {
        return 'Preview image - metadata not available\n\nThis image was opened directly from the camera preview.';
      }
      
      const parsed = JSON.parse(encodedInfo);
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
          <Ionicons name="arrow-back" size={24} color="white" />
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
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Image not found</Text>
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
          <Ionicons name="arrow-back" size={24} color="white" />
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
        <Image source={{ uri: image.uri }} style={[styles.fullImage, {height: height}]} />
        
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
          <Text style={styles.infoTitle}>
            {directUriMode ? 'Preview Image' : 'Photo Information'}
          </Text>
          {directUriMode ? (
            <>
              <Text style={styles.infoText}>
                This is a preview of the image. No additional metadata is available in preview mode.
              </Text>
              <TouchableOpacity 
                style={[styles.saveToGalleryButton, {marginTop: 20}]} 
                onPress={() => router.push('/gallery')}
              >
                <Text style={styles.saveToGalleryButtonText}>Open Gallery</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.infoText}>
              {formatEncodedInfo(image.encodedInfo, image.signature, image.publicKey)}
            </Text>
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
        <Ionicons name="arrow-back" size={24} color="white" />
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  saveToGalleryButton: {
    backgroundColor: '#4630EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  saveToGalleryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});