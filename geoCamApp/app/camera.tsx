import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Animated, 
  Platform,
  BackHandler,
  NativeEventSubscription
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { saveImageToGallery } from '../utils/galleryStorage';
import { getStoredSecp256k1KeyPair } from '../utils/secp256k1Utils';
import { getStoredGeoCamDeviceName, processGeoCamImageBackend, completeGeoCamImageBackend, signImagePurePng } from '../utils/backendService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CircularProgress from '../components/CircularProgress';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  // Zoom functionality
  const [zoom, setZoom] = useState(0);
  // Timer functionality
  const [timerDuration, setTimerDuration] = useState(0); // 0 = off, 3 = 3 seconds, 10 = 10 seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerCountdown, setTimerCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [webViewHtml, setWebViewHtml] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const webViewRef = useRef<WebView | null>(null);
  
  type KeyMetadata = {
    fingerprint?: string;
    [key: string]: any;
  };

  type KeyPair = {
    publicKey: any;
    privateKey: any;
    metadata?: KeyMetadata;
    [key: string]: any;
  };

  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  
  // State for current steganography workflow
  const [currentBasicDataStr, setCurrentBasicDataStr] = useState<string | null>(null);
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);
  const [currentPhotoBase64, setCurrentPhotoBase64] = useState<string | null>(null);
  
  // Preview animation
  const previewScale = useRef(new Animated.Value(1)).current;
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [accelerateProgress, setAccelerateProgress] = useState(false);
  
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
  // Add a pulsing animation to the preview thumbnail when a new photo is taken
  useEffect(() => {
    if (lastPhoto) {
      Animated.sequence([
        Animated.timing(previewScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(previewScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
      ]).start();
    }
  }, [lastPhoto]);

  useEffect(() => {
    return () => {
      // Clean up progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      // Clean up timer interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!permission) {
        await requestPermission();
      }
      if (!mediaPermission) {
        await requestMediaPermission();
      }
      if(!locationPermission) {
        await requestLocationPermission();
      }
    })();
  }, [permission, mediaPermission, locationPermission]);

  // Separate useEffect for loading keys - only runs once on mount
  useEffect(() => {
    loadExistingKeys();
  }, []); // Empty dependency array means it only runs once on mount

  // Hardware Button Camera Control
  /**
   * Volume Button Camera Capture
   * 
   * NOTE: This is a placeholder for native functionality that would require:
   * - iOS: Native module to capture volume button events
   * - Android: JNI integration to capture KeyEvent.KEYCODE_VOLUME_UP
   * 
   * True hardware volume button support requires native code integration,
   * which is beyond the scope of this JavaScript/TypeScript implementation.
   * 
   * No UI hints are shown for this functionality since it requires native code.
   */

  const loadExistingKeys = async () => {
    setIsLoadingKeys(true);
    try {
      // Load existing keys from storage
      const storedKeyPair = await getStoredSecp256k1KeyPair();
      if (storedKeyPair) {
        setKeyPair(storedKeyPair);
        console.log('🔑 Loaded existing keys from storage');
        if ('metadata' in storedKeyPair && storedKeyPair.metadata && typeof storedKeyPair.metadata === 'object' && 'fingerprint' in storedKeyPair.metadata) {
          console.log('🔑 Key fingerprint:', (storedKeyPair.metadata as KeyMetadata).fingerprint);
        }
      } else {
        console.error('❌ No keys found! Keys should have been generated in main menu.');
        console.log('🔄 Try returning to main menu to reinitialize keys');
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
    setIsLoadingKeys(false);
  };

  if (!permission || !mediaPermission || !locationPermission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Loading camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted || !mediaPermission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>We need your permission to show the camera and save photos</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.buttonBackground }]} 
          onPress={async () => {
            await requestPermission();
            await requestMediaPermission();
            if (!locationPermission || !locationPermission.granted) {
              await requestLocationPermission();
            }
          }}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };
  
  const cycleTimer = () => {
    // Cancel any active timer
    if (isTimerActive && timerRef.current) {
      clearInterval(timerRef.current);
      setIsTimerActive(false);
      setTimerCountdown(0);
    }
    
    // Cycle through timer options: 0 (off) -> 3 seconds -> 10 seconds -> 0 (off)
    setTimerDuration(current => {
      switch (current) {
        case 0: return 3;
        case 3: return 10;
        case 10: return 0;
        default: return 0;
      }
    });
  };
  
  const adjustZoom = (increment: boolean) => {
    setZoom(currentZoom => {
      // Adjust zoom by 0.1 increments within range 0-1
      const newZoom = increment 
        ? Math.min(1, currentZoom + 0.1) 
        : Math.max(0, currentZoom - 0.1);
      return parseFloat(newZoom.toFixed(1)); // Fix to 1 decimal place
    });
  };

  const takePictureWithTimer = () => {
    if (timerDuration > 0 && !isTimerActive) {
      // Start the timer countdown
      setIsTimerActive(true);
      setTimerCountdown(timerDuration);
      
      // Set up the countdown interval
      timerRef.current = setInterval(() => {
        setTimerCountdown(prev => {
          if (prev <= 1) {
            // Timer completed, take the picture
            clearInterval(timerRef.current!);
            setIsTimerActive(false);
            takePicture();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isTimerActive) {
      // No timer selected, take picture immediately
      takePicture();
    }
  };
  
  const takePicture = async () => {
    if (!cameraRef.current || isEncoding || !keyPair) return;

    setIsEncoding(true);
    startFakeProgress(2800); // 2.8 seconds fake progress
    
    try {
      console.log('🎯 Starting GeoCam image capture and signing...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
        exif: true,
        skipProcessing: false,
      });

      if (!photo.base64) {
        console.error('Failed to get base64 data from photo');
        setIsEncoding(false);
        return;
      }
      
      let locData = null;
      if (locationPermission && locationPermission.granted) {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          locData = loc.coords;
          console.log('📍 Location data retrieved:', locData);
        } catch (locationError) {
          console.error('Failed to get location:', locationError);
        }
      } else {
        console.log('Location permission not granted');
      }

      // Get GeoCam device name
      const geocamDeviceName = await getStoredGeoCamDeviceName();
      console.log('📱 Retrieved GeoCam device name:', geocamDeviceName);

      // Prepare the basic data
      const basicData = {
        deviceModel: Device.modelName,
        Time: new Date().toLocaleString(),
        location: locData ? { 
          latitude: locData.latitude, 
          longitude: locData.longitude,
          accuracy: locData.accuracy || undefined,
          altitude: locData.altitude || undefined
        } : null,
        geocamDevice: geocamDeviceName || 'Unknown',
      };

      console.log('📝 Prepared basic data for encoding:', basicData);
      const basicDataStr = JSON.stringify(basicData);
      
      console.log('📤 Sending image for processing and signing...');
      
      const signResult = await signImagePurePng(
        photo.base64,
        basicDataStr,
        keyPair!.publicKey.keyBase64,
        keyPair!.privateKey.keyBase64
      );
      
      if (!signResult.success) {
        console.error('❌ Image signing failed:', signResult.error);
        setIsEncoding(false);
        return;
      }
      
      console.log('✅ Image signing completed');
      console.log('📊 Processing stats:', signResult.stats);
      
      // Save final PNG to device
      console.log('💾 Saving signed image to device...');
      const fileName = `geocam-pure-png-${Date.now()}.png`;
      const filePath = FileSystem.documentDirectory 
        ? FileSystem.documentDirectory + fileName
        : null;

      if (!filePath) {
        throw new Error('Could not access document directory');
      }
      
      await FileSystem.writeAsStringAsync(filePath, signResult.pngBase64!, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Save to gallery storage
      const galleryData = {
        uri: filePath,
        encodedInfo: basicDataStr,
        signature: 'pure-png-embedded',
        publicKey: keyPair!.publicKey.keyBase64,
        timestamp: Date.now(),
      };
      
      try {
        await saveImageToGallery(galleryData);
        console.log('💾 Final image saved to gallery storage');
        setLastPhoto(filePath);
        
        // Complete progress immediately when done
        completeProgress();
        
        // Log the file path for debugging
        console.log('📁 Image file path:', filePath);
        
        // No longer automatically navigating to image detail
        // User needs to tap the preview thumbnail to see the image
      } catch (galleryError) {
        console.error('Failed to save to gallery storage:', galleryError);
      }

    } catch (error) {
      console.error('Failed to take picture or process with pure PNG:', error);
      completeProgress();
    } finally {
      setIsEncoding(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    const messageData = JSON.parse(event.nativeEvent.data);
    console.log('📨 WebView message received:', messageData.type);
    
    if (messageData.type === 'requestSignatureForOneCanvasRGBA') {
      // NEW: Handle RGBA-based signature request
      const { rgbaBase64ForSigning, basicInfo, publicKey, privateKey, callbackId, imageWidth, imageHeight } = messageData;
      
      try {
        console.log('🔐 React Native: Computing SHA-512 hash for RGBA data (NEW METHOD)...');
        console.log('📊 RGBA data size:', rgbaBase64ForSigning.length, 'chars');
        console.log('📊 Image dimensions:', imageWidth, 'x', imageHeight);
        console.log('🎯 This avoids all PNG compatibility issues!');
        
        // Hash the RGBA data directly using React Native crypto
        const rgbaHash = await require('expo-crypto').digestStringAsync(
          require('expo-crypto').CryptoDigestAlgorithm.SHA512,
          rgbaBase64ForSigning,
          { encoding: require('expo-crypto').CryptoEncoding.HEX }
        );
        
        console.log('✅ SHA-512 hash computed from RGBA data:', rgbaHash.length, 'chars');
        console.log('🔐 RGBA Hash preview:', rgbaHash.substring(0, 16) + '...');
        
        // Sign the RGBA hash using secp256k1
        const { secp256k1 } = await import('@noble/curves/secp256k1');
        const dataToSign = new TextEncoder().encode(rgbaHash);
        const privateKeyBytes = new Uint8Array(
          atob(privateKey).split('').map(c => c.charCodeAt(0))
        );
        
        const signature = secp256k1.sign(dataToSign, privateKeyBytes);
        const signatureBase64 = btoa(
          String.fromCharCode(...signature.toCompactRawBytes())
        );
        
        console.log('✅ RGBA data signed with secp256k1 in React Native');
        console.log('🔐 Signature length:', signatureBase64.length);
        console.log('🎯 This signature is based on RGBA data!');
        
        setCurrentSignature(signatureBase64);
        
        // Continue the workflow in THE SAME WebView by calling the completion function
        console.log('🔄 Continuing workflow in THE SAME canvas (RGBA method)...');
        
        // Inject JavaScript to complete the workflow in the same WebView
        if (webViewRef && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof window.completeOneCanvasWorkflow === 'function') {
              window.completeOneCanvasWorkflow('${signatureBase64}', '${publicKey}');
            } else {
              console.error('completeOneCanvasWorkflow function not found');
            }
          `);
        }
        
      } catch (error) {
        console.error('❌ Failed to hash and sign RGBA data in React Native:', error);
        setWebViewHtml(null);
        setIsEncoding(false);
      }
      
    } else if (messageData.type === 'requestSignatureForOneCanvas') {
      // Handle PNG-based signature request with secp256k1
      const { pngBase64ForSigning, basicInfo, publicKey, privateKey, callbackId } = messageData;
      
      try {
        console.log('🔐 React Native: Computing SHA-512 hash for PNG...');
        console.log('📊 PNG for signing size:', pngBase64ForSigning.length, 'chars');
        
        // Hash the PNG with basic data using React Native crypto
        const imageHash = await require('expo-crypto').digestStringAsync(
          require('expo-crypto').CryptoDigestAlgorithm.SHA512,
          pngBase64ForSigning,
          { encoding: require('expo-crypto').CryptoEncoding.HEX }
        );
        
        console.log('✅ SHA-512 hash computed:', imageHash.length, 'chars');
        
        // Sign the hash using secp256k1
        const { secp256k1 } = await import('@noble/curves/secp256k1');
        const dataToSign = new TextEncoder().encode(imageHash);
        const privateKeyBytes = new Uint8Array(
          atob(privateKey).split('').map(c => c.charCodeAt(0))
        );
        
        const signature = secp256k1.sign(dataToSign, privateKeyBytes);
        const signatureBase64 = btoa(
          String.fromCharCode(...signature.toCompactRawBytes())
        );
        
        console.log('✅ PNG signed with secp256k1 in React Native');
        console.log('🔐 Signature length:', signatureBase64.length);
        
        setCurrentSignature(signatureBase64);
        
        // Continue the workflow in THE SAME WebView by calling the completion function
        console.log('🔄 Continuing workflow in THE SAME canvas...');
        
        // Inject JavaScript to complete the workflow in the same WebView
        if (webViewRef && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof window.completeOneCanvasWorkflow === 'function') {
              window.completeOneCanvasWorkflow('${signatureBase64}', '${publicKey}');
            } else {
              console.error('completeOneCanvasWorkflow function not found');
            }
          `);
        }
        
      } catch (error) {
        console.error('❌ Failed to hash and sign PNG in React Native:', error);
        setWebViewHtml(null);
        setIsEncoding(false);
      }
      
    } else if (messageData.type === 'oneCanvasComplete') {
      // Handle completion from the TRUE ONE CANVAS workflow
      setWebViewHtml(null);
      
      const { finalPngBase64, width, height, basicInfo, signature, publicKey } = messageData;
      
      try {
        console.log('🎉 === TRUE ONE CANVAS GEOCAM WORKFLOW COMPLETED ===');
        console.log('✅ Step 1: JPEG → Canvas (alpha channel added)');
        console.log('✅ Step 2: Basic data encoded (exclude last row)');
        console.log('✅ Step 3: PNG for signature created');
        console.log('✅ Step 4: Signature generated in React Native');
        console.log('✅ Step 5: Signature encoded to last row (SAME CANVAS)');
        console.log('✅ Step 6: Final PNG created (SAME CANVAS)');
        console.log('🎯 TRUE ONE CANVAS WORKFLOW COMPLETED!');
        
        console.log('📊 Final image dimensions:', width, 'x', height);
        console.log('📊 Final PNG base64 length:', finalPngBase64.length);
        
        // Save the final PNG to device
        const filename = FileSystem.cacheDirectory + `geocam-${Date.now()}.png`;
        
        await FileSystem.writeAsStringAsync(filename, finalPngBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Save to MediaLibrary 
        const asset = await MediaLibrary.saveToLibraryAsync(filename);
        setLastPhoto(filename);
        
        console.log('📱 MediaLibrary saveToLibraryAsync result:', asset);
        console.log('📁 ONE CANVAS image path:', filename);
        
        // Save to gallery storage
        const galleryData = {
          uri: filename,
          encodedInfo: currentBasicDataStr || '',
          signature: currentSignature || '',
          publicKey: keyPair!.publicKey.keyBase64,
          timestamp: Date.now(),
        };
        
        try {
          await saveImageToGallery(galleryData);
          console.log('💾 Final image saved to gallery storage');
          
          // No longer automatically navigating to image detail
          // User needs to tap the preview thumbnail to see the image
        } catch (galleryError) {
          console.error('Failed to save to gallery storage:', galleryError);
        }
        
        console.log('🎉 === TRUE ONE CANVAS WORKFLOW COMPLETED ===');
        console.log('✅ Image with encoded data saved successfully');
                   
                 } catch (error) {
        console.error('❌ Failed to save final image:', error);
      }
      
        setIsEncoding(false);
      
    } else if (messageData.type === 'signingComplete') {
      // Handle completion from the signing workflow
      setWebViewHtml(null);
      
      const { finalPngBase64, width, height } = messageData;
      
      try {
        console.log('🎉 === CORRECT GEOCAM WORKFLOW COMPLETED ===');
        console.log('📷 Step 1: JPEG → Canvas (alpha channel added)');
        console.log('📝 Step 2: Basic data encoded (exclude last row)');
        console.log('🔗 Step 3: PNG for signature created');
        console.log('🔐 Step 4: Signature generated in React Native');
        console.log('📝 Step 5: Signature encoded to last row');
        console.log('🖼️ Step 6: Final PNG created');
        console.log('✅ CORRECT WORKFLOW COMPLETED!');
        
        console.log('📊 Final image dimensions:', width, 'x', height);
        console.log('📊 Final PNG base64 length:', finalPngBase64.length);
        
        // Save the final PNG to device
        const filename = FileSystem.cacheDirectory + `geocam-${Date.now()}.png`;
        
        await FileSystem.writeAsStringAsync(filename, finalPngBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Save to MediaLibrary 
        const asset = await MediaLibrary.saveToLibraryAsync(filename);
        setLastPhoto(filename);
        
        console.log('📱 MediaLibrary saveToLibraryAsync result:', asset);
        console.log('📁 CORRECT WORKFLOW image path:', filename);
        
        // Save to gallery storage
        const galleryData = {
          uri: filename,
          encodedInfo: currentBasicDataStr || '',
          signature: currentSignature || '',
          publicKey: keyPair!.publicKey.keyBase64,
          timestamp: Date.now(),
        };
        
        try {
          await saveImageToGallery(galleryData);
          console.log('💾 Final image saved to gallery storage');
          
          // No longer automatically navigating to image detail
          // User needs to tap the preview thumbnail to see the image
        } catch (galleryError) {
          console.error('Failed to save to gallery storage:', galleryError);
        }
        
        console.log('🎉 === GEOCAM CORRECT WORKFLOW COMPLETED ===');
        console.log('✅ Image with encoded data saved successfully');
        
      } catch (error) {
        console.error('❌ Failed to save final image:', error);
        }
        
        setIsEncoding(false);
      
    } else if (messageData.type === 'correctSigningComplete') {
      // Also handle the correctSigningComplete message type (if it exists)
      setWebViewHtml(null);
      
      const { finalPngBase64, width, height, basicInfo, signature, publicKey } = messageData;
      
      try {
        console.log('🎉 === CORRECT GEOCAM WORKFLOW COMPLETED ===');
        
        // Save the final PNG to device
        const filename = FileSystem.cacheDirectory + `geocam-${Date.now()}.png`;
        
        await FileSystem.writeAsStringAsync(filename, finalPngBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const asset = await MediaLibrary.saveToLibraryAsync(filename);
        setLastPhoto(filename);
        console.log('📁 CORRECT SIGNING image path:', filename);
        
        // Save to gallery storage
        const galleryData = {
          uri: filename,
          encodedInfo: currentBasicDataStr || '',
          signature: currentSignature || '',
          publicKey: keyPair!.publicKey.keyBase64,
          timestamp: Date.now(),
        };
        
        try {
          await saveImageToGallery(galleryData);
          console.log('💾 Final image saved to gallery storage');
          
          // No longer automatically navigating to image detail
          // User needs to tap the preview thumbnail to see the image
        } catch (galleryError) {
          console.error('Failed to save to gallery storage:', galleryError);
        }
        
        console.log('🎉 === GEOCAM CORRECT WORKFLOW COMPLETED ===');
        console.log('✅ Image with encoded data saved successfully');
                   
                 } catch (error) {
        console.error('❌ Failed to save final image:', error);
      }
      
        setIsEncoding(false);
      
    } else if (messageData.type === 'error') {
      console.error('❌ WebView workflow error:', messageData.error);
      setWebViewHtml(null);
    setIsEncoding(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        flash={flash}
        zoom={zoom}
        onCameraReady={() => console.log('Camera ready for capture')}
      />

      {/* Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity 
            style={styles.topBarButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.topBarControls}>
          {/* Flash Button */}
          <TouchableOpacity 
            style={styles.topBarButton} 
            onPress={toggleFlash}
          >
            <Ionicons 
              name={
                flash === 'on'
                  ? 'flash'
                  : flash === 'auto'
                  ? 'flash-outline'
                  : 'flash-off'
              }
              size={24}
              color="white"
            />
            {flash === 'auto' && (
              <Text style={{ color: 'white', fontSize: 10, position: 'absolute', bottom: 2, right: 2 }}>A</Text>
            )}
          </TouchableOpacity>
          
          {/* Timer Button */}
          <TouchableOpacity 
            style={styles.topBarButton} 
            onPress={cycleTimer}
          >
            <Ionicons name="timer-outline" size={24} color="white" />
            {timerDuration > 0 && (
              <Text style={styles.timerBadge}>
                {timerDuration}s
              </Text>
            )}
          </TouchableOpacity>

          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={() => adjustZoom(true)}
              disabled={zoom >= 1}
            >
              <Ionicons name="add" size={18} color={zoom >= 1 ? "gray" : "white"} />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={() => adjustZoom(false)}
              disabled={zoom <= 0}
            >
              <Ionicons name="remove" size={18} color={zoom <= 0 ? "gray" : "white"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Gallery Icon */}
        <TouchableOpacity
          style={styles.sideIconButton}
          onPress={() => router.push('/gallery')}
        >
          <Ionicons name="images" size={34} color="#fff" />
        </TouchableOpacity>

        {/* Take Photo Button */}
        <TouchableOpacity 
          style={styles.takePhotoButton} 
          onPress={takePictureWithTimer}
          disabled={!keyPair || isLoadingKeys || isEncoding || isTimerActive}
        >
          <View style={styles.captureButtonOuter}>
            {isTimerActive ? (
              <Text style={styles.timerCountdown}>{timerCountdown}</Text>
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </View>
        </TouchableOpacity>

        {/* Camera Flip Button */}
        <TouchableOpacity 
          style={styles.flipButton} 
          onPress={toggleCameraType}
        >
          <Ionicons name="camera-reverse" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Preview Image */}
      {lastPhoto && (
        <TouchableOpacity 
          style={styles.preview}
          onPress={() => {
            console.log('Opening image in details view');
            const encodedUri = encodeURIComponent(lastPhoto);
            console.log('📁 Opening preview image with path:', lastPhoto);
            console.log('📁 Encoded URI:', encodedUri);
            
            // Create pulse animation when pressed
            Animated.sequence([
              Animated.timing(previewScale, {
                toValue: 0.92,
                duration: 100,
                useNativeDriver: true
              }),
              Animated.timing(previewScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true
              })
            ]).start(() => {
              // Navigate to image detail with the encoded URI
              router.push({
                pathname: '/image-detail',
                params: { imageUri: encodedUri }
              });
            });
          }}
          onPressIn={() => {
            Animated.timing(previewScale, {
              toValue: 0.95,
              duration: 100,
              useNativeDriver: true
            }).start();
          }}
          onPressOut={() => {
            Animated.timing(previewScale, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true
            }).start();
          }}
        >
          <Animated.View style={{ transform: [{ scale: previewScale }], flex: 1 }}>
            <Image
              source={{ uri: lastPhoto }}
              style={styles.previewImage}
            />
            <View style={styles.previewOverlay}>
              <Ionicons name="image" size={14} color="white" style={{ marginRight: 3 }} />
              <Ionicons name="chevron-forward-outline" size={12} color="white" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Loading Indicator */}
      {isEncoding && (
        <View style={styles.loadingOverlay}>
          <CircularProgress 
            progress={progress} 
            acceleratedCompletion={accelerateProgress}
          />
        </View>
      )}

      {/* WebView */}
      {webViewHtml && (
        <View style={styles.hiddenWebViewContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: webViewHtml, baseUrl: '' }}
            onMessage={handleWebViewMessage}
            style={styles.webViewContent}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadStart={() => {
              console.log('🌐 WebView loading started...');
            }}
            onLoadEnd={() => {
              console.log('🌐 WebView loading completed');
            }}
            onError={(syntheticEvent) => {
              const {nativeEvent} = syntheticEvent;
              console.error('❌ WebView error: ', nativeEvent);
              setIsEncoding(false);
              setWebViewHtml(null);
            }}
            onHttpError={(syntheticEvent) => {
              const {nativeEvent} = syntheticEvent;
              console.error('❌ WebView HTTP error: ', nativeEvent);
            }}
            onContentProcessDidTerminate={() => {
              console.error('❌ WebView content process terminated');
              setIsEncoding(false);
              setWebViewHtml(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  topBarControls: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  timerBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 120, 255, 0.7)',
    borderRadius: 7,
    width: 14,
    height: 14,
    textAlign: 'center',
    lineHeight: 14,
  },
  zoomControls: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingVertical: 6,
    marginTop: 4,
    width: 40,
  },
  zoomButton: {
    width: 28,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  sideIconButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(40,40,40,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takePhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    opacity: 0.3,
  },
  timerCountdown: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  flipButton: {
    backgroundColor: 'rgba(40,40,40,0.5)',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    position: 'absolute',
    left: 20,
    bottom: 120,
    width: 54,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenWebViewContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    top: -3000,
    left: -3000,
    overflow: 'hidden',
  },
  webViewContent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
  hardwareButtonHint: {
    display: 'none', // Hide this element
  },
  hardwareButtonText: {
    display: 'none', // Hide this element
  },
  hintButton: {
    display: 'none', // Hide this element
  },
  hintButtonText: {
    display: 'none', // Hide this element
  },
});