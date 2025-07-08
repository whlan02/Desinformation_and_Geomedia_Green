import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { secp256k1 } from '@noble/curves/secp256k1';

// Base64 encoding/decoding utilities using built-in functions
const base64Encode = (uint8Array: Uint8Array): string => {
  const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
};

const base64Decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Key name for device-specific key storage
const DEVICE_KEY_PREFIX = 'device_secp256k1_key_';
const KEY_GENERATION_FLAG = 'secp256k1_keys_generated';
const APP_INSTALLATION_ID = 'app_installation_id';

// Device secure storage configuration options
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  keychainService: 'GeoCamApp_Secp256k1Keys',
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
 * Generate a secp256k1 signing key pair
 */
export const generateSecp256k1KeyPair = async () => {
  try {
    console.log('🔐 Generating secp256k1 signing key pair...');
    
    const installationId = await getOrCreateInstallationId();
    
    // Generate private key using a secure random number generator
    let privateKeyBytes: Uint8Array;
    try {
      // Try using secp256k1's built-in random key generation
      privateKeyBytes = secp256k1.utils.randomPrivateKey();
    } catch (error) {
      console.log('⚠️ Falling back to expo-crypto for random key generation');
      // Fallback to expo-crypto's random number generator
      privateKeyBytes = Crypto.getRandomBytes(32);
      // Ensure the private key is valid for secp256k1
      while (!secp256k1.utils.isValidPrivateKey(privateKeyBytes)) {
        privateKeyBytes = Crypto.getRandomBytes(32);
      }
    }
    
    // Get public key point
    const publicKeyPoint = secp256k1.getPublicKey(privateKeyBytes);
    
    // Convert to Base64 for storage and transmission
    const privateKeyBase64 = base64Encode(privateKeyBytes);
    const publicKeyBase64 = base64Encode(publicKeyPoint);
    
    // Generate key fingerprint from public key
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const fingerprint = publicKeyHash.substring(0, 16);

    const keyId = `secp256k1_key_${Date.now()}`;
    const generatedAt = new Date().toISOString();
    
    const keyPair = {
      privateKey: {
        type: 'secp256k1',
        keyBase64: privateKeyBase64,
        keyBytes: privateKeyBytes,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'secp256k1',
        keySize: 32, // 32 bytes for secp256k1 private key
      },
      publicKey: {
        type: 'secp256k1',
        keyBase64: publicKeyBase64,
        keyBytes: publicKeyPoint,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'secp256k1',
        keySize: 33, // 33 bytes for compressed secp256k1 public key
      },
      fingerprint,
      metadata: {
        fingerprint,
        keyType: 'secp256k1',
        algorithm: 'secp256k1',
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

    console.log('✅ secp256k1 key pair generated successfully');
    console.log('🔑 Key fingerprint:', fingerprint);
    console.log('🔑 Key type: secp256k1');
    console.log('🔑 Private key length:', privateKeyBase64.length);
    console.log('🔑 Public key length:', publicKeyBase64.length);

    return keyPair;
  } catch (error: unknown) {
    console.error('❌ secp256k1 key generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate secp256k1 key pair: " + errorMessage);
  }
};

/**
 * Sign data using secp256k1 signature
 */
export const signDataWithSecp256k1 = async (originalData: any, privateKey: any): Promise<string> => {
  try {
    console.log('🔐 Creating secp256k1 signature...');
    
    if (!privateKey || privateKey.type !== 'secp256k1') {
      throw new Error('Invalid secp256k1 private key format');
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
      console.log('📝 Signing small string data directly with secp256k1');
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
    
    // Hash the data with SHA-512 before signing
    const messageHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      new TextDecoder().decode(dataToSign),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert hash to bytes
    const messageHashBytes = new Uint8Array(
      messageHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Sign the hash using secp256k1
    const signature = secp256k1.sign(messageHashBytes, privateKey.keyBytes);
    
    // Convert signature to Base64
    const signatureBase64 = base64Encode(signature.toCompactRawBytes());
    
    console.log('✅ secp256k1 signature created');
    console.log('🔏 Signature length:', signatureBase64.length, 'characters');
    
    // Return simple signature package
    return JSON.stringify({
      signature: signatureBase64,
      algorithm: 'secp256k1',
      keyId: privateKey.keyId,
      timestamp: new Date().toISOString(),
      preHashed: typeof originalData === 'string' && originalData.length > 1000000,
      hashAlgorithm: 'SHA-512' // Add hash algorithm information
    });
    
  } catch (error: unknown) {
    console.error('❌ secp256k1 signing failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("secp256k1 signing failed: " + errorMessage);
  }
};

/**
 * Verify signature using secp256k1 verification
 */
export const verifySignatureWithSecp256k1 = async (signaturePackage: string, publicKey: any, originalData: any): Promise<boolean> => {
  try {
    console.log('🔍 Verifying secp256k1 signature...');
    
    if (!publicKey || publicKey.type !== 'secp256k1') {
      throw new Error('Invalid secp256k1 public key format');
    }
    
    const packageData = JSON.parse(signaturePackage);
    const { signature: signatureBase64, algorithm, preHashed } = packageData;
    
    if (algorithm !== 'secp256k1') {
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
    
    // Hash the data with SHA-512 before verifying
    const messageHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      new TextDecoder().decode(dataToVerify),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert hash to bytes
    const messageHashBytes = new Uint8Array(
      messageHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Convert signature from Base64 to Uint8Array
    const signatureBytes = base64Decode(signatureBase64);
    
    // Convert public key from Base64 to Uint8Array
    const publicKeyBytes = publicKey.keyBytes;
    
    // Verify the signature using secp256k1
    const isValid = secp256k1.verify(
      signatureBytes,
      messageHashBytes,
      publicKeyBytes
    );
    
    console.log('✅ secp256k1 signature verification completed');
    console.log('🔍 Signature valid:', isValid);
    
    return isValid;
    
  } catch (error: unknown) {
    console.error('❌ secp256k1 signature verification failed:', error);
    return false;
  }
};

/**
 * Store secp256k1 key pair securely
 */
export const storeSecp256k1KeyPair = async (privateKey: any, publicKey: any, fingerprint?: string) => {
  try {
    console.log('💾 Storing secp256k1 key pair securely...');
    
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
      keyType: 'secp256k1',
      algorithm: 'secp256k1',
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
    
    console.log('✅ secp256k1 key pair stored successfully');
    
  } catch (error: unknown) {
    console.error('❌ Failed to store secp256k1 key pair:', error);
    throw error;
  }
};

/**
 * Get stored secp256k1 key pair
 */
export const getStoredSecp256k1KeyPair = async () => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    
    const privateKeyStr = await SecureStore.getItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    const publicKeyStr = await SecureStore.getItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    
    if (!privateKeyStr || !publicKeyStr) {
      console.log('📱 No stored secp256k1 key pair found');
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
    
    console.log('✅ Retrieved stored secp256k1 key pair');
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
    console.error('❌ Failed to retrieve secp256k1 key pair:', error);
    return null;
  }
};

/**
 * Check if secp256k1 key pair exists
 */
export const hasStoredSecp256k1KeyPair = async (): Promise<boolean> => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const hasFlag = await SecureStore.getItemAsync(keyNames.generationFlag, SECURE_STORE_OPTIONS);
    return hasFlag === 'true';
  } catch (error: unknown) {
    console.error('❌ Failed to check secp256k1 key pair existence:', error);
    return false;
  }
};

/**
 * Get secp256k1 key pair information
 */
export const getSecp256k1KeyPairInfo = async () => {
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
      hasKeys: await hasStoredSecp256k1KeyPair(),
    };
    
  } catch (error: unknown) {
    console.error('❌ Failed to get secp256k1 key pair info:', error);
    return null;
  }
};

/**
 * Delete stored secp256k1 key pair
 */
export const deleteSecp256k1Keys = async (): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting stored secp256k1 key pair...');
    
    const keyNames = await getDeviceSpecificKeyNames();
    
    await SecureStore.deleteItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    
    console.log('✅ Successfully deleted secp256k1 key pair');
    return true;
    
  } catch (error: unknown) {
    console.error('❌ Failed to delete secp256k1 key pair:', error);
    return false;
  }
}; 