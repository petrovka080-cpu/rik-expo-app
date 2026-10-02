import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const SOURCE = readFileSync(
  join(__dirname, "buildS278F09HumanReviewPackage.ts"),
  "utf8",
);
const LINEAGE_SOURCE = readFileSync(
  join(__dirname, "auditS273F09FireCurrentLineage.ts"),
  "utf8",
);
const INTAKE = JSON.parse(readFileSync(
  join(
    __dirname,
    "../../../.release-runtime/r568/s27-9/p6/human-review/PROJECT_SOURCE_INTAKE_S27_9.json",
  ),
  "utf8",
)) as {
  existingEvidence: {
    currentReleaseF09Inventory: { sha256: string };
    reviewPackage: { sha256: string };
    reviewReceipt: { sha256: string };
  };
  postDeliverySequence: string[];
};

describe("S27.9 F09 human review package acceptance boundary", () => {
  test("is pinned to the current MASTER S27.14 bytes", () => {
    expect(SOURCE).toContain("ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (54).md");
    expect(SOURCE).toContain(
      "bcf902aeff445391e4661df1dfb92aab19d522d4619318136154340b1bbbacbc",
    );
  });

  test("uses the canonical exact-current admission predicate instead of any historical ACCEPTED row", () => {
    expect(SOURCE).toContain(
      "public.estimate_technology_passport_any_exact_accepted_r3(definition.id)",
    );
    expect(SOURCE).toMatch(
      /select distinct on \(tenant_id,definition_version_id,technology_variant_id\)[\s\S]*order by tenant_id,definition_version_id,technology_variant_id,decision_sequence desc/u,
    );
    expect(SOURCE).toContain("acceptedDecisionCount: exactHumanAccepted ? 1 : 0");
    expect(SOURCE).toContain(
      "promotionAllowedNow: exactHumanAccepted && rowsWithoutArtifact.length === 0",
    );
    expect(SOURCE).not.toContain("STOP_S278_F09_REVIEW_UNEXPECTED_ACCEPTANCE");
    expect(SOURCE).not.toContain(
      'definitionAcceptances.filter((row) => row.decision === "ACCEPTED")',
    );
  });

  test("carries the persisted complete package-set identity into every affected review item", () => {
    expect(SOURCE).toContain(
      "projectSourcePackage: binding.source_metadata?.projectSourcePackage ?? null",
    );
  });

  test("keeps the lineage inventory on the same exact-current R3 acceptance owner", () => {
    expect(LINEAGE_SOURCE).toContain(
      "public.estimate_technology_passport_any_exact_accepted_r3(",
    );
    expect(LINEAGE_SOURCE).not.toContain("acceptance.invalidated_at_utc is null");
    expect(LINEAGE_SOURCE).not.toContain("acceptance.decision='ACCEPTED'");
  });

  test("refreshes current-release inventory before the post-delivery 68-item rebuild", () => {
    const inventoryIndex = INTAKE.postDeliverySequence.findIndex((step) =>
      step.includes("Regenerate the current-release F09 inventory"));
    const reviewIndex = INTAKE.postDeliverySequence.findIndex((step) =>
      step.includes("Rebuild all 68 review packets"));
    expect(inventoryIndex).toBeGreaterThanOrEqual(0);
    expect(reviewIndex).toBeGreaterThan(inventoryIndex);
    expect(INTAKE.existingEvidence.currentReleaseF09Inventory.sha256).toBe(
      fileSha256(join(
        __dirname,
        "../../../.release-runtime/r568/s27-3/f09-fire-current-lineage/01_inventory.json",
      )),
    );
    expect(INTAKE.existingEvidence.reviewPackage.sha256).toBe(
      fileSha256(join(
        __dirname,
        "../../../.release-runtime/r568/s27-9/p6/human-review/f09-current-release-v3/review-package.json",
      )),
    );
    expect(INTAKE.existingEvidence.reviewReceipt.sha256).toBe(
      fileSha256(join(
        __dirname,
        "../../../.release-runtime/r568/s27-9/p6/human-review/f09-current-release-v3/receipt.json",
      )),
    );
  });
});
