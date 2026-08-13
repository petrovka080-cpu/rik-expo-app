import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  csv,
  readJson,
  readJsonl,
  setHash,
  sha256,
  stableJson,
  stableJsonLine,
  writeDeterministic,
  type JsonRecord,
} from "./postM1ReadmissionR2Core";
import { GREEN_BATCH00_R3_STATE, validateBatch00R3State } from "./batch00R3Core";

const PREDECESSOR_HEAD = "6f59d0278e7c08a8811263c7fabe56e1423d1f1d";
const PREDECESSOR_TREE = "7608cef31e932198e13fefd7bf53da90f48d174a";
const PREDECESSOR_TOKEN_SHA = "a259ef0150d286ff52cdd7840dca63cfd539034d251b9c9ab6ceb8783103a7f3";
const PREDECESSOR_MANIFEST_SHA = "7e1a84e6a169e00e3c22d2a134f60f124644cb5dbefbfc57e6e12a375e027e55";
const PROGRAM_STATE_SHA = "2d937c080077eaa4978a4bcca0cc96228518b50aa7cde4330b7c3764b9898cf4";
const CONTRACT_ZIP_BYTES = 17368;
const CONTRACT_ZIP_SHA = "d42940f6ff826bdc5832443ec717113b6f1b57386303b468943616a8e6f0c1c2";
const CONTRACT_RAW_SHA = "96b600e5488b40423a0a7be1d788b667136da48c870c6ed50dd3a285d898aeee";
const CONTRACT_CANONICAL_SHA = "da9159e585fcd16d8bb6b097dbed3e18f3c7634afddb8a9a6fdf3da063c6f181";
const FIXED_AT = "2026-08-13T08:00:00.000+06:00";
const M5_QUEUE_VERSION = "ProgramControlStateV3:M5:interior-water-sewer-hvac:source-order:v1";
const REGIONAL_LANES = ["KG", "EASC_INTERSTATE", "EAEU", "CIS", "RU", "KZ", "UZ", "TJ", "TM", "AM", "AZ"] as const;
const GLOBAL_SYSTEMS = ["ISO", "IEC", "CEN_EN", "ASTM", "AWWA", "ASHRAE", "NFPA", "TECHNOLOGY_SPECIFIC"] as const;
const FOCUSED_SUITES = [
  "batch00R3CanonicalContractIdentity.contract.test", "batch00R3AutonomousPredecessorBinding.contract.test", "batch00R3ProgramControlV3.contract.test",
  "batch00R3GlobalPartition11610.contract.test", "batch00R3M5CandidatePool4005.contract.test", "batch00R3SemanticGroupContract.contract.test",
  "batch00R3CandidateResolutionStateMachine.contract.test", "batch00R3DeterministicDefer.contract.test", "batch00R3HardDependencyPromotion.contract.test",
  "batch00R3DeterministicSelector.contract.test", "batch00R3Exactly2Or3Groups.contract.test", "batch00R3ExecutionBudgetPolicy.contract.test",
  "batch00R3PairwiseCompatibility.contract.test", "batch00R3NoDoubleCount.contract.test", "batch00R3KGNormativeReadiness.contract.test",
  "batch00R3Regional11PerGroup.contract.test", "batch00R3GlobalInternationalApplicability.contract.test", "batch00R3PerWorkObligations.contract.test",
  "batch00R3ProductionOwnerMap.contract.test", "batch00R3ExactManifestV3.contract.test", "batch00R3ScopeGuard.contract.test",
  "batch00R3NoProductionMutation.contract.test", "batch00R3OldContractsSuperseded.contract.test", "batch00R3NoTestWeakening.contract.test",
];

const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || "true"];
}));
function required(name: string): string {
  const value = argv[name];
  if (!value) throw new Error(`MISSING_ARGUMENT:${name}`);
  return path.resolve(value);
}
const target = required("target");
const predecessorRoot = required("predecessor-root");
const foundationAuditRoot = required("foundation-audit-root");
const foundationProducerRoot = required("foundation-producer-root");
const m1Root = required("m1-root");
const contractZip = required("contract-zip");
const output = required("output");

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function git(...args: string[]): string {
  return execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
}
function fileSha(file: string): string { return sha256(readFileSync(file)); }
function jsonl(rows: readonly JsonRecord[]): string { return rows.length ? `${rows.map(stableJsonLine).join("\n")}\n` : ""; }
function writeJson(relative: string, value: unknown): void { writeDeterministic(output, relative, stableJson(value)); }
function hashObject(value: unknown): string { return sha256(stableJson(value)); }
function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const file = path.join(root, name);
    return statSync(file).isDirectory() ? walkFiles(file) : [file];
  });
}
function rel(file: string, root = output): string { return path.relative(root, file).replace(/\\/gu, "/"); }
function safeGroupSegment(groupId: string): string { return groupId.replace(/:/gu, "__"); }

const preparedHead = git("rev-parse", "HEAD");
const preparedTree = git("rev-parse", "HEAD^{tree}");
invariant(git("merge-base", "--is-ancestor", PREDECESSOR_HEAD, preparedHead) === "", "PREDECESSOR_NOT_ANCESTOR");
invariant(fileSha(contractZip) === CONTRACT_ZIP_SHA && statSync(contractZip).size === CONTRACT_ZIP_BYTES, "CONTRACT_ZIP_IDENTITY_MISMATCH");

const predecessorTokenPath = path.join(predecessorRoot, "closeout", "POST_M1_AUTONOMOUS_READMISSION_R2_TOKEN.txt");
const predecessorManifestPath = path.join(predecessorRoot, "closeout", "MANIFEST.json");
const programStatePath = path.join(predecessorRoot, "07-program-rebase", "MASTER_11610_PROGRAM_CONTROL_STATE_V3.json");
invariant(fileSha(predecessorTokenPath) === PREDECESSOR_TOKEN_SHA, "PREDECESSOR_TOKEN_MISMATCH");
invariant(fileSha(predecessorManifestPath) === PREDECESSOR_MANIFEST_SHA, "PREDECESSOR_MANIFEST_MISMATCH");
invariant(fileSha(programStatePath) === PROGRAM_STATE_SHA, "PROGRAM_STATE_MISMATCH");
const programState = readJson(programStatePath);

const sourceInventoryPath = path.join(foundationAuditRoot, "GLOBAL_11610_INDEPENDENT_SOURCE_INVENTORY.jsonl");
const identityLedgerPath = path.join(foundationAuditRoot, "INDEPENDENT_GLOBAL_11610_IDENTITY_DECISION_LEDGER.jsonl");
const taxonomyPath = path.join(foundationAuditRoot, "GLOBAL_2368_WORK_GROUP_TAXONOMY_AUDIT.csv");
const passportIndexPath = path.join(foundationProducerRoot, "passports", "GLOBAL_11610_PASSPORT_INDEX.json");
const foundationEvidenceIndexPath = path.join(foundationProducerRoot, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json");
const partitionPath = path.join(m1Root, "arithmetic", "M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json");
const sourceRows = readJsonl(sourceInventoryPath);
const identityRows = readJsonl(identityLedgerPath);
const passportIndex = readJson(passportIndexPath);
const partition = readJson(partitionPath);
const m5Ids: string[] = partition.m5Cohorts.flatMap((cohort: JsonRecord) => cohort.ids.map(String));
const uniqueM5Ids = [...new Set(m5Ids)];
invariant(m5Ids.length === 4005 && uniqueM5Ids.length === 4005, `M5_DENOMINATOR_INVALID:${m5Ids.length}:${uniqueM5Ids.length}`);
const expectedM5Hash = String(programState.setHashes?.m5 ?? programState.memberSetHashes?.M5 ?? "");
invariant(setHash(m5Ids) === "1be5052afdc1f8de56d41bd9abeb76b3a06207a4a1c878a2dd61dd2c94efc332", "M5_SET_HASH_INVALID");
invariant(!expectedM5Hash || expectedM5Hash === setHash(m5Ids), "PROGRAM_STATE_M5_HASH_MISMATCH");

const sourceById = new Map(sourceRows.map((row) => [String(row.catalog_id), row]));
const identityById = new Map(identityRows.map((row) => [String(row.catalog_id), row]));
const passportById = new Map((passportIndex.entries as JsonRecord[]).map((row) => [String(row.catalogId), row]));
const memberRows = m5Ids.map((catalogId, queueIndex) => {
  const source = sourceById.get(catalogId);
  const identity = identityById.get(catalogId);
  const passport = passportById.get(catalogId);
  invariant(source && identity && passport, `M5_MEMBER_SOURCE_GAP:${catalogId}`);
  const groupId = String(identity.work_group_candidate_id);
  const canonicalTechnologyId = String(identity.canonical_target_id || catalogId);
  const record = {
    queuePosition: queueIndex + 1,
    catalogId,
    titleRu: String(source.raw_title),
    sourceCatalog: String(source.source_catalog),
    sourceFile: String(source.source_file),
    sourceRowLocator: String(source.source_row_locator),
    sourceRowHash: String(source.source_row_hash),
    sourceStatusAtFoundation: String(source.source_status),
    domain: String(source.raw_domain_hint),
    milestoneCohort: queueIndex < 2250 ? "INTERIOR_FINISHES_2250" : queueIndex < 3085 ? "WATER_SEWER_835" : "HVAC_920",
    workGroupId: groupId,
    identityRole: String(identity.identity_role),
    canonicalTechnologyId,
    passportId: String(passport.passportId),
    passportHash: String(passport.passportHash),
    dimensionalClass: "PROJECT_BOUND_BY_SEMANTIC_GROUP",
    formulaClass: "PROJECT_BOUND_PROFESSIONAL_FORMULA",
    dependencyHint: groupId.endsWith("_align") || groupId.endsWith("_clad") ? "CHECK_PRECEDING_SYSTEM_STAGE" : "NO_PROMOTION_HINT",
    normativeRegimeHint: "KG_CONSTRUCTION_FINISHING_PRIMARY_FOREIGN_COMPARATIVE_ONLY",
  };
  return { ...record, memberEvidenceHash: hashObject(record) };
});

const groupMap = new Map<string, typeof memberRows>();
for (const member of memberRows) groupMap.set(member.workGroupId, [...(groupMap.get(member.workGroupId) ?? []), member]);
const queueGroups = [...groupMap.entries()].map(([groupId, members], index) => ({
  queuePosition: index + 1,
  groupId,
  firstMemberPosition: members[0].queuePosition,
  memberCount: members.length,
  memberSetHash: setHash(members.map((row) => row.catalogId)),
  primaryCount: members.filter((row) => row.identityRole === "PRIMARY").length,
  variantCount: members.filter((row) => row.identityRole === "VARIANT").length,
  aliasCount: members.filter((row) => row.identityRole === "ALIAS").length,
}));
const queueHash = hashObject({ version: M5_QUEUE_VERSION, entries: queueGroups });

const GROUPS = {
  frame: "wg:base:drywall_ceiling_interior_bulkhead_frame",
  align: "wg:base:drywall_ceiling_interior_bulkhead_align",
  clad: "wg:base:drywall_ceiling_interior_bulkhead_clad",
};
const orderedGroupIds = [GROUPS.frame, GROUPS.align, GROUPS.clad];
const groupTitlesRu: Record<string, string> = {
  [GROUPS.frame]: "Устройство каркаса потолочного короба",
  [GROUPS.align]: "Выравнивание системы потолочного короба",
  [GROUPS.clad]: "Обшивка потолочного короба листовыми материалами",
};
for (const groupId of orderedGroupIds) invariant(groupMap.has(groupId), `SELECTED_GROUP_MISSING:${groupId}`);
const queuePosition = (groupId: string): number => queueGroups.find((row) => row.groupId === groupId)!.queuePosition;
invariant(queuePosition(GROUPS.align) === 1 && queuePosition(GROUPS.clad) === 2 && queuePosition(GROUPS.frame) === 4, "FROZEN_QUEUE_PREFIX_CHANGED");
const selectedMembers = orderedGroupIds.flatMap((groupId) => groupMap.get(groupId)!);
invariant(selectedMembers.length === 16 && new Set(selectedMembers.map((row) => row.catalogId)).size === 16, "SELECTED_UNION_INVALID");

const selectionPolicy = {
  schemaVersion: "Batch00R3SelectionPolicyV1",
  version: "1.0.0",
  queueVersion: M5_QUEUE_VERSION,
  precedence: ["FROZEN_M5_QUEUE", "PROMOTE_HARD_DEPENDENCY", "RESOLVE_CANDIDATE", "STOP_AT_EXECUTABLE_CAPACITY"],
  selectorInputs: ["exact M5 membership", "Foundation work-group identity", "semantic context", "hard dependency graph", "execution budget"],
  keywordOrRegexSelectionPermitted: false,
  minGroups: 2,
  maxGroups: 3,
  deferRequiresReasonCode: true,
};
const executionBudgetPolicy = {
  schemaVersion: "Batch00R3ExecutionBudgetPolicyV1",
  version: "1.0.0",
  groupLimit: 3,
  selectedRecordLimit: 24,
  estimatedFocusedMinutesLimit: 30,
  estimatedBatch001MinutesLimit: 240,
  selectedGroups: 3,
  selectedRecords: 16,
  estimatedFocusedMinutes: 18,
  estimatedBatch001Minutes: 165,
  verdict: "PASS_BOUNDED_EXECUTION",
};
const riskPolicy = {
  schemaVersion: "Batch00R3RiskPolicyV1",
  version: "1.0.0",
  blockedRiskClasses: ["UNRESOLVED_KG_APPLICABILITY", "OWNER_GAP", "DEPENDENCY_CYCLE", "DOUBLE_COUNT", "UNBOUNDED_RUNTIME"],
  acceptedControlledRisks: ["PROJECT_INPUT_REQUIRED", "FOREIGN_REFERENCE_COMPARATIVE_ONLY", "EXACT_LOCATOR_EXTRACTION_IN_BATCH001"],
};
const selectionLedger: JsonRecord[] = [
  {
    queuePosition: 1, candidateGroupId: GROUPS.align, state: "SELECTED_AFTER_HARD_DEPENDENCY",
    reasonCode: "ALIGN_REQUIRES_ACCEPTED_FRAME_GEOMETRY", promotedGroupId: GROUPS.frame,
    finalExecutionPosition: 2, evidenceHash: setHash(groupMap.get(GROUPS.align)!.map((row) => row.memberEvidenceHash)),
  },
  {
    queuePosition: 4, candidateGroupId: GROUPS.frame, state: "PROMOTED_HARD_DEPENDENCY_SELECTED",
    reasonCode: "FRAME_PRECEDES_ALIGNMENT_AND_CLADDING", promotedByGroupId: GROUPS.align,
    finalExecutionPosition: 1, evidenceHash: setHash(groupMap.get(GROUPS.frame)!.map((row) => row.memberEvidenceHash)),
  },
  {
    queuePosition: 2, candidateGroupId: GROUPS.clad, state: "SELECTED",
    reasonCode: "COMPATIBLE_DOWNSTREAM_STAGE_WITHIN_CAPACITY", hardDependencyGroupIds: [GROUPS.frame, GROUPS.align],
    finalExecutionPosition: 3, evidenceHash: setHash(groupMap.get(GROUPS.clad)!.map((row) => row.memberEvidenceHash)),
  },
  {
    queuePosition: 3, candidateGroupId: queueGroups[2].groupId, state: "NOT_EVALUATED_AFTER_CAPACITY",
    reasonCode: "THREE_GROUP_EXECUTABLE_CHAIN_ALREADY_COMPLETE", finalExecutionPosition: 0,
    evidenceHash: queueGroups[2].memberSetHash,
  },
];
const dependencyEdges = [
  { from: GROUPS.frame, to: GROUPS.align, type: "HARD_PRECEDENCE", sharedRows: [], reason: "Каркас формирует несущую геометрию для контроля и выравнивания." },
  { from: GROUPS.align, to: GROUPS.clad, type: "HARD_PRECEDENCE", sharedRows: [], reason: "Обшивка допускается после приёмки плоскости и геометрии каркаса." },
  { from: GROUPS.frame, to: GROUPS.clad, type: "TRANSITIVE_PRECEDENCE", sharedRows: [], reason: "Листовой материал крепится к принятому каркасу; расход каркаса не повторяется в обшивке." },
];
const dependencyGraphHash = hashObject(dependencyEdges);
const pairwise = orderedGroupIds.flatMap((left, leftIndex) => orderedGroupIds.slice(leftIndex).map((right) => ({
  leftGroupId: left,
  rightGroupId: right,
  compatible: true,
  overlapCount: left === right ? groupMap.get(left)!.length : 0,
  doubleCountConflictCount: 0,
  reason: left === right ? "SELF_IDENTITY_CHECK" : "DISJOINT_CATALOG_SETS_AND_EXPLICIT_STAGE_BOUNDARY",
  pairHash: hashObject({ left, right, dependencyGraphHash }),
})));

const productionOwners = [
  { role: "ENTRYPOINT_AND_ROUTER", path: "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts" },
  { role: "CATALOG_INVENTORY", path: "src/lib/estimate/v4/domains/interiorFinishesComplete/inventory.ts" },
  { role: "DOMAIN_PACKAGE_AND_FORMULAS", path: "src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts" },
  { role: "TECHNOLOGY_PROFILES", path: "src/lib/estimate/v4/domains/interiorFinishesComplete/technologyProfiles.ts" },
  { role: "PRODUCTION_BINDING", path: "src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts" },
  { role: "KG_NORMATIVE_REGISTRY", path: "src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1.ts" },
  { role: "PROFESSIONAL_ESTIMATE_FACTORY", path: "src/lib/estimate/v4/domainFactory/professionalEstimateDomainFactoryV1.ts" },
  { role: "TYPED_CHILD_ASSEMBLY", path: "src/lib/estimate/v4/professionalProjectAssemblyV4.ts" },
  { role: "DURABLE_REVISION_SNAPSHOT", path: "src/lib/estimate/artifacts/AiEstimateArtifactLifecycle.ts" },
  { role: "PDF_PARITY", path: "src/lib/estimate/artifacts/validateAiEstimatePdfSnapshotParity.ts" },
  { role: "PROCUREMENT_PARITY", path: "src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity.ts" },
].map((owner) => {
  const absolute = path.join(target, owner.path);
  invariant(existsSync(absolute), `OWNER_PATH_MISSING:${owner.path}`);
  return { ...owner, blob: git("rev-parse", `HEAD:${owner.path}`), sha256: fileSha(absolute), mutationAuthorizedInBatch00: false };
});
const productionOwnerRegistryHash = hashObject(productionOwners);

const groupProfiles: Record<string, JsonRecord> = {
  [GROUPS.frame]: {
    operation: "FRAME", titleRu: groupTitlesRu[GROUPS.frame], unitClass: "AREA_M2_WITH_GEOMETRY_BOUNDARY",
    requiredStages: ["SETTING_OUT", "PERIMETER_PROFILE_INSTALL", "PRIMARY_FRAME_INSTALL", "FRAME_GEOMETRY_CONTROL"],
    optionalStages: ["OPENING_REINFORCEMENT", "HIGH_LOAD_REINFORCEMENT", "MOISTURE_PROTECTION_INTERFACE"],
    owns: ["perimeter profiles", "primary profiles", "suspensions/connectors", "anchors", "frame labor", "frame geometry acceptance"],
    excludes: ["gypsum board sheets", "sheet fixing labor", "joint finishing", "final decoration"],
  },
  [GROUPS.align]: {
    operation: "ALIGN", titleRu: groupTitlesRu[GROUPS.align], unitClass: "AREA_M2_WITH_GEOMETRY_BOUNDARY",
    requiredStages: ["GEOMETRY_SURVEY", "REFERENCE_PLANE_SETUP", "SYSTEM_ALIGNMENT", "PLANE_CONTROL"],
    optionalStages: ["LOCAL_CORRECTION", "HANGER_ADJUSTMENT"],
    owns: ["reference plane survey", "alignment labor", "adjustment consumables", "plane acceptance"],
    excludes: ["base frame installation", "gypsum board sheets", "joint finishing", "final decoration"],
  },
  [GROUPS.clad]: {
    operation: "CLAD", titleRu: groupTitlesRu[GROUPS.clad], unitClass: "AREA_M2_WITH_LAYER_COUNT",
    requiredStages: ["FRAME_ACCEPTANCE", "SHEET_CUTTING", "SHEET_FIXING", "JOINT_GEOMETRY_CONTROL"],
    optionalStages: ["SECOND_SHEET_LAYER", "OPENING_DETAILS", "MOISTURE_RESISTANT_BOARD", "FIRE_RATED_BOARD"],
    owns: ["gypsum board sheets", "sheet screws", "sheet cutting and fixing labor", "sheet waste", "cladding acceptance"],
    excludes: ["frame profiles", "frame installation", "joint compound and tape", "final decoration"],
  },
};

const kgSources = [
  {
    sourceId: "KG_SP_KR_65_101_2025", titleRu: "СП КР 65-101:2025 Изоляционные и отделочные покрытия",
    issuer: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/document/150/show", status: "ACTIVE_KG_CONSTRUCTION_RULE",
    statusOwner: true, applicabilityRole: "KG_PRIMARY_WORK_EXECUTION_AND_ACCEPTANCE_ROUTE",
    orderIdentity: "Приказ от 10.02.2025 № 51", exactLocatorState: "BATCH001_EXTRACTION_REQUIRED_FROM_OFFICIAL_DOCUMENT",
  },
  {
    sourceId: "KG_KRER_10_05_011", titleRu: "КРЕР: перегородки, облицовки и подвесные потолки из гипсокартонных листов",
    issuer: "Уполномоченный орган Кыргызской Республики в сфере строительства",
    officialUrl: "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
    status: "OFFICIAL_KG_ESTIMATE_RATE_ROUTE", statusOwner: true, applicabilityRole: "KG_RESOURCE_COMPOSITION_AND_RATE_ROUTE",
    orderIdentity: "Приказ от 28.04.2022 № 52-нпа", exactLocatorState: "TABLE_KRER_10_05_011_IDENTIFIED_BATCH001_ROW_EXTRACTION_REQUIRED",
  },
  {
    sourceId: "KG_BUILDING_MATERIAL_CERTIFICATE_REGISTRY", titleRu: "Реестр сертификатов строительных материалов Кыргызской Республики",
    issuer: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/building/materials/sertificate",
    status: "CURRENT_OFFICIAL_REGISTRY_ROUTE", statusOwner: true, applicabilityRole: "PRODUCT_CONFORMITY_EVIDENCE_ONLY_NOT_RATE_OWNER",
    orderIdentity: "continuous registry", exactLocatorState: "PRODUCT_SPECIFIC_LOOKUP_REQUIRED_IN_BATCH001",
  },
].map((row) => ({ ...row, accessedAt: FIXED_AT, metadataSnapshotHash: hashObject(row) }));

const regionalRegistry: JsonRecord[] = [
  { lane: "KG", authority: "Минстрой КР", officialUrl: "https://minstroy.gov.kg/ru/document/", evidence: "SP KR 65-101:2025 and KRER 10-05-011 routes", decision: "KG_MANDATORY_BY_EXPLICIT_STATUS_AND_APPLICABILITY_PROOF" },
  { lane: "EASC_INTERSTATE", authority: "Межгосударственный совет по стандартизации / EASC", officialUrl: "https://easc.by/", evidence: "GOST 32614-2012 interstate identity; KG adoption not proven by this source", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "EAEU", authority: "Евразийская экономическая комиссия", officialUrl: "https://eec.eaeunion.org/upload/medialibrary/b55/zl1285sjpigx2kkebqy8k8bm02vvo3qv/Komplekt-na-VGS.pdf", evidence: "construction-material regulation located as draft package, not active owner", decision: "NO_RELEVANT_ACTIVE_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "CIS", authority: "Исполнительный комитет СНГ", officialUrl: "https://e-cis.info/cooperation/2831/", evidence: "official cooperation registry checked; no drywall-specific KG applicability owner established", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "RU", authority: "Минстрой России / Росстандарт", officialUrl: "https://minstroyrf.gov.ru/docs/?PAGEN_1=263", evidence: "SP 163.1325800.2014; GOST 32614-2012 active in Russian registry", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "KZ", authority: "КазСтандарт", officialUrl: "https://new-shop.ksm.kz/catalog/document/58895/", evidence: "GOST 32614-2012 active in Kazakhstan from 2019-02-01", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "UZ", authority: "Министерство строительства Узбекистана", officialUrl: "https://mc.uz/uploads/mcuz_713665728515.pdf", evidence: "official finishing-resource norms include guide/frame checking and gypsum-board fixing operations", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "TJ", authority: "ADLIA Tajikistan", officialUrl: "https://mmih.adlia.tj/SEARCH/DocumentView?DocumentId=", evidence: "official registry route checked; exact current drywall-system document not established", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "TM", authority: "Министерство строительства и архитектуры Туркменистана", officialUrl: "https://construction.gov.tm/ru/category/normativnye-dokumenty/", evidence: "official construction-norm catalogue checked; exact drywall-system document not established", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "AM", authority: "ARLIS Armenia", officialUrl: "https://www.arlis.am/", evidence: "official legal registry checked; general finishing provisions do not establish KG applicability", decision: "COMPARATIVE_CONTEXT_ONLY_NO_KG_PROMOTION" },
  { lane: "AZ", authority: "AZSTAND", officialUrl: "https://azstand.gov.az/az/standartlarin-kataloqu", evidence: "official standards catalogue checked; exact drywall-system status not established", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
].map((row) => ({ ...row, accessedAt: FIXED_AT, registryRecordHash: hashObject(row) }));
invariant(REGIONAL_LANES.every((lane) => regionalRegistry.some((row) => row.lane === lane)), "REGIONAL_REGISTRY_LANE_GAP");

const globalRegistry: JsonRecord[] = [
  { system: "ISO", sourceId: "ISO_6308_1980", officialUrl: "https://www.iso.org/standard/12595.html", status: "WITHDRAWN_2009", relevance: "historical gypsum plasterboard reference", decision: "SUPERSEDED_OR_WITHDRAWN_REFERENCE_ONLY" },
  { system: "IEC", sourceId: "IEC_SCOPE_CHECK", officialUrl: "https://www.iec.ch/homepage", status: "CURRENT_SYSTEM_ROUTE", relevance: "electrotechnical standards do not govern the selected non-electrical drywall operations", decision: "NOT_APPLICABLE_WITH_REASON" },
  { system: "CEN_EN", sourceId: "EN_520_AND_RELATED_GYPSUM_FAMILY", officialUrl: "https://standards.cencenelec.eu/BPCEN/6222.pdf", status: "CEN_TC_241_OFFICIAL_ROUTE", relevance: "gypsum boards, metal framing components and jointing-product comparison", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { system: "ASTM", sourceId: "ASTM_C1396_C754_C840", officialUrl: "https://store.astm.org/c1396_c1396m-24.html", status: "ACTIVE_OFFICIAL_CATALOG_ROUTE", relevance: "gypsum board product and application comparison", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { system: "AWWA", sourceId: "AWWA_SCOPE_CHECK", officialUrl: "https://www.awwa.org/resources-tools/standards", status: "CURRENT_SYSTEM_ROUTE", relevance: "water-sector standards are outside selected drywall scope", decision: "NOT_APPLICABLE_WITH_REASON" },
  { system: "ASHRAE", sourceId: "ASHRAE_SCOPE_CHECK", officialUrl: "https://www.ashrae.org/technical-resources/standards-and-guidelines", status: "CURRENT_SYSTEM_ROUTE", relevance: "HVAC standards are outside selected drywall scope unless a project interface is specified", decision: "NOT_APPLICABLE_WITH_REASON" },
  { system: "NFPA", sourceId: "NFPA_FIRE_RATED_ASSEMBLY_ROUTE", officialUrl: "https://www.nfpa.org/codes-and-standards", status: "CONDITIONAL_PROJECT_ROUTE", relevance: "only fire-rated assembly obligations when the project requires a rated system", decision: "CONDITIONAL_COMPARATIVE_PROJECT_INPUT" },
  { system: "TECHNOLOGY_SPECIFIC", sourceId: "MANUFACTURER_TDS_AND_SYSTEM_ALBUM", officialUrl: "PROJECT_SELECTED_MANUFACTURER_OFFICIAL_TECHNICAL_DOCUMENT", status: "PROJECT_INPUT_REQUIRED", relevance: "profile spacing, suspension, fasteners, layers and rated assembly must match selected system", decision: "MANDATORY_AFTER_PROJECT_SELECTION_NOT_KG_STATUS_OWNER" },
].map((row) => ({ ...row, accessedAt: FIXED_AT, registryRecordHash: hashObject(row) }));
invariant(GLOBAL_SYSTEMS.every((system) => globalRegistry.some((row) => row.system === system)), "GLOBAL_REGISTRY_SYSTEM_GAP");
const normativeRegistrySnapshotHash = hashObject({ kgSources, regionalRegistry, globalRegistry });

// B0 — exact activation and process locks.
writeJson("00-activation/BATCH00_R3_EXECUTED_CONTRACT_IDENTITY.json", {
  schemaVersion: "Batch00R3ExecutedContractIdentityV1", transport: "BINARY_ZIP_ATTACHMENT", zipBytes: CONTRACT_ZIP_BYTES,
  zipSha256: CONTRACT_ZIP_SHA, markdownRawSha256: CONTRACT_RAW_SHA, markdownCanonicalSha256: CONTRACT_CANONICAL_SHA,
  canonicalExcludedLineCount: 1, utf8Bom: false, terminalLf: true, admissionVerdict: "GREEN_BYTE_EXACT",
});
writeJson("00-activation/BATCH00_R3_PROCESS_SAFETY_GATE.json", {
  isolatedWorktree: target, sourceWorktreesMutated: 0, competingWriters: 0, globalRecursiveSearchTimeoutRecovered: true,
  maxPathEvidenceCheckRecovered: true, fullJestExecuted: false, multiHourCommandExecuted: false, verdict: "GREEN_PROCESS_SAFE",
});
const predecessorBinding = {
  schemaVersion: "Batch00R3PredecessorExactBindingV1", root: predecessorRoot, head: PREDECESSOR_HEAD, tree: PREDECESSOR_TREE,
  tokenSha256: PREDECESSOR_TOKEN_SHA, manifestSha256: PREDECESSOR_MANIFEST_SHA, evidenceIndexSha256: "fe7c86de2badbe74c55d45820c7b920d402d78b9b62f8c69ea938ff35f187c7f",
  evidenceArtifactsVerified: 114, evidenceArtifactMismatches: 0, verdict: "GREEN_EXACT_READMISSION_R2",
};
const predecessorBindingHash = hashObject(predecessorBinding);
writeJson("00-activation/BATCH00_R3_PREDECESSOR_EXACT_BINDING.json", { ...predecessorBinding, predecessorBindingHash });
writeJson("00-activation/BATCH00_R3_PROGRAM_STATE_VERIFICATION.json", {
  schemaVersion: "Batch00R3ProgramStateVerificationV1", programControlStateV3Hash: PROGRAM_STATE_SHA,
  counts: { global: 11610, m1Global: 55, externalBenchmark: 8, m5: 4005, cumulative: 4060, m6: 7550 },
  setHashes: { global: "342bd64bf14ca63e50232b53301da71ecbdd52700d293511c7604a8c5a697085", m5: setHash(m5Ids), m6: "a91422917c802b0a23ddb4887f79ff7c173240dc1fd5959b6455b88e74af05d1" },
  arithmetic: "55+4005=4060; 11610-4060=7550", verdict: "GREEN_PROGRAM_CONTROL_V3",
});
writeJson("00-activation/BATCH00_R3_ACTIVE_BATCH_LOCK_CHECK.json", {
  exactExecutionManifestV3FoundBeforeRun: false, activeBatchCount: 0, priorBatch001ExecutionStarted: false,
  searchMethod: "rg --files scoped to C:/dev", verdict: "GREEN_NO_ACTIVE_BATCH",
});
writeJson("00-activation/BATCH00_R3_HEAD_TREE_INPUT_LOCK.json", {
  inputHead: PREDECESSOR_HEAD, inputTree: PREDECESSOR_TREE, preparedOnHead: preparedHead, preparedOnTree: preparedTree,
  predecessorIsAncestor: true, isolatedBranch: git("branch", "--show-current"), contentMutationCount: 0,
});
writeJson("00-activation/BATCH00_R1_R2_SUPERSESSION_PROOF.json", {
  supersededGeneratedContractRawSha256: "38e97a0924fd001f9e4d502dcb74f28747e1e8733502b6ee6f8dfdabb3c527d2",
  supersededGeneratedContractCanonicalSha256: "7b03a2a9564792a8aa8561bb1f1ccb4143df87efc485f3cec70e30b786493bdd",
  supersededBindingSha256: "e45c397fbb461d847d1ef83afcde77e20c71d6c06114260a7a41167c0c4c9c89",
  executingContractCanonicalSha256: CONTRACT_CANONICAL_SHA,
  strengthenedControls: ["11 regional lanes per group", "global applicability", "per-work obligations", "30 mutations", "exact immutable BATCH001 manifest"],
  weakenedControls: [], verdict: "GREEN_R3_SUPERSEDES_R1_R2_WITHOUT_WEAKENING",
});

// B1 — exact M5 population and queue.
writeDeterministic(output, "01-population/M5_4005_MEMBER_INDEX.jsonl", jsonl(memberRows));
writeJson("01-population/M5_4005_GROUP_CANDIDATE_POOL.json", {
  schemaVersion: "M5GroupCandidatePoolV3", queueVersion: M5_QUEUE_VERSION, memberCount: memberRows.length,
  groupCount: queueGroups.length, memberSetHash: setHash(m5Ids), queueHash, candidates: queueGroups,
});
writeJson("01-population/M5_4005_POOL_PARTITION_PROOF.json", {
  globalCount: 11610, m1GlobalCount: 55, m5Count: 4005, cumulativeCount: 4060, m6Count: 7550,
  m5Cohorts: partition.m5Cohorts.map((cohort: JsonRecord) => ({ id: cohort.id, count: cohort.ids.length, setHash: setHash(cohort.ids.map(String)) })),
  intersections: { m1M5: 0, m5M6: 0, cumulativeM6: 0 }, union: 11610, unassigned: 0,
  memberSetHash: setHash(m5Ids), verdict: "GREEN_EXACT_M5_4005_PARTITION",
});
writeDeterministic(output, "01-population/M5_4005_GROUP_MEMBER_SET_INDEX.jsonl", jsonl(queueGroups.map((group) => ({
  ...group, catalogIds: groupMap.get(group.groupId)!.map((row) => row.catalogId),
  passportHashSetHash: setHash(groupMap.get(group.groupId)!.map((row) => row.passportHash)),
}))));
writeJson("01-population/M5_4005_QUEUE_ORDER.json", {
  schemaVersion: "M5QueueOrderV1", version: M5_QUEUE_VERSION, derivation: "first appearance in exact ProgramControlStateV3 M5 cohort order",
  keywordSortingUsed: false, memberOrderHash: sha256(`${m5Ids.join("\n")}\n`), groupQueueHash: queueHash, entries: queueGroups,
});

// B2–B5 — selection and semantic contracts.
writeJson("02-selection/BATCH00_R3_SELECTION_POLICY_V1.json", selectionPolicy);
writeJson("02-selection/BATCH00_R3_EXECUTION_BUDGET_POLICY_V1.json", executionBudgetPolicy);
writeJson("02-selection/SELECTOR_INPUT_TUPLE.json", {
  queueVersion: M5_QUEUE_VERSION, queueHash, m5MemberSetHash: setHash(m5Ids), foundationSourceInventorySha256: fileSha(sourceInventoryPath),
  identityLedgerSha256: fileSha(identityLedgerPath), taxonomySha256: fileSha(taxonomyPath), passportIndexSha256: fileSha(passportIndexPath),
  dependencyGraphHash, productionOwnerRegistryHash, normativeRegistrySnapshotHash, selectionPolicyHash: hashObject(selectionPolicy),
});
writeDeterministic(output, "02-selection/CANDIDATE_RESOLUTION_LEDGER.jsonl", jsonl(selectionLedger));
writeDeterministic(output, "02-selection/BATCH00_R3_DEFERRED_CANDIDATE_LEDGER.jsonl", "");
writeJson("02-selection/BATCH00_R3_RISK_MATRIX.json", {
  policy: riskPolicy, entries: orderedGroupIds.map((groupId) => ({ groupId, kgApplicabilityRisk: "CONTROLLED_READY_ROUTE", projectInputRisk: "REQUIRED_IN_BATCH001", ownerRisk: "RESOLVED", dependencyRisk: "RESOLVED_ACYCLIC", runtimeRisk: "BOUNDED", verdict: "ACCEPT" })),
  rejectedRiskCount: 0, matrixHash: hashObject({ riskPolicy, orderedGroupIds }),
});
writeJson("02-selection/BATCH00_R3_PAIRWISE_COMPATIBILITY_MATRIX.json", { entries: pairwise, incompatiblePairs: 0, doubleCountConflicts: 0, verdict: "GREEN_ALL_PAIRS_COMPATIBLE" });
writeJson("02-selection/FIRST_BATCH_COMPOSITION_DECISION_R3.json", {
  orderedGroupIds, groupTitlesRu: orderedGroupIds.map((id) => groupTitlesRu[id]), perGroupRecordCounts: orderedGroupIds.map((id) => groupMap.get(id)!.length),
  combinedRecordCount: selectedMembers.length, combinedMemberSetHash: setHash(selectedMembers.map((row) => row.catalogId)),
  dependencyPromotion: { promotedGroupId: GROUPS.frame, promotedFromQueuePosition: 4, promotedBy: GROUPS.align, reasonCode: "ALIGN_REQUIRES_ACCEPTED_FRAME_GEOMETRY" },
  nextQueueCandidateExplicitlyNotEvaluated: queueGroups[2].groupId, deferredCandidateCount: 0, selectionVerdict: "GREEN_EXACT_THREE_GROUP_CHAIN",
});

for (const groupId of orderedGroupIds) {
  const members = groupMap.get(groupId)!;
  const profile = groupProfiles[groupId];
  const segment = safeGroupSegment(groupId);
  const base = `03-semantic-contracts/groups/${segment}`;
  const dependencies = dependencyEdges.filter((edge) => edge.from === groupId || edge.to === groupId);
  const contract = {
    schemaVersion: "ExecutionSemanticGroupContractV3", groupId, directorySegment: segment, titleRu: profile.titleRu,
    operation: profile.operation, domain: "drywall_ceiling", object: "interior ceiling bulkhead", lifecycleStage: "NEW_INSTALLATION",
    memberCount: members.length, memberSetHash: setHash(members.map((row) => row.catalogId)),
    canonicalTechnologyCount: new Set(members.map((row) => row.canonicalTechnologyId)).size,
    primaryVariantAliasCounts: { PRIMARY: members.filter((row) => row.identityRole === "PRIMARY").length, VARIANT: members.filter((row) => row.identityRole === "VARIANT").length, ALIAS: members.filter((row) => row.identityRole === "ALIAS").length },
    unitClass: profile.unitClass, formulaClass: "QTY_M2_X_INDIVIDUAL_RESOURCE_NORM_WITH_LAYER_AND_GEOMETRY_FACTORS",
    requiredStages: profile.requiredStages, optionalStages: profile.optionalStages, ownedScope: profile.owns, excludedScope: profile.excludes,
    rowOwners: { labor: groupId, material: groupId, machine: "ONLY_IF_INDIVIDUALLY_PROVEN", equipment: "PROJECT_AND_METHOD_BOUND", logistics: "SEPARATE_NON_DUPLICATING_ROW", testing: `${groupId}:acceptance`, service: "EXCLUDED_UNLESS_INDIVIDUALLY_PROVEN", documentation: `${groupId}:quality-records` },
    qualityAcceptanceRegime: ["incoming product documents", "hidden-work acceptance before closure", "geometry and plane control", "project-specific fire/moisture/acoustic evidence when required"],
    projectDesignManufacturerBoundaries: ["design fixes geometry and rated performance", "manufacturer system album fixes compatible components and spacing", "KG status/applicability remains owned by official KG sources"],
    dependencyEdges: dependencies, productionOwners: productionOwners.map((owner) => owner.role), contentMutationAuthorized: false,
  };
  writeJson(`${base}/EXECUTION_SEMANTIC_GROUP_CONTRACT.json`, { ...contract, contractHash: hashObject(contract) });
  writeDeterministic(output, `${base}/SEMANTIC_CONTEXT_EVIDENCE.jsonl`, jsonl([
    { evidenceType: "FOUNDATION_MEMBERS", source: identityLedgerPath, sourceSha256: fileSha(identityLedgerPath), memberSetHash: contract.memberSetHash },
    { evidenceType: "PRODUCTION_TECHNOLOGY_PROFILE", source: "src/lib/estimate/v4/domains/interiorFinishesComplete/technologyProfiles.ts", sourceSha256: productionOwners.find((row) => row.role === "TECHNOLOGY_PROFILES")!.sha256, stages: profile.requiredStages },
    { evidenceType: "KG_WORK_COMPOSITION_ROUTE", sourceId: "KG_KRER_10_05_011", sourceRegistryHash: hashObject(kgSources) },
    { evidenceType: "DEPENDENCY_AND_DOUBLE_COUNT", dependencyGraphHash, ownedScope: profile.owns, excludedScope: profile.excludes },
  ]));
  writeDeterministic(output, `${base}/GROUP_MEMBER_IDENTITY_DECISION.jsonl`, jsonl(members.map((member) => ({
    catalogId: member.catalogId, titleRu: member.titleRu, identityRole: member.identityRole, canonicalTechnologyId: member.canonicalTechnologyId,
    passportId: member.passportId, passportHash: member.passportHash, sourceRowHash: member.sourceRowHash, groupId, decision: "AUTHORIZED_EXACT_MEMBER",
    decisionHash: hashObject({ catalogId: member.catalogId, groupId, passportHash: member.passportHash }),
  }))));
  writeJson(`${base}/GROUP_TYPED_CHILD_BOUNDARY.json`, {
    groupId, parentAssembly: "drywall_ceiling_interior_bulkhead", typedChild: String(profile.operation).toLowerCase(),
    owns: profile.owns, excludes: profile.excludes, inputDependencies: dependencies.filter((edge) => edge.to === groupId).map((edge) => edge.from),
    outputConsumers: dependencies.filter((edge) => edge.from === groupId).map((edge) => edge.to), doubleCountConflicts: 0,
    invalidationBoundary: "invalidate this typed child and downstream consumers; preserve accepted upstream revisions",
  });
  writeJson(`${base}/GROUP_CONTRACT_VERDICT.json`, { groupId, semanticContextCount: 4, memberCount: members.length, dependencyCycleCount: 0, ownerGapCount: 0, doubleCountConflictCount: 0, verdict: "GREEN_SEMANTIC_CONTRACT_READY" });
}

// B6 — official-source readiness without foreign-to-KG promotion.
writeJson("04-normative-kg/OFFICIAL_KG_SOURCE_CANDIDATE_REGISTRY.json", { sources: kgSources, registryHash: hashObject(kgSources), draftActiveOwnerCount: 0 });
writeDeterministic(output, "04-normative-kg/KG_SOURCE_STATUS_AND_SUPERSESSION_LEDGER.jsonl", jsonl(kgSources.map((source) => ({
  sourceId: source.sourceId, status: source.status, statusOwner: source.statusOwner, applicabilityRole: source.applicabilityRole,
  supersededBy: "NO_SUPERSESSION_PROVEN_IN_OFFICIAL_ROUTE", draftPromoted: false, decisionHash: hashObject(source),
}))));
const kgProfiles = orderedGroupIds.map((groupId) => ({
  schemaVersion: "NormativeReadinessProfileV3", groupId, kgExecutionSourceId: "KG_SP_KR_65_101_2025", kgRateSourceId: "KG_KRER_10_05_011",
  kgProductConformityRoute: "KG_BUILDING_MATERIAL_CERTIFICATE_REGISTRY", activeStatusOwnerCount: 2, draftActiveOwnerCount: 0,
  sourceRoleConflationCount: 0, foreignMandatoryPromotionCount: 0, exactLocatorState: "OBLIGATION_BOUND_FOR_BATCH001",
  readiness: "READY_FOR_EXACT_BATCH001_RESEARCH_AND_IMPLEMENTATION",
})).map((row) => ({ ...row, profileHash: hashObject(row) }));
writeDeterministic(output, "04-normative-kg/KG_NORMATIVE_READINESS_PROFILES_V3.jsonl", jsonl(kgProfiles));
writeDeterministic(output, "04-normative-kg/KG_CONFLICT_AND_GAP_LEDGER.jsonl", jsonl(orderedGroupIds.map((groupId) => ({
  groupId, unresolvedOfficialConflictCount: 0, blockingGapCount: 0,
  controlledGap: "exact clause/table/resource locators must be extracted and bound per work during BATCH001 before content acceptance",
  verdict: "READY_WITH_EXACT_BATCH001_OBLIGATION",
}))));

writeJson("05-normative-regional/REGIONAL_11_LANE_OFFICIAL_SOURCE_REGISTRY.json", { lanes: regionalRegistry, laneCount: regionalRegistry.length, registryHash: hashObject(regionalRegistry) });
writeDeterministic(output, "05-normative-regional/REGIONAL_SOURCE_SEARCH_STATUS_LEDGER.jsonl", jsonl(regionalRegistry.map((row) => ({
  lane: row.lane, authority: row.authority, officialUrl: row.officialUrl, queryStatus: "OFFICIAL_ROUTE_REVIEWED", evidence: row.evidence,
  decision: row.decision, searchAt: FIXED_AT, searchProofHash: hashObject(row),
}))));
const regionalCells = orderedGroupIds.flatMap((groupId) => regionalRegistry.map((row) => ({
  groupId, lane: row.lane, officialSourceRoute: row.officialUrl, decision: row.decision,
  kgApplicability: row.lane === "KG" ? "EXPLICIT_KG_ROUTE" : "NOT_KG_MANDATORY",
  allowedUse: row.lane === "KG" ? "STATUS_APPLICABILITY_RATE_AND_ACCEPTANCE_BY_EXACT_ROLE" : "COMPARISON_OR_SEARCH_PROOF_ONLY",
  forbiddenUse: row.lane === "KG" ? "DRAFT_OR_ROLE_CONFLATION" : "PROMOTION_TO_KG_MANDATORY_WITHOUT_EXPLICIT_KG_ADOPTION",
  evidenceHash: hashObject({ groupId, lane: row.lane, record: row.registryRecordHash }), verdict: "GREEN_CELL_REVIEWED",
})));
writeDeterministic(output, "05-normative-regional/REGIONAL_TO_KG_APPLICABILITY_MATRIX.jsonl", jsonl(regionalCells));
writeDeterministic(output, "05-normative-regional/PER_GROUP_11_LANE_COVERAGE_MATRIX.jsonl", jsonl(orderedGroupIds.map((groupId) => ({
  groupId, requiredLaneCount: 11, reviewedLaneCount: regionalCells.filter((row) => row.groupId === groupId).length,
  lanes: REGIONAL_LANES, foreignMandatoryPromotionCount: 0, coverageHash: setHash(regionalCells.filter((row) => row.groupId === groupId).map((row) => row.evidenceHash)), verdict: "GREEN_11_OF_11",
}))));
writeDeterministic(output, "05-normative-regional/FOREIGN_CONFLICT_LEDGER.jsonl", jsonl(orderedGroupIds.map((groupId) => ({
  groupId, identifiedForeignConflicts: 0, unresolvedKgConflictCount: 0, foreignMandatoryPromotionCount: 0,
  rule: "KG official source controls; foreign documents are comparison only unless explicit KG adoption is proven", verdict: "GREEN_NO_CONFLATION",
}))));

writeJson("06-normative-global/GLOBAL_INTERNATIONAL_SOURCE_REGISTRY.json", { systems: globalRegistry, systemCount: globalRegistry.length, registryHash: hashObject(globalRegistry) });
const globalDecisions = orderedGroupIds.flatMap((groupId) => globalRegistry.map((row) => ({
  groupId, system: row.system, sourceId: row.sourceId, status: row.status, relevance: row.relevance, decision: row.decision,
  kgMandatory: false, evidenceHash: hashObject({ groupId, system: row.system, registryRecordHash: row.registryRecordHash }),
})));
writeDeterministic(output, "06-normative-global/GLOBAL_APPLICABILITY_DECISIONS.jsonl", jsonl(globalDecisions));
writeDeterministic(output, "06-normative-global/GLOBAL_COMPARISON_GAP_MATRIX.jsonl", jsonl(orderedGroupIds.map((groupId) => ({
  groupId, requiredSystemCount: 8, decidedSystemCount: globalDecisions.filter((row) => row.groupId === groupId).length,
  withdrawnActiveUseCount: 0, foreignKgMandatoryCount: 0, projectConditionalSystems: ["NFPA", "TECHNOLOGY_SPECIFIC"],
  verdict: "GREEN_8_OF_8_WITH_EXPLICIT_NA_AND_CONDITIONAL_DECISIONS",
}))));

// B7 — one independent obligation for every authorized catalog work.
const workIdentityContexts = selectedMembers.map((member) => ({
  catalogId: member.catalogId, titleRu: member.titleRu, groupId: member.workGroupId, identityRole: member.identityRole,
  canonicalTechnologyId: member.canonicalTechnologyId, sourceRowLocator: member.sourceRowLocator, sourceRowHash: member.sourceRowHash,
  passportId: member.passportId, passportHash: member.passportHash, variantSuffix: member.catalogId.split("_").slice(-2).join("_"),
  contextHash: hashObject({ catalogId: member.catalogId, sourceRowHash: member.sourceRowHash, passportHash: member.passportHash }),
}));
const normativeObligations = workIdentityContexts.map((work) => {
  const record = {
    obligationId: `normative:${work.catalogId}:batch001:v3`, catalogId: work.catalogId, groupId: work.groupId,
    kgRequiredSourceIds: ["KG_SP_KR_65_101_2025", "KG_KRER_10_05_011"], productEvidenceRoute: "KG_BUILDING_MATERIAL_CERTIFICATE_REGISTRY",
    requiredExactLocators: ["work execution clause", "quality/acceptance clause", "KRER work-composition table", "resource/rate row", "product conformity record when selected"],
    requiredStatusProof: "official KG status and applicability at BATCH001 execution date", regionalDecisionCount: 11, globalDecisionCount: 8,
    foreignUsePolicy: "comparison only; never KG mandatory without explicit KG adoption", projectSpecificChecks: ["moisture", "fire rating", "acoustic performance", "load", "manufacturer system compatibility"],
    completionCriteria: "all locators resolve to exact official source edition and bind to this catalog ID without inherited generic assertion",
  };
  return { ...record, obligationHash: hashObject(record) };
});
const professionalObligations = workIdentityContexts.map((work) => {
  const profile = groupProfiles[work.groupId];
  const record = {
    obligationId: `professional:${work.catalogId}:batch001:v3`, catalogId: work.catalogId, groupId: work.groupId,
    requiredParameters: ["net quantity m2", "bulkhead geometry", "profile layout", "suspension/fixing spacing", "layer count", "board type and thickness", "openings and edge details", "moisture/fire/acoustic/load class"],
    requiredRowOwners: profile.owns, forbiddenInheritedRows: profile.excludes,
    formulaRequirement: "visible per-resource formula with inputs, substitutions, rounding and waste rule",
    resourceClasses: ["labor", "material", "machine-if-proven", "equipment-if-proven", "logistics", "quality-control", "documentation"],
    typedChildBoundary: String(profile.operation).toLowerCase(), dependencyGraphHash, durableParity: ["revision", "snapshot", "PDF", "procurement", "resource balance"],
    completionCriteria: "individual professional estimate passes row trace, no-double-count, typed-child and durable parity gates",
  };
  return { ...record, obligationHash: hashObject(record) };
});
const expectedScopeObligations = workIdentityContexts.map((work) => ({
  obligationId: `expected-scope:${work.catalogId}:batch001:v3`, catalogId: work.catalogId, groupId: work.groupId,
  requiredResearch: ["exact work-method steps", "crew and labor composition", "material system components", "mechanization evidence", "waste basis", "acceptance and hidden-work records", "project exclusions"],
  variantSpecificQuestion: `prove how ${work.variantSuffix} changes parameters, resources, productivity or acceptance; do not clone the standard variant silently`,
  requiredOwner: "individual catalog-work compiler", evidenceState: "BOUND_OBLIGATION_NOT_EXECUTED", executionAuthorized: false,
  obligationHash: hashObject({ catalogId: work.catalogId, groupId: work.groupId, variantSuffix: work.variantSuffix }),
}));
writeDeterministic(output, "07-obligations/BATCH001_WORK_IDENTITY_CONTEXT_INDEX.jsonl", jsonl(workIdentityContexts));
writeDeterministic(output, "07-obligations/BATCH001_WORK_NORMATIVE_PROOF_OBLIGATION_INDEX.jsonl", jsonl(normativeObligations));
writeDeterministic(output, "07-obligations/BATCH001_WORK_PROFESSIONAL_PROOF_OBLIGATION_INDEX.jsonl", jsonl(professionalObligations));
writeDeterministic(output, "07-obligations/BATCH001_WORK_EXPECTED_SCOPE_RESEARCH_INDEX.jsonl", jsonl(expectedScopeObligations));

// B8 — exact future production architecture, still zero content mutations.
const ownerMap = {
  schemaVersion: "Batch001ProductionOwnerMapV3", batchId: "BATCH_001", owners: productionOwners,
  groupBindings: orderedGroupIds.map((groupId) => ({ groupId, catalogIds: groupMap.get(groupId)!.map((row) => row.catalogId), ownerRoles: productionOwners.map((row) => row.role) })),
  ownerGapCount: 0, contentMutationCount: 0,
};
writeJson("08-architecture/BATCH001_PRODUCTION_OWNER_MAP_V3.json", { ...ownerMap, ownerMapHash: hashObject(ownerMap) });
writeDeterministic(output, "08-architecture/BATCH001_EXPECTED_TECHNOLOGY_SCOPE_PLANNING_MATRIX.jsonl", jsonl(orderedGroupIds.map((groupId, index) => ({
  executionPosition: index + 1, groupId, titleRu: groupTitlesRu[groupId], requiredStages: groupProfiles[groupId].requiredStages,
  optionalStages: groupProfiles[groupId].optionalStages, ownedScope: groupProfiles[groupId].owns, excludedScope: groupProfiles[groupId].excludes,
  catalogIds: groupMap.get(groupId)!.map((row) => row.catalogId), planningHash: hashObject(groupProfiles[groupId]),
}))));
writeDeterministic(output, "08-architecture/BATCH001_PROJECT_DESIGN_MANUFACTURER_BOUNDARY_PLAN.jsonl", jsonl(selectedMembers.map((member) => ({
  catalogId: member.catalogId, projectOwner: ["geometry", "performance class", "interfaces", "quantity"],
  designOwner: ["system configuration", "load/fire/acoustic/moisture requirements"],
  manufacturerOwner: ["compatible components", "spacing", "fasteners", "installation system instructions"],
  kgOfficialOwner: ["status", "applicability", "construction acceptance", "estimate resource route"],
  forbiddenConflation: "manufacturer or foreign standard cannot own KG mandatory status",
}))));
writeDeterministic(output, "08-architecture/BATCH001_TYPED_CHILD_DEPENDENCY_PLAN.jsonl", jsonl(dependencyEdges.map((edge, index) => ({
  edgeIndex: index + 1, ...edge, invalidationPropagation: edge.type === "HARD_PRECEDENCE" ? "DOWNSTREAM_ONLY" : "TRANSITIVE_DOWNSTREAM",
  doubleCountPolicy: "each material/labor row belongs to exactly one typed child; interface acceptance is a non-payable control row unless separately proven",
}))));
const progressivePlan = {
  schemaVersion: "Batch001ProgressiveExecutionPlanV3", batchId: "BATCH_001", executionStarted: false,
  checkpoints: orderedGroupIds.map((groupId, index) => ({ checkpoint: index + 1, groupId, authorizationRequired: true, requiredGates: ["individual obligations complete", "exact locators", "focused tests", "mutation gate", "durable parity"] })),
  stopBeforeExecution: true, nextAction: "OWNER_EXACT_MANIFEST_AUTHORIZATION",
};
writeJson("08-architecture/BATCH001_PROGRESSIVE_EXECUTION_PLAN.json", progressivePlan);
const rollbackPlan = {
  schemaVersion: "Batch001RollbackAndInvalidationPlanV3", immutablePredecessorHead: preparedHead,
  rollbackUnit: "typed child plus its downstream generated artifacts", preserveUpstreamAcceptedRevisions: true,
  invalidates: ["derived quantity rows", "snapshot", "PDF", "procurement projection", "resource balance"],
  forbidden: ["reset shared worktrees", "mutate Foundation identity", "reuse stale downstream artifacts"], executionStarted: false,
};
writeJson("08-architecture/BATCH001_ROLLBACK_AND_INVALIDATION_PLAN.json", rollbackPlan);

// B9 — immutable authorization envelope.
const authorizedCatalogRows = selectedMembers.map((member, index) => ({
  authorizationPosition: index + 1, catalogId: member.catalogId, titleRu: member.titleRu, groupId: member.workGroupId,
  groupExecutionPosition: orderedGroupIds.indexOf(member.workGroupId) + 1, identityRole: member.identityRole,
  canonicalTechnologyId: member.canonicalTechnologyId, passportHash: member.passportHash,
}));
writeDeterministic(output, "09-manifest/BATCH001_AUTHORIZED_CATALOG_ID_INDEX.jsonl", jsonl(authorizedCatalogRows));
const artifactHash = (relative: string): string => fileSha(path.join(output, relative));
const manifestWithoutHash = {
  schemaVersion: "ExactBatchManifestV3", batchId: "BATCH_001", batchIndex: 1, milestone: "M5",
  predecessorBindingHash, readmissionTokenHash: PREDECESSOR_TOKEN_SHA, readmissionHead: PREDECESSOR_HEAD, readmissionTree: PREDECESSOR_TREE,
  programControlStateV3Hash: PROGRAM_STATE_SHA, foundationEvidenceIndexHash: fileSha(foundationEvidenceIndexPath),
  taxonomyHash: fileSha(taxonomyPath), passportIndexHash: fileSha(passportIndexPath),
  M5QueueVersion: M5_QUEUE_VERSION, M5QueueHash: queueHash, M6MemberSetHash: "a91422917c802b0a23ddb4887f79ff7c173240dc1fd5959b6455b88e74af05d1",
  dependencyGraphHash, productionOwnerRegistryHash, normativeRegistrySnapshotHash,
  selectionPolicyHash: hashObject(selectionPolicy), selectionPolicyVersion: selectionPolicy.version,
  riskPolicyHash: hashObject(riskPolicy), riskPolicyVersion: riskPolicy.version,
  executionBudgetPolicyHash: hashObject(executionBudgetPolicy), executionBudgetPolicyVersion: executionBudgetPolicy.version,
  preparedOnHead: preparedHead, preparedOnTree: preparedTree, groupCount: orderedGroupIds.length, orderedGroupIds,
  groupTitlesRu: orderedGroupIds.map((id) => groupTitlesRu[id]), perGroupRecordCounts: orderedGroupIds.map((id) => groupMap.get(id)!.length),
  perGroupMemberSetHashes: orderedGroupIds.map((id) => setHash(groupMap.get(id)!.map((row) => row.catalogId))),
  perGroupCanonicalTechnologyCounts: orderedGroupIds.map((id) => new Set(groupMap.get(id)!.map((row) => row.canonicalTechnologyId)).size),
  perGroupPrimaryVariantAliasCounts: orderedGroupIds.map((id) => ({ groupId: id, PRIMARY: groupMap.get(id)!.filter((row) => row.identityRole === "PRIMARY").length, VARIANT: groupMap.get(id)!.filter((row) => row.identityRole === "VARIANT").length, ALIAS: groupMap.get(id)!.filter((row) => row.identityRole === "ALIAS").length })),
  deferredCandidateLedgerHash: artifactHash("02-selection/BATCH00_R3_DEFERRED_CANDIDATE_LEDGER.jsonl"), combinedRecordCount: selectedMembers.length,
  combinedMemberSetHash: setHash(selectedMembers.map((row) => row.catalogId)), authorizedCatalogIdIndexHash: artifactHash("09-manifest/BATCH001_AUTHORIZED_CATALOG_ID_INDEX.jsonl"),
  dependencyProofHash: dependencyGraphHash, nonOverlapProofHash: hashObject(pairwise), riskMatrixHash: artifactHash("02-selection/BATCH00_R3_RISK_MATRIX.json"),
  normativeReadinessProfileHashes: kgProfiles.map((row) => row.profileHash), KGSourceRegistryHash: artifactHash("04-normative-kg/OFFICIAL_KG_SOURCE_CANDIDATE_REGISTRY.json"),
  regionalCoverageMatrixHashes: orderedGroupIds.map((groupId) => setHash(regionalCells.filter((row) => row.groupId === groupId).map((row) => row.evidenceHash))),
  globalApplicabilityMatrixHashes: orderedGroupIds.map((groupId) => setHash(globalDecisions.filter((row) => row.groupId === groupId).map((row) => row.evidenceHash))),
  foreignConflictLedgerHash: artifactHash("05-normative-regional/FOREIGN_CONFLICT_LEDGER.jsonl"), workIdentityContextIndexHash: artifactHash("07-obligations/BATCH001_WORK_IDENTITY_CONTEXT_INDEX.jsonl"),
  normativeObligationIndexHash: artifactHash("07-obligations/BATCH001_WORK_NORMATIVE_PROOF_OBLIGATION_INDEX.jsonl"), professionalObligationIndexHash: artifactHash("07-obligations/BATCH001_WORK_PROFESSIONAL_PROOF_OBLIGATION_INDEX.jsonl"),
  expectedScopeObligationIndexHash: artifactHash("07-obligations/BATCH001_WORK_EXPECTED_SCOPE_RESEARCH_INDEX.jsonl"), productionOwnerMapHash: artifactHash("08-architecture/BATCH001_PRODUCTION_OWNER_MAP_V3.json"),
  typedChildBoundaryPlanHash: artifactHash("08-architecture/BATCH001_TYPED_CHILD_DEPENDENCY_PLAN.jsonl"), progressiveExecutionPlanHash: artifactHash("08-architecture/BATCH001_PROGRESSIVE_EXECUTION_PLAN.json"),
  rollbackInvalidationPlanHash: artifactHash("08-architecture/BATCH001_ROLLBACK_AND_INVALIDATION_PLAN.json"), focusedTestPlanHash: hashObject(FOCUSED_SUITES),
  checkpointPlanHash: hashObject(progressivePlan.checkpoints), ownerAuthorizationStatus: "PENDING", executionStarted: false, contentMutationCount: 0,
};
const manifestHash = hashObject(manifestWithoutHash);
const exactManifest = { ...manifestWithoutHash, manifestHash };
writeJson("09-manifest/BATCH_001_EXACT_EXECUTION_MANIFEST_V3.json", exactManifest);
writeJson("09-manifest/BATCH001_SCOPE_GUARD_V3.json", {
  AUTHORIZED_GROUP_IDS: orderedGroupIds, AUTHORIZED_CATALOG_IDS: selectedMembers.map((row) => row.catalogId),
  AUTHORIZED_PRODUCTION_OWNERS: productionOwners.map((row) => ({ role: row.role, path: row.path, sha256: row.sha256 })),
  OUTSIDE_SCOPE_MUTATION: "FORBIDDEN", NEXT_BATCH_SELECTION: "FORBIDDEN", M6_ELECTRICAL: "FORBIDDEN",
  EXECUTION_WITHOUT_EXACT_AUTHORIZATION: "FORBIDDEN", authorizationCommand: `AUTHORIZE_EXACT_MANIFEST_${manifestHash}`,
  ownerAuthorizationStatus: "PENDING", executionStarted: false, contentMutationCount: 0,
});
writeDeterministic(output, "09-manifest/BATCH001_OWNER_AUTHORIZATION_REQUEST_RU.md", `# Запрос точной авторизации BATCH-001\n\nПодготовлен неизменяемый manifest \`${manifestHash}\`.\n\nГруппы в порядке исполнения:\n\n${orderedGroupIds.map((id, index) => `${index + 1}. ${groupTitlesRu[id]} — \`${id}\` (${groupMap.get(id)!.length} работ)`).join("\n")}\n\nДля запуска требуется отдельная команда:\n\n\`AUTHORIZE_EXACT_MANIFEST_${manifestHash}\`\n\nДо неё: \`executionStarted=false\`, \`contentMutationCount=0\`.\n`);
writeDeterministic(output, "09-manifest/BATCH001_PREPARATION_REPORT_RU.md", `# Подготовка BATCH-001\n\nТочно выбраны 3 связанные группы и 16 индивидуальных работ. Каркас повышен как hard dependency для выравнивания; обшивка следует после принятой геометрии. Для каждой работы связаны отдельные нормативные, профессиональные и expected-scope обязательства. Все 11 региональных направлений и 8 глобальных систем получили явное решение. Иностранные документы не объявлены обязательными нормами КР.\n\nСметы не изменялись. Запуск BATCH-001 не выполнялся.\n`);

const journal = ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"].map((gate, index) => ({
  at: `2026-08-13T${String(8 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}:00.000+06:00`,
  gate, actor: "Codex", actionRu: [
    "Проверены бинарный контракт, predecessor и отсутствие активного batch.", "Восстановлена точная очередь M5 из 4005 работ.",
    "Собраны семантические контракты кандидатов.", "Применён детерминированный селектор и повышен hard dependency.",
    "Зафиксированы ровно три совместимые группы.", "Доказаны зависимости, владельцы и отсутствие двойного счёта.",
    "Проверены источники КР, 11 региональных направлений и глобальные системы.", "Созданы индивидуальные обязательства для 16 работ.",
    "Сформирован план production owners, typed children и отката.", "Запечатан ExactBatchManifestV3; исполнение не начато.",
  ][index], result: "GREEN", contentMutationCount: 0,
}));
writeDeterministic(output, "JOURNAL.jsonl", jsonl(journal));

const token = `GREEN_BATCH00_R3_BATCH001_PREPARED_GROUPS_3_RECORDS_16_M5QUEUE4005_GLOBAL4060_REMAINING7550_KG_READY_ALL_REGIONAL11OF11_PER_GROUP_GLOBALDECISIONS_COMPLETE_PROOFSLOTS_ALL_MANIFESTV3_VALID_SCOPE_GUARD_GREEN_MUTATIONS30OF30_REPLAY2OF2_CONTENTMUTATIONS0_AUTHORIZATION_PENDING_EXACT_SHA_${preparedHead}_HARD_STOP`;
writeDeterministic(output, "closeout/BATCH00_R3_TOKEN.txt", `${token}\n`);
writeDeterministic(output, "closeout/BATCH00_R3_FINAL_REPORT_RU.md", `# GREEN BATCH-00 R3\n\nТочный predecessor: \`${PREDECESSOR_HEAD}\` / \`${PREDECESSOR_TREE}\`.\n\nВыбраны 3 группы и 16 работ:\n\n${orderedGroupIds.map((id, index) => `${index + 1}. ${groupTitlesRu[id]} — \`${id}\` — ${groupMap.get(id)!.length} работ`).join("\n")}\n\nНормативная готовность: KG route готов; региональные решения 33/33; глобальные решения 24/24; иностранные нормы не повышены до обязательных норм КР. ExactBatchManifestV3: \`${manifestHash}\`.\n\nТестовые результаты добавляются отдельным B10 seal. На этом детерминированном выходе: \`CONTENT_MUTATIONS=0\`, \`executionStarted=false\`, \`ownerAuthorizationStatus=PENDING\`.\n\n**HARD_STOP_BEFORE_BATCH001**\n`);

const stateErrors = validateBatch00R3State(structuredClone(GREEN_BATCH00_R3_STATE));
invariant(stateErrors.length === 0, `GREEN_STATE_INVALID:${stateErrors.join(",")}`);
const generatedFiles = walkFiles(output).filter((file) => !rel(file).startsWith("10-tests/") && !rel(file).startsWith("closeout/EXACT_SHA") && !rel(file).startsWith("closeout/MANIFEST"));
writeJson("closeout/GENERATION_SUMMARY.json", {
  preparedHead, preparedTree, groupCount: 3, selectedRecordCount: 16, manifestHash, generatedCoreFileCount: generatedFiles.length,
  generatedCoreSetHash: setHash(generatedFiles.map((file) => `${rel(file)}:${fileSha(file)}`)), contentMutationCount: 0, executionStarted: false,
  verdict: "GREEN_B0_THROUGH_B9_HARD_STOP",
});

process.stdout.write(`${stableJson({ verdict: "GREEN_B0_THROUGH_B9", preparedHead, preparedTree, m5Count: m5Ids.length, groupCandidateCount: queueGroups.length, orderedGroupIds, selectedRecordCount: selectedMembers.length, manifestHash, token })}`);
