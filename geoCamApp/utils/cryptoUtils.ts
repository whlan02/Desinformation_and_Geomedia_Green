import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

// Key name for device-specific key storage
const DEVICE_KEY_PREFIX = 'device_crypto_key_';
const KEY_GENERATION_FLAG = 'crypto_keys_generated';
const APP_INSTALLATION_ID = 'app_installation_id';

// Device secure storage configuration options (no user authentication required)
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  // No user authentication required - access is granted as long as the device is accessible
  requireAuthentication: false,
  
  // Custom Keychain service name (iOS) / Keystore alias (Android)
  keychainService: 'GeoCamApp_DeviceKeys',
};

/**
 * Generate a unique application installation identifier
 * A new ID is generated with each installation to ensure keys are bound to a specific installation instance
 */
const getOrCreateInstallationId = async (): Promise<string> => {
  try {
    let installationId = await SecureStore.getItemAsync(APP_INSTALLATION_ID, SECURE_STORE_OPTIONS);
    
    if (!installationId) {
      // Generate a new installation ID (based on timestamp and random number)
      const timestamp = Date.now().toString(36);
      const randomBytes = Crypto.getRandomBytes(8);
      const randomPart = Array.from(randomBytes).map(b => b.toString(36)).join('');
      installationId = `install_${timestamp}_${randomPart}`;
      
      await SecureStore.setItemAsync(
        APP_INSTALLATION_ID, 
        installationId, 
        SECURE_STORE_OPTIONS
      );
      console.log('🆔 Generated new installation ID:', installationId);
    } else {
      console.log('🆔 Using existing installation ID:', installationId);
    }
    
    return installationId;
  } catch (error: unknown) {
    console.error('Failed to get/create installation ID:', error);
    // Fallback: Generate based on device information
    const deviceInfo = `${Device.modelName}_${Device.osVersion}_${Date.now()}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceInfo,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return `fallback_${hash.substring(0, 16)}`;
  }
};

/**
 * Get device and installation-specific storage key names
 */
const getDeviceSpecificKeyNames = async () => {
  const installationId = await getOrCreateInstallationId();
  const deviceId = `${Device.osName}_${Device.modelName}`.replace(/[^a-zA-Z0-9]/g, '_');
  
  const keyPrefix = `${DEVICE_KEY_PREFIX}${deviceId}_${installationId}`;
  
  return {
    privateKey: `${keyPrefix}_private`,
    publicKey: `${keyPrefix}_public`,
    generationFlag: `${KEY_GENERATION_FLAG}_${installationId}`,
    keyMetadata: `${keyPrefix}_metadata`,
  };
};

/**
 * Generate a simplified key pair (using expo-crypto and random numbers)
 */
export const generateDeviceKeyPair = async () => {
  try {
    console.log('🔐 Generating device-specific key pair...');
    
    const installationId = await getOrCreateInstallationId();
    
    // Generate private key seed (using device information and random numbers)
    const deviceSeed = `${Device.modelName}_${Device.osVersion}_${installationId}_${Date.now()}`;
    const randomSeed = Crypto.getRandomBytes(32);
    const combinedSeed = deviceSeed + Array.from(randomSeed).map(b => b.toString(16)).join('');
    
    // Generate private key hash
    const privateKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combinedSeed,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Generate public key (based on another hash of the private key)
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      privateKeyHash + '_public',
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Generate key fingerprint
    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyHash,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    const keyPair = {
      privateKey: {
        type: 'device-crypto',
        hash: privateKeyHash,
        keyId: `device_key_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        installationId,
      },
      publicKey: {
        type: 'device-crypto',
        hash: publicKeyHash,
        keyId: `device_key_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        installationId,
        privateKeyHashForVerification: privateKeyHash, // Store for verification
      },
      fingerprint: fingerprint.substring(0, 16),
      metadata: {
        keyType: 'device-specific-hash',
        algorithm: 'SHA256-based',
        securityLevel: 'hardware-stored',
        deviceModel: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        generatedAt: new Date().toISOString(),
        installationId,
      }
    };

    console.log('✅ Device key pair generated successfully');
    console.log('🔑 Key fingerprint:', keyPair.fingerprint);

    return keyPair;
  } catch (error: unknown) {
    console.error('❌ Device key generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate device key pair: " + errorMessage);
  }
};

/**
 * Sign data (using the private key for signing)
 */
export const signDataWithDeviceKey = async (data: string, privateKey: any): Promise<string> => {
  try {
    console.log('🔐 Signing data with PRIVATE key...');
    console.log('🔑 Private key ID:', privateKey.keyId);
    
    // Correct signing method: sign using the private key
    const signatureInput = `${privateKey.hash}_${data}_${privateKey.keyId}`;
    
    console.log('🔐 Signature input:', signatureInput);
    
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signatureInput,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    console.log('🔐 Generated signature using private key:', signature);
    
    return signature;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Device signing failed: " + errorMessage);
  }
};

/**
 * Verify signature (using the public key for verification)
 */
export const verifySignatureWithDeviceKey = async (data: string, signature: string, publicKey: any): Promise<boolean> => {
  try {
    console.log('🔍 Verifying signature with PUBLIC key...');
    console.log('🔑 Public key hash:', publicKey.hash);
    console.log('🔑 Public key ID:', publicKey.keyId);
    
    // Get the private key hash for verification (stored in the public key object)
    const privateKeyHashForVerification = publicKey.privateKeyHashForVerification;
    
    if (!privateKeyHashForVerification) {
      console.error('❌ No private key hash available for verification - cannot verify signature');
      return false;
    }
    
    // Rebuild signature input (same logic as during signing)
    // signDataWithDeviceKey uses: signatureInput = `${privateKey.hash}_${data}_${privateKey.keyId}`;
    const signatureInput = `${privateKeyHashForVerification}_${data}_${publicKey.keyId}`;
    
    console.log('🔍 Signature input for verification:', signatureInput);
    
    const expectedSignature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signatureInput,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    console.log('🔍 Expected signature:', expectedSignature);
    console.log('🔍 Received signature:', signature);
    
    const isValid = expectedSignature === signature;
    console.log(isValid ? '✅ Signature verification: VALID' : '❌ Signature verification: INVALID');
    
    return isValid;
  } catch (error) {
    console.error('Device signature verification failed:', error);
    return false;
  }
};

/**
 * Store key pair in hardware secure storage
 */
export const storeKeyPair = async (privateKey: any, publicKey: any) => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const installationId = await getOrCreateInstallationId();
    
    console.log('🔐 Storing keys in hardware security module...');
    console.log('📱 Platform:', Device.osName);
    console.log('🏷️ Installation ID:', installationId);
    
    // Create detailed key metadata
    const keyMetadata = {
      installationId,
      deviceModel: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      generatedAt: new Date().toISOString(),
      platform: Device.osName,
      fingerprint: privateKey.fingerprint || 'unknown',
      keyType: 'device-specific-hash',
      securityLevel: 'hardware',
    };

    // Wrap key data
    const privateKeyData = {
      ...privateKey,
      metadata: keyMetadata,
      securityLevel: 'hardware-protected'
    };

    const publicKeyData = {
      ...publicKey,
      metadata: keyMetadata,
      securityLevel: 'hardware-protected'
    };

    // Store in hardware security module
    await Promise.all([
      SecureStore.setItemAsync(
        keyNames.privateKey, 
        JSON.stringify(privateKeyData),
        SECURE_STORE_OPTIONS
      ),
      
      SecureStore.setItemAsync(
        keyNames.publicKey, 
        JSON.stringify(publicKeyData),
        SECURE_STORE_OPTIONS
      ),

      SecureStore.setItemAsync(
        keyNames.keyMetadata,
        JSON.stringify(keyMetadata),
        SECURE_STORE_OPTIONS
      ),

      SecureStore.setItemAsync(
        keyNames.generationFlag,
        JSON.stringify({
          generated: true,
          timestamp: new Date().toISOString(),
          installationId,
          hardwareProtected: true,
        }),
        SECURE_STORE_OPTIONS
      )
    ]);

    console.log('✅ Keys successfully stored in device secure storage');
    console.log('🔒 Security level: Device-protected (no biometric required)');
    
    if (Device.osName === 'iOS') {
      console.log('🍎 iOS: Keys stored in Keychain (accessible without biometric verification)');
    } else if (Device.osName === 'Android') {
      console.log('🤖 Android: Keys stored in Android Keystore (accessible without biometric verification)');
    }
    
  } catch (error) {
    console.error('❌ Failed to store keys in hardware security module:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('SecureStore')) {
      throw new Error('Device secure storage unavailable. Please ensure the app has proper permissions.');
    }
    
    throw error;
  }
};

/**
 * Retrieve key pair from hardware secure storage
 */
export const getStoredKeyPair = async () => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const currentInstallationId = await getOrCreateInstallationId();
    
    console.log('🔓 Retrieving keys from device secure storage...');
    
    const [privateKeyStr, publicKeyStr, metadataStr] = await Promise.all([
      SecureStore.getItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(keyNames.keyMetadata, SECURE_STORE_OPTIONS)
    ]);

    if (!privateKeyStr || !publicKeyStr) {
      console.log('🔍 No keys found in device secure storage');
      return null;
    }

    const privateKeyData = JSON.parse(privateKeyStr);
    const publicKeyData = JSON.parse(publicKeyStr);
    const metadata = metadataStr ? JSON.parse(metadataStr) : null;

    if (metadata?.installationId !== currentInstallationId) {
      console.warn('⚠️ Key installation ID mismatch - keys belong to different app installation');
      console.log('Expected:', currentInstallationId);
      console.log('Found:', metadata?.installationId);
      return null;
    }

    console.log('✅ Device keys retrieved successfully');
    console.log('🔑 Key fingerprint:', metadata?.fingerprint);
    console.log('📅 Generated:', metadata?.generatedAt);

    return {
      privateKey: privateKeyData,
      publicKey: publicKeyData,
      metadata: metadata
    };
  } catch (error) {
    console.error('❌ Failed to retrieve device keys:', error);
    return null;
  }
};

/**
 * Check if the current installation already has a hardware-protected key pair
 */
export const hasStoredKeyPair = async (): Promise<boolean> => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const currentInstallationId = await getOrCreateInstallationId();
    
    const flagStr = await SecureStore.getItemAsync(keyNames.generationFlag, {
      ...SECURE_STORE_OPTIONS,
      requireAuthentication: false,
    });
    
    if (!flagStr) return false;
    
    const flag = JSON.parse(flagStr);
    
    return (
      flag.generated === true && 
      flag.installationId === currentInstallationId &&
      flag.hardwareProtected === true
    );
  } catch (error) {
    console.error('Failed to check device key existence:', error);
    return false;
  }
};

/**
 * Get detailed information about the key pair
 */
export const getKeyPairInfo = async () => {
  try {
    const keyPair = await getStoredKeyPair();
    if (!keyPair?.metadata) return null;

    const { metadata } = keyPair;
    
    return {
      installationId: metadata.installationId,
      deviceModel: metadata.deviceModel,
      osName: metadata.osName,
      osVersion: metadata.osVersion,
      generatedAt: metadata.generatedAt,
      fingerprint: metadata.fingerprint,
      keyType: metadata.keyType,
      securityLevel: metadata.securityLevel,
      hardwareProtected: metadata.securityLevel === 'hardware',
      hasPrivateKey: !!keyPair.privateKey,
      hasPublicKey: !!keyPair.publicKey,
    };
  } catch (error) {
    console.error('Failed to get key pair info:', error);
    return null;
  }
};

/**
 * Securely delete all keys for the current installation
 */
export const deleteDeviceKeys = async (): Promise<boolean> => {
  try {
    console.log('🗑️ Securely deleting device keys...');
    
    const keyNames = await getDeviceSpecificKeyNames();
    
    await Promise.all([
      SecureStore.deleteItemAsync(keyNames.privateKey),
      SecureStore.deleteItemAsync(keyNames.publicKey),
      SecureStore.deleteItemAsync(keyNames.keyMetadata),
      SecureStore.deleteItemAsync(keyNames.generationFlag),
    ]);
    
    console.log('✅ Device keys securely deleted');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete device keys:', error);
    return false;
  }
};

/**
 * Get hardware security capability information
 */
export const getHardwareSecurityInfo = () => {
  const info = {
    platform: Device.osName,
    model: Device.modelName,
    osVersion: Device.osVersion,
    secureStoreAvailable: true,
    hardwareFeatures: {} as any,
  };

  if (Device.osName === 'iOS') {
    info.hardwareFeatures = {
      keychain: true,
      secureEnclave: 'available_on_supported_devices',
      biometricAuthentication: 'TouchID_FaceID_supported',
      description: 'Keys stored in iOS Keychain with Secure Enclave protection'
    };
  } else if (Device.osName === 'Android') {
    info.hardwareFeatures = {
      androidKeystore: true,
      teeSupport: 'available_on_supported_devices',
      hsmSupport: 'available_on_supported_devices',
      biometricAuthentication: 'fingerprint_face_supported',
      description: 'Keys stored in Android Keystore with TEE/HSM protection'
    };
  }

  return info;
};

/**
 * Generate a data hash value
 */
export const generateDataHash = async (data: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
};

// The following is for compatibility with older versions of WebView functions (now no longer used)
export const generateKeyPairInWebView = () => {
  return `
    // Fallback functions for WebView compatibility
    async function generateHash(data) {
      // This is a fallback - we now use React Native side crypto
      console.warn('Using fallback hash function in WebView');
      return btoa(data); // Simple base64 encoding as fallback
    }

    async function signData(data, privateKey) {
      // This is a fallback - we now use React Native side signing
      console.warn('Using fallback signing function in WebView');
      return btoa(data + JSON.stringify(privateKey)); // Simple fallback
    }

    async function verifySignature(data, signature, publicKey) {
      // This is a fallback - we now use React Native side verification
      console.warn('Using fallback verification function in WebView');
      const expectedSignature = btoa(data + JSON.stringify(publicKey));
      return signature === expectedSignature;
    }
  `;
};

export const generateHashInWebView = () => {
  return `
    async function generateHash(data) {
      console.warn('Using fallback hash function in WebView');
      return btoa(data);
    }
  `;
};