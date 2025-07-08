import { buildApiUrl, BACKEND_CONFIG } from './backendConfig';
import { 
  generateSecureKeyPair, 
  getPublicKeyForRegistration, 
  signImageDataSecurely, 
  hasSecureKeys 
} from './secureKeyManager';

/**
 * Secure Backend Service for GeoCam
 * Uses new security model where private keys never leave the device
 */

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

export interface SecureRegistrationResponse {
  success: boolean;
  device_id?: string;
  public_key_id?: string;
  message: string;
}

/**
 * Initialize secure key management
 */
export const initializeSecureKeys = async (): Promise<{
  success: boolean;
  hasKeys: boolean;
  message: string;
}> => {
  try {
    console.log('🔐 Initializing secure key management...');
    
    // Check if keys already exist
    const keyExists = await hasSecureKeys();
    
    if (keyExists) {
      console.log('✅ Secure keys already exist');
      return {
        success: true,
        hasKeys: true,
        message: 'Secure keys already initialized'
      };
    }
    
    // Generate new secure key pair
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
 * Register device with backend using secure approach (public key only)
 */
export const registerDeviceSecure = async (): Promise<SecureRegistrationResponse> => {
  try {
    console.log('📱 Starting secure device registration...');
    
    // Get public key data for registration
    const registrationData = await getPublicKeyForRegistration();
    if (!registrationData) {
      throw new Error('No public key available for registration');
    }
    
    console.log('📤 Sending registration data (public key only):', {
      installation_id: registrationData.installation_id,
      device_model: registrationData.device_model,
      public_key_id: registrationData.public_key.keyId,
      public_key_fingerprint: registrationData.public_key.fingerprint
    });
    
    // Send registration request to secure endpoint
    const response = await fetch(buildApiUrl('/api/register-device-secure'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Secure device registration successful:', result);
      return {
        success: true,
        device_id: result.device_id,
        public_key_id: result.public_key_id,
        message: result.message
      };
    } else {
      console.error('❌ Secure device registration failed:', result);
      return {
        success: false,
        message: result.error || 'Registration failed'
      };
    }
    
  } catch (error) {
    console.error('❌ Secure device registration error:', error);
    return {
      success: false,
      message: `Registration error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Capture and sign image securely (private key never leaves device)
 */
export const captureAndSignImageSecure = async (
  imageBase64: string,
  metadata: any
): Promise<{
  success: boolean;
  signedData?: {
    signature: string;
    publicKeyId: string;
    timestamp: string;
    metadata: any;
  };
  error?: string;
}> => {
  try {
    console.log('📸 Capturing and signing image securely...');
    
    // Sign image data locally with device private key
    const signedData = await signImageDataSecurely(imageBase64, metadata);
    
    console.log('✅ Image signed successfully');
    console.log('🔐 Signature created with key ID:', signedData.publicKeyId);
    
    return {
      success: true,
      signedData
    };
    
  } catch (error) {
    console.error('❌ Failed to capture and sign image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Verify image using secure backend (public key only)
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
    
    // Prepare verification request with timestamp for replay attack protection
    const verificationData = {
      image_data: imageBase64,
      signature: signature,
      public_key_id: publicKeyId,
      timestamp: timestamp || new Date().toISOString()
    };
    
    // Send verification request to secure endpoint
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

/**
 * Verify image from file URI using secure approach
 */
export const verifyImageFromFileSecure = async (
  imageUri: string,
  signature: string,
  publicKeyId: string
): Promise<SecureVerificationResponse> => {
  try {
    console.log('🔍 Verifying image from file URI securely...');
    
    // Read image file as base64
    const FileSystem = require('expo-file-system');
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Use secure verification
    return await verifyImageSecure(imageBase64, signature, publicKeyId);
    
  } catch (error) {
    console.error('❌ Failed to verify image from file:', error);
    return {
      success: false,
      message: `File verification error: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error)
    };
  }
};

/**
 * Get all registered devices (public key info only)
 */
export const getRegisteredDevicesSecure = async (): Promise<{
  success: boolean;
  devices?: any[];
  total_count?: number;
  error?: string;
}> => {
  try {
    console.log('📱 Getting registered devices (secure)...');
    
    const response = await fetch(buildApiUrl('/api/devices-secure'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Retrieved registered devices:', result.total_count, 'devices');
      return {
        success: true,
        devices: result.devices,
        total_count: result.total_count
      };
    } else {
      console.error('❌ Failed to get registered devices:', result);
      return {
        success: false,
        error: result.error || 'Failed to get devices'
      };
    }
    
  } catch (error) {
    console.error('❌ Error getting registered devices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Get verification statistics
 */
export const getVerificationStatsSecure = async (): Promise<{
  success: boolean;
  stats?: {
    total_verifications: number;
    valid_verifications: number;
    invalid_verifications: number;
    recent_verifications: number;
    active_devices: number;
    success_rate: number;
  };
  error?: string;
}> => {
  try {
    console.log('📊 Getting verification statistics...');
    
    const response = await fetch(buildApiUrl('/api/verification-stats'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Retrieved verification statistics:', result.stats);
      return {
        success: true,
        stats: result.stats
      };
    } else {
      console.error('❌ Failed to get verification statistics:', result);
      return {
        success: false,
        error: result.error || 'Failed to get statistics'
      };
    }
    
  } catch (error) {
    console.error('❌ Error getting verification statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Check backend health for secure endpoints
 */
export const checkBackendHealthSecure = async (): Promise<boolean> => {
  try {
    console.log('🏥 Checking secure backend health...');
    
    const response = await fetch(buildApiUrl('/api/health'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Secure backend health check:', result.status);
      return result.status === 'healthy';
    } else {
      console.warn('⚠️ Secure backend health check failed:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Secure backend health check error:', error);
    return false;
  }
};
