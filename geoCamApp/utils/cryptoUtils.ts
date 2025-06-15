import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Generate a new ECDSA key pair (P-256)
export async function generateDeviceKeyPair() {
  // For demo: generate random keys (replace with real ECDSA keypair in production)
  const privateKey = Crypto.getRandomBytes(32).toString();
  const publicKey = Crypto.getRandomBytes(32).toString();
  return { privateKey, publicKey };
}

// Store keys securely
export async function storeKeyPair(privateKey: string, publicKey: string): Promise<void> {
  await SecureStore.setItemAsync('privateKey', privateKey);
  await SecureStore.setItemAsync('publicKey', publicKey);
}

export async function hasStoredKeyPair(): Promise<boolean> {
  const privateKey = await SecureStore.getItemAsync('privateKey');
  const publicKey = await SecureStore.getItemAsync('publicKey');
  return !!privateKey && !!publicKey;
}

// Retrieve keys
export async function getStoredKeyPair() {
  const privateKey = await SecureStore.getItemAsync('privateKey');
  const publicKey = await SecureStore.getItemAsync('publicKey');
  return { privateKey, publicKey };
}

// Hash data (SHA-256)
export async function generateDataHash(data: string) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
}

// Sign data (simulate ECDSA signature for demo)
export async function signDataWithDeviceKey(data: string, privateKey: string) {
  // In production, use a real ECDSA signing method
  // Here, we just hash the data+privateKey for demo
  return await generateDataHash(data + privateKey);
}

// Verify signature (simulate for demo)
export async function verifySignatureWithDeviceKey(
  data: string,
  signature: string,
  publicKey: string
) {
  // In production, use a real ECDSA verify method
  // Here, we just hash data+publicKey and compare for demo
  const expected = await generateDataHash(data + publicKey);
  return expected === signature;
}