const { Pool } = require('pg');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Determine if we're using Neon or traditional PostgreSQL
const isNeon = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech');

// Database configuration for traditional PostgreSQL
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tax_harvesting',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: isNeon ? { rejectUnauthorized: false } : false
};

// For Neon, use DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  pgConfig.connectionString = process.env.DATABASE_URL;
  pgConfig.ssl = { rejectUnauthorized: false };
}

// Create connection pool or Neon client
let pool;
let neonClient;

if (isNeon && process.env.NODE_ENV === 'production') {
  // Use Neon serverless client for production
  console.log('🚀 Using Neon serverless client');
  neonClient = neon(process.env.DATABASE_URL);
} else {
  // Use traditional connection pool for development/preview
  console.log('🔧 Using PostgreSQL connection pool');
  pool = new Pool(pgConfig);
  
  // Test database connection
  pool.on('connect', () => {
    console.log('📊 Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
    // Don't exit the process - let the app continue without database
    console.warn('⚠️  Continuing without database connection');
  });
}

// Helper function to execute queries
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    let res;
    
    if (neonClient) {
      // Use Neon serverless client
      const rows = await neonClient(text, params);
      res = { rows, rowCount: rows.length };
    } else if (pool) {
      // Use traditional pool
      res = await pool.query(text, params);
    } else {
      throw new Error('No database connection available');
    }
    
    const duration = Date.now() - start;
    console.log('🔍 Executed query', { 
      text: text.substring(0, 100), 
      duration, 
      rows: res.rowCount,
      client: neonClient ? 'neon' : 'pool'
    });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool (only for traditional PostgreSQL)
const getClient = async () => {
  if (pool) {
    return await pool.connect();
  } else {
    throw new Error('Connection pool not available - using Neon serverless');
  }
};

// Helper function to test database connection
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection test successful:', {
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(',')[0],
      client: neonClient ? 'Neon Serverless' : 'PostgreSQL Pool'
    });
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Helper function to get database info
const getDatabaseInfo = () => {
  return {
    isNeon,
    hasNeonClient: !!neonClient,
    hasPool: !!pool,
    connectionString: process.env.DATABASE_URL ? '[REDACTED]' : null,
    environment: process.env.NODE_ENV || 'development'
  };
};

// Graceful shutdown
const shutdown = async () => {
  console.log('🔄 Shutting down database connections...');
  if (pool) {
    await pool.end();
    console.log('✅ PostgreSQL pool closed');
  }
  // Neon serverless client doesn't need explicit closing
};

module.exports = {
  pool,
  neonClient,
  query,
  getClient,
  testConnection,
  getDatabaseInfo,
  shutdown
};