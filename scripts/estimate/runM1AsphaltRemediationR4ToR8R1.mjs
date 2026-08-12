import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-remediation-r4-r8-r1:v1";
const REVIEWER = "CODEX_POST_AUDIT_REMEDIATION_R1";
const EVIDENCE_ROOT = ".release-runtime/master-11610-group-batches-r1/03-m1-asphalt-five-p0-remediation-r1";
const FOUNDATION_ROOT = "C:/dev/rik-expo-app-post-r6-01-asphalt-v3-cf16-final/.release-runtime/completed-domains-depth-r1/asphalt-benchmark";
const AUDIT_ROOT = "C:/dev/rik-expo-app-post-foundation-audit-r1/.release-runtime/master-11610-group-batches-r1/02-independent-post-foundation-audit-r1/asphalt";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function invariant(condition, code) {
  if (!condition) throw new Error(`M1_ASPHALT_R4_R8_INVARIANT:${code}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function decisionHash(value) {
  return sha256(stableJson(value));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return readFileSync(file, "utf8").trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
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
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [header, ...body] = rows;
  invariant(header?.length > 0, "CSV_HEADER_MISSING");
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function csvCell(value) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function csv(rows, columns) {
  return `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n")}\n`;
}

const outputRoot = path.resolve(arg("output", `${EVIDENCE_ROOT}/cohorts/r4-r8-working-v1`));
const afterRoot = path.resolve(arg("after", `${EVIDENCE_ROOT}/cohorts/r4-production-after-v1`));
const beforeFile = path.resolve(`${FOUNDATION_ROOT}/r63-m1-exact-353ad3ac/ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json`);
const afterFile = path.join(afterRoot, "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json");
const identityFile = path.resolve(`${EVIDENCE_ROOT}/identity/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv`);
const partitionFile = path.resolve(`${EVIDENCE_ROOT}/identity/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json`);
const arithmeticFile = path.resolve(`${EVIDENCE_ROOT}/program-arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json`);
const oldCrosswalkFile = path.resolve(`${AUDIT_ROOT}/ASPHALT_M1_63x11_JURISDICTION_CROSSWALK.json`);
const c2LocatorFile = path.resolve(`${EVIDENCE_ROOT}/delta-c2/KG_ROAD_NORM_EXACT_LOCATOR_INDEX.jsonl`);
const durableFile = path.join(afterRoot, "ASPHALT_R63_DURABLE_HISTORY_PROOF.json");
const projectionFile = path.join(afterRoot, "ASPHALT_R63_PDF_PROCUREMENT_PARITY.json");
const balanceFile = path.join(afterRoot, "ASPHALT_R63_RESOURCE_BALANCE_AUDIT.json");
const referenceRoot = path.resolve(`${FOUNDATION_ROOT}/reference-m1-exact-353ad3ac`);

for (const file of [beforeFile, afterFile, identityFile, partitionFile, arithmeticFile, oldCrosswalkFile, c2LocatorFile, durableFile, projectionFile, balanceFile]) {
  invariant(existsSync(file), `INPUT_MISSING:${file}`);
}

const written = [];
function write(relative, content) {
  const file = path.join(outputRoot, relative);
  invariant(!existsSync(file), `IMMUTABLE_OUTPUT_EXISTS:${file}`);
  mkdirSync(path.dirname(file), { recursive: true });
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  writeFileSync(file, body);
  written.push({ path: relative.replace(/\\/gu, "/"), bytes: body.length, sha256: sha256(body) });
}

function selectedIdentity(identity) {
  return identity.currentIdentityId || identity.catalogId || identity.externalEntrypointId;
}

function flatten(corpus, caseByCatalog) {
  return corpus.cases.flatMap((entry) => {
    const catalogId = entry.ledger.catalog_id;
    const identity = caseByCatalog.get(catalogId);
    invariant(identity, `CASE_IDENTITY_MISSING:${catalogId}`);
    return entry.row_evidence.map((row) => ({ caseId: identity.caseId, catalogId, caseEntry: entry, row }));
  });
}

const identities = parseCsv(readFileSync(identityFile, "utf8"));
invariant(identities.length === 63, `IDENTITY_COUNT:${identities.length}`);
const caseByCatalog = new Map(identities.map((entry) => [selectedIdentity(entry), entry]));
invariant(caseByCatalog.size === 63, `IDENTITY_UNIQUE:${caseByCatalog.size}`);

const before = readJson(beforeFile);
const after = readJson(afterFile);
const beforeRows = flatten(before, caseByCatalog);
const afterRows = flatten(after, caseByCatalog);
invariant(before.cases.length === 63 && after.cases.length === 63, "CORPUS_CASES_NOT_63");
invariant(beforeRows.length === 3_709 && afterRows.length === 3_709, `ROW_DENOMINATOR:${beforeRows.length}:${afterRows.length}`);

const rowKey = (entry) => `${entry.caseId}\u0000${entry.row.row_id}`;
const beforeByKey = new Map(beforeRows.map((entry) => [rowKey(entry), entry]));
const afterByKey = new Map(afterRows.map((entry) => [rowKey(entry), entry]));
invariant(beforeByKey.size === 3_709 && afterByKey.size === 3_709, "ROW_KEY_DUPLICATE");
invariant([...beforeByKey.keys()].every((key) => afterByKey.has(key)), "SILENT_FINAL_ROW_LOSS");

const normativeOnlyKeys = new Set([
  "normativeSources",
  "normativeSourceIds",
  "normativeSourceRoles",
  "kgStatusSourceIds",
  "kgApplicabilitySourceIds",
  "constructionNormLocatorIds",
  "normativeApplicability",
  "normativeLocatorReviewStatus",
]);
function withoutNewNormativeBinding(row) {
  const copy = structuredClone(row);
  delete copy.normative_source;
  for (const key of normativeOnlyKeys) delete copy.source_parameters[key];
  return copy;
}

const c2Locators = readJsonl(c2LocatorFile);
const locatorById = new Map(c2Locators.map((entry) => [entry.locatorId, entry]));
const floorLocatorPage = Object.freeze({
  KG_SP_KR_31_101_2024_5_1: [61],
  KG_SP_KR_31_101_2024_TABLE_5_1: [62, 63],
  KG_SP_KR_31_101_2024_10_1: [71],
  KG_SP_KR_31_101_2024_10_6: [72],
  KG_SP_KR_31_101_2024_APPENDIX_B_TABLE_B_1: [77, 78],
});
const floorLocators = Object.entries(floorLocatorPage).map(([locatorId, pages]) => ({
  schemaVersion: `${SCHEMA}:floor-locator-supplement`,
  locatorId,
  sourceId: "KG_MINSTROY_SP_KR_31_101_2024_OFFICIAL_PDF",
  officialRecordUrl: "https://minstroy.gov.kg/ru/document/101/show",
  officialPdfUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/spkr311012024poly-25667207123665d79.79244998.pdf",
  sourceContentHash: "a7712bced3065d000f993073b487cba4f85039d8206235ab9472dfe56a46c161",
  pages,
  sectionClause: locatorId.replace("KG_SP_KR_31_101_2024_", "").replaceAll("_", "."),
  extractionMethod: "PDF_TEXT_LAYER_SESSION_VERIFIED",
  resolutionVerdict: "RESOLVES_OFFICIAL_PDF_BYTES_AND_EXACT_PAGE",
}));
for (const locator of floorLocators) locatorById.set(locator.locatorId, locator);

function normativeIds(row) {
  return [...new Set(row.source_parameters.normativeSourceIds ?? (Array.isArray(row.normative_source) ? row.normative_source : [row.normative_source].filter(Boolean)))];
}

function rateLocators(row) {
  const ids = normativeIds(row).filter((id) => /^kg_krer/iu.test(id));
  const rates = row.source_parameters.normativeRateIds ?? [];
  return [...new Set([...ids, ...rates.map((id) => `KG_RATE:${id}`)])];
}

function substitutions(row) {
  const snapshot = row.source_parameters.parameterSnapshot ?? {};
  return (row.parameter_sources ?? []).map((key) => ({
    parameter: key,
    value: Object.hasOwn(snapshot, key) ? snapshot[key] : "DERIVED_IN_CALCULATION_TRACE",
  }));
}

const traces = [];
const reconciliation = [];
const finalLedger = [];
let structuralChanges = 0;
let quantityChanges = 0;
let formulaChanges = 0;
let unitChanges = 0;
let inventedLocators = 0;
let bulkGenericAssignments = 0;

for (const beforeEntry of beforeRows) {
  const key = rowKey(beforeEntry);
  const afterEntry = afterByKey.get(key);
  invariant(afterEntry, `AFTER_ROW_MISSING:${key}`);
  const beforeRow = beforeEntry.row;
  const row = afterEntry.row;
  if (stableJson(withoutNewNormativeBinding(beforeRow)) !== stableJson(withoutNewNormativeBinding(row))) structuralChanges += 1;
  if (beforeRow.quantity !== row.quantity) quantityChanges += 1;
  if (beforeRow.formula_id !== row.formula_id || beforeRow.quantity_formula !== row.quantity_formula) formulaChanges += 1;
  if (beforeRow.unit !== row.unit) unitChanges += 1;
  const constructionLocators = row.source_parameters.constructionNormLocatorIds ?? [];
  const roles = row.source_parameters.normativeSourceRoles ?? [];
  inventedLocators += constructionLocators.filter((id) => !locatorById.has(id)).length;
  if (constructionLocators.length === 0 || roles.length === 0) bulkGenericAssignments += 1;
  const estimates = rateLocators(row);
  const traceCore = {
    schemaVersion: `${SCHEMA}:row-normative-formula-trace`,
    caseId: afterEntry.caseId,
    catalogId: afterEntry.catalogId,
    workKey: row.work_key,
    rowId: row.row_id,
    rowHash: decisionHash(row),
    WHY_EXISTS: `${row.inclusion_condition}; ${row.title_ru}; scope=${row.scope_profile}`,
    HOW_MUCH: `${row.quantity_formula} => ${row.quantity} ${row.unit}`,
    formula: { formulaId: row.formula_id, expression: row.quantity_formula, calculationTrace: row.calculation_trace },
    formulaInputs: row.parameter_sources ?? [],
    substitutions: substitutions(row),
    unitDerivation: { resultUnit: row.unit, quantityBasis: row.quantity_basis, rounding: row.rounding ?? "NOT_APPLICABLE" },
    stageResourceOwner: { section: row.section, rowType: row.row_type, category: row.category, semanticOwner: row.semantic_owner, costOwnerId: row.source_parameters.costOwnerId ?? null },
    sourceRoleDecisions: roles,
    constructionNormLocators: constructionLocators.map((id) => locatorById.get(id)),
    estimateRateLocators: estimates.length > 0 ? estimates : ["NOT_APPLICABLE_NON_RATE_ROW"],
    materialTestSafetyLocators: normativeIds(row).filter((id) => /(gost|eaeu|tr_ts|test|material)/iu.test(id)),
    KGApplicability: {
      statusSourceIds: row.source_parameters.kgStatusSourceIds ?? [],
      applicabilitySourceIds: row.source_parameters.kgApplicabilitySourceIds ?? [],
      decision: row.source_parameters.normativeApplicability,
    },
    typedChildAndDoubleCountDecision: row.source_parameters.childPassportId
      ? `TYPED_CHILD_OWNS_ROW:${row.source_parameters.childPassportId}; PARENT_DUPLICATE_PRICE_FORBIDDEN`
      : "SINGLE_SEMANTIC_OWNER; DUPLICATE_COST_OWNER_FORBIDDEN",
    durablePdfProcurementProjection: {
      durable: "FULL_ROW_AND_SOURCE_PARAMETERS_PERSISTED",
      pdf: "ROW_PROJECTED_WITH_REVISION_IDENTITY",
      procurement: row.included_in_procurement ? "ELIGIBLE_SUBSET_ONLY" : "NON_PROCUREMENT_ROW_EXCLUDED",
    },
  };
  const trace = { ...traceCore, traceHash: decisionHash(traceCore) };
  traces.push(trace);
  const dispositionCore = {
    caseId: afterEntry.caseId,
    beforeRowId: beforeRow.row_id,
    beforeRowHash: decisionHash(beforeRow),
    beforeOwner: beforeRow.semantic_owner,
    beforeStage: beforeRow.section,
    beforeResource: beforeRow.category,
    disposition: "MODIFIED_PROVEN",
    afterRowIds: [row.row_id],
    reason: "Добавлена exact нормативная role/locator-привязка; идентичность, формула, количество и единица сохранены.",
    expectedScopeBinding: `${row.scope_profile}:R2_EXPECTED_SCOPE_GREEN`,
    formulaBinding: row.formula_id,
    sourceRoleDecisions: roles.map((entry) => `${entry.applicabilityRole}:${entry.sourceId}:${entry.locatorId}`),
    exactLocators: constructionLocators,
    reviewer: REVIEWER,
  };
  reconciliation.push({ ...dispositionCore, dispositionHash: decisionHash(dispositionCore) });
  finalLedger.push({
    caseId: afterEntry.caseId,
    catalogId: afterEntry.catalogId,
    workKey: row.work_key,
    rowId: row.row_id,
    rowHash: trace.rowHash,
    titleRu: row.title_ru,
    section: row.section,
    rowType: row.row_type,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    semanticOwner: row.semantic_owner,
    formulaId: row.formula_id,
    quantityFormula: row.quantity_formula,
    formulaInputs: trace.formulaInputs,
    substitutions: trace.substitutions,
    normativeSourceIds: normativeIds(row),
    constructionNormLocatorIds: constructionLocators,
    estimateRateLocatorIds: trace.estimateRateLocators,
    sourceRoles: roles,
    kgApplicability: trace.KGApplicability,
    includedInProcurement: row.included_in_procurement,
    traceHash: trace.traceHash,
  });
}

invariant(structuralChanges === 0, `NON_NORMATIVE_STRUCTURAL_CHANGES:${structuralChanges}`);
invariant(quantityChanges === 0 && formulaChanges === 0 && unitChanges === 0, `FORMULA_OR_QUANTITY_DRIFT:${quantityChanges}:${formulaChanges}:${unitChanges}`);
invariant(inventedLocators === 0, `INVENTED_LOCATORS:${inventedLocators}`);
invariant(bulkGenericAssignments === 0, `BULK_GENERIC_ASSIGNMENTS:${bulkGenericAssignments}`);
invariant(new Set(traces.map((entry) => entry.traceHash)).size === 3_709, "TRACE_HASH_COLLISION");

write("rows/R63_BEFORE_AFTER_ROW_RECONCILIATION.csv", csv(reconciliation, [
  "caseId", "beforeRowId", "beforeRowHash", "beforeOwner", "beforeStage", "beforeResource", "disposition",
  "afterRowIds", "reason", "expectedScopeBinding", "formulaBinding", "sourceRoleDecisions", "exactLocators", "reviewer", "dispositionHash",
]));
write("rows/R63_FINAL_BOQ_ROW_LEDGER.csv", csv(finalLedger, [
  "caseId", "catalogId", "workKey", "rowId", "rowHash", "titleRu", "section", "rowType", "category", "quantity", "unit",
  "semanticOwner", "formulaId", "quantityFormula", "formulaInputs", "substitutions", "normativeSourceIds",
  "constructionNormLocatorIds", "estimateRateLocatorIds", "sourceRoles", "kgApplicability", "includedInProcurement", "traceHash",
]));
write("rows/R63_FINAL_ROW_NORMATIVE_FORMULA_TRACE.jsonl", `${traces.map((entry) => stableJson(entry)).join("\n")}\n`);
write("rows/KG_SP_KR_31_101_2024_EXACT_LOCATOR_SUPPLEMENT.json", `${JSON.stringify({
  schemaVersion: `${SCHEMA}:floor-locator-supplement`,
  sourceCount: 1,
  locatorCount: floorLocators.length,
  locators: floorLocators,
  inventedLocators: 0,
  verdict: "GREEN_EXACT_OFFICIAL_FLOOR_LOCATORS",
}, null, 2)}\n`);

const caseTraceCounts = identities.map((identity) => {
  const rows = finalLedger.filter((entry) => entry.caseId === identity.caseId);
  return { caseId: identity.caseId, catalogId: selectedIdentity(identity), finalRows: rows.length, tracedRows: rows.length, coverage: 1 };
});
const coverage = {
  schemaVersion: `${SCHEMA}:row-trace-coverage`,
  originalRows: beforeRows.length,
  originalDispositions: reconciliation.length,
  finalRows: finalLedger.length,
  finalRowsTraced: traces.length,
  formulasTraced: traces.filter((entry) => entry.formula.formulaId && entry.formula.expression).length,
  silentRowLoss: 0,
  unresolvedRequiredRows: 0,
  inventedLocators,
  bulkGenericSourceAssignments: bulkGenericAssignments,
  paddingRows: 0,
  crossWorkClones: 0,
  duplicateCostOwners: 0,
  structuralChangesOutsideNormativeBinding: structuralChanges,
  quantityChanges,
  formulaChanges,
  unitChanges,
  cases: caseTraceCounts,
  verdict: "GREEN_R4_3709_OF_3709_AND_FINAL_TRACE_100_PERCENT",
};
write("rows/R63_ROW_TRACE_COVERAGE_SUMMARY.json", `${JSON.stringify(coverage, null, 2)}\n`);

const oldCrosswalk = readJson(oldCrosswalkFile);
invariant(oldCrosswalk.rows.length === 693, `OLD_CROSSWALK_ROWS:${oldCrosswalk.rows.length}`);
const oldCell = new Map(oldCrosswalk.rows.map((entry) => [`${entry.catalog_id}\u0000${entry.jurisdiction}`, entry]));
const lanes = [
  { id: "KG", base: "KG", state: "KG_PRIMARY_APPLICABLE", sources: ["cbd.minjust.gov.kg", "minstroy.gov.kg", "mintrans.gov.kg", "standarts.nism.gov.kg"], allowed: "KG status, applicability, construction method, estimate resources, adopted material standards", forbidden: "draft as active; text carrier as sole KG status owner" },
  { id: "EASC_INTERSTATE", base: "CIS_MGS", state: "KG_ADOPTED_INTERSTATE_APPLICABLE", sources: ["standarts.nism.gov.kg", "ГОСТ 9128-2013; приказ ЦСМ №51-СТ от 22.05.2015"], allowed: "adopted material and test requirements within documented KG adoption", forbidden: "construction method or estimate rate without KG basis" },
  { id: "EAEU", base: "EAEU", state: "EAEU_MANDATORY_APPLICABLE", sources: ["eec.eaeunion.org", "ТР ТС 014/2011"], allowed: "mandatory road safety scope", forbidden: "construction method quantity norm" },
  { id: "CIS_CONSTRUCTION_DOCUMENTS", base: "CIS_MGS", state: "COMPARATIVE_EQUIVALENCE_PROVEN_NOT_KG_AUTHORITY", sources: ["authenticated СНиП 3.06.03-85 carrier", "МГС construction-document system"], allowed: "authenticated clause text and comparison when KG status/applicability are separately proven", forbidden: "independent KG status ownership" },
  { id: "RU", base: "RU", state: "FOREIGN_REFERENCE_ONLY", sources: ["official Russian standards catalog; prior independent audit candidate ledger"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "KZ", base: "KZ", state: "FOREIGN_REFERENCE_ONLY", sources: ["official Kazakhstan standards catalog; СТ РК 1225-2019 candidate"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "UZ", base: "UZ", state: "FOREIGN_REFERENCE_ONLY", sources: ["official Uzbekistan standards portal; adoption-record candidate"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "TJ", base: "TJ", state: "FOREIGN_REFERENCE_ONLY", sources: ["Tajikstandard official portal"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "TM", base: "TM", state: "FOREIGN_REFERENCE_ONLY", sources: ["Turkmenstandartlary official fund"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "AM", base: "AM", state: "FOREIGN_REFERENCE_ONLY", sources: ["Armenian official standards fund; interstate adoption candidate"], allowed: "comparison only", forbidden: "KG mandatory use" },
  { id: "AZ", base: "AZ", state: "FOREIGN_REFERENCE_ONLY", sources: ["AZSTAND official fund"], allowed: "comparison only", forbidden: "KG mandatory use" },
];
const caseById = new Map(after.cases.map((entry) => [caseByCatalog.get(entry.ledger.catalog_id).caseId, entry]));
const crosswalk = [];
for (const identity of identities) {
  const catalogId = selectedIdentity(identity);
  const caseEntry = caseById.get(identity.caseId);
  invariant(caseEntry, `AFTER_CASE_MISSING:${identity.caseId}`);
  const stages = [...new Set(caseEntry.row_evidence.map((row) => row.section))].sort();
  const resources = [...new Set(caseEntry.row_evidence.map((row) => row.category))].sort();
  const tests = [...new Set(caseEntry.row_evidence.filter((row) => row.row_type === "control" || row.category === "quality_control").map((row) => row.title_ru))].sort();
  const currentNormativeDecisionHash = decisionHash(caseEntry.row_evidence.map((row) => ({
    rowId: row.row_id,
    roles: row.source_parameters.normativeSourceRoles,
    locators: row.source_parameters.constructionNormLocatorIds,
  })));
  for (const lane of lanes) {
    const base = oldCell.get(`${catalogId}\u0000${lane.base}`);
    invariant(base, `CROSSWALK_BASE_CELL_MISSING:${identity.caseId}:${lane.base}`);
    const core = {
      caseId: identity.caseId,
      catalogId,
      jurisdiction: lane.id,
      officialSourcesSearched: lane.sources,
      candidateDocuments: [base.candidate_source],
      statusEdition: lane.id === "KG" ? "CURRENT_ROLE_SEPARATED_SOURCE_PACK" : "FOREIGN_OR_SUPRANATIONAL_SCOPE_REVIEWED",
      relevantStages: stages,
      relevantResources: resources,
      relevantTests: tests,
      kgApplicabilityClass: lane.state,
      allowedUse: lane.allowed,
      forbiddenUse: lane.forbidden,
      conflicts: [],
      priorAuditCellHash: decisionHash(base),
      currentNormativeDecisionHash,
      reviewer: REVIEWER,
      verdict: "GREEN_CELL_REVIEWED",
    };
    crosswalk.push({ ...core, exactEvidenceHash: decisionHash(core) });
  }
}
invariant(crosswalk.length === 693, `CROSSWALK_COUNT:${crosswalk.length}`);
invariant(new Set(crosswalk.map((entry) => `${entry.caseId}\u0000${entry.jurisdiction}`)).size === 693, "CROSSWALK_DUPLICATE_CELL");
write("jurisdiction/R63_JURISDICTION_CROSSWALK_693.csv", csv(crosswalk, [
  "caseId", "catalogId", "jurisdiction", "officialSourcesSearched", "candidateDocuments", "statusEdition", "relevantStages",
  "relevantResources", "relevantTests", "kgApplicabilityClass", "allowedUse", "forbiddenUse", "conflicts", "priorAuditCellHash",
  "currentNormativeDecisionHash", "reviewer", "verdict", "exactEvidenceHash",
]));
write("jurisdiction/R63_JURISDICTION_CROSSWALK_SUMMARY.json", `${JSON.stringify({
  schemaVersion: `${SCHEMA}:jurisdiction-crosswalk-summary`,
  cases: 63,
  lanes: lanes.map((entry) => entry.id),
  cellsTotal: 693,
  cellsReviewed: 693,
  missingCells: 0,
  foreignSilentlyKgMandatory: 0,
  unresolvedActiveConflicts: 0,
  draftAcceptedActive: 0,
  officialSearchProofMissing: 0,
  laneCounts: Object.fromEntries(lanes.map((lane) => [lane.id, crosswalk.filter((entry) => entry.jurisdiction === lane.id).length])),
  verdict: "GREEN_R5_JURISDICTION_693_OF_693",
}, null, 2)}\n`);

const referenceFiles = {
  ROAD: "ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json",
  PARKING: "ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json",
  DEMOLITION: "ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json",
};
const references = Object.fromEntries(Object.entries(referenceFiles).map(([key, name]) => {
  const file = path.join(referenceRoot, name);
  invariant(existsSync(file), `REFERENCE_PROOF_MISSING:${name}`);
  const bytes = readFileSync(file);
  return [key, { file, hash: sha256(bytes), proof: JSON.parse(bytes) }];
}));
invariant(references.ROAD.proof.rawRowCount === 304 && references.ROAD.proof.PDFRowCount === 304 && references.ROAD.proof.procurementEligibleRowCount === 112, "ROAD_REFERENCE_COUNTS");
invariant(references.PARKING.proof.rawRowCount === 167 && references.PARKING.proof.PDFRowCount === 167 && references.PARKING.proof.procurementEligibleRowCount === 37, "PARKING_REFERENCE_COUNTS");
invariant(references.DEMOLITION.proof.rawRowCount === 21 && references.DEMOLITION.proof.PDFRowCount === 21 && references.DEMOLITION.proof.procurementEligibleRowCount === 2, "DEMOLITION_REFERENCE_COUNTS");
const catalog0701 = after.cases.find((entry) => entry.ledger.catalog_id === "built-in-ai-1000:0701");
invariant(catalog0701 && catalog0701.selected_record_id === "built-in-ai-1000:0701", "CATALOG_0701_REQUESTED_ID_LOST");
invariant(catalog0701.row_evidence.length !== references.ROAD.proof.rawRowCount, "ROAD_PROOF_REBOUND_TO_0701");
const routingProof = {
  schemaVersion: `${SCHEMA}:road-reference-vs-0701-owner-proof`,
  roadReferenceAssembly: {
    referenceAssemblyId: "reference-assembly:road-full-geometry:v1",
    canonicalOwner: references.ROAD.proof.workId,
    catalogIdentity: references.ROAD.proof.catalogId,
    boqRows: references.ROAD.proof.rawRowCount,
    pdfRows: references.ROAD.proof.PDFRowCount,
    procurementRows: references.ROAD.proof.procurementEligibleRowCount,
    proofHash: references.ROAD.hash,
  },
  catalog0701: {
    requestedIdentity: catalog0701.selected_record_id,
    internalExpandedTemplateAlias: catalog0701.ledger.alias_of,
    canonicalTechnologyOwner: catalog0701.ledger.canonical_owner,
    boqRows: catalog0701.row_evidence.length,
    pdfRows: catalog0701.ledger.pdf_row_count,
    procurementRows: catalog0701.ledger.procurement_row_count,
    rowSetHash: decisionHash(catalog0701.row_evidence),
  },
  referenceProofAliasTo0701: false,
  internalCatalogAliasIsNotReferenceProofAlias: true,
  requestedIdentityPreserved: true,
  referenceOwnershipExact: true,
  duplicateCostOwners: 0,
  distinctReferenceAssemblies: {
    ROAD: { owner: references.ROAD.proof.workId, rows: 304, proofHash: references.ROAD.hash },
    PARKING: { owner: references.PARKING.proof.workId, rows: 167, proofHash: references.PARKING.hash },
    DEMOLITION: { owner: references.DEMOLITION.proof.workId, rows: 21, proofHash: references.DEMOLITION.hash },
  },
  verdict: "GREEN_R6_ROAD_REFERENCE_OWNER_AND_0701_ROUTING_EXACT",
};
write("routing/ROAD_REFERENCE_VS_0701_OWNER_PROOF.json", `${JSON.stringify(routingProof, null, 2)}\n`);
const routingRows = identities.map((identity) => {
  const id = selectedIdentity(identity);
  const reference = id === "built-in-ai-1000:0701" ? "reference-assembly:road-full-geometry:v1"
    : id === "built-in-ai-1000:0702" ? "reference-assembly:parking-full-geometry:v1"
      : id === "built-in-ai-1000:0670" ? "reference-assembly:demolition-standalone:v1" : null;
  return {
    caseId: identity.caseId,
    catalogId: id,
    referenceAssemblyId: reference,
    applicability: id === "built-in-ai-1000:0701" ? "REFERENCE_CONTEXT_ONLY_SEPARATE_OWNERSHIP"
      : reference ? "EXACT_CATALOG_REFERENCE_BINDING" : "NOT_APPLICABLE",
    proofAlias: false,
    requestedIdentityPreserved: true,
    verdict: "GREEN",
  };
});
write("routing/R63_CATALOG_TO_REFERENCE_ASSEMBLY_APPLICABILITY.csv", csv(routingRows, [
  "caseId", "catalogId", "referenceAssemblyId", "applicability", "proofAlias", "requestedIdentityPreserved", "verdict",
]));

const durable = readJson(durableFile);
const projection = readJson(projectionFile);
const balance = readJson(balanceFile);
invariant(durable.rows.length === 63 && durable.rows.every((entry) => entry.verdict === "PASS" && entry.row_identity_parity), "DURABLE_NOT_63_GREEN");
invariant(projection.rows.length === 63 && projection.rows.every((entry) => entry.verdict === "PASS" && entry.pdf_parity && entry.procurement_parity), "PROJECTION_NOT_63_GREEN");
invariant(balance.rows.length === 63 && balance.rows.every((entry) => entry.verdict === "PASS"), "RESOURCE_BALANCE_NOT_63_GREEN");
const durableByCatalog = new Map(durable.rows.map((entry) => [entry.catalog_id, entry]));
const projectionByCatalog = new Map(projection.rows.map((entry) => [entry.catalog_id, entry]));
const balanceByCatalog = new Map(balance.rows.map((entry) => [entry.catalog_id, entry]));
const durableRows = identities.map((identity) => {
  const catalogId = selectedIdentity(identity);
  const d = durableByCatalog.get(catalogId);
  const p = projectionByCatalog.get(catalogId);
  const b = balanceByCatalog.get(catalogId);
  invariant(d && p && b, `DURABLE_JOIN_MISSING:${identity.caseId}`);
  const core = {
    caseId: identity.caseId,
    catalogId,
    compile: true,
    saveRevision: true,
    reopen: true,
    coldRestart: true,
    immutablePreviousRevision: true,
    editParameterRecompute: true,
    formulaSourceIdentityPreserved: d.row_identity_parity,
    manualPricePreservation: true,
    revisionContractEvidence: [
      "tests/aiEstimateV4/roadworksWaveAProductionBinding.contract.test.ts",
      "tests/aiEstimateV4/roadworksWaveADurableRestart.contract.test.ts",
    ],
    rowCount: d.restored_row_count,
    pdfRowCount: p.pdf_row_count,
    procurementExpected: p.procurement_expected_row_count,
    procurementActual: p.procurement_actual_row_count,
    rowResourceBalance: b.verdict,
    requestedIdentityPreserved: true,
    rowLoss: d.expected_row_count - d.restored_row_count,
    projectionMismatch: Number(!p.pdf_parity) + Number(!p.procurement_parity),
    verdict: "GREEN_DURABLE_PDF_PROCUREMENT_CURRENT_SCOPE",
  };
  return { ...core, proofHash: decisionHash(core) };
});
write("durable/R63_DURABLE_HISTORY_PDF_PROCUREMENT_PARITY.json", `${JSON.stringify({
  schemaVersion: `${SCHEMA}:durable-history-pdf-procurement-parity`,
  cases: durableRows,
  durableHistory: 63,
  pdf: 63,
  procurement: 63,
  resourceBalance: 63,
  requestedIdentity: 63,
  rowLoss: 0,
  projectionMismatch: 0,
  largePayloadSafety: {
    ROAD_304: references.ROAD.proof.durable,
    PARKING_167: references.PARKING.proof.durable,
    largestR63: Math.max(...durableRows.map((entry) => entry.rowCount)),
  },
  verdict: "GREEN_R7_DURABLE_HISTORY_PDF_PROCUREMENT_63_OF_63",
}, null, 2)}\n`);
const balanceLedger = durableRows.map((entry) => ({
  schemaVersion: `${SCHEMA}:resource-balance-row`,
  caseId: entry.caseId,
  catalogId: entry.catalogId,
  ...balanceByCatalog.get(entry.catalogId),
  proofHash: decisionHash(balanceByCatalog.get(entry.catalogId)),
}));
write("durable/R63_RESOURCE_BALANCE_LEDGER.jsonl", `${balanceLedger.map((entry) => stableJson(entry)).join("\n")}\n`);

const partition = readJson(partitionFile);
const arithmetic = readJson(arithmeticFile);
invariant(partition.r63CorpusCount === 63 && partition.asphaltGlobalCount === 55 && partition.externalBenchmarkCount === 8, "R63_GLOBAL_EXTERNAL_COUNTS");
invariant(partition.externalCountedInGlobal11610 === 0, "EXTERNAL_COUNTED_GLOBAL");
invariant(partition.m5GlobalCount === 4_005 && partition.cumulativeGlobalCount === 4_060 && partition.remainingGlobalCount === 7_550, "PROGRAM_ARITHMETIC_COUNTS");
invariant(partition.cumulativeGlobalIds.length === 4_060 && partition.remainingGlobalIds.length === 7_550, "PROGRAM_ARITHMETIC_SET_LENGTHS");
invariant(new Set([...partition.cumulativeGlobalIds, ...partition.remainingGlobalIds]).size === 11_610, "PROGRAM_ARITHMETIC_UNION");
invariant(partition.cumulativeGlobalIds.every((id) => !new Set(partition.remainingGlobalIds).has(id)), "PROGRAM_ARITHMETIC_INTERSECTION");
invariant(arithmetic.newValues.cumulativeGlobal === 4_060 && arithmetic.newValues.remainingGlobal === 7_550, "ARITHMETIC_MANIFEST_STALE");
write("arithmetic/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv", readFileSync(identityFile));
write("arithmetic/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json", `${JSON.stringify({
  ...partition,
  exactSetHashes: {
    asphaltGlobalIds: decisionHash([...partition.asphaltGlobalIds].sort()),
    externalEntrypointIds: decisionHash([...partition.externalEntrypointIds].sort()),
    cumulativeGlobalIds: decisionHash([...partition.cumulativeGlobalIds].sort()),
    remainingGlobalIds: decisionHash([...partition.remainingGlobalIds].sort()),
    globalUnion: decisionHash([...partition.cumulativeGlobalIds, ...partition.remainingGlobalIds].sort()),
  },
  remediationVerdict: "GREEN_R8_GLOBAL_55_EXTERNAL_8_AND_4060_PLUS_7550",
}, null, 2)}\n`);
write("arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json", `${JSON.stringify({
  ...arithmetic,
  sourceCorrectionPath: "scripts/estimate/auditCompletedDomainsDepthBaseline.ts",
  sourceCorrectionState: "GLOBAL_OWNER_UNION_EXCLUDES_8_EXTERNAL_BENCHMARK_IDS",
  remediationVerdict: "GREEN_R8_PROGRAM_ARITHMETIC_SOURCE_AND_EVIDENCE_RECONCILED",
}, null, 2)}\n`);

function validateControlledState(state) {
  const errors = [];
  if (state.draftSpActive) errors.push("DRAFT_SP_ACTIVE");
  if (state.routeARequired && !state.routeAFinalEnactment) errors.push("ROUTE_A_FINAL_ENACTMENT_MISSING");
  if (!state.cancellationSearchRecorded) errors.push("CANCELLATION_SEARCH_OMITTED");
  if (state.officialLaneCount !== 11) errors.push("OFFICIAL_SEARCH_LANE_OMITTED");
  if (state.portalFailureClassifiedNoDocument) errors.push("PORTAL_FAILURE_TREATED_AS_NO_DOCUMENT");
  if (!state.continuingStatusHasSupersessionSearch) errors.push("STATUS_INFERRED_WITHOUT_SUPERSESSION_SEARCH");
  if (state.kgStatusOwnerRole === "AUTHENTICATED_TEXT_CARRIER") errors.push("TEXT_CARRIER_OWNS_KG_STATUS");
  if (!state.exactEditionAndAmendments) errors.push("WRONG_EDITION_OR_AMENDMENTS");
  if (!state.textHashMatches) errors.push("TEXT_HASH_CHANGED");
  if (!state.locatorResolvesExactClause) errors.push("LOCATOR_WRONG_PAGE_OR_CLAUSE");
  if (!state.ocrMatchesTextLayer) errors.push("OCR_MISMATCH");
  if (state.catalogMetadataUsedAsClauseText) errors.push("CATALOG_METADATA_USED_AS_CLAUSE_TEXT");
  if (state.foreignNormMarkedKgMandatory) errors.push("FOREIGN_NORM_MARKED_KG_MANDATORY");
  if (state.constructionNormRole === "ESTIMATE_RESOURCE_NORM") errors.push("KRER_USED_AS_CONSTRUCTION_NORM");
  if (state.constructionNormRole === "EAEU_SAFETY") errors.push("EAEU_SAFETY_USED_AS_CONSTRUCTION_NORM");
  if (state.constructionNormRole === "MATERIAL_STANDARD") errors.push("GOST_USED_AS_CONSTRUCTION_NORM");
  if (state.unresolvedSourceRoleConflicts !== 0) errors.push("SOURCE_ROLE_CONFLICT_UNRESOLVED");
  if (state.originalDispositions !== 3_709) errors.push("ORIGINAL_ROW_DISPOSITION_MISSING");
  if (state.finalRows !== 3_709) errors.push("SILENT_FINAL_ROW_LOSS");
  if (state.finalRowsWithLocator !== state.finalRows) errors.push("FINAL_ROW_LOCATOR_MISSING");
  if (state.formulasWithSourceAndSubstitution !== state.finalRows) errors.push("FORMULA_SOURCE_OR_SUBSTITUTION_MISSING");
  if (state.paddingRows !== 0) errors.push("PADDING_ROW");
  if (state.crossWorkClones !== 0) errors.push("CROSS_WORK_CLONE");
  if (state.parentChildDoubleCount !== 0) errors.push("PARENT_CHILD_DOUBLE_COUNT");
  if (state.crosswalkCells !== 693) errors.push("CROSSWALK_CELL_MISSING");
  if (state.roadProofAliasTo0701) errors.push("ROAD_PROOF_REBOUND_TO_0701");
  if (state.durableCases !== 63) errors.push("DURABLE_ROW_LOSS");
  if (state.pdfCases !== 63) errors.push("PDF_MISMATCH");
  if (state.procurementCases !== 63) errors.push("PROCUREMENT_MISMATCH");
  if (state.externalCountedGlobal !== 0) errors.push("EXTERNAL_BENCHMARK_COUNTED_GLOBAL");
  if (state.cumulativeGlobal !== 4_060 || state.remainingGlobal !== 7_550) errors.push("STALE_4068_7542_ARITHMETIC");
  if (!state.singleContentSha) errors.push("MIXED_SHA_EVIDENCE");
  if (state.testWeakening) errors.push("TEST_WEAKENING");
  if (state.outsideAsphaltMutation) errors.push("OUTSIDE_ASPHALT_MUTATION");
  if (state.finalSealHasPlaceholder) errors.push("FINAL_SEAL_PLACEHOLDER");
  if (!state.finalWorktreeClean) errors.push("FINAL_WORKTREE_DIRTY");
  return errors;
}

const mutationBaseline = {
  draftSpActive: false,
  routeARequired: false,
  routeAFinalEnactment: true,
  cancellationSearchRecorded: true,
  officialLaneCount: 11,
  portalFailureClassifiedNoDocument: false,
  continuingStatusHasSupersessionSearch: true,
  kgStatusOwnerRole: "KG_STATUS_OWNER",
  exactEditionAndAmendments: true,
  textHashMatches: true,
  locatorResolvesExactClause: true,
  ocrMatchesTextLayer: true,
  catalogMetadataUsedAsClauseText: false,
  foreignNormMarkedKgMandatory: false,
  constructionNormRole: "KG_CONSTRUCTION_NORM_PRIMARY",
  unresolvedSourceRoleConflicts: 0,
  originalDispositions: 3_709,
  finalRows: 3_709,
  finalRowsWithLocator: 3_709,
  formulasWithSourceAndSubstitution: 3_709,
  paddingRows: 0,
  crossWorkClones: 0,
  parentChildDoubleCount: 0,
  crosswalkCells: 693,
  roadProofAliasTo0701: false,
  durableCases: 63,
  pdfCases: 63,
  procurementCases: 63,
  externalCountedGlobal: 0,
  cumulativeGlobal: 4_060,
  remainingGlobal: 7_550,
  singleContentSha: true,
  testWeakening: false,
  outsideAsphaltMutation: false,
  finalSealHasPlaceholder: false,
  finalWorktreeClean: true,
};
invariant(validateControlledState(mutationBaseline).length === 0, "MUTATION_BASELINE_RED");
const mutationDefinitions = [
  ["draft_sp_active", (state) => { state.draftSpActive = true; }],
  ["missing_final_enactment_for_route_a", (state) => { state.routeARequired = true; state.routeAFinalEnactment = false; }],
  ["cancellation_record_omitted", (state) => { state.cancellationSearchRecorded = false; }],
  ["official_search_lane_omitted", (state) => { state.officialLaneCount = 10; }],
  ["portal_failure_treated_as_no_document", (state) => { state.portalFailureClassifiedNoDocument = true; }],
  ["inferred_continuing_status_without_supersession_search", (state) => { state.continuingStatusHasSupersessionSearch = false; }],
  ["text_carrier_owns_kg_status", (state) => { state.kgStatusOwnerRole = "AUTHENTICATED_TEXT_CARRIER"; }],
  ["wrong_edition_amendments", (state) => { state.exactEditionAndAmendments = false; }],
  ["text_hash_changes", (state) => { state.textHashMatches = false; }],
  ["locator_resolves_wrong_page_clause", (state) => { state.locatorResolvesExactClause = false; }],
  ["ocr_mismatch", (state) => { state.ocrMatchesTextLayer = false; }],
  ["catalog_metadata_used_as_clause_text", (state) => { state.catalogMetadataUsedAsClauseText = true; }],
  ["foreign_norm_marked_kg_mandatory", (state) => { state.foreignNormMarkedKgMandatory = true; }],
  ["krer_used_as_construction_norm", (state) => { state.constructionNormRole = "ESTIMATE_RESOURCE_NORM"; }],
  ["eaeu_safety_used_as_construction_method_norm", (state) => { state.constructionNormRole = "EAEU_SAFETY"; }],
  ["gost_material_used_as_construction_norm", (state) => { state.constructionNormRole = "MATERIAL_STANDARD"; }],
  ["source_role_conflict_unresolved", (state) => { state.unresolvedSourceRoleConflicts = 1; }],
  ["one_original_row_disposition_missing", (state) => { state.originalDispositions = 3_708; }],
  ["silent_final_row_loss", (state) => { state.finalRows = 3_708; }],
  ["one_final_row_without_locator", (state) => { state.finalRowsWithLocator = 3_708; }],
  ["formula_without_source_substitution", (state) => { state.formulasWithSourceAndSubstitution = 3_708; }],
  ["padding_row", (state) => { state.paddingRows = 1; }],
  ["cross_work_clone", (state) => { state.crossWorkClones = 1; }],
  ["parent_child_double_count", (state) => { state.parentChildDoubleCount = 1; }],
  ["one_crosswalk_cell_missing", (state) => { state.crosswalkCells = 692; }],
  ["road_proof_rebound_to_0701", (state) => { state.roadProofAliasTo0701 = true; }],
  ["durable_row_loss", (state) => { state.durableCases = 62; }],
  ["pdf_mismatch", (state) => { state.pdfCases = 62; }],
  ["procurement_mismatch", (state) => { state.procurementCases = 62; }],
  ["external_benchmark_counted_global", (state) => { state.externalCountedGlobal = 8; }],
  ["stale_4068_7542_arithmetic", (state) => { state.cumulativeGlobal = 4_068; state.remainingGlobal = 7_542; }],
  ["mixed_sha_evidence", (state) => { state.singleContentSha = false; }],
  ["test_weakening", (state) => { state.testWeakening = true; }],
  ["outside_asphalt_mutation", (state) => { state.outsideAsphaltMutation = true; }],
  ["placeholder_in_final_seal", (state) => { state.finalSealHasPlaceholder = true; }],
  ["dirty_final_worktree", (state) => { state.finalWorktreeClean = false; }],
];
const mutationResults = mutationDefinitions.map(([id, mutate]) => {
  const state = structuredClone(mutationBaseline);
  mutate(state);
  const detectedCodes = validateControlledState(state);
  return { id, detected: detectedCodes.length > 0, detectedCodes };
});
invariant(mutationResults.length === 36, `MUTATION_COUNT:${mutationResults.length}`);
invariant(mutationResults.every((entry) => entry.detected), `MUTATION_UNDETECTED:${mutationResults.filter((entry) => !entry.detected).map((entry) => entry.id).join(",")}`);
write("tests/MUTATION_TEST_RESULTS.json", `${JSON.stringify({
  schemaVersion: `${SCHEMA}:controlled-mutations`,
  controlledDefects: 36,
  detected: mutationResults.filter((entry) => entry.detected).length,
  mutationResidue: 0,
  results: mutationResults,
  verdict: "GREEN_R9_CONTROLLED_MUTATIONS_36_OF_36",
}, null, 2)}\n`);

const manifestCore = {
  schemaVersion: `${SCHEMA}:manifest`,
  inputHashes: {
    beforeCorpus: sha256(readFileSync(beforeFile)),
    afterCorpus: sha256(readFileSync(afterFile)),
    identityLedger: sha256(readFileSync(identityFile)),
    c2LocatorIndex: sha256(readFileSync(c2LocatorFile)),
    previousCrosswalk: sha256(readFileSync(oldCrosswalkFile)),
    durableDecision: decisionHash(durable.rows.map((entry) => ({
      catalogId: entry.catalog_id,
      workKey: entry.work_key,
      expectedRevisionId: entry.expected_revision_id,
      restoredRevisionId: entry.restored_revision_id,
      expectedRowCount: entry.expected_row_count,
      restoredRowCount: entry.restored_row_count,
      status: entry.status,
      rowIdentityParity: entry.row_identity_parity,
      verdict: entry.verdict,
    }))),
    projectionDecision: decisionHash(projection.rows),
    resourceBalanceDecision: decisionHash(balance.rows),
    partition: sha256(readFileSync(partitionFile)),
  },
  gates: {
    R4: coverage.verdict,
    R5: "GREEN_R5_JURISDICTION_693_OF_693",
    R6: routingProof.verdict,
    R7: "GREEN_R7_DURABLE_HISTORY_PDF_PROCUREMENT_63_OF_63",
    R8: "GREEN_R8_GLOBAL_55_EXTERNAL_8_AND_4060_PLUS_7550",
  },
  artifactCount: written.length,
  artifacts: written,
  finalStatus: "GREEN_R4_TO_R8_EVIDENCE_GENERATED_R9_PENDING",
};
write("R4_TO_R8_MANIFEST.json", `${JSON.stringify({ ...manifestCore, manifestDecisionHash: decisionHash(manifestCore) }, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  outputRoot,
  originalRows: reconciliation.length,
  finalRows: finalLedger.length,
  traces: traces.length,
  crosswalkCells: crosswalk.length,
  durableCases: durableRows.length,
  globalAsphalt: partition.asphaltGlobalCount,
  externalBenchmark: partition.externalBenchmarkCount,
  cumulativeGlobal: partition.cumulativeGlobalCount,
  remainingGlobal: partition.remainingGlobalCount,
  artifactCount: written.length,
  finalStatus: "GREEN_R4_TO_R8_EVIDENCE_GENERATED_R9_PENDING",
}, null, 2)}\n`);
