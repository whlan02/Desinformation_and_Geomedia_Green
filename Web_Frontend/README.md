# GeoCam Device Manager - Web Frontend

A simple Vue.js web interface for managing GeoCam registered devices.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:5173
   ```

## Build for Production

```bash
npm run build
```

## Features

- View registered devices from GeoCam mobile app
- Backend connection status monitoring
- Device filtering by operating system
- Responsive design for desktop and mobile

## Backend Connection

The app connects to the same backend as the GeoCam mobile app:
- Production: `https://geocam-api.onrender.com`
- Development: Uses Vite proxy to avoid CORS issues

## Tech Stack

- Vue 3
- Pinia (state management)
- Vue Router
- Axios (HTTP client)
- Vite (build tool)
