# Railway Deployment Guide for GeoCam Steganography Service

This guide will help you deploy the GeoCam steganography service to Railway for better performance than Render's free tier.

## Prerequisites

1. [Railway Account](https://railway.app/) (free tier available)
2. GitHub repository with your code
3. Railway CLI (optional but recommended)

## Method 1: Deploy from GitHub (Recommended)

### Step 1: Push Your Code to GitHub

Make sure this branch (`railway-steganography-deployment`) is pushed to your GitHub repository:

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin railway-steganography-deployment
```

### Step 2: Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository and the `railway-steganography-deployment` branch
5. Railway will automatically detect it's a Node.js project

### Step 3: Configure Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following environment variables:

```
PORT=3001
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=2048
```

3. **Important**: Update CORS origins to include your Railway domain:
   - After deployment, Railway will give you a domain like `https://your-app-name.up.railway.app`
   - Add this to your CORS configuration

### Step 4: Configure Build Settings

Railway should automatically detect the build settings, but if needed:

1. Go to **Settings** → **Deploy**
2. Set **Build Command**: `npm install` (automatic)
3. Set **Start Command**: `npm start`

### Step 5: Deploy

1. Click **Deploy** in Railway
2. Railway will build and deploy your application
3. You'll get a public URL like `https://your-app-name.up.railway.app`

## Method 2: Deploy with Railway CLI

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Initialize

```bash
railway login
cd Web_Backend
railway init
```

### Step 3: Deploy

```bash
railway up
```

### Step 4: Generate Domain

```bash
railway domain
```

## Method 3: Deploy with Docker

Railway supports Docker deployment using the provided `Dockerfile.railway`:

1. In Railway project settings, set **Dockerfile Path**: `Web_Backend/Dockerfile.railway`
2. Railway will use Docker to build and deploy

## Configuration Updates Needed

### Update Your Main API Service

Update your main API service (the one running on Render) to use the new Railway steganography service URL:

1. Find where `STEGANOGRAPHY_SERVICE_URL` is configured
2. Update it to your new Railway URL: `https://your-app-name.up.railway.app`

### Update Frontend CORS

If you have a frontend, update its backend configuration to include the new Railway URL.

### Update CORS in Steganography Service

The steganography service needs to allow requests from your main API. Update the CORS configuration in `steganography-service.js` to include your Render API URL.

## Performance Benefits on Railway

Railway's free tier offers:
- **Better CPU performance** than Render free tier
- **More memory** (up to 8GB vs Render's 512MB)
- **Faster cold starts**
- **Better for CPU-intensive tasks** like image processing and steganography

## Monitoring and Logs

1. **View Logs**: Go to your Railway project → **Deployments** → Click on latest deployment
2. **Metrics**: Railway provides CPU, memory, and network usage metrics
3. **Health Checks**: The service includes a `/health` endpoint for monitoring

## Scaling

Railway offers:
- **Automatic scaling** based on traffic
- **Vertical scaling** (more CPU/memory)
- **Horizontal scaling** (multiple instances)

## Troubleshooting

### Common Issues

1. **Build Failures**: Check that all dependencies are in `package.json`
2. **Memory Issues**: Increase `NODE_OPTIONS=--max-old-space-size=4096`
3. **CORS Errors**: Make sure all origins are properly configured
4. **Port Issues**: Railway automatically sets PORT, don't override it

### Debug Commands

```bash
# View logs
railway logs

# Check status
railway status

# Open shell in deployment
railway shell
```

## Cost Optimization

Railway's pricing is usage-based:
- **Free tier**: $5 credit per month
- **Pay-as-you-go**: Only pay for what you use
- **Better value** for CPU-intensive tasks compared to other platforms

## Next Steps

1. Deploy the service following this guide
2. Update your main API to use the new Railway URL
3. Test the integration
4. Monitor performance improvements
5. Consider migrating other services if needed

## Support

- [Railway Documentation](https://docs.railway.com/)
- [Railway Discord](https://discord.gg/railway)
- [Railway GitHub](https://github.com/railwayapp/railway) 