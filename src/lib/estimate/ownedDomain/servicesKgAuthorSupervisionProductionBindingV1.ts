import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  KG_AUTHOR_SUPERVISION_NORM_ID,
  KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID,
  KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS,
  KG_AUTHOR_SUPERVISION_SOURCE_ID,
  KG_AUTHOR_SUPERVISION_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  construction_estimated_cost_chapters_1_9_currency: "Укажите сметную стоимость строительства по главам 1–9 сводного расчёта.",
  construction_estimated_cost_currency: "Укажите валюту стоимости по главам 1–9; профиль применяется к KGS.",
  author_supervision_required_for_object: "Подтвердите обязательность авторского надзора для объекта.",
  applicable_consolidated_estimate_chapters: "Подтвердите, что база содержит именно главы 1–9 сводного расчёта.",
  current_legal_applicability_and_amendments: "Укажите подтверждение текущей применимости приказа №52-нпа и последующих изменений.",
  travel_to_and_from_site_required: "Укажите, требуется ли проезд сотрудников проектной организации на объект и обратно.",
  travel_cost_separate_calculation: "Укажите отдельный подтверждённый расчёт проезда либо NOT_REQUIRED:NO_TRAVEL.",
  estimator_approval_reference: "Укажите ссылку на согласование расчёта сметчиком.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractKgAuthorSupervisionCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/авторск[а-яё]*\s+надзор/iu.test(text) || !/(?:52\s*[-–—]?\s*нпа|№\s*52)/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID,
  };
  const costMatch = text.match(
    /сметн[а-яё]*\s+стоимост[ьи]\s+строительств[а-яё]*\s+по\s+главам\s+1\s*[-–—]\s*9\D{0,16}(\d[\d\s]*(?:[.,]\d+)?)\s*(?:KGS|сом)/iu,
  );
  if (costMatch?.[1]) {
    const cost = decimal(costMatch[1]);
    if (cost !== null && cost > 0) result.construction_estimated_cost_chapters_1_9_currency = cost;
  }
  if (/валют[а-яё]*\s+стоимост[ьи]\s*[:=]\s*KGS/iu.test(text)) {
    result.construction_estimated_cost_currency = "KGS";
  }
  if (/авторск[а-яё]*\s+надзор\s+для\s+объект[а-яё]*\s+обязател/iu.test(text)) {
    result.author_supervision_required_for_object = true;
  }
  if (/применим[а-яё]*\s+глав[а-яё]*\s+сводн[а-яё]*\s+смет[а-яё]*\s*[:=]\s*1\s*[-–—]\s*9/iu.test(text)) {
    result.applicable_consolidated_estimate_chapters = "1-9";
  }
  const legalApplicability = reference(text, /текущ[а-яё]*\s+применимост[ьи]\s+и\s+поправк[а-яё]*/iu);
  if (legalApplicability) result.current_legal_applicability_and_amendments = legalApplicability;
  if (/проезд\s+на\s+объект\s+не\s+требуетс[яь]/iu.test(text)) {
    result.travel_to_and_from_site_required = false;
  } else if (/проезд\s+на\s+объект\s+требуетс[яь]/iu.test(text)) {
    result.travel_to_and_from_site_required = true;
  }
  const travelCalculation = reference(text, /отдельн[а-яё]*\s+расч[её]т\s+проезд[а-яё]*/iu);
  if (travelCalculation) result.travel_cost_separate_calculation = travelCalculation;
  const approvalReference = reference(text, /согласовани[ея]\s+сметчик[а-яё]*/iu);
  if (approvalReference) result.estimator_approval_reference = approvalReference;
  return Object.freeze(result);
}

export function kgAuthorSupervisionMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID) return [];
  return KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_currency") ? "kgs" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-services-prompt:${parameterId}`,
      captured_at: "consumer-services-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the exact Kyrgyz author-supervision request.",
    },
  ]));
}

export function applyKgAuthorSupervisionPhysicalNormToServicesBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "author_supervision_service" ||
    plan.semanticFrame.materialSystem !== "kg_order_52_npa_author_supervision"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "PROJECT_COST_SERVICES",
    operation_class: "CALCULATE",
    material_system: "KG_AUTHOR_SUPERVISION",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "labor_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Авторский надзор по приложению 5 к приказу Минстроя КР №52-нпа",
      templateId: "services:kg-author-supervision-order-52-npa:v1",
      templateVersion: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_document_version,
      normId: KG_AUTHOR_SUPERVISION_NORM_ID,
      normFamilyId: "norm_family:services:kg_author_supervision",
      normSourceId: KG_AUTHOR_SUPERVISION_SOURCE_ID,
      normSourceTitle: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_title,
      normVersion: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_document_version,
      normReviewStatus: "government_primary_source_reviewed",
      normSourceProfile: "KG_PRIMARY" as const,
      normSourceJurisdiction: "KG",
      normSourcePublisher: "Министерство строительства Кыргызской Республики",
      normSourceEffectiveDate: "2022-04-28",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "services_kg_author_supervision_cost_currency",
      laborKey: "kg_author_supervision_service",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Стоимость авторского надзора заблокирована до подтверждения базы глав 1–9, применимости приказа и отдельного статуса проезда.",
        sourcePolicy: "manual_review" as const,
        formulaId: "kg_author_supervision_cost_blocked_v1",
        quantityFormula: "blocked until every exact legal, cost-basis and travel parameter is explicit",
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
      quantity: 1,
      unit: "set",
      unitPrice: resolution.calculated_kg_author_supervision_cost_currency!,
      comment: "0,4% от подтверждённой стоимости строительства по главам 1–9; проезд и число выездов автоматически не включаются.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "kg_author_supervision_cost_fraction_v1",
      quantityFormula: "1 service * round_currency(construction_estimated_cost_chapters_1_9_currency * 0.004)",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `costResult=${resolution.calculated_kg_author_supervision_cost_currency}`,
        "resultUnit=kgs",
        "travelIncluded=false",
        "automaticVisitCount=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: false,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
