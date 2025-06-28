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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: image.uri }} style={styles.fullImage} />
        
        <View style={styles.metaContainer}>
          
          
          {renderMap()}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Photo Information:</Text>
            <Text style={styles.infoText}>
              {formatEncodedInfo(image.encodedInfo, image.signature, image.publicKey)}
            </Text>
          </View>
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
  },
  scrollContent: {
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#373c40',
    borderRadius: 8,
    marginBottom: 20,
  },
  metaContainer: {
    backgroundColor: '#373c40',
    padding: 20,
    borderRadius: 8,
    gap: 15,
  },
  infoContainer: {
    backgroundColor: '#25292e',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  infoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 20,
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
  mapContainer: {
    backgroundColor: '#25292e',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
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
}); 