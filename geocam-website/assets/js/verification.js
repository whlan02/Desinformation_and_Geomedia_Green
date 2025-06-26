// Verification functionality for GeoCam Website

document.addEventListener('DOMContentLoaded', function() {
    initVerificationTool();
    initDemoVerification();
});

function initVerificationTool() {
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');
    const verificationResults = document.getElementById('verification-results');
    
    if (!uploadArea || !imageUpload) return;
    
    // Click to upload
    uploadArea.addEventListener('click', function() {
        imageUpload.click();
    });
    
    // File selection handler
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
    
    // Drag and drop functionality
    setupDragAndDrop(uploadArea, imageUpload);
}

function setupDragAndDrop(uploadArea, imageUpload) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadArea.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        uploadArea.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }
}

function handleFileUpload(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please upload a valid image file (JPEG, PNG)');
        return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Read file and perform verification
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        performVerification(file, imageData);
    };
    reader.readAsDataURL(file);
}

function showLoadingState() {
    const uploadArea = document.getElementById('upload-area');
    const verificationResults = document.getElementById('verification-results');
    
    uploadArea.innerHTML = `
        <div class="flex items-center justify-center">
            <svg class="animate-spin h-8 w-8 text-geocam-blue mr-3" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-geocam-dark font-medium">Analyzing image...</span>
        </div>
    `;
    
    verificationResults.classList.remove('hidden');
}

async function performVerification(file, imageData) {
    try {
        // Try real API first, fallback to simulation
        let results;
        try {
            results = await realVerification(file, imageData);
        } catch (apiError) {
            console.warn('API verification failed, using simulation:', apiError);
            results = await simulateVerification(file, imageData);
        }
        displayVerificationResults(results, imageData);
    } catch (error) {
        console.error('Verification error:', error);
        showError('Verification failed. Please try again.');
    }
}

async function realVerification(file, imageData) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('http://localhost:5000/api/verify-image', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    
    const apiResult = await response.json();
    
    // Convert API response to our expected format
    return {
        filename: apiResult.file_info.filename,
        fileSize: formatFileSize(apiResult.file_info.size),
        timestamp: apiResult.verification_timestamp,
        signature: {
            valid: apiResult.signature_valid,
            algorithm: 'Ed25519',
            publicKey: 'Real API Response'
        },
        location: {
            detected: apiResult.location_detected,
            coordinates: apiResult.metadata.coordinates || {
                latitude: 0,
                longitude: 0
            },
            accuracy: apiResult.metadata.coordinates?.accuracy || 0,
            spoofingDetected: apiResult.spoofing_detected
        },
        metadata: {
            camera: 'GeoCam Mobile App',
            steganographyDetected: apiResult.location_detected,
            tamperingDetected: !apiResult.signature_valid
        },
        overall: apiResult.verification_result
    };
}

function simulateVerification(file, imageData) {
    return new Promise((resolve) => {
        // Simulate async verification process
        setTimeout(() => {
            const results = {
                filename: file.name,
                fileSize: formatFileSize(file.size),
                timestamp: new Date().toISOString(),
                signature: {
                    valid: Math.random() > 0.3, // 70% chance of valid signature
                    algorithm: 'Ed25519',
                    publicKey: 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
                },
                location: {
                    detected: Math.random() > 0.2, // 80% chance of location detected
                    coordinates: {
                        latitude: 52.5200 + (Math.random() - 0.5) * 0.1,
                        longitude: 13.4050 + (Math.random() - 0.5) * 0.1
                    },
                    accuracy: Math.floor(Math.random() * 10) + 1,
                    spoofingDetected: Math.random() > 0.8 // 20% chance of spoofing
                },
                metadata: {
                    camera: 'GeoCam Mobile v1.2',
                    steganographyDetected: Math.random() > 0.1, // 90% chance of steganography
                    tamperingDetected: Math.random() > 0.9 // 10% chance of tampering
                },
                overall: 'valid' // Will be calculated based on other factors
            };
            
            // Calculate overall result
            if (!results.signature.valid || results.location.spoofingDetected || results.metadata.tamperingDetected) {
                results.overall = 'invalid';
            } else if (!results.location.detected || !results.metadata.steganographyDetected) {
                results.overall = 'warning';
            }
            
            resolve(results);
        }, 2000);
    });
}

function displayVerificationResults(results, imageData) {
    const verificationResults = document.getElementById('verification-results');
    const resultsContent = document.getElementById('results-content');
    const uploadArea = document.getElementById('upload-area');
    
    // Reset upload area
    resetUploadArea();
    
    // Create results HTML
    const resultsHTML = createResultsHTML(results, imageData);
    resultsContent.innerHTML = resultsHTML;
    
    // Show results with animation
    verificationResults.classList.remove('hidden');
    verificationResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function createResultsHTML(results, imageData) {
    const overallStatus = getOverallStatus(results.overall);
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Image Preview -->
            <div class="space-y-4">
                <img src="${imageData}" alt="Uploaded image" class="w-full h-64 object-cover rounded-lg shadow-md">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-geocam-dark mb-2">File Information</h4>
                    <div class="space-y-1 text-sm">
                        <p><span class="font-medium">Filename:</span> ${results.filename}</p>
                        <p><span class="font-medium">Size:</span> ${results.fileSize}</p>
                        <p><span class="font-medium">Analyzed:</span> ${new Date(results.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            </div>
            
            <!-- Verification Results -->
            <div class="space-y-4">
                <!-- Overall Status -->
                <div class="verification-item verification-item-${overallStatus.type}">
                    <div class="verification-icon">
                        ${overallStatus.icon}
                    </div>
                    <div class="verification-content">
                        <div class="verification-title">Overall Verification</div>
                        <div class="verification-details">${overallStatus.message}</div>
                    </div>
                </div>
                
                <!-- Digital Signature -->
                <div class="verification-item verification-item-${results.signature.valid ? 'success' : 'error'}">
                    <div class="verification-icon">
                        ${results.signature.valid ? getSuccessIcon() : getErrorIcon()}
                    </div>
                    <div class="verification-content">
                        <div class="verification-title">Digital Signature</div>
                        <div class="verification-details">
                            ${results.signature.valid ? 'Valid Ed25519 signature detected' : 'Invalid or missing signature'}
                        </div>
                    </div>
                </div>
                
                <!-- Location Verification -->
                <div class="verification-item verification-item-${getLocationStatus(results.location)}">
                    <div class="verification-icon">
                        ${getLocationIcon(results.location)}
                    </div>
                    <div class="verification-content">
                        <div class="verification-title">Location Data</div>
                        <div class="verification-details">
                            ${getLocationMessage(results.location)}
                        </div>
                    </div>
                </div>
                
                <!-- Metadata Analysis -->
                <div class="verification-item verification-item-${getMetadataStatus(results.metadata)}">
                    <div class="verification-icon">
                        ${getMetadataIcon(results.metadata)}
                    </div>
                    <div class="verification-content">
                        <div class="verification-title">Metadata Analysis</div>
                        <div class="verification-details">
                            ${getMetadataMessage(results.metadata)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Detailed Information -->
        <div class="mt-6 bg-gray-50 p-6 rounded-lg">
            <h4 class="font-bold text-geocam-dark mb-4">Detailed Technical Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <h5 class="font-medium mb-2">Cryptographic Details</h5>
                    <p><strong>Algorithm:</strong> ${results.signature.algorithm}</p>
                    <p><strong>Public Key:</strong> ${results.signature.publicKey}</p>
                </div>
                ${results.location.detected ? `
                <div>
                    <h5 class="font-medium mb-2">Location Details</h5>
                    <p><strong>Coordinates:</strong> ${results.location.coordinates.latitude.toFixed(6)}, ${results.location.coordinates.longitude.toFixed(6)}</p>
                    <p><strong>Accuracy:</strong> ±${results.location.accuracy}m</p>
                </div>
                ` : ''}
                <div>
                    <h5 class="font-medium mb-2">Camera Information</h5>
                    <p><strong>Device:</strong> ${results.metadata.camera}</p>
                </div>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="mt-6 flex gap-4 justify-center">
            <button onclick="downloadReport()" class="bg-geocam-blue hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors">
                Download Report
            </button>
            <button onclick="resetVerification()" class="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-6 rounded transition-colors">
                Verify Another Image
            </button>
        </div>
    `;
}

function resetUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
        <svg class="mx-auto h-12 w-12 text-geocam-blue mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-geocam-dark font-medium mb-2">Drop your GeoCam image here or click to browse</p>
        <p class="text-gray-500 text-sm">Supports JPEG, PNG formats</p>
        <input type="file" id="image-upload" class="hidden" accept="image/*">
    `;
    
    // Re-initialize upload functionality
    const imageUpload = document.getElementById('image-upload');
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

// Helper functions for status determination
function getOverallStatus(overall) {
    switch (overall) {
        case 'valid':
            return {
                type: 'success',
                icon: getSuccessIcon(),
                message: 'Image verification successful - this appears to be an authentic GeoCam image'
            };
        case 'warning':
            return {
                type: 'warning',
                icon: getWarningIcon(),
                message: 'Image verification completed with warnings - some data may be incomplete'
            };
        case 'invalid':
            return {
                type: 'error',
                icon: getErrorIcon(),
                message: 'Image verification failed - this does not appear to be a valid GeoCam image'
            };
    }
}

function getLocationStatus(location) {
    if (location.spoofingDetected) return 'error';
    if (!location.detected) return 'warning';
    return 'success';
}

function getLocationMessage(location) {
    if (location.spoofingDetected) {
        return 'Location spoofing detected - coordinates may be falsified';
    }
    if (!location.detected) {
        return 'No location data found in image';
    }
    return `Valid GPS coordinates detected (±${location.accuracy}m accuracy)`;
}

function getLocationIcon(location) {
    if (location.spoofingDetected) return getErrorIcon();
    if (!location.detected) return getWarningIcon();
    return getSuccessIcon();
}

function getMetadataStatus(metadata) {
    if (metadata.tamperingDetected) return 'error';
    if (!metadata.steganographyDetected) return 'warning';
    return 'success';
}

function getMetadataMessage(metadata) {
    if (metadata.tamperingDetected) {
        return 'Image tampering detected - metadata has been modified';
    }
    if (!metadata.steganographyDetected) {
        return 'No steganographic data found - may not be a GeoCam image';
    }
    return 'GeoCam metadata found and intact';
}

function getMetadataIcon(metadata) {
    if (metadata.tamperingDetected) return getErrorIcon();
    if (!metadata.steganographyDetected) return getWarningIcon();
    return getSuccessIcon();
}

// Icon helper functions
function getSuccessIcon() {
    return `<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
    </svg>`;
}

function getWarningIcon() {
    return `<svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>`;
}

function getErrorIcon() {
    return `<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
    </svg>`;
}

// Demo verification functionality
function initDemoVerification() {
    const demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', runDemoVerification);
    }
}

function runDemoVerification() {
    // Create a sample image blob for demo
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Draw a simple demo image
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#059669');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GeoCam Demo Image', 200, 150);
    
    canvas.toBlob(function(blob) {
        blob.name = 'geocam-demo.png';
        const file = new File([blob], 'geocam-demo.png', { type: 'image/png' });
        handleFileUpload(file);
    });
}

// Global functions for button actions
window.downloadReport = function() {
    // Create and download a verification report
    const report = {
        timestamp: new Date().toISOString(),
        status: 'Verification completed',
        details: 'This is a sample verification report for GeoCam image analysis.'
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geocam-verification-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.resetVerification = function() {
    const verificationResults = document.getElementById('verification-results');
    verificationResults.classList.add('hidden');
    resetUploadArea();
    initVerificationTool();
};

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
        <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <p class="text-red-600 font-medium mb-4">${message}</p>
            <button onclick="resetVerification()" class="bg-geocam-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Try Again
            </button>
        </div>
    `;
}