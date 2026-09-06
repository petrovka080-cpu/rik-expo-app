import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import {
  recalculateEstimateDraftRevision,
  recalculateEstimateDraftRevisionBatch,
} from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionProfessionalV7";
import {
  compileDomainCompletionWork,
  domainCompletionParameterValues,
} from "../aiEstimateV4/domainCompletionV7TestSupport";

function legacyRevision() {
  const catalogId = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7[0];
  const production = compileDomainCompletionWork(catalogId);
  if (!production.draft) throw new Error(`TEST_DOMAIN_COMPLETION_DRAFT_MISSING:${catalogId}`);
  const paramOverrides = Object.fromEntries(
    Object.entries(domainCompletionParameterValues(catalogId)).map(([key, parameter]) => [
      key,
      {
        value: parameter.value,
        ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
        source: "user_input" as const,
        lastChangedAt: parameter.captured_at,
      },
    ]),
  );
  const revision = createEstimateDraftRevision({
    estimateDraftId: "interior-migration-param-patch",
    rawInput: production.inventory.localized_name_ru,
    selectedTemplateId: `domain-passport:${catalogId}:v1`,
    selectedWorkKey: production.inventory.work_key,
    paramOverrides,
    prebuiltExactDraft: production.draft,
    createdAt: "2026-09-06T00:00:00.000Z",
  });
  if (!revision.resolvedIdentity) throw new Error("TEST_LEGACY_IDENTITY_MISSING");
  return {
    catalogId,
    revision: {
      ...revision,
      resolvedIdentity: {
        ...revision.resolvedIdentity,
        requestedCatalogWorkId: catalogId,
        passportId: "legacy-interior-owner",
        semanticOwner: "legacy-interior-owner",
        legacyFallbackUsed: true,
      },
    },
  };
}

describe("interior revision migration parameter patch identity", () => {
  it("retargets a patch parsed before migration and preserves the requested catalog identity", () => {
    const { catalogId, revision } = legacyRevision();
    const patch = parseUserParamPatch({
      revision,
      operation: revision.params.area_m2 ? "update_param" : "add_param",
      paramKey: "area_m2",
      rawValue: "80 м2",
    });

    const result = recalculateEstimateDraftRevision(revision, patch, {
      createdAt: "2026-09-06T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(revision.selectedTemplateId).toBe(`domain-passport:${catalogId}:v1`);
    expect(result.revision.selectedTemplateId).toBe(revision.selectedTemplateId);
    expect(result.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
    expect(result.revision.params.area_m2?.value).toBe(80);
    expect(result.revision.previousRevisionId).toBe(revision.revisionId);
  });

  it("retargets every same-revision patch in a batch", () => {
    const { catalogId, revision } = legacyRevision();
    const patches = [
      parseUserParamPatch({
        revision,
        operation: revision.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "70 м2",
      }),
      parseUserParamPatch({
        revision,
        operation: revision.params.height_m ? "update_param" : "add_param",
        paramKey: "height_m",
        rawValue: "3 м",
      }),
    ];

    const result = recalculateEstimateDraftRevisionBatch(revision, patches, {
      createdAt: "2026-09-06T00:02:00.000Z",
      revisionIndex: 2,
    });

    expect(result.revision.selectedTemplateId).toBe(revision.selectedTemplateId);
    expect(result.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
    expect(result.revision.params.area_m2?.value).toBe(70);
    expect(result.revision.params.height_m?.value).toBe(3);
  });

  it("still rejects a patch carrying a genuinely foreign template identity", () => {
    const { revision } = legacyRevision();
    const patch = {
      ...parseUserParamPatch({
        revision,
        operation: revision.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "60 м2",
      }),
      selectedTemplateId: "foreign-template-id",
    };

    expect(() => recalculateEstimateDraftRevision(revision, patch)).toThrow(
      "USER_PARAM_PATCH_INVALID:selected_template_id_mismatch",
    );
  });
});
