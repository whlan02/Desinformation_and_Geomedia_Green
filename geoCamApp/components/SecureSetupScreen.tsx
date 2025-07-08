import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  generateSecureKeyPair, 
  getPublicKeyForRegistration, 
  signImageDataSecurely, 
  hasSecureKeys,
  getKeyMetadata,
  deleteSecureKeys
} from '../utils/secureKeyManager';
import { 
  registerDeviceSecure, 
  checkBackendHealthSecure,
  getRegisteredDevicesSecure,
  getVerificationStatsSecure
} from '../utils/secureBackendService';

/**
 * Secure Setup Screen
 * Demonstrates the new security model setup and testing
 */
export default function SecureSetupScreen() {
  const [keysInitialized, setKeysInitialized] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [keyMetadata, setKeyMetadata] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    try {
      // Check if keys exist
      const hasKeys = await hasSecureKeys();
      setKeysInitialized(hasKeys);

      if (hasKeys) {
        const metadata = await getKeyMetadata();
        setKeyMetadata(metadata);
      }

      // Check backend health
      const healthy = await checkBackendHealthSecure();
      setBackendHealthy(healthy);

      // Get stats if backend is healthy
      if (healthy) {
        const statsResult = await getVerificationStatsSecure();
        if (statsResult.success) {
          setStats(statsResult.stats);
        }
      }
    } catch (error) {
      console.error('❌ Failed to check initial status:', error);
    }
  };

  const initializeKeys = async () => {
    setLoading('Generating secure keys...');
    try {
      const keyPair = await generateSecureKeyPair();
      setKeysInitialized(true);
      setKeyMetadata(keyPair.metadata);
      
      Alert.alert('Success', 'Secure keys generated successfully!');
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      Alert.alert('Error', `Key generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(null);
    }
  };

  const registerDevice = async () => {
    setLoading('Registering device...');
    try {
      const result = await registerDeviceSecure();
      if (result.success) {
        setDeviceRegistered(true);
        Alert.alert('Success', 'Device registered successfully!');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Device registration failed:', error);
      Alert.alert('Error', `Registration failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(null);
    }
  };

  const testSigning = async () => {
    setLoading('Testing signature...');
    try {
      const testData = 'Test image data for signing';
      const testMetadata = {
        timestamp: new Date().toISOString(),
        test: true,
        device: keyMetadata?.deviceModel || 'unknown'
      };

      const signedData = await signImageDataSecurely(testData, testMetadata);
      
      Alert.alert('Success', 
        `Signature created successfully!\n\nPublic Key ID: ${signedData.publicKeyId}\nSignature Length: ${signedData.signature.length}`
      );
    } catch (error) {
      console.error('❌ Signing test failed:', error);
      Alert.alert('Error', `Signing failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(null);
    }
  };

  const resetKeys = async () => {
    Alert.alert(
      'Reset Keys',
      'Are you sure you want to delete all secure keys? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading('Resetting keys...');
            try {
              const success = await deleteSecureKeys();
              if (success) {
                setKeysInitialized(false);
                setDeviceRegistered(false);
                setKeyMetadata(null);
                Alert.alert('Success', 'Keys reset successfully!');
              } else {
                Alert.alert('Error', 'Failed to reset keys');
              }
            } catch (error) {
              console.error('❌ Key reset failed:', error);
              Alert.alert('Error', `Reset failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setLoading(null);
            }
          }
        }
      ]
    );
  };

  const refreshStats = async () => {
    setLoading('Refreshing stats...');
    try {
      const statsResult = await getVerificationStatsSecure();
      if (statsResult.success) {
        setStats(statsResult.stats);
      } else {
        Alert.alert('Error', statsResult.error || 'Failed to get stats');
      }
    } catch (error) {
      console.error('❌ Stats refresh failed:', error);
      Alert.alert('Error', `Stats refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
        <Text style={styles.title}>GeoCam Secure Setup</Text>
        <Text style={styles.subtitle}>Enhanced Security Model</Text>
      </View>

      {/* Status Overview */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Security Status</Text>
        
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: keysInitialized ? '#4CAF50' : '#FF9800' }]}>
            <Ionicons name="key" size={24} color="white" />
            <Text style={styles.statusLabel}>Secure Keys</Text>
            <Text style={styles.statusValue}>{keysInitialized ? 'Ready' : 'Not Set'}</Text>
          </View>

          <View style={[styles.statusCard, { backgroundColor: deviceRegistered ? '#4CAF50' : '#FF9800' }]}>
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.statusLabel}>Device Registered</Text>
            <Text style={styles.statusValue}>{deviceRegistered ? 'Yes' : 'No'}</Text>
          </View>

          <View style={[styles.statusCard, { backgroundColor: backendHealthy ? '#4CAF50' : '#FF5722' }]}>
            <Ionicons name="server" size={24} color="white" />
            <Text style={styles.statusLabel}>Backend</Text>
            <Text style={styles.statusValue}>{backendHealthy ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      {/* Key Information */}
      {keyMetadata && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Key ID:</Text>
            <Text style={styles.infoValue}>{keyMetadata.keyId}</Text>
            
            <Text style={styles.infoLabel}>Fingerprint:</Text>
            <Text style={styles.infoValue}>{keyMetadata.fingerprint}</Text>
            
            <Text style={styles.infoLabel}>Security Level:</Text>
            <Text style={styles.infoValue}>{keyMetadata.securityLevel}</Text>
            
            <Text style={styles.infoLabel}>Device:</Text>
            <Text style={styles.infoValue}>{keyMetadata.deviceModel}</Text>
            
            <Text style={styles.infoLabel}>Generated:</Text>
            <Text style={styles.infoValue}>{new Date(keyMetadata.generatedAt).toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* Statistics */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_verifications}</Text>
              <Text style={styles.statLabel}>Total Verifications</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.valid_verifications}</Text>
              <Text style={styles.statLabel}>Valid Signatures</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active_devices}</Text>
              <Text style={styles.statLabel}>Active Devices</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.success_rate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        {!keysInitialized ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={initializeKeys}
            disabled={loading !== null}
          >
            <Ionicons name="key" size={20} color="white" />
            <Text style={styles.buttonText}>Initialize Secure Keys</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!deviceRegistered && backendHealthy && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]} 
                onPress={registerDevice}
                disabled={loading !== null}
              >
                <Ionicons name="shield-checkmark" size={20} color="white" />
                <Text style={styles.buttonText}>Register Device</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]} 
              onPress={testSigning}
              disabled={loading !== null}
            >
              <Ionicons name="create" size={20} color="white" />
              <Text style={styles.buttonText}>Test Signing</Text>
            </TouchableOpacity>

            {backendHealthy && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]} 
                onPress={refreshStats}
                disabled={loading !== null}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Refresh Stats</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={resetKeys}
              disabled={loading !== null}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.buttonText}>Reset Keys</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{loading}</Text>
        </View>
      )}

      {/* Security Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.securityInfo}>
            🔐 Private keys are stored securely in the device keystore and never transmitted over the network.
          </Text>
          <Text style={styles.securityInfo}>
            🔑 Only public keys are registered with the backend for verification purposes.
          </Text>
          <Text style={styles.securityInfo}>
            📱 Each device generates its own unique key pair using secp256k1 cryptography.
          </Text>
          <Text style={styles.securityInfo}>
            🛡️ Image signatures are created locally on the device and verified remotely using public keys.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statusCard: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    minWidth: 80,
  },
  statusLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  statusValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 20,
    paddingVertical: 20,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    minWidth: 120,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  dangerButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  securityInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
});
