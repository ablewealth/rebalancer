#!/usr/bin/env node
/**
 * Interactive Database Setup Script
 * Helps users configure either Neon or local PostgreSQL
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { testConnection } = require('./config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupDatabase() {
  console.log('🚀 Tax Harvesting Database Setup');
  console.log('================================\n');
  
  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    console.log('✅ Found existing .env file');
    const testDb = await question('Test current database connection? (y/n): ');
    
    if (testDb.toLowerCase() === 'y') {
      console.log('\n🔍 Testing database connection...');
      const connected = await testConnection();
      if (connected) {
        console.log('🎉 Database connection successful! Setup complete.');
        rl.close();
        return;
      }
    }
  }
  
  console.log('\n📋 Choose your database setup:');
  console.log('1. Neon Database (Recommended - Serverless PostgreSQL)');
  console.log('2. Local PostgreSQL (Development only)');
  console.log('3. Skip setup (configure manually)');
  
  const choice = await question('\nEnter your choice (1-3): ');
  
  switch (choice) {
    case '1':
      await setupNeon();
      break;
    case '2':
      await setupLocal();
      break;
    case '3':
      console.log('\n📚 Manual setup guide available in NEON_SETUP_GUIDE.md');
      break;
    default:
      console.log('❌ Invalid choice. Please run the script again.');
  }
  
  rl.close();
}

async function setupNeon() {
  console.log('\n🌐 Setting up Neon Database');
  console.log('===========================');
  console.log('1. Go to https://neon.tech and create an account');
  console.log('2. Create a new project');
  console.log('3. Get your connection string from the dashboard\n');
  
  const hasAccount = await question('Do you have a Neon account and connection string? (y/n): ');
  
  if (hasAccount.toLowerCase() !== 'y') {
    console.log('\n📚 Please visit https://neon.tech to create an account first.');
    console.log('Then run this setup script again.');
    return;
  }
  
  const connectionString = await question('Enter your Neon connection string: ');
  const projectId = await question('Enter your Neon project ID (optional): ');
  const apiKey = await question('Enter your Neon API key (optional): ');
  
  // Create .env file with Neon configuration
  const envContent = `# Tax Harvesting Backend - Neon Configuration
NODE_ENV=development
PORT=8742

# Neon Database Configuration
DATABASE_URL=${connectionString}
${projectId ? `NEON_PROJECT_ID=${projectId}` : '# NEON_PROJECT_ID=your-project-id'}
${apiKey ? `NEON_API_KEY=${apiKey}` : '# NEON_API_KEY=your-api-key'}

# Application Configuration
MAX_PORTFOLIO_SIZE=1000
MAX_CALCULATION_HISTORY=100
CACHE_TTL_SECONDS=300
CORS_ORIGIN=http://localhost:3001

# Security Configuration
JWT_SECRET=dev-secret-change-in-production
API_RATE_LIMIT=100

# Feature Flags
ENABLE_REAL_TIME_PRICES=false
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_WASH_SALE_DETECTION=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined
`;
  
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ Created .env file with Neon configuration');
  
  // Test connection
  console.log('\n🔍 Testing Neon connection...');
  const connected = await testConnection();
  
  if (connected) {
    console.log('🎉 Neon setup successful!');
    console.log('\n📋 Next steps:');
    console.log('   npm run db:migrate  # Create database schema');
    console.log('   npm run db:seed     # Add sample data');
  } else {
    console.log('❌ Connection failed. Please check your connection string.');
  }
}

async function setupLocal() {
  console.log('\n🏠 Setting up Local PostgreSQL');
  console.log('==============================');
  console.log('Make sure PostgreSQL is installed and running locally.\n');
  
  const dbName = await question('Database name (tax_harvesting): ') || 'tax_harvesting';
  const dbUser = await question('Database user (postgres): ') || 'postgres';
  const dbPassword = await question('Database password (leave empty if none): ');
  const dbHost = await question('Database host (localhost): ') || 'localhost';
  const dbPort = await question('Database port (5432): ') || '5432';
  
  // Create .env file with local configuration
  const envContent = `# Tax Harvesting Backend - Local PostgreSQL Configuration
NODE_ENV=development
PORT=8742

# Local PostgreSQL Configuration
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}

# Application Configuration
MAX_PORTFOLIO_SIZE=1000
MAX_CALCULATION_HISTORY=100
CACHE_TTL_SECONDS=300
CORS_ORIGIN=http://localhost:3001

# Security Configuration
JWT_SECRET=dev-secret-change-in-production
API_RATE_LIMIT=100

# Feature Flags
ENABLE_REAL_TIME_PRICES=false
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_WASH_SALE_DETECTION=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined
`;
  
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ Created .env file with local PostgreSQL configuration');
  
  // Test connection
  console.log('\n🔍 Testing local PostgreSQL connection...');
  const connected = await testConnection();
  
  if (connected) {
    console.log('🎉 Local PostgreSQL setup successful!');
    console.log('\n📋 Next steps:');
    console.log('   npm run db:migrate  # Create database schema');
    console.log('   npm run db:seed     # Add sample data');
  } else {
    console.log('❌ Connection failed. Please check:');
    console.log('   • PostgreSQL is running');
    console.log('   • Database credentials are correct');
    console.log('   • Database exists (createdb ' + dbName + ')');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupDatabase };
