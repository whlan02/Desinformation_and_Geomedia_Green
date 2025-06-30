<template>
  <div class="public-layout">
    <!-- Public Navigation -->
    <nav class="public-nav" :class="{ 'scrolled': isScrolled }">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/" class="brand-link">
            <img src="/geocam-logo.png" alt="GeoCam Logo" class="brand-logo">
            <span class="brand-text">GeoCam</span>
          </router-link>
        </div>
        
        <!-- Desktop Navigation -->
        <div class="nav-menu desktop-menu">
          <a href="#home" class="nav-link">Home</a>
          <a href="#hardware" class="nav-link">Hardware</a>
          <a href="#admin" class="nav-link">Device Management</a>
          <a href="#capture" class="nav-link">Capture</a>
          <a href="#verify" class="nav-link">Verify</a>
          <a href="#architecture" class="nav-link">Architecture</a>
          <a href="#build" class="nav-link">Build</a>
          <a href="#about" class="nav-link">About</a>
        </div>
        
        <!-- Mobile Menu Button -->
        <button 
          class="mobile-menu-btn"
          @click="toggleMobileMenu"
          :class="{ 'active': mobileMenuOpen }"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      
      <!-- Mobile Navigation -->
      <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }">
        <a href="#home" class="mobile-nav-link" @click="closeMobileMenu">Home</a>
        <a href="#hardware" class="mobile-nav-link" @click="closeMobileMenu">Hardware</a>
        <a href="#admin" class="mobile-nav-link" @click="closeMobileMenu">Device Management</a>
        <a href="#capture" class="mobile-nav-link" @click="closeMobileMenu">Capture</a>
        <a href="#verify" class="mobile-nav-link" @click="closeMobileMenu">Verify</a>
        <a href="#architecture" class="mobile-nav-link" @click="closeMobileMenu">Architecture</a>
        <a href="#build" class="mobile-nav-link" @click="closeMobileMenu">Build</a>
        <a href="#about" class="mobile-nav-link" @click="closeMobileMenu">About</a>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="public-main">
      <router-view />
    </main>

    <!-- Public Footer -->
    <footer class="public-footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-brand">
            <img src="/geocam-logo.png" alt="GeoCam" class="footer-logo">
            <h3>GeoCam</h3>
            <p>Every Photo Tells a Story. GeoCam Makes It True.</p>
          </div>
          
          <div class="footer-links">
            <div class="footer-section">
              <h4>Product</h4>
              <router-link to="/capture">How it Works</router-link>
              <router-link to="/verify">Verify Images</router-link>
              <router-link to="/hardware">Hardware</router-link>
              <router-link to="/build">SDK</router-link>
            </div>
            
            <div class="footer-section">
              <h4>Resources</h4>
              <router-link to="/architecture">Architecture</router-link>
              <router-link to="/flow">Interactive Flow</router-link>
              <a href="https://github.com/whlan02/Desinformation_and_Geomedia_Green" target="_blank">GitHub</a>
            </div>
            
            <div class="footer-section">
              <h4>Organization</h4>
              <router-link to="/about">About GeoCam</router-link>
              <p class="ifgi-credit">
                <img src="/ifgi-logo.png" alt="IFGI" class="ifgi-logo">
                Institute for Geoinformatics
              </p>
            </div>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2024 GeoCam Project - Desinformation and Geomedia Study</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'PublicLayout',
  data() {
    return {
      mobileMenuOpen: false,
      isScrolled: false
    }
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll)
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    closeMobileMenu() {
      this.mobileMenuOpen = false
    },
    handleScroll() {
      this.isScrolled = window.scrollY > 50
    },
    handleResize() {
      if (window.innerWidth > 768) {
        this.mobileMenuOpen = false
      }
    }
  }
}
</script>

<style scoped>
/* Public Layout Styles */
.public-layout {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: 0;
}

/* Navigation */
.public-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: all 0.3s ease;
}

.public-nav.scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.nav-container {
  width: 100%;
  margin: 0;
  padding-left: 2rem;
  padding-right: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

@media (min-width: 640px) {
  .nav-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .nav-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.nav-brand {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #1e293b;
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e40af;
}

.desktop-menu {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-link:hover {
  color: #1e40af;
  background-color: #f1f5f9;
}

.nav-link.router-link-active {
  color: #1e40af;
  background-color: #eff6ff;
  font-weight: 600;
}


/* Mobile Menu */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-menu-btn span {
  width: 24px;
  height: 3px;
  background: #1e293b;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.mobile-menu {
  display: none;
  flex-direction: column;
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 1rem;
  gap: 0.5rem;
}

.mobile-nav-link {
  color: #64748b;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link.router-link-active {
  color: #1e40af;
  background-color: #eff6ff;
}

/* Main Content */
.public-main {
  flex: 1;
  margin-top: 64px; /* Account for fixed nav */
}

/* Footer */
.public-footer {
  background: #1e293b;
  color: white;
  margin-top: auto;
}

.footer-container {
  max-width: 1566.9px; /* match original HTML width */
  margin: 0 auto;
  padding: 3rem 1rem 1rem;
}

@media (min-width: 640px) {
  .footer-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .footer-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-bottom: 2rem;
}

@media (min-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr 2fr;
  }
}

.footer-brand h3 {
  color: #3b82f6;
  font-size: 1.5rem;
  margin: 0.5rem 0;
}

.footer-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.footer-links {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 640px) {
  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .footer-links {
    grid-template-columns: repeat(3, 1fr);
  }
}

.footer-section h4 {
  color: #e2e8f0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.footer-section a {
  color: #94a3b8;
  text-decoration: none;
  display: block;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.footer-section a:hover {
  color: #3b82f6;
}

.ifgi-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.ifgi-logo {
  width: 32px;
  height: auto;
  background: white;
  padding: 4px;
  border-radius: 4px;
}

.footer-bottom {
  border-top: 1px solid #374151;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-footer-link {
  color: #3b82f6;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.admin-footer-link:hover {
  background: #3b82f6;
  color: white;
}

/* Responsive Design */

/* Large Screens */
@media (min-width: 1440px) {
  .nav-container {
    max-width: 1800px;
    padding: 0 3rem;
  }
  
  .footer-container {
    max-width: 1800px;
    padding: 3rem 3rem 1rem;
  }
  
  .desktop-menu {
    gap: 2.5rem;
  }
  
  .nav-link {
    padding: 0.75rem 1.25rem;
    font-size: 1.05rem;
  }
}

/* Tablet and below */
@media (max-width: 1023px) {
  .nav-container {
    padding: 0 1.5rem;
  }
  
  .footer-container {
    padding: 3rem 1.5rem 1rem;
  }
  
  .desktop-menu {
    gap: 1.5rem;
  }
  
  .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
  }
}

/* Mobile and Tablet Portrait */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 1rem;
  }
  
  .footer-container {
    padding: 2rem 1rem 1rem;
  }
  
  .desktop-menu {
    display: none;
  }
  
  .mobile-menu-btn {
    display: flex;
  }
  
  .mobile-menu.open {
    display: flex;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .footer-links {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .footer-bottom {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
}

/* Mobile Portrait */
@media (max-width: 567px) {
  .nav-container {
    padding: 0 0.75rem;
    height: 56px;
  }
  
  .brand-text {
    font-size: 1.125rem;
  }
  
  .brand-logo {
    width: 32px;
    height: 32px;
  }
  
  .footer-container {
    padding: 1.5rem 0.75rem 1rem;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .footer-brand h3 {
    font-size: 1.25rem;
  }
  
  .mobile-nav-link {
    padding: 1rem;
    font-size: 1.05rem;
  }
}

/* Extra Small Screens */
@media (max-width: 320px) {
  .nav-container {
    padding: 0 0.5rem;
  }
  
  .footer-container {
    padding: 1rem 0.5rem 1rem;
  }
  
  .brand-text {
    font-size: 1rem;
  }
}

/* Touch Optimizations */
@media (hover: none) and (pointer: coarse) {
  .nav-link, .mobile-nav-link {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  
  .mobile-menu-btn {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>