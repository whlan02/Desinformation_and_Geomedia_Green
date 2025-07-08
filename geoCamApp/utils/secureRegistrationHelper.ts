import { BACKEND_CONFIG } from './backendConfig';
import { getPublicKeyForRegistration } from './secureKeyManager';

/**
 * Build API URL for secure backend
 */
const buildApiUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Check if device is already registered with secure backend
 */
export const checkSecureDeviceRegistration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking secure device registration status...');
    
    // Get public key data for checking
    const registrationData = await getPublicKeyForRegistration();
    if (!registrationData) {
      console.log('❌ No public key available for registration check');
      return false;
    }

    console.log('🔑 Checking registration for key ID:', registrationData.public_key.keyId);

    // Use the secure devices endpoint to check registration
    const response = await fetch(buildApiUrl('/api/devices-secure'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Secure registration check result:', result);
      
      // Check if our public key ID is in the registered devices
      const devices = result.devices || [];
      const registeredDevice = devices.find((device: any) => 
        device.public_key_id === registrationData.public_key.keyId ||
        device.installation_id === registrationData.installation_id ||
        device.public_key_fingerprint === registrationData.public_key.fingerprint
      );

      if (registeredDevice) {
        console.log('✅ Device is already registered:', registeredDevice.public_key_id);
        return true;
      } else {
        console.log('❌ Device is not registered yet');
        return false;
      }
    } else {
      console.error('❌ Failed to check device registration:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking device registration:', error);
    return false;
  }
};

/**
 * Register device with secure backend, handling existing registrations gracefully
 */
export const registerDeviceSecureWithCheck = async (): Promise<{
  success: boolean;
  message: string;
  device_id?: string;
  public_key_id?: string;
  wasAlreadyRegistered?: boolean;
}> => {
  try {
    console.log('📱 Starting secure device registration with check...');
    
    // First check if already registered
    const isAlreadyRegistered = await checkSecureDeviceRegistration();
    
    if (isAlreadyRegistered) {
      console.log('✅ Device already registered - skipping registration');
      return {
        success: true,
        message: 'Device already registered',
        wasAlreadyRegistered: true
      };
    }

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
        message: result.message,
        wasAlreadyRegistered: false
      };
    } else {
      // Handle specific error cases
      if (result.details && result.details.includes('UNIQUE constraint failed')) {
        console.log('⚠️ Device already registered (unique constraint) - treating as success');
        return {
          success: true,
          message: 'Device already registered',
          wasAlreadyRegistered: true
        };
      }
      
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
