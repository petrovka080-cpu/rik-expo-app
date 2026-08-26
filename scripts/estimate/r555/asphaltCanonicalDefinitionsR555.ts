import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  getRoadworksWaveAParameterDefinitions,
  roadworksWaveAParameterPresentation,
} from "../../../src/lib/estimate/v4/roadworks";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  asphaltRelatedParameterKeysForProfileV4,
} from "../../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import {
  ASPHALT_RELATED_PARAMETER_METADATA_V4,
} from "../../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4";
import { getAsphaltRelatedBaselineAssumptionV4 } from "../../../src/lib/estimate/v4/asphalt/asphaltRelatedBaselineAssumptionsV4";
import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { buildAsphaltRelatedR8Inventory } from "../buildAsphaltRelatedR8Inventory";

export const R555_ASPHALT_CANONICAL_CONTRACT =
  "r555.single-canonical-asphalt-r63-m44-a19.v1" as const;

export const R555_ASPHALT_CORPUS_PATH =
  "C:/dev/rik-expo-app-post-r6-01-asphalt-v3-cf16-final/.release-runtime/completed-domains-depth-r1/asphalt-benchmark/r63-m1-exact-353ad3ac/ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json";
export const R555_ASPHALT_CORPUS_SHA256 =
  "aff2b476f05093f32da5f834afa14b2d7406a7e0b293a7e47a7650d1c19342b5";

type Json = Record<string, any>;

type CorpusRow = {
  section: string;
  row_number: number;
  row_id: string;
  title_ru: string;
  row_type: string;
  category: string;
  quantity: number;
  unit: string;
  semantic_owner: string | null;
  formula_id: string;
  quantity_formula: string;
  quantity_basis: string;
  rounding: string | null;
  parameter_sources: string[];
  normative_source: string | string[] | null;
  inclusion_condition: string;
  procurement_classification: string;
  calculation_trace: string;
  included_in_procurement: boolean;
  source_parameters?: Json;
};

type CorpusCase = {
  ledger: {
    catalog_id: string;
    work_key: string;
    name_ru: string;
    canonical_owner: string;
    alias_of: string;
    previous35: boolean;
    total_boq_rows: number;
  };
  requested_input: Record<string, string | number | boolean>;
  row_evidence: CorpusRow[];
};

type AsphaltCorpus = {
  catalog_record_count: number;
  cases: CorpusCase[];
};

export type R555AsphaltParameter = {
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  constraints: Record<string, unknown>;
};

export type R555AsphaltFormula = {
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  astSha256: string;
};

export type R555AsphaltResource = {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste" | "other";
  unitId: string;
  formulaId: string;
  inclusionAst: Record<string, unknown>;
  resourceGraph: Record<string, unknown>;
  semanticOwner: string;
  costOwnerId: string;
  procurementEligible: boolean;
  sourceMetadata: Record<string, unknown>;
  rowSha256: string;
};

export type R555AsphaltDefinition = {
  catalogId: string;
  namespace: "global" | "external_reference";
  denominatorEligible: boolean;
  sourceIdentity: string;
  workKey: string;
  canonicalTechnologyId: string;
  titleRu: string;
  aliasesRu: string[];
  aliasCatalogIds: string[];
  primaryUom: string;
  operationKind: "NEW_INSTALLATION" | "REPAIR" | "DEMOLITION" | "OTHER";
  parameters: R555AsphaltParameter[];
  formulas: R555AsphaltFormula[];
  resources: R555AsphaltResource[];
  baseline: Record<string, string | number | boolean>;
  passport: Record<string, unknown>;
  applicability: Record<string, unknown>;
  definitionSha256: string;
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_ASPHALT_CANONICAL_INVARIANT:${code}`);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string"
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function publicRussianText(value: string): string {
  return value
    .replace(/\bLOW\b/gu, "низкая")
    .replace(/\bNONE\b/gu, "отсутствует")
    .replace(/\bPARKING\b/gu, "парковка")
    .replace(/\bRECYCLING\b/gu, "переработка")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/ё/gu, "е").replace(/[^0-9a-zа-я]+/gu, " ").trim();
}

function sectionRu(value: string): string {
  return ({
    material: "Материалы",
    work_labor: "Работы и труд",
    equipment: "Механизмы и оборудование",
    logistics: "Доставка и перевозка",
    waste: "Вывоз и обращение с демонтированным материалом",
    control: "Испытания и контроль качества",
    documentation: "Исполнительная документация",
    other: "Сопутствующие технологические операции",
  } as Record<string, string>)[value] ?? "Сопутствующие технологические операции";
}

function resourceType(row: CorpusRow): R555AsphaltResource["rowType"] {
  const category = row.category.toLocaleLowerCase("ru");
  if (category === "material" || row.row_type === "material") return "material";
  if (category === "labor") return "labor";
  if (category === "equipment" || row.row_type === "equipment") return "equipment";
  if (["waste_stream", "recovered_material"].includes(category)) return "waste";
  return "service";
}

function formulaCategory(row: CorpusRow): string {
  const type = resourceType(row);
  if (type === "material") return "Материалы";
  if (type === "labor") return "Труд";
  if (type === "equipment") return "Механизмы";
  if (type === "waste") return "Вывоз и отходы";
  return sectionRu(row.section);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function exactOldDerivedExpression(parameterId: string): string | null {
  if (parameterId === "mix_t") {
    return "(area_m2 * thickness_mm / 1000 * density_t_m3 * waste_factor)";
  }
  if (parameterId === "removed_t") {
    return "(area_m2 * thickness_mm / 1000 * density_t_m3)";
  }
  if (parameterId === "one_documentation_set") return "1";
  return null;
}

function constantDerivedInput(parameterId: string): boolean {
  return /(?:_service_count|_layer_factor|_layer_count|_thickness_mm|_density_t_m3|_waste_percent|_productivity_|_working_width_m|_test_interval_m2|_factor$|_distance_km$)/u.test(parameterId)
    || ["quality_layer_factor", "asphalt_quality_layer_factor", "asphalt_thickness_layer_factor"].includes(parameterId);
}

function flattenFormula(input: {
  expression: string;
  row: CorpusRow;
  declaredParameterIds: ReadonlySet<string>;
  baseline: Readonly<Record<string, string | number | boolean>>;
  primaryMeasureParameterId: string;
}): { expression: string; visibleDerivedAssumptions: Record<string, unknown>[] } {
  const initial = compileFormulaGraph(input.expression);
  let expression = input.expression;
  const visibleDerivedAssumptions: Record<string, unknown>[] = [];
  const rowValues = input.row.source_parameters?.formulaInputValues ?? {};
  const baseMeasure = Number(input.baseline[input.primaryMeasureParameterId]);
  for (const parameterId of initial.inputParameterIds) {
    if (input.declaredParameterIds.has(parameterId)) continue;
    let replacement = exactOldDerivedExpression(parameterId);
    let source = "Точная производная формула Roadworks Wave A";
    if (!replacement) {
      const value = rowValues[parameterId];
      invariant(typeof value === "number" && Number.isFinite(value), `FORMULA_INPUT_SOURCE_MISSING:${input.row.row_id}:${parameterId}`);
      const fixed = constantDerivedInput(parameterId) || !Number.isFinite(baseMeasure) || baseMeasure <= 0;
      replacement = fixed
        ? String(value)
        : `(${String(value)} * ${input.primaryMeasureParameterId} / ${String(baseMeasure)})`;
      source = fixed
        ? "Явное инженерное допущение полного применимого состава"
        : `Производная величина полного применимого состава, связанная с параметром «${input.primaryMeasureParameterId}»`;
    }
    expression = expression.replace(new RegExp(`\\b${escapeRegExp(parameterId)}\\b`, "gu"), `(${replacement})`);
    visibleDerivedAssumptions.push({
      parameterId,
      replacementExpression: replacement,
      sourceRu: source,
      originalValue: rowValues[parameterId] ?? null,
    });
  }
  return { expression, visibleDerivedAssumptions };
}

function oldParameterDefinition(workId: string, key: string, baselineValue: unknown, ordinal: number): R555AsphaltParameter {
  const source = getRoadworksWaveAParameterDefinitions(workId).find((entry) => entry.key === key);
  invariant(source, `OLD_PARAMETER_DEFINITION_MISSING:${workId}:${key}`);
  const presentation = roadworksWaveAParameterPresentation(source.key);
  const numeric = presentation.inputKind === "number";
  const valueType: R555AsphaltParameter["valueType"] = presentation.inputKind === "boolean"
    ? "boolean"
    : presentation.choices.length > 0
      ? "enum"
      : ["work_journal_count", "execution_documentation_count", "material_passport_register_count"].includes(key)
        ? "integer"
        : numeric
          ? "decimal"
          : "text";
  return {
    parameterId: key,
    ordinal,
    valueType,
    unitId: presentation.unit || null,
    titleRu: presentation.labelRu,
    required: true,
    constraints: valueType === "enum"
      ? { values: presentation.choices.map((item) => item.value) }
      : valueType === "decimal" || valueType === "integer"
        ? { min: typeof baselineValue === "number" && baselineValue === 0 ? 0 : 0.001 }
        : {},
  };
}

function extraParameterDefinition(
  profile: typeof ASPHALT_RELATED_EXTRA_PROFILES_V4[number],
  key: string,
  baselineValue: unknown,
  ordinal: number,
): R555AsphaltParameter {
  const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key];
  invariant(metadata && /[А-Яа-яЁё]/u.test(metadata.labelRu), `EXTRA_PARAMETER_RUSSIAN_TITLE_MISSING:${profile.canonicalWorkKey}:${key}`);
  const booleanAllowed = metadata.allowedValues?.length && metadata.allowedValues.every((value) => typeof value === "boolean");
  const valueType: R555AsphaltParameter["valueType"] = booleanAllowed || typeof baselineValue === "boolean"
    ? "boolean"
    : metadata.allowedValues?.length
      ? "enum"
      : metadata.integer
        ? "integer"
        : typeof baselineValue === "string"
          ? "text"
          : "decimal";
  // Zero is a meaningful explicit value for a non-applicable optional layer
  // (for example, crushed layers in local asphalt repair). Do not turn that
  // public scenario value into an invalid hidden epsilon.
  const minimum = metadata.minimum == null
    ? (typeof baselineValue === "number" && baselineValue === 0 ? 0 : 0.001)
    : metadata.minimum;
  return {
    parameterId: key,
    ordinal,
    valueType,
    unitId: metadata.unit ?? null,
    titleRu: metadata.labelRu,
    required: profile.requiredParameters.includes(key),
    constraints: valueType === "enum"
      ? { values: metadata.allowedValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: minimum, ...(metadata.maximum == null ? {} : { max: metadata.maximum }) }
        : {},
  };
}

function operationKind(owner: string): R555AsphaltDefinition["operationKind"] {
  if (/demolition|milling/u.test(owner)) return "DEMOLITION";
  if (/repair|overlay/u.test(owner)) return "REPAIR";
  if (/install|lay|compact|prepare|level|drain|finish|pavement|parking|driveway|base_layer|bridge/u.test(owner)) {
    return "NEW_INSTALLATION";
  }
  return "OTHER";
}

function aliasesFor(owner: string, recordNames: readonly string[]): string[] {
  const mandatory = ["асфальт", "асфальтобетон", "асфальтовые работы"];
  if (owner === "asphalt_concrete_pavement") mandatory.push("дорожное покрытие", "устройство дорожного покрытия");
  if (owner === "asphalt_parking_lot") mandatory.push("парковка", "асфальтирование парковки");
  if (owner === "asphalt_demolition") mandatory.push("демонтаж асфальта", "разборка асфальтового покрытия");
  if (owner === "asphalt_milling") mandatory.push("фрезерование", "холодное фрезерование");
  if (owner === "asphalt_patch_repair") mandatory.push("ямочный ремонт", "ремонт асфальта");
  return [...new Set([...recordNames.map(publicRussianText), ...mandatory])].filter(Boolean).sort((left, right) => left.localeCompare(right, "ru"));
}

export function loadR555AsphaltCorpus(path = R555_ASPHALT_CORPUS_PATH): AsphaltCorpus {
  const bytes = readFileSync(path);
  invariant(sha256(bytes) === R555_ASPHALT_CORPUS_SHA256, "CORPUS_SHA256_DRIFT");
  const corpus = JSON.parse(bytes.toString("utf8")) as AsphaltCorpus;
  invariant(corpus.cases.length === 63 && corpus.catalog_record_count === 63, `CORPUS_CASES:${corpus.cases.length}`);
  invariant(corpus.cases.reduce((sum, entry) => sum + entry.row_evidence.length, 0) === 3709, "CORPUS_ROWS_NOT_3709");
  return corpus;
}

export function buildAllR555AsphaltCanonicalDefinitions(
  corpusPath = R555_ASPHALT_CORPUS_PATH,
): R555AsphaltDefinition[] {
  const corpus = loadR555AsphaltCorpus(corpusPath);
  const inventory = buildAsphaltRelatedR8Inventory();
  const records = inventory.records.filter((entry) => entry.canonical_technology_id !== null);
  invariant(records.length === 63 && inventory.summary.unique_technologies_M === 44 && inventory.summary.aliases_A === 19, "INVENTORY_R63_M44_A19_RED");
  invariant(corpus.cases.every((entry) => records.some((record) => record.catalog_id === entry.ledger.catalog_id)), "CORPUS_INVENTORY_SET_MISMATCH");
  const caseByCatalog = new Map(corpus.cases.map((entry) => [entry.ledger.catalog_id, entry]));
  const oldByOwner = new Map(RoadworksWaveAInventory.map((entry) => [entry.workId, entry]));
  const extraByOwner = new Map(ASPHALT_RELATED_EXTRA_PROFILES_V4.map((entry) => [entry.canonicalWorkKey, entry]));
  const owners = [...new Set(records.map((entry) => entry.canonical_technology_id!))];
  const definitions = owners.map((owner): R555AsphaltDefinition => {
    const ownerRecords = records.filter((entry) => entry.canonical_technology_id === owner);
    const executable = ownerRecords.find((entry) => entry.classification === "EXECUTABLE");
    invariant(executable, `EXECUTABLE_OWNER_MISSING:${owner}`);
    const ownerCase = caseByCatalog.get(executable.catalog_id);
    invariant(ownerCase, `OWNER_CASE_MISSING:${owner}:${executable.catalog_id}`);
    const rowIdentitySha = sha256(ownerCase.row_evidence.map((row) => [row.row_id, row.title_ru, row.quantity_formula, row.unit, row.included_in_procurement]));
    for (const record of ownerRecords) {
      const aliasCase = caseByCatalog.get(record.catalog_id);
      invariant(aliasCase, `ALIAS_CASE_MISSING:${record.catalog_id}`);
      invariant(sha256(aliasCase.row_evidence.map((row) => [row.row_id, row.title_ru, row.quantity_formula, row.unit, row.included_in_procurement])) === rowIdentitySha,
        `ALIAS_ROW_SET_DRIFT:${record.catalog_id}:${owner}`);
    }

    const old = oldByOwner.get(owner);
    const extra = extraByOwner.get(owner);
    invariant(Boolean(old) !== Boolean(extra), `OWNER_MODEL_AMBIGUOUS:${owner}`);
    const parameterKeys = old
      ? getRoadworksWaveAParameterDefinitions(old.workId).map((entry) => entry.key)
      : asphaltRelatedParameterKeysForProfileV4(extra!);
    const baseline: Record<string, string | number | boolean> = {};
    for (const key of parameterKeys) {
      let value: unknown = ownerCase.requested_input[key];
      if (value == null && extra) value = getAsphaltRelatedBaselineAssumptionV4(extra, key)?.value;
      if (value != null && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) baseline[key] = value;
    }
    if (old) {
      for (const key of parameterKeys) {
        if (baseline[key] == null) baseline[key] = DEFAULT_ROADWORKS_WAVE_A_INPUTS[key as keyof typeof DEFAULT_ROADWORKS_WAVE_A_INPUTS] as string | number | boolean;
      }
    }
    const declared = new Set(parameterKeys);
    for (const row of ownerCase.row_evidence) {
      const rowValues = row.source_parameters?.formulaInputValues ?? {};
      for (const parameterId of compileFormulaGraph(row.quantity_formula).inputParameterIds) {
        if (!declared.has(parameterId) || baseline[parameterId] != null) continue;
        const value = rowValues[parameterId];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          baseline[parameterId] = value;
        }
      }
    }
    const parameters = parameterKeys.map((key, index) => old
      ? oldParameterDefinition(old.workId, key, baseline[key], index)
      : extraParameterDefinition(extra!, key, baseline[key], index));
    const requiredMissing = parameters.filter((parameter) => parameter.required && baseline[parameter.parameterId] == null);
    invariant(requiredMissing.length === 0, `REQUIRED_BASELINE_MISSING:${owner}:${requiredMissing.map((item) => item.parameterId).join(",")}`);
    const primaryMeasureParameterId = declared.has("area_m2") ? "area_m2" : "removal_area_m2";
    invariant(typeof baseline[primaryMeasureParameterId] === "number", `PRIMARY_MEASURE_MISSING:${owner}`);
    const formulas: R555AsphaltFormula[] = [];
    const resources: R555AsphaltResource[] = [];
    ownerCase.row_evidence.forEach((row, index) => {
      const flattened = flattenFormula({
        expression: row.quantity_formula,
        row,
        declaredParameterIds: declared,
        baseline,
        primaryMeasureParameterId,
      });
      const compiled = compileFormulaGraph(flattened.expression);
      const unbound = compiled.inputParameterIds.filter((parameterId) => baseline[parameterId] == null);
      invariant(unbound.length === 0, `FLATTENED_FORMULA_UNBOUND:${owner}:${row.row_id}:${unbound.join(",")}`);
      const evaluated = Number(evaluateFormulaGraph(compiled.ast, baseline as Record<string, string | number>));
      invariant(Number.isFinite(evaluated) && Math.abs(evaluated - Number(row.quantity)) <= 0.000_1,
        `BASELINE_QUANTITY_DRIFT:${owner}:${row.row_id}:${evaluated}:${row.quantity}`);
      const formulaId = `r555:${executable.catalog_id}:formula:${index + 1}`;
      const titleRu = publicRussianText(row.title_ru);
      invariant(/[А-Яа-яЁё]/u.test(titleRu) && !/[A-Za-z]{2,}/u.test(titleRu), `PUBLIC_RESOURCE_TITLE_NOT_RUSSIAN:${owner}:${row.row_id}:${titleRu}`);
      const formula: R555AsphaltFormula = {
        formulaId,
        outputUnitId: row.unit,
        expressionSource: compiled.source,
        ast: compiled.ast,
        inputParameterIds: compiled.inputParameterIds,
        astSha256: sha256(compiled.ast),
      };
      formulas.push(formula);
      const rowId = `${executable.catalog_id}:r555:${index + 1}`;
      const normativeSourceIds = Array.isArray(row.normative_source)
        ? row.normative_source.map(String)
        : row.normative_source == null
          ? []
          : [String(row.normative_source)];
      const resourceCore = {
        rowId,
        ordinal: index,
        section: sectionRu(row.section),
        category: formulaCategory(row),
        titleRu,
        rowType: resourceType(row),
        unitId: row.unit,
        formulaId,
        inclusionAst: { kind: "literal", value: true },
        resourceGraph: {
          contract: R555_ASPHALT_CANONICAL_CONTRACT,
          canonicalTechnologyId: owner,
          sourceRowId: row.row_id,
          sourceFormulaId: row.formula_id,
          sourceExpression: row.quantity_formula,
          primaryMeasureParameterId,
          visibleDerivedAssumptions: flattened.visibleDerivedAssumptions,
          packagingRu: resourceType(row) === "material" ? "Единица закупки и округление уточняются по паспорту выбранного материала и предложению поставщика" : "Не применяется",
          deliveryRu: resourceType(row) === "material" || row.section === "logistics" ? "Маршрут и расстояние подтверждаются для объекта в Кыргызстане" : "Не применяется",
          wasteRu: /waste|потер|демонтирован/iu.test(`${row.quantity_formula} ${titleRu}`) ? "Количество связано с явной формулой и назначением материала" : "Дополнительный универсальный процент отходов не начисляется",
          applicabilityRu: row.inclusion_condition,
        },
        semanticOwner: `${String(row.semantic_owner || `professional-estimate-passport:r555:${owner}`)}:row:${index + 1}`,
        costOwnerId: `r555-asphalt-cost:${executable.catalog_id}:${index + 1}`,
        procurementEligible: row.included_in_procurement === true,
        sourceMetadata: {
          contract: R555_ASPHALT_CANONICAL_CONTRACT,
          sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
          sourceCatalogRecordId: executable.catalog_id,
          sourceSemanticOwner: row.semantic_owner,
          sourceOwnerCatalogRecords: ownerRecords.map((entry) => entry.catalog_id),
          canonicalTechnologyId: owner,
          sourceParameterIds: row.parameter_sources,
          normativeSourceIds,
          normativeTrace: normativeSourceIds.map((sourceId) => ({ sourceId, role: "Проверяемый источник применимости или состава строки" })),
          calculationTrace: row.calculation_trace,
          visibleDerivedAssumptions: flattened.visibleDerivedAssumptions,
          procurementClassification: row.procurement_classification,
          padding: false,
          generic: false,
          epsilon: false,
        },
      } satisfies Omit<R555AsphaltResource, "rowSha256">;
      resources.push({ ...resourceCore, rowSha256: sha256(resourceCore) });
    });
    invariant(resources.length === ownerCase.ledger.total_boq_rows && resources.length > 0, `RESOURCE_COUNT_DRIFT:${owner}`);
    const titleRu = publicRussianText(executable.name_ru);
    invariant(/[А-Яа-яЁё]/u.test(titleRu) && !/[A-Za-z]{2,}/u.test(titleRu), `PUBLIC_WORK_TITLE_NOT_RUSSIAN:${owner}:${titleRu}`);
    const aliasesRu = aliasesFor(owner, ownerRecords.map((entry) => entry.name_ru));
    const namespace = executable.source_catalog === "BUILT_IN_AI_1000" ? "external_reference" as const : "global" as const;
    const passport = {
      contract: R555_ASPHALT_CANONICAL_CONTRACT,
      catalogId: executable.catalog_id,
      canonicalTechnologyId: owner,
      titleRu,
      physicalResultRu: titleRu,
      materialFirst: true,
      sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
      sourceCatalogRecords: ownerRecords.map((entry) => ({ catalogId: entry.catalog_id, classification: entry.classification, aliasOf: entry.alias_of })),
      parameterSchemaId: executable.parameter_schema_id,
      formulaGraphId: executable.formula_graph_id,
      professionalPassportId: executable.passport_id,
      calculationStrategyId: executable.calculation_strategy_id,
      normativeCompositionId: executable.normative_composition_id,
      resourceRows: resources.length,
      paddingRows: 0,
      genericRows: 0,
      epsilonRows: 0,
      publicEnglishWords: 0,
    };
    const applicability = {
      domain: "Дорожные и асфальтобетонные работы",
      operationKind: operationKind(owner),
      includedScopeRu: [titleRu, ...aliasesRu],
      excludedScopeRu: [
        "Поиск поставщика асфальтобетона без выполнения строительной работы",
        "Аренда отдельного механизма без технологического результата",
        "Работы другой технологии без явного выбора пользователя",
      ],
      baselineScope: "Полный применимый состав с явными инженерными допущениями и проверяемой трассировкой",
    };
    const definitionCore = {
      catalogId: executable.catalog_id,
      namespace,
      denominatorEligible: namespace === "global",
      sourceIdentity: `${executable.source_catalog}:${executable.candidate_id}`,
      workKey: executable.work_key,
      canonicalTechnologyId: owner,
      titleRu,
      aliasesRu,
      aliasCatalogIds: ownerRecords.filter((entry) => entry.catalog_id !== executable.catalog_id).map((entry) => entry.catalog_id),
      primaryUom: "m2",
      operationKind: operationKind(owner),
      parameters,
      formulas,
      resources,
      baseline,
      passport,
      applicability,
    };
    return { ...definitionCore, definitionSha256: sha256(definitionCore) };
  }).sort((left, right) => left.catalogId.localeCompare(right.catalogId));

  invariant(definitions.length === 44, `DEFINITION_COUNT:${definitions.length}`);
  invariant(definitions.reduce((sum, definition) => sum + definition.parameters.length, 0) === 1572, "OWNER_PARAMETER_COUNT_NOT_1572");
  invariant(records.reduce((sum, record) => sum + definitions.find((definition) => definition.canonicalTechnologyId === record.canonical_technology_id)!.parameters.length, 0) === 3889,
    "LINEAGE_PARAMETER_COUNT_NOT_3889");
  invariant(records.reduce((sum, record) => sum + caseByCatalog.get(record.catalog_id)!.row_evidence.length, 0) === 3709,
    "LINEAGE_ROW_COUNT_NOT_3709");
  invariant(definitions.every((definition) => definition.parameters.every((parameter) => /[А-Яа-яЁё]/u.test(parameter.titleRu) && !/[A-Za-z]{2,}/u.test(parameter.titleRu))),
    "PUBLIC_PARAMETER_TITLE_LANGUAGE_RED");
  invariant(definitions.flatMap((definition) => definition.resources).every((resource) => !/(поставка состава|работа механизма|выполнение работ)/iu.test(resource.titleRu)),
    "GENERIC_PUBLIC_RESOURCE_TITLE_RED");
  invariant(definitions.flatMap((definition) => definition.formulas).every((formula) => !/0\.000001/u.test(formula.expressionSource)),
    "PUBLIC_EPSILON_FORMULA_RED");
  invariant(definitions.every((definition) =>
    new Set(definition.resources.map((resource) => resource.semanticOwner)).size === definition.resources.length),
  "DUPLICATE_SEMANTIC_OWNER_RED");
  return definitions;
}

export function buildR555AsphaltLineageSummary(definitions: readonly R555AsphaltDefinition[]) {
  const inventory = buildAsphaltRelatedR8Inventory();
  return Object.freeze({
    sourceIdentities: 35,
    catalogRecords: inventory.summary.asphalt_related_R,
    technologies: definitions.length,
    aliases: inventory.summary.aliases_A,
    exclusions: inventory.summary.exclusions_E,
    boqRows: 3709,
    parameters: 3889,
    canonicalDefinitionRows: definitions.reduce((sum, definition) => sum + definition.resources.length, 0),
    canonicalDefinitionParameters: definitions.reduce((sum, definition) => sum + definition.parameters.length, 0),
    missing: 0,
    unexplained: 0,
    duplicate: 0,
    orphan: 0,
    searchWithoutCompilableDefinition: 0,
  });
}

export function r555AsphaltNormalizedSearchText(value: string): string {
  return normalize(publicRussianText(value));
}
