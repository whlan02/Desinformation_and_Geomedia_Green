import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateSecuritySummary, getSecurityRecommendations, supportsHardwareSecurity } from '../utils/deviceSecurityInfo';
// Legacy V1 imports removed - now using V2 secure key system only
import { testAllServices } from '../utils/backendConfig';
import { getStoredGeoCamDeviceName, performFreshDeviceStart } from '../utils/backendService';
import { hasSecureKeys, deleteSecureKeys } from '../utils/secp256k1Utils';
import { useTheme } from '../contexts/ThemeContext';

export default function SecurityInfo() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [securitySummary, setSecuritySummary] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<{api: boolean, steganography: boolean} | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [geocamDeviceName, setGeocamDeviceName] = useState<string | null>(null);
  const [keysInitialized, setKeysInitialized] = useState(false);

  useEffect(() => {
    loadSecurityInfo();
    checkKeys();
    loadGeoCamDeviceName();
    testBackendConnectivity();
  }, []);

  const checkKeys = async () => {
    try {
      // Check for secure keys (V2 system only)
      const hasNewKeys = await hasSecureKeys();
      
      console.log('🔑 Key status check:');
      console.log('  - Secure keys (V2):', hasNewKeys);
      
      setKeysInitialized(hasNewKeys);
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
      '🔄 Fresh Device Start',
      'This will completely reset your device:\n\n• Delete device from database\n• Reset cryptographic keys\n• Generate new keys\n\nAll previous photos will show as invalid. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Fresh Start',
          style: 'destructive',
          onPress: async () => {
            // Show loading state
            setGeocamDeviceName(null);
            
            try {
              // Delete secure keys (V2 system only)
              console.log('🔑 Deleting secure keys...');
              await deleteSecureKeys();
              console.log('✅ Secure keys deleted');
              
              const result = await performFreshDeviceStart();
              
              if (result.success) {
                Alert.alert(
                  '✅ Fresh Start Complete', 
                  `${result.message}\n\nSteps completed:\n${
                    result.steps.databaseDeletion.success ? '✅' : '❌'
                  } Database deletion\n${
                    result.steps.keyReset.success ? '✅' : '❌'
                  } Key reset\n${
                    result.steps.keyGeneration.success ? '✅' : '❌'
                  } New key generation`
                );
                
                // Refresh all UI states
                loadSecurityInfo();
                checkKeys();
                loadGeoCamDeviceName();
              } else {
                Alert.alert(
                  '❌ Fresh Start Failed', 
                  `${result.message}\n\nPlease check the logs and try again.`
                );
                
                // Still refresh UI to show current state
                loadSecurityInfo();
                checkKeys();
                loadGeoCamDeviceName();
              }
            } catch (error) {
              Alert.alert(
                '❌ Fresh Start Error', 
                `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
              );
              
              // Refresh UI
              loadSecurityInfo();
              checkKeys();
              loadGeoCamDeviceName();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.headerBackground} />
      
      <View style={[styles.topBar, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.overlay }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          Device Information
        </Text>
        
        {/* Empty view for balanced layout */}
        <View style={{width: 40}} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Device Name Card */}
        {geocamDeviceName && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Device Identity</Text>
            <View style={[styles.deviceNameContainer, { backgroundColor: `${colors.success}20` }]}>
              <Text style={[styles.deviceNameText, { color: colors.success }]}>📱 {geocamDeviceName}</Text>
            </View>
          </View>
        )}

        {/* Backend Status Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Backend Services</Text>
          {isTestingBackend ? (
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>Testing backend connection...</Text>
          ) : backendStatus ? (
            <View>
              <Text style={[styles.statusText, { color: backendStatus.api ? colors.success : colors.error }]}>
                🌐 API: {backendStatus.api ? '✅ Connected' : '❌ Offline'}
              </Text>
              <Text style={[styles.statusText, { color: backendStatus.steganography ? colors.success : colors.error }]}>
                🔧 Services: {backendStatus.steganography ? '✅ Ready' : '❌ Offline'}
              </Text>
            </View>
          ) : null}
        </View>

        {supportsHardwareSecurity() && (
          <View style={[styles.hardwareSecurityBadge, { backgroundColor: `${colors.success}20`, borderColor: colors.success }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>✅ Hardware Security Available</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security Status</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {isLoading ? 'Loading security information...' : securitySummary}
          </Text>
        </View>

        {recommendations.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recommendations</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>• {rec}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>About Security</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            This app uses your device's secure storage to generate and store cryptographic keys. 
            These keys are unique to this device and installation, providing convenient photo authentication for trusted devices.
          </Text>
          
          <Text style={[styles.infoSubtitle, { color: colors.text }]}>Protected by:</Text>
          <View style={styles.protectionList}>
            <Text style={[styles.protectionItem, { color: colors.textSecondary }]}>• Device secure storage (Keychain/Keystore)</Text>
            <Text style={[styles.protectionItem, { color: colors.textSecondary }]}>• Device-specific binding</Text>
            <Text style={[styles.protectionItem, { color: colors.textSecondary }]}>• Installation-specific keys</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: colors.accent }]} 
            onPress={() => {
              loadSecurityInfo();
              checkKeys();
              loadGeoCamDeviceName();
              testBackendConnectivity();
            }}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>Refresh All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.resetButton, { backgroundColor: colors.error }]} onPress={handleResetKeys}>
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>Fresh Start</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  hardwareSecurityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  protectionList: {
    marginTop: 8,
  },
  protectionItem: {
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
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceNameContainer: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deviceNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 24,
    marginVertical: 2,
  },
});