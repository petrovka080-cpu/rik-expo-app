import { buildStructuredEstimateRequestDraft } from "../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { classifyProfessionalNormSourceAdmission } from "../../src/lib/estimate/professionalNormSourceAdmission";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import { ESTIMATE_PLATFORM_API_VERSION } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const PARAMETERS = {
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-01-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-01-REV-A",
  estimator_approval_reference: "EST-FW-01",
};

function revision(parameters: Record<string, string | number | boolean> = PARAMETERS): CanonicalEstimateRevisionView {
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: "11111111-1111-4111-8111-111111111111",
    parentRevisionId: null,
    releaseId: "22222222-2222-4222-8222-222222222222",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    revisionNumber: 1,
    status: "ready",
    sourceRequestText: "Опалубка RICS NRM 2, измеренная площадь контакта 100 м²",
    displayTitleRu: "Опалубка по измеренной площади контакта",
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    primaryMeasureValue: "100",
    primaryMeasureUnitId: "m2",
    currencyCode: "KGS",
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
    totals: { amount: "0" },
    rowCount: 1,
    checksumSha256: "a".repeat(64),
    compilerVersion: "canonical-estimate-compile-core-r1",
    parameters,
    createdAt: "2026-09-15T00:00:00.000Z",
  };
}

function row(): CanonicalEstimateRevisionRowView {
  return {
    rowId: "formwork:rics-nrm2:measured-contact-area:work",
    ordinal: 0,
    section: "Работы",
    category: "construction_work",
    titleRu: "Монтаж и демонтаж опалубки по измеренной площади контакта",
    unitId: "m2",
    quantity: "100",
    unitPrice: null,
    amount: null,
    currencyCode: null,
    procurementEligible: false,
    includedInEstimate: true,
    includedInProcurement: false,
    ownershipStatus: "OWNED",
    calculationTrace: {
      formulaId: "rics_nrm2_formwork_measured_contact_area_v1",
      inputParameterIds: ["measured_formwork_contact_area_m2"],
      resourceGraph: {
        professionalPhysicalNormBindingV1: {
          technology_class: "FORMWORK_MEASUREMENT",
          operation_class: "MEASURE",
          material_system: "FORMWORK_CONTACT_AREA",
          scope_mode: "FULL_APPLICABLE_SCOPE",
        },
      },
    },
    normativeTrace: [{
      document_code: RICS_NRM2_FORMWORK_SOURCE_ID,
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
      exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    }],
    rowSha256: "b".repeat(64),
  };
}

const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
  releaseId: "22222222-2222-4222-8222-222222222222",
  namespace: "global",
  domain: "concrete",
  workKey: "formwork_rics_nrm2_measured_contact_area",
  titleRu: "Опалубка по измеренной площади контакта",
  definitionVersion: 4,
  applicability: {},
  professionalMetadata: {},
  parameterSchema: [],
};

describe("canonical backend physical norm projection", () => {
  test("replays the shared resolver and preserves the exact source identity", () => {
    const payload = adaptCanonicalRevisionToStructuredEstimate({
      catalog,
      revision: revision(),
      rows: [row()],
    });
    const draft = buildStructuredEstimateRequestDraft(payload);
    expect(payload.rows[0]).toMatchObject({
      normId: RICS_NRM2_FORMWORK_NORM_ID,
      normSourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
      normVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      sourceParameters: {
        professionalPhysicalNormApplicabilityV1: {
          status: "APPLIED",
          calculated_formwork_measured_contact_area_m2: 100,
          source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
        },
      },
    });
    expect(classifyProfessionalNormSourceAdmission({
      normId: draft.items[0]?.normId,
      normSourceId: draft.items[0]?.normSourceId,
      normVersion: draft.items[0]?.normVersion,
      sourceParameters: draft.items[0]?.sourceParameters,
    })).toMatchObject({
      admitted: true,
      route: "CANONICAL_PHYSICAL_APPLICABILITY",
    });
  });

  test("does not admit the row when an exact applicability input is invalid", () => {
    const payload = adaptCanonicalRevisionToStructuredEstimate({
      catalog,
      revision: revision({ ...PARAMETERS, project_measurement_rule_reference: "UNCONFIRMED" }),
      rows: [row()],
    });
    const item = buildStructuredEstimateRequestDraft(payload).items[0];
    expect(classifyProfessionalNormSourceAdmission({
      normId: item?.normId,
      normSourceId: item?.normSourceId,
      normVersion: item?.normVersion,
      sourceParameters: item?.sourceParameters,
    })).toMatchObject({
      admitted: false,
      reason: "PHYSICAL_APPLICABILITY_NOT_APPLIED",
    });
  });
});
