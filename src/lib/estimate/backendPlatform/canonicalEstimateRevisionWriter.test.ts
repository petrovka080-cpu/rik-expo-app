import { createHash } from "node:crypto";

import {
  CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION,
  buildCanonicalRevisionCommitPayload,
  buildCanonicalRevisionIdentity,
} from "./canonicalEstimateRevisionWriter";

const hashText = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

describe("canonicalEstimateRevisionWriter", () => {
  it("builds one identity contract for direct and cumulative adapters", async () => {
    const identity = await buildCanonicalRevisionIdentity({
      catalogId: "catalog-1",
      parentRevisionId: null,
      requestIdentity: {
        sourceRequestText: "Монтаж перегородки 12 м²",
        primaryMeasureParameterId: "area_m2",
      },
      definition: { id: "definition-1", title_ru: "Монтаж перегородки", domain: "INTERIOR" },
      parameterDefinitions: [{ parameter_id: "area_m2", unit_id: "m2" }],
      parameters: { area_m2: 12 },
      effectiveUserParameters: { area_m2: 12 },
      baselineAssumptions: { height_m: 3 },
      parent: null,
      searchReleaseId: "search-release-1",
      compilerVersion: "compiler.r1",
      hashText,
    });

    expect(identity).toMatchObject({
      contractVersion: "ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1",
      sourceRequestText: "Монтаж перегородки 12 м²",
      canonicalWorkTitleRu: "Монтаж перегородки",
      displayTitleRu: "Монтаж перегородки — 12 м²",
      primaryMeasureParameterId: "area_m2",
      primaryMeasureValue: "12",
      primaryMeasureUnitId: "m2",
      definitionVersionId: "definition-1",
      searchReleaseId: "search-release-1",
      legacyParentIdentityRecovery: false,
    });
    expect(identity.sourceRequestHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("uses the immutable definition passport title instead of a legacy generic work identity", async () => {
    const identity = await buildCanonicalRevisionIdentity({
      catalogId: "canonical-work:expanded:strip_foundation",
      parentRevisionId: null,
      requestIdentity: {
        sourceRequestText: "Устройство ленточного фундамента длиной 40 м",
        primaryMeasureParameterId: "total_axis_length_m",
      },
      definition: {
        id: "definition-foundation-1",
        title_ru: "Здания и жилые комплексы: устройство ленточного фундамента",
        passport: { canonicalRuName: "Устройство монолитного железобетонного ленточного фундамента" },
        domain: "buildings",
      },
      parameterDefinitions: [{ parameter_id: "total_axis_length_m", unit_id: "m" }],
      parameters: { total_axis_length_m: 40 },
      effectiveUserParameters: { total_axis_length_m: 40 },
      baselineAssumptions: {},
      parent: null,
      searchReleaseId: "search-release-foundation-1",
      compilerVersion: "compiler.r1",
      hashText,
    });

    expect(identity).toMatchObject({
      canonicalWorkTitleRu: "Устройство монолитного железобетонного ленточного фундамента",
      displayTitleRu: "Устройство монолитного железобетонного ленточного фундамента — 40 м",
    });
  });

  it("selects one commit contract and one canonical payload shape", () => {
    expect(CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION).toBe("estimate_commit_compile_job_v1");
    expect(buildCanonicalRevisionCommitPayload({
      rowCount: 2,
      currencyCode: "KGS",
      totals: { amount: "10" },
      checksumSha256: "checksum",
      compilerVersion: "compiler.r1",
      parameters: { area_m2: 12 },
      approvedTemplateBaselineId: "baseline-1",
      baselineAssumptions: { height_m: 3 },
      effectiveUserParameters: { area_m2: 12 },
      parentRevisionId: null,
      identityContract: { contractVersion: "identity.r1" },
    })).toEqual({
      rowCount: 2,
      currencyCode: "KGS",
      totals: { amount: "10" },
      checksumSha256: "checksum",
      compilerVersion: "compiler.r1",
      migrationSource: null,
      resolvedParameters: { area_m2: 12 },
      parameterSources: {
        approvedTemplateBaselineId: "baseline-1",
        baselineAssumptions: { height_m: 3 },
        userParameters: { area_m2: 12 },
        parentRevisionId: null,
        identityContract: { contractVersion: "identity.r1" },
      },
    });
  });
});
