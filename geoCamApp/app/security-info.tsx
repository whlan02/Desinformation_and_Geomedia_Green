import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateSecuritySummary, getSecurityRecommendations, supportsHardwareSecurity } from '../utils/deviceSecurityInfo';
import { deleteSecp256k1Keys, hasStoredSecp256k1KeyPair } from '../utils/secp256k1Utils';
import { testAllServices } from '../utils/backendConfig';
import { checkDeviceRegistration, getStoredGeoCamDeviceName } from '../utils/backendService';

export default function SecurityInfo() {
  const router = useRouter();
  const [securitySummary, setSecuritySummary] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<{api: boolean, steganography: boolean} | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [geocamDeviceName, setGeocamDeviceName] = useState<string | null>(null);
  const [deviceRegistrationStatus, setDeviceRegistrationStatus] = useState<{
    isRegistered: boolean;
    isChecking: boolean;
    registrationMessage?: string;
  }>({
    isRegistered: false,
    isChecking: false,
  });
  const [keysInitialized, setKeysInitialized] = useState(false);

  useEffect(() => {
    loadSecurityInfo();
    checkKeys();
    loadGeoCamDeviceName();
    testBackendConnectivity();
    checkDeviceRegistrationStatus();
  }, []);

  const checkKeys = async () => {
    try {
      const hasKeys = await hasStoredSecp256k1KeyPair();
      setKeysInitialized(hasKeys);
    } catch (error) {
      console.error('Failed to check keys status:', error);
      setKeysInitialized(false);
    }
  };

  const loadGeoCamDeviceName = async () => {
    try {
      const savedDeviceName = await getStoredGeoCamDeviceName();
      if (savedDeviceName) {
        setGeocamDeviceName(savedDeviceName);
        console.log('📱 Loaded GeoCam device name:', savedDeviceName);
      }
    } catch (error) {
      console.error('❌ Failed to load GeoCam device name:', error);
    }
  };

  const checkDeviceRegistrationStatus = async () => {
    setDeviceRegistrationStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const isRegistered = await checkDeviceRegistration();
      setDeviceRegistrationStatus({
        isRegistered,
        isChecking: false,
        registrationMessage: isRegistered ? 'Device is registered' : 'Device is not registered'
      });
    } catch (error) {
      console.error('Failed to check device registration:', error);
      setDeviceRegistrationStatus({
        isRegistered: false,
        isChecking: false,
        registrationMessage: 'Failed to check registration status'
      });
    }
  };

  const testBackendConnectivity = async () => {
    setIsTestingBackend(true);
    try {
      console.log('🌐 Testing backend connectivity...');
      const status = await testAllServices();
      setBackendStatus(status);
      console.log('📡 Backend connectivity test completed:', status);
    } catch (error) {
      console.error('❌ Backend connectivity test failed:', error);
      setBackendStatus({ api: false, steganography: false });
    }
    setIsTestingBackend(false);
  };

  const loadSecurityInfo = async () => {
    setIsLoading(true);
    try {
      const summary = await generateSecuritySummary();
      const recs = getSecurityRecommendations();
      
      setSecuritySummary(summary);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load security info:', error);
      setSecuritySummary('Error loading security information.');
    }
    setIsLoading(false);
  };

  const handleResetKeys = async () => {
    Alert.alert(
      '🚨 Reset Device Keys',
      'This will permanently delete your device\'s cryptographic keys. All previously signed photos will show as invalid. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset Keys',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteSecp256k1Keys();
            if (success) {
              Alert.alert('✅ Success', 'Device keys have been reset. New keys will be generated on next photo.');
              loadSecurityInfo(); // Refresh the display
            } else {
              Alert.alert('❌ Error', 'Failed to reset device keys.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Device Security</Text>
          <Text style={styles.subtitle}>Manage your device's security settings</Text>
        </View>

        {/* Device Name Card */}
        {geocamDeviceName && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device Identity</Text>
            <View style={styles.deviceNameContainer}>
              <Text style={styles.deviceNameText}>📱 {geocamDeviceName}</Text>
            </View>
          </View>
        )}

        {/* Backend Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend Services</Text>
          {isTestingBackend ? (
            <Text style={styles.statusText}>Testing backend connection...</Text>
          ) : backendStatus ? (
            <View>
              <Text style={[styles.statusText, backendStatus.api ? styles.statusSuccess : styles.statusError]}>
                🌐 API: {backendStatus.api ? '✅ Connected' : '❌ Offline'}
              </Text>
              <Text style={[styles.statusText, backendStatus.steganography ? styles.statusSuccess : styles.statusError]}>
                🔧 Services: {backendStatus.steganography ? '✅ Ready' : '❌ Offline'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Registration Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registration Status</Text>
          {deviceRegistrationStatus.isChecking ? (
            <Text style={styles.statusText}>Checking registration status...</Text>
          ) : (
            <Text style={[
              styles.statusText,
              deviceRegistrationStatus.isRegistered ? styles.statusSuccess : styles.statusError
            ]}>
              {deviceRegistrationStatus.isRegistered ? '✅' : '❌'} {deviceRegistrationStatus.registrationMessage}
            </Text>
          )}
        </View>
        
        {supportsHardwareSecurity() && (
          <View style={styles.hardwareSecurityBadge}>
            <Text style={styles.badgeText}>✅ Hardware Security Available</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security Status</Text>
          <Text style={styles.summaryText}>
            {isLoading ? 'Loading security information...' : securitySummary}
          </Text>
        </View>

        {recommendations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recommendations</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>• {rec}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About Security</Text>
          <Text style={styles.infoText}>
            This app uses your device's secure storage to generate and store cryptographic keys. 
            These keys are unique to this device and installation, providing convenient photo authentication for trusted devices.
          </Text>
          
          <Text style={styles.infoSubtitle}>Protected by:</Text>
          <View style={styles.protectionList}>
            <Text style={styles.protectionItem}>• Device secure storage (Keychain/Keystore)</Text>
            <Text style={styles.protectionItem}>• Device-specific binding</Text>
            <Text style={styles.protectionItem}>• Installation-specific keys</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={() => {
              loadSecurityInfo();
              checkKeys();
              loadGeoCamDeviceName();
              testBackendConnectivity();
              checkDeviceRegistrationStatus();
            }}
          >
            <Text style={styles.buttonText}>Refresh All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetKeys}>
            <Text style={styles.buttonText}>Reset Keys</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  hardwareSecurityBadge: {
    backgroundColor: '#1b4d3e',
    borderColor: '#4caf50',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#373c40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  summaryText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
  },
  infoText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  protectionList: {
    marginTop: 8,
  },
  protectionItem: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#03DAC6',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceNameContainer: {
    padding: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  deviceNameText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 24,
    marginVertical: 2,
    color: '#ccc',
  },
  statusSuccess: {
    color: '#4caf50',
  },
  statusError: {
    color: '#f44336',
  },
}); 