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

// Key name for device-specific key storage (kept for backward compatibility)
const DEVICE_KEY_PREFIX = 'device_secp256k1_key_';
const KEY_GENERATION_FLAG = 'secp256k1_keys_generated';
const APP_INSTALLATION_ID = 'app_installation_id';

// Device secure storage configuration options (kept for backward compatibility)
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  keychainService: 'GeoCamApp_Secp256k1Keys',
};

/**
 * Generate a unique application installation identifier
 * (Kept for backward compatibility with old key system)
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
 * (Kept for backward compatibility with old key system)
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

// Legacy key generation function removed - now using generateSecureKeyPair() instead

// =============================================================================
// LEGACY FUNCTIONS REMOVED - Now using secure key system
// =============================================================================
// - generateSecp256k1KeyPair() -> replaced by generateSecureKeyPair()
// - storeSecp256k1KeyPair() -> replaced by generateSecureKeyPair() (auto-stores)
// - signDataWithSecp256k1() -> removed (was too complex)
// - verifySignatureWithSecp256k1() -> not currently used
// =============================================================================

/**
 * Sign a hash with secp256k1 private key
 * Used by camera.tsx for image signing
 * This is a simplified replacement for the complex signDataWithSecp256k1 function
 */
export const signHashWithSecp256k1 = async (hashHex: string, privateKeyBase64: string): Promise<string> => {
  try {
    console.log('🔐 Signing hash with secp256k1...');
    
    // Convert HEX hash string to bytes
    const hashBytes = new Uint8Array(
      hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Convert private key from Base64 to bytes
    const privateKeyBytes = new Uint8Array(
      atob(privateKeyBase64).split('').map(c => c.charCodeAt(0))
    );
    
    // Sign the hash
    const signature = secp256k1.sign(hashBytes, privateKeyBytes);
    const signatureBase64 = btoa(String.fromCharCode(...signature.toCompactRawBytes()));
    
    console.log('✅ Hash signed successfully');
    return signatureBase64;
    
  } catch (error) {
    console.error('❌ Hash signing failed:', error);
    throw new Error(`Hash signing failed: ${error instanceof Error ? error.message : String(error)}`);
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

// =============================================================================
// MIGRATED FUNCTIONS FROM secureKeyManager.ts (Key Management Functions)
// =============================================================================

// Secure storage configuration for migrated key functions
const SECURE_STORE_OPTIONS_V2 = {
  requireAuthentication: false,
  authenticationPrompt: 'Authenticate to access GeoCam keys',
  keychainService: 'com.geocam.secure.keychain',
  showModal: true,
  cancelable: false,
};

// Key storage identifiers for migrated functions
const PRIVATE_KEY_STORAGE_KEY_V2 = 'geocam_private_key_v2';
const PUBLIC_KEY_STORAGE_KEY_V2 = 'geocam_public_key_v2';
const KEY_METADATA_STORAGE_KEY_V2 = 'geocam_key_metadata_v2';
const DEVICE_FINGERPRINT_KEY_V2 = 'geocam_device_fingerprint';

// Interfaces for migrated functions
export interface SecureKeyPair {
  privateKey: {
    keyId: string;
    algorithm: 'secp256k1';
    generatedAt: string;
    deviceFingerprint: string;
  };
  publicKey: {
    keyId: string;
    keyBase64: string;
    algorithm: 'secp256k1';
    fingerprint: string;
    generatedAt: string;
    deviceFingerprint: string;
  };
  metadata: {
    keyId: string;
    fingerprint: string;
    deviceModel: string;
    osName: string;
    osVersion: string;
    generatedAt: string;
    securityLevel: 'hardware' | 'software';
  };
}

/**
 * Generate device fingerprint for hardware-based identification
 * MIGRATED FROM: secureKeyManager.ts
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    let existingFingerprint = await SecureStore.getItemAsync(DEVICE_FINGERPRINT_KEY_V2);
    
    if (existingFingerprint) {
      return existingFingerprint;
    }
    
    const deviceInfo = {
      model: Device.modelName || 'unknown',
      osName: Device.osName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
      deviceType: Device.deviceType || 'unknown',
      randomComponent: await Crypto.getRandomBytesAsync(16)
    };
    
    const fingerprintData = JSON.stringify(deviceInfo);
    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fingerprintData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    await SecureStore.setItemAsync(DEVICE_FINGERPRINT_KEY_V2, fingerprint);
    return fingerprint;
  } catch (error) {
    console.error('❌ Failed to generate device fingerprint:', error);
    throw new Error('Device fingerprint generation failed');
  }
};

/**
 * Generate secure key pair - private key never leaves device
 * MIGRATED FROM: secureKeyManager.ts
 */
export const generateSecureKeyPair = async (): Promise<SecureKeyPair> => {
  try {
    console.log('🔐 Generating secure secp256k1 key pair...');
    
    const deviceFingerprint = await generateDeviceFingerprint();
    console.log('📱 Device fingerprint generated:', deviceFingerprint);
    
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const publicKeyPoint = secp256k1.getPublicKey(privateKeyBytes);
    
    const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyBytes));
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyPoint));
    
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const fingerprint = publicKeyHash.substring(0, 16);
    
    const keyId = `geocam_${Date.now()}_${fingerprint}`;
    const generatedAt = new Date().toISOString();
    
    await SecureStore.setItemAsync(
      PRIVATE_KEY_STORAGE_KEY_V2,
      JSON.stringify({
        keyId,
        keyBase64: privateKeyBase64,
        algorithm: 'secp256k1',
        generatedAt,
        deviceFingerprint
      }),
      SECURE_STORE_OPTIONS_V2
    );
    
    const publicKeyData = {
      keyId,
      keyBase64: publicKeyBase64,
      algorithm: 'secp256k1' as const,
      fingerprint,
      generatedAt,
      deviceFingerprint
    };
    
    await SecureStore.setItemAsync(
      PUBLIC_KEY_STORAGE_KEY_V2,
      JSON.stringify(publicKeyData)
    );
    
    const metadata = {
      keyId,
      fingerprint,
      deviceModel: Device.modelName || 'unknown',
      osName: Device.osName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
      generatedAt,
      securityLevel: 'hardware' as const
    };
    
    await SecureStore.setItemAsync(
      KEY_METADATA_STORAGE_KEY_V2,
      JSON.stringify(metadata)
    );
    
    console.log('✅ Secure key pair generated successfully');
    
    return {
      privateKey: {
        keyId,
        algorithm: 'secp256k1',
        generatedAt,
        deviceFingerprint
      },
      publicKey: publicKeyData,
      metadata
    };
    
  } catch (error) {
    console.error('❌ Secure key pair generation failed:', error);
    throw new Error('Failed to generate secure key pair');
  }
};

/**
 * Check if secure keys exist
 * MIGRATED FROM: secureKeyManager.ts
 */
export const hasSecureKeys = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking if secure keys exist...');
    
    const privateKeyExists = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY_V2, SECURE_STORE_OPTIONS_V2);
    const publicKeyExists = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY_V2);
    
    console.log('🔑 Private key exists:', !!privateKeyExists);
    console.log('🔑 Public key exists:', !!publicKeyExists);
    
    const keysExist = !!(privateKeyExists && publicKeyExists);
    console.log('✅ Secure keys exist:', keysExist);
    
    return keysExist;
  } catch (error) {
    console.error('❌ Failed to check for secure keys:', error);
    return false;
  }
};

/**
 * Delete secure keys (for reset/debugging)
 * MIGRATED FROM: secureKeyManager.ts
 */
export const deleteSecureKeys = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY_V2, SECURE_STORE_OPTIONS_V2);
    await SecureStore.deleteItemAsync(PUBLIC_KEY_STORAGE_KEY_V2);
    await SecureStore.deleteItemAsync(KEY_METADATA_STORAGE_KEY_V2);
    
    console.log('✅ Secure keys deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete secure keys:', error);
    return false;
  }
};

/**
 * Initialize secure key management
 * MIGRATED FROM: secureBackendService.ts
 */
export const initializeSecureKeys = async (): Promise<{
  success: boolean;
  hasKeys: boolean;
  message: string;
}> => {
  try {
    console.log('🔐 Initializing secure key management...');
    
    const keyExists = await hasSecureKeys();
    
    if (keyExists) {
      console.log('✅ Secure keys already exist');
      return {
        success: true,
        hasKeys: true,
        message: 'Secure keys already initialized'
      };
    }
    
    console.log('🔑 Generating new secure key pair...');
    const keyPair = await generateSecureKeyPair();
    
    console.log('✅ Secure key pair generated successfully');
    console.log('🔑 Key ID:', keyPair.privateKey.keyId);
    console.log('🔑 Public Key Fingerprint:', keyPair.metadata.fingerprint);
    
    return {
      success: true,
      hasKeys: true,
      message: 'Secure keys generated successfully'
    };
    
  } catch (error) {
    console.error('❌ Failed to initialize secure keys:', error);
    return {
      success: false,
      hasKeys: false,
      message: `Key initialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Get secure keys in registration format
 * This function bridges the new secure key system with the old registration format
 */
export const getSecureKeysForRegistration = async () => {
  try {
    console.log('🔑 Getting secure keys for registration...');
    
    // Check if secure keys exist
    const hasKeys = await hasSecureKeys();
    if (!hasKeys) {
      console.log('❌ No secure keys found');
      return null;
    }
    
    // Get private and public key data
    const privateKeyData = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY_V2, SECURE_STORE_OPTIONS_V2);
    const publicKeyData = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY_V2);
    const metadataData = await SecureStore.getItemAsync(KEY_METADATA_STORAGE_KEY_V2);
    
    if (!privateKeyData || !publicKeyData || !metadataData) {
      console.log('❌ Incomplete secure key data');
      return null;
    }
    
    const privateKey = JSON.parse(privateKeyData);
    const publicKey = JSON.parse(publicKeyData);
    const metadata = JSON.parse(metadataData);
    
    // Get installation ID for compatibility
    const installationId = await getOrCreateInstallationId();
    
    // Format keys to match the old registration format
    const registrationKeyPair = {
      privateKey: {
        ...privateKey,
        installationId, // Add installation ID for registration
      },
      publicKey: {
        ...publicKey,
        type: 'secp256k1_secure', // Mark as secure key type
        keySize: '256', // Standard secp256k1 key size
      },
      fingerprint: metadata.fingerprint,
    };
    
    console.log('✅ Secure keys formatted for registration:');
    console.log('🔑 Key ID:', registrationKeyPair.publicKey.keyId);
    console.log('🔑 Fingerprint:', registrationKeyPair.fingerprint);
    console.log('🔑 Installation ID:', installationId);
    
    return registrationKeyPair;
    
  } catch (error) {
    console.error('❌ Failed to get secure keys for registration:', error);
    return null;
  }
}; 