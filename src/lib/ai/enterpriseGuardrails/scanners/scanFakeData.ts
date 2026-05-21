import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanFakeData(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanFakeData",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\b(fakeDataAsReal|presentDemoAsReal|demoFixtureAsReal|hardcodedSupplier|hardcodedPayment|hardcodedRequest|fake_data_presented_as_real\s*:\s*true|demo_fixture_presented_as_real\s*:\s*true)\b/i,
    reason: "Fixtures and demos cannot be presented as real user data.",
    ignore: (_finding, file) => file.file.endsWith("scanFakeData.ts"),
  });
}
