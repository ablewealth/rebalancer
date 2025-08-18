const express = require('express');
const router = express.Router();
const AdvancedTaxStrategies = require('../../shared/advancedTaxStrategies');

// Initialize advanced tax strategies service
const advancedTaxStrategies = new AdvancedTaxStrategies();

// POST /api/advanced-tax/gain-harvesting - Analyze tax-gain harvesting opportunities
router.post('/gain-harvesting', async (req, res) => {
  try {
    const { portfolioData, options = {} } = req.body;
    
    if (!portfolioData || !portfolioData.positions) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data with positions is required'
      });
    }
    
    const analysis = advancedTaxStrategies.analyzeTaxGainHarvesting(portfolioData, options);
    
    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing tax-gain harvesting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tax-gain harvesting',
      message: error.message
    });
  }
});

// POST /api/advanced-tax/multi-account - Optimize multi-account tax strategy
router.post('/multi-account', async (req, res) => {
  try {
    const { accounts, options = {} } = req.body;
    
    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        error: 'Accounts array is required'
      });
    }
    
    const optimization = advancedTaxStrategies.optimizeMultiAccountStrategy(accounts, options);
    
    res.json({
      success: true,
      data: optimization,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error optimizing multi-account strategy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize multi-account strategy',
      message: error.message
    });
  }
});

// POST /api/advanced-tax/asset-location - Optimize asset location across accounts
router.post('/asset-location', async (req, res) => {
  try {
    const { accounts } = req.body;
    
    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        error: 'Accounts array is required'
      });
    }
    
    const optimization = advancedTaxStrategies.optimizeAssetLocation(accounts);
    
    res.json({
      success: true,
      data: optimization,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error optimizing asset location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize asset location',
      message: error.message
    });
  }
});

// POST /api/advanced-tax/tax-efficient-rebalancing - Generate tax-efficient rebalancing plan
router.post('/tax-efficient-rebalancing', async (req, res) => {
  try {
    const { portfolioData, targetAllocation, options = {} } = req.body;
    
    if (!portfolioData || !targetAllocation) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data and target allocation are required'
      });
    }
    
    const rebalancingPlan = advancedTaxStrategies.generateTaxEfficientRebalancing(
      portfolioData, 
      targetAllocation, 
      options
    );
    
    res.json({
      success: true,
      data: rebalancingPlan,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating tax-efficient rebalancing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tax-efficient rebalancing',
      message: error.message
    });
  }
});

// GET /api/advanced-tax/account-types - Get supported account types
router.get('/account-types', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        accountTypes: advancedTaxStrategies.accountTypes,
        descriptions: {
          [advancedTaxStrategies.accountTypes.TAXABLE]: 'Taxable brokerage account',
          [advancedTaxStrategies.accountTypes.TRADITIONAL_IRA]: 'Traditional IRA (tax-deferred)',
          [advancedTaxStrategies.accountTypes.ROTH_IRA]: 'Roth IRA (tax-free growth)',
          [advancedTaxStrategies.accountTypes.HSA]: 'Health Savings Account (triple tax advantage)',
          [advancedTaxStrategies.accountTypes.FOUR_OH_ONE_K]: '401(k) or similar employer plan'
        }
      }
    });
  } catch (error) {
    console.error('Error getting account types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account types',
      message: error.message
    });
  }
});

// GET /api/advanced-tax/asset-tax-efficiency - Get asset tax efficiency rankings
router.get('/asset-tax-efficiency', (req, res) => {
  try {
    const rankings = Object.entries(advancedTaxStrategies.assetTaxEfficiency)
      .sort(([,a], [,b]) => a - b)
      .map(([asset, rank]) => ({
        asset: asset.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        rank,
        recommendation: rank <= 4 ? 'Best for taxable accounts' : 
                      rank <= 7 ? 'Suitable for any account' : 
                      'Best for tax-advantaged accounts'
      }));
    
    res.json({
      success: true,
      data: {
        rankings,
        explanation: {
          taxable: 'Assets ranked 1-4 are most tax-efficient and suitable for taxable accounts',
          mixed: 'Assets ranked 5-7 are moderately tax-efficient and suitable for any account type',
          taxAdvantaged: 'Assets ranked 8+ are least tax-efficient and best placed in tax-advantaged accounts'
        }
      }
    });
  } catch (error) {
    console.error('Error getting asset tax efficiency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset tax efficiency rankings',
      message: error.message
    });
  }
});

module.exports = router;
