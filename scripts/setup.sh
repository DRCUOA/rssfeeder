#!/bin/bash

# RSSFeeder Development Environment Setup Script
# This script sets up everything needed to start developing RSSFeeder

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    print_success "Node.js $NODE_VERSION detected"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION detected"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_status "Installing Node.js dependencies..."
    npm install --no-optional
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Create required directories
create_directories() {
    print_header "Creating Required Directories"
    
    DIRS=("data" "logs" "uploads" "backend/db/seeds")
    
    for dir in "${DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        else
            print_status "Directory already exists: $dir"
        fi
    done
    
    print_success "All required directories created"
}

# Set up environment file
setup_environment() {
    print_header "Setting Up Environment"
    
    if [ ! -f ".env.development" ]; then
        print_status "Creating .env.development file..."
        cat > .env.development << 'EOF'
# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DATABASE_URL=./data/rssfeeder-dev.db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT Configuration
JWT_SECRET=development-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Feed Polling Configuration
FEED_POLL_INTERVAL=300000
FEED_POLL_CONCURRENCY=5
FEED_TIMEOUT=30000
FEED_MAX_ITEMS_PER_FEED=100

# Security Configuration
BCRYPT_SALT_ROUNDS=10
COOKIE_SECRET=development-cookie-secret-key-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# Email Configuration (for notifications and password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=RSSFeeder <noreply@rssfeeder.com>

# Cache Configuration
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# External API Configuration
USER_AGENT=RSSFeeder/1.0.0 (https://github.com/your-org/rssfeeder)

# Development/Debug Configuration
DEBUG=rssfeeder:*
VERBOSE_LOGGING=true
ENABLE_CORS=true
TRUST_PROXY=false

# Database Migration Configuration
MIGRATIONS_DIR=./backend/db/migrations
SEEDS_DIR=./backend/db/seeds
EOF
        print_success "Created .env.development file"
    else
        print_status ".env.development already exists"
    fi
}

# Run database migrations
setup_database() {
    print_header "Setting Up Database"
    
    print_status "Running database migrations..."
    npm run migrate:dev
    
    if [ $? -eq 0 ]; then
        print_success "Database migrations completed successfully"
    else
        print_error "Failed to run database migrations"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_status "Running test suite..."
    npm test
    
    if [ $? -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_warning "Some tests failed. Check the output above for details."
        echo "You can continue with development, but consider fixing failing tests."
    fi
}

# Start development server
start_server() {
    print_header "Starting Development Server"
    
    print_success "Setup complete! 🚀"
    echo ""
    echo "Your RSSFeeder development environment is ready!"
    echo ""
    echo "Available commands:"
    echo "  npm run dev:backend    - Start backend server only"
    echo "  npm run dev:frontend   - Start frontend only (when implemented)"
    echo "  npm run dev           - Start both backend and frontend"
    echo "  npm test             - Run test suite"
    echo "  npm run migrate:dev  - Run database migrations"
    echo ""
    echo "Backend will be available at: http://localhost:3000"
    echo "API documentation at: http://localhost:3000/api/v1"
    echo "Health check at: http://localhost:3000/health"
    echo ""
    
    read -p "Would you like to start the backend server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting backend server..."
        npm run dev:backend
    else
        print_status "You can start the server later with: npm run dev:backend"
    fi
}

# Main execution
main() {
    print_header "RSSFeeder Development Environment Setup"
    
    echo "This script will set up your RSSFeeder development environment by:"
    echo "1. Checking system requirements"
    echo "2. Installing dependencies"
    echo "3. Creating required directories"
    echo "4. Setting up environment configuration"
    echo "5. Running database migrations"
    echo "6. Running tests to verify setup"
    echo ""
    
    read -p "Continue with setup? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setup cancelled"
        exit 0
    fi
    
    check_node
    check_npm
    install_dependencies
    create_directories
    setup_environment
    setup_database
    run_tests
    start_server
}

# Run main function
main "$@" 