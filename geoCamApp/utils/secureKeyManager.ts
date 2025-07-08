import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
import * as Device from 'expo-device';

/**
 * Enhanced Secure Key Management for GeoCam
 * Private keys never leave the device, only public keys are transmitted
 */

// Secure storage configuration
const SECURE_STORE_OPTIONS = {
  requireAuthentication: false, // Disabled for testing - enable in production
  authenticationPrompt: 'Authenticate to access GeoCam keys',
  keychainService: 'com.geocam.secure.keychain',
  showModal: true,
  cancelable: false,
};

// Key storage identifiers
const PRIVATE_KEY_STORAGE_KEY = 'geocam_private_key_v2';
const PUBLIC_KEY_STORAGE_KEY = 'geocam_public_key_v2';
const KEY_METADATA_STORAGE_KEY = 'geocam_key_metadata_v2';
const DEVICE_FINGERPRINT_KEY = 'geocam_device_fingerprint';

export interface SecureKeyPair {
  privateKey: {
    keyId: string;
    algorithm: 'secp256k1';
    generatedAt: string;
    deviceFingerprint: string;
    // Private key bytes are never exposed outside secure functions
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

export interface DeviceRegistrationData {
  installation_id: string;
  device_model: string;
  os_name: string;
  os_version: string;
  public_key: {
    keyBase64: string;
    keyId: string;
    algorithm: 'secp256k1';
    fingerprint: string;
  };
  device_fingerprint: string;
  registration_timestamp: string;
}

export interface SignedImageData {
  signature: string;
  publicKeyId: string;
  timestamp: string;
  metadata: any;
}

/**
 * Generate device fingerprint for hardware-based identification
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    let existingFingerprint = await SecureStore.getItemAsync(DEVICE_FINGERPRINT_KEY);
    
    if (existingFingerprint) {
      return existingFingerprint;
    }
    
    // Create fingerprint from device characteristics
    const deviceInfo = {
      model: Device.modelName || 'unknown',
      osName: Device.osName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
      deviceType: Device.deviceType || 'unknown',
      // Add random component to ensure uniqueness
      randomComponent: await Crypto.getRandomBytesAsync(16)
    };
    
    const fingerprintData = JSON.stringify(deviceInfo);
    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fingerprintData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    await SecureStore.setItemAsync(DEVICE_FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  } catch (error) {
    console.error('❌ Failed to generate device fingerprint:', error);
    throw new Error('Device fingerprint generation failed');
  }
};

/**
 * Generate secure key pair - private key never leaves device
 */
export const generateSecureKeyPair = async (): Promise<SecureKeyPair> => {
  try {
    console.log('🔐 Generating secure secp256k1 key pair...');
    
    const deviceFingerprint = await generateDeviceFingerprint();
    console.log('📱 Device fingerprint generated:', deviceFingerprint);
    
    // Generate private key using secure random number generator
    console.log('🔑 Generating secp256k1 private key...');
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const publicKeyPoint = secp256k1.getPublicKey(privateKeyBytes);
    
    // Convert to Base64 for storage
    const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyBytes));
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyPoint));
    
    console.log('🔑 Keys generated, creating fingerprint...');
    
    // Generate key fingerprint
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      publicKeyBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const fingerprint = publicKeyHash.substring(0, 16);
    
    const keyId = `geocam_${Date.now()}_${fingerprint}`;
    const generatedAt = new Date().toISOString();
    
    console.log('💾 Storing keys in secure storage...');
    
    // Store private key securely (never to be transmitted)
    await SecureStore.setItemAsync(
      PRIVATE_KEY_STORAGE_KEY,
      JSON.stringify({
        keyId,
        keyBase64: privateKeyBase64,
        algorithm: 'secp256k1',
        generatedAt,
        deviceFingerprint
      }),
      SECURE_STORE_OPTIONS
    );
    
    console.log('✅ Private key stored securely');
    
    // Store public key (safe to transmit)
    const publicKeyData = {
      keyId,
      keyBase64: publicKeyBase64,
      algorithm: 'secp256k1' as const,
      fingerprint,
      generatedAt,
      deviceFingerprint
    };
    
    await SecureStore.setItemAsync(
      PUBLIC_KEY_STORAGE_KEY,
      JSON.stringify(publicKeyData)
    );
    
    console.log('✅ Public key stored');
    
    // Store metadata
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
      KEY_METADATA_STORAGE_KEY,
      JSON.stringify(metadata)
    );
    
    console.log('✅ Metadata stored');
    
    console.log('✅ Secure key pair generated successfully');
    console.log('🔑 Key ID:', keyId);
    console.log('🔑 Fingerprint:', fingerprint);
    console.log('🔑 Device Fingerprint:', deviceFingerprint);
    
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
 * Get public key data for registration (safe to transmit)
 */
export const getPublicKeyForRegistration = async (): Promise<DeviceRegistrationData | null> => {
  try {
    console.log('🔍 Getting public key for registration...');
    
    const publicKeyStr = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
    const metadataStr = await SecureStore.getItemAsync(KEY_METADATA_STORAGE_KEY);
    
    console.log('🔍 Public key exists:', !!publicKeyStr);
    console.log('🔍 Metadata exists:', !!metadataStr);
    
    if (!publicKeyStr || !metadataStr) {
      console.log('❌ No public key or metadata found in secure storage');
      console.log('🔍 PUBLIC_KEY_STORAGE_KEY:', PUBLIC_KEY_STORAGE_KEY);
      console.log('🔍 KEY_METADATA_STORAGE_KEY:', KEY_METADATA_STORAGE_KEY);
      
      // Check what keys are actually in SecureStore
      console.log('🔍 Checking all available keys in SecureStore...');
      try {
        const allKeys = ['private_key_secp256k1', 'public_key_secp256k1', 'key_metadata_secp256k1'];
        for (const key of allKeys) {
          const value = await SecureStore.getItemAsync(key);
          console.log(`🔍 ${key}: ${!!value}`);
        }
      } catch (debugError) {
        console.log('❌ Error checking SecureStore keys:', debugError);
      }
      
      return null;
    }
    
    const publicKey = JSON.parse(publicKeyStr);
    const metadata = JSON.parse(metadataStr);
    const deviceFingerprint = await generateDeviceFingerprint();
    
    console.log('✅ Public key loaded successfully');
    console.log('🔑 Key ID:', publicKey.keyId);
    console.log('🔑 Key Algorithm:', publicKey.algorithm);
    console.log('🔑 Key Fingerprint:', publicKey.fingerprint);
    
    // Get the actual installation ID from the old system for backwards compatibility
    const { getOrCreateInstallationId } = require('./secp256k1Utils');
    const actualInstallationId = await getOrCreateInstallationId();
    
    const registrationData = {
      installation_id: actualInstallationId,
      device_model: Device.modelName || 'unknown',
      os_name: Device.osName || 'unknown',
      os_version: Device.osVersion || 'unknown',
      public_key: {
        keyBase64: publicKey.keyBase64,
        keyId: publicKey.keyId,
        algorithm: 'secp256k1' as const,
        fingerprint: publicKey.fingerprint
      },
      device_fingerprint: deviceFingerprint,
      registration_timestamp: new Date().toISOString()
    };
    
    console.log('📤 Registration data prepared successfully');
    return registrationData;
    
  } catch (error) {
    console.error('❌ Failed to get public key for registration:', error);
    return null;
  }
};

/**
 * Sign image data locally with device private key
 * Private key never leaves the device - Enhanced security implementation
 * FIXED: Now signs image data directly for consistency with server verification
 */
export const signImageDataSecurely = async (imageData: string, metadata: any): Promise<SignedImageData> => {
  try {
    console.log('🔐 Signing image data with device private key...');
    
    // Get private key from secure storage
    const privateKeyStr = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY, SECURE_STORE_OPTIONS);
    const publicKeyStr = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
    
    if (!privateKeyStr || !publicKeyStr) {
      throw new Error('No keys found in secure storage');
    }
    
    const privateKeyData = JSON.parse(privateKeyStr);
    const publicKeyData = JSON.parse(publicKeyStr);
    
    // Create timestamp for replay attack protection
    const timestamp = new Date().toISOString();
    
    // SECURITY FIX: Sign image data directly (consistent with server verification)
    // Server calculates: SHA512(image_data)
    // Client should sign: SHA512(image_data)
    const imageDataHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      imageData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert private key from Base64 to bytes
    const privateKeyBytes = new Uint8Array(
      atob(privateKeyData.keyBase64).split('').map(c => c.charCodeAt(0))
    );
    
    // Convert hash to bytes for signing
    const hashBytes = new Uint8Array(
      imageDataHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Sign the image data hash using secp256k1
    const signature = secp256k1.sign(hashBytes, privateKeyBytes);
    const signatureBase64 = btoa(String.fromCharCode(...signature.toCompactRawBytes()));
    
    console.log('✅ Image data signed successfully');
    console.log('🔐 Signature length:', signatureBase64.length);
    console.log('📊 Image data hash:', imageDataHash);
    console.log('🛡️  Timestamp:', timestamp);
    console.log('🔧 SECURITY FIX: Now signing image data directly for server consistency');
    
    return {
      signature: signatureBase64,
      publicKeyId: publicKeyData.keyId,
      timestamp,
      metadata
    };
    
  } catch (error) {
    console.error('❌ Failed to sign image data:', error);
    throw new Error(`Image signing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Verify signature locally (for testing purposes)
 */
export const verifySignatureLocally = async (
  signature: string,
  originalData: string,
  publicKeyBase64: string
): Promise<boolean> => {
  try {
    console.log('🔍 Verifying signature locally...');
    
    // Hash the original data
    const dataHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      originalData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert signature and public key from Base64
    const signatureBytes = new Uint8Array(
      atob(signature).split('').map(c => c.charCodeAt(0))
    );
    
    const publicKeyBytes = new Uint8Array(
      atob(publicKeyBase64).split('').map(c => c.charCodeAt(0))
    );
    
    const hashBytes = new Uint8Array(
      dataHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Verify signature
    const isValid = secp256k1.verify(signatureBytes, hashBytes, publicKeyBytes);
    
    console.log('✅ Local signature verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
    
  } catch (error) {
    console.error('❌ Local signature verification failed:', error);
    return false;
  }
};

/**
 * Check if secure keys exist
 */
export const hasSecureKeys = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking if secure keys exist...');
    
    const privateKeyExists = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY, SECURE_STORE_OPTIONS);
    const publicKeyExists = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
    
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
 */
export const deleteSecureKeys = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(PUBLIC_KEY_STORAGE_KEY);
    await SecureStore.deleteItemAsync(KEY_METADATA_STORAGE_KEY);
    
    console.log('✅ Secure keys deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete secure keys:', error);
    return false;
  }
};

/**
 * Get key metadata (safe to display)
 */
export const getKeyMetadata = async () => {
  try {
    const metadataStr = await SecureStore.getItemAsync(KEY_METADATA_STORAGE_KEY);
    return metadataStr ? JSON.parse(metadataStr) : null;
  } catch (error) {
    console.error('❌ Failed to get key metadata:', error);
    return null;
  }
};
