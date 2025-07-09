# Signature Verification Workflow Analysis

## Current Workflow (With Issues)
1. **App**: Take picture, send to backend with metadata and public key
2. **Backend**: Process image, embed metadata in alpha channel, create hash, return hash to app
3. **App**: Sign hash with private key, send signature to backend
4. **Backend**: Embed signature in last row, return final PNG

**Issues with current workflow:**
- ❌ Backend creates hash of processed image BEFORE signature is embedded
- ❌ During verification, backend creates hash of cleaned image (without signature)
- ❌ This means the hash being verified is different from the hash that was signed
- ❌ Signature format mismatch (DER vs raw bytes) - **FIXED**

## Your Proposed Workflow (Much Better!)
1. **App**: Take picture, send to backend with public key
2. **Backend**: JPEG→PNG, embed metadata in alpha channel (exclude last row)
3. **Backend**: Hash the processed image, send hash to app
4. **App**: Sign hash with private key, send signature to backend
5. **Backend**: Embed public key + signature in last row, return final PNG

**Benefits of your workflow:**
- ✅ Hash is created of the image WITH metadata but WITHOUT signature
- ✅ Signature is embedded AFTER the hash is created
- ✅ During verification, signature is extracted, image is cleaned, same hash is recreated
- ✅ Much cleaner separation of concerns
- ✅ More secure - signature protects the exact image that will be verified

## The Real Problem
Looking at the backend logs, I can see what's happening:

1. **During signing**: Backend creates hash of image with metadata (but no signature yet)
2. **During verification**: Backend extracts signature, cleans last row, creates hash of cleaned image
3. **But**: The cleaned image during verification might not be identical to the pre-signature image from signing

The issue is that there might be subtle differences in the image processing pipeline between signing and verification.

## Implementation Status
- ✅ **FIXED**: Signature format (DER vs raw bytes)
- ✅ **FIXED**: Hash processing (HEX string to bytes)
- 🔄 **CURRENT**: Testing if signature verification now works with these fixes
- 🔄 **NEXT**: If still fails, implement your cleaner workflow

## Test Results Needed
We need to test with a freshly captured image to see if the signature verification now works with the format fixes applied.
