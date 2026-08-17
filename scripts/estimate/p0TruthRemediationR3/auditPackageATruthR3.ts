import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";

type JsonRecord = Record<string, unknown>;

type WorkIdentity = {
  catalogId: string;
  domain: string;
  titleRu: string;
};

type PackageManifest = {
  releaseId?: string;
  releaseKey?: string;
  sourcePackageSha256?: string;
  actual?: {
    works?: number;
    resources?: number;
    parameters?: number;
  };
};

const FORBIDDEN_ROW_PATTERNS = [
  "материалы и комплектующие для",
  "основные материалы по технологии работ",
  "расходные изделия, крепеж и доборные элементы",
  "рабочая привязка для",
  "выполнение работ по",
  "инструмент, техника и измерительное оборудование для",
  "доставка и внутриплощадочная логистика для",
  "резерв профессионального добора",
  "scope driver",
  "preliminary_boq",
  "материал отделки",
  "этап 1",
  "этап 2",
  "основная операция",
  "сервис и контроль этапа",
] as const;

const GENERIC_SINGLETON_TITLES = new Set([
  "оборудование",
  "обвязка",
  "подготовка",
  "контроль",
  "монтаж",
  "логистика",
  "документация",
]);

const GENERIC_ROW_PREFIXES = [
  "выполнение ",
  "поставка состава для ",
  "работа механизма для ",
  "обмер и подтверждение ",
  "рабочая детализация ",
  "подтверждение границы ",
  "обследование и фиксация исходных данных для ",
  "классификация опасности и защищаемой зоны для ",
  "нормативный расчет для ",
  "разработка пожарного сценария для ",
] as const;

function asObject(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRu(value: unknown): string {
  return stringValue(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function addSetValue(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

async function readJsonl(
  filePath: string,
  onRow: (row: JsonRecord, lineNumber: number) => void,
): Promise<number> {
  const input = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`R3_JSONL_PARSE_FAILED:${basename(filePath)}:${lineNumber}:${error instanceof Error ? error.message : String(error)}`);
    }
    const row = asObject(parsed);
    if (!row) throw new Error(`R3_JSONL_ROW_NOT_OBJECT:${basename(filePath)}:${lineNumber}`);
    onRow(row, lineNumber);
  }
  return lineNumber;
}

async function loadWorks(releaseDir: string): Promise<Map<string, WorkIdentity>> {
  const works = new Map<string, WorkIdentity>();
  await readJsonl(join(releaseDir, "works.jsonl"), (row) => {
    const catalogId = stringValue(row.catalogId);
    if (!catalogId) throw new Error("R3_WORK_CATALOG_ID_MISSING");
    if (works.has(catalogId)) throw new Error(`R3_WORK_CATALOG_ID_DUPLICATE:${catalogId}`);
    works.set(catalogId, {
      catalogId,
      domain: stringValue(row.domain) || "unknown",
      titleRu: stringValue(row.titleRu),
    });
  });
  return works;
}

type ResourceCatalogAccumulator = {
  catalogId: string;
  domain: string;
  rows: number;
  forbiddenRows: number;
  forbiddenExamples: JsonRecord[];
  missingSemanticOwnerRows: number;
  missingPhysicalIdentityRows: number;
  exactTitleCounts: Map<string, number>;
  exactTitleExamples: Map<string, string>;
  titlePhysicalTypes: Map<string, Set<string>>;
  semanticOwnerCounts: Map<string, number>;
  semanticOwnerExamples: Map<string, string>;
  costOwnerCounts: Map<string, number>;
};

function newResourceAccumulator(catalogId: string, works: Map<string, WorkIdentity>): ResourceCatalogAccumulator {
  return {
    catalogId,
    domain: works.get(catalogId)?.domain ?? "unknown",
    rows: 0,
    forbiddenRows: 0,
    forbiddenExamples: [],
    missingSemanticOwnerRows: 0,
    missingPhysicalIdentityRows: 0,
    exactTitleCounts: new Map(),
    exactTitleExamples: new Map(),
    titlePhysicalTypes: new Map(),
    semanticOwnerCounts: new Map(),
    semanticOwnerExamples: new Map(),
    costOwnerCounts: new Map(),
  };
}

function duplicateGroups(
  counts: Map<string, number>,
  examples?: Map<string, string>,
): { groups: number; rows: number; excessRows: number; examples: JsonRecord[] } {
  let groups = 0;
  let rows = 0;
  let excessRows = 0;
  const outputExamples: JsonRecord[] = [];
  for (const [key, count] of counts) {
    if (!key || count < 2) continue;
    groups += 1;
    rows += count;
    excessRows += count - 1;
    if (outputExamples.length < 20) outputExamples.push({ key, titleRu: examples?.get(key) ?? null, count });
  }
  return { groups, rows, excessRows, examples: outputExamples };
}

function finishResourceAccumulator(acc: ResourceCatalogAccumulator): JsonRecord {
  const exactTitleDuplicates = duplicateGroups(acc.exactTitleCounts, acc.exactTitleExamples);
  const semanticOwnerDuplicates = duplicateGroups(acc.semanticOwnerCounts, acc.semanticOwnerExamples);
  const costOwnerDuplicates = duplicateGroups(acc.costOwnerCounts);
  const crossPhysicalTypeExamples: JsonRecord[] = [];
  let crossPhysicalTypeGroups = 0;
  for (const [title, types] of acc.titlePhysicalTypes) {
    if (types.size < 2) continue;
    crossPhysicalTypeGroups += 1;
    if (crossPhysicalTypeExamples.length < 20) {
      crossPhysicalTypeExamples.push({ titleRu: acc.exactTitleExamples.get(title), physicalTypes: [...types].sort() });
    }
  }
  const red = acc.forbiddenRows > 0 ||
    acc.missingSemanticOwnerRows > 0 ||
    acc.missingPhysicalIdentityRows > 0 ||
    exactTitleDuplicates.groups > 0 ||
    semanticOwnerDuplicates.groups > 0 ||
    costOwnerDuplicates.groups > 0 ||
    crossPhysicalTypeGroups > 0;
  return {
    catalogId: acc.catalogId,
    domain: acc.domain,
    scope: acc.domain === "asphalt" ? "IMMUTABLE_CONTROL" : "R3_REMEDIATION",
    rows: acc.rows,
    verdict: red ? "RED" : "GREEN_BY_THIS_AUDIT",
    forbiddenRows: acc.forbiddenRows,
    forbiddenExamples: acc.forbiddenExamples,
    missingSemanticOwnerRows: acc.missingSemanticOwnerRows,
    missingPhysicalIdentityRows: acc.missingPhysicalIdentityRows,
    exactTitleDuplicates,
    semanticOwnerDuplicates,
    costOwnerDuplicates,
    crossPhysicalTypeGroups,
    crossPhysicalTypeExamples,
  };
}

async function auditResources(releaseDir: string, works: Map<string, WorkIdentity>): Promise<{
  rows: number;
  ledgers: JsonRecord[];
}> {
  const ledgers: JsonRecord[] = [];
  const closedCatalogs = new Set<string>();
  let current: ResourceCatalogAccumulator | null = null;
  const rows = await readJsonl(join(releaseDir, "resources.jsonl"), (row) => {
    const catalogId = stringValue(row.catalogId);
    if (!catalogId) throw new Error("R3_RESOURCE_CATALOG_ID_MISSING");
    if (!current || current.catalogId !== catalogId) {
      if (current) {
        closedCatalogs.add(current.catalogId);
        ledgers.push(finishResourceAccumulator(current));
      }
      if (closedCatalogs.has(catalogId)) throw new Error(`R3_RESOURCE_CATALOG_ORDER_NOT_CONTIGUOUS:${catalogId}`);
      current = newResourceAccumulator(catalogId, works);
    }
    current.rows += 1;
    const titleRu = stringValue(row.titleRu);
    const normalizedTitle = normalizeRu(titleRu);
    const rowId = stringValue(row.rowId);
    const semanticOwner = stringValue(row.semanticOwner);
    const costOwnerId = stringValue(row.costOwnerId);
    const rawRowType = stringValue(row.rowType);
    const rawCategory = stringValue(row.category);
    const rowType = rawRowType || "unknown_row_type";
    const category = rawCategory || "unknown_category";
    const physicalType = `${rowType}:${category}`;
    const forbidden = FORBIDDEN_ROW_PATTERNS.filter((pattern) => normalizedTitle.includes(normalizeRu(pattern)));
    if (GENERIC_SINGLETON_TITLES.has(normalizedTitle)) forbidden.push(normalizedTitle as typeof FORBIDDEN_ROW_PATTERNS[number]);
    for (const prefix of GENERIC_ROW_PREFIXES) {
      if (normalizedTitle.startsWith(normalizeRu(prefix))) forbidden.push(prefix as typeof FORBIDDEN_ROW_PATTERNS[number]);
    }
    if (forbidden.length > 0) {
      current.forbiddenRows += 1;
      if (current.forbiddenExamples.length < 20) current.forbiddenExamples.push({ rowId, titleRu, patterns: [...new Set(forbidden)] });
    }
    if (!semanticOwner) current.missingSemanticOwnerRows += 1;
    if (!titleRu || !rowId || !rawRowType || !rawCategory) current.missingPhysicalIdentityRows += 1;
    if (normalizedTitle) {
      increment(current.exactTitleCounts, normalizedTitle);
      current.exactTitleExamples.set(normalizedTitle, titleRu);
      addSetValue(current.titlePhysicalTypes, normalizedTitle, physicalType);
    }
    if (semanticOwner) {
      increment(current.semanticOwnerCounts, semanticOwner);
      current.semanticOwnerExamples.set(semanticOwner, titleRu);
    }
    if (costOwnerId) increment(current.costOwnerCounts, costOwnerId);
  });
  if (current) ledgers.push(finishResourceAccumulator(current));
  return { rows, ledgers };
}

type ParameterRow = {
  parameterId: string;
  titleRu: string;
  valueType: string;
  unitId: string;
  required: boolean;
  constraints: unknown;
  guidePresent: boolean;
};

function countCompositeConflicts(parameters: readonly ParameterRow[]): { count: number; examples: JsonRecord[] } {
  const byId = new Map(parameters.map((parameter) => [parameter.parameterId, parameter]));
  const examples: JsonRecord[] = [];
  for (const count of parameters) {
    if (!count.parameterId.endsWith("_count")) continue;
    const base = count.parameterId.slice(0, -"_count".length);
    const candidates = [base, `${base}s`, base.replace(/_layer$/u, "_layers")];
    const composite = candidates.map((candidate) => byId.get(candidate)).find((candidate) =>
      candidate && (candidate.valueType.includes("object") || candidate.valueType.includes("array") || /сло[ий]/iu.test(candidate.titleRu)),
    );
    if (!composite) continue;
    examples.push({ countParameterId: count.parameterId, countTitleRu: count.titleRu, compositeParameterId: composite.parameterId, compositeTitleRu: composite.titleRu });
  }
  return { count: examples.length, examples: examples.slice(0, 20) };
}

function parameterGuidePresent(row: JsonRecord): boolean {
  return Boolean(
    asObject(row.guide) ||
    stringValue(row.guideShortRu) ||
    stringValue(row.guideVersion) ||
    asObject(row.guideMetadata),
  );
}

async function auditParameters(releaseDir: string, works: Map<string, WorkIdentity>): Promise<{
  rows: number;
  ledgers: JsonRecord[];
  repeatedSchemaGroups: JsonRecord[];
}> {
  const ledgers: JsonRecord[] = [];
  const schemaCatalogs = new Map<string, string[]>();
  const closedCatalogs = new Set<string>();
  let currentCatalogId = "";
  let currentParameters: ParameterRow[] = [];
  const finish = () => {
    if (!currentCatalogId) return;
    const domain = works.get(currentCatalogId)?.domain ?? "unknown";
    const titleCounts = new Map<string, number>();
    const titleExamples = new Map<string, string>();
    let internalVisibleRows = 0;
    let missingGuideRows = 0;
    for (const parameter of currentParameters) {
      const normalizedTitle = normalizeRu(parameter.titleRu);
      if (normalizedTitle) {
        increment(titleCounts, normalizedTitle);
        titleExamples.set(normalizedTitle, parameter.titleRu);
      }
      if (/^(professional_scope|scope_profile|scope_resolver)$/iu.test(parameter.parameterId)) internalVisibleRows += 1;
      if (!parameter.guidePresent) missingGuideRows += 1;
    }
    const titleDuplicates = duplicateGroups(titleCounts, titleExamples);
    const compositeConflicts = countCompositeConflicts(currentParameters);
    const signaturePayload = currentParameters.map((parameter) => ({
      parameterId: parameter.parameterId,
      titleRu: normalizeRu(parameter.titleRu),
      valueType: parameter.valueType,
      unitId: parameter.unitId,
      required: parameter.required,
      constraints: parameter.constraints,
    })).sort((a, b) => a.parameterId.localeCompare(b.parameterId, "en"));
    const schemaSha256 = sha256(JSON.stringify(signaturePayload));
    const schemaList = schemaCatalogs.get(schemaSha256) ?? [];
    schemaList.push(currentCatalogId);
    schemaCatalogs.set(schemaSha256, schemaList);
    const red = internalVisibleRows > 0 || missingGuideRows > 0 || titleDuplicates.groups > 0 || compositeConflicts.count > 0;
    ledgers.push({
      catalogId: currentCatalogId,
      domain,
      scope: domain === "asphalt" ? "GUIDANCE_UI_ALLOWLIST" : "R3_REMEDIATION",
      rows: currentParameters.length,
      verdict: red ? "RED" : "GREEN_BY_THIS_AUDIT",
      internalVisibleRows,
      missingGuideRows,
      titleDuplicates,
      compositeConflicts,
      schemaSha256,
    });
  };
  const rows = await readJsonl(join(releaseDir, "parameters.jsonl"), (row) => {
    const catalogId = stringValue(row.catalogId);
    if (!catalogId) throw new Error("R3_PARAMETER_CATALOG_ID_MISSING");
    if (catalogId !== currentCatalogId) {
      if (currentCatalogId) {
        finish();
        closedCatalogs.add(currentCatalogId);
      }
      if (closedCatalogs.has(catalogId)) throw new Error(`R3_PARAMETER_CATALOG_ORDER_NOT_CONTIGUOUS:${catalogId}`);
      currentCatalogId = catalogId;
      currentParameters = [];
    }
    currentParameters.push({
      parameterId: stringValue(row.parameterId),
      titleRu: stringValue(row.titleRu),
      valueType: stringValue(row.valueType),
      unitId: stringValue(row.unitId),
      required: row.required === true,
      constraints: row.constraints ?? null,
      guidePresent: parameterGuidePresent(row),
    });
  });
  finish();
  const repeatedSchemaGroups = [...schemaCatalogs.entries()]
    .filter(([, catalogIds]) => catalogIds.length > 1)
    .map(([schemaSha256, catalogIds]) => ({
      schemaSha256,
      catalogCount: catalogIds.length,
      catalogIds,
      domainCount: new Set(catalogIds.map((catalogId) => works.get(catalogId)?.domain ?? "unknown")).size,
    }))
    .sort((a, b) => b.catalogCount - a.catalogCount || a.schemaSha256.localeCompare(b.schemaSha256));
  return { rows, ledgers, repeatedSchemaGroups };
}

function countLedger(ledgers: readonly JsonRecord[], field: string): number {
  return ledgers.reduce((sum, ledger) => sum + (typeof ledger[field] === "number" ? ledger[field] as number : 0), 0);
}

function writeJsonl(filePath: string, rows: readonly JsonRecord[]): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const output = createWriteStream(filePath, { encoding: "utf8" });
    output.on("error", rejectPromise);
    output.on("finish", resolvePromise);
    for (const row of rows) output.write(`${JSON.stringify(row)}\n`);
    output.end();
  });
}

async function main(): Promise<void> {
  const releaseDir = resolve(process.argv[2] ?? "");
  const outputDir = resolve(process.argv[3] ?? join(process.cwd(), "artifacts", "p0-estimate-truth-remediation-r3", "package-a-truth-audit"));
  if (!process.argv[2]) throw new Error("USAGE: tsx auditPackageATruthR3.ts <release-a-dir> [output-dir]");
  await mkdir(outputDir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(releaseDir, "manifest.json"), "utf8")) as PackageManifest;
  const works = await loadWorks(releaseDir);
  const resourceAudit = await auditResources(releaseDir, works);
  const parameterAudit = await auditParameters(releaseDir, works);
  const nonAsphaltResource = resourceAudit.ledgers.filter((row) => row.domain !== "asphalt");
  const nonAsphaltParameter = parameterAudit.ledgers.filter((row) => row.domain !== "asphalt");
  const repeatedSchemaCatalogs = new Set(parameterAudit.repeatedSchemaGroups.flatMap((group) => group.catalogIds as string[]));
  const summary = {
    schemaVersion: "p0-estimate-truth-remediation-r3-package-a-audit.v1",
    generatedAt: new Date().toISOString(),
    source: {
      releaseDir,
      releaseId: manifest.releaseId ?? null,
      releaseKey: manifest.releaseKey ?? null,
      sourcePackageSha256: manifest.sourcePackageSha256 ?? null,
      manifestExpected: manifest.actual ?? null,
    },
    exactCounts: {
      works: works.size,
      resourceRows: resourceAudit.rows,
      parameterRows: parameterAudit.rows,
      nonAsphaltCatalogs: [...works.values()].filter((work) => work.domain !== "asphalt").length,
      asphaltCatalogs: [...works.values()].filter((work) => work.domain === "asphalt").length,
      nonAsphaltResourceRedCatalogs: nonAsphaltResource.filter((row) => row.verdict === "RED").length,
      nonAsphaltParameterRedCatalogs: nonAsphaltParameter.filter((row) => row.verdict === "RED").length,
      forbiddenResourceRows: countLedger(nonAsphaltResource, "forbiddenRows"),
      missingResourceSemanticOwnerRows: countLedger(nonAsphaltResource, "missingSemanticOwnerRows"),
      missingPhysicalIdentityRows: countLedger(nonAsphaltResource, "missingPhysicalIdentityRows"),
      missingParameterGuideRows: countLedger(nonAsphaltParameter, "missingGuideRows"),
      internalParameterRows: countLedger(nonAsphaltParameter, "internalVisibleRows"),
      compositeConflictCatalogs: nonAsphaltParameter.filter((row) => (asObject(row.compositeConflicts)?.count as number ?? 0) > 0).length,
      repeatedParameterSchemaGroups: parameterAudit.repeatedSchemaGroups.length,
      catalogsInRepeatedParameterSchemaGroups: repeatedSchemaCatalogs.size,
    },
    verdict: "RED_DIAGNOSTIC_ONLY_NO_ACTIVATION",
    notesRu: [
      "Это read-only аудит quarantined package A; он не изменяет Asphalt и не активирует B9.",
      "Точное remediation требует отдельного per-ID disposition, независимого oracle и повторной упаковки successor.",
      "Совпадение заголовка само по себе не доказывает дубль; cross-type и semantic-owner конфликты являются приоритетными кандидатами на double-count.",
    ],
  };
  await Promise.all([
    writeFile(join(outputDir, "SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeJsonl(join(outputDir, "RESOURCE_AUDIT_BY_CATALOG.jsonl"), resourceAudit.ledgers),
    writeJsonl(join(outputDir, "PARAMETER_AUDIT_BY_CATALOG.jsonl"), parameterAudit.ledgers),
    writeJsonl(join(outputDir, "REPEATED_PARAMETER_SCHEMAS.jsonl"), parameterAudit.repeatedSchemaGroups),
    writeJsonl(join(outputDir, "JOURNAL_RU.jsonl"), [{
      timestamp: new Date().toISOString(),
      status: "RED",
      actionRu: "Выполнен read-only аудит параметров и BOQ package A по всем catalog_id.",
      resultRu: "Сформированы точные счётчики и per-ID ledgers; активация не выполнялась.",
      sourcePackageSha256: manifest.sourcePackageSha256 ?? null,
    }]),
  ]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
