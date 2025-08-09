# 🚀 Tax Harvesting Calculator - Deployment Guide

Your Tax Harvesting Calculator is ready for deployment! The static site has been prepared in the `dist/` directory.

## ✅ Pre-Deployment Checklist

- [x] Static site prepared in `dist/` directory (764K, 25 files)
- [x] Local testing completed ✓
- [x] All essential files verified ✓
- [x] Security headers configured ✓
- [x] Performance optimizations applied ✓

## 🚀 Quick Deployment Options

### Option 1: Netlify (Recommended - Easiest) 🌐

**Deploy in under 2 minutes:**

1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag and drop your entire `dist/` folder onto the page
3. ✨ Your site is live instantly!

**Features you get:**
- Free SSL certificate
- Global CDN
- Automatic HTTPS
- Form handling (if needed later)
- Custom domain support

**Pro tip:** For automatic deployments, connect your GitHub repository instead.

### Option 2: Vercel (Great for developers) ⚡

**Deploy via CLI:**
```bash
# Install Vercel CLI (one-time setup)
npm install -g vercel

# Deploy your site
cd dist
vercel --prod
```

**Deploy via web interface:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set build command: `./deploy-static.sh` (optional)
4. Set output directory: `dist`

**Features:**
- Automatic deployments from GitHub
- Edge functions support
- Analytics
- Preview deployments

### Option 3: GitHub Pages (Free with GitHub) 🐙

**Setup (one-time):**
```bash
# Commit the GitHub Actions workflow
git add .github/workflows/deploy-pages.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

**Enable Pages:**
1. Go to your GitHub repository
2. Settings → Pages
3. Source: "GitHub Actions"
4. Your site will be available at: `https://yourusername.github.io/rebalancer`

### Option 4: Firebase Hosting (Google) 🔥

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
firebase deploy
```

## 🧪 Local Testing

Before deploying, you can test locally:

```bash
cd dist
python3 start-server.py
# Open http://localhost:8080
```

Or use any other local server:
```bash
# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

## 🔧 Configuration Files Included

Your deployment includes optimized configuration for:

- **Netlify**: `_redirects`, `netlify.toml`
- **Vercel**: `vercel.json`
- **GitHub Pages**: `.github/workflows/deploy-pages.yml`
- **Security**: HTTP security headers
- **Performance**: Caching rules for static assets

## 🌍 Custom Domain Setup

### Netlify
1. Deploy your site
2. Go to Site Settings → Domain Management
3. Add your custom domain
4. Update your domain's DNS records

### Vercel
1. Deploy your site
2. Go to Project Settings → Domains
3. Add your domain and configure DNS

### GitHub Pages
1. In repository settings, add your custom domain
2. Create a `CNAME` file with your domain
3. Configure DNS with your domain provider

## 🔒 Security Features

Your deployment includes:
- **XSS Protection**: Prevents cross-site scripting
- **Content Security Policy**: Controls resource loading
- **HTTPS**: Automatic SSL/TLS encryption
- **Frame Protection**: Prevents clickjacking
- **MIME Type Sniffing Protection**: Security headers

## 📊 Performance Optimizations

- **Static File Caching**: 1-year cache for CSS/JS/images
- **Compression**: Automatic gzip/brotli compression
- **CDN**: Global content delivery network
- **Minification**: Optimized file sizes

## 🚨 Troubleshooting

### Common Issues:

**Files not loading:**
- Check that all relative paths are correct
- Verify `index.html` is in the root of your deployment

**JavaScript errors:**
- Check browser console for error messages
- Ensure all JS files are present in the `js/` directory

**Styling issues:**
- Verify Tailwind CSS CDN is loading
- Check for any custom CSS conflicts

### Debug Commands:

```bash
# Check deployment directory
ls -la dist/

# Verify essential files
ls dist/js/

# Test locally
cd dist && python3 start-server.py
```

## 🎯 Recommended Deployment Path

For the fastest deployment:

1. **Test locally first**: `cd dist && python3 start-server.py`
2. **Deploy to Netlify**: Drag & drop the `dist/` folder to [netlify.com/drop](https://netlify.com/drop)
3. **Test the live site**: Verify all functionality works
4. **Optional**: Set up a custom domain

## 📝 Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads correctly
- [ ] All pages navigate properly (index, buy-orders, model-portfolios, etc.)
- [ ] File uploads work
- [ ] Calculations function correctly
- [ ] Charts and visualizations display
- [ ] Mobile responsiveness
- [ ] HTTPS is enabled
- [ ] Performance is acceptable

## 🎉 You're Ready!

Your Tax Harvesting Calculator is production-ready and optimized for deployment. Choose your preferred hosting option above and you'll have your site live in minutes!

**Need help?** Check the troubleshooting section or test locally first with the included server script.
