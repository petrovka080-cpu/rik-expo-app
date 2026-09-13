import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA,
  WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  approved_pipe_route_linear_m: "Укажите длину утверждённой трассы трубы, пог. м.",
  system_application: "Подтвердите применение: только надземная безнапорная бытовая канализация.",
  hydraulic_and_appliance_design_reference: "Укажите ссылку на гидравлический расчёт и ведомость подключаемых приборов.",
  selected_nominal_diameter: "Подтвердите выбранный размер DN100/OD110.",
  selected_product_code: "Подтвердите точный код продукта Wavin Osma C3766BK.",
  selected_commercial_pipe_length_m: "Подтвердите выбранную коммерческую длину трубы 3 м.",
  fitting_schedule: "Укажите ссылку на ведомость фитингов, ответвлений, прочисток и смещений.",
  fitting_socket_and_insertion_layout: "Укажите ссылку на схему раструбов и глубин вставки.",
  reusable_cut_length_plan: "Укажите ссылку на план раскроя и повторного использования отрезков.",
  thermal_movement_design: "Укажите ссылку на проект компенсации температурных перемещений.",
  support_schedule: "Укажите ссылку на ведомость опор и креплений.",
  firestopping_scope: "Укажите область огнезаделки проходок или явное проектное обоснование её отсутствия.",
  acoustic_scope: "Укажите акустические требования или явное проектное обоснование их отсутствия.",
  project_cutting_allowance_percent: "Укажите утверждённый проектный припуск на резку, %; производитель общий процент не публикует.",
  supplier_purchase_packaging: "Укажите явный проектный заказ труб 3 м и подтвердите, что упаковка поставщика 57 шт. не принята как расход.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractWavinOsmaC3766BkCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?:(?:wavin\s+)?(?:osma\s+)?c3766bk|3080894|5098987303844)/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID,
  };
  const routeLength = firstNumber(
    text,
    /утвержд[её]нн[а-яё]*\s+трасс[а-яё]*\s+труб[а-яё]*\D{0,14}(\d+(?:[.,]\d+)?)\s*(?:пог\.?\s*м|м|linear_m)/iu,
  );
  if (routeLength !== null && routeLength > 0) result.approved_pipe_route_linear_m = routeLength;
  if (/применени[ея]\s+систем[ыа]\s*[:=]\s*ABOVE_GROUND_SOIL_AND_WASTE/iu.test(text)) {
    result.system_application = "ABOVE_GROUND_SOIL_AND_WASTE";
  }
  const hydraulicReference = reference(text, /гидравлическ[а-яё]*\s+проект/iu);
  if (hydraulicReference) result.hydraulic_and_appliance_design_reference = hydraulicReference;
  if (/выбранн[а-яё]*\s+диаметр\s*[:=]\s*DN\s*100\s*\/\s*OD\s*110/iu.test(text)) {
    result.selected_nominal_diameter = "DN100_OD110";
  }
  if (/(?:код\s+продукт[а-яё]*\s*[:=]\s*)?C3766BK/iu.test(text)) {
    result.selected_product_code = "C3766BK";
  }
  const commercialLength = firstNumber(
    text,
    /коммерческ[а-яё]*\s+длин[а-яё]*\s+труб[а-яё]*\D{0,14}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (commercialLength !== null && commercialLength > 0) {
    result.selected_commercial_pipe_length_m = commercialLength;
  }
  const fittingSchedule = reference(text, /ведомост[ьи]\s+фитинг[а-яё]*/iu);
  if (fittingSchedule) result.fitting_schedule = fittingSchedule;
  const socketLayout = reference(text, /схем[а-яё]*\s+раструб[а-яё]*\s+и\s+глубин[а-яё]*\s+вставк[а-яё]*/iu);
  if (socketLayout) result.fitting_socket_and_insertion_layout = socketLayout;
  const cutPlan = reference(text, /план\s+раскро[яй]\s+и\s+повторн[а-яё]*\s+использовани[яе]\s+отрезк[а-яё]*/iu);
  if (cutPlan) result.reusable_cut_length_plan = cutPlan;
  const thermalDesign = reference(text, /проект\s+температурн[а-яё]*\s+перемещени[яй]/iu);
  if (thermalDesign) result.thermal_movement_design = thermalDesign;
  const supportSchedule = reference(text, /ведомост[ьи]\s+опор/iu);
  if (supportSchedule) result.support_schedule = supportSchedule;
  const firestoppingScope = reference(text, /огнезаделк[а-яё]*/iu);
  if (firestoppingScope) result.firestopping_scope = firestoppingScope;
  const acousticScope = reference(text, /акустик[а-яё]*/iu);
  if (acousticScope) result.acoustic_scope = acousticScope;
  const cuttingAllowance = firstNumber(
    text,
    /проектн[а-яё]*\s+припуск[а-яё]*\s+на\s+резк[а-яё]*\D{0,12}(\d+(?:[.,]\d+)?)\s*%/iu,
  );
  if (cuttingAllowance !== null && cuttingAllowance >= 0) {
    result.project_cutting_allowance_percent = cuttingAllowance;
  }
  const projectOrder = text.match(new RegExp(
    `PROJECT_ORDER\\s*:\\s*(\\d+)\\s*[xх×]\\s*3\\s*M\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*M\\s*;\\s*SUPPLIER_MASTER_PACK_${WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT}_NOT_ASSUMED`,
    "iu",
  ));
  if (projectOrder?.[1] && projectOrder[2]) {
    result.supplier_purchase_packaging =
      `PROJECT_ORDER:${Number(projectOrder[1])}X3M=${decimal(projectOrder[2])}M;SUPPLIER_MASTER_PACK_${WAVIN_OSMA_C3766BK_SUPPLIER_MASTER_PACK_PIECE_COUNT}_NOT_ASSUMED`;
  }
  return Object.freeze(result);
}

export function wavinOsmaC3766BkMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (
    canonicalParameters?.product_profile_id !==
    WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID
  ) return [];
  return WAVIN_OSMA_C3766BK_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_linear_m")
        ? "linear_m"
        : parameterId.endsWith("_length_m")
          ? "m"
          : parameterId.endsWith("_percent")
            ? "percent"
            : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-sewerage-prompt:${parameterId}`,
      captured_at: "consumer-sewerage-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the exact Wavin Osma C3766BK project request.",
    },
  ]));
}

export function applyWavinOsmaC3766BkPhysicalNormToSewerageBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "above_ground_soil_waste_pipe_system" ||
    plan.semanticFrame.materialSystem !== "wavin_osma_c3766bk_110mm_3m"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "ABOVE_GROUND_SOIL_WASTE_PIPE_SYSTEM",
    operation_class: "INSTALL",
    material_system: "WAVIN_OSMA_C3766BK_110MM_3M",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Труба Wavin Osma C3766BK PVC-U DN100/OD110, раструбная, 3 м — проектный заказ",
      templateId: "sewerage:wavin-osma-c3766bk-110mm-3m:v1",
      templateVersion: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_document_version,
      normId: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
      normFamilyId: "norm_family:sewerage:wavin_osma_c3766bk",
      normSourceId: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
      normSourceTitle: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_title,
      normVersion: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Wavin",
      normSourceEffectiveDate: "2025-08",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "sewerage_wavin_osma_c3766bk_project_procurement_linear_m",
      materialKey: "wavin_osma_c3766bk_110mm_3m_pipe",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Количество Wavin Osma заблокировано до подтверждения всех 15 проектных параметров трассы, системы, раскроя и закупки.",
        sourcePolicy: "manual_review" as const,
        formulaId: "wavin_osma_c3766bk_quantity_blocked_v1",
        quantityFormula: "blocked until every exact route, design, cut and purchase parameter is explicit",
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
      quantity: resolution.calculated_wavin_osma_project_procurement_quantity_linear_m!,
      unit: "linear_m",
      comment: "Закупочный объём задан проектным заказом; геометрическая норма 1:1 не включает фитинги, вставку в раструбы, раскрой или общий процент отходов.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "wavin_osma_c3766bk_exact_project_order_v1",
      quantityFormula: "supplier_purchase_packaging, with geometric pipe quantity = approved_pipe_route_linear_m * 1",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `geometricResult=${resolution.calculated_wavin_osma_geometric_pipe_quantity_linear_m}`,
        `procurementResult=${resolution.calculated_wavin_osma_project_procurement_quantity_linear_m}`,
        "resultUnit=linear_m",
        "automaticCuttingAllowance=false",
        "automaticThreeMetreRounding=false",
        "supplierMasterPack57Assumed=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
