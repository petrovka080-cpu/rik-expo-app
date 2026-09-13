import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  measured_formwork_contact_area_m2: "Укажите итоговую измеренную площадь контакта опалубки с готовым бетоном после учёта всех граней и вычетов, м².",
  project_drawing_reference: "Укажите чертёж и его ревизию, по которым измерена площадь опалубки.",
  element_type: "Укажите тип элемента: стена, колонна, балка, плита, фундамент или другой точный элемент.",
  element_dimensions_and_face_count: "Укажите размеры элемента и число измеряемых граней либо ссылку на размерную схему.",
  plain_or_special_finish: "Укажите класс отделки PLAIN либо SPECIAL с точным описанием.",
  vertical_battered_horizontal_or_curved_class: "Укажите класс геометрии VERTICAL, HORIZONTAL, BATTERED или CURVED с уточнением.",
  single_or_double_sided_scope: "Укажите SINGLE_SIDED или DOUBLE_SIDED.",
  openings_voids_and_deduction_rule: "Укажите проектное правило учёта проёмов и пустот в формате PROJECT_RULE:…",
  permanent_or_removable_formwork: "Укажите PERMANENT или REMOVABLE.",
  project_measurement_rule_reference: "Подтвердите правило измерения RICS NRM2 Work section 11 и его проектную ревизию.",
  estimator_approval_reference: "Укажите ссылку на согласование обмера сметчиком.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractRicsNrm2FormworkCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/опалубк/iu.test(text) || !/(?:RICS\s*)?NRM\s*2/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  };
  const areaMatch = text.match(
    /измеренн[а-яё]*\s+площад[ьи]\s+контакт[а-яё]*\s*[:=]?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м2|м²|m2|sqm)/iu,
  );
  if (areaMatch?.[1]) {
    const area = decimal(areaMatch[1]);
    if (area !== null && area > 0) result.measured_formwork_contact_area_m2 = area;
  }
  const labels: readonly (readonly [string, RegExp])[] = [
    ["project_drawing_reference", /ссылк[а-яё]*\s+на\s+черт[её]ж/iu],
    ["element_type", /тип\s+элемент[а-яё]*/iu],
    ["element_dimensions_and_face_count", /размер[а-яё]*\s+и\s+количеств[а-яё]*\s+гран[а-яё]*/iu],
    ["plain_or_special_finish", /отделк[а-яё]*/iu],
    ["vertical_battered_horizontal_or_curved_class", /класс\s+геометри[а-яё]*/iu],
    ["single_or_double_sided_scope", /сторон[а-яё]*\s+опалубк[а-яё]*/iu],
    ["openings_voids_and_deduction_rule", /правил[а-яё]*\s+про[её]м[а-яё]*\s+и\s+пустот[а-яё]*/iu],
    ["permanent_or_removable_formwork", /тип\s+опалубк[а-яё]*/iu],
    ["project_measurement_rule_reference", /правил[а-яё]*\s+измерени[а-яё]*\s+проект[а-яё]*/iu],
    ["estimator_approval_reference", /согласовани[ея]\s+сметчик[а-яё]*/iu],
  ];
  for (const [parameterId, label] of labels) {
    const value = reference(text, label);
    if (value) result[parameterId] = value;
  }
  return Object.freeze(result);
}

export function ricsNrm2FormworkMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID) return [];
  return RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => canonicalParameters[parameterId] == null)
    .map((parameterId) => PARAMETER_QUESTIONS_RU[parameterId] ?? parameterId);
}

function explicitParameterValues(
  canonicalParameters: Readonly<Record<string, Primitive>>,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(canonicalParameters).map(([parameterId, value]) => [
    parameterId,
    {
      value,
      unit_id: parameterId.endsWith("_m2") ? "m2" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-formwork-prompt:${parameterId}`,
      captured_at: "consumer-formwork-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the exact RICS NRM2 formwork measurement request.",
    },
  ]));
}

export function applyRicsNrm2PhysicalNormToFormworkBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "measured_formwork_contact_area" ||
    plan.semanticFrame.materialSystem !== "rics_nrm2_formwork_measurement"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FORMWORK_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "FORMWORK_CONTACT_AREA",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "labor_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Монтаж и демонтаж опалубки по измеренной площади контакта RICS NRM 2",
      templateId: "formwork:rics-nrm2:measured-contact-area:v1",
      templateVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      normId: RICS_NRM2_FORMWORK_NORM_ID,
      normFamilyId: "norm_family:formwork:rics_nrm2_measurement",
      normSourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
      normSourceTitle: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_title,
      normVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      normReviewStatus: "international_measurement_standard_primary_source_reviewed",
      normSourceProfile: "INTL_REFERENCE" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Royal Institution of Chartered Surveyors",
      normSourceEffectiveDate: "2021-12-01",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "formwork_labor_measured_contact_area_m2",
      laborKey: "formwork_install_remove_by_measured_contact_area",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Объём опалубки заблокирован до полного проектного обмера граней, классификации и правила вычетов.",
        sourcePolicy: "manual_review" as const,
        formulaId: "rics_nrm2_formwork_contact_area_blocked_v1",
        quantityFormula: "blocked until every exact RICS NRM2 measurement parameter is explicit",
        calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: resolution.blockers,
      };
    }
    return {
      ...source,
      quantity: resolution.calculated_formwork_measured_contact_area_m2!,
      unit: "m2",
      comment: "Объём равен утверждённой площади контакта с готовым бетоном; цена берётся отдельно и не является ставкой RICS.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "rics_nrm2_formwork_measured_contact_area_v1",
      quantityFormula: "measured_formwork_contact_area_m2 * 1",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_formwork_measured_contact_area_m2}`,
        "resultUnit=m2",
        "priceSource=separate_configured_reference",
        "automaticM2PerM3Factor=false",
        "automaticPackageRounding=false",
        "automaticWaste=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: false,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
