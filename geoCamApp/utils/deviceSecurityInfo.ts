import * as Device from 'expo-device';
import { getHardwareSecurityInfo, getKeyPairInfo, hasStoredKeyPair } from './cryptoUtils';

/**
 * Get complete device security status report
 */
export const getDeviceSecurityReport = async () => {
  const hardwareInfo = getHardwareSecurityInfo();
  const hasKeys = await hasStoredKeyPair();
  const keyInfo = hasKeys ? await getKeyPairInfo() : null;

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
      hardwareProtected: keyInfo?.hardwareProtected || false,
      generatedAt: keyInfo?.generatedAt,
      fingerprint: keyInfo?.fingerprint,
      installationId: keyInfo?.installationId,
      keyType: keyInfo?.keyType,
    },
    
    securityLevel: getSecurityLevelDescription(Device.osName),
  };
};

/**
 * Get security level description
 */
const getSecurityLevelDescription = (platform: string | null) => {
  if (platform === 'iOS') {
    return {
      level: 'Device-Secured',
      storage: 'iOS Keychain',
      protection: 'Device-level storage',
      authentication: 'Device access only',
      description: 'Private keys are stored in iOS Keychain and tied to this specific device installation. Keys cannot be extracted from the device but are accessible to anyone with device access.',
      benefits: [
        'Device-level key protection',
        'No biometric authentication required',
        'Keys tied to specific device installation',
        'No cloud synchronization',
        'Convenient device-based authentication'
      ]
    };
  } else if (platform === 'Android') {
    return {
      level: 'Device-Secured',
      storage: 'Android Keystore',
      protection: 'Device-level storage',
      authentication: 'Device access only',
      description: 'Private keys are stored in Android Keystore system and tied to this specific device installation. Keys are accessible to anyone with device access.',
      benefits: [
        'Android Keystore system protection',
        'Device-level security',
        'No biometric authentication required',
        'Keys bound to device installation',
        'Convenient device-based authentication'
      ]
    };
  } else {
    return {
      level: 'Software-Secured',
      storage: 'Encrypted storage',
      protection: 'Software encryption',
      authentication: 'System authentication',
      description: 'Keys are stored using platform-specific secure storage mechanisms.',
      benefits: [
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
  
  let summary = `🔐 Device Security Report\n\n`;
  
  summary += `📱 Device: ${report.device.model} (${report.device.platform} ${report.device.osVersion})\n\n`;
  
  summary += `🛡️ Security Level: ${report.securityLevel.level}\n`;
  summary += `💾 Storage: ${report.securityLevel.storage}\n`;
  summary += `🔒 Protection: ${report.securityLevel.protection}\n`;
  summary += `🔑 Authentication: ${report.securityLevel.authentication}\n\n`;
  
  if (report.keyPairStatus.exists) {
    summary += `✅ Device Keys: Generated & Protected\n`;
    summary += `🔑 Key Type: ${report.keyPairStatus.keyType}\n`;
    summary += `📅 Generated: ${new Date(report.keyPairStatus.generatedAt || '').toLocaleDateString()}\n`;
    summary += `🔖 Fingerprint: ${report.keyPairStatus.fingerprint}\n`;
    summary += `🆔 Installation: ${report.keyPairStatus.installationId?.substring(0, 16)}...\n\n`;
  } else {
    summary += `⏳ Device Keys: Not yet generated\n`;
    summary += `📝 Status: Keys will be generated on first photo capture\n\n`;
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
* Get platform-specific security recommendations
 */
export const getSecurityRecommendations = () => {
  const recommendations = [];
  
  if (Device.osName === 'iOS') {
    recommendations.push(
      'Keep iOS updated for latest security features',
      'Use a strong device passcode or password',
      'Do not jailbreak device as it compromises security'
    );
  } else if (Device.osName === 'Android') {
    recommendations.push(
      'Use a strong screen lock (PIN, pattern, or password)',
      'Keep Android updated and avoid rooting device',
      'Ensure device has hardware-backed keystore support'
    );
  }
  
  recommendations.push(
    'Never share your device with untrusted users',
    'Keep the app updated for security patches',
    'Protect your device from physical access by untrusted users',
    'Report any suspicious behavior immediately'
  );
  
  return recommendations;
}; 