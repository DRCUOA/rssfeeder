const { testLogger } = require('./testLogger');

class CustomJestReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.testLogger = testLogger;
  }

  onRunStart(results, options) {
    this.testLogger.startTestRun();
    console.log('🧪 Test logging enabled - Results will be saved to ./logs/');
  }

  onTestResult(test, testResult, aggregatedResults) {
    // Log suite results
    this.testLogger.logSuiteResults(test.path, testResult);

    // Log individual test results
    testResult.testResults.forEach(result => {
      this.testLogger.logTestResult(result.fullName, result, result.duration);
    });
  }

  onRunComplete(contexts, results) {
    // Log final test run summary
    const summary = this.testLogger.endTestRun();
    
    // Log coverage if available
    if (results.coverageMap) {
      const coverageSummary = results.coverageMap.getCoverageSummary();
      this.testLogger.logCoverage(coverageSummary);
    }

    // Generate performance report
    this.testLogger.generatePerformanceReport();

    // Export for CI/CD
    const cicdReport = this.testLogger.exportForCICD();

    // Console summary
    console.log('\n📊 Test Results Summary:');
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);
    console.log(`   ⏱️  Duration: ${summary.duration}`);
    console.log(`   📁 Logs saved to: ./logs/test-results-latest.log`);
    
    if (cicdReport.performance.slowTests.length > 0) {
      console.log(`   🐌 Slow tests detected: ${cicdReport.performance.slowTests.length}`);
    }
    
    if (summary.failed > 0) {
      console.log(`   💥 Test failures logged to: ./logs/test-results-latest.log`);
    }
    
    console.log(`   🤖 CI/CD report: ./logs/test-results-cicd.json\n`);
  }
}

module.exports = CustomJestReporter; 