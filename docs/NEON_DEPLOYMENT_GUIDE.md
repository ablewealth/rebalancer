# Neon Database Deployment Guide

## Overview

This guide walks you through deploying the Enhanced Tax Harvesting Service v2.0.0 with Neon serverless PostgreSQL integration. Neon provides branching capabilities, automatic scaling, and enterprise-grade database features.

## Prerequisites

1. **Neon Account**: Sign up at [neon.tech](https://neon.tech)
2. **Node.js**: Version 18+ recommended
3. **Git**: For CI/CD workflows
4. **VS Code**: For development (optional)

## Quick Start

### 1. Neon Project Setup

1. **Create Neon Project**:
   ```bash
   # Visit https://console.neon.tech
   # Create a new project
   # Copy your connection string
   ```

2. **Get Required Credentials**:
   - Database URL: `postgresql://username:password@hostname/database?sslmode=require`
   - Project ID: Found in project settings
   - API Key: Generate in API keys section

### 2. Environment Configuration

1. **Copy Environment Template**:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Configure Environment Variables**:
   ```bash
   # Required Neon Configuration
   DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   NEON_PROJECT_ID=your-project-id
   NEON_API_KEY=your-api-key
   
   # Application Configuration
   NODE_ENV=production
   PORT=8742
   
   # Feature Flags
   ENABLE_ADVANCED_ANALYTICS=true
   ENABLE_WASH_SALE_DETECTION=true
   ```

### 3. Database Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Run Database Migration**:
   ```bash
   npm run db:migrate
   ```

3. **Seed Sample Data** (optional):
   ```bash
   npm run db:seed
   ```

4. **Verify Setup**:
   ```bash
   npm run db:status
   ```

### 4. Start the Server

```bash
npm start
```

Visit `http://localhost:8742/api/neon` to verify Neon integration.

## Advanced Configuration

### GitHub Actions CI/CD

The project includes automated Neon database branching for CI/CD:

1. **Set Repository Secrets**:
   - `NEON_API_KEY`: Your Neon API key
   - `NEON_PROJECT_ID`: Your Neon project ID
   - `DATABASE_URL`: Your main database URL

2. **Workflow Features**:
   - Creates database branches for pull requests
   - Runs migrations and tests on branches
   - Automatically cleans up branches

### Database Management Scripts

```bash
# Database Migration
npm run db:migrate          # Run pending migrations
npm run db:reset            # Reset database and re-run migrations
npm run db:status           # Check migration status

# Data Management
npm run db:seed             # Populate with sample data
npm run db:backup           # Create database backup
npm run db:restore          # Restore from backup
```

### Monitoring and Health Checks

1. **Health Endpoint**:
   ```
   GET /api/neon/health
   ```

2. **Performance Metrics**:
   ```
   GET /api/neon/performance
   ```

3. **Feature Testing**:
   ```
   POST /api/neon/test-features
   ```

## API Endpoints

### Portfolio Analytics
```bash
# Get portfolio analytics
GET /api/neon/portfolios/:id/analytics

# Store portfolio analytics
POST /api/neon/portfolios/:id/analytics
```

### Tax Calculations
```bash
# Store tax calculation
POST /api/neon/tax-calculations

# Get calculation history
GET /api/neon/portfolios/:id/tax-calculations
```

### Wash Sale Detection
```bash
# Get wash sale information
GET /api/neon/wash-sales/:symbol

# Check wash sale violation
POST /api/neon/wash-sales/check
```

## Production Deployment

### Option 1: Vercel/Netlify (Frontend) + Railway/Render (Backend)

1. **Deploy Backend**:
   ```bash
   # Railway
   railway login
   railway new
   railway add --database postgresql
   railway deploy
   
   # Or Render
   # Connect GitHub repository
   # Set environment variables
   # Deploy
   ```

2. **Configure Neon**:
   - Use production Neon database
   - Set connection pooling
   - Enable SSL

### Option 2: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY backend/package*.json ./
   RUN npm ci --only=production
   COPY backend/ .
   EXPOSE 8742
   CMD ["npm", "start"]
   ```

2. **Deploy with Docker**:
   ```bash
   docker build -t tax-harvesting-backend .
   docker run -p 8742:8742 --env-file .env tax-harvesting-backend
   ```

### Option 3: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tax-harvesting-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tax-harvesting-backend
  template:
    metadata:
      labels:
        app: tax-harvesting-backend
    spec:
      containers:
      - name: backend
        image: tax-harvesting-backend:latest
        ports:
        - containerPort: 8742
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: neon-secrets
              key: database-url
```

## Performance Optimization

### Connection Pooling

The Neon service automatically handles connection pooling, but you can optimize:

```javascript
// In neonDatabaseService.js
const poolConfig = {
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
};
```

### Query Optimization

1. **Use Indexes**: The schema includes optimized indexes for common queries
2. **Query Caching**: Enable caching for frequently accessed data
3. **Batch Operations**: Use bulk inserts for large datasets

### Monitoring

```bash
# Monitor query performance
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

# Monitor connection usage
SELECT * FROM pg_stat_activity;
```

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files
- Use strong, unique passwords
- Rotate API keys regularly

### 2. Database Security
- Enable SSL (required for Neon)
- Use connection string authentication
- Implement query parameter validation

### 3. API Security
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Input validation
const { body, validationResult } = require('express-validator');
app.post('/api/neon/portfolios/:id/analytics', [
  body('data').isObject(),
  body('metadata').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**:
   ```bash
   # Check firewall settings
   # Verify Neon project status
   # Check connection string format
   ```

2. **Migration Failures**:
   ```bash
   # Reset and retry
   npm run db:reset
   npm run db:migrate
   ```

3. **Performance Issues**:
   ```bash
   # Check query performance
   GET /api/neon/performance
   
   # Monitor database metrics in Neon console
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=neon:* npm start

# Check health status
curl http://localhost:8742/api/neon/health
```

## Support

- **Neon Documentation**: [docs.neon.tech](https://docs.neon.tech)
- **API Reference**: `/api/neon` endpoint
- **GitHub Issues**: Project repository
- **Performance Monitoring**: Neon console dashboard

## Migration from Traditional PostgreSQL

If migrating from traditional PostgreSQL:

1. **Export Data**:
   ```bash
   pg_dump old_database > backup.sql
   ```

2. **Import to Neon**:
   ```bash
   psql "postgresql://username:password@hostname/database?sslmode=require" < backup.sql
   ```

3. **Update Connection String**:
   ```bash
   # Replace DB_HOST, DB_PORT, etc. with DATABASE_URL
   DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   ```

4. **Test Migration**:
   ```bash
   npm run db:status
   npm run test
   ```

## Next Steps

- Set up monitoring dashboards
- Configure backup strategies
- Implement advanced analytics
- Scale based on usage patterns
- Optimize for your specific use case

---

**Enhanced Tax Harvesting Service v2.0.0 with Neon Integration**  
*Enterprise-grade database with serverless architecture*
