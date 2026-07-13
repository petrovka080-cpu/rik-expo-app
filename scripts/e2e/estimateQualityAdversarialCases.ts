import type { ProfessionalCurrency, ProfessionalGroupKey } from "../../src/lib/ai/professionalEstimateTemplates";
import { forbiddenGenericMaterialLabels } from "../../src/lib/ai/professionalEstimateTemplates";
import type { SmartEstimatorInput, SmartEstimatorResult } from "../../src/lib/ai/smartEstimator";
import { runSmartEstimatorProtocol } from "../../src/lib/ai/smartEstimator";

export type EstimateQualityAdversarialMutation =
  | "carpet_masonry_row"
  | "laminate_brick_row"
  | "tile_roofing_row"
  | "foundation_carpet_row"
  | "socket_plumbing_row"
  | "plumbing_electrical_row"
  | "roof_bathroom_tile_row"
  | "kg_usd_total"
  | "kz_usd_total"
  | "missing_price_with_total"
  | "verified_zero_price"
  | "fake_supplier"
  | "random_price_marker"
  | "row_without_provenance"
  | "generic_material_row"
  | "paid_control_row"
  | "pdf_hash_mismatch"
  | "history_hash_mismatch"
  | "internal_key_visible"
  | "mojibake_visible";

export type EstimateQualityAdversarialCase = {
  id: string;
  user_input: string;
  input: SmartEstimatorInput;
  mutation: EstimateQualityAdversarialMutation;
  expected_blocker: string;
  fake_green_claimed: false;
};

const BASE_CASES: readonly Omit<EstimateQualityAdversarialCase, "id" | "fake_green_claimed">[] = [
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "carpet_masonry_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "ukladka laminata 120 m2 Bishkek",
    input: { user_input: "ukladka laminata 120 m2 Bishkek", selected_work_key: "laminate_laying", known_quantity: 120, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "laminate_brick_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "plitka 80 m2 Bishkek",
    input: { user_input: "plitka 80 m2 Bishkek", selected_work_key: "ceramic_tile_laying", known_quantity: 80, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "tile_roofing_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "plitny fundament 30 m3 Bishkek",
    input: { user_input: "plitny fundament 30 m3 Bishkek", selected_work_key: "slab_foundation", known_quantity: 30, known_unit: "m3", region: "KG_BISHKEK" },
    mutation: "foundation_carpet_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "rozetki 40 tochek Bishkek",
    input: { user_input: "rozetki 40 tochek Bishkek", selected_work_key: "socket_installation", known_quantity: 40, known_unit: "piece", region: "KG_BISHKEK" },
    mutation: "socket_plumbing_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "vodoprovod 45 metrov Bishkek",
    input: { user_input: "vodoprovod 45 metrov Bishkek", selected_work_key: "water_pipe_installation", known_quantity: 45, known_unit: "linear_m", region: "KG_BISHKEK" },
    mutation: "plumbing_electrical_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "gidroizolyaciya kryshi 100 m2 Bishkek",
    input: { user_input: "gidroizolyaciya kryshi 100 m2 Bishkek", selected_work_key: "roof_waterproofing", known_quantity: 100, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "roof_bathroom_tile_row",
    expected_blocker: "CROSS_DOMAIN_ROW_LEAK",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "kg_usd_total",
    expected_blocker: "USD_FOR_KG_OR_KZ",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Almaty",
    input: { user_input: "ukladka kovrolina 1500 m2 Almaty", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KZ_ALMATY" },
    mutation: "kz_usd_total",
    expected_blocker: "USD_FOR_KG_OR_KZ",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "missing_price_with_total",
    expected_blocker: "LINE_TOTAL_FROM_MISSING_PRICE",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "verified_zero_price",
    expected_blocker: "ZERO_AS_KNOWN_PRICE",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "fake_supplier",
    expected_blocker: "FAKE_SUPPLIER_FOUND",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "random_price_marker",
    expected_blocker: "RANDOM_PRICE_FOUND",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "row_without_provenance",
    expected_blocker: "ROW_WITHOUT_PROVENANCE",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "generic_material_row",
    expected_blocker: "GENERIC_MATERIAL_ROW",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "paid_control_row",
    expected_blocker: "PAID_CONTROL_ROW",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "pdf_hash_mismatch",
    expected_blocker: "REQUEST_HISTORY_PAYLOAD_MISMATCH",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "history_hash_mismatch",
    expected_blocker: "REQUEST_HISTORY_PAYLOAD_MISMATCH",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "internal_key_visible",
    expected_blocker: "INTERNAL_KEY_VISIBLE",
  },
  {
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    input: { user_input: "ukladka kovrolina 1500 m2 Bishkek", selected_work_key: "carpet_laying", known_quantity: 1500, known_unit: "m2", region: "KG_BISHKEK" },
    mutation: "mojibake_visible",
    expected_blocker: "MOJIBAKE_FOUND",
  },
];

function cloneResult(result: SmartEstimatorResult): SmartEstimatorResult {
  return JSON.parse(JSON.stringify(result)) as SmartEstimatorResult;
}

function firstLine(result: SmartEstimatorResult) {
  const line = result.snapshot?.professional_snapshot.lines[0];
  if (!line) throw new Error("ADVERSARIAL_CASE_WITHOUT_LINE");
  return line;
}

function injectDomainRow(result: SmartEstimatorResult, group: ProfessionalGroupKey, label: string): void {
  const snapshot = result.snapshot?.professional_snapshot;
  if (!snapshot) return;
  const source = { ...firstLine(result) };
  source.row_key = `${snapshot.selected_work_key}_adversarial_${group}`;
  source.row_domain = group;
  source.visible_name_ru = label;
  source.material_key = source.row_key;
  snapshot.lines.push(source);
}

function forceCurrency(result: SmartEstimatorResult, currency: "USD"): void {
  const snapshot = result.snapshot?.professional_snapshot;
  if (!snapshot) return;
  snapshot.currency = currency as unknown as ProfessionalCurrency;
  snapshot.totals.currency = currency as unknown as ProfessionalCurrency;
  for (const line of snapshot.lines) {
    line.price.currency = currency as unknown as ProfessionalCurrency;
  }
}

export function buildEstimateQualityAdversarialCases(): EstimateQualityAdversarialCase[] {
  const cases: EstimateQualityAdversarialCase[] = [];
  for (let index = 0; index < 300; index += 1) {
    const item = BASE_CASES[index % BASE_CASES.length];
    cases.push({
      id: `estimate_quality_adversarial_${String(index + 1).padStart(3, "0")}`,
      ...item,
      fake_green_claimed: false,
    });
  }
  return cases;
}

export function buildAdversarialSmartEstimatorResult(
  testCase: EstimateQualityAdversarialCase,
): SmartEstimatorResult {
  const result = cloneResult(runSmartEstimatorProtocol(testCase.input));
  const snapshot = result.snapshot?.professional_snapshot;
  if (!snapshot) throw new Error(`ADVERSARIAL_CASE_NOT_RESOLVED:${testCase.id}`);

  if (testCase.mutation === "carpet_masonry_row" || testCase.mutation === "laminate_brick_row") {
    injectDomainRow(result, "masonry", "Masonry units");
  } else if (testCase.mutation === "tile_roofing_row" || testCase.mutation === "roof_bathroom_tile_row") {
    injectDomainRow(result, testCase.mutation === "tile_roofing_row" ? "roofing" : "tile_stone", "Roofing bathroom tile membrane");
  } else if (testCase.mutation === "foundation_carpet_row") {
    injectDomainRow(result, "flooring", "Carpet roll in foundation");
  } else if (testCase.mutation === "socket_plumbing_row") {
    injectDomainRow(result, "plumbing_sewerage", "PPR pipe");
  } else if (testCase.mutation === "plumbing_electrical_row") {
    injectDomainRow(result, "electrical_power", "VVG cable");
  } else if (testCase.mutation === "kg_usd_total" || testCase.mutation === "kz_usd_total") {
    forceCurrency(result, "USD");
  } else if (testCase.mutation === "missing_price_with_total") {
    const line = firstLine(result);
    line.price.price_status = "PRICE_MISSING";
    line.price.unit_price = null;
    line.price.line_total = 123;
  } else if (testCase.mutation === "verified_zero_price") {
    const line = firstLine(result);
    line.price.price_status = "PRICE_VERIFIED";
    line.price.unit_price = 0;
  } else if (testCase.mutation === "fake_supplier") {
    const line = firstLine(result);
    (line.price as { fake_supplier_claimed: boolean }).fake_supplier_claimed = true;
    line.price.source_name = "fake supplier fixture";
  } else if (testCase.mutation === "random_price_marker") {
    const line = firstLine(result);
    (line.price as { fake_price_claimed: boolean }).fake_price_claimed = true;
    line.price.source_name = "random generated price";
  } else if (testCase.mutation === "row_without_provenance") {
    firstLine(result).row_key = "";
  } else if (testCase.mutation === "generic_material_row") {
    firstLine(result).visible_name_ru = forbiddenGenericMaterialLabels()[0] ?? "Generic material";
  } else if (testCase.mutation === "paid_control_row") {
    (firstLine(result) as { forbidden_as_paid_control_row: boolean }).forbidden_as_paid_control_row = true;
  } else if (testCase.mutation === "pdf_hash_mismatch") {
    snapshot.pdf_payload_hash = `${snapshot.pdf_payload_hash}_mismatch`;
  } else if (testCase.mutation === "history_hash_mismatch") {
    snapshot.history_payload_hash = `${snapshot.history_payload_hash}_mismatch`;
  } else if (testCase.mutation === "internal_key_visible") {
    snapshot.visible_rows[0].visible_name_ru = "internal_quality_key_visible";
  } else if (testCase.mutation === "mojibake_visible") {
    snapshot.visible_rows[0].visible_name_ru = "Р В Р’В Р РЋРЎСџ";
  }

  return result;
}
