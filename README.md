# Tax Harvesting & Portfolio Rebalancer

A sophisticated full-stack application for tax-loss harvesting, portfolio rebalancing, and cash raising optimization with **Enhanced Tax Harvesting Service v2.0.0** and **Neon Database Integration**.

## 🚀 Features

### Enhanced Tax Harvesting Service v2.0.0
- **Target-Based Optimization**: Advanced algorithm with precision matching and dynamic adjustment
- **Tax Target Mode**: Generate trades to meet specific short-term and long-term gain/loss targets
- **Cash Raising Mode**: Generate tax-optimized trades to raise a specific amount of cash
- **Wash Sale Detection**: Built-in compliance checking with ETF alternatives database
- **Real-time Analytics**: Portfolio performance tracking and tax optimization insights

### Portfolio Management
- **Interactive Portfolio Grid**: Upload CSV files and manage positions
- **Model Portfolios**: Create, edit, and manage reusable portfolio templates
- **Buy Order Generation**: Convert cash to portfolio allocations based on model portfolios
- **Price Management**: Centralized pricing system across all models
- **Advanced Analytics**: Real-time performance metrics and tax efficiency analysis

### Enterprise Database Integration
- **Neon PostgreSQL**: Serverless database with automatic scaling and branching
- **Real-time Data**: Live portfolio analytics and calculation storage
- **CI/CD Integration**: Automated database branching for testing and deployment
- **Performance Monitoring**: Built-in health checks and performance metrics

### Modern Architecture
- **React Frontend**: Modern TypeScript SPA with Tailwind CSS
- **Node.js Backend**: Express.js API with Neon PostgreSQL integration
- **Real-time Calculations**: Instant tax harvesting recommendations
- **Professional UI/UX**: Responsive design with comprehensive error handling

## 🏗️ Architecture

```
├── frontend/          # React TypeScript SPA
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Main application pages
│   │   └── utils/         # Utility functions
├── backend/           # Node.js Express API
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── config/            # Database configuration
│   └── database/          # SQL schema
└── data/              # Sample data and templates
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Neon PostgreSQL account (recommended) or PostgreSQL 12+ (optional - works with mock data)

### Option 1: Neon Database Setup (Recommended)

1. **Create Neon Account**: Sign up at [neon.tech](https://neon.tech)
2. **Create Project**: Get your connection string from Neon dashboard
3. **Configure Environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Neon credentials:
   # DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   # NEON_PROJECT_ID=your-project-id
   # NEON_API_KEY=your-api-key
   ```

### Backend Setup
```bash
cd backend
npm install

# With Neon Database
npm run db:migrate    # Run database migrations
npm run db:seed       # Add sample data (optional)
npm start            # Start server on port 8742

# Without Database (Mock Data)
npm run dev          # Works with mock data on port 3000
```

The backend will start with either Neon database integration or mock data.

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend will start on `http://localhost:3001`.

### Option 2: Local PostgreSQL Setup (Alternative)
```bash
# Create database
createdb tax_harvesting

# Run schema
psql tax_harvesting < backend/database/schema.sql

# Configure environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials
```

### Neon Integration Features

Access advanced database features at `/api/neon`:
- **Portfolio Analytics**: Real-time performance tracking
- **Tax Calculations**: Historical calculation storage and analysis  
- **Wash Sale Detection**: Automated compliance checking with ETF alternatives
- **Health Monitoring**: Database performance and connection status

## 📊 Usage

### Tax Harvesting
1. **Upload Portfolio**: Import your cost basis CSV file
2. **Choose Mode**:
   - **Tax Target Mode**: Set specific gain/loss targets
   - **Cash Raising Mode**: Specify cash needed and current cash available
3. **Generate Recommendations**: Get optimized sell orders
4. **Export Results**: Download CSV for execution

### Model Portfolios
1. **Create Models**: Define target allocations for different strategies
2. **Manage Holdings**: Add/edit/remove positions with target weights
3. **Generate Buy Orders**: Convert cash to portfolio positions

### Buy Orders
1. **Select Model**: Choose from saved model portfolios
2. **Set Cash Amount**: Specify available cash and reserves
3. **Generate Orders**: Get whole-share buy recommendations

## 🔧 API Endpoints

### Tax Calculations
- `POST /api/calculate` - Run tax harvesting calculations
- `GET /api/calculate/history/:portfolioId` - Get calculation history

### Portfolio Management
- `GET/POST/PUT/DELETE /api/portfolios` - Portfolio CRUD operations
- `GET/POST/PUT/DELETE /api/models` - Model portfolio management

### Price Management
- `GET/POST/PUT /api/prices` - Price data management
- `GET /api/prices/symbols/all` - Get all unique symbols

## 🧪 Tax Harvesting Algorithm

The core algorithm uses sophisticated optimization techniques:

### Tax Target Mode
- **Precision Targeting**: Achieves targets within 1-5% accuracy
- **Overshoot Prevention**: Strict limits to avoid exceeding targets
- **Term Classification**: Proper handling of short-term vs long-term positions
- **Partial Lot Support**: Sells partial shares when needed for precision

### Cash Raising Mode
- **Tax Efficiency Priority**: Sells losses first (tax deductible)
- **Long-term Preference**: Prefers long-term gains (lower tax rate)
- **Optimal Selection**: Minimizes tax impact while raising needed cash
- **Comprehensive Reporting**: Shows tax consequences of all trades

## 🎨 Frontend Features

### Modern React Architecture
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Responsive, professional styling
- **React Router**: Clean URL structure and navigation
- **Error Boundaries**: Comprehensive error handling

### Interactive Components
- **Portfolio Grid**: Sortable, filterable position management
- **Tax Results**: Beautiful visualization of recommendations
- **Model Editor**: Drag-and-drop portfolio construction
- **Buy Order Generator**: Real-time cash allocation calculations

## 🔒 Security & Compliance

- **No Authentication Required**: Designed for private/internal use
- **Wash Sale Detection**: Built-in IRS compliance checking
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Graceful degradation and user feedback

## 📈 Performance

- **Optimized Algorithms**: Sub-second calculation times for large portfolios
- **Efficient Database Queries**: Indexed queries with connection pooling
- **React Optimization**: Memoized components and efficient re-renders
- **Responsive Design**: Works on desktop, tablet, and mobile

## � Deployment

### Netlify Deployment (Frontend)

The Enhanced Tax Harvesting Service supports multiple Netlify deployment formats:

#### Quick Deploy (Drag & Drop)
```bash
# Build and deploy interactively
npm run build:netlify
npm run deploy:netlify
```

#### Automatic Git Integration
1. **Connect Repository**: Link your GitHub repo to Netlify
2. **Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
3. **Environment Variables**:
   ```bash
   REACT_APP_API_URL=https://your-neon-backend.com
   REACT_APP_NEON_PROJECT_ID=your-neon-project-id
   REACT_APP_ENABLE_NEON_FEATURES=true
   ```

#### Legacy Static Deployment
```bash
# Deploy static HTML/JS version
npm run build:static
# Drag 'dist' folder to netlify.com/drop
```

### Backend Deployment (Neon + Railway/Render)

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
cd backend
railway login
railway new
railway add postgresql  # Or use existing Neon database
railway deploy
```

#### Environment Configuration
```bash
# Required for backend
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
NEON_PROJECT_ID=your-neon-project-id
NEON_API_KEY=your-neon-api-key
PORT=8742
```

### Docker Deployment

#### Frontend Container
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY netlify.toml /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### Backend Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 8742
CMD ["npm", "start"]
```

### Full Stack Deployment

#### Option 1: Netlify + Railway
- **Frontend**: Netlify (React SPA)
- **Backend**: Railway (Node.js + Neon DB)
- **Database**: Neon PostgreSQL

#### Option 2: Vercel + Render
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon PostgreSQL

#### Option 3: AWS/Azure/GCP
- **Frontend**: S3/CloudFront or equivalent
- **Backend**: ECS/Container Apps or equivalent  
- **Database**: Neon PostgreSQL

### Deployment Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm run build` | Interactive build | Development |
| `npm run build:react` | React frontend only | CI/CD |
| `npm run build:static` | Static distribution | Legacy support |
| `npm run build:netlify` | Both formats | Manual deployment |
| `npm run deploy:netlify` | Interactive deploy | Quick deployment |
| `npm run clean` | Clean builds | Development |

### Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] API connectivity working
- [ ] Environment variables configured
- [ ] SSL certificates active
- [ ] Custom domain configured (optional)
- [ ] Monitoring and analytics set up
- [ ] Error tracking configured
- [ ] Performance optimized

For detailed deployment instructions, see:
- **Netlify**: `docs/NETLIFY_DEPLOYMENT_GUIDE.md`
- **Neon Database**: `docs/NEON_DEPLOYMENT_GUIDE.md`

## �🛠️ Development

### Backend Development
```bash
cd backend
npm run dev    # Development server with auto-reload
npm test       # Run tests (when implemented)
```

### Frontend Development
```bash
cd frontend
npm start      # Development server
npm run build  # Production build
npm test       # Run tests
```

### Database Development
```bash
# Reset database
dropdb tax_harvesting && createdb tax_harvesting
psql tax_harvesting < backend/database/schema.sql
```

## 📝 Migration History

This application was migrated from a client-side HTML/JavaScript implementation to a modern full-stack architecture:

1. **Backend Setup** - Node.js/Express with PostgreSQL
2. **Algorithm Migration** - Ported sophisticated tax harvesting logic
3. **React Frontend** - Modern SPA with TypeScript
4. **Feature Enhancement** - Added cash raising mode and advanced UI

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Designed for financial professionals and portfolio managers
- Optimized for tax efficiency and compliance

---

**Ready for production use with comprehensive tax harvesting and portfolio management capabilities!** 🚀