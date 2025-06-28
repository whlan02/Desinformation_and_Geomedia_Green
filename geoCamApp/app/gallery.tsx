import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  RefreshControl, 
  Alert, 
  Dimensions, 
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGalleryImages, deleteImageFromGallery, type GalleryImage } from '../utils/galleryStorage';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 columns with smaller margins for a tighter grid
const ANIMATION_DURATION = 300; // Duration for animations in ms

export default function Gallery() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerHeight = useRef(new Animated.Value(50)).current;
  
  // Filtering and sorting
  const [sortOrder, setSortOrder] = useState<'newest'|'oldest'>('newest');
  const [isGridView, setIsGridView] = useState(true);

  // Load and process images
  const loadImages = useCallback(async () => {
    try {
      const galleryImages = await getGalleryImages();
      
      // Validate image URIs and ensure they're proper file URLs
      const validatedImages = galleryImages.map(img => {
        if (!img.uri) return img;
        
        // Convert iOS photo URLs to file URLs if needed
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
      
      // Apply sorting
      const sortedImages = [...validatedImages].sort((a, b) => {
        if (sortOrder === 'newest') {
          return b.timestamp - a.timestamp;
        } else {
          return a.timestamp - b.timestamp;
        }
      });
      
      setImages(sortedImages);
      
      // Start animations when images are loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true
        })
      ]).start();
      
    } catch (error) {
      console.error('Error loading gallery images:', error);
      Alert.alert('Error', 'Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  }, [fadeAnim, scaleAnim, sortOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  }, [loadImages]);

  // Animation when component mounts
  useEffect(() => {
    // Animate header on mount
    Animated.timing(headerHeight, {
      toValue: 100,
      duration: ANIMATION_DURATION,
      useNativeDriver: false
    }).start();
    
    loadImages();
  }, [loadImages, headerHeight]);
  
  // Reset animations when sort order changes
  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    setLoading(true);
    loadImages();
  }, [sortOrder, fadeAnim, scaleAnim, loadImages]);

  const handleImagePress = async (image: GalleryImage) => {
    // Play a tap animation
    const imageScale = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(imageScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(imageScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    if (isMultiSelectMode) {
      // In multi-select mode, toggle selection with visual feedback
      setSelectedImages(prev => {
        if (prev.includes(image.id)) {
          return prev.filter(id => id !== image.id);
        } else {
          return [...prev, image.id];
        }
      });
    } else if (mode === 'select') {
      // If in select mode, pass URI back to the previous screen and go back
      try {
        await AsyncStorage.setItem('selectedUriForVerify', image.uri);
        router.back();
      } catch (e) {
        console.error('Failed to save selected URI', e);
        Alert.alert('Error', 'Could not select the image.');
      }
    } else {
      // Normal gallery view mode - open detail with smooth transition
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

  // Toggle view mode between grid and list
  const toggleViewMode = () => {
    setIsGridView(prev => !prev);
  };
  
  // Toggle sort order between newest and oldest
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  const handleLongPress = (image: GalleryImage) => {
    if (!mode && !isMultiSelectMode) {
      // Haptic feedback would be added here in a real app
      
      // Enter multi-select mode with visual feedback
      Animated.sequence([
        Animated.timing(headerHeight, {
          toValue: 80,
          duration: 150,
          useNativeDriver: false
        }),
        Animated.timing(headerHeight, {
          toValue: 100,
          duration: 150,
          useNativeDriver: false
        })
      ]).start();
      
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
              // Show loading indicator during deletion
              setLoading(true);
              
              for (const imageId of selectedImages) {
                await deleteImageFromGallery(imageId);
              }
              
              // Exit multi-select mode
              setSelectedImages([]);
              setIsMultiSelectMode(false);
              
              // Reset animations and reload
              fadeAnim.setValue(0);
              scaleAnim.setValue(0.95);
              await loadImages();
              
              // Show confirmation
              Alert.alert('Success', `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} deleted successfully.`);
            } catch (error) {
              console.error('Error deleting images:', error);
              Alert.alert('Error', 'Failed to delete images');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format date in a more readable way
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderGridImage = ({ item, index }: { item: GalleryImage, index: number }) => {
    // Calculate staggered animation delay based on index
    const animDelay = index * 50;
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.imageContainer,
            selectedImages.includes(item.id) && styles.selectedImageContainer
          ]}
          onPress={() => handleImagePress(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
          delayLongPress={300}
        >
          <Image 
            source={{ uri: item.uri }} 
            style={styles.thumbnail}
            resizeMode="cover" 
          />
          
          {isMultiSelectMode && (
            <View style={[
              styles.checkmark,
              selectedImages.includes(item.id) && styles.checkmarkSelected
            ]}>
              {selectedImages.includes(item.id) && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </View>
          )}
          
          <View style={styles.imageFooter}>
            <Text style={styles.timestamp} numberOfLines={1}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  const renderListImage = ({ item, index }: { item: GalleryImage, index: number }) => {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.listItemContainer,
            selectedImages.includes(item.id) && styles.selectedImageContainer
          ]}
          onPress={() => handleImagePress(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: item.uri }} 
            style={styles.listThumbnail} 
          />
          
          <View style={styles.listItemDetails}>
            <Text style={styles.listItemDate}>
              {formatDate(item.timestamp)}
            </Text>
            
            <Text style={styles.listItemInfo}>
              GeoCam Image
            </Text>
          </View>
          
          {isMultiSelectMode ? (
            <View style={[
              styles.listCheckmark,
              selectedImages.includes(item.id) && styles.checkmarkSelected
            ]}>
              {selectedImages.includes(item.id) && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        {isMultiSelectMode ? (
          <>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                // Exit multi-select with animation
                Animated.parallel([
                  Animated.timing(headerHeight, {
                    toValue: 60,
                    duration: 200,
                    useNativeDriver: false
                  })
                ]).start(() => {
                  setIsMultiSelectMode(false);
                  setSelectedImages([]);
                });
              }}
            >
              <Ionicons name="close-outline" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedImages.length} Selected
            </Text>
            <TouchableOpacity 
              style={[styles.deleteButton, selectedImages.length === 0 && styles.disabledButton]} 
              onPress={handleDeleteSelected}
              disabled={selectedImages.length === 0}
            >
              <Ionicons name="trash-outline" size={20} color="white" style={{marginRight: 5}} />
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
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'select' ? 'Select Image' : 'GeoCam Gallery'}
            </Text>
            
            {/* Controls section - only show when not in selection mode */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={toggleSortOrder}
              >
                <Ionicons 
                  name={sortOrder === 'newest' ? 'time-outline' : 'time'} 
                  size={20} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={toggleViewMode}
              >
                <Ionicons 
                  name={isGridView ? 'list' : 'grid'} 
                  size={20} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="images-outline" size={60} color="#555" style={{marginBottom: 20}} />
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubText}>
            {mode === 'select' 
              ? 'Take some photos with GeoCam first!'
              : 'Take some photos with GeoCam to see them here!'}
          </Text>
        </View>
      ) : (
        <>
          {isGridView ? (
            <FlatList
              data={images}
              renderItem={renderGridImage}
              keyExtractor={(item) => item.id}
              numColumns={3}
              key="grid" 
              contentContainerStyle={styles.gridContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#1e88e5"
                  colors={['#1e88e5']}
                />
              }
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={11}
            />
          ) : (
            <FlatList
              data={images}
              renderItem={renderListImage}
              keyExtractor={(item) => item.id}
              numColumns={1}
              key="list" 
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#1e88e5"
                  colors={['#1e88e5']}
                />
              }
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={9}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Darker background for better contrast
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    backgroundColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  gridContainer: {
    padding: 8,
  },
  listContainer: {
    padding: 8,
  },
  imageContainer: {
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    margin: 4,
    overflow: 'hidden',
    width: ITEM_SIZE,
    height: ITEM_SIZE + 40, // Extra height for footer
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  thumbnail: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  imageFooter: {
    padding: 6,
    height: 40,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
  selectedImageContainer: {
    borderWidth: 3,
    borderColor: '#1e88e5', // Material blue
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(30, 136, 229, 0.3)',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  checkmarkSelected: {
    backgroundColor: '#1e88e5', // Material blue
  },
  checkmarkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#f44336', // Material red
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  
  // List view styles
  listItemContainer: {
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    margin: 4,
    marginBottom: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  listThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  listItemDetails: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  listItemDate: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  listCheckmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(30, 136, 229, 0.3)',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});