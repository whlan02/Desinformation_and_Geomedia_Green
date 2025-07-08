# GeoCam Security Improvement Proposal

## Problem Statement

The current GeoCam implementation has a critical security vulnerability where both private and public keys are transmitted through the API during the image verification process. This creates unnecessary exposure of sensitive cryptographic material.

## Current Architecture Issues

### 1. Key Transmission Security
- **Private Key Exposure**: Private keys are sent over network during verification
- **API Attack Surface**: Backend has access to both private and public keys
- **Centralized Risk**: Single point of failure for key management

### 2. Current Flow Problems
```
Current Flow:
Mobile App → [Private Key + Public Key] → Backend API → Verification
```

## Proposed Secure Architecture

### 1. Device-Centric Key Management
```
Secure Flow:
Mobile App → [Public Key Only] → Backend API → Verification
Private Key → Stays on Device → Never transmitted
```

### 2. Key Responsibilities

#### Mobile Device (Private Key Owner)
- Generate and store private key securely in device keystore
- Sign image data locally on device
- Register public key with backend during initial setup
- Never transmit private key over network

#### Backend API (Public Key Verifier)
- Store only public keys from registered devices
- Verify signatures using public keys
- Maintain device registry with public key associations
- Provide verification results

## Implementation Details

### 1. Device Registration Process

```typescript
// Enhanced Device Registration
interface DeviceRegistration {
  installation_id: string;
  device_model: string;
  public_key: {
    keyBase64: string;        // secp256k1 public key in Base64
    keyId: string;            // Unique key identifier
    algorithm: 'secp256k1';   // Cryptographic algorithm
    fingerprint: string;      // Public key fingerprint
  };
  device_fingerprint: string; // Hardware-based device ID
  registration_timestamp: string;
}
```

### 2. Secure Image Capture Process

```typescript
// On-Device Image Signing
async function captureAndSignImage(imageData: string): Promise<SignedImage> {
  // 1. Generate image metadata
  const metadata = await generateImageMetadata();
  
  // 2. Create data to sign (image + metadata)
  const dataToSign = createSigningPayload(imageData, metadata);
  
  // 3. Sign locally with device private key (NEVER transmitted)
  const signature = await signWithDevicePrivateKey(dataToSign);
  
  // 4. Embed signature and public key reference in image
  const signedImage = await embedSignatureData(imageData, {
    signature,
    publicKeyId: getPublicKeyId(),
    metadata
  });
  
  return signedImage;
}
```

### 3. Backend Verification Process

```typescript
// Backend Verification (Public Key Only)
async function verifyImage(imageBuffer: Buffer): Promise<VerificationResult> {
  // 1. Extract signature and public key ID from image
  const extractedData = await extractSignatureData(imageBuffer);
  
  // 2. Lookup public key by ID from device registry
  const publicKey = await getPublicKeyById(extractedData.publicKeyId);
  
  // 3. Verify signature using public key
  const isValid = await verifySignature(
    extractedData.signature,
    extractedData.signedData,
    publicKey
  );
  
  return {
    isValid,
    deviceInfo: await getDeviceInfo(extractedData.publicKeyId),
    metadata: extractedData.metadata
  };
}
```

## Security Improvements

### 1. Private Key Protection
- **Hardware Security Module**: Use device keystore/secure enclave
- **Never Transmitted**: Private key never leaves the device
- **Biometric Protection**: Optional biometric authentication for key access

### 2. Public Key Management
- **Device Registry**: Backend maintains registry of verified devices
- **Key Rotation**: Support for public key updates
- **Revocation**: Ability to revoke compromised keys

### 3. Verification Security
- **Signature Validation**: Cryptographic proof of authenticity
- **Device Authentication**: Verify image came from registered device
- **Tamper Detection**: Detect any modifications to image or metadata

## Implementation Steps

### Phase 1: Enhance Device Key Management
1. Improve secure key storage using platform-specific keystores
2. Add biometric authentication for key access
3. Implement key rotation capabilities

### Phase 2: Secure API Communication
1. Modify registration API to only accept public keys
2. Update verification API to work with public keys only
3. Add device authentication tokens

### Phase 3: Enhanced Verification
1. Implement comprehensive signature verification
2. Add device reputation system
3. Support for key revocation and renewal

## Benefits

### 1. Security
- **Zero Private Key Exposure**: Private keys never leave device
- **Reduced Attack Surface**: Backend only handles public keys
- **Hardware Protection**: Leverage device security features

### 2. Privacy
- **Data Minimization**: Only necessary public data transmitted
- **User Control**: Users maintain control over their private keys
- **Audit Trail**: Clear separation of responsibilities

### 3. Scalability
- **Decentralized Trust**: Each device maintains its own private key
- **Reduced Backend Load**: Less sensitive data processing
- **Better Compliance**: Meets security best practices

## Migration Strategy

### 1. Backward Compatibility
- Support both old and new verification methods temporarily
- Gradual migration of existing devices
- Clear deprecation timeline

### 2. Testing
- Comprehensive security testing
- Performance benchmarking
- User experience validation

### 3. Documentation
- Updated security documentation
- Developer migration guide
- User privacy explanations

## Code Changes Required

### 1. Mobile App Changes
- Enhanced key storage using secure enclave
- Local signing implementation
- Remove private key transmission

### 2. Backend Changes
- Public key only verification
- Device registry management
- Enhanced authentication

### 3. Database Schema
- Device registry table
- Public key storage
- Audit logging

This proposal significantly improves the security posture of GeoCam while maintaining its core functionality of providing verifiable, tamper-proof image authentication.
