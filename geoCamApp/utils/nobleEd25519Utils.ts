import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import * as ed from '@noble/ed25519';

// Configure Noble Ed25519 for React Native
// For React Native, we need to provide polyfills for getRandomValues and sha512
import 'react-native-get-random-values';

// Set up sha512 for Noble Ed25519 (required for React Native)
ed.etc.sha512Async = async (...messages) => {
  const concat = ed.etc.concatBytes(...messages);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    ed.etc.bytesToHex(concat),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return ed.etc.hexToBytes(hash);
};

// Base64 encoding/decoding utilities using built-in functions
const base64Encode = (uint8Array: Uint8Array): string => {
  // Convert Uint8Array to string, then to base64
  const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
};

const base64Decode = (base64: string): Uint8Array => {
  // Decode base64 to binary string, then to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Key name for device-specific key storage
const DEVICE_KEY_PREFIX = 'device_noble_key_';
const KEY_GENERATION_FLAG = 'noble_keys_generated';
const APP_INSTALLATION_ID = 'app_installation_id';

// Device secure storage configuration options
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  keychainService: 'GeoCamApp_NobleKeys',
};

/**
 * Generate a unique application installation identifier
 */
const getOrCreateInstallationId = async (): Promise<string> => {
  try {
    let installationId = await SecureStore.getItemAsync(APP_INSTALLATION_ID, SECURE_STORE_OPTIONS);
    
    if (!installationId) {
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
 * Generate a Noble Ed25519 signing key pair
 */
export const generateNobleEd25519KeyPair = async () => {
  try {
    console.log('🔐 Generating Noble Ed25519 signing key pair...');
    
    const installationId = await getOrCreateInstallationId();
    
    // Generate Ed25519 key pair using Noble
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    
    // Validate key pair (security check)
    if (!privateKey || privateKey.length !== 32) {
      throw new Error('Invalid private key generated');
    }
    if (!publicKey || publicKey.length !== 32) {
      throw new Error('Invalid public key generated');
    }
    
    // Convert to Base64 for storage and transmission
    const privateKeyBase64 = base64Encode(privateKey);
    const publicKeyBase64 = base64Encode(publicKey);
    
    // Generate key fingerprint from public key
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const fingerprint = publicKeyHash.substring(0, 16);

    const keyId = `noble_key_${Date.now()}`;
    const generatedAt = new Date().toISOString();
    
    const nobleKeyPair = {
      privateKey: {
        type: 'Noble-Ed25519',
        keyBase64: privateKeyBase64,
        keyBytes: privateKey,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'Ed25519',
        keySize: 32, // 32 bytes for Ed25519 private key
      },
      publicKey: {
        type: 'Noble-Ed25519',
        keyBase64: publicKeyBase64,
        keyBytes: publicKey,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'Ed25519',
        keySize: 32, // 32 bytes for Ed25519 public key
      },
      fingerprint,
      metadata: {
        fingerprint,
        keyType: 'Noble-Ed25519',
        algorithm: 'Ed25519',
        keySize: 32,
        securityLevel: 'hardware-stored',
        deviceModel: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        generatedAt,
        installationId,
        keyId,
      }
    };

    console.log('✅ Noble Ed25519 key pair generated successfully');
    console.log('🔑 Key fingerprint:', fingerprint);
    console.log('🔑 Key type: Ed25519');
    console.log('🔑 Private key length:', privateKeyBase64.length);
    console.log('🔑 Public key length:', publicKeyBase64.length);

    return nobleKeyPair;
  } catch (error: unknown) {
    console.error('❌ Noble Ed25519 key generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate Noble Ed25519 key pair: " + errorMessage);
  }
};

/**
 * Sign data using Noble Ed25519 signature
 */
export const signDataWithNobleEd25519 = async (originalData: any, privateKey: any): Promise<string> => {
  try {
    console.log('🔐 Creating Noble Ed25519 signature...');
    
    if (!privateKey || privateKey.type !== 'Noble-Ed25519') {
      throw new Error('Invalid Noble Ed25519 private key format');
    }
    
    // For performance optimization with large data
    let dataToSign: Uint8Array;
    
    if (typeof originalData === 'string' && originalData.length > 1000000) {
      // For large base64 image data (>1MB), pre-hash with SHA-512 for speed
      console.log('📝 Pre-hashing large image data with SHA-512 for performance');
      console.log('🔐 Original data size:', originalData.length, 'characters');
      
      const imageHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        originalData,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      dataToSign = new TextEncoder().encode(imageHash);
      console.log('🔐 Pre-hashed to:', imageHash.length, 'characters (SHA-512)');
      console.log('📊 Data to sign length:', dataToSign.length, 'bytes (much faster!)');
    } else if (typeof originalData === 'string') {
      // For smaller string data, sign directly
      dataToSign = new TextEncoder().encode(originalData);
      console.log('📝 Signing small string data directly with Noble Ed25519');
      console.log('🔐 Data size:', originalData.length, 'characters');
      console.log('📊 Data to sign length:', dataToSign.length, 'bytes');
    } else {
      // For objects, create metadata wrapper
      const signatureData = {
        data: originalData,
        timestamp: new Date().toISOString(),
        keyId: privateKey.keyId,
        deviceInfo: {
          model: Device.modelName,
          os: Device.osName,
          version: Device.osVersion
        },
        nonce: Array.from(Crypto.getRandomBytes(16)).map(b => b.toString(16).padStart(2, '0')).join('')
      };
      const jsonString = JSON.stringify(signatureData, Object.keys(signatureData).sort());
      dataToSign = new TextEncoder().encode(jsonString);
      console.log('📝 Signing structured data with metadata');
      console.log('📊 Data to sign length:', dataToSign.length, 'bytes');
    }
    
    // Create signature using Noble Ed25519 (includes internal SHA-512 hashing)
    const signature = await ed.signAsync(dataToSign, privateKey.keyBytes);
    
    // Convert signature to Base64
    const signatureBase64 = base64Encode(signature);
    
    console.log('✅ Noble Ed25519 signature created');
    console.log('🔏 Signature length:', signatureBase64.length, 'characters');
    
    // Return simple signature package
    return JSON.stringify({
      signature: signatureBase64,
      algorithm: 'Ed25519',
      keyId: privateKey.keyId,
      timestamp: new Date().toISOString(),
      preHashed: typeof originalData === 'string' && originalData.length > 1000000
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Noble Ed25519 signing failed: " + errorMessage);
  }
};

/**
 * Verify signature using Noble Ed25519 verification
 */
export const verifySignatureWithNobleEd25519 = async (signaturePackage: string, publicKey: any, originalData: any): Promise<boolean> => {
  try {
    console.log('🔍 Verifying Noble Ed25519 signature...');
    
    if (!publicKey || publicKey.type !== 'Noble-Ed25519') {
      throw new Error('Invalid Noble Ed25519 public key format');
    }
    
    const packageData = JSON.parse(signaturePackage);
    const { signature: signatureBase64, algorithm, preHashed } = packageData;
    
    if (algorithm !== 'Ed25519') {
      throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }
    
    // Reconstruct the data that was signed (same logic as signing)
    let dataToVerify: Uint8Array;
    
    if (typeof originalData === 'string' && preHashed && originalData.length > 1000000) {
      // For large data that was pre-hashed during signing, hash again for verification
      console.log('🔍 Pre-hashing large image data with SHA-512 for verification');
      console.log('🔐 Original data size:', originalData.length, 'characters');
      
      const imageHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        originalData,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      dataToVerify = new TextEncoder().encode(imageHash);
      console.log('🔐 Pre-hashed to:', imageHash.length, 'characters (SHA-512)');
      console.log('📊 Data to verify length:', dataToVerify.length, 'bytes');
    } else if (typeof originalData === 'string') {
      // For smaller string data, verify directly (same as signing)
      dataToVerify = new TextEncoder().encode(originalData);
      console.log('🔍 Verifying small string data directly');
      console.log('📊 Data to verify length:', dataToVerify.length, 'bytes');
    } else {
      throw new Error('Verification of structured data not implemented for new signing method');
    }
    
    // Convert signature from Base64 to Uint8Array
    const signatureBytes = base64Decode(signatureBase64);
    
    // Verify the signature using Noble Ed25519
    const isValid = await ed.verifyAsync(signatureBytes, dataToVerify, publicKey.keyBytes);
    
    console.log('✅ Noble Ed25519 signature verification completed');
    console.log('🔍 Signature valid:', isValid);
    
    return isValid;
    
  } catch (error: unknown) {
    console.error('❌ Noble Ed25519 signature verification failed:', error);
    return false;
  }
};

/**
 * Store Noble Ed25519 key pair securely
 */
export const storeNobleEd25519KeyPair = async (privateKey: any, publicKey: any, fingerprint?: string) => {
  try {
    console.log('💾 Storing Noble Ed25519 key pair securely...');
    
    const keyNames = await getDeviceSpecificKeyNames();
    
    // Store private key
    await SecureStore.setItemAsync(
      keyNames.privateKey,
      JSON.stringify(privateKey),
      SECURE_STORE_OPTIONS
    );
    
    // Store public key
    await SecureStore.setItemAsync(
      keyNames.publicKey,
      JSON.stringify(publicKey),
      SECURE_STORE_OPTIONS
    );
    
    // Store metadata
    const metadata = {
      fingerprint: fingerprint || 'unknown',
      keyType: 'Noble-Ed25519',
      algorithm: 'Ed25519',
      generatedAt: new Date().toISOString(),
      deviceModel: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    };
    
    await SecureStore.setItemAsync(
      keyNames.keyMetadata,
      JSON.stringify(metadata),
      SECURE_STORE_OPTIONS
    );
    
    // Set generation flag
    await SecureStore.setItemAsync(
      keyNames.generationFlag,
      'true',
      SECURE_STORE_OPTIONS
    );
    
    console.log('✅ Noble Ed25519 key pair stored successfully');
    
  } catch (error: unknown) {
    console.error('❌ Failed to store Noble Ed25519 key pair:', error);
    throw error;
  }
};

/**
 * Get stored Noble Ed25519 key pair
 */
export const getStoredNobleEd25519KeyPair = async () => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    
    const privateKeyStr = await SecureStore.getItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    const publicKeyStr = await SecureStore.getItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    
    if (!privateKeyStr || !publicKeyStr) {
      console.log('📱 No stored Noble Ed25519 key pair found');
      return null;
    }
    
    const privateKey = JSON.parse(privateKeyStr);
    const publicKey = JSON.parse(publicKeyStr);
    
    // Restore keyBytes from Base64 to Uint8Array
    if (privateKey.keyBase64) {
      privateKey.keyBytes = base64Decode(privateKey.keyBase64);
    }
    if (publicKey.keyBase64) {
      publicKey.keyBytes = base64Decode(publicKey.keyBase64);
    }
    
    console.log('✅ Retrieved stored Noble Ed25519 key pair');
    console.log('🔑 Key type:', privateKey.type);
    console.log('🔑 Key ID:', privateKey.keyId);
    console.log('🔑 Private key bytes length:', privateKey.keyBytes?.length);
    console.log('🔑 Public key bytes length:', publicKey.keyBytes?.length);
    
    return {
      privateKey,
      publicKey,
      fingerprint: privateKey.fingerprint || publicKey.fingerprint
    };
    
  } catch (error: unknown) {
    console.error('❌ Failed to retrieve Noble Ed25519 key pair:', error);
    return null;
  }
};

/**
 * Check if Noble Ed25519 key pair exists
 */
export const hasStoredNobleEd25519KeyPair = async (): Promise<boolean> => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const hasFlag = await SecureStore.getItemAsync(keyNames.generationFlag, SECURE_STORE_OPTIONS);
    return hasFlag === 'true';
  } catch (error: unknown) {
    console.error('❌ Failed to check Noble Ed25519 key pair existence:', error);
    return false;
  }
};

/**
 * Get Noble Ed25519 key pair information
 */
export const getNobleEd25519KeyPairInfo = async () => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const metadataStr = await SecureStore.getItemAsync(keyNames.keyMetadata, SECURE_STORE_OPTIONS);
    
    if (!metadataStr) {
      return null;
    }
    
    const metadata = JSON.parse(metadataStr);
    const installationId = await getOrCreateInstallationId();
    
    return {
      ...metadata,
      installationId,
      hasKeys: await hasStoredNobleEd25519KeyPair(),
    };
    
  } catch (error: unknown) {
    console.error('❌ Failed to get Noble Ed25519 key pair info:', error);
    return null;
  }
};

/**
 * Delete stored Noble Ed25519 keys
 */
export const deleteNobleEd25519Keys = async (): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting stored Noble Ed25519 keys...');
    
    const keyNames = await getDeviceSpecificKeyNames();
    
    await SecureStore.deleteItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.keyMetadata, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.generationFlag, SECURE_STORE_OPTIONS);
    
    console.log('✅ Noble Ed25519 keys deleted successfully');
    return true;
    
  } catch (error: unknown) {
    console.error('❌ Failed to delete Noble Ed25519 keys:', error);
    return false;
  }
};

 