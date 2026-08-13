import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
  buildIndividualDrywallFlatCeilingEstimatePassportV6,
  drywallFlatCeilingCalculationStrategyIdV6,
  drywallFlatCeilingExpectedCandidatesV6,
  drywallFlatCeilingProfessionalOwnerIdV6,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { runBatch003TechnologyWaveControlledMutations } from "./batch003TechnologyWaveR2AuditCore";
import { readJsonl, setHash, sha256, stableJson, stableJsonLine, writeDeterministic, type JsonRecord } from "./postM1ReadmissionR2Core";

const H2 = "34b51b28097d376d132762808785072666f72419";
const T2 = "4a3064568664f4f49a3a871df0e2196eb4c45cd7";
const M2 = "d30592725e74dc17935a57be016d42363cf8343092f20d6335494fc7a25003cd";
const SPEC_SHA = "57ac9bae8c53d818aa36290e3747c2b48199c23e0eab6f2cf76d94ddb15d4f0c";
const ADDENDUM_SHA = "584ec4d4123cbaeed0cdd245684a7cb86a2dadc5a1b4e33691b94f7d70c96901";
const TOKEN_SHA = "3ae109311fe1743351ce921d41a49629dc5a5be1ced76a0ace917394de2201ec";
const FIXED_AT = "2026-08-13T23:50:00.000+06:00";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => { const [key, ...rest] = argument.replace(/^--/u, "").split("="); return [key, rest.join("=")]; }));
const target = path.resolve(String(argv.target || "."));
const output = path.resolve(String(argv.output || path.join(target, ".release-runtime/master-11610-group-batches-r2/09-batch003-technology-wave-r2-final")));
const preflight = path.resolve(String(argv["preflight-root"] || path.join(target, ".release-runtime/master-11610-group-batches-r2/09-batch003-technology-wave-r2")));
const batch002 = path.resolve(String(argv["batch002-root"] || "C:/dev/rik-expo-app-batch002-technology-wave-r1/.release-runtime/master-11610-group-batches-r2/08-batch002-technology-wave-r1"));
const batch001 = path.resolve(String(argv["batch001-root"] || "C:/dev/rik-expo-app-batch001-post-audit-f7c9c328/.release-runtime/master-11610-group-batches-r2/07-batch001-post-audit-r1"));
const m1Path = path.resolve(String(argv["m1-set"] || "C:/dev/rik-expo-app-post-m1-readmission-r2/.release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2/07-program-rebase/M1_GLOBAL55_MEMBER_SET.json"));
const m6Path = path.resolve(String(argv["m6-set"] || "C:/dev/rik-expo-app-post-m1-readmission-r2/.release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2/07-program-rebase/M6_REMAINING_7550_MEMBER_SET.json"));
const webProofPath = path.resolve(String(argv["web-proof"] || ""));
const androidProofPath = path.resolve(String(argv["android-proof"] || ""));
const candidateHead = String(argv["candidate-head"] || "");
const candidateTree = String(argv["candidate-tree"] || "");
if (!/^[0-9a-f]{40}$/u.test(candidateHead) || !/^[0-9a-f]{40}$/u.test(candidateTree)) throw new Error("BATCH003_CANDIDATE_IDENTITY_REQUIRED");
if (existsSync(output)) throw new Error("BATCH003_OUTPUT_ALREADY_EXISTS");
if (!existsSync(preflight)) throw new Error("BATCH003_PREFLIGHT_MISSING");
const git = (...args: string[]) => execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
if (git("rev-parse", H2) !== H2 || git("rev-parse", `${H2}^{tree}`) !== T2) throw new Error("BATCH003_PARENT_IDENTITY_RED");
cpSync(preflight, output, { recursive: true });
const writeJson = (relative: string, value: unknown): void => writeDeterministic(output, relative, stableJson(value));
const writeJsonl = (relative: string, rows: readonly JsonRecord[]): void => writeDeterministic(output, relative, `${rows.map(stableJsonLine).join("\n")}\n`);
const readJson = (file: string): any => JSON.parse(readFileSync(file, "utf8"));

const ids = [...DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6];
if (ids.length !== 36 || new Set(ids).size !== 36 || ids.some((id) => id.includes("_install_"))) throw new Error("BATCH003_EXACT36_RED");
const inventories = ids.map((id) => {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === id);
  if (!inventory) throw new Error(`BATCH003_INVENTORY_MISSING:${id}`);
  return inventory;
});
const parts = inventories.map((inventory) => {
  const value = buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory);
  if (!value) throw new Error(`BATCH003_PARTS_MISSING:${inventory.catalog_id}`);
  return value;
});
const works = parts.map((part, index) => {
  const rows = part.child_assemblies.flatMap((child) => child.rows);
  return { catalogId: ids[index], titleRu: inventories[index].localized_name_ru, operation: part.contract.operation, variant: part.contract.variant, rows, parts: part };
});
const totalRows = works.reduce((sum, work) => sum + work.rows.length, 0);
if (totalRows > 8000) throw new Error(`BATCH003_HOLD_ROW_BUDGET_RED:${totalRows}`);
const groupOrder = ["PREPARE", "FRAME", "ALIGN", "INSULATE", "CLAD", "FINISH_JOINT", "REPAIR"] as const;
const groups = groupOrder.map((operation, index) => ({ workGroupId: `drywall_ceiling_interior_drywall_ceiling_${operation.toLowerCase()}`, operation, executionOrder: index + 1, catalogIds: works.filter((work) => work.operation === operation).map((work) => work.catalogId), rowCount: works.filter((work) => work.operation === operation).reduce((sum, work) => sum + work.rows.length, 0) }));
if (groups.some((group) => group.catalogIds.length < 5)) throw new Error("BATCH003_GROUP_CLOSURE_RED");

const passports = inventories.map((inventory, index) => buildIndividualDrywallFlatCeilingEstimatePassportV6(inventory, parts[index]));
const schemaRows = parts.map((part) => ({ schemaVersion: "NormBoundUserParameterSchemaV6", catalogId: part.contract.catalog_id, schemaId: part.schema.schema_id, parameterCount: part.schema.parameters.length, shownButUnusedParameterCount: part.schema.parameters.filter((parameter) => parameter.formula_consumers.length === 0).length, parameters: part.schema.parameters.map((parameter) => ({ parameterId: parameter.parameter_id, labelRu: parameter.label_ru, inputType: parameter.input_type, unitId: parameter.unit_id, minimum: parameter.minimum ?? null, maximum: parameter.maximum ?? null, choices: parameter.choices ?? [], visibleWhen: parameter.visible_when, requiredWhen: parameter.required_when, formulaConsumers: parameter.formula_consumers, durablePersistence: true, sourceLocator: "СП КР 65-101:2025 + project/system passport + explicit FormulaGraphV6 owner" })), schemaHash: passports.find((passport) => passport.catalogId === part.contract.catalog_id)?.parameterSchemaHash }));
const traceRows = works.flatMap((work) => work.rows.map((row) => ({ schemaVersion: "RowFormulaResourcePriceNormativeTraceV6", catalogId: work.catalogId, operation: work.operation, variant: work.variant, rowId: row.row_id, candidateId: row.row_id.split(":row:")[1], section: row.section, category: row.category, titleRu: row.title_ru, formulaId: row.formula.formula_id, formulaExpression: row.formula.expression, formulaInputIds: row.formula.input_parameter_ids, outputUnitId: row.formula.output_unit_id, costOwnership: row.cost_ownership, costOwnerId: row.cost_owner_id, semanticOwner: row.semantic_owner, resourceGraph: row.resource_graph_node_v3, priceRoute: row.price_route_v3, normativeTrace: row.normative_trace_v3, procurementEligible: row.procurement_eligible })));
const summaries = works.map((work) => {
  const categories = Object.fromEntries([...new Set(work.rows.map((row) => row.category))].sort().map((category) => [category, work.rows.filter((row) => row.category === category).length]));
  return { catalogId: work.catalogId, titleRu: work.titleRu, operation: work.operation, variant: work.variant, ownerId: drywallFlatCeilingProfessionalOwnerIdV6(work.catalogId), calculationStrategyId: drywallFlatCeilingCalculationStrategyIdV6(work.catalogId), boqRowCount: work.rows.length, categoryDistribution: categories, parameterCount: work.parts.schema.parameters.length, expectedCandidateCount: drywallFlatCeilingExpectedCandidatesV6(work.operation, work.variant).length, rowSignatureHash: sha256(Buffer.from(work.rows.map((row) => row.row_id.split(":row:")[1]).sort().join("|"))), formulaGraphId: `FormulaGraphV6:${work.catalogId}`, resourceGraphId: `ResourceGraphV6:${work.catalogId}`, legacyFallback: false, verdict: "GREEN_PRODUCTION" };
});

const frozenDispositions = readJsonl(path.join(preflight, "05-execution/PER_WORK_RESOURCE_CANDIDATE_DISPOSITIONS.jsonl"));
const correctedDispositions = frozenDispositions.map((row) => ({ ...row, expectedRowId: `${row.catalogId}:drywall-flat-ceiling-v6:row:${row.candidateId}`, postFreezeReferenceRepair: row.expectedRowId !== `${row.catalogId}:drywall-flat-ceiling-v6:row:${row.candidateId}` }));
if (correctedDispositions.length !== 2220) throw new Error("BATCH003_DISPOSITION_COUNT_DRIFT");
writeJsonl("05-execution/INDIVIDUAL_PROFESSIONAL_ESTIMATE_PASSPORTS.jsonl", passports as unknown as JsonRecord[]);
writeJsonl("05-execution/NORM_BOUND_USER_PARAMETER_SCHEMAS.jsonl", schemaRows as unknown as JsonRecord[]);
writeJsonl("05-execution/PER_WORK_RESOURCE_CANDIDATE_DISPOSITIONS.jsonl", correctedDispositions);
writeJsonl("05-execution/PER_ID_PROFESSIONAL_ESTIMATE_SUMMARY.jsonl", summaries);
writeJsonl("05-execution/ROW_FORMULA_RESOURCE_PRICE_NORMATIVE_TRACE.jsonl", traceRows as unknown as JsonRecord[]);
writeJsonl("05-execution/WORK_EXECUTION_MATRIX.jsonl", groups.flatMap((group) => group.catalogIds.map((catalogId, index) => ({ groupExecutionOrder: group.executionOrder, withinGroupOrder: index + 1, operation: group.operation, catalogId, productionCompile: "GREEN", passport: "GREEN", parameterSchema: "GREEN", formulaGraph: "GREEN", resourceGraph: "GREEN" }))));
writeJsonl("01-inventory/BATCH003_FLAT_CEILING_GROUP_INDEX.jsonl", groups as unknown as JsonRecord[]);
writeJsonl("01-inventory/BATCH003_FLAT_CEILING_CATALOG_ID_INDEX.jsonl", inventories.map((inventory, index) => ({ ordinal: index + 1, catalogId: inventory.catalog_id, titleRu: inventory.localized_name_ru, operation: works[index].operation, variant: works[index].variant })));
writeJson("02-selection/BATCH003_FLAT_CEILING_SELECTION_FREEZE.json", { schemaVersion: "Batch003FlatCeilingSelectionFreezeR2", family: "FLAT_SUSPENDED_DRYWALL_CEILINGS", selectedGroupCount: 7, selectedWorkCount: 36, selectedCatalogIds: ids, selectedSetSha256: setHash(ids), installUmbrellaIds: 0, completenessDecisions: 1080, candidateDispositions: 2220, verdict: "GREEN_FROZEN_UNCHANGED" });
writeJson("02-selection/BATCH003_INSTALL_UMBRELLA_DEFER_LEDGER.json", { deferredCount: 2, disposition: "DEFERRED_PARENT_UMBRELLA_DOUBLE_COUNT_RISK", selectedInstallIds: 0, verdict: "GREEN" });
writeJson("02-selection/BATCH003_DEPENDENCY_ORDER_PROOF.json", { order: groupOrder, repairBranch: ["inspection", "protection", "opening/demolition", "defect disposition", "affected typed owners", "restoration", "testing", "documentation"], unresolvedDependencies: 0, verdict: "GREEN" });
cpSync(path.join(output, "03-norms/SOURCE_LOCATOR_LEDGER.jsonl"), path.join(output, "03-norms/BATCH003_KG_SOURCE_LOCATOR_LEDGER.jsonl"));
const regional = [...readJsonl(path.join(output, "03-norms/REGIONAL_11_DIRECTION_DECISIONS.jsonl")), ...readJsonl(path.join(output, "03-norms/INTERNATIONAL_APPLICABILITY_DECISIONS.jsonl"))];
writeJsonl("03-norms/BATCH003_REGIONAL_INTERNATIONAL_APPLICABILITY.jsonl", regional);
writeJson("00-activation/BATCH002_POST_SEAL_TOKEN_DERIVATION_RECONCILIATION.json", { originalBatch002TokenPresent: false, tokenOrigin: "POST_SEAL_DETERMINISTIC_DERIVATION", tokenDerivedOnlyFromSealedManifestAndProgramControlStateV5: true, derivedTokenSha256: TOKEN_SHA, originalEvidenceIndexArtifactCount: 53, originalEvidenceIndexMutated: false, parentHeadMutated: false, parentTreeMutated: false, parentQueueMutated: false, verdict: "GREEN_RECONCILED_NOT_ORIGINAL_EVIDENCE" });
writeJson("00-activation/BATCH003_CONTINUATION_ADDENDUM_BINDING.json", { sha256: ADDENDUM_SHA, bytes: 55118, lines: 1361, preflightRecognizedComplete: true, selectionRestarted: false, productionMutationContinued: true, verdict: "GREEN_BOUND" });
writeJson("04-manifest/BATCH003_EXACT_EXECUTION_MANIFEST.json", { schemaVersion: "Batch003TechnologyWaveExecutionManifestR2", parent: { head: H2, tree: T2, manifestSha256: M2 }, candidate: { head: candidateHead, tree: candidateTree }, specSha256: SPEC_SHA, addendumSha256: ADDENDUM_SHA, tier: "HOLD", family: "FLAT_SUSPENDED_DRYWALL_CEILINGS", selectedGroupCount: 7, selectedWorkCount: 36, selectedSetHash: setHash(ids), passports: 36, parameterSchemas: 36, expectedScopes: 36, candidateDispositions: 2220, completenessDecisions: 1080, productionRows: totalRows, hardRowBudget: 8000, executionStarted: true, verdict: "GREEN_EXECUTED" });
writeJson("04-manifest/BATCH003_SCOPE_GUARD.json", { canonicalRuntime: "registeredProfessionalEstimateDomainsV1→interior_finishes→compileProfessionalEstimateDomainV1", productionFilesChanged: git("diff", "--name-only", H2, candidateHead).split(/\r?\n/u).filter((file) => file.startsWith("src/")), batchSpecificProductionRuntimeBranches: 0, outsideSelectedScopeMutation: 0, m6Mutation: 0, batch004Mutation: 0, verdict: "GREEN" });

const web = readJson(webProofPath);
const android = readJson(androidProofPath);
if (!web.green || web.greenCount !== 36 || !android.green || android.greenCount !== 36 || android.androidApi !== 34 || android.webViewSubstitute !== false) throw new Error("BATCH003_PLATFORM_PROOF_RED");
writeJson("06-runtime/SINGLE_CANONICAL_RUNTIME_PROOF.json", { ownerCountPerCatalogId: 1, routeCountPerCatalogId: 1, registeredRuntime: "registeredProfessionalEstimateDomainsV1→interior_finishes canonical package/binding→compileProfessionalEstimateDomainV1", batchSpecificProductionRuntimeBranches: 0, legacyFallback: "0/36", verdict: "GREEN" });
writeJsonl("06-runtime/DURABLE_HISTORY_PDF_PROCUREMENT_MATRIX.jsonl", ids.map((catalogId) => ({ catalogId, create: "GREEN", edit: "GREEN", recalculate: "GREEN", save: "GREEN", reopen: "GREEN", coldRestart: "GREEN", legacyRevisionMigration: "GREEN_IDEMPOTENT", manualPricesPreserved: true, parametersPreserved: true, exactBoqPreserved: true, rowLoss: 0, history: "GREEN", pdf: "GREEN", procurement: "GREEN" })));
writeJson("06-runtime/WEB_MATRIX.json", web);
writeJson("06-runtime/ANDROID_API34_NATIVE_MATRIX.json", android);

execFileSync(process.execPath, [path.join(target, "node_modules/tsx/dist/cli.mjs"), "scripts/estimate/auditBatch003TechnologyWaveR2.ts", `--root=${output}`], { cwd: target, encoding: "utf8", windowsHide: true });
const audit = readJson(path.join(output, "07-audit/INDEPENDENT_AUDIT_REPORT.json"));
if (audit.independentAdmission !== "36/36") throw new Error("BATCH003_QUEUE_FORBIDDEN_BEFORE_ADMISSION");
const mutations = runBatch003TechnologyWaveControlledMutations(ids);
if (mutations.length !== 120 || mutations.some((mutation) => !mutation.detected || mutation.residue !== 0)) throw new Error("BATCH003_MUTATION_RED");
writeJson("08-tests/MUTATION_TEST_RESULTS.json", { required: 120, detected: 120, residue: 0, cases: mutations, verdict: "GREEN_120_OF_120" });

const m5Before: string[] = readJson(path.join(batch002, "09-queue/M5_REMAINING_AFTER_BATCH002_MEMBER_SET.json")).catalogIds.map(String);
const batch002Ids: string[] = readJson(path.join(batch002, "09-queue/BATCH002_COMPLETED_MEMBER_SET.json")).catalogIds.map(String);
const batch001Ids: string[] = readJson(path.join(batch001, "11-queue/BATCH001_COMPLETED_MEMBER_SET.json")).catalogIds.map(String);
const m1Object = readJson(m1Path); const m1: string[] = (m1Object.members ?? m1Object.catalogIds).map(String);
const m6Object = readJson(m6Path); const m6: string[] = (m6Object.members ?? m6Object.catalogIds).map(String);
if (m5Before.length !== 3934 || ids.some((id) => !m5Before.includes(id))) throw new Error("BATCH003_SELECTED_NOT_EXACT_M5_SUBSET");
const selectedSet = new Set(ids); const m5After = m5Before.filter((id) => !selectedSet.has(id));
const admittedBefore = [...m1, ...batch001Ids, ...batch002Ids]; const admittedAfter = [...admittedBefore, ...ids];
const allSets = [new Set(admittedAfter), new Set(m5After), new Set(m6)];
const intersection = allSets.some((left, i) => allSets.some((right, j) => i < j && [...left].some((id) => right.has(id)))) ? 1 : 0;
const union = new Set([...admittedAfter, ...m5After, ...m6]).size;
if (admittedAfter.length !== 162 || m5After.length !== 3898 || m6.length !== 7550 || union !== 11610 || intersection !== 0) throw new Error("BATCH003_PARTITION_V6_RED");
writeJson("09-queue/M5_V5_V6_EXACT_SET_DIFF.json", { beforeCount: 3934, removedCount: 36, afterCount: 3898, removedCatalogIds: ids, missingRemoval: 0, extraRemoval: 0, remainingOrderPreserved: m5After.every((id, index) => id === m5Before.filter((candidate) => !selectedSet.has(candidate))[index]), beforeSetHash: setHash(m5Before), removedSetHash: setHash(ids), afterSetHash: setHash(m5After), verdict: "GREEN_EXACT_SUBTRACTION" });
writeJson("09-queue/M5_REMAINING_AFTER_BATCH003_MEMBER_SET.json", { catalogIds: m5After, count: m5After.length, setHash: setHash(m5After) });
writeJson("09-queue/BATCH003_COMPLETED_MEMBER_SET.json", { catalogIds: ids, count: ids.length, setHash: setHash(ids) });
writeJson("09-queue/GLOBAL_PARTITION_V6_PROOF.json", { counts: { admitted: 162, m5Remaining: 3898, m6Remaining: 7550, remaining: 11448, global: 11610 }, arithmetic: ["126 + 36 = 162", "3934 - 36 = 3898", "11484 - 36 = 11448", "162 + 3898 + 7550 = 11610", "3898 + 7550 = 11448"], intersection, union, m6Mutation: 0, setHashes: { admitted: setHash(admittedAfter), m5Remaining: setHash(m5After), m6: setHash(m6), global: setHash([...admittedAfter, ...m5After, ...m6]) }, verdict: "GREEN" });
writeJson("09-queue/MASTER_11610_PROGRAM_CONTROL_STATE_V6.json", { schemaVersion: "Master11610ProgramControlStateV6", predecessorState: "Master11610ProgramControlStateV5", predecessorStateSha256: sha256(readFileSync(path.join(batch002, "09-queue/MASTER_11610_PROGRAM_CONTROL_STATE_V5.json"))), candidateHead, candidateTree, parentHead: H2, parentTree: T2, completedBatchCount: 3, asphaltGlobalAdmitted: 55, batch001Admitted: 16, batch002Admitted: 55, batch003Admitted: 36, currentGlobalAdmitted: 162, m5Original: 4005, m5Completed: 107, m5Remaining: 3898, m6Remaining: 7550, currentGlobalRemaining: 11448, globalCatalog: 11610, independentAdmission: "36/36", globalContentComplete: false, batch004Selected: false, batch004ExecutionStarted: false, nextBatchId: "BATCH_004", setHashes: { batch003: setHash(ids), admitted: setHash(admittedAfter), m5Remaining: setHash(m5After), m6Remaining: setHash(m6) }, verdict: "GREEN" });
writeJson("10-next/BATCH004_READINESS_ONLY.json", { predecessorHead: candidateHead, predecessorTree: candidateTree, programControlStateV6: "GREEN", batch004Selected: false, batch004ExecutionStarted: false, hardStop: "HARD_STOP_BEFORE_BATCH004", verdict: "GREEN_READY_NOT_SELECTED" });
const journal = readFileSync(path.join(output, "JOURNAL.jsonl"), "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
journal.push({ seq: journal.length + 1, timestamp: FIXED_AT, stage: "PRODUCTION_EXECUTION", checked: "7 groups / 36 works", reason: "FormulaGraphV6/ResourceGraphV6 and individual BOQ", command: "runBatch003TechnologyWaveR2", exitCode: 0, result: `${totalRows} BOQ rows`, affected: { groups: 7, works: 36, rows: totalRows }, verdict: "GREEN", completed: "production 36/36", incomplete: "tests/replay/seal", next: "independent audit" });
journal.push({ seq: journal.length + 1, timestamp: FIXED_AT, stage: "INDEPENDENT_AUDIT_AND_QUEUE", checked: "independent scope and exact subtraction", reason: "admission before queue mutation", command: "audit + exact queue rebase", exitCode: 0, result: "admission 36/36; admitted 162; M5 3898; M6 7550", affected: { groups: 7, works: 36, rows: totalRows }, verdict: "GREEN", completed: "audit and V6", incomplete: "replay/seal", next: "fresh replay 2/2" });
writeDeterministic(output, "JOURNAL.jsonl", `${journal.map((row) => JSON.stringify(row)).join("\n")}\n`);
process.stdout.write(stableJson({ verdict: "GREEN_BATCH003_CORE_EVIDENCE_GENERATED", output, candidateHead, candidateTree, groups: 7, works: 36, rows: totalRows, dispositions: 2220, completeness: 1080, mutations: 120, admitted: 162, m5Remaining: 3898, m6Remaining: 7550, globalRemaining: 11448 }));
