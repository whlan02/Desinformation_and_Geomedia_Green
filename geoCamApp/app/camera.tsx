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
  NativeEventSubscription,
  Vibration,
  Modal
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { saveImageToGallery } from '../utils/galleryStorage';
import { signHashWithSecp256k1, getSecureKeysForRegistration } from '../utils/secp256k1Utils';
import { getStoredGeoCamDeviceName, processGeoCamImageBackend, completeGeoCamImageBackend } from '../utils/backendService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CircularProgress from '../components/CircularProgress';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useBackHandler } from '@react-native-community/hooks';
import { useVolumeButtons } from '../utils/volumeButtonHandler';

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
  const baseZoom = useRef(0);
  const pinchScale = useRef(new Animated.Value(1)).current;
  
  // Predefined zoom levels
  const ZOOM_LEVELS = [0, 0.25, 0.5, 0.75, 1.0];
  const [currentZoomIndex, setCurrentZoomIndex] = useState(0);
  
  // Timer functionality
  const [timerDuration, setTimerDuration] = useState(0); // 0 = off, 3 = 3 seconds, 10 = 10 seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerCountdown, setTimerCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isEncoding, setIsEncoding] = useState(false);
  
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
  
  // Preview animation
  const previewScale = useRef(new Animated.Value(1)).current;
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [accelerateProgress, setAccelerateProgress] = useState(false);
  
  // New state for enhanced features
  const [showSettings, setShowSettings] = useState(false);
  const [gridLines, setGridLines] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('4:3');
  const [quality, setQuality] = useState<0.8 | 1>(1);
  
  // Animation values
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const captureAnimation = useRef(new Animated.Value(1)).current;
  
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

  // Volume button capture functionality
  useBackHandler(() => {
    // Don't prevent back navigation
    return false;
  });

  const { startListening, stopListening, simulatePress } = useVolumeButtons(() => {
    console.log('📸 Volume button pressed - taking photo');
    takePictureWithTimer();
  });

  // Volume button event listeners
  useEffect(() => {
    // Start listening for volume button events when component mounts
    startListening();

    return () => {
      // Stop listening when component unmounts
      stopListening();
    };
  }, [startListening, stopListening]);

  // Pinch gesture handlers
  const onPinchGestureEvent = (event: any) => {
    const scale = event.nativeEvent.scale;
    const newZoom = Math.min(Math.max(baseZoom.current + (scale - 1) * 0.5, 0), 1);
    setZoom(newZoom);
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      baseZoom.current = zoom;
      pinchScale.setValue(1);
    }
  };

  // Tap to focus functionality
  const handleCameraTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate focus ring
    focusAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(focusAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(focusAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPoint(null);
    });
  };

  // Double tap to reset zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = (event: any) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      // Double tap detected - reset zoom
      setZoom(0);
      baseZoom.current = 0;
      setCurrentZoomIndex(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      // Single tap - focus
      handleCameraTouch(event);
    }
    lastTap.current = now;
  };

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
      console.log('🔑 Loading keys for camera...');
      
      // Try to load secure keys first (new system), then fall back to old system
      let keyPair = await getSecureKeysForRegistration();
      if (keyPair) {
        console.log('✅ Loaded secure keys (new system)');
        setKeyPair(keyPair);
        if (keyPair.fingerprint) {
          console.log('🔑 Key fingerprint:', keyPair.fingerprint);
        }
      } else {
        console.error('❌ No secure keys found! Keys should have been generated in main menu.');
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoom(currentZoom => {
      // Adjust zoom by 0.1 increments within range 0-1
      const newZoom = increment 
        ? Math.min(1, currentZoom + 0.1) 
        : Math.max(0, currentZoom - 0.1);
      return parseFloat(newZoom.toFixed(1)); // Fix to 1 decimal place
    });
  };

  const setZoomToLevel = (level: number) => {
    const clampedLevel = Math.max(0, Math.min(1, level));
    setZoom(clampedLevel);
    baseZoom.current = clampedLevel;
    
    // Update current zoom index
    const closestIndex = ZOOM_LEVELS.reduce((closest, current, index) => {
      return Math.abs(current - clampedLevel) < Math.abs(ZOOM_LEVELS[closest] - clampedLevel) ? index : closest;
    }, 0);
    setCurrentZoomIndex(closestIndex);
  };

  const cyclePredefinedZoom = (forward: boolean) => {
    const newIndex = forward 
      ? (currentZoomIndex + 1) % ZOOM_LEVELS.length
      : (currentZoomIndex - 1 + ZOOM_LEVELS.length) % ZOOM_LEVELS.length;
    
    setCurrentZoomIndex(newIndex);
    setZoomToLevel(ZOOM_LEVELS[newIndex]);
  };

  const takePictureWithTimer = () => {
    if (timerDuration > 0 && !isTimerActive) {
      // Start the timer countdown
      setIsTimerActive(true);
      setTimerCountdown(timerDuration);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
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
          // Haptic feedback for countdown
          if (prev <= 3) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

    // Capture animation and haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(captureAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(captureAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    setIsEncoding(true);
    startFakeProgress(10000); // 10 seconds fake progress
    
    try {
      console.log('🎯 Starting GeoCam image capture and signing...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: quality,
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
      
      console.log('📤 Step 1: Sending image to backend for processing...');
      
      // Step 1: Send image + metadata to backend, get hash to sign
      const processResult = await processGeoCamImageBackend(
        photo.base64,
        basicDataStr,
        keyPair!.publicKey.keyBase64
      );
      
      if (!processResult.success) {
        console.error('❌ Backend processing failed:', processResult.error);
        setIsEncoding(false);
        return;
      }
      
      console.log('✅ Step 1 completed - received hash to sign');
      console.log('🔐 Hash to sign:', processResult.hashToSign?.substring(0, 16) + '...');
      
      // Step 2: Sign the hash using mobile app's private key
      console.log('🔐 Step 2: Signing hash with device private key...');
      const signatureBase64 = await signHashWithSecp256k1(
        processResult.hashToSign!,
        keyPair!.privateKey.keyBase64
      );
      
      console.log('✅ Signature generated on device');
      console.log('🔐 Signature length:', signatureBase64.length);
      
      // Step 3: Send signature back to backend for final assembly
      console.log('📤 Step 3: Sending signature to backend for final assembly...');
      const completeResult = await completeGeoCamImageBackend(
        processResult.sessionId!,
        signatureBase64
      );
      
      if (!completeResult.success) {
        console.error('❌ Final assembly failed:', completeResult.error);
        setIsEncoding(false);
        return;
      }
      
      console.log('✅ Complete workflow finished');
      console.log('📊 Processing stats:', completeResult.stats);
      
      // Save final PNG to device
      console.log('💾 Saving signed image to device...');
      const fileName = `geocam-pure-png-${Date.now()}.png`;
      const filePath = FileSystem.documentDirectory 
        ? FileSystem.documentDirectory + fileName
        : null;

      if (!filePath) {
        throw new Error('Could not access document directory');
      }
      
      await FileSystem.writeAsStringAsync(filePath, completeResult.pngBase64!, {
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
      console.error('Failed to take picture or process with backend:', error);
      completeProgress();
    } finally {
      setIsEncoding(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <PinchGestureHandler
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <Animated.View style={[styles.cameraContainer, { transform: [{ scale: captureAnimation }] }]}>
          <TouchableOpacity 
            style={styles.camera} 
            onPress={handleDoubleTap}
            activeOpacity={1}
          >
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={type}
              flash={flash}
              zoom={zoom}
              onCameraReady={() => console.log('Camera ready for capture')}
            />
          </TouchableOpacity>
          
          {/* Grid Lines Overlay */}
          {gridLines && (
            <View style={styles.gridOverlay}>
              <View style={[styles.gridLine, styles.gridLineVertical, { left: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineVertical, { left: '66.66%' }]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '66.66%' }]} />
            </View>
          )}
          
          {/* Focus Point Indicator */}
          {focusPoint && (
            <Animated.View
              style={[
                styles.focusIndicator,
                {
                  left: focusPoint.x - 25,
                  top: focusPoint.y - 25,
                  opacity: focusAnimation,
                  transform: [{ scale: focusAnimation }],
                },
              ]}
            >
              <View style={styles.focusRing} />
            </Animated.View>
          )}
        </Animated.View>
      </PinchGestureHandler>

      {/* Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.topBarButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={28} color={isDark ? "white" : "white"} />
        </TouchableOpacity>
        
        {/* Control Buttons - Horizontal Layout */}
        <View style={styles.topBarControls}>
          {/* Settings Button */}
          <TouchableOpacity 
            style={[styles.topBarButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
          >
            <Ionicons name="settings-outline" size={24} color={isDark ? "white" : "white"} />
          </TouchableOpacity>

          {/* Flash Button */}
          <TouchableOpacity 
            style={[styles.topBarButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]} 
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
              color={isDark ? "white" : "white"}
            />
            {flash === 'auto' && (
              <Text style={styles.autoFlashIndicator}>A</Text>
            )}
          </TouchableOpacity>
          
          {/* Timer Button */}
          <TouchableOpacity 
            style={[styles.topBarButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]} 
            onPress={cycleTimer}
          >
            <Ionicons name="timer-outline" size={24} color={isDark ? "white" : "white"} />
            {timerDuration > 0 && (
              <Text style={styles.timerBadge}>
                {timerDuration}s
              </Text>
            )}
          </TouchableOpacity>

          {/* Zoom Controls */}
          <View style={[styles.zoomControls, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]}>
            <TouchableOpacity 
              style={[styles.zoomButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' }]} 
              onPress={() => adjustZoom(false)}
            >
              <Ionicons name="remove" size={12} color={isDark ? "white" : "white"} />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: isDark ? "white" : "white" }]}>{zoom.toFixed(1)}x</Text>
            <TouchableOpacity 
              style={[styles.zoomButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' }]} 
              onPress={() => adjustZoom(true)}
            >
              <Ionicons name="add" size={12} color={isDark ? "white" : "white"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Zoom Level Indicator */}
      {zoom > 0 && (
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomIndicatorText}>{zoom.toFixed(1)}x</Text>
        </View>
      )}

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: 'transparent' }]}>
        {/* Gallery Icon - Left Side */}
        <TouchableOpacity
          style={[styles.sideIconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/gallery');
          }}
        >
          <Ionicons name="images" size={28} color={isDark ? "white" : "white"} />
        </TouchableOpacity>

        {/* Take Photo Button - Center */}
        <TouchableOpacity 
          style={styles.takePhotoButton} 
          onPress={takePictureWithTimer}
          disabled={!keyPair || isLoadingKeys || isEncoding || isTimerActive}
        >
          <View style={[styles.captureButtonOuter, { borderColor: isDark ? 'white' : 'white' }]}>
            {isTimerActive ? (
              <Text style={[styles.timerCountdown, { color: isDark ? 'white' : 'white' }]}>{timerCountdown}</Text>
            ) : (
              <View style={[styles.captureButtonInner, { backgroundColor: isDark ? 'white' : 'white' }]} />
            )}
          </View>
        </TouchableOpacity>

        {/* Camera Flip Button - Right Side */}
        <TouchableOpacity 
          style={[styles.flipButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)' }]} 
          onPress={toggleCameraType}
        >
          <Ionicons name="camera-reverse" size={28} color={isDark ? "white" : "white"} />
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
            estimatedDuration={10000}
            showPercentage={true}
            showTimeRemaining={true}
            message="Capturing..."
          />
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Camera Settings</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSettings(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsContainer}>
              {/* Grid Lines Toggle */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Grid Lines</Text>
                <TouchableOpacity
                  style={[styles.toggle, gridLines && { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGridLines(!gridLines);
                  }}
                >
                  <View style={[styles.toggleKnob, gridLines && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              {/* Image Quality */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Image Quality</Text>
                <View style={styles.qualityButtons}>
                  <TouchableOpacity
                    style={[styles.qualityButton, quality === 0.8 && { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuality(0.8);
                    }}
                  >
                    <Text style={[styles.qualityButtonText, { color: quality === 0.8 ? 'white' : colors.text }]}>Standard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.qualityButton, quality === 1 && { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuality(1);
                    }}
                  >
                    <Text style={[styles.qualityButtonText, { color: quality === 1 ? 'white' : colors.text }]}>High</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Aspect Ratio */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Aspect Ratio</Text>
                <View style={styles.aspectRatioButtons}>
                  {(['16:9', '4:3', '1:1'] as const).map((ratio) => (
                    <TouchableOpacity
                      key={ratio}
                      style={[styles.aspectButton, aspectRatio === ratio && { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAspectRatio(ratio);
                      }}
                    >
                      <Text style={[styles.aspectButtonText, { color: aspectRatio === ratio ? 'white' : colors.text }]}>
                        {ratio}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
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
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoFlashIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoomText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 6,
    minWidth: 25,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sideIconButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  zoomPresetButton: {
    backgroundColor: 'rgba(40,40,40,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomPresetText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  zoomControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,40,40,0.8)',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  zoomDisplayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  zoomIndicator: {
    position: 'absolute',
    top: '50%',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 5,
  },
  zoomIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gestureHint: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  gestureHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    textAlign: 'center',
  },
  // Enhanced UI Styles
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  gridLineHorizontal: {
    height: 1,
    width: '100%',
  },
  focusIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  focusRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  settingsContainer: {
    gap: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(120, 120, 128, 0.16)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 128, 0.3)',
  },
  qualityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  aspectRatioButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aspectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 128, 0.3)',
    minWidth: 45,
    alignItems: 'center',
  },
  aspectButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});