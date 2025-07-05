#!/usr/bin/env node

/**
 * Test Logging Demo Script
 * 
 * This script demonstrates the comprehensive test logging system by running
 * various test scenarios and showing the log outputs.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => {
    console.log(`\n${colors.cyan}${'='.repeat(60)}`);
    console.log(`${colors.cyan} ${msg} ${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  }
};

class TestDemo {
  constructor() {
    this.scenarios = [
      { name: 'Basic Test Logging', command: 'npm run test:log' },
      { name: 'Coverage with Logging', command: 'npm run test:log:coverage' },
      { name: 'Performance Analysis', command: 'npm run test:log:performance' },
      { name: 'CI/CD Integration', command: 'npm run test:log:cicd' },
      { name: 'Full Analysis', command: 'npm run test:log:full' }
    ];
  }

  // Show available scenarios
  showScenarios() {
    log.header('Available Test Logging Scenarios');
    
    this.scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${colors.cyan}${scenario.name}${colors.reset}`);
      console.log(`   Command: ${colors.yellow}${scenario.command}${colors.reset}\n`);
    });
  }

  // Run a specific scenario
  async runScenario(index) {
    if (index < 0 || index >= this.scenarios.length) {
      log.error('Invalid scenario index');
      return;
    }

    const scenario = this.scenarios[index];
    log.header(`Running: ${scenario.name}`);
    log.info(`Command: ${scenario.command}`);

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', scenario.command.split(' ').slice(2).join(' ')], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          log.success(`${scenario.name} completed successfully`);
        } else {
          log.warning(`${scenario.name} completed with exit code: ${code}`);
        }
        resolve(code);
      });

      child.on('error', (error) => {
        log.error(`Error running ${scenario.name}: ${error.message}`);
        reject(error);
      });
    });
  }

  // Show log files
  showLogFiles() {
    log.header('Generated Log Files');
    
    const logsDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logsDir)) {
      log.warning('No logs directory found. Run a test scenario first.');
      return;
    }

    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.includes('test-'))
      .sort();

    if (logFiles.length === 0) {
      log.warning('No test log files found. Run a test scenario first.');
      return;
    }

    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      
      console.log(`📄 ${colors.cyan}${file}${colors.reset}`);
      console.log(`   Size: ${size} KB | Modified: ${stats.mtime.toLocaleString()}`);
      
      // Show first few lines for latest files
      if (file.includes('latest')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').slice(0, 3);
          lines.forEach(line => {
            if (line.trim()) {
              console.log(`   ${colors.yellow}${line}${colors.reset}`);
            }
          });
        } catch (error) {
          console.log(`   ${colors.red}Error reading file${colors.reset}`);
        }
      }
      console.log();
    });
  }

  // Interactive mode
  async interactive() {
    log.header('Test Logging Demo - Interactive Mode');
    
    console.log('This demo showcases the comprehensive test logging system.');
    console.log('Choose a scenario to run and see the logging in action.\n');

    this.showScenarios();
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    try {
      while (true) {
        const choice = await askQuestion(`Enter scenario number (1-${this.scenarios.length}), 'logs' to view log files, or 'exit' to quit: `);
        
        if (choice.toLowerCase() === 'exit') {
          break;
        } else if (choice.toLowerCase() === 'logs') {
          this.showLogFiles();
        } else {
          const index = parseInt(choice) - 1;
          if (!isNaN(index)) {
            await this.runScenario(index);
            console.log('\n');
          } else {
            log.error('Please enter a valid number, "logs", or "exit"');
          }
        }
      }
    } finally {
      rl.close();
    }
  }

  // Quick demo mode
  async quickDemo() {
    log.header('Test Logging Demo - Quick Mode');
    
    log.info('Running a quick demonstration of test logging...');
    
    // Run basic test logging
    await this.runScenario(0);
    
    // Show results
    this.showLogFiles();
    
    log.success('Quick demo completed! Check the logs directory for results.');
  }

  // Show help
  showHelp() {
    console.log(`
${colors.cyan}Test Logging Demo${colors.reset}

Usage: node scripts/test-demo.js [mode]

Modes:
  interactive  Start interactive demo (default)
  quick        Run a quick demonstration
  logs         Show existing log files
  help         Show this help message

Examples:
  node scripts/test-demo.js
  node scripts/test-demo.js quick
  node scripts/test-demo.js logs

This demo showcases:
  ✅ Test result logging to files
  ✅ Coverage reporting and logging
  ✅ Performance analysis and slow test detection
  ✅ CI/CD friendly JSON output
  ✅ Historical log retention
  ✅ Comprehensive error tracking
`);
  }

  // Main execution
  async run() {
    const mode = process.argv[2] || 'interactive';
    
    switch (mode) {
      case 'interactive':
        await this.interactive();
        break;
      case 'quick':
        await this.quickDemo();
        break;
      case 'logs':
        this.showLogFiles();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        log.error(`Unknown mode: ${mode}`);
        this.showHelp();
        process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const demo = new TestDemo();
  demo.run().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

module.exports = TestDemo; 