import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
import { buildApiUrl, buildSteganographyUrl, BACKEND_CONFIG } from './backendConfig';
import { getSecureKeysForRegistration } from './secp256k1Utils';

// Storage key for GeoCam device name
const GEOCAM_DEVICE_NAME_KEY = 'geocam_device_name';

// Types for API responses
export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  device_id?: string;
  geocam_sequence?: string;
  geocam_name?: string;
}

export interface SecureVerificationResponse {
  success: boolean;
  verification_result?: {
    signature_valid: boolean;
    is_authentic: boolean;
    device_info: {
      device_model: string;
      os_name: string;
      registration_date: string;
      public_key_fingerprint: string;
    };
    verification_timestamp: string;
    image_hash: string;
    security_checks: {
      signature_format: boolean;
      public_key_format: boolean;
      hash_format: boolean;
      timestamp_valid: boolean;
      signature_verified: boolean;
    };
    error_details?: string;
  };
  message?: string;
  error?: string;
}

/**
 * Get stored GeoCam device name
 */
export const getStoredGeoCamDeviceName = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(GEOCAM_DEVICE_NAME_KEY);
  } catch (error) {
    console.error('❌ Failed to get GeoCam device name:', error);
    return null;
  }
};

/**
 * Store GeoCam device name
 */
export const storeGeoCamDeviceName = async (name: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(GEOCAM_DEVICE_NAME_KEY, name);
    return true;
  } catch (error) {
    console.error('❌ Failed to store GeoCam device name:', error);
    return false;
  }
};

/**
 * Clear stored GeoCam device name (used when device is not found in database)
 */
export const clearGeoCamDeviceName = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(GEOCAM_DEVICE_NAME_KEY);
    console.log('🗑️ Cleared stored GeoCam device name');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear GeoCam device name:', error);
    return false;
  }
};

export interface ImageVerificationResponse {
  success: boolean;
  message: string;
  verification_result?: {
    is_authentic: boolean;
    decoded_data?: any;
    signature_valid?: boolean;
    device_info?: any;
  };
  error?: string;
}

/**
 * Register device with backend using secp256k1 public key
 */
export const registerDevice = async () => {
  try {
    console.log('📱 Starting device registration with secp256k1 keys...');
    
    // Get secure keys (V2 system only)
    const keyPair = await getSecureKeysForRegistration();
    
    if (!keyPair) {
      console.error('❌ No secure keys found for registration');
      return {
        success: false,
        message: 'No secure keys available for registration',
      };
    }
    
    console.log('✅ Found secure keys for registration:', keyPair.publicKey.type);

    // Prepare device registration data with ONLY the necessary public key data
    const registrationData = {
      installation_id: keyPair.privateKey.installationId,
      device_model: Device.modelName || 'Unknown',
      os_name: Device.osName || 'Unknown',
      os_version: Device.osVersion || 'Unknown',
      // Only send the complete public key data - no redundant fields!
      public_key_data: {
        type: keyPair.publicKey.type,
        keyId: keyPair.publicKey.keyId,
        keyBase64: keyPair.publicKey.keyBase64,  // Complete secp256k1 public key in Base64 format
        algorithm: keyPair.publicKey.algorithm,
        keySize: keyPair.publicKey.keySize,
        generatedAt: keyPair.publicKey.generatedAt,
        hash: keyPair.fingerprint,  // Fingerprint included here
      },
      app_version: '1.0.0',
      registration_timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending simplified secp256k1 registration data:', {
      installation_id: registrationData.installation_id,
      device_model: registrationData.device_model,
      public_key_type: registrationData.public_key_data.type,
      public_key_algorithm: registrationData.public_key_data.algorithm,
      public_key_size: registrationData.public_key_data.keySize,
      public_key_hash: registrationData.public_key_data.hash,
      public_key_length: registrationData.public_key_data.keyBase64.length,
    });

    // Send registration request to backend
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.REGISTER_DEVICE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Device registration successful:', result);
      
      // Store the assigned GeoCam device name
      if (result.geocam_name) {
        await storeGeoCamDeviceName(result.geocam_name);
      }
      
      return {
        success: true,
        ...result
      };
    } else {
      console.error('❌ Device registration failed:', result);
      return {
        success: false,
        message: result.message || 'Device registration failed',
      };
    }
  } catch (error) {
    console.error('❌ Device registration error:', error);
    return {
      success: false,
      message: 'Network error during device registration',
    };
  }
};

/**
 * Check if device is already registered
 */
export const checkDeviceRegistration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking device registration status...');
    
    // Try to get secure keys first (new system), then fall back to old system
    const keyPair = await getSecureKeysForRegistration();
    
    if (!keyPair) {
      console.log('❌ No secure keys found - device cannot be registered');
      return false;
    }
    
    console.log('✅ Found secure keys for registration check:', keyPair.publicKey.type);

    // Use the existing DEVICES endpoint to check registration
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.DEVICES), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Registration check result:', result);
      
      // Check if our installation ID is in the registered devices
      const devices = result.devices || [];
      const registeredDevice = devices.find((device: any) => 
        device.installation_id === keyPair.privateKey.installationId ||
        device.public_key_fingerprint === keyPair.fingerprint ||
        device.public_key_id === keyPair.publicKey.keyId
      );
      
      if (registeredDevice && registeredDevice.geocam_sequence) {
        // Device is registered, save the GeoCam device name
        const geocamName = `GeoCam${registeredDevice.geocam_sequence}`;
        await storeGeoCamDeviceName(geocamName);
        console.log('💾 Saved GeoCam device name from registration check:', geocamName);
        return true;
      } else {
        // Device is not registered, clear any stale local device name
        const currentStoredName = await getStoredGeoCamDeviceName();
        if (currentStoredName) {
          console.log('🗑️ Device not found in database, clearing stale local name:', currentStoredName);
          await clearGeoCamDeviceName();
        }
        return false;
      }
    } else {
      console.warn('⚠️ Registration check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Registration check error:', error);
    return false;
  }
};

/**
 * Automatic registration: Check if device is registered, and register if not
 */
export const ensureDeviceRegistration = async (): Promise<{
  success: boolean;
  isRegistered: boolean;
  wasRegistered: boolean;
  message: string;
  geocamName?: string;
}> => {
  try {
    console.log('🔄 Ensuring device registration...');
    
    // First check if device is already registered
    const wasRegistered = await checkDeviceRegistration();
    
    if (wasRegistered) {
      const geocamName = await getStoredGeoCamDeviceName();
      console.log('✅ Device already registered:', geocamName);
      return {
        success: true,
        isRegistered: true,
        wasRegistered: true,
        message: `Device already registered as ${geocamName}`,
        geocamName: geocamName || undefined,
      };
    }
    
    // Device not registered, attempt registration
    console.log('📱 Device not registered, attempting registration...');
    const registrationResult = await registerDevice();
    
    if (registrationResult.success) {
      const geocamName = registrationResult.geocam_name || 
                        (registrationResult.geocam_sequence ? `GeoCam${registrationResult.geocam_sequence}` : null);
      console.log('✅ Device registration successful:', geocamName);
      return {
        success: true,
        isRegistered: true,
        wasRegistered: false,
        message: `Device registered successfully as ${geocamName}`,
        geocamName: geocamName || undefined,
      };
    } else {
      console.error('❌ Device registration failed:', registrationResult.message);
      return {
        success: false,
        isRegistered: false,
        wasRegistered: false,
        message: `Registration failed: ${registrationResult.message}`,
      };
    }
  } catch (error) {
    console.error('❌ Device registration check/registration error:', error);
    return {
      success: false,
      isRegistered: false,
      wasRegistered: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Complete Fresh Start: Delete from DB + Reset Keys + Re-register
 */
export const performFreshDeviceStart = async (): Promise<{
  success: boolean;
  message: string;
  geocamName?: string;
  steps: {
    databaseDeletion: { success: boolean; message: string };
    keyReset: { success: boolean; message: string };
    keyGeneration: { success: boolean; message: string };
    registration: { success: boolean; message: string; geocamName?: string };
  };
}> => {
  const steps = {
    databaseDeletion: { success: false, message: '' },
    keyReset: { success: false, message: '' },
    keyGeneration: { success: false, message: '' },
    registration: { success: false, message: '', geocamName: undefined as string | undefined },
  };

  try {
    console.log('🔄 === FRESH DEVICE START WORKFLOW ===');

    // Step 1: Delete from database first (while we still have keys to identify device)
    console.log('🗑️ Step 1: Deleting device from database...');
    const deletionResult = await deleteCurrentDeviceFromDatabase();
    steps.databaseDeletion = deletionResult;
    console.log('📊 Database deletion result:', deletionResult);

    // Step 2: Reset local keys and device name
    console.log('🔑 Step 2: Resetting local keys and device name...');
    const { deleteSecureKeys } = await import('./secp256k1Utils.js');
    const secureKeyResetSuccess = await deleteSecureKeys();
    const deviceNameClearSuccess = await clearGeoCamDeviceName();
    
    steps.keyReset = {
      success: secureKeyResetSuccess && deviceNameClearSuccess,
      message: secureKeyResetSuccess && deviceNameClearSuccess ? 
        'Secure keys and device name cleared' : 
        'Failed to clear secure keys or device name'
    };
    console.log('📊 Key reset result:', steps.keyReset);

    if (!steps.keyReset.success) {
      throw new Error('Failed to reset local keys and device name');
    }

    // Step 3: Generate new secure keys
    console.log('🔐 Step 3: Generating new secure keys...');
    const { generateSecureKeyPair } = await import('./secp256k1Utils.js');
    
    try {
      await generateSecureKeyPair(); // This function generates and stores keys automatically
      
      steps.keyGeneration = {
        success: true,
        message: 'New secure keys generated and stored'
      };
      console.log('📊 Key generation result:', steps.keyGeneration);
    } catch (keyGenError) {
      steps.keyGeneration = {
        success: false,
        message: `Key generation failed: ${keyGenError instanceof Error ? keyGenError.message : String(keyGenError)}`
      };
      throw keyGenError;
    }

    // Step 4: Register with new keys
    console.log('📱 Step 4: Registering device with new keys...');
    const registrationResult = await registerDevice();
    
    steps.registration = {
      success: registrationResult.success,
      message: registrationResult.message,
      geocamName: registrationResult.geocam_name || 
                 (registrationResult.geocam_sequence ? `GeoCam${registrationResult.geocam_sequence}` : undefined)
    };
    console.log('📊 Registration result:', steps.registration);

    if (registrationResult.success) {
      console.log('✅ === FRESH START COMPLETED SUCCESSFULLY ===');
      return {
        success: true,
        message: `Fresh start completed! Device registered as ${steps.registration.geocamName}`,
        geocamName: steps.registration.geocamName,
        steps
      };
    } else {
      throw new Error(`Registration failed: ${registrationResult.message}`);
    }

  } catch (error) {
    console.error('❌ === FRESH START FAILED ===', error);
    return {
      success: false,
      message: `Fresh start failed: ${error instanceof Error ? error.message : String(error)}`,
      steps
    };
  }
};

/**
 * Delete current device from database (used for fresh start/reset)
 */
export const deleteCurrentDeviceFromDatabase = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🗑️ Deleting current device from database...');
    
    const keyPair = await getSecureKeysForRegistration();
    if (!keyPair) {
      console.log('❌ No secure keys found - cannot identify device for deletion');
      return {
        success: false,
        message: 'No secure keys found to identify device for deletion',
      };
    }

    // Use a hypothetical delete endpoint (you may need to implement this in backend)
    const response = await fetch(buildApiUrl('/api/delete-device'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        installation_id: keyPair.privateKey.installationId,
        key_fingerprint: keyPair.fingerprint,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Device deleted from database:', result);
      return {
        success: true,
        message: result.message || 'Device deleted from database',
      };
    } else if (response.status === 404) {
      // Device not found in database - that's OK for our purposes
      console.log('ℹ️ Device not found in database (already deleted or never registered)');
      return {
        success: true,
        message: 'Device was not in database',
      };
    } else {
      const errorResult = await response.json().catch(() => ({}));
      console.error('❌ Failed to delete device from database:', errorResult);
      return {
        success: false,
        message: errorResult.message || `Database deletion failed: ${response.status}`,
      };
    }
  } catch (error) {
    console.error('❌ Error deleting device from database:', error);
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * NEW FULL BACKEND WORKFLOW: Process GeoCam image (Step 1)
 * Send JPEG + basic info to backend, get hash to sign
 */
export const processGeoCamImageBackend = async (
  jpegBase64: string,
  basicInfo: string,
  publicKey: string
): Promise<{
  success: boolean;
  sessionId?: string;
  hashToSign?: string;
  imageInfo?: {
    width: number;
    height: number;
    rgbaSize: number;
  };
  error?: string;
}> => {
  try {
    console.log('🎯 === FULL BACKEND WORKFLOW: Step 1 ===');
    console.log('📤 Sending JPEG to backend for processing...');
    console.log('📊 JPEG base64 length:', jpegBase64.length);
    console.log('📊 Basic info length:', basicInfo.length);
    console.log('📊 Public key length:', publicKey.length);

    // Send as JSON instead of FormData for React Native compatibility
    const payload = {
      jpegBase64: jpegBase64,
      basicInfo: basicInfo,
      publicKey: publicKey
    };

    const url = buildSteganographyUrl('/process-geocam-image');
    console.log('🌐 Processing URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📨 Response status:', response.status);

    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        error: 'Invalid response format from backend'
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Backend processing successful');
      console.log('🔑 Session ID:', result.sessionId);
      console.log('🔐 Hash to sign length:', result.hashToSign?.length);
      console.log('📊 Image info:', result.imageInfo);

      return {
        success: true,
        sessionId: result.sessionId,
        hashToSign: result.hashToSign,
        imageInfo: result.imageInfo
      };
    } else {
      console.error('❌ Backend processing failed:', result);
      return {
        success: false,
        error: result.error || 'Backend processing failed'
      };
    }

  } catch (error) {
    console.error('❌ Backend processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

/**
 * NEW FULL BACKEND WORKFLOW: Complete GeoCam processing (Step 2)
 * Send signature to backend, get final PNG
 */
export const completeGeoCamImageBackend = async (
  sessionId: string,
  signature: string
): Promise<{
  success: boolean;
  pngBase64?: string;
  stats?: {
    originalSize: number;
    pngSize: number;
    dimensions: { width: number; height: number };
    compressionRatio: string;
  };
  error?: string;
}> => {
  try {
    console.log('🎯 === FULL BACKEND WORKFLOW: Step 2 ===');
    console.log('📤 Sending signature to complete processing...');
    console.log('🔑 Session ID:', sessionId);
    console.log('📊 Signature length:', signature.length);

    const requestData = {
      sessionId,
      signature
    };

    const url = buildSteganographyUrl('/complete-geocam-image');
    console.log('🌐 Completion URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('📨 Response status:', response.status);

    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        error: 'Invalid response format from backend'
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Backend completion successful');
      console.log('📊 PNG base64 length:', result.pngBase64?.length);
      console.log('📊 Stats:', result.stats);

      return {
        success: true,
        pngBase64: result.pngBase64,
        stats: result.stats
      };
    } else {
      console.error('❌ Backend completion failed:', result);
      return {
        success: false,
        error: result.error || 'Backend completion failed'
      };
    }

  } catch (error) {
    console.error('❌ Backend completion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};



export const verifyImagePurePng = async (pngBase64: string): Promise<ImageVerificationResponse> => {
  try {
    console.log('📤 Starting verification...');

    const requestData = {
      pngBase64
    };

    const url = buildSteganographyUrl('/pure-png-verify');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    let result;
    try {
      const responseText = await response.text();
      result = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        message: 'Invalid response format from backend',
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Verification successful');

      return {
        success: true,
        message: result.verification_result?.message || 'Verification completed',
        verification_result: {
          is_authentic: result.verification_result?.signature_valid || false,
          decoded_data: result.verification_result?.decoded_info || null,
          signature_valid: result.verification_result?.signature_valid || false,
          device_info: result.verification_result?.device_info || null,
        }
      };
    } else {
      console.error('❌ Verification failed:', result);
      return {
        success: false,
        message: result.error || 'verification failed',
        error: result.error,
      };
    }

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      error: String(error),
    };
  }
};

/**
 * Verify image using secure backend (public key only)
 * MIGRATED FROM: secureBackendService.ts
 */
export const verifyImageSecure = async (
  imageBase64: string,
  signature: string,
  publicKeyId: string,
  timestamp?: string
): Promise<SecureVerificationResponse> => {
  try {
    console.log('🔍 Starting secure image verification...');
    console.log('📊 Image size:', Math.round(imageBase64.length / 1024), 'KB');
    console.log('🔑 Public Key ID:', publicKeyId);
    
    const verificationData = {
      image_data: imageBase64,
      signature: signature,
      public_key_id: publicKeyId,
      timestamp: timestamp || new Date().toISOString()
    };
    
    const response = await fetch(buildApiUrl('/api/verify-image-secure'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationData),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Secure image verification completed');
      console.log('📊 Signature valid:', result.verification_result.signature_valid);
      console.log('🛡️  Security checks:', result.verification_result.security_checks);
      console.log('📱 Device:', result.verification_result.device_info.device_model);
      
      return {
        success: true,
        verification_result: result.verification_result,
        message: result.message
      };
    } else {
      console.error('❌ Secure image verification failed:', result);
      return {
        success: false,
        message: result.error || 'Verification failed',
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('❌ Secure image verification error:', error);
    return {
      success: false,
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error)
    };
  }
};