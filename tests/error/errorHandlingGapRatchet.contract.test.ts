import fs from "fs";
import path from "path";
import {
  DEFAULT_TRY_FINALLY_ALLOWLIST,
  evaluateErrorHandlingGapRatchet,
  scanErrorHandlingGapRatchet,
  scanErrorHandlingGapSource,
  type TryFinallyAllowlistEntry,
} from "../../scripts/error/errorHandlingGapRatchet";

const repoRoot = path.resolve(__dirname, "../..");
const sourcePath = (relativePath: string) => path.join(repoRoot, relativePath);

const auditedBatchBFiles = [
  "src/lib/api/director_reports.naming.ts",
  "src/lib/documents/pdfDocumentActions.ts",
  "src/lib/pdfRunner.ts",
  "src/screens/contractor/hooks/useContractorProgressReliability.ts",
];

const documentedEntry: TryFinallyAllowlistEntry = {
  file: "src/screens/Demo.ts",
  ordinal: 1,
  owner: "demo owner",
  reason: "demo cleanup deliberately preserves the original rejection",
  classification: "intentional_propagation",
  migrationPath: "move demo cleanup into a typed controller",
  redactedObservabilityProof: "finally only invokes cleanup without payload fields",
};
const documentedAllowlist: TryFinallyAllowlistEntry[] = [documentedEntry];

describe("S_NIGHT_ERROR_23_ERROR_HANDLING_GAP_BATCH_B_RATCHET", () => {
  it("keeps the deferred Batch A files fully classified with no silent swallow", () => {
    const result = scanErrorHandlingGapRatchet(repoRoot);
    const guardrail = evaluateErrorHandlingGapRatchet(result);

    expect(guardrail.check).toEqual({
      name: "error_handling_gap_ratchet",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        targetFiles: 4,
        tryFinallyOnly: 9,
        documentedTryFinallyOnly: 9,
        undocumentedTryFinallyOnly: 0,
        emptyCatchBlocks: 0,
        catchBlocksMissingSignal: 0,
        rawDiagnosticSinkFindings: 0,
        silentSwallow: 0,
        allowlistEntries: DEFAULT_TRY_FINALLY_ALLOWLIST.length,
        matchedAllowlistEntries: DEFAULT_TRY_FINALLY_ALLOWLIST.length,
        staleAllowlistEntries: 0,
      }),
    );
  });

  it("records the source contract for every audited Batch B file", () => {
    for (const relativePath of auditedBatchBFiles) {
      const source = fs.readFileSync(sourcePath(relativePath), "utf8");
      expect(source).not.toMatch(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/);
    }

    const directorNaming = fs.readFileSync(sourcePath("src/lib/api/director_reports.naming.ts"), "utf8");
    expect(directorNaming).toContain("warnDirectorNaming");
    expect(directorNaming).toContain("recordPlatformObservability");
    expect(directorNaming).not.toContain("payload:");
    expect(directorNaming).not.toContain("body:");
  });

  it("fails a try/finally propagation gap without an owner, reason, and migration path", () => {
    const result = scanErrorHandlingGapSource({
      file: "src/screens/Demo.ts",
      source: [
        "export async function runDemo() {",
        "  try {",
        "    await doWork();",
        "  } finally {",
        "    cleanup();",
        "  }",
        "}",
      ].join("\n"),
      allowlist: [],
    });

    expect(result.summary.undocumentedTryFinallyOnly).toBe(1);
    expect(result.errors).toEqual([
      "error_handling_try_finally_unclassified:src/screens/Demo.ts:2:ordinal=1",
    ]);
  });

  it("allows documented propagation cleanup only with complete metadata", () => {
    const source = [
      "export async function runDemo() {",
      "  try {",
      "    await doWork();",
      "  } finally {",
      "    cleanup();",
      "  }",
      "}",
    ].join("\n");
    const passing = scanErrorHandlingGapSource({
      file: "src/screens/Demo.ts",
      source,
      allowlist: documentedAllowlist,
    });
    const failing = scanErrorHandlingGapSource({
      file: "src/screens/Demo.ts",
      source,
      allowlist: [{ ...documentedEntry, owner: "", migrationPath: "" }],
    });

    expect(passing.errors).toEqual([]);
    expect(passing.summary.documentedTryFinallyOnly).toBe(1);
    expect(failing.errors).toEqual([
      "error_handling_allowlist_missing_metadata:src/screens/Demo.ts#1",
    ]);
  });

  it("detects empty catches and catches without redacted observability", () => {
    const emptyCatchSource = [
      "export async function emptyCatchDemo() {",
      "  try {",
      "    await doWork();",
      `  } ${"catch"} {`,
      "    // intentionally blank",
      "  }",
      "}",
    ].join("\n");
    const missingSignalSource = [
      "export async function missingSignalDemo() {",
      "  try {",
      "    await doWork();",
      `  } ${"catch"} (error) {`,
      "    return false;",
      "  }",
      "}",
    ].join("\n");

    const emptyCatch = scanErrorHandlingGapSource({
      file: "src/screens/Demo.ts",
      source: emptyCatchSource,
      allowlist: [],
    });
    const missingSignal = scanErrorHandlingGapSource({
      file: "src/screens/Demo.ts",
      source: missingSignalSource,
      allowlist: [],
    });

    expect(emptyCatch.errors).toEqual([
      "error_handling_catch_empty:src/screens/Demo.ts:4:ordinal=1",
    ]);
    expect(emptyCatch.summary.emptyCatchBlocks).toBe(1);
    expect(missingSignal.errors).toEqual([
      "error_handling_catch_missing_signal:src/screens/Demo.ts:4:ordinal=1",
    ]);
    expect(missingSignal.summary.catchBlocksMissingSignal).toBe(1);
  });
});
