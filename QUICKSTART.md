# 🚀 RSSFeeder Quick Start Guide

Get your RSSFeeder development environment up and running in minutes!

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed
- **Terminal/Command Prompt** access

## Quick Setup

### Option 1: Automatic Setup (Recommended)

Run the cross-platform setup script that handles everything automatically:

```bash
npm run setup
```

This single command will:
- ✅ Check system requirements
- ✅ Install all dependencies
- ✅ Create required directories
- ✅ Set up environment configuration
- ✅ Initialize the database
- ✅ Run the test suite
- ✅ Optionally start the development server

### Option 2: Platform-Specific Setup

#### On macOS/Linux:
```bash
bash scripts/setup.sh
```

#### On Windows:
```bash
scripts\setup.bat
```

### Option 3: Manual Setup

If you prefer to set up manually:

```bash
# 1. Install dependencies
npm install

# 2. Create required directories
mkdir -p data logs uploads backend/db/seeds

# 3. Set up environment (copy the template from scripts/setup.sh)
# Create .env.development file with your configuration

# 4. Run database migrations
npm run migrate:dev

# 5. Run tests to verify setup
npm test

# 6. Start the development server
npm run dev:backend
```

## Verification

After setup, verify everything is working:

### 1. Check Server Health
```bash
# Option A: Use npm script
npm run health

# Option B: Direct curl
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 45.123,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "healthy",
    "responseTime": 2,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 2. Test API Endpoint
```bash
curl http://localhost:3000/api/v1
```

Expected response:
```json
{
  "success": true,
  "message": "Welcome to RSSFeeder API",
  "version": "v1",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Run Test Suite
```bash
npm test
```

All tests should pass with 80%+ coverage.

## Development Commands

Once set up, use these commands for development:

### Server Management
```bash
npm run dev:backend     # Start backend server only
npm run dev:frontend    # Start frontend only (when implemented)
npm run dev            # Start both backend and frontend
npm start              # Start production server
```

### Database Management
```bash
npm run migrate:dev     # Run database migrations
npm run migrate:rollback # Rollback last migration
npm run db:reset       # Reset database (rollback all + migrate)
npm run clean:db       # Delete database files
```

### Testing & Quality
```bash
npm test              # Run test suite
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run check         # Run linting and tests
npm run stage:check   # Verify Stage B1 completion
```

### Code Quality
```bash
npm run lint          # Check code style
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
```

### Maintenance
```bash
npm run clean         # Clean install (remove node_modules)
npm run clean:logs    # Clear log files
npm run reset         # Reset database and migrate
npm run health        # Check server health
```

## Project Structure

After setup, your project structure will look like:

```
rssfeeder/
├── backend/                 # Backend application
│   ├── controllers/         # Route controllers
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── middlewares/        # Express middleware
│   ├── utils/              # Utility functions
│   ├── tests/              # Test files
│   ├── db/                 # Database files
│   │   ├── migrations/     # Database migrations
│   │   └── seeds/          # Database seeds
│   ├── app.js              # Express application
│   ├── config.js           # Configuration
│   └── knexfile.js         # Database configuration
├── data/                   # SQLite database files
├── logs/                   # Application logs
├── uploads/                # File uploads
├── scripts/                # Setup scripts
├── docs/                   # Documentation
├── .env.development        # Environment variables
└── package.json            # Project configuration
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
If port 3000 is already in use:
```bash
# Change port in .env.development
PORT=3001
```

#### 2. Database Connection Issues
```bash
# Reset the database
npm run reset
```

#### 3. Permission Issues (macOS/Linux)
```bash
# Make setup script executable
chmod +x scripts/setup.sh
```

#### 4. Node.js Version Issues
Ensure you have Node.js 18+:
```bash
node --version  # Should show v18.x.x or higher
```

### Getting Help

If you encounter issues:

1. **Check the logs**: `tail -f logs/app.log`
2. **Run health check**: `npm run health`
3. **Verify tests**: `npm test`
4. **Reset environment**: `npm run reset`

## What's Next?

After successful setup:

1. **Explore the API**: Visit `http://localhost:3000/api/v1`
2. **Check the docs**: Read `docs/API.md` for API documentation
3. **Review the plan**: See `docs/DEVELOPMENT_STAGE_PLAN.md` for next stages
4. **Start coding**: Begin with Stage B2 (User Authentication)

## Available Endpoints

- **Health Check**: `GET /health`
- **API Welcome**: `GET /api/v1`
- **Static Files**: `GET /uploads/*`

## Configuration

Environment variables are loaded from `.env.development`:

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - SQLite database path
- `JWT_SECRET` - JWT signing secret
- `LOG_LEVEL` - Logging verbosity
- And many more...

See the `.env.development` file for all configuration options.

## Success! 🎉

You now have a fully functional RSSFeeder development environment ready for Stage B2 implementation!

The backend server is running at: **http://localhost:3000** 