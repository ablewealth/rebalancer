# 🚀 GitHub Pages Deployment - Complete Guide

## ✅ Setup Complete!

Your Tax Harvesting Calculator has been successfully prepared for GitHub Pages deployment!

### 📋 What's Been Done:

1. ✅ **Font improvements committed** - All pages now have readable font sizes
2. ✅ **GitHub Actions workflow added** - Automatic deployment on push
3. ✅ **Code pushed to GitHub** - Repository: `ablewealth/rebalancer`
4. ✅ **Deployment files ready** - Static site prepared in workflow

## 🔧 Enable GitHub Pages (Required Steps)

### Step 1: Go to Repository Settings
1. Open your repository: **https://github.com/ablewealth/rebalancer**
2. Click the **"Settings"** tab (top right of repository page)
3. Scroll down to **"Pages"** in the left sidebar

### Step 2: Configure Pages Source
1. Under **"Source"**, select **"GitHub Actions"** (not "Deploy from a branch")
2. This will use the workflow I've created for you

### Step 3: Trigger Deployment
The deployment will happen automatically because I've already pushed the workflow. You should see:
1. Go to the **"Actions"** tab in your repository
2. Look for the workflow: **"Deploy Tax Harvesting Calculator to GitHub Pages"**
3. If it's not running, you can trigger it manually by clicking **"Run workflow"**

## 🌐 Your Site URL

Once enabled, your site will be available at:
**https://ablewealth.github.io/rebalancer**

## 📁 Deployment Workflow Details

The GitHub Actions workflow I created will:
1. **Trigger** on every push to the `main` branch
2. **Build** the site from your `src/` directory
3. **Deploy** to GitHub Pages automatically
4. **Update** your live site within 1-2 minutes

### Workflow File Location:
`.github/workflows/deploy-pages.yml`

## 🔍 Check Deployment Status

### Option 1: Actions Tab
1. Go to **https://github.com/ablewealth/rebalancer/actions**
2. Look for the latest "Deploy Tax Harvesting Calculator to GitHub Pages" workflow
3. Green checkmark = successful deployment
4. Red X = deployment failed (check logs)

### Option 2: Pages Settings
1. Go to **Settings → Pages**
2. You'll see the deployment status and site URL

## 🐛 Troubleshooting

### If Pages isn't working:
1. **Check Settings**: Ensure "GitHub Actions" is selected as source
2. **Check Actions**: Look for failed workflows in the Actions tab
3. **Check Permissions**: Repository must be public or you need GitHub Pro

### If deployment fails:
1. Check the workflow logs in the Actions tab
2. Ensure the `src/` directory contains all necessary files
3. Verify the workflow file is in `.github/workflows/deploy-pages.yml`

## 🔄 Future Updates

Every time you push changes to the `main` branch:
1. The workflow automatically runs
2. Your site updates within 1-2 minutes
3. No manual deployment needed!

## 📱 Testing Your Live Site

Once deployed, test all pages:
- ✅ Main page: https://ablewealth.github.io/rebalancer/
- ✅ Buy Orders: https://ablewealth.github.io/rebalancer/buy-orders.html
- ✅ Model Portfolios: https://ablewealth.github.io/rebalancer/model-portfolios.html
- ✅ Price Manager: https://ablewealth.github.io/rebalancer/price-manager.html
- ✅ Reports: https://ablewealth.github.io/rebalancer/report.html

## 🎉 Benefits of GitHub Pages

- ✅ **Free hosting** for public repositories
- ✅ **Automatic SSL** (HTTPS enabled)
- ✅ **Global CDN** for fast loading
- ✅ **Custom domains** supported
- ✅ **Automatic deployments** on code changes
- ✅ **Version control** integration

## 🏃‍♂️ Quick Start Summary

1. **Go to**: https://github.com/ablewealth/rebalancer/settings/pages
2. **Set Source**: GitHub Actions
3. **Wait**: 1-2 minutes for deployment
4. **Visit**: https://ablewealth.github.io/rebalancer
5. **Done**: Your site is live! 🎉

---

**Your Tax Harvesting Calculator is ready for the world!** 🚀
