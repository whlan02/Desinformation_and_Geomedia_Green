// Main JavaScript for GeoCam Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initHeroSection();
    initScrollEffects();
    initQRCode();
    initMobileMenu();
    initAccessibility();
    initLiveStats();
});

// Navigation functionality
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    closeMobileMenu();
                    
                    // Update active link
                    updateActiveNavLink(href);
                }
            }
        });
    });
    
    // Navbar scroll effect
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add background on scroll
        if (scrollTop > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
        
        // Update active section
        updateActiveSection();
        
        lastScrollTop = scrollTop;
    });
}

// Update active navigation link based on current section
function updateActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    
    let currentSection = '';
    const scrollTop = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        
        if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
            currentSection = '#' + section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentSection) {
            link.classList.add('active');
        }
    });
}

// Update active navigation link
function updateActiveNavLink(href) {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === href) {
            link.classList.add('active');
        }
    });
}

// Mobile menu functionality
function initMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    mobileMenuButton.addEventListener('click', function() {
        toggleMobileMenu();
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Close mobile menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    if (mobileMenu.classList.contains('hidden')) {
        openMobileMenu();
    } else {
        closeMobileMenu();
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    mobileMenu.classList.remove('hidden');
    mobileMenuButton.setAttribute('aria-expanded', 'true');
    
    // Update hamburger icon to X
    mobileMenuButton.innerHTML = `
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    `;
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    mobileMenu.classList.add('hidden');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    
    // Update X icon back to hamburger
    mobileMenuButton.innerHTML = `
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
    `;
}

// Hero section initialization
function initHeroSection() {
    const heroImages = document.querySelectorAll('.hero-image-container');
    
    // Add intersection observer for hero images
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    heroImages.forEach((img, index) => {
        img.style.opacity = '0';
        img.style.transform = 'translateY(30px)';
        img.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
        observer.observe(img);
    });
}

// Scroll effects for sections
function initScrollEffects() {
    const animatedElements = document.querySelectorAll('.feature-card, .verification-panel');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// QR Code generation
function initQRCode() {
    const qrCodeContainer = document.getElementById('qr-code');
    if (qrCodeContainer && typeof QRCode !== 'undefined') {
        // Generate QR code for app download
        QRCode.toCanvas(qrCodeContainer, 'https://github.com/whlan02/Desinformation_and_Geomedia_Green/releases', {
            width: 80,
            height: 80,
            margin: 1,
            color: {
                dark: '#1e40af',
                light: '#ffffff'
            }
        }, function(error) {
            if (error) {
                console.error('QR Code generation failed:', error);
                qrCodeContainer.innerHTML = '<div class="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">QR Code</div>';
            }
        });
    }
}

// Accessibility enhancements
function initAccessibility() {
    // Add skip links
    addSkipLinks();
    
    // Handle keyboard navigation
    initKeyboardNavigation();
    
    // Add ARIA labels where needed
    addAriaLabels();
    
    // High contrast mode toggle
    initHighContrastMode();
}

function addSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-geocam-blue text-white px-4 py-2 rounded z-50';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content ID
    const heroSection = document.getElementById('home');
    if (heroSection) {
        heroSection.id = 'main-content';
        heroSection.setAttribute('tabindex', '-1');
    }
}

function initKeyboardNavigation() {
    // Enable keyboard navigation for interactive elements
    const interactiveElements = document.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
    
    interactiveElements.forEach(element => {
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                if (element.tagName === 'BUTTON' || element.hasAttribute('role')) {
                    e.preventDefault();
                    element.click();
                }
            }
        });
    });
}

function addAriaLabels() {
    // Add ARIA labels to navigation
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.setAttribute('role', 'navigation');
        navbar.setAttribute('aria-label', 'Main navigation');
    }
    
    // Add ARIA labels to sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const heading = section.querySelector('h2, h3');
        if (heading) {
            section.setAttribute('aria-labelledby', heading.id || 'section-' + section.id);
            if (!heading.id) {
                heading.id = 'section-' + section.id;
            }
        }
    });
}

function initHighContrastMode() {
    // Check for high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
        document.body.classList.add('high-contrast');
    }
    
    // Listen for changes in contrast preference
    if (window.matchMedia) {
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', function(e) {
            if (e.matches) {
                document.body.classList.add('high-contrast');
            } else {
                document.body.classList.remove('high-contrast');
            }
        });
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Performance optimization
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    // You could send this error to a logging service
});

// Service worker registration for PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Live Statistics functionality
function initLiveStats() {
    // Load statistics immediately
    loadLiveStats();
    
    // Refresh statistics every 30 seconds
    setInterval(loadLiveStats, 30000);
}

async function loadLiveStats() {
    try {
        const response = await fetch('http://localhost:5000/api/stats');
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const stats = await response.json();
        updateStatsDisplay(stats);
    } catch (error) {
        console.warn('Failed to load live stats, using fallback:', error);
        displayFallbackStats();
    }
}

function updateStatsDisplay(stats) {
    // Update main statistics
    updateElement('total-devices', stats.total_devices);
    updateElement('active-devices', stats.active_devices);
    updateElement('total-verifications', stats.total_verifications);
    
    // Calculate and display success rate
    const successRate = stats.total_verifications > 0 
        ? Math.round((stats.successful_verifications / stats.total_verifications) * 100)
        : 0;
    updateElement('success-rate', successRate + '%');
    
    // Update platform statistics
    updatePlatformStats(stats.devices_by_os);
    
    // Update recent activity
    updateRecentActivity(stats.recent_activity);
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        element.classList.remove('loading');
    }
}

function updatePlatformStats(devicesByOs) {
    const container = document.getElementById('platform-stats');
    if (!container) return;
    
    const total = Object.values(devicesByOs).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
        container.innerHTML = '<div class="text-gray-400">No device data available</div>';
        return;
    }
    
    container.innerHTML = Object.entries(devicesByOs)
        .map(([os, count]) => {
            const percentage = Math.round((count / total) * 100);
            return `
                <div class="flex items-center justify-between py-2">
                    <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full bg-geocam-accent mr-3"></div>
                        <span class="text-white">${os}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-300">${count} devices</span>
                        <span class="text-geocam-accent font-semibold">${percentage}%</span>
                    </div>
                </div>
            `;
        })
        .join('');
}

function updateRecentActivity(recentActivity) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (!recentActivity || recentActivity.length === 0) {
        container.innerHTML = '<div class="text-gray-400">No recent activity</div>';
        return;
    }
    
    container.innerHTML = recentActivity
        .slice(0, 5)
        .map(activity => {
            const timeAgo = getTimeAgo(new Date(activity.last_activity));
            return `
                <div class="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                    <div>
                        <div class="text-white font-medium">${activity.sequence}</div>
                        <div class="text-gray-400 text-sm">${activity.model}</div>
                    </div>
                    <div class="text-geocam-accent text-sm">${timeAgo}</div>
                </div>
            `;
        })
        .join('');
}

function displayFallbackStats() {
    // Display static fallback data when API is not available
    updateElement('total-devices', '3');
    updateElement('active-devices', '3');
    updateElement('total-verifications', '2');
    updateElement('success-rate', '50%');
    
    // Fallback platform stats
    const platformContainer = document.getElementById('platform-stats');
    if (platformContainer) {
        platformContainer.innerHTML = `
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-geocam-accent mr-3"></div>
                    <span class="text-white">iOS</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300">1 device</span>
                    <span class="text-geocam-accent font-semibold">33%</span>
                </div>
            </div>
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-blue-400 mr-3"></div>
                    <span class="text-white">Android</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300">2 devices</span>
                    <span class="text-geocam-accent font-semibold">67%</span>
                </div>
            </div>
        `;
    }
    
    // Fallback recent activity
    const activityContainer = document.getElementById('recent-activity');
    if (activityContainer) {
        activityContainer.innerHTML = `
            <div class="flex items-center justify-between py-2 border-b border-white/10">
                <div>
                    <div class="text-white font-medium">GeoCam001</div>
                    <div class="text-gray-400 text-sm">iPhone 14 Pro</div>
                </div>
                <div class="text-geocam-accent text-sm">Active now</div>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-white/10">
                <div>
                    <div class="text-white font-medium">GeoCam002</div>
                    <div class="text-gray-400 text-sm">Samsung Galaxy S24</div>
                </div>
                <div class="text-geocam-accent text-sm">1 day ago</div>
            </div>
        `;
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

// Export functions for use in other modules
window.GeoCamMain = {
    updateActiveNavLink,
    closeMobileMenu,
    debounce,
    throttle,
    loadLiveStats
};