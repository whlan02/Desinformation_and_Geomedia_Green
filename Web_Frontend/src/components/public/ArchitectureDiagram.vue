<template>
  <div class="architecture-diagram-container">
    <div class="architecture-header">
      <h3>Interactive System Architecture</h3>
      <p>Explore the GeoCam system components and their interactions</p>
    </div>
    
    <div class="architecture-controls">
      <button @click="resetView" class="control-btn">Reset View</button>
      <button @click="toggleConnections" class="control-btn">
        {{ showConnections ? 'Hide' : 'Show' }} Connections
      </button>
    </div>
    
    <div id="architecture-diagram" class="diagram-container" ref="diagramContainer"></div>
    
    <!-- Node Detail Modal -->
    <div v-if="selectedNode" class="node-modal-overlay" @click="closeNodeModal">
      <div class="node-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedNode.title }}</h3>
          <button @click="closeNodeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-content">
          <div class="node-description">
            <h4>Description</h4>
            <p>{{ selectedNode.description }}</p>
          </div>
          
          <div class="node-files">
            <h4>Implementation Files</h4>
            <ul>
              <li v-for="file in selectedNode.files" :key="file" class="file-item">
                {{ file }}
              </li>
            </ul>
          </div>
          
          <div class="node-tech-details">
            <h4>Technical Details</h4>
            <div v-html="getTechnicalDetails(selectedNode.id)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'ArchitectureDiagram',
  data() {
    return {
      selectedNode: null,
      showConnections: true,
      svg: null,
      width: 0,
      height: 500,
      architectureData: {
        nodes: [
          // UI Layer
          {
            id: 'main-menu',
            x: 100, y: 50, width: 120, height: 50,
            color: '#bd10e0',
            title: 'Main Menu',
            description: 'Entry point with Camera, Gallery, and Verify buttons. Built with React Native and Expo Router.',
            files: ['app/index.tsx', 'app/_layout.tsx']
          },
          {
            id: 'camera-ui',
            x: 50, y: 150, width: 100, height: 50,
            color: '#bd10e0',
            title: 'Camera UI',
            description: 'Camera interface with flash, flip, and capture controls. Uses Expo Camera API.',
            files: ['app/camera.tsx']
          },
          {
            id: 'gallery-ui',
            x: 50, y: 350, width: 100, height: 50,
            color: '#bd10e0',
            title: 'Gallery UI',
            description: 'Grid view of captured photos with thumbnails and timestamps. Supports delete and detail view.',
            files: ['app/gallery.tsx']
          },
          {
            id: 'verify-ui',
            x: 50, y: 500, width: 100, height: 50,
            color: '#50e3c2',
            title: 'Verify UI',
            description: 'Interface for selecting and verifying image authenticity. Shows real-time status.',
            files: ['app/verify.tsx', 'app/verify-mobile.tsx']
          },
          
          // Core Processing Layer
          {
            id: 'photo-capture',
            x: 200, y: 150, width: 120, height: 50,
            color: '#7ed321',
            title: 'Photo Capture',
            description: 'Captures high-quality JPEG with base64 encoding. Quality: 0.8, includes EXIF data.',
            files: ['utils/CameraController.ts']
          },
          {
            id: 'metadata-collection',
            x: 370, y: 150, width: 130, height: 50,
            color: '#7ed321',
            title: 'Metadata Collection',
            description: 'Gathers device model, GPS coordinates, timestamp, and signature version info.',
            files: ['utils/GetInfo.js']
          },
          {
            id: 'image-detail',
            x: 200, y: 350, width: 120, height: 50,
            color: '#bd10e0',
            title: 'Image Detail',
            description: 'Full-screen image view with metadata display and sharing options.',
            files: ['app/image-detail.tsx']
          },
          
          // Security Layer
          {
            id: 'steganography',
            x: 550, y: 150, width: 120, height: 50,
            color: '#f5a623',
            title: 'Steganographic Encoding',
            description: 'Embeds metadata invisibly using LSB manipulation via WebView and steganography.js.',
            files: ['utils/steganography.js']
          },
          {
            id: 'key-generation',
            x: 450, y: 250, width: 120, height: 50,
            color: '#f5a623',
            title: 'Ed25519 Key Generation',
            description: 'Auto-generates cryptographic key pairs. Private key stored securely in AsyncStorage.',
            files: ['utils/metadataSigner.ts']
          },
          {
            id: 'digital-signing',
            x: 620, y: 250, width: 120, height: 50,
            color: '#f5a623',
            title: 'Digital Signing',
            description: 'Creates cryptographic signatures using TweetNaCl. Signs image data with private key.',
            files: ['utils/metadataSigner.ts']
          },
          {
            id: 'signature-verification',
            x: 370, y: 500, width: 130, height: 50,
            color: '#50e3c2',
            title: 'Signature Verification',
            description: 'Fast verification engine. Checks EXIF first, then companion files. Uses Ed25519 verification.',
            files: ['utils/verificationEngine.ts']
          },
          
          // Storage Layer
          {
            id: 'exif-embedding',
            x: 750, y: 150, width: 120, height: 50,
            color: '#9013fe',
            title: 'EXIF Embedding',
            description: 'Primary method: embeds signature in JPEG EXIF UserComment field using piexifjs.',
            files: ['utils/exifHandler.ts']
          },
          {
            id: 'companion-file',
            x: 750, y: 250, width: 120, height: 50,
            color: '#9013fe',
            title: 'Companion File',
            description: 'Fallback method: creates separate .sig file with JSON signature data.',
            files: ['utils/fileHandler.ts']
          },
          {
            id: 'gallery-storage',
            x: 920, y: 200, width: 120, height: 50,
            color: '#9013fe',
            title: 'Gallery Storage',
            description: 'Stores image metadata, URIs, timestamps, and encoded info locally using AsyncStorage.',
            files: ['utils/galleryStorage.ts']
          },
          
          // External Systems
          {
            id: 'device-apis',
            x: 200, y: 50, width: 120, height: 50,
            color: '#4a90e2',
            title: 'Device APIs',
            description: 'Native device capabilities: GPS location services, camera hardware, media library access.',
            files: ['expo-camera', 'expo-location']
          },
          {
            id: 'crypto-engine',
            x: 800, y: 350, width: 120, height: 50,
            color: '#f5a623',
            title: 'Crypto Engine',
            description: 'High-performance cryptographic library providing Ed25519 signature generation and verification.',
            files: ['tweetnacl', 'crypto-js']
          },
          {
            id: 'webview-processor',
            x: 550, y: 50, width: 120, height: 50,
            color: '#7ed321',
            title: 'WebView Processor',
            description: 'Hidden WebView that runs steganography.js for encoding/decoding operations.',
            files: ['react-native-webview']
          }
        ],
        connections: [
          // Main navigation flows
          { source: 'main-menu', target: 'camera-ui', type: 'data-flow' },
          { source: 'main-menu', target: 'gallery-ui', type: 'data-flow' },
          { source: 'main-menu', target: 'verify-ui', type: 'data-flow' },
          
          // Camera capture flow
          { source: 'device-apis', target: 'camera-ui', type: 'data-flow' },
          { source: 'camera-ui', target: 'photo-capture', type: 'data-flow' },
          { source: 'photo-capture', target: 'metadata-collection', type: 'data-flow' },
          { source: 'device-apis', target: 'metadata-collection', type: 'data-flow' },
          { source: 'metadata-collection', target: 'steganography', type: 'data-flow' },
          { source: 'webview-processor', target: 'steganography', type: 'data-flow' },
          
          // Security flow
          { source: 'key-generation', target: 'digital-signing', type: 'security-flow' },
          { source: 'steganography', target: 'digital-signing', type: 'security-flow' },
          { source: 'digital-signing', target: 'exif-embedding', type: 'security-flow' },
          { source: 'digital-signing', target: 'companion-file', type: 'security-flow' },
          
          // Storage flow
          { source: 'exif-embedding', target: 'gallery-storage', type: 'storage-flow' },
          { source: 'companion-file', target: 'gallery-storage', type: 'storage-flow' },
          { source: 'gallery-storage', target: 'gallery-ui', type: 'data-flow' },
          { source: 'gallery-ui', target: 'image-detail', type: 'data-flow' },
          
          // Verification flow
          { source: 'verify-ui', target: 'signature-verification', type: 'verification-flow' },
          { source: 'crypto-engine', target: 'signature-verification', type: 'security-flow' },
          { source: 'signature-verification', target: 'verify-ui', type: 'verification-flow' },
          
          // Cross-system connections
          { source: 'crypto-engine', target: 'digital-signing', type: 'security-flow' },
          { source: 'key-generation', target: 'signature-verification', type: 'security-flow' }
        ]
      }
    }
  },
  mounted() {
    this.initDiagram()
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    initDiagram() {
      const container = this.$refs.diagramContainer
      if (!container) return
      
      this.width = container.clientWidth
      this.height = 600
      
      // Clear any existing SVG
      d3.select(container).selectAll('*').remove()
      
      this.svg = d3.select(container)
        .append('svg')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .style('background', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)')
      
      this.renderDiagram()
    },
    
    renderDiagram() {
      const flowStyles = {
        'data-flow': { color: '#4a90e2', width: '2', opacity: '0.8' },
        'security-flow': { color: '#f5a623', width: '3', opacity: '0.9', dasharray: '5,5' },
        'storage-flow': { color: '#9013fe', width: '2', opacity: '0.7' },
        'verification-flow': { color: '#50e3c2', width: '2', opacity: '0.8' }
      }
      
      // Create connections
      if (this.showConnections) {
        this.svg.selectAll('.connection')
          .data(this.architectureData.connections)
          .enter()
          .append('path')
          .attr('class', d => `connection ${d.type || 'data-flow'}`)
          .attr('d', d => {
            const source = this.architectureData.nodes.find(n => n.id === d.source)
            const target = this.architectureData.nodes.find(n => n.id === d.target)
            
            if (!source || !target) return ''
            
            const x1 = source.x + source.width / 2
            const y1 = source.y + source.height
            const x2 = target.x + target.width / 2
            const y2 = target.y
            
            const midY = (y1 + y2) / 2
            
            return `M ${x1} ${y1} Q ${x1} ${midY} ${x2} ${y2}`
          })
          .style('stroke', d => flowStyles[d.type || 'data-flow'].color)
          .style('stroke-width', d => flowStyles[d.type || 'data-flow'].width)
          .style('stroke-dasharray', d => flowStyles[d.type || 'data-flow'].dasharray || 'none')
          .style('fill', 'none')
          .style('opacity', d => flowStyles[d.type || 'data-flow'].opacity)
      }
      
      // Create node groups
      const nodeGroups = this.svg.selectAll('.node-group')
        .data(this.architectureData.nodes)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer')
      
      // Add rectangles for nodes
      nodeGroups.append('rect')
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', d => d.color)
        .style('opacity', 0.9)
        .style('stroke', '#ffffff')
        .style('stroke-width', '2')
      
      // Add text labels
      nodeGroups.append('text')
        .attr('x', d => d.width / 2)
        .attr('y', d => d.height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .text(d => d.title)
      
      // Add interactions
      nodeGroups
        .on('mouseenter', (event, d) => {
          d3.select(event.currentTarget).select('rect')
            .transition()
            .duration(200)
            .style('opacity', 1)
            .attr('transform', 'scale(1.05)')
        })
        .on('mouseleave', (event, d) => {
          d3.select(event.currentTarget).select('rect')
            .transition()
            .duration(200)
            .style('opacity', 0.9)
            .attr('transform', 'scale(1)')
        })
        .on('click', (event, d) => {
          this.showNodeDetails(d)
        })
      
      // Add legend
      this.addLegend()
    },
    
    addLegend() {
      const legend = this.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${this.width - 200}, 20)`)
      
      const legendData = [
        { color: '#bd10e0', label: 'User Interface' },
        { color: '#7ed321', label: 'Core Processing' },
        { color: '#f5a623', label: 'Security Layer' },
        { color: '#9013fe', label: 'Data Storage' },
        { color: '#50e3c2', label: 'Verification' },
        { color: '#4a90e2', label: 'External APIs' }
      ]
      
      const legendItems = legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`)
      
      legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx', 3)
        .style('fill', d => d.color)
      
      legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text(d => d.label)
    },
    
    showNodeDetails(node) {
      this.selectedNode = node
    },
    
    closeNodeModal() {
      this.selectedNode = null
    },
    
    resetView() {
      this.initDiagram()
    },
    
    toggleConnections() {
      this.showConnections = !this.showConnections
      this.svg.selectAll('.connection').remove()
      this.renderDiagram()
    },
    
    handleResize() {
      this.initDiagram()
    },
    
    getTechnicalDetails(nodeId) {
      const details = {
        'main-menu': '<p><strong>Framework:</strong> React Native with Expo Router</p><p><strong>Features:</strong> Navigation, state management</p>',
        'camera-ui': '<p><strong>Framework:</strong> React Native with Expo Camera</p><p><strong>Features:</strong> Real-time preview, auto-focus, flash control</p>',
        'gallery-ui': '<p><strong>Storage:</strong> AsyncStorage with image thumbnails</p><p><strong>Features:</strong> Lazy loading, verification status badges</p>',
        'verify-ui': '<p><strong>Technology:</strong> Web-based interface with drag & drop</p><p><strong>Features:</strong> File validation, progress indicators</p>',
        'photo-capture': '<p><strong>Library:</strong> Expo Camera API</p><p><strong>Formats:</strong> JPEG with EXIF preservation</p>',
        'metadata-collection': '<p><strong>Data:</strong> GPS coordinates, device info, timestamps</p><p><strong>Validation:</strong> Multi-point verification</p>',
        'steganography': '<p><strong>Method:</strong> LSB (Least Significant Bit) embedding</p><p><strong>Capacity:</strong> Up to 1KB metadata per image</p>',
        'key-generation': '<p><strong>Algorithm:</strong> Ed25519 elliptic curve signatures</p><p><strong>Key Management:</strong> Secure storage</p>',
        'digital-signing': '<p><strong>Algorithm:</strong> Ed25519 signatures</p><p><strong>Standards:</strong> RFC 8032 compliant</p>',
        'signature-verification': '<p><strong>Verification:</strong> Multi-layer signature validation</p><p><strong>Tampering:</strong> Hash-based integrity checking</p>',
        'exif-embedding': '<p><strong>Method:</strong> JPEG EXIF UserComment field</p><p><strong>Library:</strong> piexifjs</p>',
        'companion-file': '<p><strong>Format:</strong> Separate .sig file with JSON data</p><p><strong>Use:</strong> Fallback when EXIF unavailable</p>',
        'gallery-storage': '<p><strong>Database:</strong> AsyncStorage with indexing</p><p><strong>Features:</strong> Fast metadata queries</p>',
        'device-apis': '<p><strong>APIs:</strong> GPS, Camera, Media Library</p><p><strong>Permissions:</strong> Location, Camera access</p>',
        'crypto-engine': '<p><strong>Library:</strong> TweetNaCl for cryptography</p><p><strong>Performance:</strong> Fast signature operations</p>',
        'webview-processor': '<p><strong>Purpose:</strong> Steganography processing</p><p><strong>Technology:</strong> React Native WebView</p>'
      }
      
      return details[nodeId] || '<p>No additional technical details available.</p>'
    }
  }
}
</script>

<style scoped>
.architecture-diagram-container {
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.architecture-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  text-align: center;
}

.architecture-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.architecture-header p {
  margin: 0;
  opacity: 0.9;
}

.architecture-controls {
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.control-btn {
  padding: 0.5rem 1rem;
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.diagram-container {
  width: 100%;
  height: 600px;
  overflow: hidden;
}

/* Modal Styles */
.node-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.node-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  margin: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: #1e293b;
}

.modal-content {
  padding: 1.5rem;
}

.modal-content > div {
  margin-bottom: 1.5rem;
}

.modal-content h4 {
  margin: 0 0 0.75rem 0;
  color: #1e40af;
  font-size: 1.1rem;
  font-weight: 600;
}

.modal-content p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.modal-content ul {
  margin: 0;
  padding-left: 1.5rem;
}

.file-item {
  color: #64748b;
  font-family: monospace;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.node-tech-details {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .architecture-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .node-modal {
    margin: 0.5rem;
    max-height: 90vh;
  }
  
  .modal-content {
    padding: 1rem;
  }
}
</style>