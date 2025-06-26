// Interactive flow functionality for GeoCam Website

document.addEventListener('DOMContentLoaded', function() {
    initInteractiveFlow();
});

let currentStep = 1;
let totalSteps = 12;
let autoplayInterval = null;
let isAutoPlaying = false;

const flowSteps = [
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
];

function initInteractiveFlow() {
    const startBtn = document.getElementById('start-flow-btn');
    const modal = document.getElementById('flow-modal');
    const closeBtn = document.getElementById('close-flow-btn');
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const autoplayBtn = document.getElementById('autoplay-btn');
    
    if (!startBtn || !modal) return;
    
    startBtn.addEventListener('click', openFlowModal);
    closeBtn.addEventListener('click', closeFlowModal);
    prevBtn.addEventListener('click', previousStep);
    nextBtn.addEventListener('click', nextStep);
    autoplayBtn.addEventListener('click', toggleAutoplay);
    
    // Close modal on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeFlowModal();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!modal.classList.contains('hidden')) {
            switch(e.key) {
                case 'Escape':
                    closeFlowModal();
                    break;
                case 'ArrowLeft':
                    previousStep();
                    break;
                case 'ArrowRight':
                    nextStep();
                    break;
                case ' ':
                    e.preventDefault();
                    toggleAutoplay();
                    break;
            }
        }
    });
}

function openFlowModal() {
    const modal = document.getElementById('flow-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    currentStep = 1;
    updateFlowStep();
    updateProgressBar();
    updateNavigationButtons();
}

function closeFlowModal() {
    const modal = document.getElementById('flow-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    stopAutoplay();
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateFlowStep();
        updateProgressBar();
        updateNavigationButtons();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateFlowStep();
        updateProgressBar();
        updateNavigationButtons();
    }
}

function updateFlowStep() {
    const flowContent = document.getElementById('flow-content');
    const currentStepSpan = document.getElementById('current-step');
    const totalStepsSpan = document.getElementById('total-steps');
    
    if (!flowContent) return;
    
    const step = flowSteps[currentStep - 1];
    
    currentStepSpan.textContent = currentStep;
    totalStepsSpan.textContent = totalSteps;
    
    flowContent.innerHTML = `
        <div class="flow-step">
            <div class="flow-step-header">
                <div class="flow-step-number">${currentStep}</div>
                <div>
                    <h3 class="flow-step-title">${step.title}</h3>
                </div>
            </div>
            
            <div class="flow-step-description">
                ${step.description}
            </div>
            
            <div class="flow-step-code">
                <code>${step.code}</code>
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 class="font-bold text-blue-800 mb-2">Technical Details</h4>
                <p class="text-blue-700 text-sm">${step.details}</p>
            </div>
        </div>
    `;
    
    // Add syntax highlighting
    highlightCode();
}

function updateProgressBar() {
    const progressBar = document.getElementById('flow-progress');
    if (progressBar) {
        const percentage = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentStep === 1;
        prevBtn.style.opacity = currentStep === 1 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        if (currentStep === totalSteps) {
            nextBtn.textContent = 'Finish';
            nextBtn.onclick = closeFlowModal;
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.onclick = nextStep;
        }
        nextBtn.disabled = false;
    }
}

function toggleAutoplay() {
    const autoplayBtn = document.getElementById('autoplay-btn');
    
    if (isAutoPlaying) {
        stopAutoplay();
    } else {
        startAutoplay();
    }
}

function startAutoplay() {
    if (currentStep >= totalSteps) {
        currentStep = 1;
        updateFlowStep();
        updateProgressBar();
        updateNavigationButtons();
    }
    
    isAutoPlaying = true;
    const autoplayBtn = document.getElementById('autoplay-btn');
    autoplayBtn.textContent = 'Pause';
    autoplayBtn.classList.remove('bg-geocam-accent', 'hover:bg-green-700');
    autoplayBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
    
    autoplayInterval = setInterval(() => {
        if (currentStep < totalSteps) {
            nextStep();
        } else {
            stopAutoplay();
        }
    }, 4000);
}

function stopAutoplay() {
    isAutoPlaying = false;
    const autoplayBtn = document.getElementById('autoplay-btn');
    autoplayBtn.textContent = 'Auto Play';
    autoplayBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    autoplayBtn.classList.add('bg-geocam-accent', 'hover:bg-green-700');
    
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
}

function highlightCode() {
    // Simple syntax highlighting for JavaScript
    const codeElements = document.querySelectorAll('.flow-step-code code');
    
    codeElements.forEach(element => {
        let code = element.innerHTML;
        
        // Highlight keywords
        code = code.replace(/\b(const|let|var|async|await|function|class|new|if|else|return|throw|try|catch)\b/g, 
            '<span style="color: #c084fc;">$1</span>');
        
        // Highlight strings
        code = code.replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, 
            '<span style="color: #10b981;">$1$2$3</span>');
        
        // Highlight comments
        code = code.replace(/\/\/(.*$)/gm, 
            '<span style="color: #64748b; font-style: italic;">//$1</span>');
        
        // Highlight function calls
        code = code.replace(/(\w+)(\()/g, 
            '<span style="color: #3b82f6;">$1</span>$2');
        
        element.innerHTML = code;
    });
}

// Export functions for global use
window.GeoCamFlow = {
    openFlowModal,
    closeFlowModal,
    nextStep,
    previousStep,
    toggleAutoplay
};

// Demo functions for step interaction
window.demonstrateStep = function(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
        currentStep = stepNumber;
        openFlowModal();
    }
};

window.showFlowOverview = function() {
    const overview = flowSteps.map((step, index) => ({
        step: index + 1,
        title: step.title,
        description: step.description
    }));
    
    console.table(overview);
    return overview;
};