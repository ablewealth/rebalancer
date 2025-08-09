#!/bin/bash

# Tax Harvesting Calculator - Static Site Deployment Script
# This script deploys the HTML/CSS/JS site from the /src directory

echo "🚀 Tax Harvesting Calculator - Static Site Deployment"
echo "=================================================="

# Check if src directory exists
if [ ! -d "src" ]; then
    echo "❌ Error: src directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="dist"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy all files from src to deployment directory
echo "📋 Copying files from src/ to $DEPLOY_DIR/"
cp -r src/* $DEPLOY_DIR/

# Verify essential files exist
ESSENTIAL_FILES=("index.html" "js/tax-harvesting-algorithm.js" "js/module-loader.js" "AWM-Logo.png")
echo "✅ Verifying essential files..."

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$DEPLOY_DIR/$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ❌ Missing: $file"
        exit 1
    fi
done

# Create a simple server script for local testing
cat > $DEPLOY_DIR/start-server.py << 'EOF'
#!/usr/bin/env python3
"""
Simple HTTP server for testing the Tax Harvesting Calculator locally.
Run this script from the deployment directory.
"""
import http.server
import socketserver
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

if __name__ == "__main__":
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🌐 Tax Harvesting Calculator running at:")
            print(f"   Local:   http://localhost:{PORT}")
            print(f"   Network: http://$(hostname -I | awk '{print $1}'):{PORT}")
            print("   Press Ctrl+C to stop")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Error: Port {PORT} is already in use")
            print("Try a different port or stop the existing server")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
EOF

chmod +x $DEPLOY_DIR/start-server.py

# Create Netlify-specific files
echo "🌐 Creating Netlify deployment files..."

# Create _redirects for SPA behavior (optional)
cat > $DEPLOY_DIR/_redirects << 'EOF'
# Redirects for Tax Harvesting Calculator
/*    /index.html   200
EOF

# Create netlify.toml for build settings
cat > $DEPLOY_DIR/netlify.toml << 'EOF'
[build]
  publish = "."
  
[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
EOF

# Create Vercel configuration
echo "⚡ Creating Vercel deployment files..."
cat > $DEPLOY_DIR/vercel.json << 'EOF'
{
  "version": 2,
  "name": "tax-harvesting-calculator",
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
EOF

# Create GitHub Pages workflow
echo "🐙 Creating GitHub Actions workflow..."
mkdir -p .github/workflows

cat > .github/workflows/deploy-pages.yml << 'EOF'
name: Deploy Tax Harvesting Calculator to GitHub Pages

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './src'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF

# Create README for deployment
cat > $DEPLOY_DIR/README.md << 'EOF'
# Tax Harvesting Calculator - Deployed Site

This directory contains the production-ready files for the Tax Harvesting Calculator.

## Local Testing

To test the site locally:

```bash
# Using Python (recommended)
python3 start-server.py

# Or using Node.js
npx http-server -p 8080

# Or using PHP
php -S localhost:8080
```

Then open http://localhost:8080 in your browser.

## Deployment Options

### 1. Netlify (Recommended)
- Drag and drop this entire directory to netlify.com/drop
- Or connect your GitHub repository for automatic deployments

### 2. Vercel
- Install Vercel CLI: `npm i -g vercel`
- Run: `vercel --prod`

### 3. GitHub Pages
- Push the `.github/workflows/deploy-pages.yml` file to your repository
- Enable GitHub Pages in repository settings

### 4. AWS S3 + CloudFront
- Upload files to S3 bucket
- Configure CloudFront distribution
- Set index.html as default root object

### 5. Firebase Hosting
- Install Firebase CLI: `npm i -g firebase-tools`
- Run: `firebase init hosting`
- Deploy: `firebase deploy`

## Files Included

- `index.html` - Main tax harvesting calculator
- `buy-orders.html` - Buy orders page
- `model-portfolios.html` - Model portfolios page
- `price-manager.html` - Price management page
- `report.html` - Reports page
- `js/` - JavaScript modules and algorithms
- `AWM-Logo.png` - Logo file
- Configuration files for various hosting platforms

## Security Headers

The deployment includes security headers for:
- XSS Protection
- Content Type Options
- Frame Options
- Referrer Policy

## Performance

- Static files are cached for 1 year
- Gzip compression enabled where supported
- Optimized for fast loading
EOF

# Calculate deployment size
DEPLOY_SIZE=$(du -sh $DEPLOY_DIR | cut -f1)

echo ""
echo "✅ Deployment completed successfully!"
echo "📊 Deployment Statistics:"
echo "   Directory: $DEPLOY_DIR"
echo "   Size: $DEPLOY_SIZE"
echo "   Files: $(find $DEPLOY_DIR -type f | wc -l | tr -d ' ')"
echo ""
echo "🚀 Deployment Options:"
echo ""
echo "1. 🌐 Netlify (Easiest):"
echo "   • Go to https://netlify.com/drop"
echo "   • Drag and drop the '$DEPLOY_DIR' folder"
echo "   • Your site will be live in seconds!"
echo ""
echo "2. ⚡ Vercel:"
echo "   • Install: npm i -g vercel"
echo "   • cd $DEPLOY_DIR && vercel --prod"
echo ""
echo "3. 🐙 GitHub Pages:"
echo "   • Commit the .github/workflows/deploy-pages.yml file"
echo "   • Push to GitHub and enable Pages in repo settings"
echo ""
echo "4. 🧪 Local Testing:"
echo "   • cd $DEPLOY_DIR && python3 start-server.py"
echo "   • Open http://localhost:8080"
echo ""
echo "📝 Next Steps:"
echo "   1. Test locally first: cd $DEPLOY_DIR && python3 start-server.py"
echo "   2. Choose your preferred hosting option above"
echo "   3. Deploy and test the live site"
echo "   4. Update any hardcoded URLs if needed"
echo ""
echo "🎉 Your Tax Harvesting Calculator is ready for deployment!"
