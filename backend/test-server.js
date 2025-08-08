#!/usr/bin/env node

/**
 * Simple test script to verify the server is working
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

console.log('🧪 Testing Tax Harvesting Backend Server');
console.log('========================================\n');

// Test endpoints
const endpoints = [
  { path: '/', name: 'Root endpoint' },
  { path: '/health', name: 'Health check' },
  { path: '/api', name: 'API info' },
  { path: '/api/portfolios', name: 'Portfolios' },
  { path: '/api/models', name: 'Model portfolios' },
  { path: '/api/prices', name: 'Prices' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${endpoint.path}`;
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            ...endpoint,
            status: res.statusCode,
            success: res.statusCode < 400,
            response: json
          });
        } catch (error) {
          resolve({
            ...endpoint,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response'
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        ...endpoint,
        status: 0,
        success: false,
        error: error.message
      });
    });
  });
}

async function runTests() {
  console.log(`Testing server at ${BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    
    if (result.success) {
      console.log(`✅ ${result.name}: ${result.status}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}: ${result.status} - ${result.error || 'Failed'}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Server is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check server logs for details.');
  }
  
  // Test a POST endpoint
  console.log('\n🧪 Testing POST endpoint...');
  await testPostEndpoint();
}

async function testPostEndpoint() {
  const postData = JSON.stringify({
    portfolioData: [
      { symbol: 'VTI', quantity: 100, price: 220, unrealizedGain: 1000, term: 'Long' }
    ],
    targetST: 0,
    targetLT: -500
  });
  
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/calculate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode < 400) {
          console.log('✅ POST /api/calculate: Working');
        } else {
          console.log(`❌ POST /api/calculate: ${res.statusCode}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ POST /api/calculate: ${error.message}`);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// Check if server is running
console.log('Checking if server is running...');
setTimeout(() => {
  runTests().catch(console.error);
}, 1000);