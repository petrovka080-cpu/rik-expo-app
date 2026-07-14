import fs from "node:fs";
import path from "node:path";

type ManifestDecision =
  | "PORT"
  | "SUPERSEDED"
  | "SUPERSEDED_PATCH_EQUIVALENT"
  | "OBSOLETE"
  | "EVIDENCE_ONLY"
  | "OWNER_DECISION_REQUIRED";

type ManifestEntry = {
  sha: string;
  branch: string;
  purpose: string;
  product_files: string[];
  tests: string[];
  generated_artifact_files: string[];
  architecture_relevance: string;
  candidate_equivalent: string;
  security_impact: string;
  decision: ManifestDecision;
  rationale: string;
};

const manifestPath = path.join(
  process.cwd(),
  "docs/operations/s1b-final-reconciliation-decision-manifest.json",
);

const allowedDecisions = new Set<ManifestDecision>([
  "PORT",
  "SUPERSEDED",
  "SUPERSEDED_PATCH_EQUIVALENT",
  "OBSOLETE",
  "EVIDENCE_ONLY",
  "OWNER_DECISION_REQUIRED",
]);

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "")) as {
    stage: string;
    baseline_sha: string;
    policy: Record<string, boolean>;
    decision_counts: Record<ManifestDecision, number>;
    selective_ports_applied: Array<{
      source_sha: string;
      files: string[];
      status: string;
    }>;
    excluded_refs: Array<{ sha: string; reason: string }>;
    decisions: ManifestEntry[];
  };
}

describe("S1B final reconciliation decision manifest", () => {
  it("classifies all 26 old commit objects without pending ports or whole-branch merge decisions", () => {
    const manifest = readManifest();

    expect(manifest.stage).toBe("S1B-FINAL");
    expect(manifest.baseline_sha).toBe("624d0837399f5d1d60c370f6718d5d9e34f4b289");
    expect(manifest.policy.no_whole_branch_merge).toBe(true);
    expect(manifest.policy.no_old_generated_artifact_port).toBe(true);
    expect(manifest.decisions).toHaveLength(26);
    expect(new Set(manifest.decisions.map((entry) => entry.sha)).size).toBe(26);

    const actualCounts = Object.fromEntries(
      [...allowedDecisions].map((decision) => [
        decision,
        manifest.decisions.filter((entry) => entry.decision === decision).length,
      ]),
    );
    expect(actualCounts).toEqual(manifest.decision_counts);

    for (const entry of manifest.decisions) {
      expect(entry.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(entry.branch.trim()).toBeTruthy();
      expect(entry.purpose.trim()).toBeTruthy();
      expect(Array.isArray(entry.product_files)).toBe(true);
      expect(Array.isArray(entry.tests)).toBe(true);
      expect(Array.isArray(entry.generated_artifact_files)).toBe(true);
      expect(entry.architecture_relevance.trim()).toBeTruthy();
      expect(entry.candidate_equivalent.trim()).toBeTruthy();
      expect(entry.security_impact.trim()).toBeTruthy();
      expect(entry.rationale.trim()).toBeTruthy();
      expect(allowedDecisions.has(entry.decision)).toBe(true);
      expect(entry.decision).not.toBe("PORT_PENDING");
      expect(entry.decision).not.toBe("MERGE_WHOLE_BRANCH");
    }
  });

  it("records only selective source ports and keeps the layout hotfix outside the 26-object set", () => {
    const manifest = readManifest();
    const portedSources = manifest.selective_ports_applied.map((entry) => entry.source_sha);

    expect(portedSources).toEqual(
      expect.arrayContaining([
        "a217e49c0a53324e1ba79435579830fe8eb6a537",
        "d7d1996360ff8a241a5fdd7e4774c58263f8f7bb",
      ]),
    );
    expect(
      manifest.selective_ports_applied.every((entry) =>
        entry.status === "applied" &&
        entry.files.length > 0 &&
        entry.files.every((file) => !file.startsWith("artifacts/")),
      ),
    ).toBe(true);
    expect(manifest.excluded_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sha: "2df3d6f1f59ac1ba32e6062a1a0283c2314ceb5b",
        }),
      ]),
    );
  });
});
