const express = require('express');
const calculationsRouter = require('./routes/calculations');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/calculate', calculationsRouter);

async function testAPIEndpoint() {
  console.log('Testing Enhanced Tax Harvesting API Endpoint...\n');
  
  const testPortfolio = [
    {
      symbol: 'AAPL',
      quantity: 100,
      price: 140.00,
      costBasis: 15000.00,
      unrealizedGain: -1000.00,
      term: 'Long-Term',
      acquiredDate: new Date('2023-01-15'),
      accountType: 'taxable',
      includedInSelling: true
    },
    {
      symbol: 'MSFT',
      quantity: 50,
      price: 280.00,
      costBasis: 15000.00,
      unrealizedGain: -1000.00,
      term: 'Long-Term',
      acquiredDate: new Date('2023-03-20'),
      accountType: 'taxable',
      includedInSelling: true
    }
  ];
  
  try {
    console.log('Making POST request to /api/calculate...');
    
    // Mock the request using the express app directly
    const mockReq = {
      body: {
        portfolioData: testPortfolio,
        targetST: 0,
        targetLT: -1000,
        realizedST: 0,
        realizedLT: 0,
        taxConfig: {
          shortTermRate: 0.32,
          longTermRate: 0.20,
          stateRate: 0.09
        },
        washSaleConfig: {
          strictMode: true
        },
        accountTypes: ['taxable'],
        optimizationLevel: 'balanced'
      }
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      },
      statusCode: 200,
      data: null
    };
    
    // Get the route handler
    const routeHandler = calculationsRouter.stack.find(layer => 
      layer.route && layer.route.path === '/' && layer.route.methods.post
    ).route.stack[0].handle;
    
    // Execute the route handler
    await routeHandler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200 && mockRes.data && mockRes.data.success) {
      console.log('✅ API endpoint test successful!');
      console.log(`Status: ${mockRes.statusCode}`);
      console.log(`Success: ${mockRes.data.success}`);
      console.log(`Message: ${mockRes.data.message}`);
      console.log(`Recommendations: ${mockRes.data.data.recommendations.length}`);
    } else {
      console.log('❌ API endpoint test failed');
      console.log(`Status: ${mockRes.statusCode}`);
      console.log(`Response:`, JSON.stringify(mockRes.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ API endpoint test error:', error.message);
    if (error.stack) {
      console.log(error.stack);
    }
  }
  
  // Test error handling
  console.log('\nTesting error handling...');
  try {
    const mockReqInvalid = {
      body: {
        portfolioData: [], // Empty portfolio
        targetST: 0,
        targetLT: -1000
      }
    };
    
    const mockResInvalid = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      },
      statusCode: 200,
      data: null
    };
    
    const routeHandler = calculationsRouter.stack.find(layer => 
      layer.route && layer.route.path === '/' && layer.route.methods.post
    ).route.stack[0].handle;
    
    await routeHandler(mockReqInvalid, mockResInvalid);
    
    if (mockResInvalid.statusCode === 400) {
      console.log('✅ Error handling test successful!');
      console.log(`Status: ${mockResInvalid.statusCode}`);
      console.log(`Error: ${mockResInvalid.data.error}`);
    } else {
      console.log('❌ Error handling test failed');
      console.log(`Status: ${mockResInvalid.statusCode}`);
      console.log(`Response:`, JSON.stringify(mockResInvalid.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error handling test error:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAPIEndpoint()
    .then(() => {
      console.log('\n✅ API endpoint testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API endpoint testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIEndpoint };
