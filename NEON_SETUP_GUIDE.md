# Neon Database Integration Setup Guide

## Issue Identified
The Neon integration is failing because:
1. ✅ Dependencies are now installed (`@neondatabase/serverless`)
2. ❌ No `.env` file exists with Neon credentials
3. ❌ System is trying to connect to local PostgreSQL instead of Neon

## Quick Setup Options

### Option 1: Use Neon Database (Recommended)

1. **Create a Neon account and project:**
   - Go to https://neon.tech
   - Create a new project
   - Get your connection string

2. **Create `.env` file in backend directory:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your Neon credentials:**
   ```bash
   # Essential Neon Configuration
   NODE_ENV=development
   DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   NEON_PROJECT_ID=your-project-id
   NEON_API_KEY=your-api-key
   
   # Other required settings
   PORT=8742
   CORS_ORIGIN=http://localhost:3001
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Test the connection:**
   ```bash
   npm run db:status
   ```

5. **Run migrations:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Option 2: Use Local PostgreSQL (Development)

1. **Install PostgreSQL locally:**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```

2. **Create local database:**
   ```bash
   createdb tax_harvesting
   ```

3. **Update `.env` for local development:**
   ```bash
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tax_harvesting
   DB_USER=postgres
   DB_PASSWORD=
   ```

## GitHub Actions Configuration

The GitHub workflows are configured to use Neon with these secrets:
- `NEON_PROJECT_ID` (in repository variables)
- `NEON_API_KEY` (in repository secrets)
- `NEON_DATABASE_URL` (in repository secrets for production)

## Next Steps

1. Choose Option 1 (Neon) or Option 2 (Local)
2. Create the `.env` file with appropriate settings
3. Run the database tests: `npm run db:status`
4. If successful, run migrations: `npm run db:migrate`

## Troubleshooting

- **Connection refused**: Check if DATABASE_URL is set and valid
- **Module not found**: Run `npm install` in backend directory
- **Migration fails**: Ensure database exists and credentials are correct
- **GitHub Actions fail**: Ensure repository secrets are set in GitHub settings
