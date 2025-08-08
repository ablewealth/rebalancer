#!/usr/bin/env node

/**
 * Setup script for Tax Harvesting Backend
 * Helps with initial database setup and configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Tax Harvesting Backend Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
    console.log('💡 Please edit .env file with your database credentials\n');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.warn('⚠️  Warning: Node.js 16+ is recommended');
  console.warn(`   Current version: ${nodeVersion}\n`);
} else {
  console.log(`✅ Node.js version: ${nodeVersion}\n`);
}

// Instructions
console.log('📋 Next Steps:');
console.log('==============');
console.log('1. Install dependencies:');
console.log('   npm install\n');

console.log('2. Set up PostgreSQL database:');
console.log('   createdb tax_harvesting');
console.log('   psql tax_harvesting < database/schema.sql\n');

console.log('3. Configure database connection:');
console.log('   Edit .env file with your PostgreSQL credentials\n');

console.log('4. Start the development server:');
console.log('   npm run dev\n');

console.log('💡 The server will start even without database connection');
console.log('   but API endpoints will have limited functionality\n');

console.log('🔗 Useful commands:');
console.log('   npm start     - Start production server');
console.log('   npm run dev   - Start development server with auto-reload');
console.log('   npm test      - Run tests (when implemented)');

console.log('\n✨ Setup complete! Run the commands above to get started.');