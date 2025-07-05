#!/usr/bin/env node

/**
 * RSSFeeder Setup Validation Script
 * 
 * This script validates that the development environment is properly set up
 * without starting the full server. Useful for CI/CD and quick checks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => {
    console.log(`\n${colors.cyan}${'='.repeat(50)}`);
    console.log(`${colors.cyan} ${msg} ${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
  }
};

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
    this.passed = 0;
  }

  check(description, testFn) {
    this.checks++;
    log.info(`Checking: ${description}`);
    
    try {
      const result = testFn();
      if (result !== false) {
        this.passed++;
        log.success(`✓ ${description}`);
        return true;
      } else {
        this.errors.push(description);
        log.error(`✗ ${description}`);
        return false;
      }
    } catch (error) {
      this.errors.push(`${description}: ${error.message}`);
      log.error(`✗ ${description}: ${error.message}`);
      return false;
    }
  }

  warn(description, testFn) {
    log.info(`Checking: ${description}`);
    
    try {
      const result = testFn();
      if (result !== false) {
        log.success(`✓ ${description}`);
        return true;
      } else {
        this.warnings.push(description);
        log.warning(`⚠ ${description}`);
        return false;
      }
    } catch (error) {
      this.warnings.push(`${description}: ${error.message}`);
      log.warning(`⚠ ${description}: ${error.message}`);
      return false;
    }
  }

  // Node.js version check
  checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    if (major < 18) {
      throw new Error(`Node.js ${version} is too old. Please install Node.js 18+`);
    }
    return `Node.js ${version}`;
  }

  // Package.json exists and has required fields
  checkPackageJson() {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error('package.json not found');
    }
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const required = ['name', 'version', 'main', 'scripts', 'dependencies'];
    
    for (const field of required) {
      if (!pkg[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return `Package: ${pkg.name}@${pkg.version}`;
  }

  // Node modules installed
  checkNodeModules() {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      throw new Error('node_modules directory not found. Run npm install');
    }
    
    // Check for key dependencies
    const keyDeps = ['express', 'knex', 'sqlite3', 'jest'];
    for (const dep of keyDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (!fs.existsSync(depPath)) {
        throw new Error(`Required dependency ${dep} not found`);
      }
    }
    
    return 'All key dependencies installed';
  }

  // Backend structure exists
  checkBackendStructure() {
    const requiredDirs = [
      'backend',
      'backend/controllers',
      'backend/models', 
      'backend/routes',
      'backend/middlewares',
      'backend/utils',
      'backend/tests',
      'backend/db',
      'backend/db/migrations'
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required directory ${dir} not found`);
      }
    }
    
    return 'Backend directory structure complete';
  }

  // Required files exist
  checkRequiredFiles() {
    const requiredFiles = [
      'backend/app.js',
      'backend/config.js',
      'backend/knexfile.js',
      'backend/db/database.js',
      'backend/utils/logger.js',
      'backend/middlewares/errorHandler.js'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file ${file} not found`);
      }
    }
    
    return 'All required files present';
  }

  // Environment file exists
  checkEnvironmentFile() {
    const envFile = '.env.development';
    if (!fs.existsSync(envFile)) {
      throw new Error(`${envFile} not found. Run setup script to create it`);
    }
    
    const envContent = fs.readFileSync(envFile, 'utf8');
    const requiredVars = [
      'NODE_ENV',
      'PORT', 
      'DATABASE_URL',
      'JWT_SECRET'
    ];
    
    for (const envVar of requiredVars) {
      if (!envContent.includes(`${envVar}=`)) {
        throw new Error(`Required environment variable ${envVar} not found`);
      }
    }
    
    return 'Environment file configured';
  }

  // Database migrations exist
  checkMigrations() {
    const migrationsDir = 'backend/db/migrations';
    if (!fs.existsSync(migrationsDir)) {
      throw new Error('Migrations directory not found');
    }
    
    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    if (migrations.length === 0) {
      throw new Error('No migration files found');
    }
    
    // Check for key migrations
    const hasUsers = migrations.some(m => m.includes('Users'));
    const hasFeeds = migrations.some(m => m.includes('Feeds'));
    
    if (!hasUsers || !hasFeeds) {
      throw new Error('Key migrations (Users, Feeds) not found');
    }
    
    return `${migrations.length} migration files found`;
  }

  // Data directories exist
  checkDataDirectories() {
    const requiredDirs = ['data', 'logs', 'uploads'];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required directory ${dir} not found`);
      }
    }
    
    return 'Data directories created';
  }

  // Test files exist
  checkTestFiles() {
    const testDir = 'backend/tests';
    if (!fs.existsSync(testDir)) {
      throw new Error('Tests directory not found');
    }
    
    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
    if (testFiles.length === 0) {
      throw new Error('No test files found');
    }
    
    return `${testFiles.length} test files found`;
  }

  // Config can be loaded
  checkConfigLoading() {
    try {
      // Temporarily set NODE_ENV for testing
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      // Try to require the config
      delete require.cache[require.resolve('../backend/config.js')];
      const config = require('../backend/config.js');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      
      if (!config.PORT || !config.DATABASE_URL) {
        throw new Error('Config missing required properties');
      }
      
      return `Config loaded (PORT: ${config.PORT})`;
    } catch (error) {
      throw new Error(`Config loading failed: ${error.message}`);
    }
  }

  // Database file can be created (test mode)
  checkDatabaseCreation() {
    try {
      // Set test environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      // Try to create database connection
      delete require.cache[require.resolve('../backend/db/database.js')];
      const { db } = require('../backend/db/database.js');
      
      // Test basic query
      const result = db.raw('SELECT 1 as test');
      
      // Clean up
      db.destroy();
      process.env.NODE_ENV = originalEnv;
      
      return 'Database connection successful';
    } catch (error) {
      throw new Error(`Database creation failed: ${error.message}`);
    }
  }

  // Lint configuration
  checkLintConfig() {
    const eslintConfig = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js'];
    const hasEslintConfig = eslintConfig.some(file => fs.existsSync(file));
    
    if (!hasEslintConfig) {
      return false; // This is a warning, not an error
    }
    
    return 'ESLint configuration found';
  }

  // Git repository
  checkGitRepo() {
    if (!fs.existsSync('.git')) {
      return false; // This is a warning, not an error
    }
    
    return 'Git repository initialized';
  }

  // Run all checks
  async run() {
    log.header('RSSFeeder Setup Validation');
    
    console.log('This script validates your development environment setup.\n');
    
    // Critical checks (must pass)
    this.check('Node.js version 18+', () => this.checkNodeVersion());
    this.check('Package.json configuration', () => this.checkPackageJson());
    this.check('Dependencies installed', () => this.checkNodeModules());
    this.check('Backend directory structure', () => this.checkBackendStructure());
    this.check('Required files present', () => this.checkRequiredFiles());
    this.check('Environment configuration', () => this.checkEnvironmentFile());
    this.check('Database migrations', () => this.checkMigrations());
    this.check('Data directories', () => this.checkDataDirectories());
    this.check('Test files', () => this.checkTestFiles());
    this.check('Configuration loading', () => this.checkConfigLoading());
    this.check('Database connectivity', () => this.checkDatabaseCreation());
    
    // Optional checks (warnings only)
    this.warn('ESLint configuration', () => this.checkLintConfig());
    this.warn('Git repository', () => this.checkGitRepo());
    
    // Summary
    log.header('Validation Summary');
    
    console.log(`Checks completed: ${this.checks}`);
    console.log(`Passed: ${colors.green}${this.passed}${colors.reset}`);
    
    if (this.warnings.length > 0) {
      console.log(`Warnings: ${colors.yellow}${this.warnings.length}${colors.reset}`);
      this.warnings.forEach(warning => log.warning(warning));
    }
    
    if (this.errors.length > 0) {
      console.log(`Errors: ${colors.red}${this.errors.length}${colors.reset}`);
      this.errors.forEach(error => log.error(error));
      
      console.log(`\n${colors.red}Setup validation failed!${colors.reset}`);
      console.log('Please run the setup script: npm run setup');
      process.exit(1);
    } else {
      console.log(`\n${colors.green}✅ Setup validation passed!${colors.reset}`);
      console.log('Your RSSFeeder development environment is ready.');
      console.log('\nNext steps:');
      console.log('  npm run dev:backend  - Start the development server');
      console.log('  npm test            - Run the test suite');
      console.log('  npm run check       - Run linting and tests');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SetupValidator();
  validator.run().catch(error => {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = SetupValidator; 