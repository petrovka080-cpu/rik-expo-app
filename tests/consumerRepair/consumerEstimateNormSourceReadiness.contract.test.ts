import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests/consumerRequestTypes";
import { consumerEstimateUnadmittedNormSourceItems } from "../../src/lib/consumerRequests/consumerEstimateNormSourceReadiness";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const NOW = "2026-09-13T00:00:00.000Z";

function item(
  changes: Partial<ConsumerRepairRequestItem> = {},
): ConsumerRepairRequestItem {
  return {
    id: "row-1",
    requestDraftId: "request-1",
    itemType: "work",
    titleRu: "Расчётная строка",
    quantity: 10,
    unit: "m2",
    unitPrice: 100,
    totalPrice: 1000,
    currency: "KGS",
    source: "reference_price_book",
    editableByConsumer: true,
    createdAt: NOW,
    addedBy: "ai",
    ...changes,
  };
}

function bundle(items: ConsumerRepairRequestItem[]): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "request-1",
      consumerUserId: "consumer-1",
      repairType: "formwork",
      status: "draft",
      missingData: [],
      createdAt: NOW,
    },
    items,
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-1",
      requestDraftId: "request-1",
      status: "not_sent",
      createdAt: NOW,
    },
    events: [],
  };
}

function explicit(
  value: string | number,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test:${String(value)}`,
    captured_at: NOW,
    confidence: "high",
    applicability: "Exact test project value",
  };
}

function appliedFormworkResolution() {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FORMWORK_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "FORMWORK_CONTACT_AREA",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: {
      product_profile_id: explicit(RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID),
      measured_formwork_contact_area_m2: explicit(10, "m2"),
      project_drawing_reference: explicit("FW-01-REV-A"),
      element_type: explicit("WALL"),
      element_dimensions_and_face_count: explicit("5m x 1m x 2 faces"),
      plain_or_special_finish: explicit("PLAIN"),
      vertical_battered_horizontal_or_curved_class: explicit("VERTICAL"),
      single_or_double_sided_scope: explicit("DOUBLE_SIDED"),
      openings_voids_and_deduction_rule: explicit("PROJECT_RULE:none"),
      permanent_or_removable_formwork: explicit("REMOVABLE"),
      project_measurement_rule_reference: explicit("RICS_NRM2_WS11_CONFIRMED:FW-01-REV-A"),
      estimator_approval_reference: explicit("EST-FW-01"),
    },
  });
}

describe("consumer estimate norm-source readiness", () => {
  test("admits an exact physical row and rejects an identity mismatch", () => {
    const resolution = appliedFormworkResolution();
    expect(resolution.status).toBe("APPLIED");
    const exact = item({
      normId: RICS_NRM2_FORMWORK_NORM_ID,
      normSourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
      normVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      sourceParameters: { professionalPhysicalNormApplicabilityV1: resolution },
    });
    expect(consumerEstimateUnadmittedNormSourceItems(bundle([exact]))).toEqual([]);

    const mismatch = { ...exact, normVersion: "tampered-version" };
    expect(consumerEstimateUnadmittedNormSourceItems(bundle([mismatch])))
      .toEqual([{ item: mismatch, reason: "PHYSICAL_APPLICABILITY_IDENTITY_MISMATCH" }]);
  });

  test("reports generated or source-less calculated rows without blocking manual facts", () => {
    const generated = item({
      id: "generated",
      normId: "norm:generated",
      normSourceId: "src_professional_norm_pack_catalog_generated",
      normVersion: "v1",
    });
    const sourceLess = item({ id: "source-less" });
    const manual = item({
      id: "manual",
      source: "user_added",
      addedBy: "user",
      normId: null,
      normSourceId: null,
      normVersion: null,
    });
    const excluded = item({
      id: "excluded",
      sourceParameters: { includedInEstimate: false },
    });

    expect(consumerEstimateUnadmittedNormSourceItems(
      bundle([generated, sourceLess, manual, excluded]),
    ).map(({ item: gapItem, reason }) => [gapItem.id, reason])).toEqual([
      ["generated", "PHYSICAL_APPLICABILITY_NOT_APPLIED"],
      ["source-less", "SOURCE_ID_MISSING"],
    ]);
  });
});
