import * as Device from 'expo-device';
import { getNaClKeyPairInfo, hasStoredNaClKeyPair } from './naclCryptoUtils';

/**
 * Get hardware security information for NaCl crypto system
 */
const getHardwareSecurityInfo = () => {
  return {
    hardwareFeatures: {
      description: 'NaCl (Networking and Cryptography Library) Ed25519 signatures with device-secured storage',
      keyStorage: Device.osName === 'iOS' ? 'iOS Keychain' : 
                 Device.osName === 'Android' ? 'Android Keystore' : 'Secure Storage',
      algorithm: 'Ed25519',
      keySize: '32 bytes (256-bit)',
      signatureSize: '64 bytes (512-bit)',
      security: 'Device-level protection'
    }
  };
};

/**
 * Get complete device security status report
 */
export const getDeviceSecurityReport = async () => {
  const hardwareInfo = getHardwareSecurityInfo();
  const hasKeys = await hasStoredNaClKeyPair();
  const keyInfo = hasKeys ? await getNaClKeyPairInfo() : null;

  return {
    device: {
      platform: Device.osName,
      model: Device.modelName,
      osVersion: Device.osVersion,
      brand: Device.brand,
    },
    
    hardwareSecurity: {
      available: true,
      features: hardwareInfo.hardwareFeatures,
      description: hardwareInfo.hardwareFeatures.description,
    },
    
    keyPairStatus: {
      exists: hasKeys,
      hardwareProtected: true, // NaCl keys are stored in device secure storage
      generatedAt: keyInfo?.generatedAt,
      fingerprint: keyInfo?.fingerprint,
      installationId: keyInfo?.installationId,
      keyType: keyInfo?.keyType,
    },
    
    securityLevel: getSecurityLevelDescription(Device.osName),
  };
};

/**
 * Get security level description for NaCl crypto system
 */
const getSecurityLevelDescription = (platform: string | null) => {
  if (platform === 'iOS') {
    return {
      level: 'Device-Secured NaCl',
      storage: 'iOS Keychain',
      protection: 'NaCl Ed25519 with device-level storage',
      authentication: 'Device access only',
      description: 'NaCl Ed25519 private keys are stored in iOS Keychain and tied to this specific device installation. Keys cannot be extracted from the device but are accessible to anyone with device access.',
      benefits: [
        'TweetNaCl Ed25519 cryptographic security',
        'Device-level key protection via iOS Keychain',
        'No biometric authentication required',
        'Keys tied to specific device installation',
        'No cloud synchronization',
        'Convenient device-based authentication'
      ]
    };
  } else if (platform === 'Android') {
    return {
      level: 'Device-Secured NaCl',
      storage: 'Android Keystore',
      protection: 'NaCl Ed25519 with device-level storage',
      authentication: 'Device access only',
      description: 'NaCl Ed25519 private keys are stored in Android Keystore system and tied to this specific device installation. Keys are accessible to anyone with device access.',
      benefits: [
        'TweetNaCl Ed25519 cryptographic security',
        'Android Keystore system protection',
        'Device-level security',
        'No biometric authentication required',
        'Keys bound to device installation',
        'Convenient device-based authentication'
      ]
    };
  } else {
    return {
      level: 'Software-Secured NaCl',
      storage: 'Encrypted storage',
      protection: 'NaCl Ed25519 with software encryption',
      authentication: 'System authentication',
      description: 'NaCl Ed25519 keys are stored using platform-specific secure storage mechanisms.',
      benefits: [
        'TweetNaCl Ed25519 cryptographic security',
        'Encrypted storage',
        'Platform security features',
        'Access control'
      ]
    };
  }
};

/**
 * Generate security status summary text
 */
export const generateSecuritySummary = async (): Promise<string> => {
  const report = await getDeviceSecurityReport();
  
  let summary = `🔐 GeoCam Security Report\n\n`;
  
  summary += `📱 Device: ${report.device.model} (${report.device.platform} ${report.device.osVersion})\n\n`;
  
  summary += `🛡️ Security Level: ${report.securityLevel.level}\n`;
  summary += `💾 Storage: ${report.securityLevel.storage}\n`;
  summary += `🔒 Protection: ${report.securityLevel.protection}\n`;
  summary += `🔑 Authentication: ${report.securityLevel.authentication}\n\n`;
  
  if (report.keyPairStatus.exists) {
    summary += `✅ NaCl Keys: Generated & Protected\n`;
    summary += `🔑 Key Type: ${report.keyPairStatus.keyType}\n`;
    summary += `📅 Generated: ${new Date(report.keyPairStatus.generatedAt || '').toLocaleDateString()}\n`;
    summary += `🔖 Fingerprint: ${report.keyPairStatus.fingerprint}\n`;
    summary += `🆔 Installation: ${report.keyPairStatus.installationId?.substring(0, 16)}...\n\n`;
  } else {
    summary += `⏳ NaCl Keys: Not yet generated\n`;
    summary += `📝 Status: Keys will be generated on app startup\n\n`;
  }
  
  summary += `📋 Security Benefits:\n`;
  report.securityLevel.benefits.forEach(benefit => {
    summary += `  • ${benefit}\n`;
  });
  
  return summary;
};

/**
 * Check if device supports hardware-level security
 */
export const supportsHardwareSecurity = (): boolean => {
  return Device.osName === 'iOS' || Device.osName === 'Android';
};

/**
* Get platform-specific security recommendations for NaCl crypto system
 */
export const getSecurityRecommendations = () => {
  const recommendations = [];
  
  if (Device.osName === 'iOS') {
    recommendations.push(
      'Keep iOS updated for latest Keychain security features',
      'Use a strong device passcode or password',
      'Do not jailbreak device as it compromises NaCl key security'
    );
  } else if (Device.osName === 'Android') {
    recommendations.push(
      'Use a strong screen lock (PIN, pattern, or password)',
      'Keep Android updated and avoid rooting device',
      'Ensure device has hardware-backed keystore support for NaCl keys'
    );
  }
  
  recommendations.push(
    'Never share your device with untrusted users',
    'Keep the GeoCam app updated for security patches',
    'Protect your device from physical access by untrusted users',
    'NaCl keys are tied to your device installation',
    'Report any suspicious behavior immediately'
  );
  
  return recommendations;
}; 