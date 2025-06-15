import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import * as nacl from 'tweetnacl';

// Configure TweetNaCl with Expo's random number generator
nacl.setPRNG((x: Uint8Array, n: number) => {
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

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
const DEVICE_KEY_PREFIX = 'device_nacl_key_';
const KEY_GENERATION_FLAG = 'nacl_keys_generated';
const APP_INSTALLATION_ID = 'app_installation_id';

// Device secure storage configuration options
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  keychainService: 'GeoCamApp_NaClKeys',
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
 * Generate a NaCl signing key pair using TweetNaCl
 */
export const generateNaClKeyPair = async () => {
  try {
    console.log('🔐 Generating NaCl signing key pair with TweetNaCl...');
    
    const installationId = await getOrCreateInstallationId();
    
    // Generate Ed25519 key pair using TweetNaCl
    const keyPair = nacl.sign.keyPair();
    
    // Validate key pair (security check)
    if (!keyPair.secretKey || keyPair.secretKey.length !== 64) {
      throw new Error('Invalid secret key generated');
    }
    if (!keyPair.publicKey || keyPair.publicKey.length !== 32) {
      throw new Error('Invalid public key generated');
    }
    
    // Convert to Base64 for storage and transmission
    const privateKeyBase64 = base64Encode(keyPair.secretKey);
    const publicKeyBase64 = base64Encode(keyPair.publicKey);
    
    // Generate key fingerprint from public key
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const fingerprint = publicKeyHash.substring(0, 16);

    const keyId = `nacl_key_${Date.now()}`;
    const generatedAt = new Date().toISOString();
    
    const naclKeyPair = {
      privateKey: {
        type: 'NaCl-Ed25519',
        keyBase64: privateKeyBase64,
        keyBytes: keyPair.secretKey,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'Ed25519',
        keySize: 64, // 64 bytes for Ed25519 secret key
      },
      publicKey: {
        type: 'NaCl-Ed25519',
        keyBase64: publicKeyBase64,
        keyBytes: keyPair.publicKey,
        keyId,
        generatedAt,
        installationId,
        algorithm: 'Ed25519',
        keySize: 32, // 32 bytes for Ed25519 public key
      },
      fingerprint,
      metadata: {
        fingerprint,
        keyType: 'NaCl-Ed25519',
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

    console.log('✅ NaCl key pair generated successfully');
    console.log('🔑 Key fingerprint:', fingerprint);
    console.log('🔑 Key type: Ed25519');
    console.log('🔑 Private key length:', privateKeyBase64.length);
    console.log('🔑 Public key length:', publicKeyBase64.length);

    return naclKeyPair;
  } catch (error: unknown) {
    console.error('❌ NaCl key generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate NaCl key pair: " + errorMessage);
  }
};

/**
 * Sign data using NaCl detached signature
 */
export const signDataWithNaCl = async (originalData: any, privateKey: any): Promise<string> => {
  try {
    console.log('🔐 Creating NaCl detached signature...');
    
    if (!privateKey || privateKey.type !== 'NaCl-Ed25519') {
      throw new Error('Invalid NaCl private key format');
    }
    
    // Create signature data with timestamp and device info
    const signatureData = {
      ...originalData,
      timestamp: new Date().toISOString(),
      keyId: privateKey.keyId,
      deviceInfo: {
        model: Device.modelName,
        os: Device.osName,
        version: Device.osVersion
      },
      nonce: Array.from(Crypto.getRandomBytes(16)).map(b => b.toString(16).padStart(2, '0')).join('')
    };

    const dataToSign = JSON.stringify(signatureData, Object.keys(signatureData).sort());
    
    // Convert data to Uint8Array for signing
    const dataBytes = new TextEncoder().encode(dataToSign);
    
    // Create detached signature using TweetNaCl (includes internal hashing)
    const signature = nacl.sign.detached(dataBytes, privateKey.keyBytes);
    
    // Convert signature to Base64
    const signatureBase64 = base64Encode(signature);
    
    console.log('✅ NaCl detached signature created');
    console.log('📝 Signed data length:', dataToSign.length);
    console.log('🔏 Signature length:', signatureBase64.length);
    
    return JSON.stringify({
      signature: signatureBase64,
      signedData: signatureData,
      algorithm: 'Ed25519'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("NaCl signing failed: " + errorMessage);
  }
};

/**
 * Verify signature using NaCl detached verification
 */
export const verifySignatureWithNaCl = async (signaturePackage: string, publicKey: any): Promise<boolean> => {
  try {
    console.log('🔍 Verifying NaCl detached signature...');
    
    if (!publicKey || publicKey.type !== 'NaCl-Ed25519') {
      throw new Error('Invalid NaCl public key format');
    }
    
    const packageData = JSON.parse(signaturePackage);
    const { signature: signatureBase64, signedData, algorithm } = packageData;
    
    if (algorithm !== 'Ed25519') {
      throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }
    
    // Reconstruct the original signed data
    const dataToVerify = JSON.stringify(signedData, Object.keys(signedData).sort());
    const dataBytes = new TextEncoder().encode(dataToVerify);
    
    // Convert signature from Base64 to Uint8Array
    const signatureBytes = base64Decode(signatureBase64);
    
    // Verify the detached signature
    const isValid = nacl.sign.detached.verify(dataBytes, signatureBytes, publicKey.keyBytes);
    
    console.log('✅ NaCl signature verification completed');
    console.log('🔍 Signature valid:', isValid);
    
    return isValid;
    
  } catch (error: unknown) {
    console.error('❌ NaCl signature verification failed:', error);
    return false;
  }
};

/**
 * Store NaCl key pair securely
 */
export const storeNaClKeyPair = async (privateKey: any, publicKey: any, fingerprint?: string) => {
  try {
    console.log('💾 Storing NaCl key pair securely...');
    
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
      keyType: 'NaCl-Ed25519',
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
    
    console.log('✅ NaCl key pair stored successfully');
    
  } catch (error: unknown) {
    console.error('❌ Failed to store NaCl key pair:', error);
    throw error;
  }
};

/**
 * Get stored NaCl key pair
 */
export const getStoredNaClKeyPair = async () => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    
    const privateKeyStr = await SecureStore.getItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    const publicKeyStr = await SecureStore.getItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    
    if (!privateKeyStr || !publicKeyStr) {
      console.log('📱 No stored NaCl key pair found');
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
    
    console.log('✅ Retrieved stored NaCl key pair');
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
    console.error('❌ Failed to retrieve NaCl key pair:', error);
    return null;
  }
};

/**
 * Check if NaCl key pair exists
 */
export const hasStoredNaClKeyPair = async (): Promise<boolean> => {
  try {
    const keyNames = await getDeviceSpecificKeyNames();
    const hasFlag = await SecureStore.getItemAsync(keyNames.generationFlag, SECURE_STORE_OPTIONS);
    return hasFlag === 'true';
  } catch (error: unknown) {
    console.error('❌ Failed to check NaCl key pair existence:', error);
    return false;
  }
};

/**
 * Get NaCl key pair information
 */
export const getNaClKeyPairInfo = async () => {
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
      hasKeys: await hasStoredNaClKeyPair(),
    };
    
  } catch (error: unknown) {
    console.error('❌ Failed to get NaCl key pair info:', error);
    return null;
  }
};

/**
 * Delete stored NaCl keys
 */
export const deleteNaClKeys = async (): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting stored NaCl keys...');
    
    const keyNames = await getDeviceSpecificKeyNames();
    
    await SecureStore.deleteItemAsync(keyNames.privateKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.publicKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.keyMetadata, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(keyNames.generationFlag, SECURE_STORE_OPTIONS);
    
    console.log('✅ NaCl keys deleted successfully');
    return true;
    
  } catch (error: unknown) {
    console.error('❌ Failed to delete NaCl keys:', error);
    return false;
  }
};

 