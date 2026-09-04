export type SemanticBoqReadinessStatus = "READY_FOR_BOQ" | "NEEDS_INPUT";

export type PumpStationSemanticInputs = {
  design_flow_m3_h: number | null;
  required_head_m: number | null;
  inlet_pressure_bar: number | null;
  outlet_pressure_bar: number | null;
  duty_pump_count: number | null;
  standby_pump_count: number | null;
  pipe_diameter_mm: number | null;
  pipe_pressure_class: string | null;
  pipe_material: string | null;
  network_length_m: number | null;
  valve_configuration: string | null;
  placement: string | null;
  foundation_and_geology: string | null;
  electrical_supply: string | null;
  control_and_automation: string | null;
  engineering_systems: string | null;
  medium: string | null;
  testing_and_commissioning: string | null;
  delivery_conditions: string | null;
};

export type PumpStationSemanticReadiness = {
  status: SemanticBoqReadinessStatus;
  inputs: PumpStationSemanticInputs;
  missingInputIds: (keyof PumpStationSemanticInputs)[];
};

export type SemanticBoqGateCounters = {
  public_name_structural_violation_count: number;
  generic_resource_name_violation_count: number;
  semantic_owner_violation_count: number;
  missing_operation_mapping_count: number;
  missing_required_specification_count: number;
  uncovered_required_operation_count: number;
  cross_domain_leakage_count: number;
  duplicate_resource_signature_count: number;
  double_count_violation_count: number;
  bom_consistency_violation_count: number;
  untrusted_non_null_price_count: number;
  mandatory_unpriced_row_count: number;
  false_final_total_count: number;
};

export type SemanticBoqGateRow = {
  rowId: string;
  publicNameRu: string;
  workTitleRu?: string | null;
  canonicalResourceId?: string | null;
  semanticOwnerId?: string | null;
  operationId?: string | null;
  domainId?: string | null;
  specificationHash?: string | null;
  requiredSpecificationComplete?: boolean;
  required?: boolean;
  included?: boolean;
  unit?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  total?: number | null;
  priceSourceId?: string | null;
  priceSourceTrusted?: boolean;
  assemblyId?: string | null;
  assemblyMode?: "closed" | "open" | null;
  bomComponentIds?: readonly string[];
  componentOfAssemblyId?: string | null;
};

const GENERIC_PUBLIC_RESOURCE_NAME = [
  /^основн(?:ой|ые) материал/iu,
  /^материал(?:ы)? по проекту/iu,
  /^проч(?:ий|ие) материал/iu,
  /^оборудование$/iu,
  /^комплект материалов/iu,
  /^креп[её]ж,? метизы и фиксаторы/iu,
  /^технологический запас/iu,
] as const;

function finitePositive(value: unknown): number | null {
  const direct = typeof value === "number" ? value : typeof value === "string"
    ? Number(value.trim().replace(",", "."))
    : Number.NaN;
  return Number.isFinite(direct) && direct > 0 ? direct : null;
}

function firstOverride(
  overrides: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    const candidate = overrides[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && "value" in candidate) {
      const value = (candidate as { value?: unknown }).value;
      if (value !== null && value !== undefined && value !== "") return value;
    }
    if (candidate !== null && candidate !== undefined && candidate !== "") return candidate;
  }
  return null;
}

function promptNumber(prompt: string, expressions: readonly RegExp[]): number | null {
  for (const expression of expressions) {
    const match = prompt.match(expression);
    const value = finitePositive(match?.[1]);
    if (value !== null) return value;
  }
  return null;
}

function promptText(prompt: string, expression: RegExp, value: string): string | null {
  return expression.test(prompt) ? value : null;
}

function overrideText(overrides: Readonly<Record<string, unknown>>, keys: readonly string[]): string | null {
  const value = firstOverride(overrides, keys);
  if (typeof value === "boolean") return value ? "confirmed" : null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Resolves only facts explicitly supplied by the user. In particular, a bare
 * `100 м` is network length and can never become pump capacity.
 */
export function resolvePumpStationSemanticReadiness(input: {
  prompt: string;
  overrides?: Readonly<Record<string, unknown>>;
}): PumpStationSemanticReadiness {
  const prompt = input.prompt.normalize("NFKC");
  const overrides = input.overrides ?? {};
  const numberValue = (keys: readonly string[], expressions: readonly RegExp[]): number | null =>
    finitePositive(firstOverride(overrides, keys)) ?? promptNumber(prompt, expressions);
  const textValue = (keys: readonly string[], expression: RegExp, promptValue: string): string | null =>
    overrideText(overrides, keys) ?? promptText(prompt, expression, promptValue);

  const inputs: PumpStationSemanticInputs = {
    design_flow_m3_h: numberValue(
      ["design_flow_m3_h", "capacity_m3_h", "flow_m3_h"],
      [/(?:расход|подача|производительность)\s*(?:=|—|-|:)?\s*(\d+(?:[,.]\d+)?)\s*(?:м3\/ч|м³\/ч|m3\/h)/iu, /(\d+(?:[,.]\d+)?)\s*(?:м3\/ч|м³\/ч|m3\/h)/iu],
    ),
    required_head_m: numberValue(
      ["required_head_m", "head_m"],
      [/(?:напор|подъ[её]м)\s*(?:=|—|-|:)?\s*(\d+(?:[,.]\d+)?)\s*м(?:\s|$)/iu],
    ),
    inlet_pressure_bar: numberValue(
      ["inlet_pressure_bar", "suction_pressure_bar"],
      [/(?:давление\s+на\s+входе|входное\s+давление)\s*(?:=|—|-|:)?\s*(\d+(?:[,.]\d+)?)\s*(?:бар|bar)/iu],
    ),
    outlet_pressure_bar: numberValue(
      ["outlet_pressure_bar", "discharge_pressure_bar"],
      [/(?:давление\s+на\s+выходе|выходное\s+давление)\s*(?:=|—|-|:)?\s*(\d+(?:[,.]\d+)?)\s*(?:бар|bar)/iu],
    ),
    duty_pump_count: numberValue(
      ["duty_pump_count", "working_pump_count"],
      [/(\d+)\s*(?:рабоч(?:ий|их|ие)|duty)\s*(?:насос|агрегат)?/iu],
    ),
    standby_pump_count: numberValue(
      ["standby_pump_count", "reserve_pump_count"],
      [/(\d+)\s*(?:резервн(?:ый|ых|ые)|standby)\s*(?:насос|агрегат)?/iu],
    ),
    pipe_diameter_mm: numberValue(
      ["pipe_diameter_mm", "diameter_mm", "dn_mm"],
      [/(?:DN|Ду|d)\s*(\d+(?:[,.]\d+)?)/iu, /диаметр\s*(?:=|—|-|:)?\s*(\d+(?:[,.]\d+)?)\s*мм/iu],
    ),
    pipe_pressure_class: textValue(["pipe_pressure_class", "pressure_class"], /\bPN\s*\d+/iu, prompt.match(/\bPN\s*\d+/iu)?.[0] ?? "PN confirmed"),
    pipe_material: textValue(["pipe_material"], /\b(?:ПНД|ПЭ\s*100|PE\s*100|сталь|ВЧШГ|полипропилен)\b/iu, prompt.match(/\b(?:ПНД|ПЭ\s*100|PE\s*100|сталь|ВЧШГ|полипропилен)\b/iu)?.[0] ?? "material confirmed"),
    network_length_m: numberValue(
      ["network_length_m", "pipe_length_m", "length_m"],
      [/(\d+(?:[,.]\d+)?)\s*м(?:\s|$)/iu],
    ),
    valve_configuration: textValue(["valve_configuration", "valves"], /(?:задвиж|клапан|арматур)/iu, "valve configuration confirmed"),
    placement: textValue(["placement", "station_placement"], /(?:в\s+помещении|подземн|наземн|контейнерн|наружн)/iu, "placement confirmed"),
    foundation_and_geology: textValue(["foundation_and_geology", "foundation", "geology"], /(?:фундамент|основани|геолог|грунт)/iu, "foundation and geology confirmed"),
    electrical_supply: textValue(["electrical_supply", "power_supply"], /(?:электроснаб|питан(?:ие|ия)|\b\d{3}\s*В\b|кВт)/iu, "electrical supply confirmed"),
    control_and_automation: textValue(["control_and_automation", "automation", "control"], /(?:автоматик|управлен|ЧРП|VFD|SCADA)/iu, "control confirmed"),
    engineering_systems: textValue(["engineering_systems"], /(?:вентиляц|отоплен|дренаж|освещен)/iu, "engineering systems confirmed"),
    medium: textValue(["medium", "pumped_medium"], /(?:питьев|водоснаб|вода|сток|канализац)/iu, "medium confirmed"),
    testing_and_commissioning: textValue(["testing_and_commissioning", "testing"], /(?:испытан|пусконалад|опрессов)/iu, "testing confirmed"),
    delivery_conditions: textValue(["delivery_conditions", "delivery"], /(?:доставк|логист|самовывоз)/iu, "delivery confirmed"),
  };
  const missingInputIds = (Object.keys(inputs) as (keyof PumpStationSemanticInputs)[])
    .filter((key) => inputs[key] === null);
  return {
    status: missingInputIds.length === 0 ? "READY_FOR_BOQ" : "NEEDS_INPUT",
    inputs,
    missingInputIds,
  };
}

export function isPublicBoqNameStructurallyValid(nameRu: string, workTitleRu?: string | null): boolean {
  const normalized = nameRu.trim().replace(/\s+/gu, " ");
  if (!normalized || /[:：]/u.test(normalized)) return false;
  if (workTitleRu?.trim()) {
    const publicName = normalized.toLocaleLowerCase("ru-RU");
    const workTitle = workTitleRu.trim().replace(/\s+/gu, " ").toLocaleLowerCase("ru-RU");
    const appendedAt = publicName.lastIndexOf(workTitle);
    if (appendedAt > 0) {
      const prefix = publicName.slice(0, appendedAt).trimEnd();
      if (/(?:[-–—,;|/()]|\b(?:для|по))$/iu.test(prefix)) return false;
    }
  }
  return !/(?:без цены|цена не определена|price_missing|источник цены)/iu.test(normalized);
}

export function isGenericPublicBoqResourceName(nameRu: string): boolean {
  return GENERIC_PUBLIC_RESOURCE_NAME.some((pattern) => pattern.test(nameRu.trim()));
}

export function auditSemanticBoqGate(input: {
  rows: readonly SemanticBoqGateRow[];
  requiredOperationIds?: readonly string[];
  expectedDomainId?: string | null;
  grandTotal?: number | null;
}): SemanticBoqGateCounters {
  const included = input.rows.filter((row) => row.included !== false);
  const duplicateSignatures = new Map<string, number>();
  for (const row of included) {
    const signature = [row.canonicalResourceId ?? row.publicNameRu, row.specificationHash ?? "", row.unit ?? ""]
      .map((value) => String(value).trim().toLocaleLowerCase("ru-RU"))
      .join("|");
    duplicateSignatures.set(signature, (duplicateSignatures.get(signature) ?? 0) + 1);
  }
  const closedAssemblies = new Map(included
    .filter((row) => row.assemblyId && row.assemblyMode === "closed")
    .map((row) => [row.assemblyId!, row]));
  const mandatoryUnpriced = included.filter((row) => row.required !== false && row.unitPrice == null);
  const untrustedPrices = included.filter((row) => row.unitPrice != null && (!row.priceSourceId || row.priceSourceTrusted !== true));
  const requiredOperations = new Set(input.requiredOperationIds ?? []);
  const coveredOperations = new Set(included.map((row) => row.operationId?.trim()).filter(Boolean) as string[]);
  return {
    public_name_structural_violation_count: included.filter((row) =>
      !isPublicBoqNameStructurallyValid(row.publicNameRu, row.workTitleRu)
    ).length,
    generic_resource_name_violation_count: included.filter((row) =>
      isGenericPublicBoqResourceName(row.publicNameRu)
    ).length,
    semantic_owner_violation_count: included.filter((row) => !row.semanticOwnerId?.trim()).length,
    missing_operation_mapping_count: included.filter((row) => !row.operationId?.trim()).length,
    missing_required_specification_count: included.filter((row) => row.requiredSpecificationComplete === false).length,
    uncovered_required_operation_count: [...requiredOperations].filter((operationId) => !coveredOperations.has(operationId)).length,
    cross_domain_leakage_count: input.expectedDomainId
      ? included.filter((row) => row.domainId != null && row.domainId !== input.expectedDomainId).length
      : 0,
    duplicate_resource_signature_count: [...duplicateSignatures.values()].reduce((count, occurrences) =>
      count + Math.max(0, occurrences - 1), 0),
    double_count_violation_count: included.filter((row) =>
      Boolean(row.componentOfAssemblyId && closedAssemblies.has(row.componentOfAssemblyId))
    ).length,
    bom_consistency_violation_count: [...closedAssemblies.values()].filter((assembly) => {
      const expected = new Set(assembly.bomComponentIds ?? []);
      if (expected.size === 0) return true;
      const actual = new Set(included
        .filter((row) => row.componentOfAssemblyId === assembly.assemblyId)
        .map((row) => row.canonicalResourceId ?? row.rowId));
      return actual.size > 0 && [...actual].some((componentId) => !expected.has(componentId));
    }).length,
    untrusted_non_null_price_count: untrustedPrices.length,
    mandatory_unpriced_row_count: mandatoryUnpriced.length,
    false_final_total_count: input.grandTotal != null && (mandatoryUnpriced.length > 0 || untrustedPrices.length > 0) ? 1 : 0,
  };
}

export function semanticBoqGateIsGreen(counters: SemanticBoqGateCounters): boolean {
  return Object.values(counters).every((count) => count === 0);
}
