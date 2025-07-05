const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Test-specific logger configuration
const testLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
  })
);

// JSON format for CI/CD
const jsonLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Test results logger
const testResultsLogger = winston.createLogger({
  level: 'info',
  format: testLogFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'test-results-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'test-results-latest.log'),
      options: { flags: 'w' } // Overwrite on each run
    })
  ]
});

// Coverage logger
const coverageLogger = winston.createLogger({
  level: 'info',
  format: testLogFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'test-coverage-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'test-coverage-latest.log'),
      options: { flags: 'w' }
    })
  ]
});

// Performance logger
const performanceLogger = winston.createLogger({
  level: 'info',
  format: testLogFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'test-performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'test-performance-latest.log'),
      options: { flags: 'w' }
    })
  ]
});

// CI/CD JSON logger
const cicdLogger = winston.createLogger({
  level: 'info',
  format: jsonLogFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'test-results.json'),
      options: { flags: 'w' }
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'test-coverage.json'),
      options: { flags: 'w' }
    })
  ]
});

class TestLogger {
  constructor() {
    this.testRun = {
      startTime: null,
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      slowTests: [],
      failedTests: [],
      suites: {}
    };
  }

  // Start test run
  startTestRun() {
    this.testRun.startTime = new Date();
    testResultsLogger.info('Test run started', {
      timestamp: this.testRun.startTime.toISOString(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    });
  }

  // End test run
  endTestRun() {
    this.testRun.endTime = new Date();
    const duration = this.testRun.endTime - this.testRun.startTime;
    
    const summary = {
      duration: `${duration}ms`,
      totalTests: this.testRun.totalTests,
      passed: this.testRun.passedTests,
      failed: this.testRun.failedTests,
      skipped: this.testRun.skippedTests,
      success: this.testRun.failedTests === 0,
      timestamp: this.testRun.endTime.toISOString()
    };

    testResultsLogger.info('Test run completed', summary);
    
    // Log to CI/CD JSON format
    cicdLogger.info('test-run-summary', summary);
    
    return summary;
  }

  // Log test suite results
  logSuiteResults(suiteName, results) {
    this.testRun.suites[suiteName] = results;
    
    testResultsLogger.info(`Suite: ${suiteName}`, {
      tests: results.numTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numSkippedTests,
      duration: `${results.perfStats.runtime}ms`
    });

    // Track slow tests
    if (results.perfStats.runtime > 5000) {
      this.trackSlowTest(suiteName, results.perfStats.runtime);
    }

    // Track failed tests
    if (results.numFailedTests > 0) {
      this.trackFailedTests(suiteName, results.testResults);
    }
  }

  // Track slow tests
  trackSlowTest(suiteName, duration) {
    const slowTest = {
      suite: suiteName,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    this.testRun.slowTests.push(slowTest);
    
    performanceLogger.warn('Slow test detected', slowTest);
  }

  // Track failed tests
  trackFailedTests(suiteName, testResults) {
    testResults.forEach(result => {
      if (result.status === 'failed') {
        const failedTest = {
          suite: suiteName,
          test: result.fullName,
          error: result.failureMessages[0],
          duration: `${result.duration}ms`,
          timestamp: new Date().toISOString()
        };

        this.testRun.failedTests.push(failedTest);
        
        testResultsLogger.error('Test failed', failedTest);
      }
    });
  }

  // Log coverage summary
  logCoverage(coverageSummary) {
    const coverage = {
      timestamp: new Date().toISOString(),
      overall: {
        statements: coverageSummary.total.statements,
        branches: coverageSummary.total.branches,
        functions: coverageSummary.total.functions,
        lines: coverageSummary.total.lines
      },
      files: Object.keys(coverageSummary).length - 1, // exclude 'total'
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    };

    // Check if coverage meets thresholds
    const meetsThreshold = (
      coverage.overall.statements.pct >= coverage.thresholds.statements &&
      coverage.overall.branches.pct >= coverage.thresholds.branches &&
      coverage.overall.functions.pct >= coverage.thresholds.functions &&
      coverage.overall.lines.pct >= coverage.thresholds.lines
    );

    coverage.meetsThreshold = meetsThreshold;

    if (meetsThreshold) {
      coverageLogger.info('Coverage thresholds met', coverage);
    } else {
      coverageLogger.warn('Coverage thresholds not met', coverage);
    }

    // Log to CI/CD JSON format
    cicdLogger.info('coverage-summary', coverage);

    return coverage;
  }

  // Generate performance report
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      slowTests: this.testRun.slowTests,
      slowTestCount: this.testRun.slowTests.length,
      totalDuration: this.testRun.endTime - this.testRun.startTime,
      averageTestDuration: this.testRun.totalTests > 0 ? 
        (this.testRun.endTime - this.testRun.startTime) / this.testRun.totalTests : 0
    };

    performanceLogger.info('Performance report generated', report);
    return report;
  }

  // Export test results for CI/CD
  exportForCICD() {
    const cicdReport = {
      timestamp: new Date().toISOString(),
      testRun: this.testRun,
      summary: this.endTestRun(),
      performance: this.generatePerformanceReport()
    };

    // Write to JSON file for CI/CD systems
    const cicdPath = path.join(logsDir, 'test-results-cicd.json');
    fs.writeFileSync(cicdPath, JSON.stringify(cicdReport, null, 2));

    cicdLogger.info('cicd-export', cicdReport);
    return cicdReport;
  }

  // Log individual test result
  logTestResult(testName, result, duration) {
    const testData = {
      test: testName,
      status: result.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    if (result.status === 'passed') {
      this.testRun.passedTests++;
      testResultsLogger.info('Test passed', testData);
    } else if (result.status === 'failed') {
      this.testRun.failedTests++;
      testResultsLogger.error('Test failed', {
        ...testData,
        error: result.failureMessages[0]
      });
    } else if (result.status === 'skipped') {
      this.testRun.skippedTests++;
      testResultsLogger.warn('Test skipped', testData);
    }

    this.testRun.totalTests++;
  }

  // Clean old log files
  cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const logFiles = fs.readdirSync(logsDir);
    let cleaned = 0;

    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate && file.includes('test-')) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });

    testResultsLogger.info(`Cleaned ${cleaned} old log files older than ${daysToKeep} days`);
    return cleaned;
  }
}

// Export singleton instance
const testLogger = new TestLogger();

module.exports = {
  testLogger,
  testResultsLogger,
  coverageLogger,
  performanceLogger,
  cicdLogger,
  TestLogger
}; 