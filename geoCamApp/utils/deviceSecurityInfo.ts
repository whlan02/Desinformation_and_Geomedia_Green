import * as Device from 'expo-device';
import { hasSecureKeys } from './secp256k1Utils';

/**
 * Get hardware security information for secp256k1 crypto system
 */
export const getHardwareSecurityInfo = () => {
  return {
    hardwareFeatures: {
      description: 'secp256k1 signatures with device-secured storage',
      keyStorage: Device.osName === 'iOS' ? 'iOS Keychain' : 
                 Device.osName === 'Android' ? 'Android Keystore' : 'Secure Storage',
      algorithm: 'secp256k1',
      keySize: '32 bytes (256-bit)',
      signatureSize: '64 bytes (512-bit)',
      security: 'Device-level protection'
    }
  };
};

/**
 * Check if device supports hardware security features
 */
export const supportsHardwareSecurity = () => {
  return Device.osName === 'iOS' || Device.osName === 'Android';
};

/**
 * Generate security summary for the device
 */
export const generateSecuritySummary = async () => {
  const status = await getDeviceSecurityStatus();
  const hardwareInfo = getHardwareSecurityInfo();
  
  if (status.error) {
    return `Error getting security status: ${status.error}`;
  }
  
  const summary = [
    `Device: ${status.deviceInfo?.model || 'Unknown'}`,
    `OS: ${status.deviceInfo?.os || 'Unknown'} ${status.deviceInfo?.version || ''}`,
    `Security Level: ${status.securityLevel?.level || 'Unknown'}`,
    `Key Storage: ${hardwareInfo.hardwareFeatures.keyStorage}`,
    `Algorithm: ${hardwareInfo.hardwareFeatures.algorithm}`,
    `Key Status: ${status.hasKeys ? '✅ Secure Keys Present (V2)' : '❌ No Keys'}`
  ].filter(Boolean).join('\n');
  
  return summary;
};

/**
 * Get device security status
 */
export const getDeviceSecurityStatus = async () => {
  try {
    // Check secure keys (V2 system only)
    const hasKeys = await hasSecureKeys();
    
    console.log('🔑 Device security status check:');
    console.log('  - Secure keys (V2):', hasKeys);
    
    const securityLevel = getSecurityLevelDescription(Device.osName);
    const hardwareInfo = getHardwareSecurityInfo();
    const recommendations = getSecurityRecommendations();
    
    return {
      hasKeys,
      securityLevel,
      hardwareInfo,
      recommendations,
      deviceInfo: {
        model: Device.modelName,
        os: Device.osName,
        version: Device.osVersion,
        type: Device.deviceType,
        name: Device.deviceName,
      }
    };
  } catch (error: unknown) {
    console.error('❌ Failed to get device security status:', error);
    return {
      hasKeys: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Get security level description for secp256k1 crypto system
 */
const getSecurityLevelDescription = (platform: string | null) => {
  if (platform === 'iOS') {
    return {
      level: 'Device-Secured secp256k1',
      storage: 'iOS Keychain',
      protection: 'secp256k1 with device-level storage',
      authentication: 'Device access only',
      description: 'secp256k1 private keys are stored in iOS Keychain and tied to this specific device installation. Keys cannot be extracted from the device but are accessible to anyone with device access.',
      benefits: [
        'secp256k1 cryptographic security (same as Bitcoin)',
        'Device-level key protection via iOS Keychain',
        'No biometric authentication required',
        'Keys tied to specific device installation',
        'No cloud synchronization',
        'Convenient device-based authentication'
      ]
    };
  } else if (platform === 'Android') {
    return {
      level: 'Device-Secured secp256k1',
      storage: 'Android Keystore',
      protection: 'secp256k1 with device-level storage',
      authentication: 'Device access only',
      description: 'secp256k1 private keys are stored in Android Keystore system and tied to this specific device installation. Keys are accessible to anyone with device access.',
      benefits: [
        'secp256k1 cryptographic security (same as Bitcoin)',
        'Android Keystore system protection',
        'Device-level security',
        'No biometric authentication required',
        'Keys bound to device installation',
        'Convenient device-based authentication'
      ]
    };
  } else {
    return {
      level: 'Software-Secured secp256k1',
      storage: 'Encrypted storage',
      protection: 'secp256k1 with software encryption',
      authentication: 'System authentication',
      description: 'secp256k1 keys are stored using platform-specific secure storage mechanisms.',
      benefits: [
        'secp256k1 cryptographic security (same as Bitcoin)',
        'Encrypted storage',
        'Platform security features',
        'Access control'
      ]
    };
  }
};

/**
 * Get platform-specific security recommendations for secp256k1 crypto system
 */
export const getSecurityRecommendations = () => {
  const recommendations = [];
  
  if (Device.osName === 'iOS') {
    recommendations.push(
      'Keep iOS updated for latest Keychain security features',
      'Use a strong device passcode or password',
      'Do not jailbreak device as it compromises secp256k1 key security'
    );
  } else if (Device.osName === 'Android') {
    recommendations.push(
      'Use a strong screen lock (PIN, pattern, or password)',
      'Keep Android updated and avoid rooting device',
      'Ensure device has hardware-backed keystore support for secp256k1 keys'
    );
  }
  
  recommendations.push(
    'Never share your device with untrusted users',
    'Keep the GeoCam app updated for security patches',
    'Protect your device from physical access by untrusted users',
    'secp256k1 keys are tied to your device installation',
    'Report any suspicious behavior immediately'
  );
  
  return recommendations;
};