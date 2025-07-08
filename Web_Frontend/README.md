# GeoCam Web Frontend

A Vue.js-based web application for managing GeoCam devices and viewing verification results.

## 🚀 Features

- **Device Management**: View and manage connected GeoCam devices
- **Real-time Dashboard**: Monitor backend status and device statistics  
- **Image Verification**: Upload and verify GeoCam images for authenticity
- **Interactive Flow**: Step-through demonstration of GeoCam workflow
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **GeoCam Backend** running on port 3000

## ⚡ Quick Start

1. **Install Dependencies**
   ```bash
   cd Web_Frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Application**
   Open your browser and navigate to: `http://localhost:5173`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Configuration

### Backend Connection

The application connects to the GeoCam backend at `http://localhost:3000` by default. To change this:

1. Edit `src/services/backendConfig.js`
2. Update the `API_BASE_URL` constant

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_TITLE=GeoCam Device Manager
```

## 📁 Project Structure

```
Web_Frontend/
├── public/                 # Static assets
│   ├── favicon.ico
│   ├── geocam-logo.png
│   └── background.jpg
├── src/
│   ├── components/         # Vue components
│   │   ├── layout/        # Layout components
│   │   └── public/        # Public-facing components
│   ├── views/             # Page components
│   │   ├── admin/         # Admin pages
│   │   └── public/        # Public pages
│   ├── router/            # Vue Router configuration
│   ├── services/          # API services
│   ├── stores/            # Pinia stores
│   └── assets/            # CSS and other assets
├── package.json
└── vite.config.js         # Vite configuration
```

## 🌐 Backend Integration

This frontend integrates with the GeoCam backend service which should be running on port 3000. The backend provides:

- Device management APIs
- Image verification services
- Steganography processing
- Real-time status updates

### Starting the Backend

1. Navigate to `Web_Backend` directory
2. Follow the backend README instructions
3. Ensure it's running on `http://localhost:3000`

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Docker Deployment

```bash
# Build the frontend
npm run build

# Serve with a static server (nginx, apache, etc.)
# or use the preview command
npm run preview
```

## 🔍 Features in Detail

### Device Dashboard
- View all registered GeoCam devices
- Monitor device status and health
- Real-time backend connectivity status

### Image Verification
- Upload GeoCam images for verification
- Check cryptographic signatures
- Validate GPS coordinates and timestamps
- Detect potential spoofing attempts

### Interactive Flow
- Step-by-step demonstration of GeoCam workflow
- Visual guide through capture → sign → verify process

## 🛡️ Security

- All API communications use HTTPS in production
- Image uploads are processed securely
- No sensitive data is stored in browser local storage
- CORS properly configured for cross-origin requests

## 🐛 Troubleshooting

### Common Issues

1. **Cannot connect to backend**
   - Ensure backend is running on port 3000
   - Check CORS configuration
   - Verify API_BASE_URL in configuration

2. **Build fails**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version: `node --version`

3. **Development server won't start**
   - Check if port 5173 is available
   - Run with different port: `npm run dev -- --port 5174`

## 📞 Support

For issues and questions:
- Check the main repository: [GeoCam Project](https://github.com/whlan02/Desinformation_and_Geomedia_Green)
- Open an issue on GitHub
- Contact: support@geocam.app

## 🎯 Development Notes

### Technology Stack
- **Vue.js 3** - Progressive JavaScript framework
- **Vite** - Fast build tool and dev server
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Axios** - HTTP client for API calls

### Code Style
- Use Vue 3 Composition API
- Follow Vue.js style guide
- ESLint configuration for consistent code
- Responsive design with CSS Grid and Flexbox

---

Built with ❤️ for digital media authenticity and trust.
