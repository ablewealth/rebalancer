# Neon Integration Troubleshooting

## ✅ Issues Resolved

### 1. Missing Dependencies
**Problem**: `Cannot find module '@neondatabase/serverless'`
**Solution**: ✅ Fixed by running `npm install` in backend directory

### 2. Missing Environment Configuration
**Problem**: No `.env` file, system trying to connect to local PostgreSQL
**Solution**: ✅ Created `.env` template and interactive setup script

### 3. Poor Error Messages
**Problem**: Cryptic connection errors without guidance
**Solution**: ✅ Enhanced error messages with helpful suggestions

## 🔧 Quick Setup Commands

```bash
# Go to backend directory
cd backend

# Install dependencies (if not done)
npm install

# Interactive database setup
npm run setup-db

# Manual setup option
cp .env.example .env
# Edit .env with your database credentials

# Test connection
npm run db:status

# If successful, run migrations
npm run db:migrate
npm run db:seed
```

## 🌐 Neon Database Setup

### Step 1: Create Neon Account
1. Visit https://neon.tech
2. Sign up for a free account
3. Create a new project

### Step 2: Get Connection Details
From your Neon dashboard, copy:
- **Connection String**: `postgresql://username:password@hostname/database?sslmode=require`
- **Project ID**: Found in project settings
- **API Key**: Create one in Account Settings > API Keys

### Step 3: Configure Environment
Update your `.env` file:
```bash
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
NEON_PROJECT_ID=your-project-id
NEON_API_KEY=your-api-key
```

## 🏠 Local PostgreSQL Alternative

If you prefer local development:

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb tax_harvesting

# Update .env for local use
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tax_harvesting
DB_USER=postgres
DB_PASSWORD=
```

## ⚠️ Common Issues

### Connection Refused (ECONNREFUSED)
**Symptoms**: `connect ECONNREFUSED 127.0.0.1:5432`
**Causes**:
- No DATABASE_URL set (trying to use local PostgreSQL)
- Local PostgreSQL not running
- Wrong connection string

**Solutions**:
1. Set DATABASE_URL for Neon
2. Start local PostgreSQL: `brew services start postgresql`
3. Verify connection string format

### Invalid Connection String
**Symptoms**: Connection timeouts or authentication errors
**Solutions**:
- Ensure connection string includes `?sslmode=require`
- Verify username and password are correct
- Check if database exists in Neon dashboard

### GitHub Actions Failures
**Symptoms**: Workflows fail on database operations
**Causes**:
- Missing repository secrets
- Wrong environment variable names

**Solutions**:
1. Set repository secrets in GitHub:
   - `NEON_DATABASE_URL`
   - `NEON_API_KEY`
2. Set repository variables:
   - `NEON_PROJECT_ID`

## 🧪 Testing Your Setup

```bash
# Test database connection
npm run db:status

# Expected output for successful Neon connection:
# ✅ Database connection test successful:
# { client: 'Neon Serverless', ... }

# Expected output for successful local connection:
# ✅ Database connection test successful:
# { client: 'PostgreSQL Pool', ... }
```

## 📋 Verification Checklist

- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file exists with database configuration
- [ ] Database connection test passes (`npm run db:status`)
- [ ] Migrations run successfully (`npm run db:migrate`)
- [ ] Sample data loads (`npm run db:seed`)
- [ ] GitHub repository secrets configured (for CI/CD)

## 🆘 Need Help?

1. **Run the interactive setup**: `npm run setup-db`
2. **Check the setup guide**: `NEON_SETUP_GUIDE.md`
3. **Test connection**: `npm run db:status`
4. **Review logs**: Check backend console output for detailed error messages

## 🔄 Next Steps After Setup

Once your database is working:

1. **Start the backend**: `npm run dev`
2. **Run tests**: `npm test`
3. **Deploy to production**: Workflows should now pass
4. **Monitor**: Use Neon dashboard to monitor database performance
