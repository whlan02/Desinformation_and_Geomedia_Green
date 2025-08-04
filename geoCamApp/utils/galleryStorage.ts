import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GalleryImage {
  id: string;
  uri: string;
  encodedInfo: string;
  timestamp: number;
  thumbnailUri?: string;
  signature?: string;
  publicKey?: string;
}

const GALLERY_STORAGE_KEY = 'geocam_gallery_images';

export const saveImageToGallery = async (imageData: Omit<GalleryImage, 'id'>): Promise<void> => {
  try {
    const existingImages = await getGalleryImages();
    const newImage: GalleryImage = {
      ...imageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    const updatedImages = [newImage, ...existingImages];
    await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(updatedImages));
  } catch (error) {
    console.error('Error saving image to gallery:', error);
    throw error;
  }
};

export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const imagesJson = await AsyncStorage.getItem(GALLERY_STORAGE_KEY);
    return imagesJson ? JSON.parse(imagesJson) : [];
  } catch (error) {
    console.error('Error retrieving gallery images:', error);
    return [];
  }
};

export const deleteImageFromGallery = async (imageId: string): Promise<void> => {
  try {
    const existingImages = await getGalleryImages();
    const filteredImages = existingImages.filter(img => img.id !== imageId);
    await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(filteredImages));
  } catch (error) {
    console.error('Error deleting image from gallery:', error);
    throw error;
  }
};

