import { Platform, DeviceEventEmitter, NativeEventEmitter, NativeModules } from 'react-native';

/**
 * Volume Button Handler Utility
 * 
 * This utility provides volume button capture functionality for the camera.
 * 
 * DEVELOPMENT MODE:
 * - Uses simulated events and keyboard shortcuts
 * - Volume buttons are simulated through developer tools
 * 
 * PRODUCTION MODE:
 * - Requires native module implementation for actual volume button detection
 * - iOS: Uses AVAudioSession and hardware button events
 * - Android: Uses KeyEvent.KEYCODE_VOLUME_UP/DOWN detection
 */

type VolumeButtonCallback = () => void;

class VolumeButtonHandler {
  private volumeUpCallback: VolumeButtonCallback | null = null;
  private volumeDownCallback: VolumeButtonCallback | null = null;
  private isListening = false;
  private listeners: any[] = [];

  /**
   * Start listening for volume button events
   */
  startListening(onVolumeUp: VolumeButtonCallback, onVolumeDown?: VolumeButtonCallback) {
    if (this.isListening) {
      this.stopListening();
    }

    this.volumeUpCallback = onVolumeUp;
    this.volumeDownCallback = onVolumeDown || onVolumeUp; // Use same callback for both if only one provided
    this.isListening = true;

    if (__DEV__) {
      // Development mode - simulate volume button events
      console.log('📱 Volume Button Handler: Development mode active');
      console.log('📱 Volume buttons simulated - use keyboard shortcuts in simulator:');
      console.log('📱 iOS Simulator: Cmd+Shift+H then Volume Up/Down');
      console.log('📱 Android Emulator: Volume Up/Down keys on host keyboard');
      
      // Listen for simulated events (you can trigger these from dev tools)
      const volumeUpListener = DeviceEventEmitter.addListener('VolumeUp', () => {
        console.log('📸 Volume Up pressed (simulated)');
        this.volumeUpCallback?.();
      });

      const volumeDownListener = DeviceEventEmitter.addListener('VolumeDown', () => {
        console.log('📸 Volume Down pressed (simulated)');
        this.volumeDownCallback?.();
      });

      this.listeners.push(volumeUpListener, volumeDownListener);

      // For development, also listen to keyboard events if available
      this.setupDevelopmentKeyboardListeners();
    } else {
      // Production mode - use native modules
      this.setupProductionVolumeListeners();
    }
  }

  /**
   * Stop listening for volume button events
   */
  stopListening() {
    this.isListening = false;
    this.listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = [];
    this.volumeUpCallback = null;
    this.volumeDownCallback = null;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Manual trigger for testing (development only)
   */
  simulateVolumeUp() {
    if (__DEV__ && this.volumeUpCallback) {
      console.log('📸 Volume Up triggered manually');
      this.volumeUpCallback();
    }
  }

  /**
   * Manual trigger for testing (development only)
   */
  simulateVolumeDown() {
    if (__DEV__ && this.volumeDownCallback) {
      console.log('📸 Volume Down triggered manually');
      this.volumeDownCallback();
    }
  }

  private setupDevelopmentKeyboardListeners() {
    // In development, you can emit these events manually from the Metro console:
    // DeviceEventEmitter.emit('VolumeUp');
    // DeviceEventEmitter.emit('VolumeDown');
    
    console.log('📱 Development keyboard listeners ready');
    console.log('📱 Trigger manually with: DeviceEventEmitter.emit("VolumeUp")');
  }

  private setupProductionVolumeListeners() {
    try {
      if (Platform.OS === 'ios') {
        // iOS production implementation would use native modules
        console.log('📱 iOS Production Volume Button Handler (requires native module)');
        
        // This would require a native iOS module that:
        // 1. Sets up AVAudioSession
        // 2. Listens for volume button events
        // 3. Prevents default volume behavior
        // 4. Emits custom events to React Native
        
      } else if (Platform.OS === 'android') {
        // Android production implementation would use native modules
        console.log('📱 Android Production Volume Button Handler (requires native module)');
        
        // This would require a native Android module that:
        // 1. Overrides onKeyDown in MainActivity
        // 2. Captures KEYCODE_VOLUME_UP and KEYCODE_VOLUME_DOWN
        // 3. Prevents default volume behavior
        // 4. Emits custom events to React Native
      }
    } catch (error) {
      console.error('❌ Failed to setup production volume listeners:', error);
    }
  }
}

// Export singleton instance
export const volumeButtonHandler = new VolumeButtonHandler();

/**
 * React Hook for volume button handling
 */
export const useVolumeButtons = (onVolumePress: VolumeButtonCallback) => {
  const startListening = () => {
    volumeButtonHandler.startListening(onVolumePress);
  };

  const stopListening = () => {
    volumeButtonHandler.stopListening();
  };

  const simulatePress = () => {
    if (__DEV__) {
      volumeButtonHandler.simulateVolumeUp();
    }
  };

  return {
    startListening,
    stopListening,
    simulatePress,
    isListening: volumeButtonHandler.isCurrentlyListening()
  };
};

export default volumeButtonHandler;
