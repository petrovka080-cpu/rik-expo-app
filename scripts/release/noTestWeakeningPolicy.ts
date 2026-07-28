const JEST_RUNTIME_POLICY_CHANGE =
  /\bjest\s*\.\s*(?:setTimeout|retryTimes)\s*\(/;
const RETRY_CONFIG_CHANGE =
  /\b(?:retry|retries)\s*:\s*(?:[1-9]\d*|true)\b/;
const CLI_POLICY_CHANGE =
  /--(?:testTimeout|max-old-space-size|forceExit)\b/;
const PASS_WITHOUT_TESTS_CHANGE =
  /\bpassWithNoTests\b/;

export function isTimeoutOrMemoryWeakeningDiffLine(line: string): boolean {
  const addedSource = line.startsWith("+") ? line.slice(1) : line;
  return (
    JEST_RUNTIME_POLICY_CHANGE.test(addedSource) ||
    RETRY_CONFIG_CHANGE.test(addedSource) ||
    CLI_POLICY_CHANGE.test(addedSource) ||
    PASS_WITHOUT_TESTS_CHANGE.test(addedSource)
  );
}
