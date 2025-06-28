import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getGalleryImages, type GalleryImage } from '../utils/galleryStorage';
import * as Sharing from 'expo-sharing';
import MapView, { Marker, UrlTile } from 'react-native-maps';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 200;

export default function ImageDetail() {
  const router = useRouter();
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadImage();
  }, [imageId]);

  const loadImage = async () => {
    try {
      const images = await getGalleryImages();
      const foundImage = images.find(img => img.id === imageId);
      setImage(foundImage || null);
      
      // Extract location from encoded info
      if (foundImage) {
        try {
          const info = JSON.parse(foundImage.encodedInfo);
          if (info.location) {
            setLocation(info.location);
          }
        } catch (e) {
          console.error('Error parsing location:', e);
        }
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

  const renderMap = () => {
    if (!location) return null;

    return (
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>Photo Location</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.008, // Closer zoom for better detail
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
            pinColor="#6200EE" // Match with share button color for cohesive design
          />
        </MapView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </View>
    );
  }

  if (!image) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Image Not Found</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Image not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: image.uri }} style={styles.fullImage} />
        {renderMap()}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Photo Information</Text>
          <Text style={styles.infoText}>
            {formatEncodedInfo(image.encodedInfo, image.signature, image.publicKey)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#373c40',
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
  },
  fullImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 4/5, // Different aspect ratio for full screen feel
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
  detailsContainer: {
    paddingTop: 0, // No padding to create seamless experience
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