import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  LEGACY_PACK_SOURCE_IDS,
  VERIFIED_SOURCE_IDS,
} from "../../scripts/estimate/candidateNormSourceResidualAudit";

describe("current candidate normative source residual audit", () => {
  it("keeps the exact 8+4 denominator explicit and disjoint", () => {
    expect(LEGACY_PACK_SOURCE_IDS).toHaveLength(8);
    expect(VERIFIED_SOURCE_IDS).toHaveLength(4);
    expect(new Set([...LEGACY_PACK_SOURCE_IDS, ...VERIFIED_SOURCE_IDS]).size).toBe(12);
  });

  it("uses typed exact source identity across the inherited manifest and normalized bindings", () => {
    const source = readFileSync(
      resolve("scripts/estimate/candidateNormSourceResidualAudit.ts"),
      "utf8",
    );

    expect(source).toContain("jsonb_array_elements");
    expect(source).toContain("trace->>'normSourceId'=any($1::text[])");
    expect(source).toContain("manifest.release_id=$1");
    expect(source).toContain("estimate_cumulative_manifest_entry");
    expect(source).toContain("estimate_work_normative_binding");
    expect(source).toContain("estimate_normative_locator");
    expect(source).toContain("estimate_normative_source");
    expect(source.toLowerCase()).not.toContain(" like ");
  });

  it("is wired into the existing professional norm audit instead of a second entrypoint", () => {
    const owner = readFileSync(
      resolve("scripts/estimate/auditRealProfessionalNormPacks.ts"),
      "utf8",
    );

    expect(owner).toContain("--candidate-release-id");
    expect(owner).toContain("runCandidateNormSourceResidualAudit");
  });
});
