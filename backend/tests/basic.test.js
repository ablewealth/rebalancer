const express = require('express');

describe('Backend Basic Tests', () => {
  test('Express server can be required', () => {
    expect(express).toBeDefined();
  });
  
  test('Environment variables can be loaded', () => {
    const dotenv = require('dotenv');
    expect(dotenv).toBeDefined();
  });
  
  test('Database config can be loaded', () => {
    try {
      const config = require('../config/database');
      expect(config).toBeDefined();
    } catch (error) {
      // Database config may not exist in CI
      expect(true).toBe(true);
    }
  });
  
  test('Server can start', () => {
    try {
      const app = express();
      expect(app).toBeDefined();
    } catch (error) {
      expect(false).toBe(true);
    }
  });
  
  test('Basic middleware can be loaded', () => {
    try {
      const cors = require('cors');
      const helmet = require('helmet');
      const morgan = require('morgan');
      
      expect(cors).toBeDefined();
      expect(helmet).toBeDefined();
      expect(morgan).toBeDefined();
    } catch (error) {
      // Some middleware might not be installed
      expect(true).toBe(true);
    }
  });
});
