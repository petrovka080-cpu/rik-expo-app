import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  R4_A6_PUMP_STATION_CATALOG_ID,
  R4_A6_PUMP_STATION_METHOD_ID,
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_ROWS,
  R4_A6_PUMP_STATION_TITLE_RU,
} from "../../../src/lib/estimate/r4A6PumpStationProfessional";

type Json = Record<string, any>;

type Contract = {
  schemaVersion: string;
  masterSha256: string;
  predecessorDefinitionReleaseId: string;
  predecessorSearchReleaseId: string;
  canonicalVisibleDefinitionReleaseId: string;
  canonicalVisibleSearchReleaseId: string;
  roofCatalogId: string;
  pumpCatalogId: string;
  denominator: Record<string, number>;
  policy: Json;
};

type DefinitionMap = {
  catalogId: string;
  oldDefinitionId: string;
  newDefinitionId: string;
  newBaselineId: string | null;
  definitionHash: string;
};

type ResourceClone = {
  id: string;
  oldResourceId: string | null;
  definitionId: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: string;
  unitId: string;
  formulaId: string;
  inclusionAst: Json;
  resourceGraph: Json;
  semanticOwner: string | null;
  costOwnerId: string | null;
  procurementEligible: boolean;
  sourceMetadata: Json;
  rowSha256: string;
};

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md",
);
const CONTRACT_PATH = resolve("data/estimate-benchmarks/r568-r4-a6-professional-boq-contract.json");
const OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/15_PROFESSIONAL_BOQ_SUCCESSOR.json",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const CONTRACT_ID = "rik-expo-app.r568.r4-a6-professional-boq-successor.v1";
const FORMULA_CONTRACT_ID = "rik-expo-app.r568.r4-a6-formula-dependency-successor.v1";
const CONTENT_PASSPORT_CONTRACT_ID = "real-professional-estimates-r3.content-passport.v1";
const MANAGED_SOURCE_PATHS = [
  "data/estimate-benchmarks/r568-r4-a6-professional-boq-contract.json",
  "data/estimate-benchmarks/r568-r4-a6-runtime-closeout-include-manifest.json",
  "scripts/estimate/p0TruthRemediationR5/prepareR4A6ProfessionalBoqSuccessor.ts",
  "src/lib/ai/expandedComplexWorks/index.ts",
  "src/lib/ai/expandedComplexWorks/s2b/registry.ts",
  "src/lib/ai/expandedComplexWorks/s2b/types.ts",
  "src/lib/estimate/buildProfessionalWorkPassport.ts",
  "src/lib/estimate/r4A6PumpStationProfessional.ts",
  "tests/estimateExpandedComplex/formulaDependencyOwnersR4A6.contract.test.ts",
  "tests/estimateExpandedComplex/professionalContentR4A6.contract.test.ts",
  "tests/estimateExpandedComplex/s2bInfrastructureEngineeringWave2.contract.test.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sourceFingerprint(contractBytes: Buffer, head: string): string {
  return shaObject({
    head,
    contractSha256: sha256(contractBytes),
    sources: MANAGED_SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
  });
}

async function insertChunks(
  client: Client,
  statement: string,
  rows: readonly Json[],
  size = 500,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += size) {
    await client.query(statement, [JSON.stringify(rows.slice(offset, offset + size))]);
  }
}

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function isSyntheticRow(rowId: string): boolean {
  return /^(?:professional|s2b)_/u.test(rowId);
}

function cleanSyntheticTitle(title: string, rowId: string): string {
  const parts = title.split(/[:：]/u).map((part) => part.trim()).filter(Boolean);
  if (rowId.startsWith("s2b_") && parts.length > 1) {
    const subject = parts.slice(1).join(" ").replace(/[.:：]+$/u, "").trim();
    const suffix = rowId.endsWith("_work")
      ? "работы"
      : rowId.endsWith("_material")
        ? "материалы"
        : rowId.endsWith("_equipment")
          ? "механизмы"
          : "испытания и документы";
    return `${subject.charAt(0).toLocaleUpperCase("ru-RU")}${subject.slice(1)} — ${suffix}`;
  }
  return (parts[0] ?? title).replace(/[.:：]+$/u, "").trim();
}

function cleanPublicWorkTitle(title: string): string {
  const withoutSection = title.replace(/\s*\(\s*раздел\s*[:：][^)]*\)\s*$/iu, "").trim();
  if (withoutSection !== title.trim()) return withoutSection;
  const separator = withoutSection.search(/[:：]/u);
  return separator >= 0 ? withoutSection.slice(separator + 1).trim() : withoutSection;
}

function pumpParameterConsumers(parameterId: string): { formulas: string[]; resources: string[] } {
  const formulas = R4_A6_PUMP_STATION_ROWS
    .filter((row) => compileFormulaGraph(row.expression).inputParameterIds.includes(parameterId))
    .map((row) => `r4_a6_pump_station_${row.rowId}_formula_v1`)
    .sort();
  const directlySpecified = new Map<string, string[]>([
    ["design_flow_m3_h", ["duty_pump_units", "standby_pump_units"]],
    ["design_head_m", ["duty_pump_units", "standby_pump_units"]],
    ["pump_power_kw", ["duty_pump_units", "standby_pump_units", "control_panel_set", "power_cable_m"]],
    ["suction_manifold_diameter_mm", ["suction_manifold_m", "pump_isolation_valves_pcs"]],
    ["discharge_manifold_diameter_mm", ["discharge_manifold_m", "pump_check_valves_pcs", "pressure_gauges_pcs"]],
    ["automation_scope", ["control_panel_set", "automation_installation_hours", "automation_commissioning_set"]],
    ["power_supply_voltage_v", ["control_panel_set", "power_cable_m", "electrical_measurement_set"]],
    ["ventilation_airflow_m3_h", ["ventilation_unit_set"]],
    ["delivery_distance_km", ["pump_equipment_delivery_service", "manifold_delivery_service"]],
    ["project_location", ["pump_equipment_delivery_service", "manifold_delivery_service"]],
    ["equipment_specification", ["duty_pump_units", "standby_pump_units", "station_lifting_device_set"]],
  ]);
  const formulaRows = R4_A6_PUMP_STATION_ROWS
    .filter((row) => compileFormulaGraph(row.expression).inputParameterIds.includes(parameterId))
    .map((row) => row.rowId);
  const conditionalRows = R4_A6_PUMP_STATION_ROWS
    .filter((row) => String(row.inclusionAst.id ?? "") === parameterId)
    .map((row) => row.rowId);
  return {
    formulas,
    resources: [...new Set([...formulaRows, ...conditionalRows, ...(directlySpecified.get(parameterId) ?? [])])].sort(),
  };
}

function buildPumpPayload(input: {
  releaseId: string;
  oldDefinition: Json;
  definitionId: string;
  fingerprint: string;
  head: string;
  tree: string;
}): { definition: Json; parameters: Json[]; formulas: Json[]; resources: ResourceClone[]; passport: Json } {
  const parameters = R4_A6_PUMP_STATION_PARAMETERS.map((parameter, ordinal) => {
    const consumers = pumpParameterConsumers(parameter.parameterId);
    const constraints = {
      ...(["decimal", "integer"].includes(parameter.valueType) ? { min: 0.000001, max: 1_000_000_000 } : {}),
      ...(parameter.requiredWhen ? { requiredWhen: { parameterId: parameter.requiredWhen.parameterId, equals: parameter.requiredWhen.equals } } : {}),
    };
    return {
      definitionId: input.definitionId,
      parameterId: parameter.parameterId,
      ordinal,
      valueType: parameter.valueType,
      unitId: parameter.unitId,
      titleRu: parameter.titleRu,
      required: parameter.tier === "P0" && parameter.required && !parameter.requiredWhen,
      defaultValue: null,
      constraints,
      truthMetadata: {
        contract: CONTRACT_ID,
        tier: parameter.tier,
        required_when: parameter.requiredWhen ?? null,
        semantic_parameter_key: `${R4_A6_PUMP_STATION_CATALOG_ID}:${parameter.parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: "EXPLICIT_USER_OR_PROJECT_INPUT",
        hiddenDefaultForbidden: parameter.tier === "P0",
        guide: {
          guide_kind: parameter.tier === "P0" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          source_role: parameter.tier === "P0" ? "USER_OR_PROJECT_MEASUREMENT" : "PROJECT_OR_SUPPLIER_SPECIFICATION",
          guide_version: "R568_R4_A6_PUMP_V1",
          guide_short_ru: `Укажите параметр «${parameter.titleRu}» по проекту, обмеру или спецификации; скрытая подстановка запрещена.`,
          applicability: R4_A6_PUMP_STATION_TITLE_RU,
          verified_at: "2026-09-04T00:00:00+06:00",
          source_snapshot_hash: input.fingerprint,
        },
        formula_consumers: consumers.formulas,
        resource_branch_consumers: consumers.resources,
        sourceLocator: R4_A6_PUMP_STATION_METHOD_ID,
      },
      baselineId: null,
    };
  });
  const formulas = R4_A6_PUMP_STATION_ROWS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      definitionId: input.definitionId,
      formulaId: `r4_a6_pump_station_${row.rowId}_formula_v1`,
      outputUnitId: row.unitId,
      expressionSource: row.expression,
      ast: compiled.ast,
      inputParameterIds: compiled.inputParameterIds,
      astSha256: shaObject(compiled.ast),
    };
  });
  const resources = R4_A6_PUMP_STATION_ROWS.map((row, ordinal): ResourceClone => {
    const formulaId = `r4_a6_pump_station_${row.rowId}_formula_v1`;
    const comparable = {
      rowId: row.rowId,
      ordinal,
      section: row.category,
      category: row.category,
      titleRu: row.titleRu,
      rowType: row.rowType,
      unitId: row.unitId,
      formulaId,
      inclusionAst: row.inclusionAst,
      resourceGraph: {
        specificationRu: row.specificationRu,
        scopeOwner: row.scopeOwner,
        sourceLocator: row.sourceLocator,
        priceValue: null,
        lineTotal: null,
        priceStatus: "NEEDS_PRICE",
      },
      semanticOwner: row.scopeOwner,
      costOwnerId: row.scopeOwner,
      procurementEligible: row.procurementEligible,
      sourceMetadata: {
        contract: CONTRACT_ID,
        sourceLocator: row.sourceLocator,
        sourceFingerprint: input.fingerprint,
        specificationSeparateFromTitle: true,
        hiddenPriceForbidden: true,
        doubleCountReview: "PASS_NO_DUPLICATE_PNR_OR_DELIVERY",
      },
    };
    return {
      id: uuid(`${CONTRACT_ID}:resource:${R4_A6_PUMP_STATION_CATALOG_ID}:${row.rowId}:${input.fingerprint}`),
      oldResourceId: null,
      definitionId: input.definitionId,
      ...comparable,
      rowSha256: shaObject(comparable),
    };
  });
  const definitionHash = shaObject({
    catalogId: R4_A6_PUMP_STATION_CATALOG_ID,
    parameters,
    formulas,
    resources,
    sourceFingerprint: input.fingerprint,
  });
  const definition = {
    id: input.definitionId,
    releaseId: input.releaseId,
    catalogId: R4_A6_PUMP_STATION_CATALOG_ID,
    definitionVersion: Number(input.oldDefinition.definition_version) + 1,
    passport: {
      ...object(input.oldDefinition.passport),
      titleRu: R4_A6_PUMP_STATION_TITLE_RU,
      rowCount: resources.length,
      contract: CONTRACT_ID,
      estimateLevel: "PRELIMINARY_BOQ_NEEDS_INPUT_UNTIL_P0",
      hiddenDefaultsAllowed: false,
      pricePolicy: "NEEDS_PRICE_WITHOUT_VERIFIED_SOURCE",
      workDescription: {
        titleRu: R4_A6_PUMP_STATION_TITLE_RU,
        scopeSummary: "Насосная станция с фундаментом, обвязкой, электроснабжением, автоматикой, испытаниями и условной логистикой",
      },
    },
    applicability: {
      ...object(input.oldDefinition.applicability),
      p0Policy: "NEEDS_INPUT_WHEN_MISSING",
      insufficientWitness: "100 m is not a station primary measure",
    },
    definitionSha256: definitionHash,
    sourceMetadata: {
      ...object(input.oldDefinition.source_metadata),
      contract: CONTRACT_ID,
      sourceDefinitionVersionId: input.oldDefinition.id,
      sourceFingerprint: input.fingerprint,
      professionalComposition: "AUTHORED_31_ROWS",
      hiddenDefaultsForbidden: true,
      activationAllowed: false,
    },
  };
  const passportDecision = {
    status: "GREEN",
    allowed: true,
    contract: CONTENT_PASSPORT_CONTRACT_ID,
    r4A6Contract: CONTRACT_ID,
    applicableRows: resources.length,
    artificialMinimumRows: false,
    genericRows: 0,
    titleColonRows: 0,
    p0MissingResult: "NEEDS_INPUT",
    pricesWithoutSource: "NULL",
  };
  return {
    definition,
    parameters,
    formulas,
    resources,
    passport: {
      definitionId: input.definitionId,
      releaseId: input.releaseId,
      catalogId: R4_A6_PUMP_STATION_CATALOG_ID,
      contractVersion: CONTENT_PASSPORT_CONTRACT_ID,
      identityMode: "WORK",
      physicalResultRu: R4_A6_PUMP_STATION_TITLE_RU,
      includedScopeRu: ["Фундамент", "Насосные агрегаты", "Коллекторы", "Электроснабжение", "Автоматика", "Испытания", "Логистика при выборе P1"],
      excludedScopeRu: ["Марки и цены без спецификации и подтверждённого источника", "Работы вне заданного scope"],
      capabilityMatrix: [
        { capability: "PARAMETERS", status: "GREEN_NEEDS_EXPLICIT_P0" },
        { capability: "FORMULAS", status: "GREEN" },
        { capability: "RESOURCES", status: "GREEN" },
        { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_PRICE_MISSING" },
      ],
      parameterCount: parameters.length,
      formulaCount: formulas.length,
      resourceCount: resources.length,
      decision: passportDecision,
      payloadSha256: shaObject({ definitionHash, passportDecision }),
      sourceHead: input.head,
      sourceTree: input.tree,
    },
  };
}

async function buildClonedResources(input: {
  client: Client;
  contract: Contract;
  maps: DefinitionMap[];
  fingerprint: string;
}): Promise<ResourceClone[]> {
  clearProfessionalWorkPassportBuildCaches();
  const roofPassport = buildProfessionalWorkPassport(
    "battens_counterbattens_preliminary_boq_expanded_complex_v1",
  );
  invariant(roofPassport?.boqRecipe.rowCount === 45, "R4_A6_PROFESSIONAL_ROOF_PASSPORT_RED");
  const roofRows = new Map(roofPassport.boqRecipe.allRows.map((row) => [row.rowId, row]));
  const nonPumpMaps = input.maps.filter((row) => row.catalogId !== input.contract.pumpCatalogId);
  const mapByDefinition = new Map(nonPumpMaps.map((row) => [row.oldDefinitionId, row]));
  const sourceRows = (await input.client.query(`select resource.*,definition.catalog_id
    from public.estimate_resource_spec resource
    join public.estimate_definition_version definition on definition.id=resource.definition_version_id
    where resource.definition_version_id=any($1::uuid[])
    order by definition.catalog_id,resource.ordinal,resource.row_id`, [
    nonPumpMaps.map((row) => row.oldDefinitionId),
  ])).rows as Json[];
  const clones = sourceRows.map((source): ResourceClone => {
    const map = mapByDefinition.get(String(source.definition_version_id));
    invariant(map, `R4_A6_PROFESSIONAL_RESOURCE_MAP_MISSING:${source.id}`);
    const rowId = String(source.row_id);
    const synthetic = isSyntheticRow(rowId);
    const acceptedRoofSupplement = map.catalogId === input.contract.roofCatalogId && rowId.startsWith("professional_");
    const roofRecipe = acceptedRoofSupplement ? roofRows.get(rowId) : undefined;
    invariant(!acceptedRoofSupplement || roofRecipe, `R4_A6_PROFESSIONAL_ROOF_ROW_MISSING:${rowId}`);
    const applicable = !synthetic || acceptedRoofSupplement;
    const titleRu = roofRecipe?.titleRu ?? (synthetic ? cleanSyntheticTitle(String(source.title_ru), rowId) : String(source.title_ru));
    const inclusionAst = applicable ? object(source.inclusion_ast) : { kind: "literal", value: false };
    const resourceGraph = {
      ...object(source.resource_graph),
      r4A6ProfessionalBoq: {
        contract: CONTRACT_ID,
        applicable,
        disposition: applicable ? "NATIVE_OR_ACCEPTED_ROOF_SCOPE" : "LEGACY_SYNTHETIC_EXCLUDED",
        specificationRu: acceptedRoofSupplement
          ? `Предметная строка принятого кровельного scope; формула ${roofRecipe?.quantityFormula}.`
          : applicable
            ? "Исходная предметная строка канонического паспорта."
            : "Историческая синтетическая строка сохранена для immutable lineage и не применяется.",
        scopeOwner: source.semantic_owner ?? source.cost_owner_id ?? map.catalogId,
      },
    };
    const sourceMetadata = {
      ...object(source.source_metadata),
      r4A6ProfessionalDisposition: {
        contract: CONTRACT_ID,
        sourceResourceId: source.id,
        sourceDefinitionVersionId: source.definition_version_id,
        applicable,
        artificialMinimumRows: false,
        sourceFingerprint: input.fingerprint,
      },
    };
    const comparable = {
      rowId,
      ordinal: Number(source.ordinal),
      section: String(source.section),
      category: String(source.category),
      titleRu,
      rowType: String(source.row_type),
      unitId: String(source.unit_id),
      formulaId: String(source.formula_id),
      inclusionAst,
      resourceGraph,
      semanticOwner: source.semantic_owner == null ? null : String(source.semantic_owner),
      costOwnerId: source.cost_owner_id == null ? null : String(source.cost_owner_id),
      procurementEligible: Boolean(source.procurement_eligible),
      sourceMetadata,
    };
    return {
      id: uuid(`${CONTRACT_ID}:resource:${map.catalogId}:${rowId}:${input.fingerprint}`),
      oldResourceId: String(source.id),
      definitionId: map.newDefinitionId,
      ...comparable,
      rowSha256: shaObject(comparable),
    };
  });
  const changedApplicable = clones.filter((row) => row.inclusionAst.kind !== "literal" || row.inclusionAst.value !== false);
  invariant(changedApplicable.every((row) => !/[:：]/u.test(row.titleRu)),
    "R4_A6_PROFESSIONAL_APPLICABLE_TITLE_COLON_RED");
  invariant(clones.filter((row) => isSyntheticRow(row.rowId) &&
    (row.inclusionAst.kind !== "literal" || row.inclusionAst.value !== false)).length ===
    input.contract.denominator.successorApplicableRoofSupplementRows,
  "R4_A6_PROFESSIONAL_SYNTHETIC_APPLICABILITY_RED");
  return clones;
}

async function insertDefinitionAndContent(input: {
  client: Client;
  contract: Contract;
  releaseId: string;
  maps: DefinitionMap[];
  clonedResources: ResourceClone[];
  pump: ReturnType<typeof buildPumpPayload>;
  fingerprint: string;
  head: string;
  tree: string;
}): Promise<void> {
  const { client, contract, releaseId, maps, clonedResources, pump } = input;
  const applicableByDefinition = new Map<string, number>();
  for (const resource of clonedResources) {
    const applicable = resource.inclusionAst.kind !== "literal" || resource.inclusionAst.value !== false;
    if (applicable) applicableByDefinition.set(resource.definitionId, (applicableByDefinition.get(resource.definitionId) ?? 0) + 1);
  }
  await client.query(`create temporary table r4a6_professional_definition_map(
    catalog_id text primary key,old_definition_id uuid not null,new_definition_id uuid not null,
    new_baseline_id uuid,definition_hash text not null,applicable_rows integer not null) on commit drop`);
  await insertChunks(client, `insert into r4a6_professional_definition_map(
      catalog_id,old_definition_id,new_definition_id,new_baseline_id,definition_hash,applicable_rows)
    select x."catalogId",x."oldDefinitionId",x."newDefinitionId",x."newBaselineId",x."definitionHash",x."applicableRows"
    from jsonb_to_recordset($1::jsonb) as x(
      "catalogId" text,"oldDefinitionId" uuid,"newDefinitionId" uuid,"newBaselineId" uuid,
      "definitionHash" text,"applicableRows" integer)`,
  maps.map((row) => ({ ...row, applicableRows: row.catalogId === contract.pumpCatalogId
    ? contract.denominator.pumpRows
    : applicableByDefinition.get(row.newDefinitionId) ?? 0 })), 500);

  await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
      source_metadata,content_status,content_gate_status)
    select map.new_definition_id,$1,source.catalog_id,source.definition_version+1,
      source.passport||jsonb_build_object(
        'contract',$2::text,'rowCount',map.applicable_rows,'artificialMinimumRows',false,
        'legacySyntheticRowsApplicable',case when source.catalog_id=$3 then $4::int else 0 end),
      source.applicability||jsonb_build_object('r4A6ProfessionalBoq','APPLICABLE_ROWS_ONLY'),
      map.definition_hash,
      source.source_metadata||jsonb_build_object(
        'contract',$2::text,'sourceDefinitionVersionId',source.id::text,
        'sourceFingerprint',$5::text,'legacySyntheticDisposition','PRESERVED_BUT_NOT_APPLICABLE'),
      'QUARANTINED','RED'
    from r4a6_professional_definition_map map
    join public.estimate_definition_version source on source.id=map.old_definition_id
    where map.catalog_id<>$6`, [
    releaseId,
    CONTRACT_ID,
    contract.roofCatalogId,
    contract.denominator.successorApplicableRoofSupplementRows,
    input.fingerprint,
    contract.pumpCatalogId,
  ]);
  await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
      source_metadata,content_status,content_gate_status)
    values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
    pump.definition.id,
    releaseId,
    pump.definition.catalogId,
    pump.definition.definitionVersion,
    JSON.stringify(pump.definition.passport),
    JSON.stringify(pump.definition.applicability),
    pump.definition.definitionSha256,
    JSON.stringify(pump.definition.sourceMetadata),
  ]);

  await client.query(`insert into public.estimate_approved_template_baseline(
      id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
      parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
      formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
      proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
      accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
    select map.new_baseline_id,
      $1||':'||substr($2,1,16)||':'||substr(encode(extensions.digest(convert_to(map.catalog_id,'UTF8'),'sha256'),'hex'),1,16),
      source.catalog_id,map.new_definition_id,source.source_definition_version_id,
      source.parameter_schema_sha256,source.input_values,source.input_classification,source.uom_by_parameter,
      source.formula_consumer_ids,source.resource_consumer_row_ids,source.normative_source_ids,
      source.guide_provenance_ru,
      source.proposal_source_refs||jsonb_build_array(jsonb_build_object(
        'contract',$1::text,'sourceBaselineId',source.id::text,'sourceFingerprint',$2::text)),
      source.validation_scenario_refs,source.acceptance_evidence_sha256,$3,clock_timestamp(),source.id,
      source.contract_version
    from r4a6_professional_definition_map map
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$4 and manifest.catalog_id=map.catalog_id
    join public.estimate_approved_template_baseline source
      on source.id=manifest.approved_template_baseline_id
    where map.catalog_id<>$5`, [
    CONTRACT_ID,
    input.fingerprint,
    releaseId,
    contract.predecessorDefinitionReleaseId,
    contract.pumpCatalogId,
  ]);

  await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
      default_value,constraints_json,truth_metadata,approved_template_baseline_id)
    select map.new_definition_id,source.parameter_id,source.ordinal,source.value_type,source.unit_id,
      source.title_ru,source.required,source.default_value,source.constraints_json,
      jsonb_set(
        jsonb_set(
          source.truth_metadata||jsonb_build_object('r4A6ProfessionalBoqContract',$1::text),
          '{provenance,approvedTemplateBaselineId}',to_jsonb(map.new_baseline_id::text),true),
        '{baseline_assumption_id}',to_jsonb(map.new_baseline_id::text||':'||source.parameter_id),true),
      map.new_baseline_id
    from r4a6_professional_definition_map map
    join public.estimate_parameter_definition source on source.definition_version_id=map.old_definition_id
    where map.catalog_id<>$2`, [CONTRACT_ID, contract.pumpCatalogId]);
  await insertChunks(client, `insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
      default_value,constraints_json,truth_metadata,approved_template_baseline_id)
    select x."definitionId",x."parameterId",x.ordinal,x."valueType",x."unitId",x."titleRu",x.required,
      nullif(x."defaultValue",'null'::jsonb),x.constraints,x."truthMetadata",x."baselineId"
    from jsonb_to_recordset($1::jsonb) as x(
      "definitionId" uuid,"parameterId" text,ordinal integer,"valueType" text,"unitId" text,
      "titleRu" text,required boolean,"defaultValue" jsonb,constraints jsonb,"truthMetadata" jsonb,"baselineId" uuid)`,
  pump.parameters, 200);

  await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
    select map.new_definition_id,source.formula_id,source.output_unit_id,source.expression_source,
      source.ast,source.input_parameter_ids,source.ast_sha256
    from r4a6_professional_definition_map map
    join public.estimate_formula_graph source on source.definition_version_id=map.old_definition_id
    where map.catalog_id<>$1`, [contract.pumpCatalogId]);
  await insertChunks(client, `insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
    select x."definitionId",x."formulaId",x."outputUnitId",x."expressionSource",x.ast,
      x."inputParameterIds",x."astSha256"
    from jsonb_to_recordset($1::jsonb) as x(
      "definitionId" uuid,"formulaId" text,"outputUnitId" text,"expressionSource" text,
      ast jsonb,"inputParameterIds" text[],"astSha256" text)`, pump.formulas, 200);

  const allResources = [...clonedResources, ...pump.resources];
  await insertChunks(client, `insert into public.estimate_resource_spec(
      id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
      formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
      procurement_eligible,source_metadata,row_sha256)
    select x.id,x."definitionId",x."rowId",x.ordinal,x.section,x.category,x."titleRu",x."rowType",x."unitId",
      x."formulaId",x."inclusionAst",x."resourceGraph",x."semanticOwner",x."costOwnerId",
      x."procurementEligible",x."sourceMetadata",x."rowSha256"
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,"definitionId" uuid,"rowId" text,ordinal integer,section text,category text,"titleRu" text,
      "rowType" text,"unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,
      "semanticOwner" text,"costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text)`,
  allResources, 400);

  await client.query(`create temporary table r4a6_professional_resource_map(
    old_resource_id uuid primary key,new_resource_id uuid not null) on commit drop`);
  await insertChunks(client, `insert into r4a6_professional_resource_map(old_resource_id,new_resource_id)
    select x."oldResourceId",x.id from jsonb_to_recordset($1::jsonb) as x("oldResourceId" uuid,id uuid)`,
  clonedResources.map((row) => ({ oldResourceId: row.oldResourceId, id: row.id })), 800);
  await client.query(`insert into public.estimate_resource_price_route_binding(
      resource_spec_id,route_id,price_key,priority)
    select map.new_resource_id,binding.route_id,binding.price_key,binding.priority
    from r4a6_professional_resource_map map
    join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=map.old_resource_id`);
  const pumpRoute = (await client.query(`select binding.route_id
    from r4a6_professional_definition_map map
    join public.estimate_resource_spec resource on resource.definition_version_id=map.old_definition_id
    join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource.id
    where map.catalog_id=$1 order by binding.priority,binding.price_key limit 1`, [contract.pumpCatalogId])).rows[0] as Json | undefined;
  invariant(pumpRoute?.route_id, "R4_A6_PROFESSIONAL_PUMP_PRICE_ROUTE_MISSING");
  await insertChunks(client, `insert into public.estimate_resource_price_route_binding(
      resource_spec_id,route_id,price_key,priority)
    select x.id,x."routeId",x."priceKey",100
    from jsonb_to_recordset($1::jsonb) as x(id uuid,"routeId" uuid,"priceKey" text)`,
  pump.resources.map((row) => ({
    id: row.id,
    routeId: pumpRoute.route_id,
    priceKey: `r4-a6-pump:${sha256(`${row.rowId}:${input.fingerprint}`).slice(0, 24)}`,
  })), 200);

  await client.query(`insert into public.estimate_content_passport_r3(
      definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
      physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
      formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
    select map.new_definition_id,$1,source.catalog_id,'real-professional-estimates-r3.content-passport.v1',
      source.identity_mode,source.redirect_catalog_id,source.physical_result_ru,source.included_scope_ru,
      source.excluded_scope_ru,source.capability_matrix,source.parameter_count,source.formula_count,source.resource_count,
      source.decision||jsonb_build_object(
        'status','GREEN','allowed',true,'contract','real-professional-estimates-r3.content-passport.v1',
        'r4A6Contract',$2::text,'artificialMinimumRows',false,
        'legacySyntheticRowsApplicable',case when source.catalog_id=$3 then $4::int else 0 end),
      encode(extensions.digest(convert_to(source.payload_sha256||':'||$2||':'||map.definition_hash,'UTF8'),'sha256'),'hex'),
      $5,$6
    from r4a6_professional_definition_map map
    join public.estimate_content_passport_r3 source on source.definition_version_id=map.old_definition_id
    where map.catalog_id<>$7`, [
    releaseId,
    CONTRACT_ID,
    contract.roofCatalogId,
    contract.denominator.successorApplicableRoofSupplementRows,
    input.head,
    input.tree,
    contract.pumpCatalogId,
  ]);
  await insertChunks(client, `insert into public.estimate_content_passport_r3(
      definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
      physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
      formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
    select x."definitionId",x."releaseId",x."catalogId",x."contractVersion",x."identityMode",null,
      x."physicalResultRu",x."includedScopeRu",x."excludedScopeRu",x."capabilityMatrix",x."parameterCount",
      x."formulaCount",x."resourceCount",x.decision,x."payloadSha256",x."sourceHead",x."sourceTree"
    from jsonb_to_recordset($1::jsonb) as x(
      "definitionId" uuid,"releaseId" uuid,"catalogId" text,"contractVersion" text,"identityMode" text,
      "physicalResultRu" text,"includedScopeRu" jsonb,"excludedScopeRu" jsonb,"capabilityMatrix" jsonb,
      "parameterCount" integer,"formulaCount" integer,"resourceCount" integer,decision jsonb,
      "payloadSha256" text,"sourceHead" text,"sourceTree" text)`, [pump.passport], 1);
  await client.query(`update public.estimate_definition_version set
      content_status='CANDIDATE_READY',content_gate_status='GREEN'
    where release_id=$1 and source_metadata->>'contract'=$2
      and content_status='QUARANTINED' and content_gate_status='RED'`, [releaseId, CONTRACT_ID]);
}

async function cloneCanonicalSearch(input: {
  client: Client;
  contract: Contract;
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  fingerprint: string;
  head: string;
  tree: string;
}): Promise<Json> {
  const { client, contract } = input;
  const source = (await client.query(
    "select * from public.estimate_search_index_release where id=$1",
    [contract.canonicalVisibleSearchReleaseId],
  )).rows[0] as Json | undefined;
  invariant(source && ["draft", "prepared"].includes(String(source.status)),
    "R4_A6_PROFESSIONAL_CANONICAL_SEARCH_RED");
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    source.taxonomy_version,
    source.group_relation_version,
    source.ranking_contract_version,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    source.global_count,
    source.external_count,
    source.discovered_count,
    JSON.stringify({
      ...object(source.metadata),
      contract: CONTRACT_ID,
      masterSha256: contract.masterSha256,
      parentSearchReleaseId: contract.canonicalVisibleSearchReleaseId,
      definitionReleaseId: input.releaseId,
      sourceFingerprint: input.fingerprint,
      activationAllowed: false,
      productionEligible: false,
    }),
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId,
    contract.canonicalVisibleSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId,
    contract.canonicalVisibleSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,
      source.source_provenance||jsonb_build_object(
        'contract',$3::text,'parentSearchReleaseId',$4::text,'definitionReleaseId',$2::text,
        'sourceFingerprint',$5::text),
      source.document_sha256,'EFFECTIVE_WORK',true,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2::uuid and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4::uuid`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT_ID,
    contract.canonicalVisibleSearchReleaseId,
    input.fingerprint,
  ]);

  const titles = (await client.query(`select catalog_id,canonical_name_ru
    from public.estimate_search_document
    where search_release_id=$1 and canonical_name_ru~'[:：]' order by catalog_id`, [
    input.searchReleaseId,
  ])).rows as Json[];
  const cleanTitles = titles.map((row) => ({
    catalogId: row.catalog_id,
    titleRu: cleanPublicWorkTitle(String(row.canonical_name_ru)),
  }));
  invariant(cleanTitles.every((row) => row.titleRu.length > 3 && !/[:：]/u.test(row.titleRu)),
    "R4_A6_PROFESSIONAL_SEARCH_TITLE_NORMALIZATION_RED");
  await insertChunks(client, `update public.estimate_search_document target set
      canonical_name_ru=x."titleRu",normalized_canonical_name=lower(x."titleRu")
    from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"titleRu" text)
    where target.search_release_id='${input.searchReleaseId}'::uuid and target.catalog_id=x."catalogId"`,
  cleanTitles, 500);
  const pumpP0 = R4_A6_PUMP_STATION_PARAMETERS.filter((parameter) => parameter.tier === "P0");
  await client.query(`update public.estimate_search_document set
      canonical_name_ru=$3,normalized_canonical_name=lower($3),
      short_scope_ru=$4,key_distinguishing_parameters=$5::jsonb,
      required_inputs_count=$6,clarification_fields=$7::jsonb,
      included_boundaries=$8::jsonb,excluded_boundaries=$9::jsonb,
      normalized_search_blob=normalized_search_blob||' '||lower($3)||' needs_input p0'
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId,
    contract.pumpCatalogId,
    R4_A6_PUMP_STATION_TITLE_RU,
    "Фундамент, насосные агрегаты, обвязка, электроснабжение, автоматика и испытания",
    JSON.stringify(pumpP0.map((parameter) => ({
      parameterId: parameter.parameterId,
      titleRu: parameter.titleRu,
      unitId: parameter.unitId,
      requiredWhen: parameter.requiredWhen ?? null,
    }))),
    pumpP0.length,
    JSON.stringify(pumpP0.map((parameter) => parameter.parameterId)),
    JSON.stringify(["Насосные агрегаты", "Коллекторы", "Фундамент", "Электроснабжение", "Автоматика", "Испытания"]),
    JSON.stringify(["Марки и цены без источника", "Незаданные здания и внешние сети", "Ложная первичная мера 100 м"]),
  ]);
  await client.query(`update public.estimate_search_document set
      document_sha256=encode(extensions.digest(convert_to(
        catalog_id||':'||canonical_name_ru||':'||document_sha256||':'||$2||':'||($3::uuid)::text,
        'UTF8'),'sha256'),'hex')
    where search_release_id=$1`, [input.searchReleaseId, CONTRACT_ID, input.releaseId]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId,
    contract.canonicalVisibleSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId,
    contract.canonicalVisibleSearchReleaseId,
  ]);
  const snapshot = (await client.query(`select
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256,
      count(*)::int documents,count(*) filter(where selectable)::int selectable,
      count(*) filter(where canonical_name_ru~'[:：]')::int title_colon
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set
      snapshot_sha256=$2,metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      lifecycle: "PREPARED_NOT_ACTIVE",
      canonicalNamesNormalized: cleanTitles.length,
      documentCount: snapshot.documents,
      titleColonCount: snapshot.title_colon,
    }),
  ]);
  return { ...snapshot, canonicalNamesNormalized: cleanTitles.length };
}

async function auditSuccessor(input: {
  client: Client;
  contract: Contract;
  releaseId: string;
  searchReleaseId: string;
}): Promise<Json> {
  const { client, contract } = input;
  const release = (await client.query(
    "select * from public.estimate_definition_release where id=$1",
    [input.releaseId],
  )).rows[0] as Json | undefined;
  const manifest = (await client.query(`select count(*)::int definitions,
      count(*) filter(where baseline_ready and scenario_ready)::int ready,
      count(*) filter(where runtime_publication_state='QUARANTINED')::int quarantined
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [input.releaseId])).rows[0] as Json;
  const totals = (await client.query(`select
      (select count(*) from public.estimate_parameter_definition parameter
        join public.estimate_cumulative_manifest_entry manifest on manifest.definition_version_id=parameter.definition_version_id
        where manifest.release_id=$1)::int parameters,
      (select count(*) from public.estimate_formula_graph formula
        join public.estimate_cumulative_manifest_entry manifest on manifest.definition_version_id=formula.definition_version_id
        where manifest.release_id=$1)::int formulas,
      (select count(*) from public.estimate_resource_spec resource
        join public.estimate_cumulative_manifest_entry manifest on manifest.definition_version_id=resource.definition_version_id
        where manifest.release_id=$1)::int resources`, [input.releaseId])).rows[0] as Json;
  const synthetic = (await client.query(`select
      count(*) filter(where resource.row_id like 'professional\\_%' escape '\\'
        or resource.row_id like 's2b\\_%' escape '\\')::int total,
      count(*) filter(where (resource.row_id like 'professional\\_%' escape '\\'
        or resource.row_id like 's2b\\_%' escape '\\')
        and resource.inclusion_ast=jsonb_build_object('kind','literal','value',false))::int excluded,
      count(*) filter(where resource.row_id like 'professional\\_%' escape '\\'
        and manifest.catalog_id=$2
        and resource.inclusion_ast<>jsonb_build_object('kind','literal','value',false))::int roof_applicable,
      count(*) filter(where resource.inclusion_ast<>jsonb_build_object('kind','literal','value',false)
        and resource.title_ru~'[:：]' and exists(
          select 1 from public.estimate_search_document document
          where document.search_release_id=$3 and document.catalog_id=manifest.catalog_id))::int applicable_title_colon
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1`, [input.releaseId, contract.roofCatalogId, input.searchReleaseId])).rows[0] as Json;
  const pump = (await client.query(`select
      count(distinct parameter.parameter_id)::int parameters,
      count(distinct parameter.parameter_id) filter(where parameter.truth_metadata->>'tier'='P0')::int p0,
      count(distinct parameter.parameter_id) filter(where parameter.truth_metadata->>'tier'='P0'
        and parameter.default_value is not null)::int p0_with_default,
      count(distinct formula.formula_id)::int formulas,count(distinct resource.row_id)::int resources,
      count(distinct resource.row_id) filter(where resource.title_ru~'[:：]')::int title_colon,
      count(distinct binding.resource_spec_id)::int price_bindings,
      count(distinct price.price_key)::int accepted_price_items
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    join public.estimate_formula_graph formula on formula.definition_version_id=manifest.definition_version_id
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    left join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource.id
    left join public.estimate_price_snapshot_item price on price.price_key=binding.price_key
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    input.releaseId,
    contract.pumpCatalogId,
  ])).rows[0] as Json;
  const roof = (await client.query(`select
      count(*)::int rows,
      count(*) filter(where resource.category='material')::int material,
      count(*) filter(where resource.category='work')::int work,
      count(*) filter(where resource.category='equipment')::int equipment,
      count(*) filter(where resource.category='service')::int service,
      count(*) filter(where resource.category='transport')::int transport
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=$2
      and resource.inclusion_ast<>jsonb_build_object('kind','literal','value',false)`, [
    input.releaseId,
    contract.roofCatalogId,
  ])).rows[0] as Json;
  const formulaParity = (await client.query(`with source_ids as (
      select manifest.catalog_id,manifest.definition_version_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and (
        definition.source_metadata->>'contract'=$2 or manifest.catalog_id=$3)
    ), target_ids as (
      select manifest.catalog_id,manifest.definition_version_id
      from public.estimate_cumulative_manifest_entry manifest
      join source_ids using(catalog_id) where manifest.release_id=$4
    ), source_formula as (
      select ids.catalog_id,formula.formula_id,formula.output_unit_id,formula.expression_source,
        formula.ast_sha256,formula.input_parameter_ids from source_ids ids
      join public.estimate_formula_graph formula on formula.definition_version_id=ids.definition_version_id
    ), target_formula as (
      select ids.catalog_id,formula.formula_id,formula.output_unit_id,formula.expression_source,
        formula.ast_sha256,formula.input_parameter_ids from target_ids ids
      join public.estimate_formula_graph formula on formula.definition_version_id=ids.definition_version_id
    ), drift as (
      (select * from source_formula except select * from target_formula)
      union all
      (select * from target_formula except select * from source_formula)
    ) select (select count(distinct catalog_id) from source_ids)::int definitions,
      (select count(*) from source_formula)::int formulas,(select count(*) from drift)::int drift`, [
    contract.predecessorDefinitionReleaseId,
    FORMULA_CONTRACT_ID,
    contract.roofCatalogId,
    input.releaseId,
  ])).rows[0] as Json;
  const search = (await client.query(`select
      (select count(*) from public.estimate_search_document where search_release_id=$1)::int documents,
      (select count(*) from public.estimate_search_document where search_release_id=$1 and selectable)::int selectable,
      (select count(*) from public.estimate_search_document where search_release_id=$1 and canonical_name_ru~'[:：]')::int title_colon,
      (select count(*) from public.estimate_search_group where search_release_id=$1)::int groups,
      (select count(*) from public.estimate_search_group_membership where search_release_id=$1)::int memberships,
      (select count(*) from public.estimate_search_document document
        join public.estimate_cumulative_manifest_entry manifest
          on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
        where document.search_release_id=$1 and (
          document.definition_release_id<>$2 or document.definition_version_id<>manifest.definition_version_id))::int binding_drift`, [
    input.searchReleaseId,
    input.releaseId,
  ])).rows[0] as Json;
  const content = (await client.query(`select count(*)::int passports,
      count(*) filter(where definition.content_status='CANDIDATE_READY'
        and definition.content_gate_status='GREEN' and passport.decision->>'status'='GREEN')::int green
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.release_id=$1 and definition.source_metadata->>'contract'=$2`, [
    input.releaseId,
    CONTRACT_ID,
  ])).rows[0] as Json;
  const missingBindings = (await client.query(`select count(*)::int count from (
      select resource.id from public.estimate_definition_version definition
      join public.estimate_resource_spec resource on resource.definition_version_id=definition.id
      left join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource.id
      where definition.release_id=$1 and definition.source_metadata->>'contract'=$2
      group by resource.id having count(binding.*)=0) missing`, [input.releaseId, CONTRACT_ID])).rows[0] as Json;

  invariant(release?.status === "prepared"
    && Number(release.definition_count) === contract.denominator.definitionRecords
    && Number(release.resource_row_count) === contract.denominator.successorResourceRows
    && Number(release.parameter_count) === contract.denominator.successorParameters
    && Number(release.formula_count) === contract.denominator.successorFormulaGraphs,
  `R4_A6_PROFESSIONAL_RELEASE_AUDIT_RED:${stableJson(release)}`);
  invariant(Number(manifest.definitions) === contract.denominator.definitionRecords
    && Number(manifest.ready) === contract.denominator.definitionRecords
    && Number(manifest.quarantined) === 0,
  `R4_A6_PROFESSIONAL_MANIFEST_AUDIT_RED:${stableJson(manifest)}`);
  invariant(Number(totals.resources) === contract.denominator.successorResourceRows
    && Number(totals.formulas) === contract.denominator.successorFormulaGraphs
    && Number(totals.parameters) === contract.denominator.successorParameters,
  `R4_A6_PROFESSIONAL_TOTALS_AUDIT_RED:${stableJson(totals)}`);
  invariant(Number(synthetic.total) === contract.denominator.successorLegacySyntheticRows
    && Number(synthetic.excluded) === contract.denominator.successorExcludedSyntheticRows
    && Number(synthetic.roof_applicable) === contract.denominator.successorApplicableRoofSupplementRows
    && Number(synthetic.applicable_title_colon) === 0,
  `R4_A6_PROFESSIONAL_SYNTHETIC_AUDIT_RED:${stableJson(synthetic)}`);
  invariant(Number(pump.parameters) === contract.denominator.pumpParameters
    && Number(pump.p0) === contract.denominator.pumpP0Parameters
    && Number(pump.p0_with_default) === 0
    && Number(pump.formulas) === contract.denominator.pumpRows
    && Number(pump.resources) === contract.denominator.pumpRows
    && Number(pump.title_colon) === 0
    && Number(pump.price_bindings) === contract.denominator.pumpRows
    && Number(pump.accepted_price_items) === 0,
  `R4_A6_PROFESSIONAL_PUMP_AUDIT_RED:${stableJson(pump)}`);
  invariant(Number(roof.rows) === 45 && Number(roof.material) === 22 && Number(roof.work) === 4
    && Number(roof.equipment) === 7 && Number(roof.service) === 9 && Number(roof.transport) === 3,
  `R4_A6_PROFESSIONAL_ROOF_AUDIT_RED:${stableJson(roof)}`);
  invariant(Number(formulaParity.definitions) === contract.denominator.formulaDefinitions
    && Number(formulaParity.formulas) === contract.denominator.formulaGraphs
    && Number(formulaParity.drift) === 0,
  `R4_A6_PROFESSIONAL_FORMULA_PARITY_RED:${stableJson(formulaParity)}`);
  invariant(Number(search.documents) === contract.denominator.visibleWorks
    && Number(search.selectable) === contract.denominator.visibleWorks
    && Number(search.groups) === contract.denominator.groups
    && Number(search.memberships) === contract.denominator.visibleWorks
    && Number(search.title_colon) === 0 && Number(search.binding_drift) === 0,
  `R4_A6_PROFESSIONAL_SEARCH_AUDIT_RED:${stableJson(search)}`);
  invariant(Number(content.passports) === contract.denominator.legacySyntheticDefinitions
    && Number(content.green) === contract.denominator.legacySyntheticDefinitions
    && Number(missingBindings.count) === 0,
  `R4_A6_PROFESSIONAL_CONTENT_AUDIT_RED:${stableJson({ content, missingBindings })}`);
  return { release, manifest, totals, synthetic, pump, roof, formulaParity, search, content, missingBindings };
}

async function main(): Promise<void> {
  const contractBytes = readFileSync(CONTRACT_PATH);
  const contract = JSON.parse(contractBytes.toString("utf8")) as Contract;
  invariant(contract.schemaVersion === "r568-r4-a6-professional-boq-contract.v1",
    "R4_A6_PROFESSIONAL_CONTRACT_VERSION_RED");
  invariant(sha256(readFileSync(MASTER_PATH)) === contract.masterSha256,
    "R4_A6_PROFESSIONAL_MASTER_SHA256_DRIFT");
  invariant(contract.predecessorDefinitionReleaseId === "2150216f-e8f1-5471-8fb8-c627082a527d"
    && contract.predecessorSearchReleaseId === "9350da78-5a9c-5591-b33f-71f57cb3d7a2"
    && contract.policy.artificialMinimumRows === "FORBIDDEN"
    && contract.policy.pumpInsufficientInput === "NEEDS_INPUT"
    && contract.policy.pumpHiddenDefaults === "FORBIDDEN"
    && contract.policy.priceWithoutVerifiedSource === "NULL"
    && contract.policy.activationAllowed === false,
  "R4_A6_PROFESSIONAL_POLICY_RED");
  invariant(contract.pumpCatalogId === R4_A6_PUMP_STATION_CATALOG_ID,
    "R4_A6_PROFESSIONAL_PUMP_ID_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R4_A6_PROFESSIONAL_BRANCH_DRIFT:${branch}`);
  if (APPLY) {
    for (const path of MANAGED_SOURCE_PATHS) {
      invariant(git(["ls-files", "--error-unmatch", "--", path]) === path,
        `R4_A6_PROFESSIONAL_UNTRACKED_APPLY_SOURCE:${path}`);
      invariant(git(["diff", "--", path]) === "",
        `R4_A6_PROFESSIONAL_DIRTY_APPLY_SOURCE:${path}`);
    }
  }
  const fingerprint = sourceFingerprint(contractBytes, head);
  const releaseKey = `r568-r4-a6-professional-boq-${fingerprint.slice(0, 12)}`;
  const releaseId = uuid(`${CONTRACT_ID}:release:${fingerprint}`);
  const searchReleaseId = uuid(`${CONTRACT_ID}:search:${fingerprint}`);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r4-a6-professional-boq-apply" : "r4-a6-professional-boq-dry-run",
  });
  await client.connect();
  let proof: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='600s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT_ID]);
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [contract.predecessorDefinitionReleaseId],
    )).rows[0] as Json | undefined;
    const canonicalVisible = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [contract.canonicalVisibleDefinitionReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared"
      && Number(predecessor.definition_count) === contract.denominator.definitionRecords
      && Number(predecessor.resource_row_count) === contract.denominator.predecessorResourceRows
      && Number(predecessor.formula_count) === contract.denominator.predecessorFormulaGraphs
      && Number(predecessor.parameter_count) === contract.denominator.predecessorParameters,
    `R4_A6_PROFESSIONAL_PREDECESSOR_RED:${stableJson(predecessor)}`);
    invariant(canonicalVisible?.status === "prepared"
      && Number(canonicalVisible.definition_count) === contract.denominator.visibleWorks,
    "R4_A6_PROFESSIONAL_VISIBLE_RELEASE_RED");
    const affected = (await client.query(`select manifest.catalog_id,manifest.definition_version_id,
        definition.definition_sha256,definition.definition_version
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and exists(
        select 1 from public.estimate_resource_spec resource
        where resource.definition_version_id=manifest.definition_version_id
          and (resource.row_id like 'professional\\_%' escape '\\'
            or resource.row_id like 's2b\\_%' escape '\\'))
      order by manifest.catalog_id`, [contract.predecessorDefinitionReleaseId])).rows as Json[];
    invariant(affected.length === contract.denominator.legacySyntheticDefinitions,
      `R4_A6_PROFESSIONAL_AFFECTED_DENOMINATOR_RED:${affected.length}`);
    invariant(affected.some((row) => row.catalog_id === contract.roofCatalogId)
      && affected.some((row) => row.catalog_id === contract.pumpCatalogId),
    "R4_A6_PROFESSIONAL_WITNESS_SCOPE_RED");
    const existing = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1",
      [releaseKey],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared",
        "R4_A6_PROFESSIONAL_EXISTING_SUCCESSOR_DRIFT");
      const audit = await auditSuccessor({ client, contract, releaseId, searchReleaseId });
      proof = {
        schemaVersion: "r568-r4-a6-professional-boq-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: true,
        status: "GREEN_R4_A6_PROFESSIONAL_BOQ_ALREADY_PREPARED_NOT_ACTIVE",
        source: { branch, head, tree, fingerprint },
        successor: { releaseId, searchReleaseId },
        audit,
        professionalBoqGateReady: true,
        productionReady: false,
      };
    } else {
      const maps: DefinitionMap[] = affected.map((row) => ({
        catalogId: String(row.catalog_id),
        oldDefinitionId: String(row.definition_version_id),
        newDefinitionId: uuid(`${CONTRACT_ID}:definition:${row.catalog_id}:${fingerprint}`),
        newBaselineId: row.catalog_id === contract.pumpCatalogId
          ? null
          : uuid(`${CONTRACT_ID}:baseline:${row.catalog_id}:${fingerprint}`),
        definitionHash: "",
      }));
      const pumpMap = maps.find((row) => row.catalogId === contract.pumpCatalogId)!;
      const oldPumpDefinition = (await client.query(
        "select * from public.estimate_definition_version where id=$1",
        [pumpMap.oldDefinitionId],
      )).rows[0] as Json | undefined;
      invariant(oldPumpDefinition, "R4_A6_PROFESSIONAL_PUMP_SOURCE_MISSING");
      const pump = buildPumpPayload({
        releaseId,
        oldDefinition: oldPumpDefinition,
        definitionId: pumpMap.newDefinitionId,
        fingerprint,
        head,
        tree,
      });
      invariant(pump.parameters.length === contract.denominator.pumpParameters
        && pump.parameters.filter((row) => row.truthMetadata.tier === "P0").length === contract.denominator.pumpP0Parameters
        && pump.formulas.length === contract.denominator.pumpRows
        && pump.resources.length === contract.denominator.pumpRows,
      "R4_A6_PROFESSIONAL_PUMP_PAYLOAD_RED");
      const clonedResources = await buildClonedResources({ client, contract, maps, fingerprint });
      const sourceHashByCatalog = new Map(affected.map((row) => [String(row.catalog_id), String(row.definition_sha256)]));
      for (const map of maps) {
        map.definitionHash = map.catalogId === contract.pumpCatalogId
          ? pump.definition.definitionSha256
          : shaObject({
            contract: CONTRACT_ID,
            catalogId: map.catalogId,
            sourceDefinitionHash: sourceHashByCatalog.get(map.catalogId),
            resourceHashes: clonedResources.filter((row) => row.definitionId === map.newDefinitionId)
              .map((row) => row.rowSha256),
            sourceFingerprint: fingerprint,
          });
      }
      const manifestSha256 = shaObject({
        contract: CONTRACT_ID,
        predecessor: predecessor.source_manifest_sha256,
        definitions: maps.map((row) => ({ catalogId: row.catalogId, definitionHash: row.definitionHash })),
        sourceFingerprint: fingerprint,
      });
      await client.query(`insert into public.estimate_definition_release(
          id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
          definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
          parameter_count,formula_count)
        values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`, [
        releaseId,
        releaseKey,
        head,
        tree,
        manifestSha256,
        contract.denominator.definitionRecords,
        contract.denominator.successorResourceRows,
        JSON.stringify({
          ...object(predecessor.metadata),
          contract: CONTRACT_ID,
          masterSha256: contract.masterSha256,
          parentReleaseId: contract.predecessorDefinitionReleaseId,
          canonicalVisibleParentReleaseId: contract.canonicalVisibleDefinitionReleaseId,
          sourceFingerprint: fingerprint,
          legacySyntheticDefinitions: contract.denominator.legacySyntheticDefinitions,
          artificialMinimumRows: "FORBIDDEN",
          legacySyntheticDisposition: "PRESERVED_IMMUTABLY_BUT_NOT_APPLICABLE",
          formulaDependencyParity: `${contract.denominator.formulaGraphs}/${contract.denominator.formulaGraphs}`,
          activationAllowed: false,
          productionEligible: false,
          localDisposable: true,
        }),
        contract.predecessorDefinitionReleaseId,
        shaObject({ manifestSha256, sourceFingerprint: fingerprint }),
        contract.denominator.successorParameters,
        contract.denominator.successorFormulaGraphs,
      ]);
      await insertDefinitionAndContent({
        client,
        contract,
        releaseId,
        maps,
        clonedResources,
        pump,
        fingerprint,
        head,
        tree,
      });
      await client.query(`insert into public.estimate_cumulative_manifest_entry(
          release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
          publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
          definition_hash,entry_sha256,runtime_publication_state)
        select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
          publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
          encode(extensions.digest(convert_to($2||':'||($1::uuid)::text||':'||catalog_id||':'||entry_sha256,
            'UTF8'),'sha256'),'hex'),runtime_publication_state
        from public.estimate_cumulative_manifest_entry where release_id=$3`, [
        releaseId,
        CONTRACT_ID,
        contract.predecessorDefinitionReleaseId,
      ]);
      await client.query(`update public.estimate_cumulative_manifest_entry target set
          definition_version_id=map.new_definition_id,source_batch=$2,
          publication_state='CANONICAL_SUCCESSOR',
          approved_template_baseline_id=map.new_baseline_id,
          baseline_ready=true,scenario_ready=true,definition_hash=map.definition_hash,
          entry_sha256=encode(extensions.digest(convert_to(
            $2||':'||($1::uuid)::text||':'||target.catalog_id||':'||map.definition_hash,
            'UTF8'),'sha256'),'hex'),runtime_publication_state='CANDIDATE'
        from r4a6_professional_definition_map map
        where target.release_id=$1 and target.catalog_id=map.catalog_id`, [
        releaseId,
        CONTRACT_ID,
      ]);
      const searchSnapshot = await cloneCanonicalSearch({
        client,
        contract,
        releaseId,
        searchReleaseId,
        releaseKey,
        fingerprint,
        head,
        tree,
      });
      await client.query(`update public.estimate_definition_release set
          status='prepared',sealed_at=clock_timestamp(),metadata=metadata||$2::jsonb
        where id=$1 and status='draft'`, [
        releaseId,
        JSON.stringify({
          lifecycle: "PREPARED_NOT_ACTIVE",
          searchReleaseId,
          searchSnapshot,
          denominator: contract.denominator,
          modifiedDefinitions: maps.length,
          pumpDefinitionVersionId: pump.definition.id,
        }),
      ]);
      const audit = await auditSuccessor({ client, contract, releaseId, searchReleaseId });
      proof = {
        schemaVersion: "r568-r4-a6-professional-boq-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: false,
        master: { path: MASTER_PATH, sha256: contract.masterSha256 },
        source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
        predecessor: {
          definitionReleaseId: contract.predecessorDefinitionReleaseId,
          searchReleaseId: contract.predecessorSearchReleaseId,
          canonicalVisibleSearchReleaseId: contract.canonicalVisibleSearchReleaseId,
        },
        successor: { releaseId, searchReleaseId },
        denominator: contract.denominator,
        changes: {
          modifiedDefinitions: maps.length,
          legacySyntheticRowsRetained: contract.denominator.successorLegacySyntheticRows,
          legacySyntheticRowsExcluded: contract.denominator.successorExcludedSyntheticRows,
          acceptedRoofSupplementRows: contract.denominator.successorApplicableRoofSupplementRows,
          pumpParameters: pump.parameters.length,
          pumpRows: pump.resources.length,
          searchCanonicalNamesNormalized: searchSnapshot.canonicalNamesNormalized,
          formulaDependencyDrift: audit.formulaParity.drift,
        },
        policy: contract.policy,
        audit,
        status: APPLY
          ? "GREEN_R4_A6_PROFESSIONAL_BOQ_PREPARED_NOT_ACTIVE"
          : "GREEN_R4_A6_PROFESSIONAL_BOQ_DRY_RUN_ROLLED_BACK",
        professionalBoqGateReady: true,
        productionReady: false,
      };
    }
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    atomicJson(OUTPUT, proof);
    process.stdout.write(`${JSON.stringify({
      output: OUTPUT,
      status: proof.status,
      idempotent: proof.idempotent,
      successor: proof.successor,
      changes: proof.changes,
      audit: proof.audit,
      professionalBoqGateReady: proof.professionalBoqGateReady,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
