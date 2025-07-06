#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const runCommand = (cmd, description) => {
  try {
    log(`\n${colors.blue}🔄 ${description}...${colors.reset}`);
    const result = execSync(cmd, { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    log(`${colors.green}✅ ${description} - PASSED${colors.reset}`);
    return { success: true, output: result };
  } catch (error) {
    log(`${colors.red}❌ ${description} - FAILED${colors.reset}`);
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

const testB1 = () => {
  log(`\n${colors.bold}${colors.blue}🧪 TESTING STAGE B1: Project Foundation & Database Setup${colors.reset}`);
  
  const tests = [
    { cmd: 'npm run migrate', desc: 'Database Migrations' },
    { cmd: 'npm test -- --testPathPattern="database.test.js"', desc: 'Database Tests' },
    { cmd: 'npm test -- --testPathPattern="config.test.js"', desc: 'Configuration Tests' },
    { cmd: 'npm test -- --testPathPattern="app.test.js"', desc: 'App Integration Tests' },
  ];

  let passed = 0;
  let total = tests.length;

  tests.forEach(test => {
    const result = runCommand(test.cmd, test.desc);
    if (result.success) passed++;
  });

  return { passed, total, phase: 'B1' };
};

const testB2 = () => {
  log(`\n${colors.bold}${colors.blue}🔐 TESTING STAGE B2: User Authentication System${colors.reset}`);
  
  const tests = [
    { cmd: 'npm test -- --testPathPattern="user.model.test.js"', desc: 'User Model Tests' },
    { cmd: 'npm test -- --testPathPattern="jwt.test.js"', desc: 'JWT Utility Tests' },
    { cmd: 'npm test -- --testPathPattern="middleware.test.js"', desc: 'Auth Middleware Tests' },
  ];

  let passed = 0;
  let total = tests.length;

  tests.forEach(test => {
    const result = runCommand(test.cmd, test.desc);
    if (result.success) passed++;
  });

  return { passed, total, phase: 'B2' };
};

const testAPI = (phases) => {
  if (!phases.includes('b1') && !phases.includes('b2')) return { passed: 0, total: 0, phase: 'API' };
  
  log(`\n${colors.bold}${colors.blue}🌐 TESTING API ENDPOINTS${colors.reset}`);
  
  // Start server in background
  log(`${colors.blue}🔄 Starting server...${colors.reset}`);
  try {
    execSync('npm start &', { stdio: 'ignore' });
    execSync('sleep 3'); // Wait for server to start
    
    const tests = [];
    
    if (phases.includes('b1')) {
      tests.push(
        { cmd: 'curl -f http://localhost:3000/health', desc: 'Health Endpoint' },
        { cmd: 'curl -f http://localhost:3000/api/v1/', desc: 'API Welcome Endpoint' }
      );
    }
    
    if (phases.includes('b2')) {
      tests.push(
        { cmd: 'curl -f http://localhost:3000/api/v1/auth/status', desc: 'Auth Status Endpoint' }
      );
    }

    let passed = 0;
    let total = tests.length;

    tests.forEach(test => {
      const result = runCommand(test.cmd, test.desc);
      if (result.success) passed++;
    });

    // Stop server
    execSync('pkill -f "npm start" 2>/dev/null || true');
    
    return { passed, total, phase: 'API' };
  } catch (error) {
    execSync('pkill -f "npm start" 2>/dev/null || true');
    log(`${colors.red}❌ Failed to start server for API tests${colors.reset}`);
    return { passed: 0, total: 1, phase: 'API' };
  }
};

const showSummary = (results) => {
  log(`\n${colors.bold}${colors.blue}📊 TEST SUMMARY${colors.reset}`);
  log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  let totalPassed = 0;
  let totalTests = 0;
  
  results.forEach(result => {
    const percentage = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
    const status = result.passed === result.total ? colors.green : 
                   result.passed > 0 ? colors.yellow : colors.red;
    
    log(`${status}${result.phase}: ${result.passed}/${result.total} tests passed (${percentage}%)${colors.reset}`);
    totalPassed += result.passed;
    totalTests += result.total;
  });
  
  const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const overallStatus = totalPassed === totalTests ? colors.green : 
                        totalPassed > 0 ? colors.yellow : colors.red;
  
  log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  log(`${overallStatus}${colors.bold}OVERALL: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)${colors.reset}`);
  
  if (totalPassed === totalTests) {
    log(`\n${colors.green}${colors.bold}🎉 ALL TESTS PASSED! Implementation is working correctly.${colors.reset}`);
  } else {
    log(`\n${colors.yellow}${colors.bold}⚠️  Some tests failed. Check the output above for details.${colors.reset}`);
  }
};

// Main execution
const main = () => {
  const args = process.argv.slice(2);
  const phases = args.map(arg => arg.replace('-', '').toLowerCase());
  
  if (phases.length === 0) {
    log(`${colors.yellow}Usage: node phase-check.js [-b1] [-b2]${colors.reset}`);
    log(`${colors.yellow}Examples:${colors.reset}`);
    log(`  node phase-check.js -b1`);
    log(`  node phase-check.js -b2`);
    log(`  node phase-check.js -b1 -b2`);
    process.exit(1);
  }

  log(`${colors.bold}${colors.blue}🧪 RSSFeeder Implementation Phase Checker${colors.reset}`);
  log(`${colors.blue}Testing phases: ${phases.join(', ').toUpperCase()}${colors.reset}`);

  const results = [];

  if (phases.includes('b1')) {
    results.push(testB1());
  }

  if (phases.includes('b2')) {
    results.push(testB2());
  }

  // Test API endpoints if any phase is being tested
  const apiResult = testAPI(phases);
  if (apiResult.total > 0) {
    results.push(apiResult);
  }

  showSummary(results);
  
  // Exit with error code if any tests failed
  const allPassed = results.every(r => r.passed === r.total);
  process.exit(allPassed ? 0 : 1);
};

main(); 