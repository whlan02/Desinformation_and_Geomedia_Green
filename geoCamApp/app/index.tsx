import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, StatusBar, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ImageBackground } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateSecp256k1KeyPair, getStoredSecp256k1KeyPair, storeSecp256k1KeyPair, hasStoredSecp256k1KeyPair } from '../utils/secp256k1Utils';
import { ensureDeviceRegistration } from '../utils/backendService';
import { useTheme } from '../contexts/ThemeContext';

// Define SVG strings directly
const cameraIconXml = `<svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m6.23319 5.83404.44526-2.22627c.18697-.93485 1.0078-1.60777 1.96116-1.60777h6.72079c.9534 0 1.7742.67292 1.9612 1.60777l.4452 2.22627c.1424.71201.6823 1.27824 1.3867 1.45435 1.6729.41822 2.8465 1.9213 2.8465 3.64571v7.0659c0 2.2091-1.7909 4-4 4h-12c-2.20914 0-4-1.7909-4-4v-7.0659c0-1.72441 1.17357-3.22749 2.84645-3.64571.70443-.17611 1.24434-.74234 1.38674-1.45435z"/><circle cx="12" cy="14" r="4"/><path d="m11 6h2"/></g></svg>`;

const galleryIconXml = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m0 0h24v24h-24z" fill="#fff" opacity="0"/><g fill="#fff"><path d="m18 3h-12a3 3 0 0 0 -3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-12a3 3 0 0 0 -3-3zm-12 2h12a1 1 0 0 1 1 1v8.36l-3.2-2.73a2.77 2.77 0 0 0 -3.52 0l-7.28 6.07v-11.7a1 1 0 0 1 1-1z"/><circle cx="8" cy="8.5" r="1.5"/></g></svg>`;

const verifyIconXml = `<svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg"><g style="stroke:#fff;stroke-width:4;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round" transform="translate(2 2)"><path d="m40 80c22.09139 0 40-17.90861 40-40s-17.90861-40-40-40-40 17.90861-40 40 17.90861 40 40 40z"/><path d="m96 96-27.5045451-27.5045451"/></g></svg>`;

const securityIconXml = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7ZM12 17C10.67 17 9.67 16.33 9.67 15.5C9.67 14.67 10.67 14 12 14C13.33 14 14.33 14.67 14.33 15.5C14.33 16.33 13.33 17 12 17Z" fill="#fff"/></svg>`;

export default function MainMenu() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [keysInitialized, setKeysInitialized] = useState(false);
  const [isInitializingKeys, setIsInitializingKeys] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<{
    isRegistered: boolean;
    isChecking: boolean;
    message: string;
    geocamName?: string;
  }>({
    isRegistered: false,
    isChecking: false,
    message: 'Not checked',
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonPressAnim = useRef(new Animated.Value(1)).current;
  const galleryButtonAnim = useRef(new Animated.Value(1)).current;
  const verifyButtonAnim = useRef(new Animated.Value(1)).current;
  const securityButtonAnim = useRef(new Animated.Value(1)).current;
  
  // Determine if we're in landscape mode
  const isLandscape = width > height;

  useEffect(() => {
    initializeAppKeys();
    
    // Start animations for camera button
    if (!isInitializingKeys && keysInitialized && registrationStatus.isRegistered) {
      // Pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isInitializingKeys, keysInitialized, registrationStatus.isRegistered]);

  const initializeAppKeys = async () => {
    try {
      console.log('🔐 Checking app key initialization status...');
      
      // Check if keys already exist
      const hasKeys = await hasStoredSecp256k1KeyPair();
      
      if (hasKeys) {
        console.log('✅ App keys already initialized');
        // Double-check by trying to load them
        const keyPair = await getStoredSecp256k1KeyPair();
        if (keyPair) {
          console.log('✅ Key validation successful');
          setKeysInitialized(true);
          // Now check and ensure device registration
          await handleDeviceRegistration();
        } else {
          console.warn('⚠️ Keys flag exists but keys not loadable - regenerating...');
          await generateAndStoreNewKeys();
        }
      } else {
        console.log('🔑 No keys found - generating new device keys for app installation...');
        await generateAndStoreNewKeys();
      }
    } catch (error) {
      console.error('❌ Failed to initialize app keys:', error);
      setKeysInitialized(false);
    }
    
    setIsInitializingKeys(false);
  };

  const generateAndStoreNewKeys = async () => {
    try {
      // Generate new keys for this app installation
      const newKeyPair = await generateSecp256k1KeyPair();
      await storeSecp256k1KeyPair(newKeyPair.privateKey, newKeyPair.publicKey, newKeyPair.fingerprint);
      
      // Verify keys were stored correctly
      const verification = await getStoredSecp256k1KeyPair();
      if (verification) {
        console.log('✅ App keys successfully generated and verified');
        setKeysInitialized(true);
        // Now check and ensure device registration
        await handleDeviceRegistration();
      } else {
        throw new Error('Key storage verification failed');
      }
    } catch (error) {
      console.error('❌ Failed to generate/store keys:', error);
      setKeysInitialized(false);
      throw error;
    }
  };

  const handleDeviceRegistration = async () => {
    try {
      setRegistrationStatus(prev => ({ ...prev, isChecking: true, message: 'Checking registration...' }));
      console.log('🔄 Handling device registration...');
      
      const result = await ensureDeviceRegistration();
      
      setRegistrationStatus({
        isRegistered: result.isRegistered,
        isChecking: false,
        message: result.message,
        geocamName: result.geocamName,
      });
      
      if (result.success) {
        console.log('✅ Device registration handled successfully:', result.message);
      } else {
        console.error('❌ Device registration failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Device registration error:', error);
      setRegistrationStatus({
        isRegistered: false,
        isChecking: false,
        message: `Registration error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleCameraPress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonPressAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonPressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    router.push('/camera');
  };

  const handleSecondaryButtonPress = (animRef: Animated.Value, route: string) => {
    // Animate secondary button press
    Animated.sequence([
      Animated.timing(animRef, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animRef, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
    
    router.push(route);
  };

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      {/* Theme Toggle Button */}
      <TouchableOpacity 
        style={[styles.themeToggle, { top: insets.top + 10 }]}
        onPress={toggleTheme}
      >
        <SvgXml 
          xml={isDark ? 
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 2v4m0 12v4M4.22 4.22l2.83 2.83m8.49 8.49 2.83 2.83m-16.97-8.49h4m12 0h4m-16.97 8.49 2.83-2.83m8.49-8.49 2.83-2.83" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` :
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          } 
          width={24} 
          height={24} 
        />
      </TouchableOpacity>

      <ImageBackground
        source={require('../assets/background.jpg')}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }]} />
        
        {!isLandscape ? (
          // Portrait layout
          <>
            <View style={[styles.headerContainer, { marginTop: insets.top + 20 }]}>
              <Text style={styles.title}>GeoCam</Text>
              <Text style={styles.subtitle}>Secure Geo-Verified Photography</Text>
              
              {/* Status Indicator */}
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { 
                  backgroundColor: keysInitialized && registrationStatus.isRegistered ? '#4CAF50' : 
                                  isInitializingKeys || registrationStatus.isChecking ? '#FF9800' : '#F44336' 
                }]} />
                <Text style={styles.statusText}>
                  {isInitializingKeys ? 'Initializing...' :
                   registrationStatus.isChecking ? 'Checking registration...' :
                   !keysInitialized ? 'Key setup failed' :
                   !registrationStatus.isRegistered ? 'Device not registered' :
                   'Ready to capture'}
                </Text>
              </View>
            </View>
            
            <View style={styles.mainButtonContainer}>
              <TouchableOpacity 
                style={[styles.mainButton, (!keysInitialized || isInitializingKeys || !registrationStatus.isRegistered || registrationStatus.isChecking) && styles.disabledMainButton]}
                onPress={handleCameraPress}
                disabled={!keysInitialized || isInitializingKeys || !registrationStatus.isRegistered || registrationStatus.isChecking}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.mainButtonInner, { transform: [{ scale: pulseAnim }] }]}>
                  {(isInitializingKeys || registrationStatus.isChecking) ? (
                    <ActivityIndicator size="large" color="white" />
                  ) : (
                    <>
                      <SvgXml xml={cameraIconXml} width={38} height={38} />
                      <Text style={styles.mainButtonLabel}>CAPTURE</Text>
                    </>
                  )}
                </Animated.View>
              </TouchableOpacity>
              
            </View>
            
            <View style={[styles.bottomContainer, { marginBottom: Math.max(insets.bottom + 10, 30) }]}>
              <View style={styles.buttonGrid}>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => handleSecondaryButtonPress(galleryButtonAnim, '/gallery')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.secondaryButtonInner, { transform: [{ scale: galleryButtonAnim }] }]}>
                    <SvgXml xml={galleryIconXml} width={26} height={26} />
                    <Text style={styles.buttonLabel}>Gallery</Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => handleSecondaryButtonPress(verifyButtonAnim, '/verify')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.secondaryButtonInner, { transform: [{ scale: verifyButtonAnim }] }]}>
                    <SvgXml xml={verifyIconXml} width={26} height={26} />
                    <Text style={styles.buttonLabel}>Verify</Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => handleSecondaryButtonPress(securityButtonAnim, '/security-info')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.secondaryButtonInner, { transform: [{ scale: securityButtonAnim }] }]}>
                    <SvgXml xml={securityIconXml} width={26} height={26} />
                    <Text style={styles.buttonLabel}>Device Info</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
              

            </View>
          </>
        ) : (
          // Landscape layout
          <View style={styles.landscapeContainer}>
            <View style={[styles.landscapeLeftSection, { marginLeft: insets.left }]}>
              <View style={[styles.headerContainer, { alignItems: 'flex-start' }]}>
                <Text style={styles.title}>GeoCam</Text>
                <Text style={styles.subtitle}>Secure Geo-Verified Photography</Text>
              </View>
              

            </View>
            
            <View style={styles.landscapeRightSection}>
              <View style={styles.landscapeCameraSection}>              <TouchableOpacity 
                style={[styles.mainButton, (!keysInitialized || isInitializingKeys || !registrationStatus.isRegistered || registrationStatus.isChecking) && styles.disabledMainButton]}
                onPress={handleCameraPress}
                disabled={!keysInitialized || isInitializingKeys || !registrationStatus.isRegistered || registrationStatus.isChecking}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.mainButtonInner, { 
                  transform: [
                    { scale: pulseAnim },
                    { scale: buttonPressAnim }
                  ] 
                }]}>
                    <SvgXml xml={cameraIconXml} width={38} height={38} />
                    <Text style={styles.mainButtonLabel}>CAPTURE</Text>
                  </Animated.View>
                </TouchableOpacity>
                <Text style={[styles.cameraHintText, { marginTop: 8 }]}>Secure, Geotagged Photos</Text>
              </View>
              
              <View style={[styles.landscapeButtonGrid, { marginRight: insets.right + 10 }]}>
                <TouchableOpacity 
                  style={styles.landscapeSecondaryButton}
                  onPress={() => handleSecondaryButtonPress(galleryButtonAnim, '/gallery')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.landscapeSecondaryButtonInner, { transform: [{ scale: galleryButtonAnim }] }]}>
                    <SvgXml xml={galleryIconXml} width={24} height={24} />
                    <Text style={styles.buttonLabel}>Gallery</Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.landscapeSecondaryButton}
                  onPress={() => handleSecondaryButtonPress(verifyButtonAnim, '/verify')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.landscapeSecondaryButtonInner, { transform: [{ scale: verifyButtonAnim }] }]}>
                    <SvgXml xml={verifyIconXml} width={24} height={24} />
                    <Text style={styles.buttonLabel}>Verify</Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.landscapeSecondaryButton}
                  onPress={() => handleSecondaryButtonPress(securityButtonAnim, '/security-info')}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.landscapeSecondaryButtonInner, { transform: [{ scale: securityButtonAnim }] }]}>
                    <SvgXml xml={securityIconXml} width={24} height={24} />
                    <Text style={styles.buttonLabel}>Security</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ImageBackground>
    </>
  );
}

const windowHeight = Dimensions.get('window').height;
const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: windowHeight * 0.08,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 3,
  },
  mainButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    position: 'relative',
  },
  buttonGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  mainButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(24, 20, 21, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 2,
  },
  disabledMainButton: {
    backgroundColor: 'rgba(24, 20, 21, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.7,
  },
  mainButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHintText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mainButtonLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '90%',
  },
  button: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
    width: 75,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(24, 20, 21, 0.7)',
    padding: 12,
    borderRadius: 15,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  secondaryButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.6,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Landscape mode styles
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
  },
  landscapeLeftSection: {
    flex: 0.4,
    height: '100%',
    paddingVertical: 40,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  landscapeRightSection: {
    flex: 0.6,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  landscapeCameraSection: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeButtonGrid: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 15,
    padding: 15,
  },
  landscapeSecondaryButton: {
    backgroundColor: 'rgba(24, 20, 21, 0.7)',
    padding: 10,
    borderRadius: 15,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  landscapeSecondaryButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggle: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});