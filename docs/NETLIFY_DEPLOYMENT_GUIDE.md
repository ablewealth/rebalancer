# Netlify Deployment Guide - Enhanced Tax Harvesting Service

## Overview

This guide covers deploying the Enhanced Tax Harvesting Service v2.0.0 to Netlify, supporting both the modern React frontend and legacy static distribution formats.

## 🏗️ Build Options

The project supports two deployment formats:

### 1. React Frontend (Recommended)
- **Path**: `frontend/build/`
- **Features**: Modern SPA with Neon database integration
- **Best for**: Production deployments with full feature set

### 2. Static Distribution (Legacy)
- **Path**: `dist/`
- **Features**: Static HTML/JS tax harvesting calculator
- **Best for**: Simple deployments without backend requirements

## 🚀 Quick Deployment

### Option 1: Automatic Build (Recommended)

1. **Connect Repository**:
   ```bash
   # Connect your GitHub repository to Netlify
   # Visit: https://app.netlify.com/start
   ```

2. **Configure Build Settings**:
   ```yaml
   # Netlify will use settings from netlify.toml
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```

3. **Set Environment Variables** (in Netlify dashboard):
   ```bash
   REACT_APP_API_URL=https://your-neon-backend.com
   REACT_APP_NEON_PROJECT_ID=your-project-id
   REACT_APP_ENABLE_NEON_FEATURES=true
   NODE_VERSION=18
   ```

### Option 2: Manual Deployment

1. **Build the Application**:
   ```bash
   # Build React frontend
   npm run build:react
   
   # Or build both formats
   npm run build:netlify
   ```

2. **Deploy via Drag & Drop**:
   ```bash
   # Run deployment script
   npm run deploy:netlify
   
   # Follow prompts to choose format and deploy
   ```

## ⚙️ Configuration Details

### Netlify.toml Configuration

The root `netlify.toml` supports multiple deployment contexts:

```toml
# Main React build
[build]
  base = "frontend/"
  publish = "frontend/build/"
  command = "npm run build"

# Alternative static build
[context.static]
  base = "."
  publish = "dist/"
  command = "echo 'Using static distribution'"
```

### Environment Variables

#### Required Variables
```bash
# Backend Integration
REACT_APP_API_URL=https://your-backend.com
REACT_APP_NEON_PROJECT_ID=your-neon-project-id

# Feature Flags
REACT_APP_ENABLE_NEON_FEATURES=true
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_WASH_SALE_DETECTION=true
```

#### Optional Variables
```bash
# Development/Staging
REACT_APP_DEBUG_MODE=false
REACT_APP_ENVIRONMENT=production

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
HOTJAR_ID=your-hotjar-id

# Performance
BUILD_OPTIMIZATION=true
BUNDLE_ANALYZER=false
```

### Security Headers

Configured automatically via `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

## 🔄 CI/CD Integration

### GitHub Actions + Netlify

The project includes automated deployment workflows:

```yaml
# Triggered on push to main branch
- name: Deploy to Netlify
  uses: netlify/actions/cli@master
  with:
    args: deploy --prod --dir=frontend/build
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Branch Deployments

Configure branch deployments in Netlify:

- **Production**: `main` branch → `your-site.netlify.app`
- **Staging**: `develop` branch → `develop--your-site.netlify.app`
- **Preview**: Pull requests → `deploy-preview-123--your-site.netlify.app`

## 🎯 Deployment Contexts

### Production Deployment
```bash
# Build for production
NODE_ENV=production npm run build:react

# Deploy
netlify deploy --prod --dir=frontend/build
```

### Staging Deployment
```bash
# Build with staging configuration
REACT_APP_ENVIRONMENT=staging npm run build:react

# Deploy to staging
netlify deploy --dir=frontend/build
```

### Static Deployment (Legacy)
```bash
# Use static distribution
npm run build:static

# Deploy static files
netlify deploy --prod --dir=dist
```

## 🔧 Build Scripts Reference

| Script | Description | Usage |
|--------|-------------|-------|
| `npm run build` | Interactive build script | Development |
| `npm run build:react` | Build React frontend only | CI/CD |
| `npm run build:static` | Update static distribution | Legacy support |
| `npm run build:netlify` | Build both formats | Manual deployment |
| `npm run deploy:netlify` | Interactive deployment | Manual deployment |
| `npm run clean` | Clean all build directories | Development |

## 📊 Monitoring & Analytics

### Build Performance
Monitor build times and bundle size:

```javascript
// In frontend/package.json
{
  "scripts": {
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  }
}
```

### Runtime Monitoring
Configure monitoring in Netlify dashboard:

- **Analytics**: Built-in Netlify Analytics
- **Performance**: Core Web Vitals tracking
- **Error Tracking**: Integration with Sentry or similar
- **Uptime**: Monitoring and alerts

## 🔒 Security Considerations

### Environment Variables
- Never commit sensitive data to repository
- Use Netlify environment variables for secrets
- Separate staging and production configurations

### Content Security Policy
```bash
# Configure CSP in netlify.toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### SSL/TLS
- Automatic HTTPS with Netlify
- Custom domain SSL certificates
- HSTS headers configured

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check Node.js version
NODE_VERSION=18

# Clear cache and rebuild
npm run clean
npm install
npm run build:react
```

#### Environment Variables Not Working
```bash
# Ensure REACT_APP_ prefix for frontend variables
REACT_APP_API_URL=https://api.example.com  # ✅ Correct
API_URL=https://api.example.com             # ❌ Won't work
```

#### Static Assets Not Loading
```bash
# Check public URL configuration
"homepage": "https://your-site.netlify.app"
```

### Debug Mode
Enable debug mode for detailed logging:

```bash
# Set in Netlify environment
REACT_APP_DEBUG_MODE=true
DEBUG=*
```

## 📈 Performance Optimization

### Build Optimization
```bash
# Enable optimizations in netlify.toml
[build.environment]
  NODE_ENV = "production"
  BUILD_OPTIMIZATION = "true"
  
# Use production builds
npm run build:react -- --production
```

### Caching Strategy
```toml
# Cache static assets
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Bundle Splitting
```javascript
// Automatic code splitting in React build
import { lazy, Suspense } from 'react';

const Portfolio = lazy(() => import('./components/Portfolio'));
```

## 🎉 Post-Deployment Checklist

After successful deployment:

- [ ] Verify site loads at deployed URL
- [ ] Test all major functionality
- [ ] Check API connectivity (if using Neon backend)
- [ ] Verify environment variables are working
- [ ] Test responsive design on mobile
- [ ] Run performance audit (Lighthouse)
- [ ] Set up monitoring and alerts
- [ ] Configure custom domain (if applicable)
- [ ] Test error pages and redirects
- [ ] Verify security headers

## 📞 Support

### Resources
- **Netlify Documentation**: [docs.netlify.com](https://docs.netlify.com)
- **React Build Issues**: [create-react-app.dev](https://create-react-app.dev)
- **Neon Integration**: See `docs/NEON_DEPLOYMENT_GUIDE.md`

### Community
- **Netlify Community**: [community.netlify.com](https://community.netlify.com)
- **Project Issues**: GitHub repository issues

---

**Enhanced Tax Harvesting Service v2.0.0**  
*Production-ready Netlify deployment with modern React frontend and legacy static support*
