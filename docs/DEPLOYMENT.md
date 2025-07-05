# RSSFeeder Deployment Guide

## Overview

This guide covers deploying RSSFeeder in different environments, from local development to production. The application consists of a Vue 3 frontend, Node.js/Express backend, and SQLite database.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: For version control
- **SQLite**: 3.x (included with Node.js)

### Production Additional Requirements
- **Linux server**: Ubuntu 20.04+ or CentOS 8+
- **Nginx**: For reverse proxy and static file serving
- **PM2**: For process management
- **SSL Certificate**: Let's Encrypt or commercial certificate

## Environment Setup

### Development Environment

#### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/your-org/rssfeeder.git
cd rssfeeder

# Install dependencies
npm install

# Install PM2 globally (optional for development)
npm install -g pm2
```

#### 2. Environment Configuration
Create environment files:

```bash
# Development environment
cp .env.example .env.development
```

**`.env.development`**
```env
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=./data/rssfeeder-dev.db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT Configuration
JWT_SECRET=your-dev-jwt-secret-here
JWT_EXPIRES_IN=7d

# Feed Polling
FEED_POLL_INTERVAL=300000
FEED_POLL_CONCURRENCY=5
FEED_TIMEOUT=30000

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=RSSFeeder <noreply@rssfeeder.com>
```

#### 3. Database Setup
```bash
# Create data directory
mkdir -p data

# Run migrations
npm run migrate:dev

# Optional: Seed with sample data
npm run seed:dev
```

#### 4. Development Server
```bash
# Start both frontend and backend in development mode
npm run dev

# Or start individually
npm run dev:backend    # Backend on port 3000
npm run dev:frontend   # Frontend on port 5173
```

### Staging Environment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash rssfeeder
sudo mkdir -p /var/www/rssfeeder
sudo chown rssfeeder:rssfeeder /var/www/rssfeeder
```

#### 2. Application Deployment
```bash
# Switch to application user
sudo su - rssfeeder

# Clone repository
cd /var/www/rssfeeder
git clone https://github.com/your-org/rssfeeder.git .

# Install dependencies
npm ci --production

# Create environment file
cp .env.example .env.staging
```

**`.env.staging`**
```env
# Application
NODE_ENV=staging
PORT=3000
FRONTEND_URL=https://staging.rssfeeder.com

# Database
DATABASE_URL=./data/rssfeeder-staging.db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT Configuration
JWT_SECRET=your-staging-jwt-secret-here
JWT_EXPIRES_IN=7d

# Feed Polling
FEED_POLL_INTERVAL=300000
FEED_POLL_CONCURRENCY=5
FEED_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=RSSFeeder Staging <noreply@rssfeeder.com>
```

#### 3. Build and Start
```bash
# Build frontend
npm run build

# Run database migrations
npm run migrate:staging

# Start with PM2
pm2 start ecosystem.config.js --env staging
pm2 save
pm2 startup
```

### Production Environment

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw fail2ban

# Configure firewall
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Create application user
sudo useradd -m -s /bin/bash rssfeeder
sudo mkdir -p /var/www/rssfeeder
sudo chown rssfeeder:rssfeeder /var/www/rssfeeder
```

#### 2. Application Deployment
```bash
# Switch to application user
sudo su - rssfeeder
cd /var/www/rssfeeder

# Clone and setup
git clone https://github.com/your-org/rssfeeder.git .
npm ci --production

# Create production environment
cp .env.example .env.production
```

**`.env.production`**
```env
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://rssfeeder.com

# Database
DATABASE_URL=./data/rssfeeder.db
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# JWT Configuration
JWT_SECRET=your-super-secure-production-jwt-secret-here
JWT_EXPIRES_IN=24h

# Feed Polling
FEED_POLL_INTERVAL=300000
FEED_POLL_CONCURRENCY=10
FEED_TIMEOUT=30000

# Logging
LOG_LEVEL=warn
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=RSSFeeder <noreply@rssfeeder.com>

# Security
HELMET_ENABLED=true
CORS_ORIGIN=https://rssfeeder.com
```

#### 3. PM2 Configuration
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'rssfeeder',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      
      // Auto-restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000
      }
    }
  ]
}
```

#### 4. Nginx Configuration
Create `/etc/nginx/sites-available/rssfeeder`:

```nginx
server {
    listen 80;
    server_name rssfeeder.com www.rssfeeder.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rssfeeder.com www.rssfeeder.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/rssfeeder.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rssfeeder.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static files
    location /assets {
        alias /var/www/rssfeeder/frontend/dist/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Frontend SPA
    location / {
        root /var/www/rssfeeder/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rssfeeder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL Certificate Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d rssfeeder.com -d www.rssfeeder.com

# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 6. Database and Final Setup
```bash
# Create necessary directories
sudo -u rssfeeder mkdir -p /var/www/rssfeeder/data
sudo -u rssfeeder mkdir -p /var/www/rssfeeder/logs

# Build application
sudo -u rssfeeder npm run build

# Run migrations
sudo -u rssfeeder npm run migrate:production

# Start application
sudo -u rssfeeder pm2 start ecosystem.config.js --env production
sudo -u rssfeeder pm2 save

# Setup PM2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u rssfeeder --hp /home/rssfeeder
```

## Docker Deployment

### 1. Dockerfile
Create `Dockerfile`:

```dockerfile
# Frontend build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend build stage
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install SQLite
RUN apk add --no-cache sqlite

# Copy backend
COPY backend/ ./backend/
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy frontend build
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copy configuration
COPY package.json ./
COPY ecosystem.config.js ./

# Create data directory
RUN mkdir -p data logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "backend/server.js"]
```

### 2. Docker Compose
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  rssfeeder:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=./data/rssfeeder.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - rssfeeder
    restart: unless-stopped
```

### 3. Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale rssfeeder=3
```

## Monitoring and Maintenance

### 1. Health Monitoring
Create `backend/routes/health.js`:

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});

module.exports = router;
```

### 2. PM2 Monitoring
```bash
# View processes
pm2 status

# Monitor logs
pm2 logs

# Monitor resources
pm2 monit

# Restart application
pm2 restart rssfeeder

# Update and restart
pm2 reload rssfeeder
```

### 3. Log Management
Setup log rotation in `/etc/logrotate.d/rssfeeder`:

```
/var/www/rssfeeder/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. Database Backup
Create backup script `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/rssfeeder"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/rssfeeder"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/data/rssfeeder.db $BACKUP_DIR/rssfeeder_$DATE.db

# Backup environment
cp $APP_DIR/.env.production $BACKUP_DIR/.env.production_$DATE

# Compress old backups
find $BACKUP_DIR -name "*.db" -type f -mtime +7 -exec gzip {} \;

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/rssfeeder_$DATE.db"
```

Setup cron job:
```bash
# Edit crontab
sudo crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /var/www/rssfeeder/scripts/backup.sh >> /var/log/rssfeeder-backup.log 2>&1
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Build frontend
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/rssfeeder
          git pull origin main
          npm ci --production
          npm run build
          npm run migrate:production
          pm2 reload rssfeeder
```

### 2. Environment Secrets
Add to GitHub repository secrets:
- `HOST`: Server IP address
- `USERNAME`: SSH username
- `SSH_KEY`: Private SSH key
- `JWT_SECRET`: Production JWT secret

## Performance Optimization

### 1. Node.js Optimization
In `backend/server.js`:

```javascript
const cluster = require('cluster');
const os = require('os');

// Enable cluster mode in production
if (process.env.NODE_ENV === 'production' && cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Starting ${numCPUs} workers`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Start server
  require('./app');
}
```

### 2. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feeditem_feed_published 
ON FeedItem(feed_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_readstate_user_item 
ON ReadState(user_id, item_id);

CREATE INDEX IF NOT EXISTS idx_bookmark_user_item 
ON Bookmark(user_id, item_id);
```

### 3. Caching Strategy
```javascript
// Redis caching (optional)
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

## Security Best Practices

### 1. Environment Variables
Never commit sensitive data:
```bash
# Add to .gitignore
.env*
!.env.example
data/
logs/
```

### 2. Security Headers
```javascript
// In backend/app.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
```

### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs rssfeeder

# Check port conflicts
sudo netstat -tulpn | grep :3000

# Check environment
pm2 env rssfeeder
```

#### 2. Database Connection Issues
```bash
# Check database file permissions
ls -la /var/www/rssfeeder/data/

# Test database connection
sqlite3 /var/www/rssfeeder/data/rssfeeder.db ".tables"
```

#### 3. Nginx Configuration Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### 4. SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew --nginx
```

### Performance Issues

#### 1. High Memory Usage
```bash
# Monitor memory
pm2 monit

# Restart with memory limit
pm2 restart rssfeeder --max-memory-restart 1G
```

#### 2. Slow Database Queries
```sql
-- Enable query logging
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000000;
PRAGMA temp_store = MEMORY;
```

#### 3. High CPU Usage
```bash
# Check process CPU usage
top -p $(pgrep -f rssfeeder)

# Profile Node.js application
node --prof backend/server.js
```

## Rollback Strategy

### 1. Application Rollback
```bash
# Tag current version
git tag -a v1.0.0 -m "Version 1.0.0"

# Rollback to previous version
git checkout v0.9.0
npm ci --production
npm run build
pm2 reload rssfeeder
```

### 2. Database Rollback
```bash
# Rollback migrations
npm run migrate:rollback

# Restore from backup
cp /var/backups/rssfeeder/rssfeeder_20240101_120000.db /var/www/rssfeeder/data/rssfeeder.db
```

This comprehensive deployment guide covers all aspects of deploying RSSFeeder from development to production, including monitoring, security, and troubleshooting.
