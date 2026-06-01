import fs from "node:fs";
import path from "node:path";

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts",
  "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD",
  "test_weakening_scan.json",
);

type Finding = {
  file: string;
  line: number;
  text: string;
};

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function listSourceFiles(root: string): string[] {
  const results: string[] = [];
  const visit = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        visit(absolute);
        continue;
      }
      if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
        results.push(normalize(path.relative(process.cwd(), absolute)));
      }
    }
  };
  visit(path.join(root, "tests"));
  visit(path.join(root, "scripts"));
  return results.sort();
}

function matchingLines(files: readonly string[], pattern: RegExp): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    source.split(/\r?\n/).forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }
  return findings;
}

function sourceHasScopedArtifactAssertion(file: string): boolean {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  return (
    source.includes("expectCurrentIosTestFlightScopeArtifact") ||
    source.includes("assertCurrentReleaseWaveScopeArtifact") ||
    source.includes("expectIosTestFlightScopedOutNoFakeGreen") ||
    source.includes("isIosTestFlightInternalQaScopedRun")
  );
}

function isScopeReturnCandidate(file: string, text: string): boolean {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  return (
    text === "return;" &&
    (
      source.includes("isIosTestFlightInternalQaScopedRun") ||
      source.includes("hasRuntimeSupabaseCredentials") ||
      source.includes("RUN_ANDROID_ROUTE_BOOTSTRAP_SPEC") ||
      source.includes("RUN_ANDROID_APP_ROOT_READY_MARKER_SPEC")
    )
  );
}

export function buildIosTestFlightTestWeakeningScan() {
  const files = listSourceFiles(process.cwd());
  const describeSkip = matchingLines(files, /\bdescribe\s*\.\s*skip\b/);
  const testSkip = matchingLines(files, /\btest\s*\.\s*skip\b/);
  const itSkip = matchingLines(files, /\bit\s*\.\s*skip\b/);
  const expectTrue = matchingLines(files, /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/);
  const returns = matchingLines(files, /\breturn\s*;\s*$/);
  const scopeReturns = returns.filter((finding) => isScopeReturnCandidate(finding.file, finding.text));
  const silentScopeReturns = scopeReturns.filter((finding) => !sourceHasScopedArtifactAssertion(finding.file));

  return {
    test_skip_found: testSkip.length > 0,
    describe_skip_found: describeSkip.length > 0,
    it_skip_found: itSkip.length > 0,
    expect_true_to_be_true_found: expectTrue.length > 0,
    silent_scope_return_found: silentScopeReturns.length > 0,
    all_scope_exits_assert_artifact: silentScopeReturns.length === 0,
    fake_green_claimed: false,
    classified_scope_return_count: scopeReturns.length,
    total_return_statement_matches: returns.length,
    findings: {
      describe_skip: describeSkip,
      test_skip: testSkip,
      it_skip: itSkip,
      expect_true_to_be_true: expectTrue,
      silent_scope_returns: silentScopeReturns,
    },
    final_status:
      testSkip.length > 0 ||
      describeSkip.length > 0 ||
      itSkip.length > 0 ||
      expectTrue.length > 0 ||
      silentScopeReturns.length > 0
        ? "BLOCKED_TEST_WEAKENING_FOUND"
        : "GREEN_IOS_TESTFLIGHT_TEST_WEAKENING_SCAN_READY",
  };
}

if (require.main === module) {
  const artifact = buildIosTestFlightTestWeakeningScan();
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  if (artifact.final_status !== "GREEN_IOS_TESTFLIGHT_TEST_WEAKENING_SCAN_READY") {
    process.exitCode = 1;
  }
}
