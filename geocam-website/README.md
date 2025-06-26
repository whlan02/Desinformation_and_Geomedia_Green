# GeoCam Website

A comprehensive website for the GeoCam project - cryptographically secure location-verified photos. This website provides information about the project, interactive demonstrations, and tools for verifying GeoCam images.

## 🚀 Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Verification Tool**: Upload and verify GeoCam images with cryptographic validation
- **System Architecture Visualization**: Interactive D3.js diagram showing technical components
- **Interactive Flow Walkthrough**: Step-by-step demonstration of the capture-sign-verify process
- **SDK Documentation**: Code samples and integration guides for Android, iOS, and Rust
- **Accessibility Compliant**: WCAG 2.1 AA compliance with keyboard navigation and screen reader support

## 📁 Project Structure

```
geocam-website/
├── index.html              # Main website file
├── assets/
│   ├── css/
│   │   ├── main.css        # Main styles and responsive design
│   │   └── components.css  # Component-specific styles
│   ├── js/
│   │   ├── main.js         # Core website functionality
│   │   ├── verification.js # Image verification tool
│   │   ├── architecture.js # Interactive architecture diagram
│   │   └── flow.js         # Interactive flow walkthrough
│   └── images/
│       ├── geocam-logo.png
│       ├── app-ui-mockup.png
│       ├── verification-workflow.png
│       ├── architecture-preview.png
│       ├── app-screenshots.png
│       ├── institute-logo.png
│       ├── geocam-og.png
│       └── favicon.png
├── pages/                  # Additional pages (if needed)
├── components/             # Reusable components (if needed)
└── README.md
```

## 🛠 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS (CDN)
- **Visualization**: D3.js for architecture diagrams
- **QR Code**: QRCode.js library
- **Icons**: Heroicons (embedded SVG)
- **Fonts**: System fonts for optimal performance

## 🔧 Local Development

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for best experience)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/whlan02/Desinformation_and_Geomedia_Green.git
   cd Desinformation_and_Geomedia_Green/geocam-website
   ```

2. **Option A: Open directly in browser:**
   ```bash
   open index.html
   # or
   double-click index.html
   ```

3. **Option B: Use a local server (recommended):**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js (if you have npx)
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Open in browser:**
   Navigate to `http://localhost:8000`

### Development Server Options

#### Python (built-in)
```bash
python -m http.server 8000
```

#### Node.js
```bash
# Install serve globally
npm install -g serve
serve . -p 8000

# Or use npx
npx serve . -p 8000
```

#### Live Server (VS Code Extension)
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` and select "Open with Live Server"

## 🚀 Deployment

### Static Hosting Services

#### GitHub Pages
1. Create a new repository or use an existing one
2. Upload the website files to the repository
3. Go to Settings → Pages
4. Set source to "Deploy from a branch"
5. Select main branch and root folder
6. Your site will be available at `https://username.github.io/repository-name`

#### Netlify
1. Drag and drop the `geocam-website` folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for continuous deployment
3. Build settings: No build command needed (static site)
4. Publish directory: root or specify folder

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

#### AWS S3 + CloudFront
1. Create an S3 bucket
2. Enable static website hosting
3. Upload all files
4. Configure CloudFront for global CDN
5. Set up custom domain (optional)

### Build Optimization (Optional)

For production deployment, you may want to optimize the site:

```bash
# Install build tools
npm init -y
npm install --save-dev html-minifier-terser clean-css-cli terser

# Add to package.json scripts:
{
  "scripts": {
    "build": "npm run build:html && npm run build:css && npm run build:js",
    "build:html": "html-minifier-terser --input-dir . --output-dir dist --file-ext html --collapse-whitespace --remove-comments",
    "build:css": "cleancss -o dist/assets/css/main.min.css assets/css/*.css",
    "build:js": "terser assets/js/*.js -o dist/assets/js/main.min.js"
  }
}

# Build for production
npm run build
```

## 🎨 Customization

### Colors
The website uses CSS custom properties for easy theming. Main colors are defined in Tailwind config:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'geocam-blue': '#1e40af',
                'geocam-dark': '#1e293b',
                'geocam-light': '#f1f5f9',
                'geocam-accent': '#059669'
            }
        }
    }
}
```

### Content Updates
- **Hero Section**: Edit the title and tagline in `index.html`
- **About Section**: Update project information and partner details
- **Contact Information**: Update GitHub links and contact methods
- **FAQ**: Add or modify questions in the Help section

### Adding New Sections
1. Add HTML structure to `index.html`
2. Add navigation link to navbar
3. Implement JavaScript functionality in appropriate JS file
4. Add styling in CSS files

## 🔒 Security Features

### Content Security Policy
Add CSP headers for enhanced security:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://d3js.org https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data:; font-src 'self';">
```

### HTTPS Enforcement
Always serve the website over HTTPS in production to ensure security of the verification tool.

## ♿ Accessibility

The website includes:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- High contrast mode support
- Screen reader compatibility
- Focus indicators
- Alt text for images

### Testing Accessibility
```bash
# Install accessibility testing tools
npm install -g pa11y

# Test the website
pa11y http://localhost:8000
```

## 📱 Progressive Web App (PWA)

To enable PWA features:

1. **Create a manifest file** (`manifest.json`):
```json
{
  "name": "GeoCam Website",
  "short_name": "GeoCam",
  "description": "Cryptographically secure location-verified photos",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "icons": [
    {
      "src": "assets/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

2. **Create a service worker** (`sw.js`):
```javascript
const CACHE_NAME = 'geocam-v1';
const urlsToCache = [
  '/',
  '/assets/css/main.css',
  '/assets/js/main.js',
  // Add other assets
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Navigation works on all screen sizes
- [ ] All interactive elements are accessible via keyboard
- [ ] Image verification tool accepts and processes files
- [ ] Architecture diagram renders and responds to interactions
- [ ] Interactive flow modal works correctly
- [ ] All external links open correctly
- [ ] Mobile menu functions properly
- [ ] QR code generates successfully

### Automated Testing
Consider adding:
- Unit tests for JavaScript functions
- End-to-end tests with Cypress or Playwright
- Performance testing with Lighthouse
- Accessibility testing with axe-core

## 📊 Analytics and Monitoring

### Google Analytics
Add to `<head>` section:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Performance Monitoring
Consider integrating:
- Google PageSpeed Insights
- WebPageTest
- Real User Monitoring (RUM)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and structure
- Test on multiple browsers and devices
- Ensure accessibility compliance
- Update documentation for new features
- Optimize for performance

## 📝 License

This project is part of the Desinformation and Geomedia Study project at the Institute for Geoinformatics. See the main repository for license information.

## 🆘 Support

- **GitHub Issues**: Report bugs and request features
- **Email**: Contact the development team
- **Documentation**: Check the main GeoCam repository

## 📚 Additional Resources

- [GeoCam Mobile App Repository](https://github.com/whlan02/Desinformation_and_Geomedia_Green/tree/main/geoCamApp)
- [Technical Documentation](https://github.com/whlan02/Desinformation_and_Geomedia_Green)
- [Institute for Geoinformatics](https://www.uni-muenster.de/Geoinformatics/)

---

Built with ❤️ for digital media authenticity and trust.