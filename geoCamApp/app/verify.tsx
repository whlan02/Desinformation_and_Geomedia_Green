import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { verifyImageWithBackend } from '../utils/backendService';

export default function Verify() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [signatureVerification, setSignatureVerification] = useState<{valid: boolean, message: string} | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const pickImage = async () => {
    setSelectedImage(null);
    setDecodedInfo(null);
    setErrorText(null);
    setSignatureVerification(null);
    setIsDecoding(true);

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) {
      setIsDecoding(false);
      return;
    }

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.uri) {
        setSelectedImage(asset.uri);
        
        console.log('🔍 Starting backend verification for image:', asset.uri);
        
        try {
          // 使用后端服务进行验证
          const verificationResult = await verifyImageWithBackend(asset.uri);
          
          console.log('📥 Backend verification result:', verificationResult);
          
          if (verificationResult.success) {
            // 处理成功的验证结果
            if (verificationResult.verification_result?.decoded_data) {
              // 格式化解码的数据
              const decodedData = verificationResult.verification_result.decoded_data;
              let formattedString = '';
              
              if (typeof decodedData === 'object') {
                for (const key in decodedData) {
                  if (decodedData.hasOwnProperty(key)) {
                    if (key === 'location' && decodedData[key]) {
                      formattedString += `Location:\nLat: ${decodedData[key].latitude}\nLon: ${decodedData[key].longitude}\n`;
                    } else {
                      formattedString += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${decodedData[key]}\n`;
                    }
                  }
                }
                setDecodedInfo(formattedString.trim());
              } else {
                setDecodedInfo(`Decoded data: ${decodedData}`);
              }
            } else {
              setDecodedInfo('No hidden information found in the image');
            }
            
            // 设置签名验证结果
            setSignatureVerification({
              valid: verificationResult.verification_result?.signature_valid || false,
              message: verificationResult.message || 'Verification completed via backend'
            });
            
            setErrorText(null);
          } else {
            // 处理验证失败
            setErrorText(verificationResult.error || verificationResult.message || 'Backend verification failed');
            setDecodedInfo(null);
            setSignatureVerification({
              valid: false,
              message: 'Backend verification failed'
            });
          }
        } catch (error) {
          console.error('❌ Backend verification error:', error);
          setErrorText(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
          setDecodedInfo(null);
          setSignatureVerification({
            valid: false,
            message: 'Network or backend error'
          });
        }
      } else {
        setErrorText("Selected image has no URI.");
      }
    } else {
      setErrorText("No image selected or an error occurred.");
    }
    
    setIsDecoding(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={isDecoding}>
        <Text style={styles.buttonText}>Select Image to Verify</Text>
      </TouchableOpacity>

      {isDecoding && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Verifying with backend...</Text>
        </View>
      )}

      {selectedImage && !isDecoding && (
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
      )}

      {signatureVerification && !isDecoding && (
        <View style={[styles.infoBox, signatureVerification.valid ? styles.validSignatureBox : styles.invalidSignatureBox]}>
          <Text style={styles.infoTitle}>
            {signatureVerification.valid ? '✓ Backend Verification' : '✗ Backend Verification'}
          </Text>
          <Text style={[styles.infoText, signatureVerification.valid ? styles.validSignatureText : styles.invalidSignatureText]}>
            {signatureVerification.message}
          </Text>
        </View>
      )}

      {decodedInfo && !isDecoding && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Decoded Information:</Text>
          <Text style={styles.infoText}>{decodedInfo}</Text>
        </View>
      )}
      
      {errorText && !isDecoding && (
        <View style={[styles.infoBox, styles.errorBox]}>
            <Text style={styles.infoTitle}>Error:</Text>
            <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={isDecoding}
      >
        <Text style={styles.backButtonText}>← Back to Main Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6200EE',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 250,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  imagePreview: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#373c40',
    borderRadius: 8,
    width: '90%',
  },
  validSignatureBox: {
    backgroundColor: '#1b4d3e',
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  invalidSignatureBox: {
    backgroundColor: '#4d1b1b',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: '#4d1b1b',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#ccc',
  },
  validSignatureText: {
    color: '#81c784',
  },
  invalidSignatureText: {
    color: '#e57373',
  },
  errorText: {
    fontSize: 16,
    color: '#e57373',
  },
}); 