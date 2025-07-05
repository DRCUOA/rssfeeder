#!/usr/bin/env node

/**
 * Enhanced Test Runner with Comprehensive Logging
 * 
 * This script provides different test execution modes with detailed logging:
 * - Standard tests with logging
 * - Coverage tests with reports
 * - Performance analysis
 * - CI/CD integration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { testLogger } = require('../backend/utils/testLogger');

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

class TestRunner {
  constructor() {
    this.mode = 'standard';
    this.options = {
      coverage: false,
      performance: false,
      cicd: false,
      watch: false,
      verbose: false,
      clean: false
    };
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
      switch (arg) {
        case '--coverage':
          this.options.coverage = true;
          break;
        case '--performance':
          this.options.performance = true;
          break;
        case '--cicd':
          this.options.cicd = true;
          break;
        case '--watch':
          this.options.watch = true;
          break;
        case '--verbose':
          this.options.verbose = true;
          break;
        case '--clean':
          this.options.clean = true;
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
        default:
          if (arg.startsWith('--')) {
            log.warning(`Unknown option: ${arg}`);
          }
      }
    });
  }

  // Show help message
  showHelp() {
    console.log(`
${colors.cyan}Enhanced Test Runner${colors.reset}

Usage: node scripts/test-runner.js [options]

Options:
  --coverage     Run tests with coverage reporting
  --performance  Enable performance analysis and slow test detection
  --cicd         Generate CI/CD friendly JSON reports
  --watch        Run tests in watch mode
  --verbose      Enable verbose logging
  --clean        Clean old log files before running tests
  --help         Show this help message

Examples:
  node scripts/test-runner.js --coverage --performance
  node scripts/test-runner.js --cicd --clean
  node scripts/test-runner.js --watch --verbose

Log Files:
  ./logs/test-results-latest.log    - Latest test results
  ./logs/test-coverage-latest.log   - Coverage reports
  ./logs/test-performance-latest.log - Performance analysis
  ./logs/test-results-cicd.json     - CI/CD integration data
`);
  }

  // Clean old log files
  cleanLogs() {
    if (this.options.clean) {
      log.info('Cleaning old log files...');
      testLogger.cleanOldLogs();
    }
  }

  // Build Jest command
  buildJestCommand() {
    let command = 'jest';
    let args = [];

         // Add our custom reporter
     args.push('--reporters');
     args.push('default');
     args.push('--reporters');
     args.push('./backend/utils/jestReporter.js');

    // Coverage options
    if (this.options.coverage) {
      args.push('--coverage');
      args.push('--coverageDirectory=coverage');
      args.push('--coverageReporters=text,lcov,html,json');
    }

    // Watch mode
    if (this.options.watch) {
      args.push('--watch');
    }

    // Verbose mode
    if (this.options.verbose) {
      args.push('--verbose');
    }

    // Performance options
    if (this.options.performance) {
      args.push('--detectSlowTests');
      args.push('--forceExit');
    }

    // CI/CD options
    if (this.options.cicd) {
      args.push('--ci');
      args.push('--coverage');
      args.push('--coverageReporters=json');
      args.push('--outputFile=logs/jest-results.json');
    }

    return { command, args };
  }

  // Execute tests
  async executeTests() {
    const { command, args } = this.buildJestCommand();
    
    log.info(`Running tests with options: ${Object.keys(this.options).filter(k => this.options[k]).join(', ')}`);
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          log.success('Tests completed successfully');
          resolve(code);
        } else {
          log.error(`Tests failed with exit code: ${code}`);
          resolve(code); // Don't reject, we want to continue with reporting
        }
      });

      child.on('error', (error) => {
        log.error(`Test execution error: ${error.message}`);
        reject(error);
      });
    });
  }

  // Generate reports
  generateReports() {
    log.header('Generating Test Reports');

    // Coverage report
    if (this.options.coverage) {
      log.info('Coverage report available at: ./coverage/index.html');
      log.info('Coverage data logged to: ./logs/test-coverage-latest.log');
    }

    // Performance report
    if (this.options.performance) {
      log.info('Performance analysis saved to: ./logs/test-performance-latest.log');
    }

    // CI/CD report
    if (this.options.cicd) {
      log.info('CI/CD report generated: ./logs/test-results-cicd.json');
      this.generateCICDSummary();
    }

    // Log file locations
    log.info('Test results logged to: ./logs/test-results-latest.log');
    log.info('Historical logs available in: ./logs/');
  }

  // Generate CI/CD summary
  generateCICDSummary() {
    try {
      const cicdPath = path.join(process.cwd(), 'logs', 'test-results-cicd.json');
      
      if (fs.existsSync(cicdPath)) {
        const cicdData = JSON.parse(fs.readFileSync(cicdPath, 'utf8'));
        
        // Create simplified summary for CI/CD systems
        const summary = {
          success: cicdData.summary.success,
          totalTests: cicdData.summary.totalTests,
          passed: cicdData.summary.passed,
          failed: cicdData.summary.failed,
          duration: cicdData.summary.duration,
          coverage: cicdData.coverage || null,
          slowTests: cicdData.performance.slowTestCount,
          timestamp: cicdData.timestamp
        };

        // Save simplified summary
        const summaryPath = path.join(process.cwd(), 'logs', 'test-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        log.info('Test summary generated: ./logs/test-summary.json');
      }
    } catch (error) {
      log.warning(`Could not generate CI/CD summary: ${error.message}`);
    }
  }

  // Main execution
  async run() {
    log.header('Enhanced Test Runner');
    
    this.parseArgs();
    this.cleanLogs();
    
    try {
      const exitCode = await this.executeTests();
      this.generateReports();
      
      if (exitCode === 0) {
        log.success('All tests completed successfully! 🎉');
      } else {
        log.error('Some tests failed. Check the logs for details.');
      }
      
      process.exit(exitCode);
    } catch (error) {
      log.error(`Test runner failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner; 