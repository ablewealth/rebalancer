#!/bin/bash

# Enhanced Netlify Deployment Script
# Supports both React build and static distribution formats

echo "🚀 Enhanced Tax Harvesting Service - Netlify Deployment"
echo "======================================================="
echo ""

# Function to check if directory exists and has content
check_directory() {
    if [ -d "$1" ] && [ "$(ls -A $1)" ]; then
        return 0
    else
        return 1
    fi
}

# Deployment options
echo "📦 Available deployment options:"
echo "1. React Frontend (frontend/build/) - Modern SPA with Neon integration"
echo "2. Static Distribution (dist/) - Legacy static site format"
echo "3. Build React app first, then deploy"
echo ""

read -p "Choose deployment option (1-3): " choice

case $choice in
    1)
        echo "� Checking React build directory..."
        if check_directory "frontend/build"; then
            echo "✅ React build found in frontend/build/"
            DEPLOY_DIR="frontend/build"
            DEPLOY_TYPE="React Frontend with Neon Integration"
        else
            echo "❌ No React build found. Run 'cd frontend && npm run build' first."
            exit 1
        fi
        ;;
    2)
        echo "🔍 Checking static distribution..."
        if check_directory "dist"; then
            echo "✅ Static distribution found in dist/"
            DEPLOY_DIR="dist"
            DEPLOY_TYPE="Static Distribution (Legacy)"
        else
            echo "❌ No static distribution found in dist/ directory."
            exit 1
        fi
        ;;
    3)
        echo "🏗️  Building React application..."
        cd frontend
        if [ -f "package.json" ]; then
            npm install
            npm run build
            cd ..
            if check_directory "frontend/build"; then
                echo "✅ React build completed successfully"
                DEPLOY_DIR="frontend/build"
                DEPLOY_TYPE="Fresh React Build with Neon Integration"
            else
                echo "❌ Build failed"
                exit 1
            fi
        else
            echo "❌ No package.json found in frontend directory"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid option. Please choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "📁 Deployment Summary:"
echo "   Type: $DEPLOY_TYPE"
echo "   Directory: $DEPLOY_DIR"
echo "   Files: $(find $DEPLOY_DIR -type f | wc -l) files"
echo ""

# Check for required Netlify files
echo "🔧 Checking Netlify configuration..."

if [ -f "netlify.toml" ]; then
    echo "✅ Root netlify.toml found"
else
    echo "⚠️  No root netlify.toml found"
fi

if [ -f "$DEPLOY_DIR/netlify.toml" ]; then
    echo "✅ Directory-specific netlify.toml found"
fi

if [ -f "$DEPLOY_DIR/_redirects" ]; then
    echo "✅ _redirects file found"
elif [ -f "dist/_redirects" ]; then
    echo "� Copying _redirects from dist/"
    cp "dist/_redirects" "$DEPLOY_DIR/"
fi

echo ""
echo "🌐 Opening Netlify deployment page..."
echo ""
echo "Deployment Instructions:"
echo "========================"
echo "1. Drag and drop the '$DEPLOY_DIR' folder onto the Netlify page"
echo "2. Your site will be live in seconds!"
echo "3. For Neon integration, set these environment variables in Netlify:"
echo "   - REACT_APP_API_URL=https://your-neon-backend-url.com"
echo "   - REACT_APP_NEON_PROJECT_ID=your-neon-project-id"
echo "   - REACT_APP_ENABLE_NEON_FEATURES=true"
echo "4. Optional: Set up custom domain and SSL"
echo ""

# Open Netlify drop page
if command -v open &> /dev/null; then
    open "https://netlify.com/drop"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://netlify.com/drop"
else
    echo "🌐 Please visit: https://netlify.com/drop"
fi

echo "✨ Ready to deploy! Drag the '$DEPLOY_DIR' folder to deploy your site."
echo ""
echo "🔗 Post-deployment checklist:"
echo "   □ Verify site loads correctly"
echo "   □ Test API connectivity (if using Neon backend)"
echo "   □ Configure custom domain (optional)"
echo "   □ Set up monitoring and analytics"
