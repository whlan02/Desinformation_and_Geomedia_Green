import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { generateSecuritySummary, getSecurityRecommendations, supportsHardwareSecurity } from '../utils/deviceSecurityInfo';
import { deleteDeviceKeys } from '../utils/cryptoUtils';

export default function SecurityInfo() {
  const router = useRouter();
  const [securitySummary, setSecuritySummary] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSecurityInfo();
  }, []);

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
            const success = await deleteDeviceKeys();
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🔐 Device Security</Text>
        
        {supportsHardwareSecurity() && (
          <View style={styles.hardwareSecurityBadge}>
            <Text style={styles.badgeText}>✅ Hardware Security Supported</Text>
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {isLoading ? 'Loading security information...' : securitySummary}
          </Text>
        </View>

        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>💡 Security Recommendations</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>• {rec}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadSecurityInfo}>
            <Text style={styles.refreshButtonText}>🔄 Refresh Info</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetKeys}>
            <Text style={styles.resetButtonText}>🚨 Reset Device Keys</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ About Device Security</Text>
          <Text style={styles.infoText}>
            This app uses your device's secure storage to generate and store cryptographic keys. 
            These keys are unique to this device and installation, providing convenient photo authentication for trusted devices.
          </Text>
          
          <Text style={styles.infoText}>
            {'\n'}🔐 Your private keys are protected by:
          </Text>
          <Text style={styles.infoText}>
            • Device secure storage (Keychain/Keystore){'\n'}
            • No biometric authentication required{'\n'}
            • Device-specific binding{'\n'}
            • Installation-specific keys
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back to Main Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  hardwareSecurityBadge: {
    backgroundColor: '#2d5a2d',
    borderColor: '#4caf50',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#90ee90',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  recommendationsContainer: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#6200EE',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6200EE',
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 18,
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
}); 