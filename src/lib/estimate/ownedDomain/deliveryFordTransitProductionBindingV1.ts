import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  FORD_TRANSIT_V363_DELIVERY_NORM_ID, FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID,
  FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS, FORD_TRANSIT_V363_DELIVERY_SOURCE_ID,
  FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA, resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  cargo_weight_kg: "Укажите подтверждённую массу груза, кг.",
  cargo_volume_m3: "Укажите подтверждённый объём груза, м³.",
  selected_vehicle_model_and_derivative: "Укажите точную модель и модификацию выбранного Ford Transit.",
  selected_verified_usable_payload_kg: "Укажите проверенную грузоподъёмность выбранной модификации, кг.",
  selected_verified_usable_loadspace_m3: "Укажите проверенный полезный объём выбранной модификации, м³.",
  selected_verified_kerb_mass_kg: "Укажите проверенную снаряжённую массу автомобиля, кг.",
  driver_crew_options_and_accessories_weight_kg: "Укажите массу водителя, экипажа, опций и аксессуаров, кг.",
  payload_margin_for_error_kg: "Укажите 5% снаряжённой массы как запас по рекомендации Ford, кг.",
  axle_load_limits_confirmed: "Подтвердите допустимые нагрузки на оси.",
  load_securing_and_compatibility_confirmed: "Подтвердите крепление и совместимость груза.",
  route_and_access_confirmed: "Подтвердите маршрут и доступ к точкам погрузки и выгрузки.",
  supplier_billing_scope: "Укажите отдельный тариф перевозчика в формате SUPPLIER_SCOPE:…",
});
function decimal(raw: string): number | null {
  const value = Number(raw.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
function ref(text: string, label: RegExp): string | null {
  return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null;
}
function numberAfter(text: string, label: RegExp, unit: RegExp): number | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d[\\d\\s]*(?:[.,]\\d+)?)\\s*(?:${unit.source})`, "iu"));
  return match?.[1] ? decimal(match[1]) : null;
}
export function extractFordTransitDeliveryCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*ford\s+transit)(?=.*(?:v363|500\s+l4\s+h3))/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID };
  const numbers: readonly (readonly [string, RegExp, RegExp])[] = [
    ["cargo_weight_kg", /масс[а-яё]*\s+груз[а-яё]*/iu, /(?:кг|kg)/iu],
    ["cargo_volume_m3", /объ[её]м\s+груз[а-яё]*/iu, /(?:м3|м³|m3)/iu],
    ["selected_verified_usable_payload_kg", /проверенн[а-яё]*\s+грузоподъ[её]мност[а-яё]*/iu, /(?:кг|kg)/iu],
    ["selected_verified_usable_loadspace_m3", /проверенн[а-яё]*\s+полезн[а-яё]*\s+объ[её]м/iu, /(?:м3|м³|m3)/iu],
    ["selected_verified_kerb_mass_kg", /проверенн[а-яё]*\s+снаряж[её]нн[а-яё]*\s+масс[а-яё]*/iu, /(?:кг|kg)/iu],
    ["driver_crew_options_and_accessories_weight_kg", /масс[а-яё]*\s+водител[а-яё]*,?\s+экипаж[а-яё]*,?\s+опци[а-яё]*\s+и\s+аксессуар[а-яё]*/iu, /(?:кг|kg)/iu],
    ["payload_margin_for_error_kg", /запас\s+грузоподъ[её]мност[а-яё]*/iu, /(?:кг|kg)/iu],
  ];
  for (const [id, label, unit] of numbers) {
    const value = numberAfter(text, label, unit);
    if (value !== null && value >= 0) result[id] = value;
  }
  const model = ref(text, /модель\s+и\s+модификаци[а-яё]*/iu);
  const billing = ref(text, /тариф\s+перевозчик[а-яё]*/iu);
  if (model) result.selected_vehicle_model_and_derivative = model;
  if (billing) result.supplier_billing_scope = billing;
  if (/нагрузк[а-яё]*\s+на\s+оси\s+подтвержд[её]н[а-яё]*/iu.test(text)) result.axle_load_limits_confirmed = true;
  if (/креплени[ея]\s+и\s+совместимост[а-яё]*\s+груз[а-яё]*\s+подтвержд[её]н[а-яё]*/iu.test(text)) result.load_securing_and_compatibility_confirmed = true;
  if (/маршрут\s+и\s+доступ\s+подтвержд[её]н[а-яё]*/iu.test(text)) result.route_and_access_confirmed = true;
  return Object.freeze(result);
}
export function fordTransitDeliveryMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID) return [];
  return FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, {
    value, unit_id: id.endsWith("_kg") ? "kg" : id.endsWith("_m3") ? "m3" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-delivery-prompt:${id}`,
    captured_at: "consumer-delivery-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact selected Ford Transit delivery request.",
  }]));
}
export function applyFordTransitDeliveryPhysicalNormToBoqV1(plan: EstimatorReasoningPlan, rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "selected_vehicle_delivery" || plan.semanticFrame.materialSystem !== "ford_transit_v363_delivery") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "MATERIAL_DELIVERY", operation_class: "TRANSPORT",
    material_system: "FORD_TRANSIT_V363_500_L4_H3", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters),
  });
  return rows.map((row) => {
    if (row.code !== "logistics_1") return row;
    const source = {
      ...row, professionalPhysicalNormApplicabilityV1: resolution, name: "Рейсы Ford Transit V363 500 L4 H3 по ограничениям массы и объёма",
      templateId: "delivery:ford-transit-v363-500-l4-h3:v1",
      templateVersion: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_document_version,
      normId: FORD_TRANSIT_V363_DELIVERY_NORM_ID, normFamilyId: "norm_family:delivery:ford_transit_v363",
      normSourceId: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID, normSourceTitle: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_title,
      normVersion: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed", normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT", normSourcePublisher: "Ford Motor Company",
      normSourceEffectiveDate: "2025-01-01", normSourceCheckedAt: "2026-09-12",
      normSourceReference: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public", normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "delivery_ford_transit_selected_vehicle_trip", materialKey: "ford_transit_delivery_service",
    };
    if (resolution.status !== "APPLIED") return {
      ...source, quantity: 0, unitPrice: 0,
      comment: "Число рейсов заблокировано до подтверждения выбранной модификации, фактических ограничений, маршрута и тарифа.",
      sourcePolicy: "manual_review" as const, formulaId: "ford_transit_delivery_trip_count_blocked_v1",
      quantityFormula: "blocked until every vehicle, cargo, legal and billing input is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false,
      parameterBlockerIds: resolution.blockers,
    };
    return {
      ...source, quantity: resolution.calculated_ford_transit_required_trip_count!, unit: "trip",
      comment: "Рейсы рассчитаны по более жёсткому ограничению массы или объёма; тариф перевозчика остаётся отдельным источником цены.",
      sourcePolicy: "configured_reference" as const, formulaId: "ford_transit_delivery_trip_count_v1",
      quantityFormula: "ceil(max(cargo_weight/effective_payload,cargo_volume/selected_loadspace))",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_ford_transit_required_trip_count}`, "resultUnit=trip",
        "priceSource=separate_supplier_scope", "headlinePayloadAsUniversalRate=false",
      ].join("; "),
      includedInEstimate: true, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: [],
    };
  });
}
