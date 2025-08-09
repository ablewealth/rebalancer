# GitHub Pages 404 Troubleshooting Guide

## Issue
The site at https://ablewealth.github.io/rebalancer/ is returning a 404 error despite successful workflow deployments.

## Completed Steps
1. ✅ Removed conflicting workflow file (`.github/workflows/deploy.yml`)
2. ✅ Kept the correct workflow file (`.github/workflows/deploy-pages.yml`) that deploys from `src/` directory
3. ✅ Verified workflow runs are completing successfully
4. ✅ Added `.nojekyll` files to disable Jekyll processing
5. ✅ Confirmed `src/index.html` file exists and has content

## Potential Issues & Solutions

### 1. GitHub Pages Source Configuration
**Problem**: GitHub Pages might be configured to use a different source or branch.

**Solution**: 
1. Go to https://github.com/ablewealth/rebalancer/settings/pages
2. Ensure "Source" is set to "GitHub Actions" (not "Deploy from a branch")
3. If it's set to "Deploy from a branch", change it to "GitHub Actions"

### 2. Repository Visibility
**Problem**: Private repositories may have limitations on GitHub Pages.

**Solution**: Verify the repository is public or has GitHub Pages enabled for private repos.

### 3. Workflow Environment Setup
**Problem**: The workflow might need explicit environment configuration.

**Solution**: The workflow already includes proper environment setup, but verify permissions are correct.

### 4. Cache Issues
**Problem**: GitHub Pages CDN might be serving cached 404 responses.

**Solution**: 
- Wait 5-10 minutes for cache to clear
- Try accessing with cache-busting: https://ablewealth.github.io/rebalancer/?v=123
- Use browser incognito mode

### 5. Alternative Deployment Strategy
**Problem**: Current workflow might have subtle issues.

**Solution**: Create a simpler workflow that explicitly lists files to deploy.

## Next Steps
1. Check GitHub Pages settings in repository
2. Verify repository is public
3. Wait 10-15 minutes for full CDN propagation
4. If still failing, try alternative workflow approach

## Test Commands
```bash
# Check site status
curl -I https://ablewealth.github.io/rebalancer/

# Check specific file
curl -I https://ablewealth.github.io/rebalancer/index.html

# Check workflow status
curl -s "https://api.github.com/repos/ablewealth/rebalancer/actions/runs?per_page=1" | jq '.workflow_runs[0] | {name, status, conclusion}'
```

## Working Files Confirmed
- `/src/index.html` - ✅ Exists (214KB)
- `/src/buy-orders.html` - ✅ Exists  
- `/src/model-portfolios.html` - ✅ Exists
- `/src/price-manager.html` - ✅ Exists
- `/src/report.html` - ✅ Exists
- `/.nojekyll` - ✅ Exists
- `/src/.nojekyll` - ✅ Exists
