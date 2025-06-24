import * as Device from 'expo-device';
import { getNobleEd25519KeyPairInfo, hasStoredNobleEd25519KeyPair } from './nobleEd25519Utils';

/**
 * Get hardware security information for Noble Ed25519 crypto system
 */
const getHardwareSecurityInfo = () => {
  return {
    hardwareFeatures: {
      description: 'Noble Ed25519 signatures with device-secured storage',
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
  const hasKeys = await hasStoredNobleEd25519KeyPair();
  const keyInfo = hasKeys ? await getNobleEd25519KeyPairInfo() : null;

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
      hardwareProtected: true, // Noble Ed25519 keys are stored in device secure storage
      generatedAt: keyInfo?.generatedAt,
      fingerprint: keyInfo?.fingerprint,
      installationId: keyInfo?.installationId,
      keyType: keyInfo?.keyType,
    },
    
    securityLevel: getSecurityLevelDescription(Device.osName),
  };
};

/**
 * Get security level description for Noble Ed25519 crypto system
 */
const getSecurityLevelDescription = (platform: string | null) => {
  if (platform === 'iOS') {
    return {
      level: 'Device-Secured Noble Ed25519',
      storage: 'iOS Keychain',
      protection: 'Noble Ed25519 with device-level storage',
      authentication: 'Device access only',
      description: 'Noble Ed25519 private keys are stored in iOS Keychain and tied to this specific device installation. Keys cannot be extracted from the device but are accessible to anyone with device access.',
      benefits: [
        'Noble Ed25519 cryptographic security',
        'Device-level key protection via iOS Keychain',
        'No biometric authentication required',
        'Keys tied to specific device installation',
        'No cloud synchronization',
        'Convenient device-based authentication'
      ]
    };
  } else if (platform === 'Android') {
    return {
      level: 'Device-Secured Noble Ed25519',
      storage: 'Android Keystore',
      protection: 'Noble Ed25519 with device-level storage',
      authentication: 'Device access only',
      description: 'Noble Ed25519 private keys are stored in Android Keystore system and tied to this specific device installation. Keys are accessible to anyone with device access.',
      benefits: [
        'Noble Ed25519 cryptographic security',
        'Android Keystore system protection',
        'Device-level security',
        'No biometric authentication required',
        'Keys bound to device installation',
        'Convenient device-based authentication'
      ]
    };
  } else {
    return {
      level: 'Software-Secured Noble Ed25519',
      storage: 'Encrypted storage',
      protection: 'Noble Ed25519 with software encryption',
      authentication: 'System authentication',
      description: 'Noble Ed25519 keys are stored using platform-specific secure storage mechanisms.',
      benefits: [
        'Noble Ed25519 cryptographic security',
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
    summary += `✅ Noble Ed25519 Keys: Generated & Protected\n`;
    summary += `🔑 Key Type: ${report.keyPairStatus.keyType}\n`;
    summary += `📅 Generated: ${new Date(report.keyPairStatus.generatedAt || '').toLocaleDateString()}\n`;
    summary += `🔖 Fingerprint: ${report.keyPairStatus.fingerprint}\n`;
    summary += `🆔 Installation: ${report.keyPairStatus.installationId?.substring(0, 16)}...\n\n`;
  } else {
    summary += `⏳ Noble Ed25519 Keys: Not yet generated\n`;
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
* Get platform-specific security recommendations for Noble Ed25519 crypto system
 */
export const getSecurityRecommendations = () => {
  const recommendations = [];
  
  if (Device.osName === 'iOS') {
    recommendations.push(
      'Keep iOS updated for latest Keychain security features',
      'Use a strong device passcode or password',
      'Do not jailbreak device as it compromises Noble Ed25519 key security'
    );
  } else if (Device.osName === 'Android') {
    recommendations.push(
      'Use a strong screen lock (PIN, pattern, or password)',
      'Keep Android updated and avoid rooting device',
      'Ensure device has hardware-backed keystore support for Noble Ed25519 keys'
    );
  }
  
  recommendations.push(
    'Never share your device with untrusted users',
    'Keep the GeoCam app updated for security patches',
    'Protect your device from physical access by untrusted users',
    'Noble Ed25519 keys are tied to your device installation',
    'Report any suspicious behavior immediately'
  );
  
  return recommendations;
}; 