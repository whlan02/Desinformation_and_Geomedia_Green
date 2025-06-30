<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section id="home" class="hero-section">
      <div class="hero-background"></div>
      <div class="hero-content">
        <div class="hero-container">
          <div class="hero-brand">
            <img src="/geocam-logo.png" alt="GeoCam Logo" class="hero-logo">
          </div>
          
          <h1 class="hero-title">
            Every Photo Tells a Story. GeoCam Makes It True.
          </h1>
          
          <p class="hero-subtitle">
            Cryptographically secure location-verified photography
          </p>
          
          <!-- Hero Features -->
          <div class="hero-features">
            <div class="feature-card">
              <div class="feature-icon">
                <img src="/secure_capture.png" alt="Secure Capture" class="feature-image">
              </div>
              <h3>Secure Capture</h3>
              <p>Real-time GPS verification with cryptographic signatures embedded in every photo</p>
            </div>
            
            <a href="#verify" class="feature-card feature-link">
              <div class="feature-icon">
                <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <h3>Instant Verification</h3>
              <p>Upload any GeoCam image to instantly verify its authenticity and location data</p>
            </a>
            
            <a href="#build" class="feature-card feature-link">
              <div class="feature-icon">
                <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <h3>Open Architecture</h3>
              <p>Built on open standards with APIs for developers and researchers</p>
            </a>
          </div>
          
        </div>
      </div>
    </section>

    <!-- Hardware Prototype Section -->
    <section id="hardware" class="hardware-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>GeoCam Hardware</h2>
          <p>Our custom-built GeoCam prototype device with integrated secure hardware and GPS verification</p>
        </div>
        
        <div class="hardware-showcase">
          <div class="showcase-card">
            <div class="image-container">
              <img src="/Geocam_Prototype.jpg" alt="GeoCam Hardware Prototype Device" class="hardware-image">
            </div>
            <div class="features-grid">
              <div class="feature">
                <div class="feature-icon">
                  <img src="/camera-locator.jpeg" alt="GPS Integration" class="feature-image">
                </div>
                <h4>GPS Integration</h4>
                <p>High-precision location tracking with tamper-resistant GPS module</p>
              </div>
              <div class="feature">
                <div class="feature-icon">🔒</div>
                <h4>Secure Crypto</h4>
                <p>Hardware-based Ed25519 signature generation and verification</p>
              </div>
              <div class="feature">
                <div class="feature-icon">📷</div>
                <h4>Quality Imaging</h4>
                <p>Professional grade camera with real time steganographic embedding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Device Management & Analytics Section -->
    <AdminSection />

    <!-- Capture Section -->
    <section id="capture" class="capture-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>Capture</h2>
          <p>Learn how GeoCam captures and secures location-verified photographs with cryptographic precision</p>
        </div>
        
        <div class="capture-content">
          <div class="process-grid">
            <div class="process-step">
              <div class="step-number">1</div>
              <h4>Secure Capture</h4>
              <p>Real-time GPS verification with cryptographic signatures embedded in every photo</p>
            </div>
            <div class="process-step">
              <div class="step-number">2</div>
              <h4>Location Verification</h4>
              <p>High-precision GPS coordinates are cryptographically bound to the image data</p>
            </div>
            <div class="process-step">
              <div class="step-number">3</div>
              <h4>Digital Signing</h4>
              <p>Ed25519 signatures ensure tamper-evident proof of authenticity</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Verify Section -->
    <section id="verify" class="verify-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>Verify</h2>
          <p>Upload any GeoCam image to verify its authenticity, check the digital signature, and detect potential geo-spoofing attempts.</p>
        </div>
        
        <ImageVerification />
      </div>
    </section>

    <!-- Architecture Section -->
    <section id="architecture" class="architecture-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>System Architecture</h2>
          <p>Explore the technical architecture of GeoCam with our interactive diagram. Hover over components to learn about their implementation details.</p>
        </div>
        
        <div class="architecture-content">
          <!-- Interactive Architecture Diagram -->
          <ArchitectureDiagram />
          
          <!-- Architecture Overview -->
          <div class="architecture-features">
            <div class="arch-feature">
              <div class="arch-icon">🔧</div>
              <h4>UI Layer</h4>
              <p>React Native components for cross-platform mobile interface</p>
            </div>
            <div class="arch-feature">
              <div class="arch-icon">⚙️</div>
              <h4>Core Processing</h4>
              <p>Image processing, GPS handling, and metadata management</p>
            </div>
            <div class="arch-feature">
              <div class="arch-icon">🔒</div>
              <h4>Security Layer</h4>
              <p>Ed25519 signatures, steganography, and verification protocols</p>
            </div>
            <div class="arch-feature">
              <div class="arch-icon">🗄️</div>
              <h4>Storage & APIs</h4>
              <p>Local storage, cloud sync, and external service integration</p>
            </div>
          </div>
          
        </div>
      </div>
    </section>

    <!-- Interactive Flow Section -->
    <section id="flow" class="flow-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>Interactive Flow</h2>
          <p>Step through the GeoCam workflow with our interactive demonstration</p>
        </div>
        
        <div class="flow-content">
          <!-- Interactive Flow Component -->
          <InteractiveFlow />
        </div>
      </div>
    </section>

    <!-- Build Section -->
    <section id="build" class="build-section">
      <div class="wide-container">
        <div class="section-header">
          <h2>Build</h2>
          <p>Integrate GeoCam into your applications with our SDKs and development tools</p>
        </div>
        
        <div class="build-content">
          <!-- SDK Grid -->
          <div class="sdk-grid">
            <div class="sdk-card">
              <div class="sdk-icon">🤖</div>
              <h4>Android SDK</h4>
              <p>Kotlin-based SDK for Android applications</p>
              <div class="sdk-actions">
                <a href="#" class="download-btn">Download SDK →</a>
              </div>
            </div>
            
            <div class="sdk-card">
              <div class="sdk-icon">📱</div>
              <h4>Expo Go</h4>
              <p>React Native SDK for cross-platform mobile applications</p>
              <div class="sdk-actions">
                <a href="#" class="download-btn">Download SDK →</a>
              </div>
            </div>
            
            <div class="sdk-card">
              <div class="sdk-icon">⚙️</div>
              <h4>Rust CLI</h4>
              <p>Command-line tool for verification and batch processing</p>
              <div class="sdk-actions">
                <a href="#" class="download-btn">Download CLI →</a>
              </div>
            </div>
          </div>
          
          <!-- Quick Start Examples -->
          <div class="examples-section">
            <h3>Quick Start Examples</h3>
            
            <div class="examples-grid">
              <div class="example-card">
                <h4>Android (Kotlin)</h4>
                <div class="code-block">
                  <pre><code>// Initialize GeoCam
val geoCam = GeoCam.Builder()
    .enableLocationVerification(true)
    .setSigningKey(keyPair)
    .build()

// Capture verified photo
geoCam.takePictureAsync { result ->
    when (result) {
        is Success -> handleVerifiedImage(result.image)
        is Error -> handleError(result.exception)
    }
}</code></pre>
                </div>
              </div>
              
              <div class="example-card">
                <h4>Expo Go (React Native)</h4>
                <div class="code-block">
                  <pre><code>import { GeoCam } from '@geocam/expo';

// Initialize GeoCam
const geoCam = new GeoCam({
  enableLocationVerification: true,
  signingKey: keyPair
});

// Capture verified photo
const capturePhoto = async () => {
  try {
    const result = await geoCam.takePictureAsync();
    handleVerifiedImage(result.image);
  } catch (error) {
    handleError(error);
  }
};</code></pre>
                </div>
              </div>
              
              <div class="example-card">
                <h4>Rust CLI</h4>
                <div class="code-block">
                  <pre><code># Verify a GeoCam image
geocam verify --image photo.jpg --public-key key.pub

# Batch verify multiple images
geocam batch-verify --directory ./photos --output report.json

# Extract metadata from GeoCam image
geocam extract --image photo.jpg --format json</code></pre>
                </div>
              </div>
            </div>
          </div>
          
          <!-- GitHub Repository -->
          <div class="github-section">
            <h3>Open Source</h3>
            <p>GeoCam is open source and welcomes contributions from the community.</p>
            <a href="https://github.com/whlan02/Desinformation_and_Geomedia_Green" target="_blank" class="github-repo-link">
              <svg class="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h4>View on GitHub</h4>
                <p>Explore code, contribute, and report issues</p>
              </div>
            </a>
          </div>
          
          <!-- Help & Support Section -->
          <div class="support-section">
            <h3>Help & Support</h3>
            <p>Get help with GeoCam through our comprehensive support resources</p>
            
            <div class="support-grid">
              <!-- Video Tutorials -->
              <div class="support-card">
                <div class="support-icon">🎥</div>
                <h4>Video Tutorials</h4>
                <p>Step-by-step video guides for using GeoCam</p>
                <a href="#" class="support-link coming-soon">Coming Soon →</a>
              </div>
              
              <!-- FAQ Section -->
              <div class="support-card faq-card">
                <div class="support-icon">❓</div>
                <h4>Frequently Asked Questions</h4>
                
                <div class="faq-list">
                  <div class="faq-item">
                    <h5>How does GeoCam prevent location spoofing?</h5>
                    <p>GeoCam uses multiple validation techniques including GPS signal analysis, sensor fusion, and cryptographic timestamps to detect and prevent location spoofing attempts.</p>
                  </div>
                  
                  <div class="faq-item">
                    <h5>What image formats are supported?</h5>
                    <p>GeoCam supports JPEG and PNG formats. The metadata is embedded using steganographic techniques that preserve image quality.</p>
                  </div>
                  
                  <div class="faq-item">
                    <h5>Can I verify images taken with other apps?</h5>
                    <p>Only images captured with GeoCam can be cryptographically verified, as the signing process occurs during capture.</p>
                  </div>
                </div>
              </div>
              
              <!-- Contact Support -->
              <div class="support-card">
                <div class="support-icon">📞</div>
                <h4>Contact Support</h4>
                <div class="contact-links">
                  <a href="mailto:support@geocam.app" class="contact-link">
                    <span class="contact-icon">📧</span>
                    Email Support
                  </a>
                  <a href="#" class="contact-link">
                    <span class="contact-icon">📱</span>
                    Signal Messenger
                  </a>
                  <a href="https://github.com/whlan02/Desinformation_and_Geomedia_Green/issues" target="_blank" class="contact-link">
                    <span class="contact-icon">🐛</span>
                    GitHub Issues
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- About GeoCam Section -->
    <section id="about" class="about-section">
      <div class="container">
        <div class="section-header">
          <h2>About GeoCam</h2>
          <p>GeoCam is part of the Desinformation and Geomedia Study project at the Institute for Geoinformatics, developing cutting-edge solutions to combat misinformation through verifiable location data.</p>
        </div>
        
        <div class="about-content">
          <div class="content-grid">
            <div class="text-content">
              <h3>Project Background</h3>
              <p>In an era of increasing digital manipulation and misinformation, GeoCam provides a robust solution for creating tamper-evident, location-verified photographs. Our cryptographic approach ensures that every image captured contains verifiable proof of its authenticity and location.</p>
              
              <h4>Goals</h4>
              <ul class="goals-list">
                <li>Combat photo manipulation and misinformation</li>
                <li>Provide cryptographic proof of photo authenticity</li>
                <li>Enable location verification for media content</li>
                <li>Support journalism and research with verified media</li>
              </ul>
            </div>
            
            <div class="institute-info">
              <div class="hardware-preview">
                <img src="/Geocam_Prototype.jpg" alt="GeoCam Hardware Prototype" class="preview-image">
                <h4>GeoCam Hardware Prototype</h4>
                <p>Our custom-built GeoCam device featuring integrated GPS, secure cryptographic processing, and high-resolution imaging capabilities.</p>
              </div>
              
              <div class="institute-details">
                <img src="/ifgi-logo.png" alt="Institute for Geoinformatics (IFGI)" class="institute-logo">
                <h4>Institute for Geoinformatics (IFGI)</h4>
                <p>Desinformation and Geomedia Study Project</p>
                
                <div class="contact-info">
                  <h5>Get in Touch</h5>
                  <a href="https://github.com/whlan02/Desinformation_and_Geomedia_Green" target="_blank" class="github-link">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"/>
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import AdminSection from '../../components/public/AdminSection.vue'
import ImageVerification from '../../components/public/ImageVerification.vue'
import ArchitectureDiagram from '../../components/public/ArchitectureDiagram.vue'
import InteractiveFlow from '../../components/public/InteractiveFlow.vue'

export default {
  name: 'HomePage',
  components: {
    AdminSection,
    ImageVerification,
    ArchitectureDiagram,
    InteractiveFlow
  }
}
</script>

<style scoped>
/* Reset and fullscreen base */
.home-page {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Global Section Styles - Fullscreen Layout */
.container {
  width: 100%;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Wide container for fullscreen sections */
.wide-container {
  width: 100%;
  max-width: 1400px; /* Reasonable max width for content readability */
  margin: 0 auto;
  padding-left: 2rem;
  padding-right: 2rem;
}

/* Responsive padding like original sm:px-6 lg:px-8 */
@media (min-width: 640px) {
  .container, .wide-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container, .wide-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-header h2 {
  font-size: 1.875rem; /* text-3xl */
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1e293b;
}

@media (min-width: 768px) {
  .section-header h2 {
    font-size: 3rem; /* md:text-5xl */
  }
}

.section-header p {
  font-size: 1.25rem; /* text-xl */
  color: #64748b;
  max-width: 48rem; /* max-w-3xl */
  margin: 0 auto;
  line-height: 1.6;
}

/* Hero Section - Full Edge Background */
.hero-section {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-image: url('/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.hero-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.7), rgba(5, 150, 105, 0.4));
}

.hero-content {
  position: relative;
  z-index: 10;
  width: 100%;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.hero-container {
  max-width: 80rem; /* max-w-5xl */
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  text-align: center;
  width: 100%;
}

@media (min-width: 640px) {
  .hero-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .hero-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.hero-brand {
  margin-bottom: 4rem;
}

.hero-logo {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.hero-title {
  font-size: 2.25rem; /* text-4xl */
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-shadow: 0 10px 8px rgb(0 0 0 / 0.04), 0 4px 3px rgb(0 0 0 / 0.1);
  line-height: 1.1;
  color: white;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 3.75rem; /* md:text-6xl */
  }
}

.hero-subtitle {
  font-size: 1.25rem; /* text-xl */
  margin-bottom: 3rem;
  color: #f3f4f6; /* text-gray-100 */
  max-width: 48rem; /* max-w-3xl */
  margin-left: auto;
  margin-right: auto;
  text-shadow: 0 4px 3px rgb(0 0 0 / 0.07), 0 2px 2px rgb(0 0 0 / 0.06);
}

@media (min-width: 768px) {
  .hero-subtitle {
    font-size: 1.5rem; /* md:text-2xl */
  }
}

.hero-features {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
  max-width: 80rem; /* max-w-5xl */
  margin-left: auto;
  margin-right: auto;
}

/* Responsive grid like original md:grid-cols-3 */
@media (min-width: 768px) {
  .hero-features {
    grid-template-columns: repeat(3, 1fr);
  }
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  text-align: center;
  transition: transform 0.3s ease;
  width: 100%;
  min-height: fit-content;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-link {
  text-decoration: none;
  color: inherit;
}

.feature-link:hover {
  text-decoration: none;
  color: inherit;
}

.feature-icon {
  margin-bottom: 1rem;
}

.feature-image {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.btn-primary {
  background: #059669;
  color: white;
}

.btn-primary:hover {
  background: #047857;
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Hardware Section */
.hardware-section {
  padding: 5rem 0;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.hardware-showcase {
  max-width: 1000px;
  margin: 0 auto;
}

.showcase-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.image-container {
  padding: clamp(1rem, 3vw, 2.5rem);
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  display: flex;
  justify-content: center;
  align-items: center;
}

.hardware-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 3rem;
}

@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.feature {
  text-align: center;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-image {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature h4 {
  color: #1e40af;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #64748b;
  font-size: 0.9rem;
}

/* About Section */
.about-section {
  padding: 5rem 0;
  background: white;
}

.about-content {
  max-width: 1200px;
  margin: 0 auto;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 90vw), 1fr));
  gap: clamp(2rem, 4vw, 4rem);
  align-items: start;
}

.text-content h3 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1e293b;
}

.text-content h4 {
  font-size: 1.5rem;
  margin: 2rem 0 1rem;
  color: #1e40af;
}

.goals-list {
  list-style: none;
  padding: 0;
}

.goals-list li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.goals-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #059669;
  font-weight: bold;
}

.institute-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hardware-preview {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.preview-image {
  width: 100%;
  max-width: 200px;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.institute-details {
  background: #f8fafc;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
}

.institute-logo {
  width: 80px;
  height: auto;
  margin-bottom: 1rem;
  background: white;
  padding: 8px;
  border-radius: 8px;
}

.contact-info {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.github-link {
  display: inline-flex;
  align-items: center;
  background: #1e40af;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.3s;
}

.github-link:hover {
  background: #1d4ed8;
}

/* Capture Section */
.capture-section {
  padding: 5rem 0;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.process-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 90vw), 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.process-step {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.step-number {
  width: 48px;
  height: 48px;
  background: #1e40af;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 auto 1rem;
}

.process-step h4 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.process-step p {
  color: #64748b;
}

/* Verify Section */
.verify-section {
  padding: 5rem 0;
  background: white;
}

.demo-section {
  text-align: center;
  margin-top: 3rem;
}

.demo-btn {
  background: #1e40af;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.demo-btn:hover {
  background: #1d4ed8;
}

/* Architecture Section */
.architecture-section {
  padding: 5rem 0;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.architecture-content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* Component Grid */
.component-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.component-category {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.component-category:hover {
  transform: translateY(-2px);
}

.component-category h3 {
  color: #1e40af;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eff6ff;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.component-item {
  background: #f8fafc;
  color: #1e293b;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e2e8f0;
}

.component-item:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
  transform: translateY(-1px);
}

/* System Layers */
.system-layers {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 3rem;
}

.layer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.layer-section h3 {
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
}

.layer-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.layer-item {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
  transition: transform 0.3s ease;
  cursor: pointer;
}

.layer-item:hover {
  transform: translateY(-2px);
}

/* Architecture Features */
.architecture-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.arch-feature {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.arch-icon {
  font-size: 1.5rem;
  width: 48px;
  text-align: center;
}

.arch-feature h4 {
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.arch-feature p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}


/* Flow Section */
.flow-section {
  padding: 5rem 0;
  background: white;
}

.flow-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

/* Build Section */
.build-section {
  padding: 5rem 0;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.sdk-overview {
  text-align: center;
  margin-bottom: 3rem;
}

.sdk-overview h3 {
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.sdk-overview p {
  font-size: 1.125rem;
  color: #64748b;
  max-width: 800px;
  margin: 0 auto;
}

.sdk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.sdk-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.sdk-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15);
}

.sdk-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
}

.sdk-card h4 {
  color: #1e40af;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.sdk-card p {
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.code-preview {
  background: #1e293b;
  color: #10b981;
  padding: 0.75rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.sdk-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sdk-features li {
  padding: 0.25rem 0;
  color: #64748b;
  font-size: 0.9rem;
  position: relative;
  padding-left: 1.5rem;
}

.sdk-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-weight: bold;
}

.sdk-actions {
  margin-top: 1.5rem;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  background: #1e40af;
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.download-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  color: white;
  text-decoration: none;
}

/* Examples Section */
.examples-section {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 4rem;
}

.examples-section h3 {
  text-align: center;
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 2rem;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(350px, 90vw), 1fr));
  gap: 2rem;
  align-items: stretch;
}

.example-card {
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.example-card h4 {
  background: #1e293b;
  color: white;
  padding: 1rem 1.5rem;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.code-block {
  padding: 0;
  flex: 1;
}

.code-block pre {
  margin: 0;
  padding: 1.5rem;
  background: #1e293b;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  height: 100%;
  display: flex;
  align-items: flex-start;
}

.code-block code {
  background: none;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

.architecture-overview {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 4rem;
}

.architecture-overview h3 {
  text-align: center;
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 2rem;
}

.arch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.arch-component {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.arch-component h4 {
  color: #1e40af;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.arch-component p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.getting-started {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 4rem;
}

.getting-started h3 {
  text-align: center;
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 2rem;
}

.start-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.step-number {
  width: 40px;
  height: 40px;
  background: #1e40af;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.step-content .code-preview {
  margin-bottom: 0;
}

.github-section {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.github-section h3 {
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.github-section p {
  color: #64748b;
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.github-repo-link {
  display: inline-flex;
  align-items: center;
  background: #1e293b;
  color: white;
  text-decoration: none;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.github-repo-link:hover {
  background: #374151;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15);
  color: white;
  text-decoration: none;
}

.github-repo-link h4 {
  color: white;
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
}

.github-repo-link p {
  color: #d1d5db;
  margin: 0;
  font-size: 0.9rem;
}

/* Support Section */
.support-section {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.support-section h3 {
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.support-section > p {
  color: #64748b;
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  text-align: left;
}

.support-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.support-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
}

.support-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: block;
}

.support-card h4 {
  color: #1e293b;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.support-card > p {
  color: #64748b;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.support-link {
  display: inline-flex;
  align-items: center;
  color: #1e40af;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.support-link:hover {
  color: #1d4ed8;
  text-decoration: none;
}

.coming-soon {
  color: #64748b;
  font-style: italic;
}

/* FAQ Styles */
.faq-card {
  grid-column: span 2;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.faq-item {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.faq-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.faq-item h5 {
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.faq-item p {
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

/* Contact Links */
.contact-links {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #1e40af;
  text-decoration: none;
  padding: 0.75rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.contact-link:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
  text-decoration: none;
}

.contact-icon {
  font-size: 1.2rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-features {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .component-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .layer-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .architecture-features {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .system-layers {
    padding: 2rem 1rem;
  }
  
  .component-category {
    padding: 1rem;
  }
  
  .institute-info {
    order: -1;
  }
  
  .process-grid {
    grid-template-columns: 1fr;
  }
  
  .sdk-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .sdk-card {
    padding: 1.5rem;
  }
  
  .examples-section,
  .github-section,
  .support-section {
    padding: 2rem 1rem;
  }
  
  .examples-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .code-block pre {
    font-size: 0.75rem;
    padding: 1rem;
  }
  
  .start-steps {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .step {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .arch-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .github-repo-link {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    padding: 1.5rem;
  }
  
  .support-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .faq-card {
    grid-column: span 1;
  }
  
  .support-card {
    padding: 1.5rem;
  }
}

/* Additional Responsive Refinements */

/* Large screens enhancement */
@media (min-width: 1280px) {
  .hero-features {
    gap: 3rem;
  }
  
  .features-grid {
    gap: 3rem;
  }
  
  .process-grid {
    gap: 3rem;
  }
}

/* Additional spacing for larger screens */
@media (min-width: 1024px) {
  .feature-card {
    padding: 2rem 1.5rem;
  }
}

/* Small screen adjustments */
@media (max-width: 768px) {
  .feature-card {
    padding: 1.5rem 1rem;
  }
  
  .hardware-showcase .showcase-card {
    flex-direction: column;
    gap: 2rem;
  }
}
</style>

