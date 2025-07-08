<template>
  <div class="hardware-page">
    <section class="hardware-hero">
      <div class="container">
        <h1>GeoCam Hardware</h1>
        <p>Our custom-built GeoCam prototype device with integrated secure hardware and GPS verification</p>
      </div>
    </section>
    
    <section class="hardware-showcase">
      <div class="container">
        <div class="showcase-card">
          <div class="image-container">
            <img src="/Geocam_Prototype.jpg" alt="GeoCam Hardware Prototype Device" class="hardware-image">
          </div>
          <div class="features-grid">
            <div class="feature">
              <div class="feature-icon">📍</div>
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
              <h4>4K Imaging</h4>
              <p>Professional-grade camera with real-time steganographic embedding</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HardwarePage'
}
</script>

<style scoped>
.hardware-hero {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  padding: 5rem 0 3rem;
  text-align: center;
}

.hardware-hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #1e293b;
}

.hardware-showcase {
  padding: 4rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.showcase-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.image-container {
  padding: 2rem;
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.feature {
  text-align: center;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature h4 {
  color: #1e40af;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #64748b;
  font-size: 0.9rem;
}
</style>