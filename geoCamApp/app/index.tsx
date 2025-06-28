import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ImageBackground } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useEffect, useState } from 'react';
import { generateSecp256k1KeyPair, getStoredSecp256k1KeyPair, storeSecp256k1KeyPair, hasStoredSecp256k1KeyPair } from '../utils/secp256k1Utils';

// Define SVG strings directly
const cameraIconXml = `<svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m6.23319 5.83404.44526-2.22627c.18697-.93485 1.0078-1.60777 1.96116-1.60777h6.72079c.9534 0 1.7742.67292 1.9612 1.60777l.4452 2.22627c.1424.71201.6823 1.27824 1.3867 1.45435 1.6729.41822 2.8465 1.9213 2.8465 3.64571v7.0659c0 2.2091-1.7909 4-4 4h-12c-2.20914 0-4-1.7909-4-4v-7.0659c0-1.72441 1.17357-3.22749 2.84645-3.64571.70443-.17611 1.24434-.74234 1.38674-1.45435z"/><circle cx="12" cy="14" r="4"/><path d="m11 6h2"/></g></svg>`;

const galleryIconXml = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m0 0h24v24h-24z" fill="#fff" opacity="0"/><g fill="#fff"><path d="m18 3h-12a3 3 0 0 0 -3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-12a3 3 0 0 0 -3-3zm-12 2h12a1 1 0 0 1 1 1v8.36l-3.2-2.73a2.77 2.77 0 0 0 -3.52 0l-7.28 6.07v-11.7a1 1 0 0 1 1-1z"/><circle cx="8" cy="8.5" r="1.5"/></g></svg>`;

const verifyIconXml = `<svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg"><g style="stroke:#fff;stroke-width:4;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round" transform="translate(2 2)"><path d="m40 80c22.09139 0 40-17.90861 40-40s-17.90861-40-40-40-40 17.90861-40 40 17.90861 40 40 40z"/><path d="m96 96-27.5045451-27.5045451"/></g></svg>`;

const securityIconXml = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7ZM12 17C10.67 17 9.67 16.33 9.67 15.5C9.67 14.67 10.67 14 12 14C13.33 14 14.33 14.67 14.33 15.5C14.33 16.33 13.33 17 12 17Z" fill="#fff"/></svg>`;

export default function MainMenu() {
  const router = useRouter();
  const [keysInitialized, setKeysInitialized] = useState(false);
  const [isInitializingKeys, setIsInitializingKeys] = useState(true);

  useEffect(() => {
    initializeAppKeys();
  }, []);

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
      } else {
        throw new Error('Key storage verification failed');
      }
    } catch (error) {
      console.error('❌ Failed to generate/store keys:', error);
      setKeysInitialized(false);
      throw error;
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <Text style={styles.title}>GeoCam</Text>
      
      {isInitializingKeys && (
        <View style={styles.initializingContainer}>
          <Text style={styles.initializingText}>Initializing security keys...</Text>
        </View>
      )}
      
      <View style={styles.bottomContainer}>
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.button, (!keysInitialized || isInitializingKeys) && styles.disabledButton]}
            onPress={() => router.push('/camera')}
            disabled={!keysInitialized || isInitializingKeys}
          >
            <SvgXml xml={cameraIconXml} width={30} height={30} />
            <Text style={styles.buttonLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/gallery')}
          >
            <SvgXml xml={galleryIconXml} width={30} height={30} />
            <Text style={styles.buttonLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/verify')}
          >
            <SvgXml xml={verifyIconXml} width={30} height={30} />
            <Text style={styles.buttonLabel}>Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/security-info')}
          >
            <SvgXml xml={securityIconXml} width={30} height={30} />
            <Text style={styles.buttonLabel}>Security</Text>
          </TouchableOpacity>
        </View>
        
        {!keysInitialized && !isInitializingKeys && (
          <Text style={styles.warningText}>
            ⚠️ Security keys not initialized. Camera features may not work properly.
          </Text>
        )}
      </View>
    </ImageBackground>
  );
}

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginTop: windowHeight * 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  initializingContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
  },
  initializingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    padding: 20,
    borderRadius: 25,
    width: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
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
  disabledButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.6,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  warningText: {
    color: '#ffdddd',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
});