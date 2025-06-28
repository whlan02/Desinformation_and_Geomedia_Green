import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Alert, Dimensions, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGalleryImages, deleteImageFromGallery, type GalleryImage } from '../utils/galleryStorage';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3; // 3 columns with margins

export default function Gallery() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const loadImages = useCallback(async () => {
    try {
      const galleryImages = await getGalleryImages();
      
      // 确保所有图片URI都是有效的文件URL
      const validatedImages = galleryImages.map(img => {
        if (!img.uri) return img;
        
        // 如果是iOS的photo URL，转换为文件URL
        if (img.uri.startsWith('ph://')) {
          const fileName = img.uri.split('/').pop();
          if (fileName && FileSystem.documentDirectory) {
            return {
              ...img,
              uri: FileSystem.documentDirectory + fileName
            };
          }
        }
        return img;
      });
      
      setImages(validatedImages);
    } catch (error) {
      console.error('Error loading gallery images:', error);
      Alert.alert('Error', 'Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  }, [loadImages]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleImagePress = async (image: GalleryImage) => {
    if (isMultiSelectMode) {
      // In multi-select mode, toggle selection
      setSelectedImages(prev => {
        if (prev.includes(image.id)) {
          return prev.filter(id => id !== image.id);
        } else {
          return [...prev, image.id];
        }
      });
    } else if (mode === 'select') {
      // If in select mode, pass URI back to the previous screen and go back.
      try {
        await AsyncStorage.setItem('selectedUriForVerify', image.uri);
        router.back();
      } catch (e) {
        console.error('Failed to save selected URI', e);
        Alert.alert('Error', 'Could not select the image.');
      }
    } else {
      // Normal gallery view mode
      router.push({
        pathname: '/image-detail',
        params: { 
          imageId: image.id,
          // Also pass the URI encoded for consistency with camera preview
          imageUri: encodeURIComponent(image.uri)
        }
      });
    }
  };

  const handleLongPress = (image: GalleryImage) => {
    if (!mode && !isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedImages([image.id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0) return;

    Alert.alert(
      'Delete Selected Images',
      `Are you sure you want to delete ${selectedImages.length} selected image${selectedImages.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const imageId of selectedImages) {
                await deleteImageFromGallery(imageId);
              }
              setSelectedImages([]);
              setIsMultiSelectMode(false);
              await loadImages(); // Reload images after deletion
            } catch (error) {
              console.error('Error deleting images:', error);
              Alert.alert('Error', 'Failed to delete images');
            }
          },
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => (
    <TouchableOpacity
      style={[
        styles.imageContainer,
        selectedImages.includes(item.id) && styles.selectedImageContainer
      ]}
      onPress={() => handleImagePress(item)}
      onLongPress={() => handleLongPress(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      {isMultiSelectMode && (
        <View style={[
          styles.checkmark,
          selectedImages.includes(item.id) && styles.checkmarkSelected
        ]}>
          {selectedImages.includes(item.id) && (
            <Text style={styles.checkmarkText}>✓</Text>
          )}
        </View>
      )}
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isMultiSelectMode ? (
          <>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedImages([]);
              }}
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{selectedImages.length} Selected</Text>
            <TouchableOpacity 
              style={[styles.deleteButton, selectedImages.length === 0 && styles.disabledButton]} 
              onPress={handleDeleteSelected}
              disabled={selectedImages.length === 0}
            >
              <Text style={[styles.deleteButtonText, selectedImages.length === 0 && styles.disabledButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'select' ? 'Select Image' : 'Gallery'}
            </Text>
            <View style={styles.placeholder} />
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubText}>
            {mode === 'select' 
              ? 'Take some photos with GeoCam first!'
              : 'Take some photos with GeoCam to see them here!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        />
      )}
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
    paddingBottom: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
  emptyText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  gridContainer: {
    padding: 15,
  },
  imageContainer: {
    backgroundColor: '#373c40',
    borderRadius: 12,
    margin: 5,
    overflow: 'hidden',
    width: ITEM_SIZE,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  thumbnail: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    resizeMode: 'cover',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    padding: 6,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  selectedImageContainer: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkSelected: {
    backgroundColor: '#007AFF',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});