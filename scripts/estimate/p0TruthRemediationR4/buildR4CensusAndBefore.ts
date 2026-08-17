import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join, relative, resolve } from "node:path";

const PACKAGE_A = "C:/dev/rik-expo-app-batch009-fire-life-safety-r5/.release-runtime/batch009-fire-r5/release-a";
const R3_AUDIT = "artifacts/p0-estimate-truth-remediation-r3/package-a-truth-audit";
const R3_SPEC = "C:/Users/User/Downloads/P0_FULL_ESTIMATE_TRUTH_REMEDIATION_R3_PARAMETER_GUIDES_SEARCH_MATERIALS_OPERATIONS_HISTORY_EXACT_GREEN_NO_FULL_JEST.md";
const EXPECTED_RELEASE_ID = "2c1cb615-187c-50f6-980d-66b62bd3d5d1";
const EXPECTED_PACKAGE_SHA256 = "c94d02110953517a3202682a2b80899f070f501a0f8bfdc5d501ad8be9c46efb";

type Row = Record<string, unknown>;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function readJsonl(path: string): Promise<Row[]> {
  const rows: Row[] = [];
  const reader = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of reader) {
    if (line.trim()) rows.push(JSON.parse(line) as Row);
  }
  return rows;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

function fingerprint(path: string): Row {
  const bytes = execFileSync(process.execPath, ["-e", [
    "const fs=require('fs'),c=require('crypto');",
    "const p=process.argv[1],b=fs.readFileSync(p);",
    "process.stdout.write(JSON.stringify({bytes:b.length,sha256:c.createHash('sha256').update(b).digest('hex')}));",
  ].join(""), path], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  return { path: relative(process.cwd(), path).replaceAll("\\", "/"), ...JSON.parse(bytes) as Row };
}

function defectMetric(row: Row, key: string, nestedKey?: string): number {
  return nestedKey ? number(object(row[key])[nestedKey]) : number(row[key]);
}

function defectClasses(row: Row): string[] {
  const classes: string[] = [];
  if (defectMetric(row, "forbiddenRows") > 0) classes.push("FORBIDDEN_GENERIC_ROW");
  if (defectMetric(row, "missingSemanticOwnerRows") > 0) classes.push("MISSING_SEMANTIC_OWNER");
  if (defectMetric(row, "missingPhysicalIdentityRows") > 0) classes.push("MISSING_PHYSICAL_IDENTITY");
  if (defectMetric(row, "exactTitleDuplicates", "groups") > 0) classes.push("EXACT_TITLE_DUPLICATE_CANDIDATE");
  if (defectMetric(row, "semanticOwnerDuplicates", "groups") > 0) classes.push("SEMANTIC_OWNER_DUPLICATE");
  if (defectMetric(row, "costOwnerDuplicates", "groups") > 0) classes.push("COST_OWNER_DUPLICATE");
  if (defectMetric(row, "crossPhysicalTypeGroups") > 0) classes.push("CROSS_PHYSICAL_TYPE_DUPLICATE");
  return classes;
}

function sum(rows: readonly Row[], selector: (row: Row) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function groupRows(rows: readonly Row[], selector: (row: Row) => string): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = selector(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

async function main(): Promise<void> {
  const outputRoot = resolve(process.argv[2] ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence");
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const timestamp = new Date().toISOString();
  const manifestPath = resolve(PACKAGE_A, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Row;
  if (manifest.releaseId !== EXPECTED_RELEASE_ID || manifest.sourcePackageSha256 !== EXPECTED_PACKAGE_SHA256) {
    throw new Error("R4_CENSUS_SOURCE_PACKAGE_MISMATCH");
  }
  const common = {
    sourceHead: head,
    sourceTree: tree,
    sourcePackageSha256: EXPECTED_PACKAGE_SHA256,
    databaseReleaseId: EXPECTED_RELEASE_ID,
    timestamp,
    command: "npx tsx scripts/estimate/p0TruthRemediationR4/buildR4CensusAndBefore.ts",
    toolVersion: `node ${process.version}`,
  };

  const worksPath = resolve(PACKAGE_A, "works.jsonl");
  const works = await readJsonl(worksPath);
  const census = works.map((work) => {
    const sourceMetadata = object(work.sourceMetadata);
    const inventory = object(sourceMetadata.inventoryRecord);
    const domain = text(work.domain) ?? "UNASSIGNED";
    return {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-census.v1",
      ...common,
      catalogId: text(work.catalogId),
      namespace: text(work.namespace),
      domain,
      group: text(inventory.ui_group) ?? text(sourceMetadata.uiGroup) ?? domain,
      family: text(inventory.canonical_technology_id) ?? text(work.workKey) ?? text(work.catalogId),
      operationClass: text(object(work.applicability).operationClass) ?? text(inventory.operation_class),
      sourceIdentity: text(work.sourceIdentity),
      sourceCatalog: text(inventory.source_catalog) ?? text(sourceMetadata.catalogOrigin) ?? "CUMULATIVE_PACKAGE_A",
      currentReleaseMembership: true,
      scopeKind: domain === "asphalt" ? "ASPHALT_IMMUTABLE_CONTROL" : "NON_ASPHALT_REMEDIATION",
      verdict: "IN_SCOPE",
    };
  });
  const ids = census.map((row) => row.catalogId);
  if (census.length !== 4503 || new Set(ids).size !== 4503 || census.some((row) => !row.catalogId)) {
    throw new Error(`R4_CENSUS_CARDINALITY_MISMATCH:${census.length}:${new Set(ids).size}`);
  }
  const nonAsphalt = census.filter((row) => row.domain !== "asphalt");
  const asphalt = census.filter((row) => row.domain === "asphalt");
  if (nonAsphalt.length !== 4440 || asphalt.length !== 63) {
    throw new Error(`R4_CENSUS_SCOPE_MISMATCH:${nonAsphalt.length}:${asphalt.length}`);
  }

  const dimensionSummary = (key: "domain" | "family" | "operationClass" | "group") =>
    [...groupRows(census as unknown as Row[], (row) => text(row[key]) ?? "UNASSIGNED")]
      .map(([value, rows]) => ({ value, count: rows.length }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "en"));
  const summary = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-census-summary.v1",
    ...common,
    exactCounts: { scopeTotal: 4503, nonAsphalt: 4440, asphalt: 63, scopeUnassigned: 0, scopeOverlapUnexplained: 0 },
    byDomain: dimensionSummary("domain"),
    byGroup: dimensionSummary("group"),
    byFamily: dimensionSummary("family"),
    byOperationClass: dimensionSummary("operationClass"),
    sourceWorks: fingerprint(worksPath),
    verdict: "GREEN_EXACT_CENSUS_4503",
  };

  const repros = [
    { reproId: "REPRO-001", titleRu: "Монолитная стена", revisionId: "estimate_revision:professional_expanded_572556074:v1", requestText: "монолитная стена 200 кв метров ширина 0.3 метров и длина 10 метров высота 10 метров", expected: "Индивидуальная concrete/RC схема и размерно корректный BOQ", observed: "Generic/физически противоречивая смета" },
    { reproId: "REPRO-002", titleRu: "Грубая штукатурка стен", revisionId: "estimate_revision:universal_estimator_319851525:v1", requestText: "грубая штукатурка стен", expected: "Точная отделочная работа, способ нанесения и расход в корректных единицах", observed: "Generic route и недостоверный состав" },
    { reproId: "REPRO-003", titleRu: "HVAC plant room", revisionId: "estimate_revision:consumer_draft_mswm14bp_5jbv3n:v1", requestText: "HVAC plant room", expected: "System-specific нагрузки, контуры, трубы/воздуховоды, оборудование и commissioning", observed: "Одинаковые generic-блоки" },
    { reproId: "REPRO-004", titleRu: "Монтаж теплового насоса", revisionId: "estimate_revision:professional_expanded_1605663941:v1", requestText: "монтаж теплового насоса", expected: "Параметры выбранного оборудования, гидравлика, электрика, пусконаладка", observed: "Generic professional estimate" },
    { reproId: "REPRO-005", titleRu: "Повторное открытие истории", revisionId: null, requestText: "Открыть сохранённую backend-owned смету из истории", expected: "Загрузка immutable canonical revision из backend", observed: "CONSUMER_REPAIR_HISTORY_SNAPSHOT_MISSING" },
    { reproId: "REPRO-006", titleRu: "Asphalt calculation control", revisionId: null, requestText: "Повторить эталонный расчёт Asphalt", expected: "Неизменный FormulaGraph/ResourceGraph/BOQ/quantities/totals", observed: "KNOWN_GOOD_ASPHALT_CALCULATION_CORE; parameter UI остаётся RED" },
    { reproId: "REPRO-007", titleRu: "Отсутствующая норма внутри input", revisionId: null, requestText: "Открыть пустое поле параметра Asphalt-control", expected: "Серый guide внутри пустого input и компактная подпись после ввода", observed: "Только «Введите…» или единица измерения" },
    { reproId: "REPRO-008", titleRu: "Внутренний scope в пользовательской форме", revisionId: null, requestText: "Открыть «Уточнить параметры»", expected: "Внутренние поля скрыты", observed: "Виден «Профессиональный scope» / ScopeResolver" },
    { reproId: "REPRO-009", titleRu: "Дубли составных слоёв", revisionId: null, requestText: "Открыть параметры слоёв Asphalt-control", expected: "Typed-слои и derived read-only count", observed: "Количество слоёв и свободное описание слоёв показаны как независимые inputs" },
    { reproId: "REPRO-010", titleRu: "Перекрытие параметров действиями", revisionId: null, requestText: "Прокрутить форму на фактическом Web/Android viewport", expected: "Поля доступны над sticky/keyboard/AI controls", observed: "Нижние кнопки и AI-кнопка перекрывают карточки" },
  ].map((row) => ({
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-frozen-repro.v1",
    ...common,
    ...row,
    beforeEvidenceStatus: "SOURCE_EVIDENCE_MISSING",
    sourceEvidenceNoteRu: "Оригинальные output JSON/PDF/screenshot не найдены в successor; описание взято из superseded R3 incident register и не выдаётся за оригинальный файл.",
    reconstructedBackendCase: { input: row.requestText, oracle: row.expected, executionStatus: "PENDING_RUNTIME_REPLAY" },
    verdict: row.reproId === "REPRO-006" ? "CONTROL_CORE_GREEN_UI_RED" : "FROZEN_BAD_REPRO_RED",
  }));

  const resourceAuditPath = resolve(R3_AUDIT, "RESOURCE_AUDIT_BY_CATALOG.jsonl");
  const parameterAuditPath = resolve(R3_AUDIT, "PARAMETER_AUDIT_BY_CATALOG.jsonl");
  const r3SummaryPath = resolve(R3_AUDIT, "SUMMARY.json");
  const resourceAudit = await readJsonl(resourceAuditPath);
  const nonAsphaltResourceAudit = resourceAudit.filter((row) => row.domain !== "asphalt");
  const strictBefore = nonAsphaltResourceAudit.filter((row) => row.verdict === "RED");
  if (strictBefore.length !== 2372) throw new Error(`R4_STRICT_BEFORE_MISMATCH:${strictBefore.length}`);
  const strictIds = new Set(strictBefore.map((row) => text(row.catalogId)));
  const titleCandidateIds = new Set(nonAsphaltResourceAudit
    .filter((row) => defectMetric(row, "exactTitleDuplicates", "groups") > 0)
    .map((row) => text(row.catalogId)));
  const unionIds = new Set([...strictIds, ...titleCandidateIds]);
  const censusById = new Map(census.map((row) => [row.catalogId, row]));
  const before = strictBefore.map((row) => ({
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-boq-before.v1",
    ...common,
    defectId: `P0-BOQ-BEFORE:${String(row.catalogId)}`,
    severity: "P0",
    catalogId: row.catalogId,
    domain: row.domain,
    defectClasses: defectClasses(row),
    beforeMetrics: {
      rows: row.rows,
      forbiddenRows: row.forbiddenRows,
      missingSemanticOwnerRows: row.missingSemanticOwnerRows,
      missingPhysicalIdentityRows: row.missingPhysicalIdentityRows,
      exactTitleDuplicates: row.exactTitleDuplicates,
      semanticOwnerDuplicates: row.semanticOwnerDuplicates,
      costOwnerDuplicates: row.costOwnerDuplicates,
      crossPhysicalTypeGroups: row.crossPhysicalTypeGroups,
    },
    evidenceSource: "R3_READ_ONLY_STREAMING_AUDIT_OF_QUARANTINED_PACKAGE_A",
    rootCauseDisposition: "SEE_ROOT_CAUSE_OWNER_LEDGER",
    verdict: "KNOWN_STRICT_BEFORE_RED",
  }));
  const affectedUnion = [...unionIds].filter((id): id is string => Boolean(id)).sort().map((catalogId) => ({
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-affected-union.v1",
    ...common,
    catalogId,
    domain: censusById.get(catalogId)?.domain ?? null,
    knownStrictBefore: strictIds.has(catalogId),
    addedByExactTitleFalseNegativeAudit: !strictIds.has(catalogId) && titleCandidateIds.has(catalogId),
    remediationScope: "OWNER_FIX_PLUS_FULL_DOMAIN_REGRESSION",
    verdict: strictIds.has(catalogId) ? "REMEDIATION_REQUIRED" : "ENGINEERING_DUPLICATE_REVIEW_REQUIRED",
  }));

  const domainAudits = groupRows(nonAsphaltResourceAudit, (row) => text(row.domain) ?? "UNASSIGNED");
  const ownerDefinitions = [
    { ownerId: "drywall.resource.semantic-owner-export", domain: "drywall", classes: ["MISSING_SEMANTIC_OWNER", "SEMANTIC_OWNER_DUPLICATE"], confidence: "CONFIRMED", sourceOwners: ["drywallArchitecturalElementsProfessionalV4", "drywallCeilingBulkheadProfessionalV3", "drywallDomainCompletionProfessionalV7", "productionBinding", "exportCanonicalEstimateCorpusR1"], status: "SOURCE_FIX_IMPLEMENTED_FOCUSED_VERIFIED", planRu: "Сохранять row-level semantic owner, а work owner — отдельно; пересобрать 500 ID и повторить streaming audit." },
    { ownerId: "hvac.typed-child.interface-expansion", domain: "hvac_heat_supply", classes: ["SEMANTIC_OWNER_DUPLICATE", "COST_OWNER_DUPLICATE"], confidence: "CONFIRMED", sourceOwners: ["hvacR4Model"], status: "SOURCE_FIX_IMPLEMENTED_FOCUSED_VERIFIED", planRu: "Одна физическая boundary — одна информационная строка без собственного cost owner; пересобрать 1 012 ID." },
    { ownerId: "hvac.generic-operation-titles", domain: "hvac_heat_supply", classes: ["FORBIDDEN_GENERIC_ROW", "EXACT_TITLE_DUPLICATE_CANDIDATE"], confidence: "PARTIALLY_LOCALIZED", sourceOwners: ["hvacR4Model", "canonical exporter"], status: "REMEDIATION_PENDING", planRu: "Локализовать generator path для 56 filler-строк и заменить физическими операциями, не меняя unrelated rows." },
    { ownerId: "water.variant-cost-ownership", domain: "water_supply_sewerage", classes: ["COST_OWNER_DUPLICATE", "EXACT_TITLE_DUPLICATE_CANDIDATE"], confidence: "APPLICABILITY_REVIEW_REQUIRED", sourceOwners: ["water domain generators", "canonical exporter"], status: "ROOT_CAUSE_NOT_YET_PROVEN", planRu: "Разделить взаимоисключающие варианты и реальный double-count по applicability/stage/zone/cost policy до любого merge." },
    { ownerId: "electrical.exact-title-identity", domain: "electrical", classes: ["EXACT_TITLE_DUPLICATE_CANDIDATE"], confidence: "TITLE_SIGNAL_ONLY", sourceOwners: ["electrical domain generators"], status: "FALSE_NEGATIVE_AUDIT_PENDING", planRu: "Проверить 148 ID по полной duplicate identity; одинаковый title сам по себе не удалять." },
    { ownerId: "concrete.exact-title-identity", domain: "concrete", classes: ["EXACT_TITLE_DUPLICATE_CANDIDATE"], confidence: "TITLE_SIGNAL_ONLY", sourceOwners: ["concrete domain generators"], status: "FALSE_NEGATIVE_AUDIT_PENDING", planRu: "Проверить 166 ID по specification/stage/zone/condition/cost policy и устранить только доказанный double-count." },
    { ownerId: "fire.exact-title-identity", domain: "fire", classes: ["EXACT_TITLE_DUPLICATE_CANDIDATE"], confidence: "TITLE_SIGNAL_ONLY", sourceOwners: ["fire domain generators"], status: "FALSE_NEGATIVE_AUDIT_PENDING_QUARANTINED", planRu: "Проверить 30 candidate ID, сохраняя BATCH-009 в карантине без activation." },
  ];
  const rootCauseLedger = ownerDefinitions.map((definition) => {
    const rows = domainAudits.get(definition.domain) ?? [];
    const strict = rows.filter((row) => row.verdict === "RED");
    const candidates = rows.filter((row) => defectMetric(row, "exactTitleDuplicates", "groups") > 0);
    return {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-root-cause-owner.v1",
      ...common,
      ...definition,
      beforeCounts: {
        domainCatalogs: rows.length,
        strictAffectedCatalogs: strict.length,
        exactTitleCandidateCatalogs: candidates.length,
        forbiddenRows: sum(rows, (row) => defectMetric(row, "forbiddenRows")),
        missingSemanticOwnerRows: sum(rows, (row) => defectMetric(row, "missingSemanticOwnerRows")),
        exactTitleDuplicateExcess: sum(rows, (row) => defectMetric(row, "exactTitleDuplicates", "excessRows")),
        semanticOwnerDuplicateExcess: sum(rows, (row) => defectMetric(row, "semanticOwnerDuplicates", "excessRows")),
        costOwnerDuplicateExcess: sum(rows, (row) => defectMetric(row, "costOwnerDuplicates", "excessRows")),
      },
      affectedCatalogIds: [...new Set([...strict, ...candidates].map((row) => text(row.catalogId)).filter(Boolean))].sort(),
      exceptionAllowlist: [],
      verdict: definition.status,
    };
  });

  const reproPath = join(outputRoot, "02-repro/FROZEN_REPRO_10.jsonl");
  const censusPath = join(outputRoot, "03-census/SCOPE_CENSUS_4503.jsonl");
  const beforePath = join(outputRoot, "07-boq/BOQ_DEFECTS_BEFORE_2372.jsonl");
  const rootCausePath = join(outputRoot, "07-boq/ROOT_CAUSE_OWNER_LEDGER.jsonl");
  const unionPath = join(outputRoot, "07-boq/AFFECTED_UNION.jsonl");
  await writeJsonl(reproPath, repros);
  await writeJsonl(censusPath, census);
  await writeJson(join(outputRoot, "03-census/DOMAIN_FAMILY_OPERATION_SUMMARY.json"), summary);
  await writeJsonl(join(outputRoot, "03-census/DISCOVERED_MISSING_WORKS.jsonl"), []);
  await writeJsonl(beforePath, before);
  await writeJsonl(rootCausePath, rootCauseLedger);
  await writeJsonl(unionPath, affectedUnion);

  const sourceFingerprints = [manifestPath, worksPath, resourceAuditPath, parameterAuditPath, r3SummaryPath, R3_SPEC]
    .map((path) => fingerprint(resolve(path)));
  const evidenceIndex = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-before-evidence-index.v1",
    ...common,
    reproCount: 10,
    badReproCount: 9,
    knownGoodAsphaltCoreCount: 1,
    originalSourceEvidencePresent: 0,
    sourceEvidenceMissing: 10,
    reconstructedBackendCases: 10,
    runtimeReplayCompleted: 0,
    sourceFingerprints,
    generatedArtifacts: [reproPath, censusPath, beforePath, rootCausePath, unionPath].map((path) => fingerprint(path)),
    verdict: "RED_SOURCE_EVIDENCE_MISSING_RUNTIME_REPLAY_PENDING",
  };
  await writeJson(join(outputRoot, "02-repro/BEFORE_EVIDENCE_INDEX.json"), evidenceIndex);

  const journal = {
    timestamp,
    phase: "R4-PHASE-1",
    status: "RED",
    what_checked_ru: "Построены exact census 4 503, 10 frozen repro, strict BEFORE 2 372 и расширенный BOQ affected union.",
    why_ru: "Отделить доказанные машинные дефекты от title-only кандидатов и зафиксировать полный membership до дальнейших исправлений.",
    command_or_action: common.command,
    finding_ru: `Census 4503 = 4440 + 63; strict BOQ RED 2372; расширенный union ${affectedUnion.length}; оригинальные before-файлы для 10 repro отсутствуют, поэтому им честно присвоен SOURCE_EVIDENCE_MISSING.`,
    affected_ids: affectedUnion.length,
    affected_rows: 1243194,
    affected_files: ["works.jsonl", "RESOURCE_AUDIT_BY_CATALOG.jsonl", "PARAMETER_AUDIT_BY_CATALOG.jsonl"],
    evidence: ["02-repro/FROZEN_REPRO_10.jsonl", "02-repro/BEFORE_EVIDENCE_INDEX.json", "03-census/SCOPE_CENSUS_4503.jsonl", "03-census/DOMAIN_FAMILY_OPERATION_SUMMARY.json", "03-census/DISCOVERED_MISSING_WORKS.jsonl", "07-boq/BOQ_DEFECTS_BEFORE_2372.jsonl", "07-boq/ROOT_CAUSE_OWNER_LEDGER.jsonl", "07-boq/AFFECTED_UNION.jsonl"],
    completed_ru: "Membership и BEFORE-дефекты материализованы без изменения package A.",
    not_completed_ru: "Runtime replay 10 repro и engineering disposition title-only кандидатов ещё не выполнены.",
    next_action_ru: "Выполнить shared contract gates и runtime replay на explicit localhost disposable DB.",
    stop_reason_ru: null,
    head,
    tree,
  };
  await appendFile(join(outputRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify(journal)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "P0_R4_CENSUS_BEFORE_MATERIALIZED",
    census: census.length,
    nonAsphalt: nonAsphalt.length,
    asphalt: asphalt.length,
    strictBefore: before.length,
    affectedUnion: affectedUnion.length,
    frozenRepros: repros.length,
    sourceEvidenceMissing: repros.filter((row) => row.beforeEvidenceStatus === "SOURCE_EVIDENCE_MISSING").length,
    verdict: "RED_RUNTIME_REPLAY_AND_REMEDIATION_PENDING",
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
