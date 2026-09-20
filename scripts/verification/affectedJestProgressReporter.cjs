const fs = require("node:fs");
const path = require("node:path");

function append(event) {
  const outputPath = process.env.AFFECTED_JEST_PROGRESS_PATH;
  if (!outputPath) return;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.appendFileSync(outputPath, `${JSON.stringify({
    ...event,
    observed_at: new Date().toISOString(),
  })}\n`, "utf8");
}

class AffectedJestProgressReporter {
  onRunStart(_results, options) {
    append({ event: "run_start", estimated_time_s: options?.estimatedTime ?? null });
  }

  onTestResult(test, testResult) {
    append({
      event: "suite_terminal",
      test_path: test.path,
      status: testResult.numFailingTests > 0 || testResult.testExecError ? "FAIL" : "PASS",
      assertion_total: testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests,
      assertion_failed: testResult.numFailingTests,
      assertion_pending: testResult.numPendingTests,
      started_at_ms: testResult.perfStats?.start ?? null,
      ended_at_ms: testResult.perfStats?.end ?? null,
    });
  }

  onRunComplete(_contexts, results) {
    append({
      event: "run_terminal",
      success: results.numFailedTests === 0 && results.numRuntimeErrorTestSuites === 0,
      suites_total: results.numTotalTestSuites,
      suites_failed: results.numFailedTestSuites,
      tests_total: results.numTotalTests,
      tests_failed: results.numFailedTests,
      tests_pending: results.numPendingTests,
      was_interrupted: results.wasInterrupted,
    });
  }
}

module.exports = AffectedJestProgressReporter;
