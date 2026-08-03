import { buildVerificationPlan, type ImpactOwnershipMap } from "../../scripts/verification/impactAnalyzer";

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
});
