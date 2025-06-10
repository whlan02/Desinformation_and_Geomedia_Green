import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { verifyImageSignature } from '../utils/metadataSigner';

export default function Verify() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<'valid' | 'invalid' | 'not-found' | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<string | null>(null);

  const pickAndVerifyImage = async () => {
    setSelectedImage(null);
    setSignatureStatus(null);
    setVerificationMethod(null);
    setIsVerifying(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        setIsVerifying(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setSelectedImage(asset.uri);
          
          // Fast signature verification
          const verificationResult = await verifyImageSignature(asset.uri);
          
          if (verificationResult.valid) {
            setSignatureStatus('valid');
            setVerificationMethod(verificationResult.method);
          } else if (verificationResult.error === 'No signature found') {
            setSignatureStatus('not-found');
          } else {
            setSignatureStatus('invalid');
            setVerificationMethod(verificationResult.error || 'Unknown error');
          }
        }
      }
    } catch (error) {
      console.error('Error during image verification:', error);
      Alert.alert('Error', 'Failed to verify image. Please try again.');
      setSignatureStatus('invalid');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = () => {
    switch (signatureStatus) {
      case 'valid': return '#4caf50';
      case 'invalid': return '#f44336';
      case 'not-found': return '#ff9800';
      default: return '#ffffff';
    }
  };

  const getStatusText = () => {
    switch (signatureStatus) {
      case 'valid': return `✓ AUTHENTIC - Verified via ${verificationMethod}`;
      case 'invalid': return '✗ INVALID - Image may be tampered';
      case 'not-found': return '⚠ NO SIGNATURE - Image not signed';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Verify</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.button, isVerifying && styles.buttonDisabled]} 
          onPress={pickAndVerifyImage} 
          disabled={isVerifying}
        >
          <Text style={styles.buttonText}>
            {isVerifying ? 'Verifying...' : 'Select & Verify Image'}
          </Text>
        </TouchableOpacity>

        {isVerifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Checking signature...</Text>
          </View>
        )}

        {selectedImage && !isVerifying && (
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
        )}

        {signatureStatus && !isVerifying && (
          <View style={[styles.statusBox, { borderColor: getStatusColor() }]}>
            <Text style={styles.statusTitle}>Digital Signature Status:</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Mobile-Optimized Verification</Text>
          <Text style={styles.infoText}>
            • Fast Ed25519 signature verification{'\n'}
            • Supports JPEG EXIF and companion file signatures{'\n'}
            • Optimized for mobile performance{'\n'}
            • No WebView dependencies
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#373c40',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#6200EE',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  imagePreview: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
  },
  statusBox: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#373c40',
    borderRadius: 12,
    width: '100%',
    borderWidth: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#373c40',
    borderRadius: 8,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
});