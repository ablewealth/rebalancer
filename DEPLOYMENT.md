# Deployment Guide

## 🚀 Production Deployment

### Environment Setup

1. **Backend Environment Variables**
```bash
# backend/.env
PORT=3000
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=tax_harvesting
DB_USER=your-username
DB_PASSWORD=your-password
CORS_ORIGIN=https://your-frontend-domain.com
```

2. **Frontend Environment Variables**
```bash
# frontend/.env.production
REACT_APP_API_URL=https://your-backend-domain.com
```

### Database Setup

1. **Create Production Database**
```sql
CREATE DATABASE tax_harvesting;
CREATE USER tax_harvesting_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tax_harvesting TO tax_harvesting_user;
```

2. **Run Schema**
```bash
psql -h your-db-host -U tax_harvesting_user -d tax_harvesting < backend/database/schema.sql
```

### Backend Deployment

#### Option 1: Traditional Server
```bash
# Install dependencies
cd backend
npm ci --production

# Start with PM2
npm install -g pm2
pm2 start server.js --name "tax-harvesting-api"
pm2 startup
pm2 save
```

#### Option 2: Docker
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Option 3: Cloud Platforms
- **Heroku**: Connect GitHub repo, set environment variables
- **Railway**: Deploy directly from GitHub
- **DigitalOcean App Platform**: Use GitHub integration
- **AWS Elastic Beanstalk**: Deploy Node.js application

### Frontend Deployment

#### Option 1: Static Hosting
```bash
# Build for production
cd frontend
npm ci
npm run build

# Deploy build/ folder to:
# - Netlify (drag & drop or GitHub integration)
# - Vercel (GitHub integration)
# - AWS S3 + CloudFront
# - GitHub Pages
```

#### Option 2: Docker
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### SSL/HTTPS Setup

1. **Backend**: Use reverse proxy (nginx) with Let's Encrypt
2. **Frontend**: Most static hosts provide SSL automatically

### Monitoring & Logging

1. **Backend Monitoring**
```bash
# PM2 monitoring
pm2 monit

# Log management
pm2 logs tax-harvesting-api
```

2. **Database Monitoring**
- Set up connection pooling monitoring
- Monitor query performance
- Set up automated backups

### Performance Optimization

1. **Backend**
- Enable gzip compression
- Set up Redis caching for frequent queries
- Optimize database queries with indexes

2. **Frontend**
- Enable service worker for caching
- Optimize bundle size with code splitting
- Use CDN for static assets

### Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] HTTPS enabled everywhere
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection headers

### Backup Strategy

1. **Database Backups**
```bash
# Daily automated backup
pg_dump -h host -U user tax_harvesting > backup_$(date +%Y%m%d).sql
```

2. **Code Backups**
- GitHub repository (primary)
- Automated deployment from main branch

### Health Checks

1. **Backend Health Endpoint**
```bash
curl https://your-api.com/health
```

2. **Frontend Health Check**
```bash
curl https://your-app.com/
```

### Rollback Strategy

1. **Backend**: Use PM2 or container orchestration rollback
2. **Frontend**: Revert to previous build on static hosting
3. **Database**: Restore from backup if schema changes needed

## 🔧 Development to Production Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificates installed
- [ ] Domain names configured
- [ ] Health checks passing
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Performance testing completed
- [ ] Security audit passed
- [ ] Documentation updated

## 📊 Recommended Architecture

```
Internet
    ↓
Load Balancer (nginx)
    ↓
Frontend (Static Files)
    ↓
Backend API (Node.js)
    ↓
Database (PostgreSQL)
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**: Check CORS_ORIGIN environment variable
2. **Database Connection**: Verify connection string and firewall rules
3. **Build Failures**: Check Node.js version compatibility
4. **Memory Issues**: Increase server memory or optimize queries

### Debug Commands

```bash
# Check backend logs
pm2 logs tax-harvesting-api

# Check database connections
psql -h host -U user -d tax_harvesting -c "SELECT version();"

# Test API endpoints
curl -X POST https://your-api.com/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"portfolioData": [], "targetST": 0, "targetLT": 0}'
```

---

**Ready for production deployment with comprehensive monitoring and security!** 🚀