// Architecture diagram functionality for GeoCam Website

document.addEventListener('DOMContentLoaded', function() {
    if (typeof d3 !== 'undefined') {
        initArchitectureDiagram();
    } else {
        console.warn('D3.js not loaded, architecture diagram will not be rendered');
    }
});

function initArchitectureDiagram() {
    const container = d3.select('#architecture-diagram');
    const containerNode = container.node();
    
    if (!containerNode) return;
    
    const width = containerNode.clientWidth;
    const height = 500;
    
    // Clear any existing SVG
    container.selectAll('*').remove();
    
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)');
    
    // Define architecture data based on the detailed system diagram
    const architectureData = {
        nodes: [
            // UI Layer
            {
                id: 'main-menu',
                x: 100,
                y: 50,
                width: 120,
                height: 50,
                color: '#bd10e0',
                title: 'Main Menu',
                description: 'Entry point with Camera, Gallery, and Verify buttons. Built with React Native and Expo Router.',
                files: ['app/index.tsx', 'app/_layout.tsx']
            },
            {
                id: 'camera-ui',
                x: 50,
                y: 150,
                width: 100,
                height: 50,
                color: '#bd10e0',
                title: 'Camera UI',
                description: 'Camera interface with flash, flip, and capture controls. Uses Expo Camera API.',
                files: ['app/camera.tsx']
            },
            {
                id: 'gallery-ui',
                x: 50,
                y: 350,
                width: 100,
                height: 50,
                color: '#bd10e0',
                title: 'Gallery UI',
                description: 'Grid view of captured photos with thumbnails and timestamps. Supports delete and detail view.',
                files: ['app/gallery.tsx']
            },
            {
                id: 'verify-ui',
                x: 50,
                y: 500,
                width: 100,
                height: 50,
                color: '#50e3c2',
                title: 'Verify UI',
                description: 'Interface for selecting and verifying image authenticity. Shows real-time status.',
                files: ['app/verify.tsx', 'app/verify-mobile.tsx']
            },
            
            // Core Processing Layer
            {
                id: 'photo-capture',
                x: 200,
                y: 150,
                width: 120,
                height: 50,
                color: '#7ed321',
                title: 'Photo Capture',
                description: 'Captures high-quality JPEG with base64 encoding. Quality: 0.8, includes EXIF data.',
                files: ['utils/CameraController.ts']
            },
            {
                id: 'metadata-collection',
                x: 370,
                y: 150,
                width: 130,
                height: 50,
                color: '#7ed321',
                title: 'Metadata Collection',
                description: 'Gathers device model, GPS coordinates, timestamp, and signature version info.',
                files: ['utils/GetInfo.js']
            },
            {
                id: 'image-detail',
                x: 200,
                y: 350,
                width: 120,
                height: 50,
                color: '#bd10e0',
                title: 'Image Detail',
                description: 'Full-screen image view with metadata display and sharing options.',
                files: ['app/image-detail.tsx']
            },
            
            // Security Layer
            {
                id: 'steganography',
                x: 550,
                y: 150,
                width: 120,
                height: 50,
                color: '#f5a623',
                title: 'Steganographic Encoding',
                description: 'Embeds metadata invisibly using LSB manipulation via WebView and steganography.js.',
                files: ['utils/steganography.js']
            },
            {
                id: 'key-generation',
                x: 450,
                y: 250,
                width: 120,
                height: 50,
                color: '#f5a623',
                title: 'Ed25519 Key Generation',
                description: 'Auto-generates cryptographic key pairs. Private key stored securely in AsyncStorage.',
                files: ['utils/metadataSigner.ts']
            },
            {
                id: 'digital-signing',
                x: 620,
                y: 250,
                width: 120,
                height: 50,
                color: '#f5a623',
                title: 'Digital Signing',
                description: 'Creates cryptographic signatures using TweetNaCl. Signs image data with private key.',
                files: ['utils/metadataSigner.ts']
            },
            {
                id: 'signature-verification',
                x: 370,
                y: 500,
                width: 130,
                height: 50,
                color: '#50e3c2',
                title: 'Signature Verification',
                description: 'Fast verification engine. Checks EXIF first, then companion files. Uses Ed25519 verification.',
                files: ['utils/verificationEngine.ts']
            },
            
            // Storage Layer
            {
                id: 'exif-embedding',
                x: 750,
                y: 150,
                width: 120,
                height: 50,
                color: '#9013fe',
                title: 'EXIF Embedding',
                description: 'Primary method: embeds signature in JPEG EXIF UserComment field using piexifjs.',
                files: ['utils/exifHandler.ts']
            },
            {
                id: 'companion-file',
                x: 750,
                y: 250,
                width: 120,
                height: 50,
                color: '#9013fe',
                title: 'Companion File',
                description: 'Fallback method: creates separate .sig file with JSON signature data.',
                files: ['utils/fileHandler.ts']
            },
            {
                id: 'gallery-storage',
                x: 920,
                y: 200,
                width: 120,
                height: 50,
                color: '#9013fe',
                title: 'Gallery Storage',
                description: 'Stores image metadata, URIs, timestamps, and encoded info locally using AsyncStorage.',
                files: ['utils/galleryStorage.ts']
            },
            
            // External Systems
            {
                id: 'device-apis',
                x: 200,
                y: 50,
                width: 120,
                height: 50,
                color: '#4a90e2',
                title: 'Device APIs',
                description: 'Native device capabilities: GPS location services, camera hardware, media library access.',
                files: ['expo-camera', 'expo-location']
            },
            {
                id: 'crypto-engine',
                x: 800,
                y: 350,
                width: 120,
                height: 50,
                color: '#f5a623',
                title: 'Crypto Engine',
                description: 'High-performance cryptographic library providing Ed25519 signature generation and verification.',
                files: ['tweetnacl', 'crypto-js']
            },
            {
                id: 'webview-processor',
                x: 550,
                y: 50,
                width: 120,
                height: 50,
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
    };
    
    // Define flow type styles
    const flowStyles = {
        'data-flow': { color: '#4a90e2', width: '2', opacity: '0.8' },
        'security-flow': { color: '#f5a623', width: '3', opacity: '0.9', dasharray: '5,5' },
        'storage-flow': { color: '#9013fe', width: '2', opacity: '0.7' },
        'verification-flow': { color: '#50e3c2', width: '2', opacity: '0.8' }
    };
    
    // Create connections first (so they appear behind nodes)
    const connections = svg.selectAll('.connection')
        .data(architectureData.connections)
        .enter()
        .append('path')
        .attr('class', d => `architecture-connection ${d.type || 'data-flow'}`)
        .attr('d', d => {
            const source = architectureData.nodes.find(n => n.id === d.source);
            const target = architectureData.nodes.find(n => n.id === d.target);
            
            if (!source || !target) return '';
            
            const x1 = source.x + source.width / 2;
            const y1 = source.y + source.height;
            const x2 = target.x + target.width / 2;
            const y2 = target.y;
            
            const midY = (y1 + y2) / 2;
            
            return `M ${x1} ${y1} Q ${x1} ${midY} ${x2} ${y2}`;
        })
        .style('stroke', d => {
            const flowType = d.type || 'data-flow';
            return flowStyles[flowType].color;
        })
        .style('stroke-width', d => {
            const flowType = d.type || 'data-flow';
            return flowStyles[flowType].width;
        })
        .style('stroke-dasharray', d => {
            const flowType = d.type || 'data-flow';
            return flowStyles[flowType].dasharray || 'none';
        })
        .style('fill', 'none')
        .style('opacity', d => {
            const flowType = d.type || 'data-flow';
            return flowStyles[flowType].opacity;
        });
    
    // Create node groups
    const nodeGroups = svg.selectAll('.node-group')
        .data(architectureData.nodes)
        .enter()
        .append('g')
        .attr('class', 'architecture-node node-group')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer');
    
    // Add rectangles for nodes
    nodeGroups.append('rect')
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', d => d.color)
        .style('opacity', 0.9)
        .style('stroke', '#ffffff')
        .style('stroke-width', '2');
    
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
        .text(d => d.title);
    
    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'architecture-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(15, 23, 42, 0.9)')
        .style('color', 'white')
        .style('padding', '12px 16px')
        .style('border-radius', '8px')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('max-width', '300px')
        .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1)');
    
    // Add hover interactions
    nodeGroups
        .on('mouseenter', function(event, d) {
            // Highlight the node
            d3.select(this).select('rect')
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', 'scale(1.05)');
            
            // Show tooltip
            const tooltipHTML = `
                <div class="architecture-tooltip-title">${d.title}</div>
                <div class="architecture-tooltip-description">${d.description}</div>
                <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
                    <strong>Files:</strong> ${d.files.join(', ')}
                </div>
            `;
            
            tooltip.html(tooltipHTML)
                .style('opacity', 1)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseleave', function() {
            // Reset node
            d3.select(this).select('rect')
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'scale(1)');
            
            // Hide tooltip
            tooltip.style('opacity', 0);
        })
        .on('click', function(event, d) {
            // Show detailed information modal or navigate to documentation
            showNodeDetails(d);
        });
    
    // Add layer labels
    const layerLabels = [
        { text: 'UI Layer', x: 20, y: 110, color: '#1e40af' },
        { text: 'Core Processing', x: 20, y: 230, color: '#059669' },
        { text: 'Security Layer', x: 20, y: 350, color: '#dc2626' },
        { text: 'Storage Layer', x: 20, y: 470, color: '#7c3aed' }
    ];
    
    svg.selectAll('.layer-label')
        .data(layerLabels)
        .enter()
        .append('text')
        .attr('class', 'layer-label')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .style('fill', d => d.color)
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .style('opacity', 0.8)
        .text(d => d.text);
    
    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 200}, 20)`);
    
    const legendData = [
        { color: '#bd10e0', label: 'User Interface' },
        { color: '#7ed321', label: 'Core Processing' },
        { color: '#f5a623', label: 'Security Layer' },
        { color: '#9013fe', label: 'Data Storage' },
        { color: '#50e3c2', label: 'Verification' },
        { color: '#4a90e2', label: 'External APIs' }
    ];
    
    const legendItems = legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`);
    
    legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx', 3)
        .style('fill', d => d.color);
    
    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text(d => d.label);
    
    // Responsive resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const newWidth = entry.contentRect.width;
            if (newWidth !== width) {
                // Re-render diagram with new width
                setTimeout(() => initArchitectureDiagram(), 100);
            }
        }
    });
    
    resizeObserver.observe(containerNode);
}

function showNodeDetails(nodeData) {
    // Create a modal or detailed view for the node
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto m-4 p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold text-geocam-dark">${nodeData.title}</h3>
                <button class="text-gray-500 hover:text-gray-700 text-2xl" onclick="this.closest('.fixed').remove()">
                    &times;
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <h4 class="font-bold text-lg mb-2">Description</h4>
                    <p class="text-gray-600">${nodeData.description}</p>
                </div>
                
                <div>
                    <h4 class="font-bold text-lg mb-2">Implementation Files</h4>
                    <ul class="list-disc list-inside space-y-1">
                        ${nodeData.files.map(file => `<li class="text-gray-600 font-mono text-sm">${file}</li>`).join('')}
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-bold text-lg mb-2">Technical Details</h4>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        ${getNodeTechnicalDetails(nodeData.id)}
                    </div>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end">
                <button onclick="this.closest('.fixed').remove()" 
                        class="bg-geocam-blue hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modal.remove();
        }
    });
}

function getNodeTechnicalDetails(nodeId) {
    const details = {
        'ui-camera': `
            <p><strong>Framework:</strong> React Native with Expo Camera</p>
            <p><strong>Features:</strong> Real-time preview, auto-focus, flash control</p>
            <p><strong>Platform:</strong> iOS and Android native camera APIs</p>
        `,
        'ui-gallery': `
            <p><strong>Storage:</strong> AsyncStorage with image thumbnails</p>
            <p><strong>Features:</strong> Lazy loading, verification status badges</p>
            <p><strong>Navigation:</strong> React Navigation with deep linking</p>
        `,
        'ui-verify': `
            <p><strong>Technology:</strong> Web-based interface with drag & drop</p>
            <p><strong>Features:</strong> File validation, progress indicators</p>
            <p><strong>API:</strong> Web Crypto API for client-side verification</p>
        `,
        'core-processor': `
            <p><strong>Library:</strong> Sharp.js for image processing</p>
            <p><strong>Formats:</strong> JPEG, PNG with EXIF preservation</p>
            <p><strong>Pipeline:</strong> Capture → Process → Embed → Store</p>
        `,
        'core-location': `
            <p><strong>Accuracy:</strong> GPS + GLONASS + Galileo support</p>
            <p><strong>Validation:</strong> Multi-point verification</p>
            <p><strong>Privacy:</strong> Location data encrypted at rest</p>
        `,
        'security-crypto': `
            <p><strong>Algorithm:</strong> Ed25519 elliptic curve signatures</p>
            <p><strong>Key Management:</strong> Secure enclave storage</p>
            <p><strong>Standards:</strong> RFC 8032 compliant</p>
        `,
        'security-stego': `
            <p><strong>Method:</strong> LSB (Least Significant Bit) embedding</p>
            <p><strong>Capacity:</strong> Up to 1KB metadata per image</p>
            <p><strong>Detection:</strong> Statistical analysis resistant</p>
        `,
        'security-verify': `
            <p><strong>Verification:</strong> Multi-layer signature validation</p>
            <p><strong>Tampering:</strong> Hash-based integrity checking</p>
            <p><strong>Reporting:</strong> Detailed verification reports</p>
        `,
        'storage-local': `
            <p><strong>Database:</strong> SQLite with FTS5 search</p>
            <p><strong>Encryption:</strong> AES-256-GCM at rest</p>
            <p><strong>Indexing:</strong> Fast metadata queries</p>
        `,
        'storage-cloud': `
            <p><strong>Provider:</strong> End-to-end encrypted sync</p>
            <p><strong>Compression:</strong> Lossless image optimization</p>
            <p><strong>Backup:</strong> Incremental synchronization</p>
        `
    };
    
    return details[nodeId] || '<p>No additional technical details available.</p>';
}

// Export for use in other modules
window.GeoCamArchitecture = {
    initArchitectureDiagram,
    showNodeDetails
};