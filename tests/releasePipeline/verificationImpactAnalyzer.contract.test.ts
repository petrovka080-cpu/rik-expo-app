import { buildVerificationPlan, type ImpactOwnershipMap } from "../../scripts/verification/impactAnalyzer";
import fs from "node:fs";
import path from "node:path";

const base = "a".repeat(40);
const head = "b".repeat(40);

function plan(file: string) {
  return buildVerificationPlan({ baseSha: base, headSha: head, changedFiles: [file], level: "affected" });
}

describe("Verification Architecture V1 impact analyzer", () => {
  it.each([
    ["local UI", "src/components/estimate/ProfessionalEstimateComposer.tsx", "ui-contracts"],
    ["estimate formula", "src/lib/ai/constructionFormulas/formulaGraph.ts", "estimate-engine-contracts"],
    ["evidence producer", "scripts/audit/real10000AuditP0RemediationCore.ts", "evidence-producer-consumers"],
    ["schema/config/lockfile", "package-lock.json", "configuration-and-manifest-contracts"],
    ["revision/storage/replay", "src/lib/estimate/revisionStorage.ts", "revision-storage-replay-contracts"],
    ["test only", "tests/example/example.contract.test.ts", "changed-test-contracts"],
    ["docs only", "docs/release/readme.md", "documentation-static-contract"],
  ])("selects expected gates for %s without hiding critical controls", (_label, file, expectedGate) => {
    const result = plan(file);
    expect(result.selected_gates).toContain("verification-critical-contracts");
    expect(result.selected_gates).toContain(expectedGate);
    expect(result.unselected_gates.every((item) => item.reason.length > 0)).toBe(true);
  });

  it("is deterministic and binds base/head SHA and the complete input", () => {
    const first = buildVerificationPlan({ baseSha: base, headSha: head, changedFiles: ["docs/b.md", "docs/a.md"], level: "local" });
    const second = buildVerificationPlan({ baseSha: base, headSha: head, changedFiles: ["docs/a.md", "docs/b.md"], level: "local" });
    expect(second).toEqual(first);
    expect(first.input_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(() => buildVerificationPlan({ baseSha: "short", headSha: head, changedFiles: [], level: "local" })).toThrow("exact_sha_required");
  });

  it("rejects duplicate gate ownership", () => {
    const invalid: ImpactOwnershipMap = {
      schema: "verification-impact-ownership/v1",
      version: 1,
      alwaysRunGates: [{ name: "same", level: ["local"], suites: [] }],
      domains: [{ id: "x", gate: "same", levels: ["local"], patterns: ["**"], suites: [] }],
    };
    expect(() => buildVerificationPlan({ baseSha: base, headSha: head, changedFiles: [], level: "local", map: invalid })).toThrow("duplicate_gate");
  });

  it("keeps every selected suite in the governed ownership map executable", () => {
    const result = buildVerificationPlan({
      baseSha: base,
      headSha: head,
      changedFiles: ["scripts/estimate/auditAiEstimatePilotTelemetryDryRun.ts"],
      level: "affected",
    });

    expect(result.selected_suites.filter((suite) => !fs.existsSync(path.resolve(suite)))).toEqual([]);
  });

  it("records a deleted test as impact without selecting a missing executable suite", () => {
    const deletedSuite = "tests/example/retired.contract.test.ts";
    expect(fs.existsSync(path.resolve(deletedSuite))).toBe(false);

    const result = buildVerificationPlan({
      baseSha: base,
      headSha: head,
      changedFiles: [deletedSuite],
      level: "affected",
    });

    expect(result.selected_gates).toContain("changed-test-contracts");
    expect(result.selections.find((item) => item.gate === "changed-test-contracts")?.matched_files)
      .toContain(deletedSuite);
    expect(result.selected_suites).not.toContain(deletedSuite);
  });

  it("does not treat generated runtime test copies as source changes", () => {
    const generatedCopy = ".release-runtime/cache/tests/copied.contract.test.ts";
    const realSuite = "tests/releasePipeline/verificationImpactAnalyzer.contract.test.ts";
    const result = buildVerificationPlan({
      baseSha: base,
      headSha: head,
      changedFiles: [
        generatedCopy,
        "artifacts/S_GENERATED/matrix.json",
        ".tmp_batch001_current.json",
        "android/.gradle-pre-final/8.14/cache.bin",
        "android/app/build-pre-final/intermediates/app.apk",
        realSuite,
      ],
      level: "affected",
    });

    expect(result.changed_files).toContain(realSuite);
    expect(result.changed_files).not.toContain(generatedCopy);
    expect(result.changed_files).not.toContain("artifacts/S_GENERATED/matrix.json");
    expect(result.changed_files).not.toContain(".tmp_batch001_current.json");
    expect(result.changed_files).not.toContain("android/.gradle-pre-final/8.14/cache.bin");
    expect(result.changed_files).not.toContain("android/app/build-pre-final/intermediates/app.apk");
    expect(result.selected_suites).toContain(realSuite);
    expect(result.selected_suites).not.toContain(generatedCopy);
  });

  it("executes selected suites as exact paths instead of regexes that can match generated copies", () => {
    const runner = fs.readFileSync(
      path.resolve("scripts/verification/runVerificationGate.ts"),
      "utf8",
    );

    expect(runner).toMatch(/"--runTestsByPath",\s*\.\.\.input\.suites/u);
  });

  it.each([
    "src/lib/estimate/createEstimateDraftRevision.ts",
    "src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding.ts",
    "src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime.ts",
    "src/features/consumerRepair/requestEstimateScreenActions.ts",
  ])("selects the mandatory shared-core downstream pack for %s", (file) => {
    const result = plan(file);
    expect(result.selected_gates).toContain("estimate-domain-shared-core-impact");
    expect(result.selected_suites).toEqual(expect.arrayContaining([
      "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
      "tests/consumerRepair/platformCoreV2ConsumerFlow.contract.test.ts",
      "tests/aiEstimateV4/asphalt35TypedBoq.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimateParameterRuntimeMatrix.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimatePlatformCoreV2Matrix.contract.test.ts",
    ]));
    expect(result.selected_suites.length).toBeGreaterThan(0);
  });

  it("keeps an Asphalt norm-only change out of unrelated whole-app UI gates", () => {
    const result = plan("src/lib/estimate/v4/roadworks/roadworksWaveASemanticTruth.ts");
    expect(result.selected_gates).toContain("estimate-domain-shared-core-impact");
    expect(result.selected_gates).not.toContain("ui-contracts");
  });
});
