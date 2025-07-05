@echo off
REM RSSFeeder Development Environment Setup Script (Windows)
REM This script sets up everything needed to start developing RSSFeeder

setlocal enabledelayedexpansion

echo.
echo ================================================
echo  RSSFeeder Development Environment Setup
echo ================================================
echo.

echo This script will set up your RSSFeeder development environment by:
echo 1. Checking system requirements
echo 2. Installing dependencies
echo 3. Creating required directories
echo 4. Setting up environment configuration
echo 5. Running database migrations
echo 6. Running tests to verify setup
echo.

set /p continue="Continue with setup? (y/n): "
if /i not "%continue%"=="y" (
    echo Setup cancelled
    goto :eof
)

REM Check if Node.js is installed
echo.
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js %NODE_VERSION% detected

REM Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo [SUCCESS] npm %NPM_VERSION% detected

REM Install dependencies
echo.
echo ================================================
echo  Installing Dependencies
echo ================================================
echo.
echo [INFO] Installing Node.js dependencies...
call npm install --no-optional
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Create required directories
echo.
echo ================================================
echo  Creating Required Directories
echo ================================================
echo.

if not exist "data" (
    mkdir "data"
    echo [INFO] Created directory: data
) else (
    echo [INFO] Directory already exists: data
)

if not exist "logs" (
    mkdir "logs"
    echo [INFO] Created directory: logs
) else (
    echo [INFO] Directory already exists: logs
)

if not exist "uploads" (
    mkdir "uploads"
    echo [INFO] Created directory: uploads
) else (
    echo [INFO] Directory already exists: uploads
)

if not exist "backend\db\seeds" (
    mkdir "backend\db\seeds"
    echo [INFO] Created directory: backend\db\seeds
) else (
    echo [INFO] Directory already exists: backend\db\seeds
)

echo [SUCCESS] All required directories created

REM Set up environment file
echo.
echo ================================================
echo  Setting Up Environment
echo ================================================
echo.

if not exist ".env.development" (
    echo [INFO] Creating .env.development file...
    (
    echo # Application Configuration
    echo NODE_ENV=development
    echo PORT=3000
    echo FRONTEND_URL=http://localhost:5173
    echo.
    echo # Database Configuration
    echo DATABASE_URL=./data/rssfeeder-dev.db
    echo DATABASE_POOL_MIN=2
    echo DATABASE_POOL_MAX=10
    echo.
    echo # JWT Configuration
    echo JWT_SECRET=development-jwt-secret-key-change-in-production
    echo JWT_EXPIRES_IN=7d
    echo JWT_REFRESH_EXPIRES_IN=30d
    echo.
    echo # Feed Polling Configuration
    echo FEED_POLL_INTERVAL=300000
    echo FEED_POLL_CONCURRENCY=5
    echo FEED_TIMEOUT=30000
    echo FEED_MAX_ITEMS_PER_FEED=100
    echo.
    echo # Security Configuration
    echo BCRYPT_SALT_ROUNDS=10
    echo COOKIE_SECRET=development-cookie-secret-key-change-in-production
    echo.
    echo # Rate Limiting
    echo RATE_LIMIT_WINDOW=15
    echo RATE_LIMIT_MAX=100
    echo RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
    echo.
    echo # File Upload Configuration
    echo UPLOAD_DIR=./uploads
    echo MAX_FILE_SIZE=5242880
    echo ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
    echo.
    echo # Logging Configuration
    echo LOG_LEVEL=debug
    echo LOG_FILE=./logs/app.log
    echo LOG_MAX_SIZE=20m
    echo LOG_MAX_FILES=14d
    echo.
    echo # Email Configuration
    echo SMTP_HOST=smtp.gmail.com
    echo SMTP_PORT=587
    echo SMTP_SECURE=false
    echo SMTP_USER=your-email@gmail.com
    echo SMTP_PASS=your-app-password
    echo SMTP_FROM=RSSFeeder ^<noreply@rssfeeder.com^>
    echo.
    echo # Cache Configuration
    echo CACHE_TTL=300
    echo CACHE_MAX_SIZE=1000
    echo.
    echo # External API Configuration
    echo USER_AGENT=RSSFeeder/1.0.0 ^(https://github.com/your-org/rssfeeder^)
    echo.
    echo # Development/Debug Configuration
    echo DEBUG=rssfeeder:*
    echo VERBOSE_LOGGING=true
    echo ENABLE_CORS=true
    echo TRUST_PROXY=false
    echo.
    echo # Database Migration Configuration
    echo MIGRATIONS_DIR=./backend/db/migrations
    echo SEEDS_DIR=./backend/db/seeds
    ) > .env.development
    echo [SUCCESS] Created .env.development file
) else (
    echo [INFO] .env.development already exists
)

REM Run database migrations
echo.
echo ================================================
echo  Setting Up Database
echo ================================================
echo.
echo [INFO] Running database migrations...
call npm run migrate:dev
if errorlevel 1 (
    echo [ERROR] Failed to run database migrations
    pause
    exit /b 1
)
echo [SUCCESS] Database migrations completed successfully

REM Run tests
echo.
echo ================================================
echo  Running Tests
echo ================================================
echo.
echo [INFO] Running test suite...
call npm test
if errorlevel 1 (
    echo [WARNING] Some tests failed. Check the output above for details.
    echo You can continue with development, but consider fixing failing tests.
) else (
    echo [SUCCESS] All tests passed!
)

REM Setup complete
echo.
echo ================================================
echo  Starting Development Server
echo ================================================
echo.
echo [SUCCESS] Setup complete! 🚀
echo.
echo Your RSSFeeder development environment is ready!
echo.
echo Available commands:
echo   npm run dev:backend    - Start backend server only
echo   npm run dev:frontend   - Start frontend only (when implemented)
echo   npm run dev           - Start both backend and frontend
echo   npm test             - Run test suite
echo   npm run migrate:dev  - Run database migrations
echo.
echo Backend will be available at: http://localhost:3000
echo API documentation at: http://localhost:3000/api/v1
echo Health check at: http://localhost:3000/health
echo.

set /p startserver="Would you like to start the backend server now? (y/n): "
if /i "%startserver%"=="y" (
    echo [INFO] Starting backend server...
    call npm run dev:backend
) else (
    echo [INFO] You can start the server later with: npm run dev:backend
    pause
) 