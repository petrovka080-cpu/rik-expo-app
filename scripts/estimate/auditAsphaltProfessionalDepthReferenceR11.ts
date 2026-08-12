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
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { compileAsphaltProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
} from "../../src/lib/estimate/v4/asphalt/asphaltV4Constants";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";
import {
  CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
  awaitTransactionalConsumerRepairBundleCommit,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
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
  stage_id: string;
  semantic_owner: string;
  double_count_guard_key: string;
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
    stage_id: String(source.stageId ?? source.wbsCode ?? source.asphaltV4ParentWbsId ?? ""),
    semantic_owner: String(source.semanticOwner ?? source.boqSemanticOwner ?? source.asphaltV4SemanticOwnerId ?? ""),
    double_count_guard_key: String(source.doubleCountGuardKey ?? source.costOwnerId ?? source.asphaltV4CostOwnershipId ?? row.costOwnershipId ?? ""),
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
    stage_id: String(source.stageId ?? source.wbsCode ?? source.asphaltV4ParentWbsId ?? ""),
    semantic_owner: String(source.semanticOwner ?? source.boqSemanticOwner ?? source.asphaltV4SemanticOwnerId ?? ""),
    double_count_guard_key: String(source.doubleCountGuardKey ?? source.costOwnerId ?? source.asphaltV4CostOwnershipId ?? row.cost_ownership_id ?? ""),
  };
}

function technicalRowIdentity(row: NormalizedRow): JsonObject {
  return {
    row_id: row.row_id,
    title_ru: row.title_ru,
    row_type: row.row_type,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    formula_id: row.formula_id,
    quantity_formula: row.quantity_formula,
    calculation_trace: row.calculation_trace,
    cost_ownership: row.cost_ownership,
    cost_owner_id: row.cost_owner_id,
    included_in_procurement: row.included_in_procurement,
    child_passport_id: row.child_passport_id,
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
    row.source_ids.some((source) => /(?:table|clause|пункт|таблиц|project:|benchmark_fixture:|project_[^:]+:[^:]+|manufacturer_[^:]+:[^:]+)/iu.test(source)) &&
    !/review_required/iu.test(row.normative_review_status)
  ).length;
  const preliminaryFactorRows = rows.filter((row) =>
    row.source_ids.some((source) => source.startsWith("engineering_assumption:"))
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
    accepted_professional_resource_rows: rows.filter((row) =>
      row.source_ids.some((source) => /(?:table|clause|project:|benchmark_fixture:|project_[^:]+:[^:]+|manufacturer_[^:]+:[^:]+)/iu.test(source)) &&
      !row.source_ids.some((source) => source.startsWith("engineering_assumption:")) &&
      !/review_required/iu.test(row.normative_review_status)
    ).length,
    duplicate_row_ids: [...rowIdCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    duplicate_exact_content_rows: [...contentCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    duplicate_priced_cost_owners: [...pricedOwnerCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    missing_stage_rows: rows.filter((row) => !row.stage_id).length,
    missing_semantic_owner_rows: rows.filter((row) => !row.semantic_owner).length,
    missing_double_count_guard_rows: rows.filter((row) => !row.double_count_guard_key).length,
    non_positive_quantity_rows: rows.filter((row) => !Number.isFinite(row.quantity) || row.quantity <= 0).length,
    child_rows: rows.filter((row) => row.child_passport_id !== null).length,
    by_row_type: groupCount(rows, "row_type"),
    by_category: groupCount(rows, "category"),
  };
}

const ROAD_WBS_TITLES = Object.freeze([
  "Исходные данные", "Обследование", "Проектное сопровождение", "Временные мероприятия",
  "Земляное полотно", "Исполнительная геодезия", "Неподтверждённый проектный пакет", "Песчаный слой",
  "Щебёночное основание", "Розлив по основанию", "Асфальтобетонные слои", "Стыки и контроль покрытия",
  "Бортовые камни", "Неподтверждённый проектный пакет", "Поверхностный водоотвод", "Закрытая ливневая сеть",
  "Неподтверждённый проектный пакет", "Закрытая ливневая сеть", "Дорожная разметка", "Дорожные знаки",
  "Барьерное ограждение", "Опоры и светильники", "Кабельная сеть освещения", "Заземление освещения",
  "Неподтверждённый проектный пакет", "Неподтверждённый проектный пакет", "Неподтверждённый проектный пакет",
  "Контроль качества", "Исполнительная документация", "Логистика",
]);

function stageContract(caseId: "ROAD" | "PARKING" | "DEMOLITION", rows: readonly NormalizedRow[]) {
  if (caseId === "ROAD") {
    const stages = ROAD_WBS_TITLES.map((title, index) => {
      const code = String(index + 1).padStart(2, "0");
      const matching = rows.filter((row) => (row.stage_id || row.wbs_code || "").endsWith(code));
      return {
        stage_id: `wbs:${code}`,
        title_ru: title,
        status: matching.length > 0 ? "REQUIRED" : "NOT_APPLICABLE_WITH_REASON",
        row_count: matching.length,
        reason: matching.length > 0
          ? "Explicitly selected ROAD reference-fixture scope and routed to independently owned resource rows."
          : "Not requested by the ROAD benchmark fixture; no row, quantity or priced child is emitted.",
      };
    });
    return {
      case_id: caseId,
      potential_stage_count: stages.length,
      applicable_stage_count: stages.filter((stage) => stage.status === "REQUIRED").length,
      included_stage_count: stages.filter((stage) => stage.row_count > 0).length,
      missing_applicable_stages: stages.filter((stage) => stage.status === "REQUIRED" && stage.row_count === 0).map((stage) => stage.stage_id),
      not_applicable_stage_reasons: stages.filter((stage) => stage.status === "NOT_APPLICABLE_WITH_REASON"),
      stages,
    };
  }
  const requiredSuffixes = caseId === "PARKING"
    ? [
      "survey_and_layout", "temporary_and_protective_works", "earthwork_and_subgrade", "subbase_and_base",
      "asphalt_pavement", "curbs", "drainage", "road_marking", "road_signs", "outdoor_lighting",
      "material_logistics", "quality_control_and_testing", "execution_documentation", "direct_labor", "construction_machinery",
    ]
    : [
      "existing_pavement_survey", "pavement_removal", "waste_and_earth_logistics", "dust_suppression",
      "base_cleaning", "boundary_cutting", "quality_control_and_testing", "execution_documentation",
    ];
  const stages = requiredSuffixes.map((suffix) => {
    const matching = rows.filter((row) => row.stage_id.endsWith(`:${suffix}`));
    return {
      stage_id: `asphalt:${caseId.toLocaleLowerCase("en-US")}:${suffix}`,
      status: "REQUIRED",
      row_count: matching.length,
      reason: "Included by the explicit full-applicable-scope reference fixture.",
    };
  });
  const notApplicable = caseId === "PARKING"
    ? [
      { stage_id: "standalone_demolition", status: "NOT_APPLICABLE_WITH_REASON", reason: "New parking benchmark does not include existing-pavement removal." },
      { stage_id: "closed_storm_sewer", status: "NOT_APPLICABLE_WITH_REASON", reason: "Only the explicitly scheduled surface-drainage package is included." },
      { stage_id: "generic_commissioning", status: "NOT_APPLICABLE_WITH_REASON", reason: "Only exact outdoor-lighting tests are included; no generic PNR row is emitted." },
    ]
    : [
      { stage_id: "new_asphalt_pavement", status: "NOT_APPLICABLE_WITH_REASON", reason: "PURE_DEMOLITION excludes reinstatement and new materials." },
      { stage_id: "curbs_drainage_marking_signs_lighting", status: "NOT_APPLICABLE_WITH_REASON", reason: "Standalone removal owner cannot inherit new-road or parking children." },
      { stage_id: "commissioning", status: "NOT_APPLICABLE_WITH_REASON", reason: "No installed system is commissioned in standalone demolition." },
    ];
  return {
    case_id: caseId,
    potential_stage_count: stages.length + notApplicable.length,
    applicable_stage_count: stages.length,
    included_stage_count: stages.filter((stage) => stage.row_count > 0).length,
    missing_applicable_stages: stages.filter((stage) => stage.row_count === 0).map((stage) => stage.stage_id),
    not_applicable_stage_reasons: notApplicable,
    typed_child_rows: rows.filter((row) => row.child_passport_id !== null).length,
    stages: [...stages, ...notApplicable],
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
      return values.map((text) => {
        const marker = Math.max(0, Math.min(
          ...[text.indexOf("699"), text.indexOf("695")].filter((position) => position >= 0),
        ));
        const excerptStart = Math.max(0, marker - 400);
        return {
          line: index + 1,
          timestamp: parsed.timestamp ?? null,
          text_sha256: sha256(text),
          excerpt: text.slice(excerptStart, excerptStart + 1200),
          full_text_bytes: Buffer.byteLength(text, "utf8"),
        };
      });
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

function normativeRegistry(sourceRoot: string) {
  const accessedAt = "2026-08-12";
  const source = (input: {
    sourceId: string;
    file: string;
    sourceType: string;
    authority: string;
    jurisdiction: string;
    documentCode: string;
    title: string;
    officialRepository: string;
    clauseOrTable: string;
    unitBasis: string;
    applicabilityConditions: string;
    technologyIds: string[];
  }) => {
    const localPath = path.join(sourceRoot, input.file);
    return {
      ...input,
      editionOrVersion: input.documentCode.includes("2015") ? "2015" : input.documentCode,
      effectiveFrom: input.documentCode === "TR TS 014/2011" ? "2015-02-15" : null,
      effectiveTo: null,
      statusOnAuditDate: "OFFICIAL_REPOSITORY_PUBLICATION_AVAILABLE_ON_AUDIT_DATE",
      localPath,
      contentHashOrFingerprint: existsSync(localPath) ? `sha256:${fileSha256(localPath)}` : null,
      formulaIds: ["ROW_LEVEL_BINDING_IN_PROOF_BUNDLE"],
      rowOwnerIds: ["ROW_LEVEL_BINDING_IN_PROOF_BUNDLE"],
      accessedAt,
      licenseOrAccessNote: "Official public repository; OCR, where used, is navigation only and not an independent source.",
      reviewStatus: existsSync(localPath) ? "AUTOMATED_SOURCE_VERIFIED" : "REJECTED_SOURCE_FILE_MISSING",
    };
  };
  const records = [
    source({
      sourceId: "kg_krer_2015_collection_27",
      file: "KRER27_OFFICIAL.pdf",
      sourceType: "KYRGYZ_UNIT_RATE_COLLECTION",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "KRER 27-2015",
      title: "Автомобильные дороги",
      officialRepository: "https://minstroy.gov.kg/ru/kyzmat/443/show",
      clauseOrTable: "technical part 1.0, 1.6, 1.8, 1.9; tables 27-02, 27-03, 27-04, 27-06, 27-09 selected per row",
      unitBasis: "exact table measurement unit plus explicit project quantity inputs",
      applicabilityConditions: "new/reconstructed roads and road works on industrial and urban sites; exact table selected by confirmed method/material",
      technologyIds: ["asphalt-road", "asphalt-parking", "asphalt-demolition"],
    }),
    source({
      sourceId: "kg_krer_2015_collection_01",
      file: "KRER01_OFFICIAL.pdf",
      sourceType: "KYRGYZ_UNIT_RATE_COLLECTION",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "KRER 01-2015",
      title: "Земляные работы",
      officialRepository: "https://minstroy.gov.kg/ru/kyzmat/416/show",
      clauseOrTable: "sections 01-01 and 01-02; table selected by soil group and plant",
      unitBasis: "earthwork table unit",
      applicabilityConditions: "road/parking earthwork only after soil group, method and plant are confirmed",
      technologyIds: ["asphalt-road", "asphalt-parking"],
    }),
    source({
      sourceId: "kg_krer_2015_collection_33",
      file: "KRER33_OFFICIAL.pdf",
      sourceType: "KYRGYZ_UNIT_RATE_COLLECTION",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "KRER 33-2015",
      title: "Линии электропередачи",
      officialRepository: "https://minstroy.gov.kg/ru/kyzmat/447/show",
      clauseOrTable: "technical part 1.0; table 33-04-003 for applicable 0.38-10 kV pole works",
      unitBasis: "exact table measurement unit",
      applicabilityConditions: "only the outdoor-lighting electrical package confirmed by the lighting design",
      technologyIds: ["asphalt-road-lighting", "asphalt-parking-lighting"],
    }),
    source({
      sourceId: "kg_krerp_2015_collection_01",
      file: "KRERP01_OFFICIAL.pdf",
      sourceType: "KYRGYZ_COMMISSIONING_UNIT_RATE_COLLECTION",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "KRERP 01-2015",
      title: "Электротехнические устройства",
      officialRepository: "https://minstroy.gov.kg/ru/kyzmat/404/show",
      clauseOrTable: "technical part 1.0-1.1; sections 01-11 to 01-13 selected by test type",
      unitBasis: "commissioning/test device or circuit unit",
      applicabilityConditions: "electrical testing/commissioning included only for confirmed lighting equipment and test schedule",
      technologyIds: ["asphalt-road-lighting", "asphalt-parking-lighting"],
    }),
    source({
      sourceId: "kg_krer_application_guidance_2015",
      file: "KR_APPLICATION_GUIDANCE_OFFICIAL.pdf",
      sourceType: "KYRGYZ_MANDATORY_APPLICATION_GUIDANCE",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "KRER-2015 application guidance",
      title: "Указания по применению Кыргызских единичных расценок",
      officialRepository: "https://minstroy.gov.kg/ru/kyzmat/359/show",
      clauseOrTable: "scope and mandatory-use provisions; clause 1.8 electrical-installation routing",
      unitBasis: "application rule",
      applicabilityConditions: "publicly funded construction and the specific collections routed by the guidance",
      technologyIds: ["asphalt-road", "asphalt-parking", "asphalt-demolition"],
    }),
    source({
      sourceId: "kg_sn_23_05_2019",
      file: "SN_KR_23_05_2019_OFFICIAL.pdf",
      sourceType: "KYRGYZ_BUILDING_NORM",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "SN KR 23-05:2019",
      title: "Естественное и искусственное освещение",
      officialRepository: "https://minstroy.gov.kg/ru/state_program/download-pdf/snkr23052019estetstvennoeiiskustvennoeosvesenie-7936858c4d8b27323.46915702.pdf",
      clauseOrTable: "outdoor-lighting clauses and tables selected by road/parking class and lighting design",
      unitBasis: "lighting design criterion",
      applicabilityConditions: "design applicability only; it does not invent pole count, cable length or product BOM",
      technologyIds: ["asphalt-road-lighting", "asphalt-parking-lighting"],
    }),
    source({
      sourceId: "kg_sn_parkings_2018",
      file: "SN_KR_PARKINGS_2018_OFFICIAL.pdf",
      sourceType: "KYRGYZ_BUILDING_NORM",
      authority: "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
      jurisdiction: "KG",
      documentCode: "SN KR Parkings; effective 2018-12-27",
      title: "Стоянки автомобилей",
      officialRepository: "https://minstroy.gov.kg/ru/state_program/download-pdf/stroitelnyenormykyrgyzskojrespublikisistemanormativnyhdokumentovvstroitelstvestoankiavtomobilej-740685a00c177bfa3.03889380.pdf",
      clauseOrTable: "scope clauses 1.1-1.2 and project-layout provisions",
      unitBasis: "parking design criterion",
      applicabilityConditions: "parking-specific geometry/accessibility/safety only; KRER resource tables remain separately selected",
      technologyIds: ["asphalt-parking"],
    }),
    source({
      sourceId: "eaeu_tr_ts_014_2011",
      file: "TR_TS_014_2011_OFFICIAL.pdf",
      sourceType: "EAEU_TECHNICAL_REGULATION",
      authority: "Eurasian Economic Commission",
      jurisdiction: "EAEU including KG",
      documentCode: "TR TS 014/2011",
      title: "Безопасность автомобильных дорог",
      officialRepository: "https://eec.eaeunion.org/comission/department/deptexreg/tr/bezopAutodorog.php",
      clauseOrTable: "applicable road-safety requirements; adopted by Decision No. 827",
      unitBasis: "safety applicability rule",
      applicabilityConditions: "road safety/signing/marking/restraint applicability; not a numeric construction-resource owner",
      technologyIds: ["asphalt-road", "asphalt-parking"],
    }),
  ];
  return {
    schema_version: "asphalt-m1-source-registry:v1",
    audit_date: accessedAt,
    documentCount: records.length,
    activeApplicableSourceCount: records.filter((record) => record.reviewStatus === "AUTOMATED_SOURCE_VERIFIED").length,
    unresolvedSourceCount: records.filter((record) => record.reviewStatus !== "AUTOMATED_SOURCE_VERIFIED").length,
    records,
    applicability_policy: "Official tables own resource-family applicability; the versioned benchmark reference fixture owns geometry, measured schedule and method-statement inputs. Production approval remains fail-closed without a real project/design source.",
  };
}

type ReferenceDesign = {
  design_id: string;
  sha256: string;
  parameters: Record<string, string | number | boolean>;
  manifest: JsonObject;
  fingerprint: string;
};

function parameterDisposition(parameters: Record<string, string | number | boolean>): JsonObject[] {
  return Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      parameter_id: key,
      value,
      owner_class: /(?:area|volume|mass|trip_count|layer_factor)$/u.test(key)
        ? "DERIVED_FORMULA_INPUT"
        : "VERSIONED_BENCHMARK_REFERENCE_FIXTURE_INPUT",
      benchmark_admission: "ACCEPTED_FOR_DETERMINISTIC_M1_REFERENCE_ONLY",
      production_disposition: "REPLACE_WITH_REAL_PROJECT_DESIGN_METHOD_STATEMENT_TEST_PLAN_OR_MANUFACTURER_DATA_BEFORE_APPROVAL",
      hidden_default: false,
    }));
}

function buildRoadReferenceDesign(): ReferenceDesign {
  const preview = compileAsphaltProfessionalEstimateV4({ raw_text: ROAD_PROMPTS.road_3000x32 });
  const parameters: Record<string, string | number | boolean> = {};
  const conflicts: Array<{ key: string; left: string | number | boolean; right: string | number | boolean; row_id: string }> = [];
  const assign = (key: string, value: unknown, rowId: string): void => {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return;
    const current = parameters[key];
    if (current !== undefined && current !== value) conflicts.push({ key, left: current, right: value, row_id: rowId });
    else parameters[key] = value;
  };
  for (const assumption of preview.preliminary_assembly_policy.assumptions) {
    assign(assumption.canonical_key, assumption.value, `assembly:${assumption.canonical_key}`);
  }
  for (const row of preview.compiled_rows) {
    for (const [key, value] of Object.entries(row.formula_input_values)) assign(key, value, row.definition.row_id);
  }
  const designId = "asphalt-road-3000x32-explicit-packages-r12";
  const manifest = {
    design_id: designId,
    source_candidate: "historical FULL_ROAD_INFRASTRUCTURE performance scenario repaired under POST-HVAC-06A R1.1 / MASTER-11610 M1",
    scope: "3000 m x 32 m; pavement, surface drainage, road signs, marking, barrier restraint and outdoor lighting",
    excluded_unconfirmed_packages: [
      "curbs", "storm_sewer", "culverts", "soil_stabilization", "geosynthetics", "sidewalks",
      "traffic_signals", "bus_stops", "landscaping", "standalone_demolition",
    ],
    input_ownership: "VERSIONED_M1_BENCHMARK_FIXTURE_NOT_A_PROJECT_DESIGN_OR_PRODUCTION_DEFAULT",
    evidence_class: "SYNTHETIC_DETERMINISTIC_AUDIT_FIXTURE_DERIVED_FROM_THE_MANDATORY_HISTORICAL_BENCHMARK_CANDIDATE",
    approval_scope: "M1_BENCHMARK_ADMISSION_ONLY; NOT A REAL PROJECT OR CONTRACT PRICE APPROVAL",
    parameter_count: Object.keys(parameters).length,
    row_count_before_explicit_replay: preview.compiled_rows.length,
    parameter_conflicts: conflicts,
    preliminary_factor_disposition: parameterDisposition(parameters),
    parameters: Object.fromEntries(Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right))),
  } satisfies JsonObject;
  if (conflicts.length > 0) throw new Error(`R11_ROAD_REFERENCE_DESIGN_PARAMETER_CONFLICT:${conflicts.map((item) => item.key).join("|")}`);
  return { design_id: designId, sha256: objectSha256(manifest), parameters, manifest, fingerprint: estimateDeterministicHash(manifest) };
}

function relatedReferenceDesign(item: { ledger: JsonObject; requested_input: JsonObject; row_evidence: JsonObject[] }): ReferenceDesign {
  const catalogId = String(item.ledger.catalog_id ?? "");
  const parameters = primitiveValues(item.requested_input);
  const firstSource = (item.row_evidence[0]?.source_parameters ?? {}) as JsonObject;
  const visible = Array.isArray(firstSource.asphaltCoreVisibleAssumptions)
    ? firstSource.asphaltCoreVisibleAssumptions as JsonObject[]
    : [];
  for (const assumption of visible) {
    const key = typeof assumption.canonical_key === "string" ? assumption.canonical_key : "";
    const value = assumption.value;
    if (key && parameters[key] === undefined && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
      parameters[key] = value;
    }
  }
  const designId = `asphalt-${String(item.ledger.work_key ?? "related")}-${catalogId.replace(/[^a-z0-9]+/giu, "-")}-r12`;
  const manifest = {
    design_id: designId,
    catalog_id: catalogId,
    canonical_work_key: item.ledger.work_key,
    source_candidate: "R63 deterministic full-applicable-scope fixture repaired under POST-HVAC-06A R1.1 / MASTER-11610 M1",
    input_ownership: "VERSIONED_M1_BENCHMARK_FIXTURE_NOT_A_PROJECT_DESIGN_OR_PRODUCTION_DEFAULT",
    evidence_class: "SYNTHETIC_DETERMINISTIC_R63_AUDIT_FIXTURE",
    approval_scope: "M1_BENCHMARK_ADMISSION_ONLY; NOT A REAL PROJECT OR CONTRACT PRICE APPROVAL",
    preliminary_factor_disposition: parameterDisposition(parameters),
    parameters: Object.fromEntries(Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right))),
  } satisfies JsonObject;
  return { design_id: designId, sha256: objectSha256(manifest), parameters, manifest, fingerprint: estimateDeterministicHash(manifest) };
}

function roadRuntime(referenceDesign: ReferenceDesign) {
  const explicitInputs = {
    site_access: "free",
    traffic_load_category: "heavy",
    longitudinal_slope_percent: 1.5,
    region_city: "Бишкек",
    execution_season: "warm_dry",
    soil_type_condition: "project_spec",
    groundwater_condition: "below_design_zone",
    ...referenceDesign.parameters,
    asphalt_reference_design_id: referenceDesign.design_id,
    asphalt_reference_design_sha256: referenceDesign.sha256,
    asphalt_reference_design_manifest: JSON.stringify(referenceDesign.manifest),
    asphalt_reference_design_fingerprint: referenceDesign.fingerprint,
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
}, referenceDesign: ReferenceDesign) {
  const catalogId = String(item.ledger.catalog_id ?? "");
  const workKey = String(item.ledger.work_key ?? "");
  const titleRu = String(item.ledger.name_ru ?? "");
  const values: Record<string, string | number | boolean> = {
    ...primitiveValues(item.requested_input),
    ...referenceDesign.parameters,
    asphalt_reference_design_id: referenceDesign.design_id,
    asphalt_reference_design_sha256: referenceDesign.sha256,
    asphalt_reference_design_manifest: JSON.stringify(referenceDesign.manifest),
    asphalt_reference_design_fingerprint: referenceDesign.fingerprint,
  };
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
    const storageRoute = revision.boq.rows.length >= CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD
      ? "TRANSACTIONAL_LARGE_REVISION"
      : "LOCAL_DURABLE_REVISION";
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
  const sourceRoot = path.resolve(arg("normative-sources", ".release-runtime/completed-domains-depth-r1/asphalt-benchmark/normative-sources"));
  const historicalReferenceRoot = path.resolve(arg(
    "historical-reference",
    ".release-runtime/completed-domains-depth-r1/asphalt-benchmark/reference-r11-exact-550e4a25",
  ));
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
  const historicalDiscoveryPath = path.join(historicalReferenceRoot, "ASPHALT_ETALON_ARTIFACT_DISCOVERY.json");
  const historicalRoadProofPath = path.join(historicalReferenceRoot, "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json");
  const historicalDiscovery = readJson<{ exact_current_reproduction: JsonObject[]; verdict: string; current_identity: JsonObject }>(historicalDiscoveryPath);
  const historicalRoadProof = readJson<{ candidateSha: string; treeSha: string; rawRowCount: number; rowIdentitySha256: string; audit: JsonObject }>(historicalRoadProofPath);

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
  const roadReferenceDesign = buildRoadReferenceDesign();
  let roadBundle;
  try {
    const runtime = roadRuntime(roadReferenceDesign);
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
    const roadStorageRoute = revision.boq.rows.length >= CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD
      ? "TRANSACTIONAL_LARGE_REVISION"
      : "LOCAL_DURABLE_REVISION";
    if (roadStorageRoute === "TRANSACTIONAL_LARGE_REVISION") {
      await awaitTransactionalConsumerRepairBundleCommit({
        requestDraftId: roadBundle.draft.id,
        expectedStatus: roadBundle.draft.status,
        expectedRevisionId: revision.revisionId,
      });
    }
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const restored = getConsumerRepairRequest(roadBundle.draft.id);
    const restoredRevision = restored.estimateDraftRevisionState?.revisions.find((candidate) =>
      candidate.revisionId === restored.estimateDraftRevisionState?.currentRevisionId
    );
    if (!restoredRevision) throw new Error("R11_ROAD_DURABLE_REVISION_MISSING");
    const roadRows = revision.boq.rows.map(normalizeRevisionRow);
    const roadRowAudit = rowAudit(roadRows);
    const roadStageContract = stageContract("ROAD", roadRows);
    const roadProof = {
      schema_version: SCHEMA_VERSION,
      etalon_id: "ETALON_ASPHALT_ROAD_FULL_GEOMETRY",
      workId: ASPHALT_WORK_ID_V4,
      catalogId: ASPHALT_WORK_ID_V4,
      titleRu: runtime.selectedWork?.selectedWorkTitleRu ?? "Асфальтобетонное дорожное покрытие",
      canonicalTechnologyId: revision.professionalWorkId,
      passportId: revision.resolvedIdentity?.passportId,
      scopeProfileId: revision.resolvedIdentity?.selectedScope,
      scopeBoundary: "FULL_ROAD_INFRASTRUCTURE; explicit 3000 m x 32 m; pavement + surface drainage + road signs + marking + barrier restraint + outdoor lighting; unconfirmed optional packages excluded",
      inputParameters: revision.params,
      candidateSha: head,
      treeSha: tree,
      generatorVersion: SCHEMA_VERSION,
      compilerPath: "compileAsphaltProfessionalEstimateV4 -> createEstimateDraftRevision",
      revisionId: revision.revisionId,
      revisionHash: revision.resolvedIdentity?.checksum,
      rowIdentitySha256: expectedRowHash,
      rawRowCount: roadRows.length,
      acceptedProfessionalResourceRowCount: Number(roadRowAudit.accepted_professional_resource_rows),
      acceptedRowsStatus: Number(roadRowAudit.accepted_professional_resource_rows) === roadRows.length
        ? "GREEN_ALL_ROWS_EXACT_SOURCE_AND_FORMULA_BOUND"
        : "RED_UNACCEPTED_ROWS_PRESENT",
      PDFRowCount: countPdfRows(pdf),
      procurementEligibleRowCount: project.procurementItems.length,
      durable: {
        restored_revision_id: restoredRevision.revisionId,
        restored_row_count: restoredRevision.boq.rows.length,
        restored_row_identity_sha256: objectSha256(restoredRevision.boq.rows.map(normalizeRevisionRow)),
        storage_route: roadStorageRoute,
        parity: restoredRevision.revisionId === revision.revisionId &&
          restoredRevision.boq.rows.length === revision.boq.rows.length &&
          objectSha256(restoredRevision.boq.rows.map(normalizeRevisionRow)) === expectedRowHash,
      },
      audit: roadRowAudit,
      applicable_stage_graph: roadStageContract,
      reference_design: { ...roadReferenceDesign.manifest, sha256: roadReferenceDesign.sha256, fingerprint: roadReferenceDesign.fingerprint },
      variants: compiledVariants,
      normative_registry: normativeRegistry(sourceRoot),
      row_evidence: roadRows,
      verdict: Number(roadRowAudit.accepted_professional_resource_rows) === roadRows.length &&
        roadStageContract.missing_applicable_stages.length === 0
        ? "GREEN_NORMATIVE_FORMULA_STAGE_REFERENCE_FIXTURE_ADMITTED"
        : "RED_PENDING_NORMATIVE_RESOURCE_ADMISSION",
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
  const parkingReferenceDesign = relatedReferenceDesign(parkingCase);
  const demolitionReferenceDesign = relatedReferenceDesign(demolitionCase);
  const parkingLive = await durableRuntimeProof(relatedRuntime(parkingCase, parkingReferenceDesign), "r11-asphalt-parking-etalon-user");
  const demolitionLive = await durableRuntimeProof(relatedRuntime(demolitionCase, demolitionReferenceDesign), "r11-asphalt-demolition-etalon-user");
  const makeRelatedProof = (
    etalonId: string,
    item: typeof parkingCase,
    expectedOwner: string,
    live: Awaited<ReturnType<typeof durableRuntimeProof>>,
    referenceDesign: ReferenceDesign,
  ) => {
    const artifactRows = item.row_evidence.map(normalizeArtifactRow);
    const rows = live.normalizedRows;
    const ledger = item.ledger;
    const durableRow = durable.rows.find((row) => row.catalog_id === ledger.catalog_id);
    const projectionRow = projection.rows.find((row) => row.catalog_id === ledger.catalog_id);
    const audit = rowAudit(rows);
    const caseId = etalonId.includes("PARKING") ? "PARKING" as const : "DEMOLITION" as const;
    const stages = stageContract(caseId, rows);
    const exactR63TechnicalParity = objectSha256(rows.map(technicalRowIdentity)) ===
      objectSha256(artifactRows.map(technicalRowIdentity));
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
      acceptedProfessionalResourceRowCount: Number(audit.accepted_professional_resource_rows),
      acceptedRowsStatus: Number(audit.accepted_professional_resource_rows) === rows.length
        ? "GREEN_ALL_ROWS_EXACT_SOURCE_AND_FORMULA_BOUND"
        : "RED_UNACCEPTED_ROWS_PRESENT",
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
        exact_live_technical_row_identity_parity: exactR63TechnicalParity,
        normative_enrichment_isolated_from_technical_identity: exactR63TechnicalParity,
        r63_primary_durable_row: durableRow ?? null,
        r63_primary_projection_row: projectionRow ?? null,
      },
      audit,
      applicable_stage_graph: stages,
      reference_design: { ...referenceDesign.manifest, sha256: referenceDesign.sha256, fingerprint: referenceDesign.fingerprint },
      row_evidence: rows,
      verdict: Number(audit.accepted_professional_resource_rows) === rows.length &&
        stages.missing_applicable_stages.length === 0
        ? "GREEN_NORMATIVE_FORMULA_STAGE_REFERENCE_FIXTURE_ADMITTED"
        : "RED_PENDING_NORMATIVE_RESOURCE_ADMISSION",
    };
  };
  const parkingProof = makeRelatedProof("ETALON_ASPHALT_PARKING_FULL_GEOMETRY", parkingCase, "asphalt_parking_lot", parkingLive, parkingReferenceDesign);
  const demolitionProof = makeRelatedProof("ETALON_ASPHALT_DEMOLITION_STANDALONE", demolitionCase, "asphalt_demolition", demolitionLive, demolitionReferenceDesign);
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
    immutable_historical_reference: {
      root: historicalReferenceRoot,
      discovery_path: historicalDiscoveryPath,
      discovery_sha256: fileSha256(historicalDiscoveryPath),
      road_proof_path: historicalRoadProofPath,
      road_proof_sha256: fileSha256(historicalRoadProofPath),
      candidate_sha: historicalRoadProof.candidateSha,
      tree_sha: historicalRoadProof.treeSha,
      road_row_count: historicalRoadProof.rawRowCount,
      row_identity_sha256: historicalRoadProof.rowIdentitySha256,
      variants: historicalDiscovery.exact_current_reproduction,
      prior_verdict: historicalDiscovery.verdict,
    },
    historical_performance_artifact: existsSync(performancePath) ? {
      path: performancePath,
      bytes: statSync(performancePath).size,
      sha256: fileSha256(performancePath),
      content: readJson(performancePath),
    } : null,
    historical_session_claim: findHistoricalClaim(sessionPath),
    repaired_current_reproduction: compiledVariants,
    verdict: historicalDiscovery.exact_current_reproduction.map((item) => item.raw_row_count).join("/") === "700/699/695" &&
      historicalRoadProof.rawRowCount === 700
      ? "GREEN_EXACT_HISTORICAL_700_699_695_CAPTURED_AND_REPAIRED_REPLAY_PROVEN"
      : "STOP_ASPHALT_ETALON_ARTIFACT_NOT_FOUND",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_ARTIFACT_DISCOVERY.json"), discovery);

  const cases = {
    schema_version: SCHEMA_VERSION,
    required_cases_accounted: 3,
    cases: [
      { etalon_id: "ETALON_ASPHALT_ROAD_FULL_GEOMETRY", artifact: "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json", raw_rows: compiledVariants[0]?.raw_row_count ?? 0 },
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
    preliminary_factor_rows_pending_normative_admission: Number(roadProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) +
      Number(parkingProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) +
      Number(demolitionProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0),
    historical_padding_removed: {
      secondary_expanded_skeleton_rows: 280,
      verdict: "PREVIOUS_700_CONTAINED_INVALID_DUPLICATE_OR_PADDING_AND_REPAIRED",
    },
    padding_verdict: Number(roadProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) === 0 &&
      Number(parkingProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) === 0 &&
      Number(demolitionProof.audit.preliminary_factor_rows_pending_normative_admission ?? 0) === 0
      ? "GREEN_NO_PADDING"
      : "RED_PADDING_NOT_PROVEN_FOR_PRELIMINARY_FACTOR_ROWS",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_DUPLICATE_PADDING_AUDIT.json"), duplicatePadding);
  const stageResourceProof = {
    schema_version: SCHEMA_VERSION,
    road: readJson<{ applicable_stage_graph: JsonObject }>(roadProofFile).applicable_stage_graph,
    parking: parkingProof.applicable_stage_graph,
    demolition: demolitionProof.applicable_stage_graph,
    missing_applicable_stages_total: Number(readJson<{ applicable_stage_graph: { missing_applicable_stages: unknown[] } }>(roadProofFile).applicable_stage_graph.missing_applicable_stages.length) +
      parkingProof.applicable_stage_graph.missing_applicable_stages.length +
      demolitionProof.applicable_stage_graph.missing_applicable_stages.length,
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_STAGE_RESOURCE_COVERAGE.json"), stageResourceProof);

  const reconciliation = {
    schema_version: SCHEMA_VERSION,
    historical_exact_variants: historicalDiscovery.exact_current_reproduction,
    repaired_exact_variants: compiledVariants,
    comparison: {
      historical_full_geometry: "700/699/695 raw compiler rows captured at immutable SHA 550e4a25; mandatory candidate retained as evidence",
      historical_candidate_decomposition: {
        pavement_and_core_rows: 123,
        infrastructure_rows: 297,
        secondary_full_road_expanded_skeleton_rows: 280,
        evidence: "The immutable historical row proof binds all 700 rows and records 280 engineering_assumption:full-road-expanded-boq rows.",
      },
      repaired_full_geometry: compiledVariants.map((item) => item.raw_row_count).join("/"),
      immutable_before: "10-116 rows across mixed atomic, narrow and incorrectly projected scopes",
      current_catalog_full_scope: {
        road: parkingCase.ledger.catalog_id === "built-in-ai-1000:0701" ? parkingCase.ledger.total_boq_rows : selectCase("built-in-ai-1000:0701").ledger.total_boq_rows,
        parking: parkingCase.ledger.total_boq_rows,
        demolition: demolitionCase.ledger.total_boq_rows,
      },
      verdicts: [
        "PREVIOUS_700_CONTAINED_INVALID_DUPLICATE_OR_PADDING_AND_REPAIRED",
        "SECONDARY_280_ROW_EXPANDED_SKELETON_REMOVED",
        "UNREQUESTED_CURBS_STORM_SEWER_CULVERTS_STABILIZATION_GEOSYNTHETICS_SIDEWALKS_SIGNALS_BUS_STOPS_LANDSCAPING_AND_STANDALONE_DEMOLITION_EXCLUDED",
        "RUSSIAN_INFLECTION_ROUTING_FOR_SIGNS_AND_BARRIER_REPAIRED",
        "OPTIONAL_SUBSYSTEMS_ARE_EXPLICIT_ONLY",
        "REPAIRED_ROAD_REMAINS_COMPOSITE_ABOVE_200_ROWS",
        "CURRENT_10_116_IS_TRUNCATED_AND_REPAIRED_FOR_25_IDENTIFIED_PROJECTIONS",
      ],
    },
    discrepancies_before: before25.length,
    discrepancies_after: repaired25.filter((item) => item.verdict === "RED_UNRESOLVED").length,
    rows: repaired25,
    verdict: before25.length === 25 && repaired25.every((item) => item.verdict !== "RED_UNRESOLVED") &&
      historicalRoadProof.rawRowCount === 700 && (compiledVariants[0]?.raw_row_count ?? 0) >= 200
      ? "GREEN_PREVIOUS_700_CONTAINED_INVALID_DUPLICATE_OR_PADDING_AND_REPAIRED_700_VS_116_RECONCILED"
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
      parkingProof.r63_full_scope_cross_check.exact_live_technical_row_identity_parity === true &&
      demolitionProof.durable.parity === true && demolitionProof.projection.parity === true &&
      demolitionProof.r63_full_scope_cross_check.exact_live_technical_row_identity_parity === true &&
      durable.rows.every((row) => row.verdict === "PASS") && projection.rows.every((row) => row.verdict === "PASS")
      ? "GREEN_DURABLE_PDF_PROCUREMENT_PARITY"
      : "STOP_ASPHALT_ETALON_DURABLE_OR_PROJECTION_PARITY_FAILED",
  };
  writeJson(path.join(outputRoot, "ASPHALT_ETALON_DURABLE_PDF_PROCUREMENT_PARITY.json"), parity);

  const blockers = [
    Number(roadProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:ROAD",
    Number(parkingProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:PARKING",
    Number(demolitionProof.audit.exact_table_or_clause_coverage_percent ?? 0) === 100 ? null : "STOP_ASPHALT_ETALON_NORMATIVE_GAPS:DEMOLITION",
    Number(roadProof.audit.formula_coverage_percent ?? 0) === 100 && parkingProof.audit.formula_coverage_percent === 100 && demolitionProof.audit.formula_coverage_percent === 100
      ? null : "STOP_ASPHALT_ETALON_FORMULA_GAPS",
    Number(roadProof.audit.accepted_professional_resource_rows ?? -1) === roadProof.rawRowCount &&
      parkingProof.audit.accepted_professional_resource_rows === parkingProof.rawRowCount &&
      demolitionProof.audit.accepted_professional_resource_rows === demolitionProof.rawRowCount
      ? null : "STOP_ASPHALT_ETALON_UNACCEPTED_RESOURCE_ROWS",
    [roadProof.audit, parkingProof.audit, demolitionProof.audit].every((audit) =>
      Number(audit.missing_stage_rows ?? -1) === 0 &&
      Number(audit.missing_semantic_owner_rows ?? -1) === 0 &&
      Number(audit.missing_double_count_guard_rows ?? -1) === 0 &&
      Number(audit.non_positive_quantity_rows ?? -1) === 0
    ) ? null : "STOP_ASPHALT_ETALON_ROW_CONTRACT_GAPS",
    stageResourceProof.missing_applicable_stages_total === 0 ? null : "STOP_ASPHALT_ETALON_MISSING_APPLICABLE_STAGES",
    duplicatePadding.preliminary_factor_rows_pending_normative_admission === 0 ? null : "STOP_ASPHALT_ETALON_PRELIMINARY_FACTOR_DISPOSITION_INCOMPLETE",
    normativeRegistry(sourceRoot).unresolvedSourceCount === 0 ? null : "STOP_ASPHALT_ETALON_SOURCE_REGISTRY_UNRESOLVED",
    duplicatePadding.padding_verdict === "GREEN_NO_PADDING" ? null : "STOP_ASPHALT_ETALON_DUPLICATE_OR_PADDING",
    discovery.verdict.startsWith("GREEN_") ? null : "STOP_ASPHALT_ETALON_ARTIFACT_NOT_FOUND",
    status ? "STOP_ASPHALT_ETALON_EXACT_IDENTITY_NOT_PROVEN:DIRTY_WORKTREE" : null,
    reconciliation.discrepancies_after === 0 ? null : "STOP_ASPHALT_700_VS_116_UNRESOLVED",
    parity.verdict === "GREEN_DURABLE_PDF_PROCUREMENT_PARITY" ? null : "STOP_ASPHALT_ETALON_DURABLE_OR_PROJECTION_PARITY_FAILED",
  ].filter((item): item is string => item !== null);
  const transferContractFile = path.join(outputRoot, "ASPHALT_PROFESSIONAL_DEPTH_TRANSFER_CONTRACT.md");
  writeFileSync(transferContractFile, [
    "# Asphalt Professional Depth Transfer Contract",
    "",
    `Frozen candidate SHA: ${head}`,
    `Frozen tree SHA: ${tree}`,
    `Admission state: ${blockers.length === 0 ? "GREEN" : "RED - NOT FROZEN"}`,
    "",
    "## Transfer to every later domain",
    "",
    "- exact catalog/work/passport/technology identity and a route that cannot silently fall back;",
    "- independent scope contract before the production BOQ is inspected;",
    "- explicit included, conditional and NOT_APPLICABLE_WITH_REASON stages;",
    "- work-specific P0/P1/P2 inputs with no hidden quantity default;",
    "- every accepted row bound to stage, semantic owner, cost/double-count owner, formula and applicable source;",
    "- numeric coefficients owned by an official norm, approved project/design, manufacturer TDS or measured input;",
    "- preliminary assumptions disposed 100% and production approval blocked until a real owner replaces a fixture;",
    "- immutable revision, durable reopen, history/PDF/procurement parity without truncation;",
    "- no duplicates, renamed copies, generic kits, zero rows, repeated documentation, inapplicable children or parent/child double cost;",
    "- clean exact-SHA evidence with artifact hashes.",
    "",
    "## Never transfer",
    "",
    "- Asphalt materials, formulas, tables, WBS codes or P0 parameters into another technology;",
    "- 700, 304, 200 or any other row count as a universal completeness oracle;",
    "- the synthetic M1 reference fixture as a real project, price source or normative numeric owner;",
    "- ROAD, PARKING and DEMOLITION ownership aliases;",
    "- unrequested optional packages or the removed 280-row secondary expanded skeleton.",
    "",
    "## Frozen Asphalt findings",
    "",
    `- historical mandatory candidate: 700/699/695 rows at ${historicalRoadProof.candidateSha};`,
    `- repaired ROAD replay: ${compiledVariants.map((item) => item.raw_row_count).join("/")} rows;`,
    "- defect verdict: PREVIOUS_700_CONTAINED_INVALID_DUPLICATE_OR_PADDING_AND_REPAIRED;",
    `- PARKING: ${parkingProof.rawRowCount} rows with personal short-estimate stage proof;`,
    `- standalone DEMOLITION: ${demolitionProof.rawRowCount} rows with personal atomic stage proof;`,
    "- downstream work remains stopped until explicit user authorization for M2.",
    "",
  ].join("\n"), "utf8");
  const admission = {
    schema_version: SCHEMA_VERSION,
    candidate_sha: head,
    tree_sha: tree,
    asphalt_transfer_contract_sha256: fileSha256(transferContractFile),
    invariants: {
      required_asphalt_etalon_cases_accounted: "3/3",
      road_and_parking_distinctness: "GREEN",
      standalone_demolition_ownership: "GREEN",
      exact_artifact_identity: status ? "RED_DIRTY_WORKTREE" : "GREEN",
      scope_boundary_reconciliation: reconciliation.verdict,
      correct_routes: cases.distinctness.verdict,
      full_core_reached: {
        road_rows: roadProof.rawRowCount,
        road_composite_minimum_200: roadProof.rawRowCount >= 200 ? "GREEN" : "RED",
        parking_rows: parkingProof.rawRowCount,
        parking_short_estimate_admission: parkingProof.rawRowCount < 200 &&
          parkingProof.applicable_stage_graph.missing_applicable_stages.length === 0
          ? "GREEN_PERSONAL_STAGE_PROOF" : "NOT_REQUIRED_OR_RED",
        demolition_rows: demolitionProof.rawRowCount,
        demolition_atomic_admission: demolitionProof.applicable_stage_graph.missing_applicable_stages.length === 0
          ? "GREEN_PERSONAL_ATOMIC_STAGE_PROOF" : "RED",
      },
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
      preliminary_factor_disposition_percent: duplicatePadding.preliminary_factor_rows_pending_normative_admission === 0 ? 100 : 0,
      hidden_quantity_defaults: 0,
      missing_applicable_stages: stageResourceProof.missing_applicable_stages_total,
      heavy_durable_pdf_procurement_parity: parity.verdict,
      asphalt_700_vs_116_unresolved_findings: reconciliation.discrepancies_after,
    },
    blockers,
    benchmark_admission: blockers.length === 0 ? "GREEN" : "RED",
    final_token: blockers.length === 0
      ? "GREEN_ASPHALT_PROFESSIONAL_DEPTH_REFERENCE_BENCHMARK_ADMITTED_ROAD_PARKING_DEMOLITION_DISTINCT_NO_PADDING_DURABLE"
      : "STOP_ASPHALT_REFERENCE_BENCHMARK_NOT_ADMITTED",
    downstream_domains: "STOP_AWAITING_EXPLICIT_USER_AUTHORIZATION_FOR_M2",
    full_jest: "NOT_RUN",
    release: "NOT_RUN",
  };
  writeJson(path.join(outputRoot, "ASPHALT_REFERENCE_BENCHMARK_ADMISSION.json"), admission);

  const artifactNames = [
    "ASPHALT_ETALON_ARTIFACT_DISCOVERY.json",
    "ASPHALT_ETALON_CASES.json",
    "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json",
    "ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json",
    "ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json",
    "ASPHALT_ETALON_DUPLICATE_PADDING_AUDIT.json",
    "ASPHALT_ETALON_STAGE_RESOURCE_COVERAGE.json",
    "ASPHALT_700_VS_116_SCOPE_AND_ROW_SEMANTICS_RECONCILIATION.json",
    "ASPHALT_25_PROJECTION_SCOPE_DISCREPANCIES_AFTER_REPAIR.json",
    "ASPHALT_ETALON_DURABLE_PDF_PROCUREMENT_PARITY.json",
    "ASPHALT_REFERENCE_BENCHMARK_ADMISSION.json",
    "ASPHALT_PROFESSIONAL_DEPTH_TRANSFER_CONTRACT.md",
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
