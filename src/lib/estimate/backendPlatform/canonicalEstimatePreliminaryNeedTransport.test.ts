import { createHash } from "node:crypto";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import {
  canonicalPreliminaryNeedEvidenceFromStorage, canonicalPreliminaryNeedEvidenceIdentityMatches,
  decodeCanonicalPreliminaryNeedRowSegment, isCanonicalPreliminaryNeedEvidence,
  projectCanonicalEstimatePreliminaryNeedTransport,
} from "./canonicalEstimatePreliminaryNeedTransport";

const hashJson = (value: unknown) => createHash("sha256").update(canonicalEstimateStableJson(value)).digest("hex");
const need = (rowId = "rc09:material:casing") => {
  const basis = { row_id: rowId, ordinal: 1, section: "Футляр", category: "material", title_ru: "Стальной футляр",
    unit_id: "m", quantity: "72", unit_price: "100", need_state: "CONDITION_REQUIRED", missing_parameter_ids: ["casing_grade"],
    selected: true, procurement_eligible: true, formula_id: "casing_order",
    calculation_trace: { resourceGraph: { completeEvidence: "Доказательства ".repeat(800) } }, normative_trace: [{ source: "Проект" }] };
  return { ...basis, need_sha256: hashJson(basis) };
};
const storage = (needs = [need()]) => ({ id: "11111111-1111-4111-8111-111111111111", release_id: "22222222-2222-4222-8222-222222222222",
  definition_version_id: "33333333-3333-4333-8333-333333333333", checksum_sha256: "a".repeat(64),
  amendment_contract: { rowOverrides: { "rc09:material:casing": { quantity: "72", reason: "Заказ пользователя", source: { evidence: "signed" } } },
    customRows: [{ rowId: "custom", unitPrice: "123" }], releaseMigration: { fromReleaseId: "old", toReleaseId: "new" },
    parameterSources: { userParameters: { length_m: "35" }, identityContract: { sourceRequestHash: "b".repeat(64) }, preliminaryNeeds: needs } } });

describe("immutable preliminary evidence transport", () => {
  it("preserves every compact need and amendment provenance while removing both trace amplification and raw duplication", () => {
    const revision = storage(Array.from({ length: 1909 }, (_, index) => ({ ...need(`need:${index}`), selected: index < 458 })));
    const before = JSON.stringify(revision);
    const projected = projectCanonicalEstimatePreliminaryNeedTransport(revision);
    expect(projected.preliminaryNeeds).toHaveLength(1909);
    expect(projected.preliminaryNeeds.filter(row => row.selected)).toHaveLength(458);
    expect(projected.amendmentContract).toMatchObject({ rowOverrides: revision.amendment_contract.rowOverrides,
      customRows: revision.amendment_contract.customRows, releaseMigration: revision.amendment_contract.releaseMigration,
      parameterSources: { userParameters: { length_m: "35" }, identityContract: revision.amendment_contract.parameterSources.identityContract } });
    expect(projected.amendmentContract.parameterSources).not.toHaveProperty("preliminaryNeeds");
    expect(projected.preliminaryNeeds[0]).toMatchObject({ quantity: "72", unitPrice: "100", procurementEligible: true,
      missingParameterIds: ["casing_grade"], evidenceStatus: "referenced", evidenceReference: { revisionId: revision.id, checksumSha256: revision.checksum_sha256 } });
    expect(projected.preliminaryNeeds[0]).not.toHaveProperty("calculationTrace");
    expect(Buffer.byteLength(JSON.stringify(projected))).toBeLessThan(Buffer.byteLength(before) / 10);
    expect(JSON.stringify(revision)).toBe(before);
  });

  it("reads and verifies the exact historical snake_case evidence, independent of current definitions", async () => {
    const revision = storage();
    const evidence = await canonicalPreliminaryNeedEvidenceFromStorage(revision, "rc09:material:casing", hashJson);
    expect(evidence.rawNeed).toBe(revision.amendment_contract.parameterSources.preliminaryNeeds[0]);
    expect(isCanonicalPreliminaryNeedEvidence(evidence)).toBe(true);
    expect(canonicalPreliminaryNeedEvidenceIdentityMatches(evidence.reference, { ...evidence.reference, checksumSha256: "c".repeat(64) })).toBe(false);
    expect(canonicalPreliminaryNeedEvidenceIdentityMatches({ contractVersion: evidence.reference.contractVersion } as typeof evidence.reference, evidence.reference)).toBe(false);
    expect(isCanonicalPreliminaryNeedEvidence({ ...evidence, rawNeed: { ...evidence.rawNeed, quantity: "0" } })).toBe(false);
  });

  it("rejects mutated or missing saved evidence", async () => {
    const revision = storage();
    revision.amendment_contract.parameterSources.preliminaryNeeds[0].title_ru = "Подменённая строка";
    await expect(canonicalPreliminaryNeedEvidenceFromStorage(revision, "rc09:material:casing", hashJson))
      .rejects.toMatchObject({ code: "PRELIMINARY_NEED_EVIDENCE_INTEGRITY_FAILED" });
    await expect(canonicalPreliminaryNeedEvidenceFromStorage(revision, "unknown", hashJson)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("decodes a route segment exactly once and rejects malformed escapes", () => {
    expect(decodeCanonicalPreliminaryNeedRowSegment(encodeURIComponent("rc09:material:casing/100%"))).toBe("rc09:material:casing/100%");
    expect(() => decodeCanonicalPreliminaryNeedRowSegment("%xy")).toThrow("Некорректная ссылка");
  });
});
