<template>
  <div class="about-page">
    <section class="about-hero">
      <div class="container">
        <h1>About GeoCam</h1>
        <p>GeoCam is part of the Desinformation and Geomedia Study project at the Institute for Geoinformatics, developing cutting-edge solutions to combat misinformation through verifiable location data.</p>
      </div>
    </section>
    
    <section class="about-content">
      <div class="container">
        <div class="content-grid">
          <div class="text-content">
            <h2>Project Background</h2>
            <p>In an era of increasing digital manipulation and misinformation, GeoCam provides a robust solution for creating tamper-evident, location-verified photographs. Our cryptographic approach ensures that every image captured contains verifiable proof of its authenticity and location.</p>
            
            <h3>Goals</h3>
            <ul>
              <li>Combat photo manipulation and misinformation</li>
              <li>Provide cryptographic proof of photo authenticity</li>
              <li>Enable location verification for media content</li>
              <li>Support journalism and research with verified media</li>
            </ul>
          </div>
          
          <div class="institute-info">
            <img src="/ifgi-logo.png" alt="Institute for Geoinformatics (IFGI)" class="institute-logo">
            <h4>Institute for Geoinformatics (IFGI)</h4>
            <p>Desinformation and Geomedia Study Project</p>
            
            <div class="contact-info">
              <h5>Get in Touch</h5>
              <a href="https://github.com/whlan02/Desinformation_and_Geomedia_Green" target="_blank" class="github-link">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>

<style scoped>
.about-hero {
  background: linear-gradient(135deg, #1e40af, #059669);
  color: white;
  padding: 5rem 0 3rem;
  text-align: center;
}

.about-hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.about-hero p {
  font-size: 1.25rem;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0.9;
}

.about-content {
  padding: 4rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  align-items: start;
}

.text-content h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1e293b;
}

.text-content h3 {
  font-size: 1.5rem;
  margin: 2rem 0 1rem;
  color: #1e40af;
}

.text-content ul {
  list-style: none;
  padding: 0;
}

.text-content li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.text-content li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #059669;
  font-weight: bold;
}

.institute-info {
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
  display: inline-block;
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

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .about-hero h1 {
    font-size: 2rem;
  }
}
</style>