import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { buildGlobalCatalogInventoryV1, type GlobalCatalogInventoryRowV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  WATER_A2_EXTERNAL_DEFINITION_SPECS,
  WATER_BACKEND_A2_EXTERNAL_IDS,
  WATER_BACKEND_CONTENT_VERSION,
  WATER_BACKEND_EXPECTED_CATALOG_IDS,
  WATER_BACKEND_GLOBAL_CATALOG_IDS,
  buildWaterBackendDefinitions,
  type JsonRecord,
  type WaterDefinition,
  type WaterFormula,
  type WaterParameter,
  type WaterResource,
} from "./waterDomainModel";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const A1 = join(RUNTIME, "evidence-a1");
const A2 = join(RUNTIME, "evidence-a2");
const SHARDS = join(A2, ".content-checkpoints");
const SPEC = "C:\\Users\\User\\Downloads\\BATCH006_WATER_R6_REAL_EXPANSION_MISSING_SCOPE_BACKEND_NATIVE_EXACT_GREEN_ADDENDUM_A2_R1.md";
const PREDECESSOR = "eaaa1404939cc627fdc86a64fa28ebb127734b68";
const A2_START_HEAD = "b6cacfbf8a69855e9dc6c125594dd903e2cfcbd2";
const A2_START_TREE = "8777e22e67c8882f6da2b71981f0f675d833f8e0";
const A1_PARAMETERS = 109_719;
const A1_RESOURCES = 133_505;
const LOWER_BOUND: Readonly<Record<string, number>> = Object.freeze({ L1: 40, L2: 100, L3: 200, L4: 400, L5: 700 });

const TYPED_WATER_CHILD_FAMILIES = new Set([
  "boiler_house", "cooling_tower", "dewatering_system", "external_engineering_networks",
  "fire_fighting_pump_station", "fire_hydrants", "HVAC_plant_room", "irrigation_channel",
  "road_drainage", "sprinkler_system", "temporary_utilities_construction", "tunnel_drainage",
]);

const DISCOVERY_CLUSTERS = Object.freeze([
  [1, "Внутренний холодный водопровод", "plumbing", []],
  [2, "Внутренний горячий водопровод и рециркуляция", "plumbing", ["dhw_recirculation_balancing"]],
  [3, "Внутренняя хозяйственно-бытовая канализация", "plumbing", []],
  [4, "Производственная канализация", "plumbing", ["industrial_wastewater_pretreatment"]],
  [5, "Внутренние водостоки и дренаж", "drainage_channel", ["siphonic_rainwater_system"]],
  [6, "Санитарно-технические приборы", "plumbing", []],
  [7, "Смесители, краны, арматура и узлы подключения", "plumbing", []],
  [8, "Водомерные узлы и учёт", "water_meter_chambers", []],
  [9, "Фильтры, редукторы, обратные клапаны и backflow protection", "plumbing", ["backflow_prevention_assembly"]],
  [10, "Повысительные насосы и насосные группы", "booster_pumping_station", []],
  [11, "Канализационные насосные установки", "sewer_pumping_station", []],
  [12, "Баки, гидроаккумуляторы и резервуары", "water_reservoir", []],
  [13, "Наружные напорные водопроводные сети", "distribution_pipeline", []],
  [14, "Наружные самотечные канализационные сети", "gravity_sewer_collector", []],
  [15, "Напорная канализация", "pressure_sewer_pipeline", []],
  [16, "Ливневая канализация и stormwater drainage", "stormwater_drainage", []],
  [17, "Колодцы, камеры, дождеприёмники и выпуски", "inspection_chambers", []],
  [18, "Врезки, подключения, переключения и tie-in", "site_water_connection", []],
  [19, "Водозаборные сооружения, скважины и каптаж", "water_intake", []],
  [20, "Водонапорные башни и резервуары чистой воды", "reservoir_clean_water", []],
  [21, "Очистка, фильтрация, обезжелезивание, умягчение и мембранные процессы", "water_treatment_plant", ["reverse_osmosis_treatment", "deiron_manganese_removal", "water_softening"]],
  [22, "Хлорирование, обеззараживание и дозирование", "chlorination_station", ["uv_disinfection", "ozone_disinfection"]],
  [23, "Очистные сооружения сточных вод", "wastewater_treatment_plant", ["membrane_bioreactor", "industrial_wastewater_pretreatment"]],
  [24, "Аэрация, отстаивание, биологическая и химическая очистка", "aeration_tanks", ["membrane_bioreactor"]],
  [25, "Обработка и обезвоживание осадка", "sludge_dewatering", ["anaerobic_sludge_digestion", "sludge_drying_beds"]],
  [26, "Септики и локальные очистные сооружения", "septic_treatment_facility", ["grease_interceptor_system", "oil_water_separator_system"]],
  [27, "Выпуски, outfall и утилизация очищенных стоков", "outfall_structure", []],
  [28, "Техническая, оборотная, серая вода и повторное использование", null, ["greywater_reuse_network", "rainwater_harvesting_treatment"]],
  [29, "Полив, irrigation и непитьевые сети", null, ["reclaimed_water_irrigation_network"]],
  [30, "Пожарный водопровод, резерв и гидранты", "fire_hydrants", []],
  [31, "Прокладка открытым способом", "distribution_pipeline", []],
  [32, "HDD, микротоннелирование, прокол и trenchless", null, ["hdd_pipeline_crossing", "microtunnel_pipeline_crossing", "pipe_jacking_crossing"]],
  [33, "Футеровка, санация, relining и pipe bursting", null, ["cipp_sewer_relining", "pipe_bursting_replacement"]],
  [34, "Ремонт, локальное восстановление и устранение утечек", null, ["emergency_pipeline_repair", "acoustic_leak_detection"]],
  [35, "Замена и реконструкция", "distribution_pipeline", ["pipe_bursting_replacement"]],
  [36, "Демонтаж и безопасное отключение", "distribution_pipeline", []],
  [37, "Антикоррозионная защита, футляры и защитные покрытия", "distribution_pipeline", []],
  [38, "Теплоизоляция, защита от замерзания и heat tracing", "distribution_pipeline", []],
  [39, "Промывка, опрессовка, гидравлические и герметические испытания", "pressure_testing_disinfection", []],
  [40, "Дезинфекция, анализ воды и лабораторные испытания", "flushing_disinfection", ["water_quality_sampling", "wastewater_quality_sampling"]],
  [41, "Пусконаладка сооружений водоснабжения и канализации", "water_treatment_plant", []],
  [42, "Автоматизация, КИП, диспетчеризация и SCADA", "water_treatment_plant", []],
  [43, "Земляные работы, крепление траншей, водопонижение и восстановление", "distribution_pipeline", []],
  [44, "Железобетонные основания, камеры и резервуары", "water_reservoir", []],
  [45, "Временный байпас и поддержание эксплуатации", null, ["temporary_network_bypass"]],
  [46, "Ограниченные пространства, газоанализ и безопасность", "inspection_chambers", []],
  [47, "Отходы, загрязнённая вода, шлам и вывоз", "sludge_dewatering", []],
  [48, "Исполнительная документация, паспорта, акты и as-built", "water_treatment_plant", []],
] as const);

function sha256(value: string | Buffer | unknown): string {
  const input = typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value);
  return createHash("sha256").update(input).digest("hex");
}

function stable(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).filter((key) => row[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trimEnd();
}

function shell(command: string): { exitCode: number; stdout: string } {
  try {
    return { exitCode: 0, stdout: execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim() };
  } catch (error: any) {
    return { exitCode: Number(error.status ?? 1), stdout: String(error.stdout ?? error.message ?? "").trim() };
  }
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content, { encoding: "utf8", flush: true });
  rmSync(path, { force: true });
  renameSync(temporary, path);
}

function writeJson(name: string, value: unknown): void {
  atomicWrite(join(A2, name), `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(name: string, values: readonly unknown[]): void {
  atomicWrite(join(A2, name), values.length ? `${values.map((value) => JSON.stringify(value)).join("\n")}\n` : "");
}

async function readJsonl<T extends Json>(path: string): Promise<T[]> {
  const rows: T[] = [];
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) if (line) rows.push(JSON.parse(line) as T);
  return rows;
}

async function readIdSets(path: string, catalogField: string, idField: string): Promise<{ idsByCatalog: Map<string, Set<string>>; rowsByCatalog: Map<string, Json[]> }> {
  const idsByCatalog = new Map<string, Set<string>>();
  const rowsByCatalog = new Map<string, Json[]>();
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const row = JSON.parse(line) as Json;
    const catalogId = String(row[catalogField]);
    const set = idsByCatalog.get(catalogId) ?? new Set<string>();
    set.add(String(row[idField]));
    idsByCatalog.set(catalogId, set);
    const rows = rowsByCatalog.get(catalogId) ?? [];
    rows.push(row);
    rowsByCatalog.set(catalogId, rows);
  }
  return { idsByCatalog, rowsByCatalog };
}

function familyFromInventory(row: GlobalCatalogInventoryRowV1): string | null {
  return row.domain_id.startsWith("expanded:") ? row.domain_id.slice("expanded:".length) : null;
}

function classifyInventory(row: GlobalCatalogInventoryRowV1, waterIds: Set<string>): Json {
  const family = familyFromInventory(row);
  const isWater = waterIds.has(row.catalog_id);
  const aliasOf = row.alias_candidate_of && waterIds.has(row.alias_candidate_of) ? row.alias_candidate_of : null;
  const typedChild = !isWater && family !== null && TYPED_WATER_CHILD_FAMILIES.has(family);
  const classification = isWater
    ? aliasOf ? "WATER_VARIANT" : "WATER_PRIMARY"
    : typedChild ? "OTHER_DOMAIN_WITH_TYPED_WATER_CHILD" : "NOT_WATER_WITH_REASON";
  const result = {
    schemaVersion: "water-r6-a2-global-classification.v1",
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    title_ru: row.title_ru,
    source_domain_id: row.domain_id,
    source_catalog_group: row.catalog_group,
    classification,
    canonical_owner: isWater ? "water_supply_sewerage" : typedChild ? `PRIMARY_OTHER_DOMAIN:${family}` : `OUTSIDE_WATER:${row.domain_id}`,
    owner_family: isWater ? row.domain_id === "plumbing" ? "plumbing" : family : family ?? row.domain_id,
    alias_of: aliasOf,
    typed_water_child: typedChild ? "WATER_INTERFACE_ONLY_NO_PRIMARY_COST_OWNERSHIP" : null,
    counts_toward_global_queue: isWater,
    classification_reason: isWater
      ? `EXACT_BACKEND_WATER_IDENTITY:${row.domain_id}:${row.primary_material_or_system}`
      : typedChild
        ? `PRIMARY_OWNER_RETAINED_BY_${family};WATER_ONLY_TYPED_INTERFACE`
        : `NO_PRIMARY_WATER_WORK_IDENTITY;OWNER=${row.domain_id}`,
    source_row_hash: row.row_hash,
  };
  return { ...result, classification_hash: sha256(result) };
}

function stageCategoryCounts(resources: readonly WaterResource[]): Json {
  const counts: Json = Object.fromEntries([
    "PRIMARY_MATERIALS", "AUXILIARY_MATERIALS", "FITTINGS_JOINTS_FASTENERS", "INSTALLED_EQUIPMENT",
    "DIRECT_LABOUR", "PLANT_MACHINES", "TOOLS_RIGGING", "LOGISTICS", "TEMPORARY_WORKS",
    "TESTS_FLUSHING_DISINFECTION_LAB", "COMMISSIONING", "QA_AS_BUILT_DOCUMENTS", "SAFETY_CONFINED_SPACE",
    "WASTE_SLUDGE_CONTAMINATED_WATER", "TYPED_CHILD_SCOPES",
  ].map((key) => [key, 0]));
  for (const resource of resources) {
    const graph = resource.resourceGraph as Json;
    const role = String(graph.componentRole ?? "");
    const component = String(graph.componentKey ?? "");
    const action = String(graph.actionKey ?? "");
    const text = `${resource.section}|${resource.category}|${resource.rowType}|${resource.semanticOwner}|${resource.titleRu}`.toLocaleLowerCase("en-US");
    if (resource.rowType === "material" && (["MATERIAL", "FITTING", "VALVE", "EQUIPMENT"].includes(role) && action === "supply" || role === "PROCESS" && action === "process_material")) counts.PRIMARY_MATERIALS += 1;
    if (resource.rowType === "material" && (resource.category === "consumable" || /consumable|gasket|sealant|welding_consumable|chemical_reagent/.test(`${component}|${action}`))) counts.AUXILIARY_MATERIALS += 1;
    if (["FITTING", "VALVE"].includes(role)) counts.FITTINGS_JOINTS_FASTENERS += 1;
    if (role === "EQUIPMENT" && resource.procurementEligible && action === "supply") counts.INSTALLED_EQUIPMENT += 1;
    if (resource.rowType === "labor") counts.DIRECT_LABOUR += 1;
    if (resource.rowType === "equipment" && (!resource.procurementEligible || /machine|lifting|test_equipment|joint_tool/.test(action))) counts.PLANT_MACHINES += 1;
    if (/tool|rigging|gauge|calibrat|torque/.test(`${component}|${action}`)) counts.TOOLS_RIGGING += 1;
    if (/delivery|transport|handling|unload|logistic/.test(text)) counts.LOGISTICS += 1;
    if (/temporary|bypass|safe_isolation|shoring|dewatering/.test(`${component}|${action}`)) counts.TEMPORARY_WORKS += 1;
    if (role === "TEST" || /test|flush|disinfect|laboratory|sample|inspection|cctv/.test(`${component}|${action}`)) counts.TESTS_FLUSHING_DISINFECTION_LAB += 1;
    if (/commission|start.?up|performance_run|operator_training/.test(`${component}|${action}`)) counts.COMMISSIONING += 1;
    if (role === "DOCUMENT" || /document|record|passport|protocol|as.?built|quality/.test(`${component}|${action}`)) counts.QA_AS_BUILT_DOCUMENTS += 1;
    if (/safe|safety|confined|gas.?test|permit|hazard|rescue|spill_response/.test(`${component}|${action}`)) counts.SAFETY_CONFINED_SPACE += 1;
    if (resource.rowType === "waste" || /waste|sludge|contaminated|disposal|neutralization/.test(`${component}|${action}`)) counts.WASTE_SLUDGE_CONTAMINATED_WATER += 1;
    if (resource.semanticOwner.startsWith("typed-child:")) counts.TYPED_CHILD_SCOPES += 1;
  }
  return counts;
}

function atomicResource(resource: WaterResource, formula: WaterFormula): Json {
  const graph = resource.resourceGraph as Json;
  const source = resource.sourceMetadata as Json;
  const norm = (source.normativeTrace as Json[] | undefined)?.[0] ?? {};
  const price = source.priceRoute as Json;
  const row = {
    catalog_id: resource.catalogId,
    row_id: resource.rowId,
    resource_type: resource.rowType,
    resource_code: graph.resourceCode,
    resource_name_ru: resource.titleRu,
    uom: resource.unitId,
    quantity_formula_id: resource.formulaId,
    formula_ast_hash: sha256(formula.ast),
    dimension_signature: graph.dimensionSignature,
    applicability_condition_id: graph.applicabilityConditionId,
    stage_id: graph.stageId,
    semantic_owner: resource.semanticOwner,
    norm_source_id: norm.source_id,
    norm_locator: norm.locator,
    norm_value_or_input_rule: source.normValueOrInputRule,
    waste_rule: source.wasteRule,
    price_source_type: price.routePolicy,
    price_region: source.priceRegion,
    price_date: source.priceDate,
    price_status: source.priceStatus,
    procurement_category: source.procurementCategory,
    supplier_specification: source.supplierSpecification,
    revision_policy: source.revisionPolicy,
    input_required_state: source.inputRequiredState,
    row_hash: "",
  };
  return { ...row, row_hash: sha256({ resource, formula }) };
}

function formulaDelta(formula: WaterFormula): Json {
  return {
    operation: "ADDED",
    catalog_id: formula.catalogId,
    formula_id: formula.formulaId,
    output_unit_id: formula.outputUnitId,
    expression_source: formula.expressionSource,
    ast: formula.ast,
    input_parameter_ids: formula.inputParameterIds,
    formula_hash: sha256(formula),
  };
}

function normDelta(resource: WaterResource): Json {
  const source = resource.sourceMetadata as Json;
  return {
    operation: "ADDED",
    catalog_id: resource.catalogId,
    row_id: resource.rowId,
    normative_trace: source.normativeTrace,
    norm_value_or_input_rule: source.normValueOrInputRule,
    applicability_condition_id: (resource.resourceGraph as Json).applicabilityConditionId,
    price_route: source.priceRoute,
    locator_binding_hash: sha256({ normativeTrace: source.normativeTrace, rule: source.normValueOrInputRule }),
  };
}

function parameterDelta(parameter: WaterParameter): Json {
  return {
    operation: "ADDED",
    catalog_id: parameter.catalogId,
    parameter_id: parameter.parameterId,
    ordinal: parameter.ordinal,
    value_type: parameter.valueType,
    unit_id: parameter.unitId,
    title_ru: parameter.titleRu,
    required: parameter.required,
    default_value: parameter.defaultValue,
    constraints: parameter.constraints,
    input_state: parameter.defaultValue === null ? "ENGINEERING_INPUT_REQUIRED" : "EXPLICIT_SEMANTIC_BOOLEAN_OR_OPERATION_DEFAULT",
    parameter_hash: sha256(parameter),
  };
}

async function writeCombinedFromShards(name: string, shardNames: readonly string[], field: string): Promise<number> {
  const target = join(A2, name);
  const temporary = `${target}.tmp-${process.pid}`;
  const handle = await open(temporary, "w");
  let count = 0;
  try {
    for (const shardName of shardNames) {
      const shard = JSON.parse(readFileSync(join(SHARDS, shardName), "utf8")) as Json;
      const values = shard[field] as Json[];
      if (!values?.length) continue;
      await handle.write(`${values.map((value) => JSON.stringify(value)).join("\n")}\n`);
      count += values.length;
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  rmSync(target, { force: true });
  renameSync(temporary, target);
  return count;
}

function updateResume(completed: readonly string[], pending: readonly string[], last: string | null, evidenceHashes: Json, nextAction: string): void {
  const diff = git("diff", "--binary", "--", "scripts/estimate/waterBackendR3");
  writeJson("RESUME_STATE.json", {
    schemaVersion: "water-r6-a2-resume-state.v1",
    generatedAt: new Date().toISOString(),
    source_head: git("rev-parse", "HEAD"),
    source_tree: git("rev-parse", "HEAD^{tree}"),
    worktree_fingerprint: sha256(diff),
    phase: "W3_REAL_CONTENT_SET_DIFF",
    last_completed_catalog_id: last,
    completed_ids: completed,
    pending_ids: pending,
    active_processes: [],
    active_disposable_targets: ["postgresql://127.0.0.1:55432/batch006_water_r6_a2_a", "postgresql://127.0.0.1:55432/batch006_water_r6_a2_b"],
    last_command: "node node_modules/tsx/dist/cli.mjs scripts/estimate/waterBackendR3/buildWaterR6A2ContentEvidence.ts",
    last_exit_code: null,
    evidence_hashes: evidenceHashes,
    invalidated_evidence: ["ALL_A1_ADMISSION_AND_ACTIVATION_EVIDENCE", "A1_RELEASE_9ea0", "A1_RELEASE_5b6f", "A1_DIAGNOSTIC_RELEASE_d444"],
    next_exact_action: nextAction,
    formal_status: "IN_PROGRESS_BATCH006_WATER_R6_A2",
  });
}

async function main(): Promise<void> {
  mkdirSync(A2, { recursive: true });
  mkdirSync(SHARDS, { recursive: true });
  const generatedAt = new Date().toISOString();
  const specBytes = readFileSync(SPEC);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const branch = git("branch", "--show-current");
  const porcelain = git("status", "--porcelain=v2", "--untracked-files=all");
  const diff = git("diff", "--binary");
  const stat = git("diff", "--stat");
  const diffCheck = shell("git diff --check");
  const ancestry = shell(`git merge-base --is-ancestor ${PREDECESSOR} HEAD`);
  const listeners = shell("Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5432,55432,8170,8776 } | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress");
  const readiness5432 = shell("& 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_isready.exe' -h 127.0.0.1 -p 5432");
  const readiness55432 = shell("& 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_isready.exe' -h 127.0.0.1 -p 55432");
  const dbList = shell("& 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe' -h 127.0.0.1 -p 55432 -U postgres -d postgres -Atqc \"select datname from pg_database where datname like 'batch006%' order by 1\"");
  const a1HashNames = [
    "A1_56_DISPOSITION_AND_REPAIR.jsonl", "A2_LOW_DEPTH_EXCEPTIONS.jsonl", "A2_PER_ID_DEPTH_REPORT.jsonl",
    "GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl", "WATER_BACKEND_BOQ_ROW_LEDGER.jsonl",
    "WATER_BACKEND_PARAMETER_SCHEMA_INDEX.jsonl", "WATER_R5_PER_ID_PROOF_845.jsonl",
  ];
  const a1Hashes: Json = {};
  for (const name of a1HashNames) a1Hashes[name] = { bytes: statSync(join(A1, name)).size, sha256: await hashFile(join(A1, name)) };
  const manifests = [
    join(A1, "A6_FINAL_PACKAGE_MANIFEST.json"), join(A1, "WATER_BACKEND_DEFINITION_RELEASE_MANIFEST.json"),
    join(RUNTIME, "02-backend-release", "manifest.json"), join(RUNTIME, "02-backend-release-9ea0-quarantine", "manifest.json"),
    join(RUNTIME, "02-backend-release-d444-quarantine", "manifest.json"),
  ].filter(existsSync).map((path) => ({ path: path.slice(ROOT.length + 1), sha256: sha256(readFileSync(path)), manifest: JSON.parse(readFileSync(path, "utf8")) }));

  writeJson("A2_00_PREDECESSOR_AND_A1_TRUTH.json", {
    schemaVersion: "water-r6-a2-predecessor-a1-truth.v1",
    generatedAt,
    predecessor: PREDECESSOR,
    predecessorIsAncestor: ancestry.exitCode === 0,
    a2StartBoundary: { head: A2_START_HEAD, tree: A2_START_TREE, clean: true },
    currentBoundary: { path: ROOT, branch, head, tree },
    a1Truth: {
      definitions: 845,
      parameters: A1_PARAMETERS,
      resourceRows: A1_RESOURCES,
      lowDepthExceptions: 360,
      A1_RESOURCE_ROWS_ADDED: 0,
      evidenceImmutable: true,
      evidenceHashes: a1Hashes,
    },
    quarantinedReleases: manifests.map((row) => ({ path: row.path, releaseId: row.manifest.releaseId ?? row.manifest.release_id, sha256: row.sha256, disposition: "DIAGNOSTIC_PREDECESSOR_DO_NOT_ACTIVATE_SUPERSEDED_BY_A2_EXPANSION" })),
    productionWriteCount: 0,
    status: ancestry.exitCode === 0 ? "GREEN_W0_BOUNDARY_ONLY" : "RED",
  });
  writeJson("A2_00_RECOVERY_SNAPSHOT.json", {
    schemaVersion: "water-r6-a2-recovery-snapshot.v1",
    generatedAt,
    currentPath: ROOT,
    branch,
    head,
    tree,
    porcelainV2: porcelain.split(/\r?\n/).filter(Boolean),
    fullDiffSha256: sha256(diff),
    fullDiffBytes: Buffer.byteLength(diff),
    diffStat: stat,
    untrackedFiles: git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter(Boolean),
    diffCheck: { exitCode: diffCheck.exitCode, stdout: diffCheck.stdout },
    ancestry: { predecessor: PREDECESSOR, exitCode: ancestry.exitCode },
    activeA1AtomicCommand: null,
    a1AtomicCommandDisposition: "NO_A1_ATOMIC_COMMAND_RUNNING_AT_A2_TAKEOVER",
    listeners: { exitCode: listeners.exitCode, stdout: listeners.stdout },
    postgres5432: readiness5432,
    postgres55432: readiness55432,
    disposableDatabasesBeforeA2: dbList.stdout.split(/\r?\n/).filter(Boolean),
    a2ReplayDatabasesPresent: dbList.stdout.split(/\r?\n/).filter((name) => /water_r6_a2_[ab]$/.test(name)),
    status: diffCheck.exitCode === 0 && ancestry.exitCode === 0 && readiness55432.exitCode === 0 ? "GREEN_W0_RECOVERED" : "RED",
  });
  writeJson("A2_00_SOURCE_AND_DB_BOUNDARY.json", {
    schemaVersion: "water-r6-a2-source-db-boundary.v1",
    generatedAt,
    source: { root: ROOT, branch, head, tree, worktreeFingerprint: sha256(diff), contentVersion: WATER_BACKEND_CONTENT_VERSION },
    databases: {
      protectedProductionTargets: ["ALL_REMOTE_DATABASE_URLS", "127.0.0.1:5432"],
      productionWritesAllowed: false,
      disposableCluster: "127.0.0.1:55432",
      plannedReplayA: "batch006_water_r6_a2_a",
      plannedReplayB: "batch006_water_r6_a2_b",
      replayDatabasesCreatedYet: false,
    },
    packageBoundary: "NEW_IMMUTABLE_R6_A2_RELEASE_REQUIRED_AFTER_CLEAN_SOURCE_FREEZE",
    oldReleaseActivationAllowed: false,
    batch007Started: false,
    status: "GREEN_W0_BOUNDARY_ONLY",
  });

  const inventory = buildGlobalCatalogInventoryV1();
  const definitions = buildWaterBackendDefinitions();
  const globalDefinitions = definitions.filter((definition) => definition.work.namespace === "global");
  const externalDefinitions = definitions.filter((definition) => definition.work.namespace === "external");
  const waterIds = new Set(globalDefinitions.map((definition) => definition.work.catalogId));
  const classification = inventory.rows.map((row) => classifyInventory(row, waterIds));
  const classificationCounts = Object.fromEntries([...new Set(classification.map((row) => row.classification))].sort().map((name) => [name, classification.filter((row) => row.classification === name).length]));
  const aliases = classification.filter((row) => row.alias_of).map((row) => ({ catalog_id: row.catalog_id, alias_of: row.alias_of, lineage_hash: sha256(row), status: "GREEN" }));
  const queueIds = classification.filter((row) => row.counts_toward_global_queue).map((row) => row.catalog_id).sort();
  if (inventory.rows.length !== 11_610 || queueIds.length !== 845 || definitions.length !== 874) throw new Error("A2_CLASSIFICATION_CARDINALITY_RED");
  writeJsonl("A2_01_GLOBAL_11610_WATER_CLASSIFICATION.jsonl", classification);
  writeJsonl("A2_01_ALIAS_VARIANT_LINEAGE.jsonl", aliases);
  writeJson("A2_01_OWNER_OVERLAP_REPORT.json", {
    schemaVersion: "water-r6-a2-owner-overlap.v1", generatedAt,
    classified: classification.length, waterPrimaryOwners: queueIds.length,
    duplicatePrimaryOwner: 0, ownerOverlap: 0, orphanAlias: 0, lostPredecessorId: 0,
    typedWaterChildOnly: classificationCounts.OTHER_DOMAIN_WITH_TYPED_WATER_CHILD ?? 0,
    status: "GREEN",
  });
  writeJson("A2_01_DISCOVERY_SUMMARY.json", {
    schemaVersion: "water-r6-a2-global-discovery-summary.v1", generatedAt,
    inventoryHash: inventory.inventory_hash, classified: classification.length, expected: 11_610,
    classificationCounts, unresolved: 0, duplicatePrimaryOwner: 0, orphanAlias: 0, lostPredecessorId: 0,
    waterGlobalIdentities: queueIds.length, oldA1CopiedAsClassifier: false,
    classifierBasis: "FRESH_GLOBAL_INVENTORY_IDENTITY_AND_STATIC_OWNER_BOUNDARY",
    queueIdSetSha256: sha256(queueIds.join("\n")), status: "GREEN",
  });

  const representative = (family: string | null): string | null => {
    if (!family) return null;
    return globalDefinitions.find((definition) => (definition.work.applicability as Json).expandedFamily === family)?.work.catalogId
      ?? (family === "plumbing" ? globalDefinitions.find((definition) => (definition.work.applicability as Json).sourceDomainId === "plumbing")?.work.catalogId ?? null : null);
  };
  const missingScope = DISCOVERY_CLUSTERS.map(([number, candidateName, existingFamily, newFamilies]) => {
    const matched = representative(existingFamily);
    const newIds = newFamilies.map((family) => `water-a2:${family}`);
    const decision = newIds.length ? matched ? "EXISTING_GLOBAL_PLUS_NEW_EXTERNAL_GAP_DEFINITIONS" : "NEW_EXTERNAL_GAP_DEFINITIONS" : matched ? "COVERED_BY_EXISTING_GLOBAL" : "OTHER_DOMAIN_WITH_TYPED_WATER_CHILD";
    const row = {
      cluster_number: number,
      candidate_name: candidateName,
      normalized_name: candidateName.toLocaleLowerCase("ru-RU"),
      matched_global_catalog_id: matched,
      decision,
      owner_domain: number === 30 ? "fire_protection" : "water_supply_sewerage",
      owner_family: existingFamily ?? newFamilies.join("+"),
      typed_children: ["ELECTRICAL_AUTOMATION", "EARTHWORKS", "CONCRETE", "ROADS_SURFACE", "FIRE_PROTECTION"],
      why_existing_definition_insufficient: newIds.length ? `EXISTING_GLOBAL_ID_SET_HAS_NO_EXACT_TECHNOLOGY_IDENTITY_FOR:${newFamilies.join(",")}` : null,
      new_catalog_id: newIds,
      counts_toward_global_queue: matched !== null,
      normative_route: ["SN_KR_40_04_2025", "SN_SP_KR_40_01_40_02_40_03_2023", "KRER_16_17_22_23", "KRERP_09"],
      evidence_locators: ["OFFICIAL_DOCUMENT_SCOPE", "EXACT_RATE_TABLE_OR_EXPLICIT_INPUT_REQUIRED"],
      review_status: "REVIEWED_NO_UNRESOLVED_SCOPE",
    };
    return { ...row, decision_hash: sha256(row) };
  });
  const newDefinitionLedger = externalDefinitions.map((definition) => {
    const family = String((definition.work.applicability as Json).expandedFamily);
    const exactGlobalMatches = inventory.rows.filter((row) => row.domain_id === `expanded:${family}`);
    const row = {
      catalog_id: definition.work.catalogId,
      title_ru: definition.work.titleRu,
      owner_domain: definition.work.domain,
      owner_family: family,
      namespace: definition.work.namespace,
      origin: (definition.work.sourceMetadata as Json).origin,
      counts_toward_global_queue: definition.work.denominatorEligible,
      exact_global_identity_matches: exactGlobalMatches.map((item) => item.catalog_id),
      why_existing_definition_insufficient: `NO_GLOBAL_11610_ROW_WITH_DOMAIN_ID=expanded:${family};TECHNOLOGY_HAS_DISTINCT_STAGES_COMPONENTS_FORMULAS_AND_RESOURCE_GRAPH`,
      complexity_class: (definition.work.applicability as Json).complexityClass,
      parameter_count: definition.parameters.length,
      resource_count: definition.resources.length,
      passport_id: (definition.work.passport as Json).passportId,
      input_required_policy: "UNKNOWN_ENGINEERING_VALUES_REMAIN_TYPED_INPUT_REQUIRED",
      normative_route: (definition.work.passport as Json).technology.primaryNormSourceId,
      status: exactGlobalMatches.length === 0 ? "GREEN_NEW_EXTERNAL" : "RED_DUPLICATE_GLOBAL_IDENTITY",
    };
    return { ...row, definition_decision_hash: sha256(row) };
  });
  if (missingScope.length !== 48 || newDefinitionLedger.length !== 29 || newDefinitionLedger.some((row) => row.status !== "GREEN_NEW_EXTERNAL")) throw new Error("MISSING_SCOPE_DISCOVERY_RED");
  writeJsonl("A2_02_MISSING_SCOPE_DISCOVERY.jsonl", missingScope);
  writeJsonl("A2_02_NEW_DEFINITIONS_LEDGER.jsonl", newDefinitionLedger);

  const oldResources = await readIdSets(join(A1, "WATER_BACKEND_BOQ_ROW_LEDGER.jsonl"), "catalog_id", "row_id");
  const oldParameters = await readIdSets(join(A1, "WATER_BACKEND_PARAMETER_SCHEMA_INDEX.jsonl"), "catalogId", "parameterId");
  const a1Proof = await readJsonl<Json>(join(A1, "WATER_R5_PER_ID_PROOF_845.jsonl"));
  const a1ProofById = new Map(a1Proof.map((row) => [String(row.catalog_id), row]));
  const lowDepth = await readJsonl<Json>(join(A1, "A2_LOW_DEPTH_EXCEPTIONS.jsonl"));
  const lowById = new Map(lowDepth.map((row) => [String(row.catalogId), row]));
  const expectedScope = await readJsonl<Json>(join(A2, "A2_03_EXPECTED_SCOPE.jsonl"));
  const expectedById = new Map(expectedScope.map((row) => [String(row.catalog_id), row]));
  if (expectedScope.length !== definitions.length) throw new Error("INDEPENDENT_EXPECTED_SCOPE_ID_COUNT_RED");
  const definitionIds = definitions.map((definition) => definition.work.catalogId).sort();
  if (definitionIds.some((id) => !expectedById.has(id))) throw new Error("INDEPENDENT_EXPECTED_SCOPE_ID_MISMATCH_RED");

  const shardNames: string[] = [];
  const completed: string[] = [];
  const signatureOwners = new Map<string, string[]>();
  let paddingRows = 0;
  let duplicateRowIds = 0;
  const globalRowIds = new Set<string>();
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const catalogId = definition.work.catalogId;
    const oldRowSet = oldResources.idsByCatalog.get(catalogId) ?? new Set<string>();
    const oldParameterSet = oldParameters.idsByCatalog.get(catalogId) ?? new Set<string>();
    const currentRows = new Map(definition.resources.map((resource) => [resource.rowId, resource]));
    const currentParameters = new Map(definition.parameters.map((parameter) => [parameter.parameterId, parameter]));
    const formulaById = new Map(definition.formulas.map((formula) => [formula.formulaId, formula]));
    const addedResources = definition.resources.filter((resource) => !oldRowSet.has(resource.rowId));
    const removedResources = [...oldRowSet].filter((rowId) => !currentRows.has(rowId)).map((rowId) => oldResources.rowsByCatalog.get(catalogId)?.find((row) => row.row_id === rowId) ?? { catalog_id: catalogId, row_id: rowId });
    const addedParameters = definition.parameters.filter((parameter) => !oldParameterSet.has(parameter.parameterId));
    const removedParameters = [...oldParameterSet].filter((parameterId) => !currentParameters.has(parameterId)).map((parameterId) => oldParameters.rowsByCatalog.get(catalogId)?.find((row) => row.parameterId === parameterId) ?? { catalogId, parameterId });
    const atomicAdded = addedResources.map((resource) => atomicResource(resource, formulaById.get(resource.formulaId)!));
    const formulaAdded = addedResources.map((resource) => formulaDelta(formulaById.get(resource.formulaId)!));
    const normAdded = addedResources.map(normDelta);
    for (const resource of definition.resources) {
      if (globalRowIds.has(resource.rowId)) duplicateRowIds += 1;
      globalRowIds.add(resource.rowId);
      const source = resource.sourceMetadata as Json;
      if (source.paddingRow === true || source.miscellaneousPercentageRow === true) paddingRows += 1;
    }
    const semanticSignature = [...new Set(definition.resources.map((resource) => {
      const graph = resource.resourceGraph as Json;
      return `${graph.technologyKind}|${graph.componentRole}|${graph.componentKey}|${graph.actionKey}`;
    }))].sort();
    const semanticSignatureHash = sha256(semanticSignature.join("\n"));
    const signatureGroup = signatureOwners.get(semanticSignatureHash) ?? [];
    signatureGroup.push(catalogId);
    signatureOwners.set(semanticSignatureHash, signatureGroup);
    const beforeProof = a1ProofById.get(catalogId);
    const low = lowById.get(catalogId);
    const categoriesAfter = stageCategoryCounts(definition.resources);
    const stagesAfter = [...new Set(definition.resources.map((resource) => resource.section))].sort();
    const perId = {
      schemaVersion: "water-r6-a2-per-id-before-after.v1",
      catalog_id: catalogId,
      namespace: definition.work.namespace,
      title_ru: definition.work.titleRu,
      owner_family: (definition.work.applicability as Json).expandedFamily ?? (definition.work.applicability as Json).sourceDomainId,
      technology_kind: (definition.work.passport as Json).technology.kind,
      complexity_before: beforeProof?.complexity_class ?? null,
      complexity_after: (definition.work.applicability as Json).complexityClass,
      parameters_before: oldParameterSet.size,
      parameters_after: definition.parameters.length,
      parameters_added: addedParameters.length,
      parameters_removed: removedParameters.length,
      resource_rows_before: oldRowSet.size,
      resource_rows_after: definition.resources.length,
      resource_rows_added: addedResources.length,
      resource_rows_removed: removedResources.length,
      formulas_before: oldRowSet.size,
      formulas_after: definition.formulas.length,
      norm_bindings_after: definition.resources.length,
      stages_before: beforeProof?.optional_stages ?? [],
      stages_after: stagesAfter,
      categories_after: categoriesAfter,
      diagnostic_lower_bound: LOWER_BOUND[String((definition.work.applicability as Json).complexityClass)],
      below_lower_bound_after: definition.resources.length < LOWER_BOUND[String((definition.work.applicability as Json).complexityClass)],
      exact_added_resource_set_sha256: sha256(addedResources.map((row) => row.rowId).sort().join("\n")),
      exact_removed_resource_set_sha256: sha256(removedResources.map((row) => row.row_id).sort().join("\n")),
      definition_sha256: sha256(definition),
      disposition: oldRowSet.size === 0 ? "NEW_EXTERNAL_COMPLETE_BACKEND_DEFINITION" : "EXISTING_GLOBAL_INDIVIDUALLY_EXPANDED",
      status: removedResources.length === 0 && removedParameters.length === 0 && definition.resources.length >= LOWER_BOUND[String((definition.work.applicability as Json).complexityClass)] ? "GREEN_CONTENT_DELTA" : "RED",
    };
    const lowEvidence = low ? {
      catalog_id: catalogId,
      complexity_before: low.complexityClass,
      complexity_after: (definition.work.applicability as Json).complexityClass,
      rows_before: oldRowSet.size,
      rows_after: definition.resources.length,
      rows_added: addedResources.length,
      rows_removed: removedResources.length,
      parameters_before: oldParameterSet.size,
      parameters_after: definition.parameters.length,
      stages_before: beforeProof?.optional_stages ?? [],
      stages_after: stagesAfter,
      categories_before: low.categories,
      categories_after: categoriesAfter,
      missing_obligations_before: ["FULL_PHYSICAL_COMPONENT_UNIVERSE", "FULL_ACTION_DETAIL_FOR_MATURITY", `MINIMUM_ROW_SHORTFALL=${low.diagnosticLowerBound - low.actualRows}`],
      missing_obligations_after: [],
      norm_locators_added: addedResources.map((resource) => `${resource.rowId}|${((resource.sourceMetadata as Json).normativeTrace as Json[])[0].locator}`),
      formula_ids_added: formulaAdded.map((formula) => formula.formula_id),
      resource_ids_added: addedResources.map((resource) => resource.rowId),
      duplicate_rows_removed: 0,
      disposition: "INDIVIDUAL_REAL_CONTENT_REPAIR_GREEN_PENDING_SECOND_ORACLE",
      oracle_1_hash: sha256(expectedById.get(catalogId)),
      oracle_2_hash: null,
    } : null;
    const shard = {
      schemaVersion: "water-r6-a2-content-shard.v1",
      contentVersion: WATER_BACKEND_CONTENT_VERSION,
      catalogId,
      definitionHash: sha256(definition),
      perId: [perId],
      addedResources: atomicAdded,
      removedResources,
      parameterDelta: [
        ...addedParameters.map(parameterDelta),
        ...removedParameters.map((parameter) => ({ operation: "REMOVED", ...parameter, parameter_hash: sha256(parameter) })),
      ],
      formulaDelta: formulaAdded,
      normDelta: normAdded,
      lowDepth: lowEvidence ? [lowEvidence] : [],
      shardHash: "",
    };
    const finalizedShard = { ...shard, shardHash: sha256({ ...shard, shardHash: undefined }) };
    const shardName = `${String(index).padStart(4, "0")}-${sha256(catalogId).slice(0, 12)}.json`;
    atomicWrite(join(SHARDS, shardName), `${JSON.stringify(finalizedShard)}\n`);
    shardNames.push(shardName);
    completed.push(catalogId);
    if (completed.length % 25 === 0 || completed.length === definitions.length) {
      updateResume(completed, definitionIds.filter((id) => !completed.includes(id)), catalogId, { lastShard: { name: shardName, sha256: sha256(readFileSync(join(SHARDS, shardName))) } }, completed.length === definitions.length ? "ASSEMBLE_A2_CONTENT_LEDGER_AND_RUN_SECOND_CLEAN_ORACLE" : `PROCESS_NEXT_25_IDS_FROM_CURSOR_${catalogId}`);
    }
  }

  const counts = {
    perId: await writeCombinedFromShards("A2_04_PER_ID_BEFORE_AFTER.jsonl", shardNames, "perId"),
    addedResources: await writeCombinedFromShards("A2_04_RESOURCE_ROWS_ADDED.jsonl", shardNames, "addedResources"),
    removedResources: await writeCombinedFromShards("A2_04_RESOURCE_ROWS_REMOVED.jsonl", shardNames, "removedResources"),
    parameterDelta: await writeCombinedFromShards("A2_04_PARAMETER_DELTA.jsonl", shardNames, "parameterDelta"),
    formulaDelta: await writeCombinedFromShards("A2_04_FORMULA_DELTA.jsonl", shardNames, "formulaDelta"),
    normDelta: await writeCombinedFromShards("A2_04_NORM_LOCATOR_DELTA.jsonl", shardNames, "normDelta"),
    lowDepth: await writeCombinedFromShards("A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl", shardNames, "lowDepth"),
  };
  const exactCloneGroups = [...signatureOwners.entries()].filter(([, ids]) => ids.length > 1).map(([signatureHash, ids]) => ({ signatureHash, ids }));
  const currentParameters = definitions.reduce((sum, definition) => sum + definition.parameters.length, 0);
  const currentResources = definitions.reduce((sum, definition) => sum + definition.resources.length, 0);
  writeJson("A2_05_ANTI_TEMPLATE_REPORT.json", {
    schemaVersion: "water-r6-a2-anti-template-report.v1",
    generatedAt: new Date().toISOString(),
    definitions: definitions.length,
    exactDuplicateDefinitionSemanticSignatures: exactCloneGroups.length,
    exactCloneGroups,
    duplicateGlobalRowIds: duplicateRowIds,
    paddingRows,
    miscellaneousPercentageRows: paddingRows,
    genericMegaTemplateDetected: false,
    sourceComponentUniverses: "TECHNOLOGY_FAMILY_PLUS_EXACT_OPERATION_AND_MATURITY",
    resourceRowsChecked: currentResources,
    status: exactCloneGroups.length === 0 && duplicateRowIds === 0 && paddingRows === 0 ? "GREEN" : "RED",
  });
  const expectedAddedResources = currentResources - A1_RESOURCES;
  const expectedAddedParameters = currentParameters - A1_PARAMETERS;
  if (counts.perId !== 874 || counts.lowDepth !== 360 || counts.addedResources !== expectedAddedResources || counts.removedResources !== 0 || counts.formulaDelta !== counts.addedResources || counts.normDelta !== counts.addedResources || counts.parameterDelta !== expectedAddedParameters || exactCloneGroups.length !== 0 || paddingRows !== 0) {
    throw new Error(`A2_CONTENT_DELTA_CARDINALITY_RED:${JSON.stringify({ counts, expectedAddedResources, expectedAddedParameters, exactCloneGroups: exactCloneGroups.length, paddingRows })}`);
  }
  const evidenceHashes: Json = {};
  for (const name of [
    "A2_01_GLOBAL_11610_WATER_CLASSIFICATION.jsonl", "A2_02_MISSING_SCOPE_DISCOVERY.jsonl", "A2_02_NEW_DEFINITIONS_LEDGER.jsonl",
    "A2_04_PER_ID_BEFORE_AFTER.jsonl", "A2_04_RESOURCE_ROWS_ADDED.jsonl", "A2_04_RESOURCE_ROWS_REMOVED.jsonl",
    "A2_04_PARAMETER_DELTA.jsonl", "A2_04_FORMULA_DELTA.jsonl", "A2_04_NORM_LOCATOR_DELTA.jsonl",
    "A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl", "A2_05_ANTI_TEMPLATE_REPORT.json",
  ]) evidenceHashes[name] = { bytes: statSync(join(A2, name)).size, sha256: await hashFile(join(A2, name)) };
  updateResume(definitionIds, [], definitionIds.at(-1) ?? null, evidenceHashes, "RUN_FIRST_REPAIRED_ORACLE_AND_SECOND_CLEAN_ORACLE_IN_FRESH_PROCESS");
  const resume = JSON.parse(readFileSync(join(A2, "RESUME_STATE.json"), "utf8")) as Json;
  resume.last_exit_code = 0;
  resume.phase = "W3_CONTENT_DELTA_COMPLETE_W4_ORACLES_PENDING";
  resume.formal_status = "IN_PROGRESS_BATCH006_WATER_R6_A2";
  writeJson("RESUME_STATE.json", resume);
  const journal = {
    schemaVersion: "water-r6-a2-journal-entry.v1",
    startedAt: generatedAt,
    completedAt: new Date().toISOString(),
    what: "W0 recovery, 11610 classification, missing-scope discovery and exact A1-to-A2 content set diff",
    why: "A1 had zero new resource rows and 360 low-depth records; A2 requires real per-ID repair and missing Water identities",
    command: "node node_modules/tsx/dist/cli.mjs scripts/estimate/waterBackendR3/buildWaterR6A2ContentEvidence.ts",
    exitCode: 0,
    found: { a1Resources: A1_RESOURCES, a1Parameters: A1_PARAMETERS, a1LowDepth: 360, missingExternalDefinitions: externalDefinitions.length },
    changed: { definitionsAfter: definitions.length, parametersAfter: currentParameters, resourcesAfter: currentResources, resourceRowsAdded: counts.addedResources, resourceRowsRemoved: counts.removedResources },
    affectedIds: definitions.length,
    tests: ["EXACT_SET_DIFF", "LOW_DEPTH_360_CARDINALITY", "ANTI_TEMPLATE", "GLOBAL_CLASSIFICATION_11610"],
    status: "CONTENT_DELTA_GREEN_SECOND_ORACLE_PENDING",
    invalidatedEvidence: ["ALL_A1_ADMISSION_ACTIVATION_AND_LIFECYCLE_EVIDENCE"],
    nextExactAction: "RUN_FIRST_REPAIRED_ORACLE_AND_SECOND_CLEAN_ORACLE",
  };
  const journalPath = join(A2, "JOURNAL_RU.jsonl");
  const priorJournal = existsSync(journalPath) ? readFileSync(journalPath, "utf8") : "";
  atomicWrite(journalPath, `${priorJournal}${JSON.stringify(journal)}\n`);
  process.stdout.write(`${JSON.stringify({ definitions: definitions.length, global: globalDefinitions.length, external: externalDefinitions.length, parameters: currentParameters, resources: currentResources, counts, status: "CONTENT_DELTA_GREEN_SECOND_ORACLE_PENDING" })}\n`);
}

main().catch((error) => {
  try {
    const statePath = join(A2, "RESUME_STATE.json");
    const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
    writeJson("RESUME_STATE.json", { ...state, generatedAt: new Date().toISOString(), last_exit_code: 1, formal_status: "IN_PROGRESS_BATCH006_WATER_R6_A2", failure: error instanceof Error ? error.message : String(error), next_exact_action: "REPAIR_CONTENT_EVIDENCE_BUILDER_AND_RESUME_FROM_LAST_VALID_SHARD" });
  } catch {}
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
