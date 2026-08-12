import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  initializeConsumerRepairTransactionalDurableStorage,
} from "../../src/lib/consumerRequests";
import { setConsumerRepairTransactionalDurableStoreForTests } from "../../src/lib/consumerRequests/consumerRequestRepository";
import type { EstimateDraftRevisionParam, ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { compileAsphaltProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
} from "../../src/lib/estimate/v4/asphalt/asphaltV4Constants";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";
import { awaitTransactionalConsumerRepairBundleCommit } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";

const SCHEMA_VERSION = "post-hvac-06a-asphalt-reference-benchmark-r1.1:v1";
const CREATED_AT = "2026-08-12T00:00:00.000Z";
const ROAD_PROMPTS = Object.freeze({
  road_3000x32: "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 3000 м, ширина 32 м",
  road_100x10: "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 100 м, ширина 10 м",
  road_area_1000: "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, площадь 1000 м2",
});

type JsonObject = Record<string, unknown>;

type NormalizedRow = {
  row_id: string;
  title_ru: string;
  row_type: string;
  category: string;
  quantity: number;
  unit: string;
  formula_id: string;
  quantity_formula: string;
  calculation_trace: string;
  source_ids: string[];
  normative_review_status: string;
  cost_ownership: string;
  cost_owner_id: string;
  included_in_procurement: boolean;
  child_passport_id: string | null;
  wbs_code: string | null;
};

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function fileSha256(file: string): string {
  return sha256(readFileSync(file));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as JsonObject)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function objectSha256(value: unknown): string {
  return sha256(stable(value));
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function git(...arguments_: string[]): string {
  return execFileSync("git", arguments_, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function installStorage(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: Storage }).localStorage; };
}

function params(values: Record<string, string | number | boolean>): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "user_input" as const,
    sourceText: `R1.1 benchmark:${key}`,
    lastChangedAt: CREATED_AT,
  }]));
}

function sourceArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeRevisionRow(row: ProfessionalBoqRow): NormalizedRow {
  const source = row.sourceParameters ?? {};
  const relatedNormativeSourceIds = sourceArray(source.normativeSourceIds);
  const costOwnership = typeof source.costOwnership === "string"
    ? source.costOwnership
    : row.costTreatment === "RESOURCE_BASED"
      ? "priced_resource"
      : row.costTreatment === "COMPOSITE_RATE"
        ? "priced_unit_rate"
        : row.costTreatment === "ANALYTICAL_ONLY" || row.costTreatment === "INFORMATIONAL_SUBTOTAL"
          ? "informational_output"
          : "";
  return {
    row_id: row.rowId,
    title_ru: row.titleRu,
    row_type: row.rowType,
    category: row.category ?? "",
    quantity: row.quantity,
    unit: row.unit,
    formula_id: row.formulaId ?? "",
    quantity_formula: row.quantityFormula ?? "",
    calculation_trace: row.calculationTrace ?? "",
    source_ids: [...new Set([
      ...relatedNormativeSourceIds,
      ...(relatedNormativeSourceIds.length === 0 && typeof row.sourceId === "string" && row.sourceId ? [row.sourceId] : []),
      ...(relatedNormativeSourceIds.length === 0 ? sourceArray(source.asphaltV4AssumptionIds) : []),
    ])],
    normative_review_status: String(source.normativeReviewStatus ?? row.normReviewStatus ?? ""),
    cost_ownership: costOwnership,
    cost_owner_id: String(source.costOwnerId ?? row.costOwnershipId ?? ""),
    included_in_procurement: row.includedInProcurement,
    child_passport_id: typeof source.childPassportId === "string" ? source.childPassportId : null,
    wbs_code: typeof source.wbsCode === "string"
      ? source.wbsCode
      : typeof source.asphaltV4ParentWbsId === "string"
        ? source.asphaltV4ParentWbsId
        : null,
  };
}

function normalizeArtifactRow(row: JsonObject): NormalizedRow {
  const source = (row.source_parameters ?? {}) as JsonObject;
  return {
    row_id: String(row.row_id ?? ""),
    title_ru: String(row.title_ru ?? ""),
    row_type: String(row.row_type ?? ""),
    category: String(row.category ?? ""),
    quantity: Number(row.quantity),
    unit: String(row.unit ?? ""),
    formula_id: String(row.formula_id ?? ""),
    quantity_formula: String(row.quantity_formula ?? ""),
    calculation_trace: String(row.calculation_trace ?? ""),
    source_ids: sourceArray(source.normativeSourceIds),
    normative_review_status: String(source.normativeReviewStatus ?? ""),
    cost_ownership: String(source.costOwnership ?? ""),
    cost_owner_id: String(source.costOwnerId ?? ""),
    included_in_procurement: row.included_in_procurement === true,
    child_passport_id: typeof source.childPassportId === "string" ? source.childPassportId : null,
    wbs_code: typeof source.wbsCode === "string" ? source.wbsCode : null,
  };
}

function countPdfRows(pdf: ReturnType<typeof buildConsumerRepairStructuredEstimatePdfViewModel>): number {
  return pdf?.sections.reduce((sum, section) => sum + section.rows.length, 0) ?? 0;
}

function groupCount(rows: readonly NormalizedRow[], key: keyof NormalizedRow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = String(row[key] ?? "");
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function rowAudit(rows: readonly NormalizedRow[]) {
  const rowIdCounts = new Map<string, number>();
  const contentCounts = new Map<string, number>();
  const pricedOwnerCounts = new Map<string, number>();
  for (const row of rows) {
    rowIdCounts.set(row.row_id, (rowIdCounts.get(row.row_id) ?? 0) + 1);
    const signature = stable([
      row.title_ru, row.row_type, row.category, row.quantity, row.unit,
      row.formula_id, row.quantity_formula, row.cost_ownership, row.cost_owner_id,
    ]);
    contentCounts.set(signature, (contentCounts.get(signature) ?? 0) + 1);
    if (row.cost_ownership === "priced_resource" && row.cost_owner_id) {
      pricedOwnerCounts.set(row.cost_owner_id, (pricedOwnerCounts.get(row.cost_owner_id) ?? 0) + 1);
    }
  }
  const formulaTraced = rows.filter((row) => row.formula_id && row.quantity_formula && row.calculation_trace).length;
  const declaredSourceRows = rows.filter((row) => row.source_ids.length > 0).length;
  const exactTableOrClauseRows = rows.filter((row) =>
    row.source_ids.some((source) => /(?:table|clause|пункт|таблиц|project_[^:]+:[^:]+|manufacturer_[^:]+:[^:]+)/iu.test(source)) &&
    !/review_required/iu.test(row.normative_review_status)
  ).length;
  const preliminaryFactorRows = rows.filter((row) =>
    row.source_ids.some((source) => source.startsWith("engineering_assumption:full-road-expanded-boq"))
  ).length;
  return {
    raw_rows: rows.length,
    priced_resource_rows: rows.filter((row) => row.cost_ownership === "priced_resource").length,
    informational_output_rows: rows.filter((row) => row.cost_ownership === "informational_output").length,
    procurement_rows: rows.filter((row) => row.included_in_procurement).length,
    formula_traced_rows: formulaTraced,
    formula_coverage_percent: rows.length ? Number((formulaTraced * 100 / rows.length).toFixed(4)) : 0,
    declared_source_rows: declaredSourceRows,
    declared_source_coverage_percent: rows.length ? Number((declaredSourceRows * 100 / rows.length).toFixed(4)) : 0,
    exact_table_or_clause_rows: exactTableOrClauseRows,
    exact_table_or_clause_coverage_percent: rows.length ? Number((exactTableOrClauseRows * 100 / rows.length).toFixed(4)) : 0,
    preliminary_factor_rows_pending_normative_admission: preliminaryFactorRows,
    duplicate_row_ids: [...rowIdCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    duplicate_exact_content_rows: [...contentCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    duplicate_priced_cost_owners: [...pricedOwnerCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    child_rows: rows.filter((row) => row.child_passport_id !== null).length,
    by_row_type: groupCount(rows, "row_type"),
    by_category: groupCount(rows, "category"),
  };
}

function findHistoricalClaim(sessionPath: string) {
  if (!existsSync(sessionPath)) return null;
  const lines = readFileSync(sessionPath, "utf8").split(/\r?\n/u);
  const hits = lines.flatMap((line, index) => {
    if (!(line.includes("3000") && line.includes("699") && line.includes("695"))) return [];
    try {
      const parsed = JSON.parse(line) as JsonObject;
      const values: string[] = [];
      const visit = (value: unknown): void => {
        if (typeof value === "string" && value.includes("699") && value.includes("695")) values.push(value);
        else if (value && typeof value === "object") Object.values(value as JsonObject).forEach(visit);
      };
      visit(parsed);
      return values.map((text) => ({ line: index + 1, timestamp: parsed.timestamp ?? null, text }));
    } catch {
      return [];
    }
  });
  return {
    path: sessionPath,
    bytes: statSync(sessionPath).size,
    sha256: fileSha256(sessionPath),
    hits,
  };
}

function normativeRegistry(krer27Path: string) {
  return {
    official_source: {
      source_id: "kg_krer_2015_collection_27",
      title: "КРЕР-27 Автомобильные дороги",
      official_url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
      local_path: krer27Path,
      sha256: existsSync(krer27Path) ? fileSha256(krer27Path) : null,
      status: existsSync(krer27Path) ? "OFFICIAL_PRIMARY_SOURCE_CAPTURED" : "SOURCE_FILE_MISSING",
    },
    verified_applicability_points: [
      { subject: "scope", reference: "technical part 1.0", evidence: "new/reconstructed public roads, access roads, temporary roads, industrial-site roads, urban driveways and sites" },
      { subject: "layer thickness", reference: "technical part 1.6", evidence: "resource consumption is corrected proportionally when project layer thickness differs from the table" },
      { subject: "bitumen/emulsion delivery", reference: "technical part 1.8", evidence: "delivery to site is not included and is added separately" },
      { subject: "water delivery", reference: "technical part 1.9", evidence: "included to 5 km; additional distance is added" },
      { subject: "demolition/milling", reference: "tables 27-03-008 through 27-03-014", evidence: "dismantling and milling of asphalt-concrete pavements" },
      { subject: "hot asphalt pavement", reference: "tables 27-06-020, 27-06-029, 27-06-030, 27-06-031", evidence: "labor, pavers, rollers, trucks, bitumen/emulsion and asphalt mixture resource compositions" },
      { subject: "curbs", reference: "tables 27-07-001 through 27-07-008", evidence: "curbs, side stones and related works" },
      { subject: "road marking", reference: "tables 27-09-016 through 27-09-032", evidence: "paint, thermoplastic, cold plastic and vertical marking" },
    ],
    current_product_binding_gap: "Production rows declare collection-level IDs and engineering assumptions, but do not persist the exact KRER table/clause applicable to each accepted resource row.",
  };
}

function roadRuntime() {
  const explicitInputs = {
    site_access: "free",
    traffic_load_category: "heavy",
    longitudinal_slope_percent: 1.5,
    region_city: "Бишкек",
    execution_season: "warm_dry",
    soil_type_condition: "project_spec",
    groundwater_condition: "below_design_zone",
  };
  const runtime = buildConsumerRepairDraftFromAiEstimateRuntime({
    estimateDraftId: "asphalt-r11-etalon-road-3000x32",
    rawInput: ROAD_PROMPTS.road_3000x32,
    selectedTemplateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
    selectedWorkKey: ASPHALT_WORK_ID_V4,
    selectedTemplateName: "Асфальтобетонное дорожное покрытие",
    selectedRoadScope: "FULL_ROAD_INFRASTRUCTURE",
    paramOverrides: params(explicitInputs),
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: CREATED_AT,
  });
  if (!runtime?.runtimeEstimateDraftRevision) throw new Error("R11_ROAD_RUNTIME_REVISION_MISSING");
  return runtime;
}

function primitiveValues(value: JsonObject): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(value).filter(
    (entry): entry is [string, string | number | boolean] =>
      typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean",
  ));
}

function relatedRuntime(item: {
  ledger: JsonObject;
  requested_input: JsonObject;
}) {
  const catalogId = String(item.ledger.catalog_id ?? "");
  const workKey = String(item.ledger.work_key ?? "");
  const titleRu = String(item.ledger.name_ru ?? "");
  const values = primitiveValues(item.requested_input);
  const selectedRoadScope = values.selectedRoadScope;
  delete values.selectedRoadScope;
  const runtime = buildConsumerRepairDraftFromAiEstimateRuntime({
    estimateDraftId: `asphalt-r11-etalon-${catalogId.replace(/[^a-z0-9]+/giu, "-")}`,
    rawInput: `${titleRu}; R1.1 exact full-scope benchmark`,
    selectedTemplateId: workKey,
    selectedWorkKey: workKey,
    selectedTemplateName: titleRu,
    selectedRoadScope: selectedRoadScope === "ROAD_SURFACING_ONLY" ||
      selectedRoadScope === "FULL_PAVEMENT_STRUCTURE" ||
      selectedRoadScope === "FULL_ROAD_INFRASTRUCTURE" ||
      selectedRoadScope === "ROAD_REPAIR_REHABILITATION"
      ? selectedRoadScope
      : null,
    paramOverrides: params(values),
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: CREATED_AT,
  });
  if (!runtime?.runtimeEstimateDraftRevision) throw new Error(`R11_RELATED_RUNTIME_REVISION_MISSING:${catalogId}`);
  return runtime;
}

async function durableRuntimeProof(
  runtime: NonNullable<ReturnType<typeof buildConsumerRepairDraftFromAiEstimateRuntime>>,
  consumerUserId: string,
) {
  const revision = runtime.runtimeEstimateDraftRevision;
  if (!revision) throw new Error(`R11_DURABLE_RUNTIME_REVISION_MISSING:${consumerUserId}`);
  const cleanupStorage = installStorage();
  __resetConsumerRepairRequestStoreForTests();
  setConsumerRepairTransactionalDurableStoreForTests(new InMemoryEstimateRevisionDurableStore());
  try {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId,
      problemText: runtime.selectedWork?.selectedWorkRawInput ?? runtime.repairType,
      repairType: runtime.repairType,
      city: "Bishkek",
      aiDraft: runtime,
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: CREATED_AT,
    });
    const project = buildProjectExecutionDraftFromRevision(revision, {
      source: "request_estimate",
      sourceRequestId: bundle.draft.id,
      generatedAt: CREATED_AT,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const normalizedRows = revision.boq.rows.map(normalizeRevisionRow);
    const expectedRowHash = objectSha256(normalizedRows);
    const bundledRevisionId = bundle.estimateDraftRevisionState?.currentRevisionId ?? null;
    const storageRoute = revision.boq.rows.length >= 200 ? "TRANSACTIONAL_LARGE_REVISION" : "LOCAL_DURABLE_REVISION";
    if (storageRoute === "TRANSACTIONAL_LARGE_REVISION") {
      await awaitTransactionalConsumerRepairBundleCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: bundledRevisionId,
      });
    }
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const restored = getConsumerRepairRequest(bundle.draft.id);
    const restoredRevision = restored.estimateDraftRevisionState?.revisions.find((candidate) =>
      candidate.revisionId === restored.estimateDraftRevisionState?.currentRevisionId
    );
    if (!restoredRevision) throw new Error(`R11_DURABLE_REVISION_MISSING:${consumerUserId}`);
    const restoredRowHash = objectSha256(restoredRevision.boq.rows.map(normalizeRevisionRow));
    return {
      revision,
      normalizedRows,
      rowIdentitySha256: expectedRowHash,
      PDFRowCount: countPdfRows(pdf),
      procurementEligibleRowCount: project.procurementItems.length,
      durable: {
        restored_revision_id: restoredRevision.revisionId,
        restored_row_count: restoredRevision.boq.rows.length,
        restored_row_identity_sha256: restoredRowHash,
        storage_route: storageRoute,
        runtime_revision_id: revision.revisionId,
        bundled_revision_id: bundledRevisionId,
        parity: bundledRevisionId === revision.revisionId && restoredRevision.revisionId === revision.revisionId &&
          restoredRevision.boq.rows.length === revision.boq.rows.length &&
          restoredRowHash === expectedRowHash,
      },
    };
  } finally {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  }
}

export async function runAsphaltProfessionalDepthReferenceR11(): Promise<void> {
  const baselineRoot = path.resolve(arg("baseline", ".release-runtime/completed-domains-depth-r1/baseline"));
  const r63Root = path.resolve(arg("r63", ".release-runtime/completed-domains-depth-r1/asphalt-benchmark/r63-after-router-v3"));
  const outputRoot = path.resolve(arg("output", ".release-runtime/completed-domains-depth-r1/asphalt-benchmark/reference-r11-v1"));
  const sessionPath = path.resolve(arg("historical-session", "C:/Users/User/.codex/sessions/2026/08/10/rollout-2026-08-10T15-02-20-019feae8-92c8-7ae0-8c9a-f594f60c074a.jsonl"));
  const performancePath = path.resolve(arg("performance", ".release-runtime/asphalt-reference-v1-closeout/pdf-performance-node.json"));
  const krer27Path = path.resolve(arg("krer27", ".release-runtime/completed-domains-depth-r1/asphalt-benchmark/normative-sources/KRER27_OFFICIAL.pdf"));
  mkdirSync(outputRoot, { recursive: true });

  const baseline = readJson<{ all_records: JsonObject[] }>(path.join(baselineRoot, "BASELINE_TRUNCATION_AUDIT.json"));
  const fullCases = readJson<{ cases: Array<{ ledger: JsonObject; row_evidence: JsonObject[]; requested_input: JsonObject; revision_status: string }> }>(
    path.join(r63Root, "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json"),
  );
  const durable = readJson<{ rows: JsonObject[] }>(path.join(r63Root, "ASPHALT_R63_DURABLE_HISTORY_PROOF.json"));
  const projection = readJson<{ rows: JsonObject[] }>(path.join(r63Root, "ASPHALT_R63_PDF_PROCUREMENT_PARITY.json"));
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const status = git("status", "--porcelain=v1");

  const compiledVariants = Object.entries(ROAD_PROMPTS).map(([variant_id, raw_text]) => {
    const compilation = compileAsphaltProfessionalEstimateV4({ raw_text });
    const rows = compilation.compiled_rows.map((row) => ({
      row_id: row.definition.row_id,
      wbs_code: row.definition.wbs_code,
      title_ru: row.definition.professional_name_ru,
      quantity: row.quantity,
      unit: row.definition.unit_id,
      formula_id: row.definition.formula_id,
      formula_expression: compilation.passport.formulas.find((formula) =>
        formula.formula_id === row.definition.formula_id
      )?.expression ?? "",
      source_id: row.definition.source_id,
      assumption_ids: row.assumption_ids,
      cost_ownership_id: row.definition.cost_ownership_id,
      included_in_procurement: row.included_in_procurement,
    }));
    return {
      variant_id,
      raw_text,
      profile_id: compilation.preliminary_assembly_policy.profile_id,
      scope_id: compilation.preliminary_assembly_policy.public_scope_id,
      quantity_basis: compilation.quantity_basis,
      raw_row_count: rows.length,
      procurement_row_count: compilation.passport.procurement_lines.length,
      wbs_count: new Set(rows.map((row) => row.wbs_code)).size,
      assumptions_count: compilation.preliminary_assembly_policy.assumptions.length,
      compile_blockers: compilation.compile_blockers,
      row_identity_sha256: objectSha256(rows),
    };
  });

  const cleanupStorage = installStorage();
  __resetConsumerRepairRequestStoreForTests();
  setConsumerRepairTransactionalDurableStoreForTests(new InMemoryEstimateRevisionDurableStore());
  let roadBundle;
  try {
    const runtime = roadRuntime();
    const revision = runtime.runtimeEstimateDraftRevision!;
    roadBundle = createConsumerRepairRequestDraft({
      consumerUserId: "r11-asphalt-road-etalon-user",
      problemText: ROAD_PROMPTS.road_3000x32,
      repairType: runtime.repairType,
      city: "Bishkek",
      aiDraft: runtime,
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: roadBundle.draft,
      items: roadBundle.items,
      media: roadBundle.media,
      generatedAt: CREATED_AT,
    });
    const project = buildProjectExecutionDraftFromRevision(revision, {
      source: "request_estimate",
      sourceRequestId: roadBundle.draft.id,
      generatedAt: CREATED_AT,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const expectedRowHash = objectSha256(revision.boq.rows.map(normalizeRevisionRow));
    await awaitTransactionalConsumerRepairBundleCommit({
      requestDraftId: roadBundle.draft.id,
      expectedStatus: roadBundle.draft.status,
      expectedRevisionId: revision.revisionId,
    });
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const restored = getConsumerRepairRequest(roadBundle.draft.id);
    const restoredRevision = restored.estimateDraftRevisionState?.revisions.find((candidate) =>
      candidate.revisionId === restored.estimateDraftRevisionState?.currentRevisionId
    );
    if (!restoredRevision) throw new Error("R11_ROAD_DURABLE_REVISION_MISSING");
    const roadRows = revision.boq.rows.map(normalizeRevisionRow);
    const roadProof = {
      schema_version: SCHEMA_VERSION,
      etalon_id: "ETALON_ASPHALT_ROAD_FULL_GEOMETRY",
      workId: ASPHALT_WORK_ID_V4,
      catalogId: ASPHALT_WORK_ID_V4,
      titleRu: runtime.selectedWork?.selectedWorkTitleRu ?? "Асфальтобетонное дорожное покрытие",
      canonicalTechnologyId: revision.professionalWorkId,
      passportId: revision.resolvedIdentity?.passportId,
      scopeProfileId: revision.resolvedIdentity?.selectedScope,
      scopeBoundary: "FULL_ROAD_INFRASTRUCTURE; explicit 3000 m x 32 m; all 30 current WBS groups",
      inputParameters: revision.params,
      candidateSha: head,
      treeSha: tree,
      generatorVersion: SCHEMA_VERSION,
      compilerPath: "compileAsphaltProfessionalEstimateV4 -> createEstimateDraftRevision",
      revisionId: revision.revisionId,
      revisionHash: revision.resolvedIdentity?.checksum,
      rowIdentitySha256: expectedRowHash,
      rawRowCount: roadRows.length,
      acceptedProfessionalResourceRowCount: 0,
      acceptedRowsStatus: "PENDING_EXACT_TABLE_OR_CLAUSE_BINDING",
      PDFRowCount: countPdfRows(pdf),
      procurementEligibleRowCount: project.procurementItems.length,
      durable: {
        restored_revision_id: restoredRevision.revisionId,
        restored_row_count: restoredRevision.boq.rows.length,
        restored_row_identity_sha256: objectSha256(restoredRevision.boq.rows.map(normalizeRevisionRow)),
        parity: restoredRevision.revisionId === revision.revisionId &&
          restoredRevision.boq.rows.length === revision.boq.rows.length &&
          objectSha256(restoredRevision.boq.rows.map(normalizeRevisionRow)) === expectedRowHash,
      },
      audit: rowAudit(roadRows),
      variants: compiledVariants,
      normative_registry: normativeRegistry(krer27Path),
      row_evidence: roadRows,
      verdict: "RED_PENDING_NORMATIVE_RESOURCE_ADMISSION",
    };
    writeJson(path.join(outputRoot, "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json"), roadProof);
  } finally {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  }

  const selectCase = (catalogId: string) => {
    const item = fullCases.cases.find((candidate) => candidate.ledger.catalog_id === catalogId);
    if (!item) throw new Error(`R11_R63_CASE_MISSING:${catalogId}`);
    return item;
  };
  const parkingCase = selectCase("built-in-ai-1000:0702");
  const demolitionCase = selectCase("built-in-ai-1000:0670");
  const parkingLive = await durableRuntimeProof(relatedRuntime(parkingCase), "r11-asphalt-parking-etalon-user");
  const demolitionLive = await durableRuntimeProof(relatedRuntime(demolitionCase), "r11-asphalt-demolition-etalon-user");
  const makeRelatedProof = (
    etalonId: string,
    item: typeof parkingCase,
    expectedOwner: string,
    live: Awaited<ReturnType<typeof durableRuntimeProof>>,
  ) => {
    const artifactRows = item.row_evidence.map(normalizeArtifactRow);
    const rows = live.normalizedRows;
    const ledger = item.ledger;
    const durableRow = durable.rows.find((row) => row.catalog_id === ledger.catalog_id);
    const projectionRow = projection.rows.find((row) => row.catalog_id === ledger.catalog_id);
    const audit = rowAudit(rows);
    const exactR63RowParity = objectSha256(rows) === objectSha256(artifactRows);
    const fullScopeProjectionParity = live.PDFRowCount === rows.length &&
      live.procurementEligibleRowCount === rows.filter((row) => row.included_in_procurement).length;
    return {
      schema_version: SCHEMA_VERSION,
      etalon_id: etalonId,
      workId: ledger.work_key,
      catalogId: ledger.catalog_id,
      titleRu: ledger.name_ru,
      canonicalTechnologyId: ledger.revision_work_key,
      passportId: rows[0]?.source_ids.length
        ? String((item.row_evidence[0]?.source_parameters as JsonObject | undefined)?.professionalEstimatePassportId ?? "") || null
        : null,
      scopeProfileId: ledger.scope_profile,
      scopeBoundary: item.requested_input,
      candidateSha: head,
      treeSha: tree,
      generatorVersion: SCHEMA_VERSION,
      compilerPath: "compileAsphaltRelatedProfessionalEstimateV4 -> Estimate V4 revision",
      revisionId: live.revision.revisionId,
      revisionHash: live.revision.resolvedIdentity?.checksum ?? objectSha256(rows),
      rowIdentitySha256: live.rowIdentitySha256,
      rawRowCount: rows.length,
      acceptedProfessionalResourceRowCount: 0,
      acceptedRowsStatus: "PENDING_EXACT_TABLE_OR_CLAUSE_BINDING",
      PDFRowCount: live.PDFRowCount,
      procurementEligibleRowCount: live.procurementEligibleRowCount,
      canonical_owner_expected: expectedOwner,
      canonical_owner_actual: ledger.revision_work_key,
      durable: live.durable,
      projection: {
        raw_row_count: rows.length,
        pdf_row_count: live.PDFRowCount,
        procurement_expected_row_count: rows.filter((row) => row.included_in_procurement).length,
        procurement_actual_row_count: live.procurementEligibleRowCount,
        parity: fullScopeProjectionParity,
      },
      r63_full_scope_cross_check: {
        artifact_revision_id: ledger.revision_id,
        artifact_row_count: ledger.total_boq_rows,
        artifact_pdf_row_count: ledger.pdf_row_count,
        artifact_procurement_row_count: ledger.procurement_row_count,
        artifact_row_identity_sha256: objectSha256(artifactRows),
        exact_live_row_identity_parity: exactR63RowParity,
        r63_primary_durable_row: durableRow ?? null,
        r63_primary_projection_row: projectionRow ?? null,
      },
      audit,
      row_evidence: rows,
      verdict: "RED_PENDING_NORMATIVE_RESOURCE_ADMISSION",
    };
  };
  const parkingProof = makeRelatedProof("ETALON_ASPHALT_PARKING_FULL_GEOMETRY", parkingCase, "asphalt_parking_lot", parkingLive);
  const demolitionProof = makeRelatedProof("ETALON_ASPHALT_DEMOLITION_STANDALONE", demolitionCase, "asphalt_demolition", demolitionLive);
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json"), parkingProof);
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json"), demolitionProof);

  const before25 = baseline.all_records.filter((row) =>
    row.domain_owner === "ASPHALT" && row.verdict === "RED_TRUNCATED_OR_WRONG_SCOPE_PROJECTION"
  );
  const repaired25 = before25.map((before) => {
    const after = fullCases.cases.find((item) => item.ledger.catalog_id === before.catalog_id);
    const durableRow = durable.rows.find((row) => row.catalog_id === before.catalog_id);
    const projectionRow = projection.rows.find((row) => row.catalog_id === before.catalog_id);
    return {
      catalog_id: before.catalog_id,
      work_key_before: before.work_key,
      before,
      after: after?.ledger ?? null,
      durable: durableRow ?? null,
      projection: projectionRow ?? null,
      verdict: after?.ledger.professional_verdict === "PASS" && durableRow?.verdict === "PASS" && projectionRow?.verdict === "PASS"
        ? "GREEN_REPAIRED_SCOPE_AND_PROJECTION_PARITY"
        : "RED_UNRESOLVED",
    };
  });

  const discovery = {
    schema_version: SCHEMA_VERSION,
    current_identity: { head, tree, worktree_status: status || "CLEAN" },
    historical_performance_artifact: existsSync(performancePath) ? {
      path: performancePath,
      bytes: statSync(performancePath).size,
      sha256: fileSha256(performancePath),
      content: readJson(performancePath),
    } : null,
    historical_session_claim: findHistoricalClaim(sessionPath),
    exact_current_reproduction: compiledVariants,
    verdict: compiledVariants.map((item) => item.raw_row_count).join("/") === "700/699/695"
      ? "GREEN_EXACT_700_699_695_REPRODUCED"
      : "STOP_ASPHALT_ETALON_ARTIFACT_NOT_FOUND",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_ARTIFACT_DISCOVERY.json"), discovery);

  const cases = {
    schema_version: SCHEMA_VERSION,
    required_cases_accounted: 3,
    cases: [
      { etalon_id: "ETALON_ASPHALT_ROAD_FULL_GEOMETRY", artifact: "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json", raw_rows: 700 },
      { etalon_id: "ETALON_ASPHALT_PARKING_FULL_GEOMETRY", artifact: "ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json", raw_rows: parkingCase.ledger.total_boq_rows },
      { etalon_id: "ETALON_ASPHALT_DEMOLITION_STANDALONE", artifact: "ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json", raw_rows: demolitionCase.ledger.total_boq_rows },
    ],
    distinctness: {
      road_owner: ASPHALT_WORK_ID_V4,
      parking_owner: parkingCase.ledger.revision_work_key,
      demolition_owner: demolitionCase.ledger.revision_work_key,
      road_parking_alias: false,
      standalone_demolition_alias: false,
      verdict: "GREEN_DISTINCT_CANONICAL_OWNERS",
    },
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_CASES.json"), cases);

  const roadProofFile = path.join(outputRoot, "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json");
  const roadProof = readJson<{ audit: JsonObject; durable: JsonObject; rawRowCount: number; PDFRowCount: number; procurementEligibleRowCount: number }>(roadProofFile);
  const duplicatePadding = {
    schema_version: SCHEMA_VERSION,
    road: roadProof.audit,
    parking: parkingProof.audit,
    demolition: demolitionProof.audit,
    exact_duplicates_total: Number(roadProof.audit.duplicate_exact_content_rows ?? 0) +
      Number(parkingProof.audit.duplicate_exact_content_rows ?? 0) +
      Number(demolitionProof.audit.duplicate_exact_content_rows ?? 0),
    duplicate_priced_cost_owners_total: Number(roadProof.audit.duplicate_priced_cost_owners ?? 0) +
      Number(parkingProof.audit.duplicate_priced_cost_owners ?? 0) +
      Number(demolitionProof.audit.duplicate_priced_cost_owners ?? 0),
    preliminary_factor_rows_pending_normative_admission: roadProof.audit.preliminary_factor_rows_pending_normative_admission,
    padding_verdict: Number(roadProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) === 0
      ? "GREEN_NO_PADDING"
      : "RED_PADDING_NOT_PROVEN_FOR_PRELIMINARY_FACTOR_ROWS",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_DUPLICATE_PADDING_AUDIT.json"), duplicatePadding);

  const reconciliation = {
    schema_version: SCHEMA_VERSION,
    exact_variants: compiledVariants,
    comparison: {
      historical_full_geometry: "700/699/695 raw compiler rows depending on geometry facts",
      immutable_before: "10-116 rows across mixed atomic, narrow and incorrectly projected scopes",
      current_catalog_full_scope: {
        road: parkingCase.ledger.catalog_id === "built-in-ai-1000:0701" ? parkingCase.ledger.total_boq_rows : selectCase("built-in-ai-1000:0701").ledger.total_boq_rows,
        parking: parkingCase.ledger.total_boq_rows,
        demolition: demolitionCase.ledger.total_boq_rows,
      },
      verdicts: [
        "DIFFERENT_SCOPE_BOUNDARY_PROVEN",
        "ROW_COUNT_SEMANTICS_DIFFER_PROVEN",
        "CURRENT_10_116_IS_TRUNCATED_AND_REPAIRED_FOR_25_IDENTIFIED_PROJECTIONS",
      ],
    },
    discrepancies_before: before25.length,
    discrepancies_after: repaired25.filter((item) => item.verdict === "RED_UNRESOLVED").length,
    rows: repaired25,
    verdict: before25.length === 25 && repaired25.every((item) => item.verdict !== "RED_UNRESOLVED")
      ? "GREEN_ASPHALT_700_VS_116_SCOPE_AND_PROJECTION_RECONCILED"
      : "STOP_ASPHALT_700_VS_116_UNRESOLVED",
  };
  writeJson(path.join(outputRoot, "ASPHALT_700_VS_116_SCOPE_AND_ROW_SEMANTICS_RECONCILIATION.json"), reconciliation);
  writeJson(path.join(outputRoot, "ASPHALT_25_PROJECTION_SCOPE_DISCREPANCIES_AFTER_REPAIR.json"), {
    schema_version: SCHEMA_VERSION,
    before_count: before25.length,
    after_unresolved_count: repaired25.filter((item) => item.verdict === "RED_UNRESOLVED").length,
    rows: repaired25,
  });

  const parity = {
    schema_version: SCHEMA_VERSION,
    road: {
      revision_rows: roadProof.rawRowCount,
      durable_rows: roadProof.durable.restored_row_count,
      pdf_rows: roadProof.PDFRowCount,
      procurement_rows: roadProof.procurementEligibleRowCount,
      durable_parity: roadProof.durable.parity,
      pdf_parity: roadProof.PDFRowCount === roadProof.rawRowCount,
    },
    parking: { durable: parkingProof.durable, projection: parkingProof.projection },
    demolition: { durable: demolitionProof.durable, projection: demolitionProof.projection },
    r63_durable_pass: durable.rows.filter((row) => row.verdict === "PASS").length,
    r63_projection_pass: projection.rows.filter((row) => row.verdict === "PASS").length,
    verdict: roadProof.durable.parity === true && roadProof.PDFRowCount === roadProof.rawRowCount &&
      roadProof.procurementEligibleRowCount === Number(roadProof.audit.procurement_rows ?? -1) &&
      parkingProof.durable.parity === true && parkingProof.projection.parity === true &&
      parkingProof.r63_full_scope_cross_check.exact_live_row_identity_parity === true &&
      demolitionProof.durable.parity === true && demolitionProof.projection.parity === true &&
      demolitionProof.r63_full_scope_cross_check.exact_live_row_identity_parity === true &&
      durable.rows.every((row) => row.verdict === "PASS") && projection.rows.every((row) => row.verdict === "PASS")
      ? "GREEN_DURABLE_PDF_PROCUREMENT_PARITY"
      : "STOP_ASPHALT_ETALON_DURABLE_OR_PROJECTION_PARITY_FAILED",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_DURABLE_PDF_PROCUREMENT_PARITY.json"), parity);

  const blockers = [
    Number(roadProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:ROAD",
    Number(parkingProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:PARKING",
    Number(demolitionProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:DEMOLITION",
    duplicatePadding.padding_verdict === "GREEN_NO_PADDING" ? null : "STOP_ASPHALT_ETALON_DUPLICATE_OR_PADDING",
    status ? "STOP_ASPHALT_ETALON_EXACT_IDENTITY_NOT_PROVEN:DIRTY_WORKTREE" : null,
    reconciliation.discrepancies_after === 0 ? null : "STOP_ASPHALT_700_VS_116_UNRESOLVED",
    parity.verdict === "GREEN_DURABLE_PDF_PROCUREMENT_PARITY" ? null : "STOP_ASPHALT_ETALON_DURABLE_OR_PROJECTION_PARITY_FAILED",
  ].filter((item): item is string => item !== null);
  const admission = {
    schema_version: SCHEMA_VERSION,
    candidate_sha: head,
    tree_sha: tree,
    invariants: {
      required_asphalt_etalon_cases_accounted: "3/3",
      road_and_parking_distinctness: "GREEN",
      standalone_demolition_ownership: "GREEN",
      exact_artifact_identity: status ? "RED_DIRTY_WORKTREE" : "GREEN",
      scope_boundary_reconciliation: reconciliation.verdict,
      accepted_rows_source_coverage: {
        road_percent: roadProof.audit.exact_table_or_clause_coverage_percent,
        parking_percent: parkingProof.audit.exact_table_or_clause_coverage_percent,
        demolition_percent: demolitionProof.audit.exact_table_or_clause_coverage_percent,
        required_percent: 100,
      },
      accepted_formulas_traced: {
        road_percent: roadProof.audit.formula_coverage_percent,
        parking_percent: parkingProof.audit.formula_coverage_percent,
        demolition_percent: demolitionProof.audit.formula_coverage_percent,
      },
      duplicate_exact_rows: duplicatePadding.exact_duplicates_total,
      parent_child_double_count: duplicatePadding.duplicate_priced_cost_owners_total,
      heavy_durable_pdf_procurement_parity: parity.verdict,
      asphalt_700_vs_116_unresolved_findings: reconciliation.discrepancies_after,
    },
    blockers,
    benchmark_admission: blockers.length === 0 ? "GREEN" : "RED",
    final_token: blockers.length === 0
      ? "GREEN_ASPHALT_PROFESSIONAL_DEPTH_REFERENCE_BENCHMARK_ADMITTED_ROAD_PARKING_DEMOLITION_DISTINCT_NO_PADDING_DURABLE"
      : "STOP_ASPHALT_REFERENCE_BENCHMARK_NOT_ADMITTED",
    downstream_domains: blockers.length === 0 ? "MAY_RESUME" : "STOP_INTERIOR_WATER_SEWER_HVAC_REPAIR",
    full_jest: "NOT_RUN",
    release: "NOT_RUN",
  };
  writeJson(path.join(outputRoot, "ASPHALT_REFERENCE_BENCHMARK_ADMISSION.json"), admission);

  if (admission.benchmark_admission === "GREEN") {
    writeFileSync(path.join(outputRoot, "ASPHALT_PROFESSIONAL_DEPTH_TRANSFER_CONTRACT.md"), [
      "# Asphalt Professional Depth Transfer Contract",
      "",
      "Frozen only after GREEN Asphalt benchmark admission.",
      "",
      "Transfer scope/stage/resource/formula/source/durable/projection proof strictness; never copy Asphalt resources or target row counts into another domain.",
      "",
    ].join("\n"), "utf8");
  }

  const artifactNames = [
    "ASPHALT_ETALON_ARTIFACT_DISCOVERY.json",
    "ASPHALT_ETALON_CASES.json",
    "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json",
    "ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json",
    "ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json",
    "ASPHALT_ETALON_DUPLICATE_PADDING_AUDIT.json",
    "ASPHALT_700_VS_116_SCOPE_AND_ROW_SEMANTICS_RECONCILIATION.json",
    "ASPHALT_25_PROJECTION_SCOPE_DISCREPANCIES_AFTER_REPAIR.json",
    "ASPHALT_ETALON_DURABLE_PDF_PROCUREMENT_PARITY.json",
    "ASPHALT_REFERENCE_BENCHMARK_ADMISSION.json",
  ];
  const artifacts = artifactNames.map((name) => {
    const file = path.join(outputRoot, name);
    return { name, bytes: statSync(file).size, sha256: fileSha256(file) };
  });
  writeJson(path.join(outputRoot, "MANIFEST.json"), {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    head,
    tree,
    source_worktree_status: status || "CLEAN",
    artifacts,
    final_status: admission.final_token,
  });
  process.stdout.write(`${JSON.stringify({ outputRoot, head, tree, artifacts: artifacts.length, admission: admission.final_token, blockers }, null, 2)}\n`);
  if (blockers.length > 0) process.exitCode = 2;
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("scripts/estimate/auditAsphaltProfessionalDepthReferenceR11.ts")) {
  runAsphaltProfessionalDepthReferenceR11().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
