import { createHash } from "node:crypto";

import {
  CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION,
  buildCanonicalRevisionCommitPayload,
  assertCanonicalRevisionHasContent,
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

  it("renders a piece primary measure with a human Russian unit", async () => {
    const identity = await buildCanonicalRevisionIdentity({
      catalogId: "embedded-items",
      parentRevisionId: null,
      requestIdentity: {
        sourceRequestText: "Монтаж 28 закладных",
        primaryMeasureParameterId: "embedded_item_count_piece",
      },
      definition: { id: "definition-embedded", title_ru: "Монтаж закладных", domain: "CONCRETE" },
      parameterDefinitions: [{ parameter_id: "embedded_item_count_piece", unit_id: "piece" }],
      parameters: { embedded_item_count_piece: 28 },
      effectiveUserParameters: { embedded_item_count_piece: 28 },
      baselineAssumptions: {},
      parent: null,
      searchReleaseId: "search-embedded",
      compilerVersion: "compiler.r1",
      hashText,
    });

    expect(identity.displayTitleRu).toBe("Монтаж закладных — 28 шт.");
  });

  it.each([['set', 'компл.'], ['pcs', 'шт.'], ['piece', 'шт.'], ['item', 'шт.'], ['unregistered-set', 'unregistered-set']])(
    "localizes the registered primary unit %s without changing physical identity", async (unitId, label) => {
      const sourceRequestText = 'Проверочный монтаж комплекта, исходная единица set';
      const identity = await buildCanonicalRevisionIdentity({
        catalogId: 'generic-kit-work', parentRevisionId: null,
        requestIdentity: { sourceRequestText, primaryMeasureParameterId: 'count' },
        definition: { id: 'definition-kit', title_ru: 'Монтаж комплекта', domain: 'INTERIOR' },
        parameterDefinitions: [{ parameter_id: 'count', unit_id: unitId }],
        parameters: { count: 5 }, effectiveUserParameters: { count: 5 }, baselineAssumptions: {},
        parent: null, searchReleaseId: 'search-kit', compilerVersion: 'compiler.r1', hashText,
      });
      expect(identity.displayTitleRu).toBe(`Монтаж комплекта — 5 ${label}`);
      expect(identity.primaryMeasureUnitId).toBe(unitId);
      expect(identity.primaryMeasureValue).toBe('5');
      expect(identity.userInputSnapshot).toEqual({ count: 5 });
      expect(identity.sourceRequestText).toBe(sourceRequestText);
      expect(identity.sourceRequestHash).toBe(hashText(sourceRequestText));
    },
  );

  it("keeps a missing primary measure explicit for a preliminary revision", async () => {
    const identity = await buildCanonicalRevisionIdentity({
      catalogId: "drainage",
      parentRevisionId: null,
      requestIdentity: {
        sourceRequestText: "Устройство системы водоотвода асфальтированного покрытия",
        primaryMeasureParameterId: "route_length_m",
      },
      definition: { id: "definition-drainage", title_ru: "Устройство системы водоотвода", domain: "roads" },
      parameterDefinitions: [{ parameter_id: "route_length_m", unit_id: "m" }],
      parameters: {},
      effectiveUserParameters: {},
      baselineAssumptions: {},
      preliminaryNeeds: [{ missing_parameter_ids: ["route_length_m"] }],
      parent: null,
      searchReleaseId: "search-release-drainage",
      compilerVersion: "compiler.r1",
      hashText,
    });

    expect(identity).toMatchObject({
      contractVersion: "ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2",
      displayTitleRu: "Устройство системы водоотвода — объём нужно уточнить",
      primaryMeasureParameterId: "route_length_m",
      primaryMeasureValue: null,
      normalizedIntent: {
        primaryMeasure: { parameterId: "route_length_m", value: null, unitId: "m", unresolved: true },
      },
    });
  });

  it("uses the immutable definition title and exposes the selected foundation scope", async () => {
    const identityInput = {
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
      parameters: { total_axis_length_m: 40, scope_variant: "full_reinforced_structure" },
      effectiveUserParameters: { total_axis_length_m: 40, scope_variant: "full_reinforced_structure" },
      baselineAssumptions: {},
      parent: null,
      searchReleaseId: "search-release-foundation-1",
      compilerVersion: "compiler.r1",
      hashText,
    };
    const identity = await buildCanonicalRevisionIdentity(identityInput);
    const placementIdentity = await buildCanonicalRevisionIdentity({
      ...identityInput,
      parameters: { total_axis_length_m: 40, scope_variant: "placement_only" },
      effectiveUserParameters: { total_axis_length_m: 40, scope_variant: "placement_only" },
    });

    expect(identity).toMatchObject({
      canonicalWorkTitleRu: "Устройство монолитного железобетонного ленточного фундамента",
      displayTitleRu: "Устройство монолитного железобетонного ленточного фундамента — Полное устройство железобетонной конструкции — 40 м",
    });
    expect(placementIdentity.displayTitleRu)
      .toBe("Устройство монолитного железобетонного ленточного фундамента — Только укладка и уход за бетонной смесью — 40 м");
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
        preliminaryNeeds: [],
      },
    });
  });
});


describe("empty revision admission", () => {
  const base = {
    rowCount: 0, currencyCode: "KGS", totals: {}, checksumSha256: "immutable",
    compilerVersion: "test", parameters: { count: 0 }, approvedTemplateBaselineId: null,
    baselineAssumptions: {}, effectiveUserParameters: { count: 0 }, parentRevisionId: null,
    identityContract: {},
  };
  it.each([undefined, []])("rejects no rows and no needs before database commit: %s", preliminaryNeeds => {
    expect(() => assertCanonicalRevisionHasContent({...base, preliminaryNeeds})).toThrow(
      expect.objectContaining({code: "EMPTY_ESTIMATE_COMPOSITION"}),
    );
    expect(base.parameters.count).toBe(0);
  });
  it("retains an unresolved real need without inventing a known row or quantity", () => {
    const need = {row_id: "tool-needed", quantity: null, unit_id: "piece", needState: "QUANTITY_REQUIRED"};
    expect(() => assertCanonicalRevisionHasContent({...base, preliminaryNeeds: [need]})).not.toThrow();
    const payload = buildCanonicalRevisionCommitPayload({...base, preliminaryNeeds: [need]});
    expect(payload.rowCount).toBe(0);
    expect(payload.parameterSources).toMatchObject({preliminaryNeeds: [need]});
  });
  it("does not reject a revision with one retained row, including an excluded row", () => {
    expect(() => assertCanonicalRevisionHasContent({...base, rowCount: 1})).not.toThrow();
    expect(buildCanonicalRevisionCommitPayload({...base, rowCount: 1}).rowCount).toBe(1);
  });
});
