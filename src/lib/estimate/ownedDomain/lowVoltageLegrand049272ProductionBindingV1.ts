import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  LEGRAND_049272_BUS_SCS_NORM_ID,
  LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID,
  LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS,
  LEGRAND_049272_BUS_SCS_SOURCE_ID,
  LEGRAND_049272_BUS_SCS_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  approved_route_length_linear_m: "Укажите суммарную утверждённую длину маршрутов всех цепей BUS/SCS Legrand 049272, м.",
  circuit_count_and_point_to_point_schedule: "Укажите число цепей и номер утверждённой ведомости соединений точка-точка BUS/SCS.",
  bus_scs_system_compatibility_confirmed: "Подтвердите совместимость кабеля Legrand 049272 с выбранной системой BUS/SCS.",
  exact_cable_product_reference: "Подтвердите кабель Legrand 049272, EAN 3414971327986; это не UTP-кабель.",
  routing_environment: "Подтвердите внутреннюю надземную прокладку; подземная применимость требует отдельного решения из-за расхождения ревизий источника.",
  power_cable_segregation_confirmed: "Подтвердите раздельную прокладку от силовых кабелей выше 50 В.",
  device_and_panel_termination_allowance_m: "Укажите явную добавочную длину на оконцевание устройств и панелей, м, включая 0.",
  service_loop_allowance_m: "Укажите явную добавочную длину сервисных петель, м, включая 0.",
  vertical_drop_and_riser_allowance_m: "Укажите явную добавочную длину вертикальных спусков и стояков, м, включая 0.",
  reusable_reel_remnant_plan: "Укажите номер плана раскроя и повторного использования остатков 200-метровых барабанов.",
  fire_class_requirement: "Подтвердите требуемый класс реакции на огонь Cca-s1b,d1,a1.",
  selected_reel_length_m: "Подтвердите поставочную длину выбранного барабана: 200 м.",
  project_cutting_allowance_percent: "Укажите проектный процент раскройного запаса, включая 0; автоматический запас запрещён.",
  installed_circuit_test_and_certification_scope: "Укажите номер программы испытаний и сертификации смонтированных цепей BUS/SCS.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

function field(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

export function extractLegrand049272BusScsCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?:legrand\s*)?0?49272|3414971327986/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID,
  };
  const routeLength = firstNumber(
    text,
    /(?:утвержд[её]нн[а-яё]*\s+)?(?:суммарн[а-яё]*\s+)?длин[а-яё]*\s+маршрут[а-яё]*\D{0,16}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (routeLength !== null && routeLength > 0) result.approved_route_length_linear_m = routeLength;
  const circuitSchedule = field(
    text,
    /(?:ведомост[ьи]\s+цеп[а-яё]*\s+и\s+точк[а-яё]*[- ]точк[а-яё]*|point[- ]to[- ]point\s+schedule)\s*[:№#=]\s*([^;,\n]+)/iu,
  );
  if (circuitSchedule) result.circuit_count_and_point_to_point_schedule = circuitSchedule;
  if (/(?:совместимост[ьи]\s+(?:кабел[а-яё]*\s+)?(?:с\s+)?(?:систем[а-яё]*\s+)?bus\s*[/ -]?\s*scs|bus\s*[/ -]?\s*scs\s+compatibility)\s*[:=]?\s*подтвержд/iu.test(text)) {
    result.bus_scs_system_compatibility_confirmed = true;
  }
  if (/(?:legrand\s*)?0?49272/iu.test(text) && /3414971327986/iu.test(text)) {
    result.exact_cable_product_reference = "LEGRAND 049272/EAN3414971327986";
  }
  if (/(?:сред[а-яё]*\s+прокладк[а-яё]*|routing\s+environment)\s*[:=]?\s*внутренн[а-яё]*\s+надземн/iu.test(text)) {
    result.routing_environment = "INDOOR_ABOVE_GROUND";
  }
  if (/(?:раздельн[а-яё]*\s+прокладк[а-яё]*\s+от\s+силов[а-яё]*\s+кабел[а-яё]*\s+выше\s+50\s*в|power\s+cable\s+segregation)\s*[:=]?\s*подтвержд/iu.test(text)) {
    result.power_cable_segregation_confirmed = true;
  }
  const terminationAllowance = firstNumber(
    text,
    /(?:добавочн[а-яё]*\s+длин[а-яё]*\s+на\s+)?оконцевани[ея]\s+(?:устройств\s+и\s+панел[а-яё]*\s*)?\D{0,8}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (terminationAllowance !== null && terminationAllowance >= 0) {
    result.device_and_panel_termination_allowance_m = terminationAllowance;
  }
  const serviceLoopAllowance = firstNumber(
    text,
    /(?:добавочн[а-яё]*\s+длин[а-яё]*\s+)?сервисн[а-яё]*\s+петел[а-яё]*\D{0,8}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (serviceLoopAllowance !== null && serviceLoopAllowance >= 0) {
    result.service_loop_allowance_m = serviceLoopAllowance;
  }
  const verticalAllowance = firstNumber(
    text,
    /(?:добавочн[а-яё]*\s+длин[а-яё]*\s+)?вертикальн[а-яё]*\s+спуск[а-яё]*\s+и\s+стояк[а-яё]*\D{0,8}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (verticalAllowance !== null && verticalAllowance >= 0) {
    result.vertical_drop_and_riser_allowance_m = verticalAllowance;
  }
  const remnantPlan = field(
    text,
    /(?:план\s+раскроя\s+и\s+повторн[а-яё]*\s+использовани[а-яё]*\s+остатк[а-яё]*|reel\s+remnant\s+plan)\s*[:№#=]\s*([a-z0-9._/-]+)/iu,
  );
  if (remnantPlan) result.reusable_reel_remnant_plan = remnantPlan;
  if (/cca\s*-?\s*s1b\s*,?\s*d1\s*,?\s*a1/iu.test(text)) {
    result.fire_class_requirement = "Cca-s1b,d1,a1";
  }
  const reelLength = firstNumber(
    text,
    /(?:поставочн[а-яё]*\s+)?длин[а-яё]*\s+(?:выбранн[а-яё]*\s+)?барабан[а-яё]*\D{0,12}(\d+(?:[.,]\d+)?)\s*м/iu,
  );
  if (reelLength !== null && reelLength > 0) result.selected_reel_length_m = reelLength;
  const cuttingAllowance = firstNumber(
    text,
    /(?:проектн[а-яё]*\s+)?(?:раскройн[а-яё]*\s+)?запас\D{0,10}(\d+(?:[.,]\d+)?)\s*%/iu,
  );
  if (cuttingAllowance !== null && cuttingAllowance >= 0) {
    result.project_cutting_allowance_percent = cuttingAllowance;
  }
  const testScope = field(
    text,
    /(?:программ[а-яё]*\s+)?испытан[а-яё]*\s+и\s+сертификаци[а-яё]*\s*[:№#=]\s*([a-z0-9._/-]+)/iu,
  );
  if (testScope) result.installed_circuit_test_and_certification_scope = testScope;
  return Object.freeze(result);
}

export function legrand049272BusScsMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID) {
    return [];
  }
  return LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_linear_m") || parameterId.endsWith("_allowance_m") ||
        parameterId.endsWith("_length_m")
        ? "linear_m"
        : parameterId.endsWith("_percent")
          ? "percent"
          : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-low-voltage-prompt:${parameterId}`,
      captured_at: "consumer-low-voltage-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the Legrand 049272 BUS/SCS request.",
    },
  ]));
}

export function applyLegrand049272BusScsPhysicalNormToLowVoltageBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "nurse_call_bus_scs_system" ||
    plan.semanticFrame.materialSystem !== "legrand_049272_bus_scs_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "LOW_VOLTAGE_BUS_SCS",
    operation_class: "INSTALL",
    material_system: "LEGRAND_049272_BUS_SCS_CABLE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      name: "Кабель Legrand 049272 BUS/SCS 2×0,56 мм², Cca-s1b,d1,a1 (не UTP)",
      templateId: "low-voltage:legrand-049272-bus-scs:v1",
      templateVersion: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_document_version,
      normId: LEGRAND_049272_BUS_SCS_NORM_ID,
      normFamilyId: "norm_family:low_voltage:legrand_049272_bus_scs_cable",
      normSourceId: LEGRAND_049272_BUS_SCS_SOURCE_ID,
      normSourceTitle: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_title,
      normVersion: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Legrand",
      normSourceEffectiveDate: "2026-09",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "low_voltage_legrand_049272_bus_scs_design_cable",
      materialKey: "legrand_049272_bus_scs_cable",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Расход Legrand 049272 заблокирован до утверждения цепей BUS/SCS, трасс, раздельной прокладки и всех явных проектных добавок.",
        sourcePolicy: "manual_review" as const,
        formulaId: "legrand_049272_design_cable_quantity_blocked_v1",
        quantityFormula: "blocked until every exact BUS/SCS applicability parameter is explicit",
        calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}; genericUtpSubstitution=false`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: resolution.blockers,
      };
    }
    return {
      ...source,
      quantity: resolution.calculated_legrand_049272_design_cable_quantity_linear_m!,
      unit: "linear_m",
      comment: "Проектная длина по утверждённым BUS/SCS-маршрутам и только явно заданным добавкам; округление до барабанов не выполняется.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "legrand_049272_exact_design_cable_quantity_v1",
      quantityFormula: "(approved_route_length_linear_m + termination_allowance_m + service_loop_allowance_m + vertical_allowance_m) * (1 + project_cutting_allowance_percent / 100)",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_legrand_049272_design_cable_quantity_linear_m}`,
        "resultUnit=linear_m",
        "reelRounding=false",
        "genericUtpSubstitution=false",
        "projectAllowancesExplicit=true",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
