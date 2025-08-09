#!/bin/bash

# Quick Netlify Deployment Script
# This script opens the Netlify drop page for easy deployment

echo "🚀 Quick Netlify Deployment"
echo "=========================="
echo ""
echo "📁 Your site is ready in the 'dist' directory"
echo "💡 Opening Netlify Drop page..."
echo ""
echo "Instructions:"
echo "1. Drag and drop the 'dist' folder onto the Netlify page"
echo "2. Your site will be live in seconds!"
echo "3. You'll get a random URL like: https://amazing-site-123.netlify.app"
echo "4. Optional: Claim the site and set a custom domain"
echo ""

# Open Netlify drop page
if command -v open &> /dev/null; then
    open "https://netlify.com/drop"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://netlify.com/drop"
else
    echo "🌐 Please visit: https://netlify.com/drop"
fi

echo "✨ Ready to deploy! Drag the 'dist' folder to deploy your site."
