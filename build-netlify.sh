#!/bin/bash

# Build script to maintain both Netlify distribution formats
# Supports legacy static dist and modern React frontend builds

echo "🏗️  Enhanced Tax Harvesting Service - Build Script"
echo "=================================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to copy files with proper formatting
copy_with_formatting() {
    local src="$1"
    local dest="$2"
    local description="$3"
    
    if [ -f "$src" ]; then
        cp "$src" "$dest"
        echo "✅ $description"
    else
        echo "⚠️  $description (file not found)"
    fi
}

echo "🎯 Build Target Options:"
echo "1. Build React frontend only"
echo "2. Update static distribution only"
echo "3. Build both (recommended)"
echo "4. Clean all builds"
echo ""

read -p "Choose build option (1-4): " build_choice

case $build_choice in
    4)
        echo "🧹 Cleaning all build directories..."
        rm -rf frontend/build
        rm -rf dist/*.html dist/*.js dist/*.css
        echo "✅ Clean completed"
        exit 0
        ;;
esac

# Build React Frontend
if [ "$build_choice" = "1" ] || [ "$build_choice" = "3" ]; then
    echo ""
    echo "🔧 Building React Frontend..."
    echo "============================="
    
    if [ -d "frontend" ]; then
        cd frontend
        
        # Check if package.json exists
        if [ -f "package.json" ]; then
            echo "📦 Installing dependencies..."
            npm install
            
            echo "🏗️  Building React application..."
            npm run build
            
            if [ -d "build" ]; then
                echo "✅ React build completed successfully"
                
                # Ensure proper Netlify files are in place
                cd ../
                copy_with_formatting "netlify.toml" "frontend/build/netlify.toml" "Copied netlify.toml to React build"
                
                # Create _redirects for SPA if not exists
                if [ ! -f "frontend/build/_redirects" ]; then
                    echo "/*    /index.html   200" > frontend/build/_redirects
                    echo "✅ Created _redirects for SPA routing"
                fi
                
            else
                echo "❌ React build failed"
                exit 1
            fi
        else
            echo "❌ No package.json found in frontend directory"
            exit 1
        fi
        
        cd ..
    else
        echo "❌ Frontend directory not found"
        exit 1
    fi
fi

# Update Static Distribution
if [ "$build_choice" = "2" ] || [ "$build_choice" = "3" ]; then
    echo ""
    echo "📁 Updating Static Distribution..."
    echo "================================="
    
    # Ensure dist directory exists
    mkdir -p dist
    
    # Copy static files from src to dist (maintaining legacy format)
    if [ -d "src" ]; then
        echo "📋 Copying static files from src/..."
        
        # Copy HTML files
        find src -name "*.html" -exec cp {} dist/ \;
        
        # Copy JavaScript files
        if [ -d "src/js" ]; then
            mkdir -p dist/js
            cp -r src/js/* dist/js/
        fi
        
        # Copy data files
        if [ -d "src/data" ]; then
            mkdir -p dist/data
            cp -r src/data/* dist/data/
        fi
        
        # Copy assets
        if [ -d "src" ]; then
            find src -name "*.png" -o -name "*.jpg" -o -name "*.svg" | while read file; do
                cp "$file" dist/
            done
        fi
        
        echo "✅ Static files copied to dist/"
    fi
    
    # Ensure proper Netlify configuration in dist
    copy_with_formatting "dist/netlify.toml" "dist/netlify.toml" "Netlify config already in dist"
    copy_with_formatting "dist/_redirects" "dist/_redirects" "Redirects already in dist"
    
    # Create netlify.toml in dist if it doesn't exist
    if [ ! -f "dist/netlify.toml" ]; then
        cat > dist/netlify.toml << 'EOF'
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

[[headers]]
  for = "*.svg"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
EOF
        echo "✅ Created netlify.toml in dist/"
    fi
    
    # Create _redirects in dist if it doesn't exist
    if [ ! -f "dist/_redirects" ]; then
        echo "/*    /index.html   200" > dist/_redirects
        echo "✅ Created _redirects in dist/"
    fi
    
    echo "✅ Static distribution updated"
fi

echo ""
echo "📊 Build Summary:"
echo "================"

if [ -d "frontend/build" ]; then
    react_files=$(find frontend/build -type f | wc -l)
    echo "📱 React Build: $react_files files in frontend/build/"
fi

if [ -d "dist" ]; then
    static_files=$(find dist -type f | wc -l)
    echo "🌐 Static Distribution: $static_files files in dist/"
fi

echo ""
echo "🚀 Deployment Options:"
echo "====================="
echo "• Netlify (React): Use 'frontend/build/' directory"
echo "• Netlify (Static): Use 'dist/' directory"
echo "• Manual: Run './deploy-netlify.sh' for guided deployment"
echo ""

if [ "$build_choice" = "3" ]; then
    echo "✨ Both distribution formats are ready for deployment!"
fi
