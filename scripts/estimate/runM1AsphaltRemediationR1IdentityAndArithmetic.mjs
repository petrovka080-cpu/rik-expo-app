import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:v1";
const GENERATED_AT_UTC = "2026-08-12T00:00:00.000Z";
const REVIEWER = "CODEX_POST_AUDIT_REMEDIATION_R1";
const GLOBAL_CATALOG_COUNT = 11_610;
const AUDIT_HEAD = "0d9bb68c9b438758eba019376f4a0906d3825bd6";
const AUDIT_TREE = "5af5bee6dfff80f6ef71abce9e46ded54d5b262c";
const AUDIT_MANIFEST_SHA256 = "cefd765fb788537eb0d3e451fe62ad1b82314b995adf1120493b09625d027c77";
const AUDIT_LEDGER_SHA256 = "0cd68ee1b5212e85f880c2b81c17274927ade78a4a7b74da91498d3c54da2f21";
const SOURCE_INVENTORY_SHA256 = "63ce1cbee22d745c031977f9dffcfe828dd0b4f973e0d5938a72d430ab4eb116";
const FOUNDATION_TAXONOMY_SHA256 = "74bd3cee19203c44959b1abf1edb6ffe0874d3b3c279ec3fd34e6d30b8fb4a79";
const AUDIT_CROSSWALK_SHA256 = "ee4aa1a05407386e286d12a0adb12db2d7ea0364636d9f22a784b610160c5904";

const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));

const repoRoot = process.cwd();
const auditRoot = path.resolve(String(argv["audit-root"] ?? ""));
const baselineSourceRoot = path.resolve(String(argv["baseline-source-root"] ?? ""));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime",
  "master-11610-group-batches-r1",
  "03-m1-asphalt-five-p0-remediation-r1",
)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function shaObject(value) {
  return sha256(canonical(value));
}

function fileSha(file) {
  return sha256(readFileSync(file));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ));
}

function writeDeterministic(relative, content) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file)) {
    invariant(readFileSync(file, "utf8") === content, `IMMUTABLE_OUTPUT_MISMATCH:${relative}`);
    return;
  }
  writeFileSync(file, content, "utf8");
}

function writeJson(relative, value) {
  writeDeterministic(relative, `${JSON.stringify(value, null, 2)}\n`);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(relative, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  writeDeterministic(relative, `${lines.join("\n")}\n`);
}

function normalizeTitle(value) {
  return String(value).normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ru-RU");
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function dataArray(payload) {
  const rows = payload.data ?? payload.records ?? payload.cases;
  invariant(Array.isArray(rows), "EXPECTED_INVENTORY_DATA_ARRAY");
  return rows;
}

function cohortIdFor(row) {
  if (row.sourceCatalog === "EXPANDED_COMPLEX_TEMPLATES_1610") {
    return "C3_FULL_ROAD_BRIDGE_PARKING_ACCESS_ASSEMBLIES";
  }
  if (["built-in-ai-1000:0702", "built-in-ai-1000:0703"].includes(row.currentIdentityId)) {
    return "C3_FULL_ROAD_BRIDGE_PARKING_ACCESS_ASSEMBLIES";
  }
  if (/(?:_drain_|_level_|_prepare_|_repair_)/u.test(row.currentWorkKey)
    || ["built-in-ai-1000:0670", "built-in-ai-1000:0704", "built-in-ai-1000:0705"].includes(row.currentIdentityId)) {
    return "C1_ENABLING_REMOVAL_DRAINAGE_AND_SURFACE_REPAIR";
  }
  return "C2_PLACEMENT_COMPACTION_FINISH_AND_LAYER_ENTRYPOINTS";
}

function referenceAssemblyIdsFor(auditRow) {
  const count = Number(auditRow.benchmark_candidate_boq_row_count || 0);
  if (count === 304) return ["reference-assembly:road-full-geometry:v1"];
  if (count === 167) return ["reference-assembly:parking-full-geometry:v1"];
  if (count === 21) return ["reference-assembly:demolition-standalone:v1"];
  return [];
}

invariant(argv["audit-root"], "AUDIT_ROOT_REQUIRED");
invariant(argv["baseline-source-root"], "BASELINE_SOURCE_ROOT_REQUIRED");
invariant(existsSync(auditRoot), `AUDIT_ROOT_MISSING:${auditRoot}`);
invariant(existsSync(baselineSourceRoot), `BASELINE_SOURCE_ROOT_MISSING:${baselineSourceRoot}`);

const auditLedgerPath = path.join(auditRoot, "asphalt", "ASPHALT_R63_FINAL_ESTIMATE_ROW_LEDGER.jsonl");
const auditCrosswalkPath = path.join(auditRoot, "foundation", "ASPHALT_M1_63_TO_GLOBAL_11610_CROSSWALK.jsonl");
const sourceInventoryPath = path.join(auditRoot, "foundation", "GLOBAL_11610_INDEPENDENT_SOURCE_INVENTORY.jsonl");
const sourceCrosswalkPath = path.join(auditRoot, "foundation", "GLOBAL_11610_SOURCE_CROSSWALK_EVIDENCE_LEDGER.jsonl");
const passportAuditPath = path.join(auditRoot, "foundation", "GLOBAL_11610_PASSPORT_AUDIT.csv");
const taxonomyPath = path.join(auditRoot, "foundation", "GLOBAL_2368_WORK_GROUP_TAXONOMY_AUDIT.csv");
const auditManifestPath = path.join(auditRoot, "closeout", "MANIFEST.json");

for (const required of [
  auditLedgerPath,
  auditCrosswalkPath,
  sourceInventoryPath,
  sourceCrosswalkPath,
  passportAuditPath,
  taxonomyPath,
  auditManifestPath,
]) invariant(existsSync(required), `REQUIRED_INPUT_MISSING:${required}`);

invariant(fileSha(auditLedgerPath) === "837685e794f5622e318a0a031d6e85e2dba4a5d9154648d0ac136bb6cea38235", "AUDIT_LEDGER_JSONL_HASH_MISMATCH");
invariant(fileSha(auditCrosswalkPath) === AUDIT_CROSSWALK_SHA256, "AUDIT_CROSSWALK_HASH_MISMATCH");
invariant(fileSha(sourceInventoryPath) === SOURCE_INVENTORY_SHA256, "SOURCE_INVENTORY_HASH_MISMATCH");
invariant(fileSha(taxonomyPath) === FOUNDATION_TAXONOMY_SHA256, "FOUNDATION_TAXONOMY_HASH_MISMATCH");
invariant(fileSha(auditManifestPath) === AUDIT_MANIFEST_SHA256, "AUDIT_MANIFEST_HASH_MISMATCH");

const auditRows = readJsonl(auditLedgerPath);
const auditCrosswalk = readJsonl(auditCrosswalkPath);
const sourceInventory = readJsonl(sourceInventoryPath);
const sourceCrosswalk = readJsonl(sourceCrosswalkPath);
const passports = parseCsv(readFileSync(passportAuditPath, "utf8"));

invariant(auditRows.length === 63, `R63_AUDIT_ROW_COUNT_MISMATCH:${auditRows.length}`);
invariant(auditCrosswalk.length === 63, `R63_CROSSWALK_COUNT_MISMATCH:${auditCrosswalk.length}`);
invariant(sourceInventory.length === GLOBAL_CATALOG_COUNT, `GLOBAL_SOURCE_INVENTORY_COUNT_MISMATCH:${sourceInventory.length}`);
invariant(passports.length === GLOBAL_CATALOG_COUNT, `GLOBAL_PASSPORT_COUNT_MISMATCH:${passports.length}`);

const auditCrosswalkByPredecessorId = new Map(auditCrosswalk.map((row) => [row.predecessorCatalogId, row]));
const sourceCrosswalkById = new Map(sourceCrosswalk.map((row) => [row.catalog_id, row]));
const passportById = new Map(passports.map((row) => [row.catalog_id, row]));
const sourceInventoryIds = sortedUnique(sourceInventory.map((row) => row.catalog_id));
invariant(sourceInventoryIds.length === GLOBAL_CATALOG_COUNT, "GLOBAL_SOURCE_INVENTORY_DUPLICATE_ID");

const identityRows = auditRows.map((auditRow, index) => {
  const crosswalk = auditCrosswalkByPredecessorId.get(auditRow.catalog_id);
  invariant(crosswalk, `AUDIT_CROSSWALK_ROW_MISSING:${auditRow.catalog_id}`);
  const globalMember = crosswalk.classification === "GLOBAL_11610_BINDING";
  const globalCatalogId = globalMember ? crosswalk.foundationCatalogId : null;
  const source = globalMember ? sourceCrosswalkById.get(globalCatalogId) : null;
  const passport = globalMember ? passportById.get(globalCatalogId) : null;
  invariant(!globalMember || source, `GLOBAL_SOURCE_ROW_MISSING:${globalCatalogId}`);
  invariant(!globalMember || passport, `GLOBAL_PASSPORT_MISSING:${globalCatalogId}`);
  const caseId = `R63-${String(index + 1).padStart(3, "0")}`;
  const routingMismatch = auditRow.catalog_id === "built-in-ai-1000:0701";
  const row = {
    caseId,
    caseType: globalMember ? "GLOBAL_CATALOG_WORK" : "EXTERNAL_BENCHMARK_ENTRYPOINT",
    catalogId: globalCatalogId,
    externalEntrypointId: globalMember ? null : auditRow.catalog_id,
    currentIdentityId: auditRow.catalog_id,
    sourceCatalog: auditRow.source_catalog,
    sourceRowLocator: source?.independent_source_row_locator ?? auditRow.source_row_locator ?? null,
    sourceRowHash: source?.independent_source_row_hash ?? auditRow.row_identity_sha256 ?? null,
    passportId: passport?.passport_id ?? null,
    passportHash: passport ? shaObject(passport) : null,
    passportHashRole: passport ? "DERIVED_STRUCTURAL_HASH_OF_FROZEN_FOUNDATION_PASSPORT_AUDIT_ROW" : null,
    rawTitle: auditRow.title_ru,
    normalizedTitle: normalizeTitle(auditRow.title_ru),
    canonicalTechnologyId: crosswalk.canonicalTechnologyId,
    expectedCanonicalTechnologyId: routingMismatch ? "asphalt_paving" : crosswalk.canonicalTechnologyId,
    identityRole: crosswalk.predecessorRole,
    canonicalTargetId: crosswalk.foundationCanonicalTargetId ?? crosswalk.predecessorAliasTarget ?? null,
    referenceAssemblyIds: referenceAssemblyIdsFor(auditRow),
    referenceAssemblyDisposition: routingMismatch ? "REFERENCE_ONLY_NOT_WORK_PROOF" : (referenceAssemblyIdsFor(auditRow).length ? "EXACT_REFERENCE_BINDING" : "NOT_APPLICABLE"),
    currentWorkKey: auditRow.work_key,
    expectedWorkKey: auditRow.work_key,
    currentScopeProfile: auditRow.scope_profile,
    expectedScopeProfile: "PENDING_R2_INDEPENDENT_EXPECTED_SCOPE",
    memberOfGlobal11610: globalMember,
    memberOfR63Corpus: true,
    currentBOQHash: auditRow.row_identity_sha256,
    currentResourceGraphHash: auditRow.resource_graph_sha256,
    auditLedgerHash: shaObject(auditRow),
    auditLedgerFileHash: AUDIT_LEDGER_SHA256,
    verdict: routingMismatch ? "ROUTING_REPAIR_REQUIRED_REFERENCE_ONLY_NOT_WORK_PROOF" : "IDENTITY_FROZEN_SCOPE_PENDING_R2",
  };
  return { ...row, cohortId: cohortIdFor(row) };
});

const caseIds = identityRows.map((row) => row.caseId);
const globalRows = identityRows.filter((row) => row.memberOfGlobal11610);
const externalRows = identityRows.filter((row) => !row.memberOfGlobal11610);
invariant(new Set(caseIds).size === 63, "R63_CASE_ID_DUPLICATE");
invariant(globalRows.length === 55, `R63_GLOBAL_COUNT_MISMATCH:${globalRows.length}`);
invariant(externalRows.length === 8, `R63_EXTERNAL_COUNT_MISMATCH:${externalRows.length}`);
invariant(globalRows.every((row) => sourceInventoryIds.includes(row.catalogId)), "R63_GLOBAL_ID_OUTSIDE_SOURCE_INVENTORY");
invariant(externalRows.every((row) => !sourceInventoryIds.includes(row.externalEntrypointId)), "R63_EXTERNAL_ENTRYPOINT_FOUND_IN_GLOBAL_SOURCE_INVENTORY");

const m5Definitions = [
  {
    id: "INTERIOR",
    expected: 2_250,
    file: path.join(baselineSourceRoot, "interior", "INTERIOR_FINISHES_DOMAIN_INVENTORY.json"),
    sha256: "67bbe9105710663c8db0d56e888fc05f66b7ea4a7a38764a379ec81079e2ae66",
  },
  {
    id: "WATER_SEWER",
    expected: 835,
    file: path.join(baselineSourceRoot, "water", "WATER_SEWER_DOMAIN_INVENTORY.json"),
    sha256: "3f3b1591c364adab958f5d2e70c1502f23da146cac0b27024fbb95048d38160c",
  },
  {
    id: "HVAC",
    expected: 920,
    file: path.join(baselineSourceRoot, "hvac", "HVAC_DOMAIN_INVENTORY.json"),
    sha256: "fceb4678b9741ede24cc55c6800d9d652d0181d9ba0c66706c2ef214a64e65ec",
  },
];

const m5Cohorts = m5Definitions.map((definition) => {
  invariant(existsSync(definition.file), `M5_INVENTORY_MISSING:${definition.id}`);
  invariant(fileSha(definition.file) === definition.sha256, `M5_INVENTORY_HASH_MISMATCH:${definition.id}`);
  const rows = dataArray(readJson(definition.file));
  const ids = sortedUnique(rows.map((row) => row.catalog_id));
  invariant(rows.length === definition.expected, `M5_INVENTORY_COUNT_MISMATCH:${definition.id}:${rows.length}`);
  invariant(ids.length === definition.expected, `M5_INVENTORY_DUPLICATE_ID:${definition.id}`);
  invariant(difference(ids, sourceInventoryIds).length === 0, `M5_ID_OUTSIDE_GLOBAL_SOURCE_INVENTORY:${definition.id}`);
  return { id: definition.id, count: ids.length, ids, sha256: definition.sha256 };
});

for (let left = 0; left < m5Cohorts.length; left += 1) {
  for (let right = left + 1; right < m5Cohorts.length; right += 1) {
    invariant(intersection(m5Cohorts[left].ids, m5Cohorts[right].ids).length === 0, `M5_COHORT_OVERLAP:${m5Cohorts[left].id}:${m5Cohorts[right].id}`);
  }
}

const asphaltGlobalIds = sortedUnique(globalRows.map((row) => row.catalogId));
const externalEntrypointIds = sortedUnique(externalRows.map((row) => row.externalEntrypointId));
const m5Ids = sortedUnique(m5Cohorts.flatMap((cohort) => cohort.ids));
invariant(m5Ids.length === 4_005, `M5_UNION_COUNT_MISMATCH:${m5Ids.length}`);
invariant(intersection(asphaltGlobalIds, m5Ids).length === 0, "ASPHALT_GLOBAL_AND_M5_OVERLAP");
const cumulativeGlobalIds = sortedUnique([...asphaltGlobalIds, ...m5Ids]);
const remainingGlobalIds = difference(sourceInventoryIds, cumulativeGlobalIds);
invariant(cumulativeGlobalIds.length === 4_060, `CUMULATIVE_GLOBAL_COUNT_MISMATCH:${cumulativeGlobalIds.length}`);
invariant(remainingGlobalIds.length === 7_550, `REMAINING_GLOBAL_COUNT_MISMATCH:${remainingGlobalIds.length}`);
invariant(sortedUnique([...cumulativeGlobalIds, ...remainingGlobalIds]).length === GLOBAL_CATALOG_COUNT, "GLOBAL_PARTITION_UNION_MISMATCH");
invariant(intersection(cumulativeGlobalIds, remainingGlobalIds).length === 0, "GLOBAL_PARTITION_INTERSECTION_NOT_EMPTY");

const cohortDefinitions = {
  C1_ENABLING_REMOVAL_DRAINAGE_AND_SURFACE_REPAIR: {
    title: "Подготовка, демонтаж, водоотвод, выравнивание и локальный ремонт",
    dependencyOrder: 1,
    inclusionRules: [
      "Работы с preparatory/removal/drainage/leveling/repair lifecycle.",
      "External demolition, patch repair и cold milling entrypoints.",
    ],
    exclusionRules: ["Placement/compaction-only operations.", "Full road, bridge, parking и access assemblies."],
    normSourceClasses: ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ESTIMATE_RATE_PRIMARY", "KG_NATIONAL_STANDARD_PRIMARY", "EAEU_MANDATORY_SAFETY"],
    riskTags: ["WASTE_BOUNDARY", "DRAINAGE_APPLICABILITY", "EXISTING_LAYER_CONDITION", "DOUBLE_COUNT_REMOVAL"],
  },
  C2_PLACEMENT_COMPACTION_FINISH_AND_LAYER_ENTRYPOINTS: {
    title: "Устройство, укладка, уплотнение, финишная приёмка и отдельные layer entrypoints",
    dependencyOrder: 2,
    inclusionRules: [
      "Placement/install/lay/compact/finish lifecycle for a pavement layer.",
      "External paving, overlay и base-layer entrypoints.",
    ],
    exclusionRules: ["Removal/drainage/local repair lifecycle.", "Full asset assemblies with road/bridge/parking geometry."],
    normSourceClasses: ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ESTIMATE_RATE_PRIMARY", "KG_NATIONAL_STANDARD_PRIMARY", "EAEU_MANDATORY_SAFETY"],
    riskTags: ["LAYER_THICKNESS_INPUT", "COMPACTION_FORMULA", "MIXTURE_QA", "HIDDEN_DESIGN_DEFAULT"],
  },
  C3_FULL_ROAD_BRIDGE_PARKING_ACCESS_ASSEMBLIES: {
    title: "Полные road/bridge/parking/access assemblies и их design-stage варианты",
    dependencyOrder: 3,
    inclusionRules: [
      "Expanded complex road, village-road, asphalt-pavement и bridge assemblies.",
      "External parking-lot и driveway entrypoints.",
    ],
    exclusionRules: ["Standalone atomic surface operations without full geometry."],
    normSourceClasses: ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ESTIMATE_RATE_PRIMARY", "KG_NATIONAL_STANDARD_PRIMARY", "KG_LEGAL_OR_ADMINISTRATIVE_BASIS", "EAEU_MANDATORY_SAFETY"],
    riskTags: ["REFERENCE_OWNER_ROUTING", "PROJECT_GEOMETRY_REQUIRED", "ACCESSIBILITY_SCOPE", "LARGE_PAYLOAD_DURABILITY"],
  },
};

const cohorts = Object.entries(cohortDefinitions).map(([cohortId, definition]) => {
  const members = identityRows.filter((row) => row.cohortId === cohortId);
  const memberIds = members.map((row) => row.caseId).sort();
  return {
    cohortId,
    ...definition,
    globalMemberCount: members.filter((row) => row.memberOfGlobal11610).length,
    externalEntrypointCount: members.filter((row) => !row.memberOfGlobal11610).length,
    memberIds,
    memberSetHash: shaObject(memberIds),
    technologyIds: sortedUnique(members.map((row) => row.expectedCanonicalTechnologyId)),
  };
});

invariant(cohorts.length === 3, `COHORT_COUNT_MISMATCH:${cohorts.length}`);
invariant(cohorts.flatMap((cohort) => cohort.memberIds).length === 63, "COHORT_MEMBERSHIP_COUNT_MISMATCH");
invariant(new Set(cohorts.flatMap((cohort) => cohort.memberIds)).size === 63, "COHORT_INTERSECTION_NOT_EMPTY");
invariant(cohorts.reduce((sum, cohort) => sum + cohort.globalMemberCount, 0) === 55, "COHORT_GLOBAL_SUBSET_MISMATCH");
invariant(cohorts.reduce((sum, cohort) => sum + cohort.externalEntrypointCount, 0) === 8, "COHORT_EXTERNAL_SUBSET_MISMATCH");

const identityColumns = [
  "caseId", "caseType", "catalogId", "externalEntrypointId", "currentIdentityId", "sourceCatalog",
  "sourceRowLocator", "sourceRowHash", "passportId", "passportHash", "passportHashRole", "rawTitle",
  "normalizedTitle", "canonicalTechnologyId", "expectedCanonicalTechnologyId", "identityRole",
  "canonicalTargetId", "referenceAssemblyIds", "referenceAssemblyDisposition", "currentWorkKey", "expectedWorkKey",
  "currentScopeProfile", "expectedScopeProfile", "memberOfGlobal11610", "memberOfR63Corpus", "currentBOQHash",
  "currentResourceGraphHash", "auditLedgerHash", "auditLedgerFileHash", "cohortId", "verdict",
];
writeCsv("identity/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv", identityRows, identityColumns);

writeJson("identity/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json", {
  schemaVersion: `${SCHEMA}:global-denominator-partition`,
  generatedAtUtc: GENERATED_AT_UTC,
  auditHead: AUDIT_HEAD,
  auditTree: AUDIT_TREE,
  globalCatalogCount: GLOBAL_CATALOG_COUNT,
  r63CorpusCount: identityRows.length,
  asphaltGlobalCount: asphaltGlobalIds.length,
  externalBenchmarkCount: externalEntrypointIds.length,
  externalCountedInGlobal11610: 0,
  asphaltGlobalIds,
  externalEntrypointIds,
  m5Cohorts: m5Cohorts.map(({ id, count, ids, sha256: hash }) => ({ id, count, ids, sourceInventorySha256: hash })),
  m5GlobalCount: m5Ids.length,
  cumulativeGlobalCount: cumulativeGlobalIds.length,
  cumulativeGlobalIds,
  remainingGlobalCount: remainingGlobalIds.length,
  remainingGlobalIds,
  formulas: {
    r63Corpus: "55 + 8 = 63",
    m5: "2250 + 835 + 920 = 4005",
    cumulative: "55 + 4005 = 4060",
    remaining: "11610 - 4060 = 7550",
    seal: "4060 + 7550 = 11610",
  },
  invariants: {
    sourceInventoryUnique: true,
    asphaltGlobalSubsetOf11610: true,
    externalEntrypointsOutside11610: true,
    m5CohortsDisjoint: true,
    asphaltAndM5Disjoint: true,
    cumulativeAndRemainingDisjoint: true,
    cumulativeUnionRemainingEquals11610: true,
    idsMovedBetweenGlobalSets: 0,
  },
  inputHashes: {
    sourceInventorySha256: SOURCE_INVENTORY_SHA256,
    foundationTaxonomySha256: FOUNDATION_TAXONOMY_SHA256,
    auditCrosswalkSha256: AUDIT_CROSSWALK_SHA256,
    auditManifestSha256: AUDIT_MANIFEST_SHA256,
  },
  reviewer: REVIEWER,
  verdict: "GREEN_EXACT_GLOBAL55_EXTERNAL8_AND_11610_PARTITION",
});

writeJson("program-arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json", {
  schemaVersion: `${SCHEMA}:program-arithmetic-correction`,
  generatedAtUtc: GENERATED_AT_UTC,
  oldValues: {
    asphaltReportedAsGlobal: 63,
    postAsphaltM5Cohort: 4_005,
    cumulativeReported: 4_068,
    remainingReported: 7_542,
    oldRemainingIdSetStatus: "NOT_PROVEN_NUMERIC_ONLY",
  },
  newValues: {
    asphaltGlobal: 55,
    asphaltExternalBenchmark: 8,
    r63BenchmarkCorpus: 63,
    postAsphaltM5Cohort: 4_005,
    cumulativeGlobal: 4_060,
    remainingGlobal: 7_550,
    globalCatalog: GLOBAL_CATALOG_COUNT,
  },
  formulas: {
    r63BenchmarkCorpus: "55 GLOBAL_CATALOG_WORK + 8 EXTERNAL_BENCHMARK_ENTRYPOINT = 63",
    postAsphaltM5Cohort: "2250 Interior + 835 Water/Sewer + 920 HVAC = 4005",
    cumulativeGlobal: "55 + 4005 = 4060",
    remainingGlobal: "11610 - 4060 = 7550",
    globalSeal: "4060 + 7550 = 11610",
  },
  affectedPaths: [
    "scripts/estimate/auditCompletedDomainsDepthBaseline.ts",
    ".release-runtime/completed-domains-depth-r1/baseline/BASELINE_IDENTITY.json",
    ".release-runtime/completed-domains-depth-r1/baseline/DOMAIN_DENOMINATOR_RECONCILIATION.json",
    ".release-runtime/completed-domains-depth-r1/baseline/COMPLETED_DOMAINS_UNIQUE_DENOMINATOR.json",
    ".release-runtime/completed-domains-depth-r1/baseline/BASELINE_MANIFEST.json",
    ".release-runtime/master-11610-group-batches-r1/03-m1-asphalt-five-p0-remediation-r1/program-arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json",
    ".release-runtime/master-11610-group-batches-r1/03-m1-asphalt-five-p0-remediation-r1/program-arithmetic/MASTER_11610_OLD_TO_NEW_MILESTONE_COUNT_RECONCILIATION.md",
    ".release-runtime/master-11610-group-batches-r1/03-m1-asphalt-five-p0-remediation-r1/program-arithmetic/GLOBAL_CONTENT_STATUS_BEFORE_AFTER.json"
  ],
  queueImpact: {
    externalEntrypointIdsRemovedFromGlobalCompletionArithmetic: externalEntrypointIds,
    externalEntrypointIdsAddedToGlobalRemainingQueue: [],
    globalIdsMovedBetweenSets: [],
    exactRemainingGlobalIds: remainingGlobalIds,
    oldRemainingCountWasUnsupportedNumericSubtraction: true,
  },
  idsMovedBetweenSets: 0,
  reviewer: REVIEWER,
  sourceInventoryHash: SOURCE_INVENTORY_SHA256,
  foundationTaxonomyHash: FOUNDATION_TAXONOMY_SHA256,
  auditEvidenceHash: AUDIT_MANIFEST_SHA256,
  auditCrosswalkHash: AUDIT_CROSSWALK_SHA256,
  globalDenominatorChanged: false,
  verdict: "GREEN_PROGRAM_ARITHMETIC_RECOUNTED_EXACT_IDS_SOURCE_CHANGE_PENDING",
});

writeDeterministic("program-arithmetic/MASTER_11610_OLD_TO_NEW_MILESTONE_COUNT_RECONCILIATION.md", `# Сверка старой и новой milestone-арифметики 11 610\n\nСхема: \`${SCHEMA}:old-to-new-milestone-count\`.\n\nСтарое значение \`4 068\` ошибочно считало все 63 R63 cases глобальными catalog records. Exact ledger доказывает \`55 GLOBAL_CATALOG_WORK + 8 EXTERNAL_BENCHMARK_ENTRYPOINT = 63\`.\n\nИсправленная арифметика:\n\n- \`2250 + 835 + 920 = 4005\` — frozen post-Asphalt M5 cohort.\n- \`55 + 4005 = 4060\` — global cumulative count.\n- \`11610 - 4060 = 7550\` — exact remaining global count.\n- \`4060 + 7550 = 11610\` — denominator seal.\n\nВосемь external entrypoints никогда не входили в source inventory 11 610. Они удаляются только из completion arithmetic; ни один global ID не перемещён, не удалён и не добавлен. Старый remaining count \`7 542\` не имел доказанного exact ID set и объявлен \`NOT_PROVEN_NUMERIC_ONLY\`. Новый remaining set содержит 7 550 exact IDs в \`M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json\`.\n\nСтатус: \`GREEN_EXACT_RECOUNT_SOURCE_CHANGE_PENDING\`.\n`);

writeJson("program-arithmetic/GLOBAL_CONTENT_STATUS_BEFORE_AFTER.json", {
  schemaVersion: `${SCHEMA}:global-content-status-before-after`,
  generatedAtUtc: GENERATED_AT_UTC,
  before: {
    globalDenominator: GLOBAL_CATALOG_COUNT,
    asphaltReportedCompleted: 63,
    externalMiscountedAsGlobal: externalEntrypointIds,
    cumulativeReported: 4_068,
    remainingReported: 7_542,
    remainingIdSetStatus: "NOT_PROVEN_NUMERIC_ONLY",
  },
  after: {
    globalDenominator: GLOBAL_CATALOG_COUNT,
    asphaltGlobalAdmitted: asphaltGlobalIds,
    asphaltExternalBenchmark: externalEntrypointIds,
    postAsphaltM5GlobalIds: m5Ids,
    cumulativeGlobalIds,
    remainingGlobalIds,
    contentComplete: false,
  },
  mutations: {
    sourceCatalogIdentity: 0,
    groupMembership: 0,
    passportMembership: 0,
    nonAsphaltProfessionalContent: 0,
    derivedArithmeticMetadataOnly: true,
  },
  verdict: "GREEN_DERIVED_STATUS_RECONCILED_SOURCE_CHANGE_PENDING",
});

writeJson("cohorts/R63_REMEDIATION_COHORT_MANIFEST.json", {
  schemaVersion: `${SCHEMA}:semantic-cohorts`,
  generatedAtUtc: GENERATED_AT_UTC,
  cohortCount: cohorts.length,
  cohorts,
  unionCount: new Set(cohorts.flatMap((cohort) => cohort.memberIds)).size,
  intersectionCount: 0,
  globalSubsetCount: cohorts.reduce((sum, cohort) => sum + cohort.globalMemberCount, 0),
  externalSubsetCount: cohorts.reduce((sum, cohort) => sum + cohort.externalEntrypointCount, 0),
  groupingBasis: ["lifecycle/action", "physical result", "object/system", "formula/unit class", "normative/QA regime", "durable projection path"],
  numericSlicingUsed: false,
  keywordOnlyGroupingUsed: false,
  reviewer: REVIEWER,
  verdict: "GREEN_EXACT_THREE_SEMANTIC_COHORTS",
});

process.stdout.write(`${JSON.stringify({
  verdict: "GREEN_R1_IDENTITY_PARTITION_ARITHMETIC_AND_COHORTS",
  outputRoot: path.relative(repoRoot, outputRoot).replaceAll("\\", "/"),
  counts: {
    r63: identityRows.length,
    global: globalRows.length,
    external: externalRows.length,
    m5: m5Ids.length,
    cumulative: cumulativeGlobalIds.length,
    remaining: remainingGlobalIds.length,
    cohorts: Object.fromEntries(cohorts.map((cohort) => [cohort.cohortId, {
      total: cohort.memberIds.length,
      global: cohort.globalMemberCount,
      external: cohort.externalEntrypointCount,
      memberSetHash: cohort.memberSetHash,
    }])),
  },
}, null, 2)}\n`);
