<template>
  <div class="interactive-flow-container">
    <div class="flow-header">
      <h3>Interactive GeoCam Flow</h3>
      <p>Step-by-step walkthrough of the complete GeoCam process</p>
    </div>
    
    <div class="flow-controls">
      <button @click="openFlowModal" class="start-flow-btn">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
        </svg>
        Start Interactive Flow
      </button>
    </div>
    
    <!-- Flow Modal -->
    <div v-if="showModal" class="flow-modal-overlay" @click="closeFlowModal">
      <div class="flow-modal" @click.stop>
        <div class="modal-header">
          <div class="flow-progress-container">
            <div class="flow-progress-bar">
              <div class="flow-progress" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="flow-step-counter">
              Step {{ currentStep }} of {{ totalSteps }}
            </div>
          </div>
          <button @click="closeFlowModal" class="close-btn">&times;</button>
        </div>
        
        <div class="flow-content">
          <div class="flow-step">
            <div class="flow-step-header">
              <div class="flow-step-number">{{ currentStep }}</div>
              <div>
                <h3 class="flow-step-title">{{ currentStepData.title }}</h3>
              </div>
            </div>
            
            <div class="flow-step-description">
              {{ currentStepData.description }}
            </div>
            
            <div class="flow-step-code">
              <pre><code v-html="highlightedCode"></code></pre>
            </div>
            
            <div class="flow-step-details">
              <h4>Technical Details</h4>
              <p>{{ currentStepData.details }}</p>
            </div>
          </div>
        </div>
        
        <div class="flow-controls-bottom">
          <button 
            @click="previousStep" 
            :disabled="currentStep === 1"
            class="flow-nav-btn prev-btn"
          >
            ← Previous
          </button>
          
          <button 
            @click="toggleAutoplay" 
            class="autoplay-btn"
            :class="{ 'playing': isAutoPlaying }"
          >
            {{ isAutoPlaying ? 'Pause' : 'Auto Play' }}
          </button>
          
          <button 
            @click="nextStep" 
            class="flow-nav-btn next-btn"
          >
            {{ currentStep === totalSteps ? 'Finish' : 'Next →' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InteractiveFlow',
  data() {
    return {
      showModal: false,
      currentStep: 1,
      totalSteps: 12,
      isAutoPlaying: false,
      autoplayInterval: null,
      flowSteps: [
        {
          title: "App Launch",
          description: "User opens the GeoCam mobile application and grants necessary permissions for camera and location access.",
          code: `// Initialize GeoCam app
const app = new GeoCamApp();
await app.requestPermissions(['camera', 'location']);
app.initializeComponents();`,
          details: "The app requests camera and GPS permissions, initializes the cryptographic engine, and prepares the UI components."
        },
        {
          title: "Camera Initialization",
          description: "The camera module initializes with real-time preview and prepares for location capture.",
          code: `// Initialize camera with location services
const camera = new CameraController();
const locationService = new LocationService();

await camera.initialize({
    quality: 'high',
    format: 'jpeg'
});

locationService.startLocationTracking();`,
          details: "Camera starts with high-quality settings while GPS begins acquiring accurate location data with multiple satellite systems."
        },
        {
          title: "Location Acquisition",
          description: "GPS system acquires precise coordinates with accuracy validation and spoofing detection.",
          code: `// Acquire and validate location
const location = await locationService.getCurrentLocation({
    accuracy: 'high',
    timeout: 10000,
    enableHighAccuracy: true
});

const isValid = await locationService.validateLocation(location);
if (!isValid) throw new Error('Location spoofing detected');`,
          details: "Multiple GPS satellites are used to ensure accuracy. The system checks for location spoofing attempts using movement patterns and satellite geometry."
        },
        {
          title: "Photo Capture",
          description: "User captures a photo with simultaneous location timestamp recording.",
          code: `// Capture photo with location
const captureData = await camera.takePictureAsync({
    location: location,
    timestamp: Date.now(),
    quality: 0.9
});

const imageData = captureData.uri;
const metadata = {
    location: location,
    timestamp: captureData.timestamp,
    device: await getDeviceInfo()
};`,
          details: "The exact moment of capture is recorded with GPS coordinates, device information, and environmental sensors data."
        },
        {
          title: "Metadata Compilation",
          description: "System compiles comprehensive metadata including location, timestamp, and device information.",
          code: `// Compile comprehensive metadata
const metadata = {
    coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
    },
    timestamp: new Date().toISOString(),
    device: {
        model: await Device.getModelAsync(),
        os: Platform.OS,
        version: Platform.Version
    },
    camera: {
        settings: camera.getCurrentSettings(),
        sensor: await camera.getSensorInfo()
    }
};`,
          details: "Detailed metadata includes GPS coordinates, capture timestamp, device specifications, camera settings, and sensor information."
        },
        {
          title: "Key Generation",
          description: "Cryptographic key pair is generated or retrieved for digital signature creation.",
          code: `// Generate or retrieve cryptographic keys
const keyManager = new KeyManager();
let keyPair = await keyManager.getKeyPair();

if (!keyPair) {
    keyPair = await keyManager.generateKeyPair({
        algorithm: 'Ed25519',
        keySize: 256
    });
    await keyManager.storeKeyPair(keyPair);
}`,
          details: "Ed25519 elliptic curve cryptography ensures fast, secure signatures. Keys are stored in the device's secure enclave when available."
        },
        {
          title: "Digital Signature",
          description: "The metadata is cryptographically signed using Ed25519 algorithm for authenticity proof.",
          code: `// Create digital signature
const signer = new MetadataSigner();
const metadataString = JSON.stringify(metadata);
const signature = await signer.sign(metadataString, keyPair.privateKey);

const signedMetadata = {
    ...metadata,
    signature: signature,
    publicKey: keyPair.publicKey,
    algorithm: 'Ed25519'
};`,
          details: "The Ed25519 signature algorithm provides strong cryptographic proof that the metadata hasn't been tampered with and comes from the authenticated device."
        },
        {
          title: "Steganographic Embedding",
          description: "Signed metadata is invisibly embedded into the image using steganographic techniques.",
          code: `// Embed metadata using steganography
const steganographer = new SteganographyEngine();
const embeddedImage = await steganographer.embedData(
    imageData,
    JSON.stringify(signedMetadata),
    {
        method: 'LSB',
        channels: ['red', 'green', 'blue'],
        distributionPattern: 'random'
    }
);`,
          details: "Least Significant Bit (LSB) steganography hides metadata in image pixels. The data is distributed randomly across color channels to avoid detection."
        },
        {
          title: "Image Storage",
          description: "The processed image with embedded metadata is securely stored in the device gallery.",
          code: `// Store the processed image
const storageManager = new GalleryStorage();
const imageRecord = {
    id: generateUUID(),
    filename: \`geocam_\${Date.now()}.jpg\`,
    imageData: embeddedImage,
    metadata: signedMetadata,
    createdAt: new Date(),
    verified: true
};

await storageManager.saveImage(imageRecord);
await storageManager.updateIndex(imageRecord);`,
          details: "Images are stored with indexed metadata for fast searching. The storage includes verification status and backup capabilities."
        },
        {
          title: "Verification Upload",
          description: "User uploads the GeoCam image to the web verification tool for authenticity checking.",
          code: `// Web verification tool receives image
const verificationTool = new VerificationEngine();
const uploadedFile = event.target.files[0];

const imageBuffer = await uploadedFile.arrayBuffer();
const extractedData = await verificationTool.extractMetadata(imageBuffer);`,
          details: "The web verification tool accepts image uploads and begins the extraction process to retrieve embedded metadata."
        },
        {
          title: "Metadata Extraction",
          description: "The verification system extracts and decodes the hidden metadata from the uploaded image.",
          code: `// Extract embedded metadata
const extractor = new SteganographyDecoder();
const embeddedData = await extractor.extractData(imageBuffer, {
    method: 'LSB',
    expectedLength: 1024,
    channels: ['red', 'green', 'blue']
});

const metadata = JSON.parse(embeddedData);
const signature = metadata.signature;
const originalData = { ...metadata };
delete originalData.signature;`,
          details: "The steganography decoder reverses the embedding process to extract the JSON metadata, including the digital signature and all capture information."
        },
        {
          title: "Signature Verification",
          description: "The system verifies the digital signature to confirm image authenticity and detect tampering.",
          code: `// Verify digital signature
const verifier = new SignatureVerifier();
const publicKey = metadata.publicKey;
const dataToVerify = JSON.stringify(originalData);

const isValidSignature = await verifier.verify(
    dataToVerify,
    signature,
    publicKey,
    'Ed25519'
);

const verificationResult = {
    signatureValid: isValidSignature,
    locationVerified: await verifyLocation(metadata.coordinates),
    timestampValid: verifyTimestamp(metadata.timestamp),
    overall: isValidSignature ? 'VERIFIED' : 'INVALID'
};`,
          details: "Signature verification ensures the metadata hasn't been altered. Additional checks validate GPS coordinates and timestamp consistency."
        }
      ]
    }
  },
  computed: {
    currentStepData() {
      return this.flowSteps[this.currentStep - 1] || {}
    },
    progressPercentage() {
      return (this.currentStep / this.totalSteps) * 100
    },
    highlightedCode() {
      return this.highlightCode(this.currentStepData.code || '')
    }
  },
  methods: {
    openFlowModal() {
      this.showModal = true
      this.currentStep = 1
      document.body.style.overflow = 'hidden'
    },
    
    closeFlowModal() {
      this.showModal = false
      this.stopAutoplay()
      document.body.style.overflow = 'auto'
    },
    
    nextStep() {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++
      } else {
        this.closeFlowModal()
      }
    },
    
    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    },
    
    toggleAutoplay() {
      if (this.isAutoPlaying) {
        this.stopAutoplay()
      } else {
        this.startAutoplay()
      }
    },
    
    startAutoplay() {
      if (this.currentStep >= this.totalSteps) {
        this.currentStep = 1
      }
      
      this.isAutoPlaying = true
      
      this.autoplayInterval = setInterval(() => {
        if (this.currentStep < this.totalSteps) {
          this.nextStep()
        } else {
          this.stopAutoplay()
        }
      }, 4000)
    },
    
    stopAutoplay() {
      this.isAutoPlaying = false
      
      if (this.autoplayInterval) {
        clearInterval(this.autoplayInterval)
        this.autoplayInterval = null
      }
    },
    
    highlightCode(code) {
      if (!code) return ''
      
      // Simple syntax highlighting for JavaScript
      let highlighted = code
      
      // Highlight keywords
      highlighted = highlighted.replace(/\b(const|let|var|async|await|function|class|new|if|else|return|throw|try|catch)\b/g, 
        '<span style="color: #c084fc; font-weight: bold;">$1</span>')
      
      // Highlight strings
      highlighted = highlighted.replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, 
        '<span style="color: #10b981;">$1$2$3</span>')
      
      // Highlight comments
      highlighted = highlighted.replace(/\/\/(.*$)/gm, 
        '<span style="color: #64748b; font-style: italic;">//$1</span>')
      
      // Highlight function calls
      highlighted = highlighted.replace(/(\w+)(\()/g, 
        '<span style="color: #3b82f6;">$1</span>$2')
      
      return highlighted
    },
    
    handleKeydown(e) {
      if (!this.showModal) return
      
      switch(e.key) {
        case 'Escape':
          this.closeFlowModal()
          break
        case 'ArrowLeft':
          this.previousStep()
          break
        case 'ArrowRight':
          this.nextStep()
          break
        case ' ':
          e.preventDefault()
          this.toggleAutoplay()
          break
      }
    }
  },
  
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)
  },
  
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
    this.stopAutoplay()
  }
}
</script>

<style scoped>
.interactive-flow-container {
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.flow-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  text-align: center;
}

.flow-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.flow-header p {
  margin: 0;
  opacity: 0.9;
}

.flow-controls {
  padding: 2rem;
  text-align: center;
}

.start-flow-btn {
  display: inline-flex;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.start-flow-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px -2px rgba(0, 0, 0, 0.15);
}

/* Modal Styles */
.flow-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.flow-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.flow-progress-container {
  flex: 1;
  margin-right: 1rem;
}

.flow-progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.flow-progress {
  height: 100%;
  background: linear-gradient(90deg, #059669 0%, #10b981 100%);
  transition: width 0.3s ease;
}

.flow-step-counter {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #64748b;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.3s ease;
  line-height: 1;
}

.close-btn:hover {
  color: #1e293b;
}

.flow-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.flow-step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.flow-step-number {
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  flex-shrink: 0;
}

.flow-step-title {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 700;
}

.flow-step-description {
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.flow-step-code {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.flow-step-code pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}

.flow-step-code code {
  background: none;
  padding: 0;
  border-radius: 0;
}

.flow-step-details {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1.5rem;
}

.flow-step-details h4 {
  color: #1e40af;
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.flow-step-details p {
  color: #1e40af;
  margin: 0;
  line-height: 1.6;
}

.flow-controls-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.flow-nav-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #374151;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.flow-nav-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.flow-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.autoplay-btn {
  padding: 0.75rem 1.5rem;
  background: #059669;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.autoplay-btn:hover {
  background: #047857;
}

.autoplay-btn.playing {
  background: #dc2626;
}

.autoplay-btn.playing:hover {
  background: #b91c1c;
}

/* SVG icon styles */
.w-5 {
  width: 1.25rem;
}

.h-5 {
  height: 1.25rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .flow-modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .flow-content {
    padding: 1rem;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .flow-controls-bottom {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .flow-nav-btn, .autoplay-btn {
    width: 100%;
  }
  
  .flow-step-code {
    font-size: 0.8rem;
  }
}
</style>