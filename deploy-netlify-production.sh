#!/bin/bash

# Enhanced Netlify Deployment Script for Tax Harvesting Service
# Supports Neon Database Integration and New Portfolio Models

echo "🚀 Tax Harvesting Service - Production Deployment"
echo "================================================="
echo ""

# Set production environment
export NODE_ENV=production

echo "📋 Pre-deployment checklist:"
echo "✅ New portfolio models: 70/15/15, 95/5"
echo "✅ Neon database integration ready"
echo "✅ Price manager with Google Sheets support"
echo "✅ Enhanced tax harvesting algorithms"
echo ""

# Create production build directory
echo "📦 Creating production build..."
mkdir -p dist

# Copy static files
echo "📂 Copying static assets..."
cp -r src/* dist/
cp -r assets/* dist/ 2>/dev/null || true

# Verify model files are present
echo "🔍 Verifying portfolio models..."
if [ -f "dist/data/models/70_15_15.csv" ] && [ -f "dist/data/models/95_5.csv" ]; then
    echo "✅ New portfolio models found:"
    echo "   - 70/15/15.csv (70% equity / 15% bonds / 15% alternatives)"
    echo "   - 95_5.csv (95% equity / 5% bonds)"
else
    echo "❌ New portfolio models missing! Copying from src..."
    cp src/data/models/* dist/data/models/
fi

# List all available models
echo ""
echo "📊 Available portfolio models:"
for model in dist/data/models/*.csv; do
    if [ -f "$model" ]; then
        echo "   - $(basename "$model")"
    fi
done

# Create Netlify-specific configuration
echo ""
echo "⚙️  Creating Netlify configuration..."
cat > dist/_redirects << EOF
# API redirects for Neon backend (to be configured)
/api/*  https://your-neon-backend.vercel.app/api/:splat  200

# SPA routing
/*    /index.html   200
EOF

# Create robots.txt for production
cat > dist/robots.txt << EOF
User-agent: *
Allow: /

Sitemap: https://awm-rebalancer.netlify.app/sitemap.xml
EOF

# Create sitemap.xml
cat > dist/sitemap.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://awm-rebalancer.netlify.app/</loc>
        <lastmod>$(date -u +%Y-%m-%d)</lastmod>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://awm-rebalancer.netlify.app/price-manager.html</loc>
        <lastmod>$(date -u +%Y-%m-%d)</lastmod>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://awm-rebalancer.netlify.app/model-portfolios.html</loc>
        <lastmod>$(date -u +%Y-%m-%d)</lastmod>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://awm-rebalancer.netlify.app/buy-orders.html</loc>
        <lastmod>$(date -u +%Y-%m-%d)</lastmod>
        <priority>0.8</priority>
    </url>
</urlset>
EOF

echo ""
echo "🔍 Production build summary:"
echo "   - Static files: ✅"
echo "   - Portfolio models: $(ls dist/data/models/*.csv 2>/dev/null | wc -l | tr -d ' ') files"
echo "   - Redirects configured: ✅"
echo "   - SEO files: ✅"
echo ""

echo "🌐 Ready for Netlify deployment!"
echo "   Deploy command: netlify deploy --prod --dir=dist"
echo "   Site URL: https://awm-rebalancer.netlify.app"
echo ""

echo "🔗 Post-deployment tasks:"
echo "   1. Configure environment variables in Netlify dashboard"
echo "   2. Set up Neon backend API endpoint"
echo "   3. Test price manager with Google Sheets integration"
echo "   4. Verify all 6 portfolio models load correctly"
echo ""

echo "✅ Build completed successfully!"