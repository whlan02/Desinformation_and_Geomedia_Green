<template>
  <div class="verification-container">
    <!-- Image Upload Section -->
    <div v-if="!selectedImage" class="upload-section">
      <div 
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @click="triggerFileInput"
        @drop="handleDrop"
        @dragover.prevent="handleDragOver"
        @dragenter.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
      >
        <div v-if="!isVerifying" class="upload-content">
          <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>Drop your GeoCam image here or click to browse</h3>
          <p>Upload any GeoCam image to verify its authenticity and location data</p>
        </div>
        
        <div v-else class="loading-content">
          <div class="spinner"></div>
          <p>Analyzing image...</p>
        </div>
        
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleImageSelect"
          style="display: none"
        />
      </div>
    </div>

    <!-- Verification Results Section -->
    <div v-else class="results-section">
      <!-- Image Preview -->
      <div class="image-card">
        <img :src="selectedImageUrl" class="image-preview" alt="Selected image">
        <div class="image-overlay">
          <i class="icon">✓</i>
          <span>Analyzed</span>
        </div>
      </div>

      <!-- Verification Status -->
      <div v-if="verificationResult" 
           :class="['result-card', verificationResult.verification_result?.signature_valid ? 'success' : 'error']">
        <div class="result-header">
          <i class="icon" v-if="verificationResult.verification_result?.signature_valid">✓</i>
          <i class="icon" v-else>✗</i>
          <div class="result-title">
            <h3>{{ verificationResult.verification_result?.signature_valid ? 'Image Verification Successful' : 'Verification Failed' }}</h3>
            <p>{{ 'The Image is Authentic' }}</p>
          </div>
        </div>
        <div class="result-content" v-if="!verificationResult.verification_result?.signature_valid">
          <p>Unable to verify authenticity</p>
        </div>
      </div>

      <!-- Metadata Information -->
      <div v-if="decodedInfo && decodedInfo.length > 0" class="info-card">
        <div class="info-header">
          <i class="icon">ℹ</i>
          <div class="info-title">
            <h3>Image Metadata</h3>
            <p>Embedded information</p>
          </div>
        </div>
        <div class="metadata-list">
          <div v-for="(item, index) in decodedInfo" :key="index" class="metadata-item">
            <i class="icon">{{ item.icon }}</i>
            <div class="metadata-content">
              <span class="metadata-label">{{ item.label }}</span>
              <span class="metadata-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Map Display -->
      <div v-if="location" class="map-card">
        <div class="map-header">
          <i class="icon">📍</i>
          <div class="map-title">
            <h3>Photo Location</h3>
            <p>GPS coordinates embedded in image</p>
          </div>
        </div>
        <div ref="mapContainer" class="map"></div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-card">
        <div class="error-header">
          <i class="icon">⚠</i>
          <div class="error-title">
            <h3>Error</h3>
            <p>Verification failed</p>
          </div>
        </div>
        <div class="error-content">
          <p>{{ error }}</p>
        </div>
      </div>

      <!-- Action Button -->
      <div class="action-section">
        <button class="verify-button" @click="resetVerification">
          Verify Another Image
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isVerifying" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Verifying image authenticity...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onUnmounted } from 'vue';
import { verifyImagePurePng } from '../../services/backendService';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon } from 'ol/style';
import { Attribution, defaults as defaultControls } from 'ol/control';

export default {
  name: 'ImageVerification',
  
  setup() {
    const fileInput = ref(null);
    const selectedImage = ref(null);
    const selectedImageUrl = ref(null);
    const isVerifying = ref(false);
    const verificationResult = ref(null);
    const decodedInfo = ref(null);
    const error = ref(null);
    const location = ref(null);
    const mapContainer = ref(null);
    const isDragOver = ref(false);
    let map = null;

    const triggerFileInput = () => {
      fileInput.value.click();
    };

    const handleImageSelect = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      selectedImage.value = file;
      selectedImageUrl.value = URL.createObjectURL(file);
      await verifyImage(file);
    };

    const handleDrop = (event) => {
      event.preventDefault();
      isDragOver.value = false;
      
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        selectedImage.value = files[0];
        selectedImageUrl.value = URL.createObjectURL(files[0]);
        verifyImage(files[0]);
      }
    };

    const handleDragOver = () => {
      isDragOver.value = true;
    };

    const handleDragEnter = () => {
      isDragOver.value = true;
    };

    const handleDragLeave = () => {
      isDragOver.value = false;
    };

    const processDecodedData = (data) => {
      const items = [];
      
      // Process device info
      if (data.geocamDevice || data.deviceModel) {
        items.push({
          icon: '📱',
          label: 'Device',
          value: data.geocamDevice 
            ? (data.deviceModel ? `${data.geocamDevice} (${data.deviceModel})` : data.geocamDevice)
            : data.deviceModel,
          type: 'device'
        });
      }

      // Process time info
      if (data.Time || data.time) {
        items.push({
          icon: '⏰',
          label: 'Captured',
          value: data.Time || data.time,
          type: 'time'
        });
      }

      // Process location
      if (data.location) {
        location.value = data.location;
        items.push({
          icon: '📍',
          label: 'Location',
          value: `${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`,
          type: 'location'
        });
      }

      // Process other info
      for (const key in data) {
        if (!['location', 'deviceModel', 'geocamDevice', 'Time', 'time'].includes(key)) {
          items.push({
            icon: 'ℹ',
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(data[key]),
            type: 'other'
          });
        }
      }

      return items;
    };

    const initMap = () => {
      if (!location.value || !mapContainer.value) return;

      const coords = fromLonLat([location.value.longitude, location.value.latitude]);

      map = new Map({
        target: mapContainer.value,
        layers: [
          new TileLayer({
            source: new OSM({
              attributions: [
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
              ]
            })
          })
        ],
        controls: defaultControls({
          zoom: false,
          rotate: false
        }).extend([
          new Attribution({
            collapsible: false
          })
        ]),
        view: new View({
          center: coords,
          zoom: 15
        })
      });

      // Create SVG marker icon
      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50">
          <path fill="#5D3FD3" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      // Convert SVG to data URL
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarker);

      // Add marker
      const marker = new Feature({
        geometry: new Point(coords)
      });

      const vectorLayer = new VectorLayer({
        source: new VectorSource({
          features: [marker]
        }),
        style: new Style({
          image: new Icon({
            src: svgUrl,
            scale: 1,
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          })
        })
      });

      map.addLayer(vectorLayer);
    };

    const verifyImage = async (file) => {
      try {
        isVerifying.value = true;
        error.value = null;
        verificationResult.value = null;
        decodedInfo.value = null;
        location.value = null;

        const result = await verifyImagePurePng(file);
        verificationResult.value = result;

        if (result.success && result.verification_result?.decoded_data) {
          decodedInfo.value = processDecodedData(result.verification_result.decoded_data);
          
          // Initialize map if location is present
          if (location.value) {
            setTimeout(initMap, 100);
          }
        } else if (!result.success) {
          error.value = result.message;
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        isVerifying.value = false;
      }
    };

    const resetVerification = () => {
      selectedImage.value = null;
      selectedImageUrl.value = null;
      verificationResult.value = null;
      decodedInfo.value = null;
      error.value = null;
      location.value = null;
      isVerifying.value = false;
      isDragOver.value = false;
      if (map) {
        map.setTarget(null);
        map = null;
      }
    };

    onUnmounted(() => {
      if (map) {
        map.setTarget(null);
        map = null;
      }
    });

    return {
      fileInput,
      selectedImage,
      selectedImageUrl,
      isVerifying,
      verificationResult,
      decodedInfo,
      error,
      location,
      mapContainer,
      isDragOver,
      triggerFileInput,
      handleImageSelect,
      handleDrop,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      resetVerification
    };
  }
};
</script>

<style scoped>
.verification-container {
  max-width: 1000px;
  margin: 0 auto;
}

/* Upload Area */
.upload-section {
  margin-bottom: 2rem;
}

.upload-area {
  border: 2px dashed #3b82f6;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.upload-area:hover {
  border-color: #1d4ed8;
  background: #eff6ff;
}

.upload-area.drag-over {
  border-color: #10b981;
  background: #ecfdf5;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #3b82f6;
  margin: 0 auto 1rem;
}

.upload-content h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.upload-content p {
  color: #64748b;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.image-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
}

.image-preview {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
}

.image-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.7);
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4caf50;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-card.success {
  border-left: 4px solid #10b981;
  background: #f0fdf4;
}

.result-card.error {
  border-left: 4px solid #ef4444;
  background: #fef2f2;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
}

.map-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #06b6d4;
}

.map {
  height: 300px;
  width: 100%;
  position: relative;
}

/* OpenLayers attribution styling */
:deep(.ol-attribution) {
  position: absolute !important;
  bottom: 0 !important;
  right: 0 !important;
  background: rgba(255,255,255,0.8) !important;
  padding: 2px 8px !important;
  font-size: 12px !important;
  border-radius: 4px 0 0 0 !important;
  border: none !important;
}

:deep(.ol-attribution ul) {
  margin: 0;
  padding: 0;
}

:deep(.ol-attribution button) {
  display: none !important;
}

.metadata-item {
  display: flex;
  align-items: flex-start;
  background: rgba(0,0,0,0.05);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.metadata-content {
  margin-left: 12px;
}

.metadata-label {
  display: block;
  font-size: 0.75rem;
  color: #3b82f6;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.metadata-value {
  display: block;
  margin-top: 0.25rem;
  font-weight: 500;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.verify-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.3s;
}

.verify-button:hover {
  background: #1d4ed8;
}

.icon {
  font-style: normal;
  margin-right: 8px;
}

.result-header, .info-header, .map-header {
  display: flex;
  align-items: flex-start;
}

.result-title, .info-title, .map-title {
  flex: 1;
}

.result-title h3, .info-title h3, .map-title h3 {
  margin: 0 0 4px 0;
}

.result-title p, .info-title p, .map-title p {
  margin: 0;
  color: #666;
  font-size: 0.9em;
}

.map-header {
  padding: 16px;
  background: rgba(0,0,0,0.05);
  border-bottom: 1px solid rgba(0,0,0,0.1);
}
</style> 