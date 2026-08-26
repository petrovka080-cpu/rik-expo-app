import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

type Candidate = {
  batchId: string;
  catalogId: string;
  domainId: string;
  canonicalTitleRu: string;
  definitionVersionId: string;
  definitionSha256: string;
  sourceReleaseId: string;
  totalRows: number;
  materialRows: number;
  validMaterialRows: number;
  workRows: number;
  machineRows: number;
  deliveryRows: number;
  parameterCount: number;
  genericTitleRows: number;
  missingFormulaRows: number;
  unknownFormulaParameterCount: number;
  missingSourceRows: number;
  deliveryWithoutCargoRows: number;
  deliveryWithoutDistanceRows: number;
  deliveryWithoutVehicleRows: number;
  crossDomainRows: readonly string[];
  duplicateOwners: readonly string[];
  parameterDefects: readonly string[];
  resourceDefects: readonly string[];
  searchSelectable: boolean;
  adjudicationClass: string;
  searchClassification: string;
};

const CONTRACT = "real-useful-estimates-batch001-008-r1.before-50-selection.v1";
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_REAL_USEFUL_ESTIMATES_BATCH001_008_R1_RU.md");
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SOURCE_IDENTITY = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/01_SOURCE_IDENTITY.json");
const AUTHORITATIVE_AUDIT = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/batch001_008_content_audit.jsonl");
const AUTHORITATIVE_FACTS = resolve(".release-runtime/real-professional-estimates-r2/evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const OUTPUT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_SELECTION_MANIFEST.json");
const REQUIRED_PARTITION = "drywall_ceiling_interior_moisture_partition_repair_technical_room";
const EXPECTED_BATCH_COUNTS: Readonly<Record<string, number>> = {
  "BATCH-001": 16,
  "BATCH-002": 55,
  "BATCH-003": 36,
  "BATCH-004": 393,
  "BATCH-005": 605,
  "BATCH-006": 874,
  "BATCH-007": 1012,
  "BATCH-008": 1220,
};
const EXPECTED_SELECTABLE_REAL_WORK_COUNTS: Readonly<Record<string, number>> = {
  "BATCH-001": 16,
  "BATCH-002": 55,
  "BATCH-003": 36,
  "BATCH-004": 393,
  "BATCH-005": 497,
  "BATCH-006": 689,
  "BATCH-007": 864,
  "BATCH-008": 768,
};
const BATCH_IDS = Object.keys(EXPECTED_BATCH_COUNTS);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function byCatalog(left: Candidate, right: Candidate): number {
  return left.catalogId.localeCompare(right.catalogId);
}

function conditionalSignal(candidate: Candidate): number {
  const identity = `${candidate.catalogId} ${candidate.canonicalTitleRu}`.toLocaleLowerCase("ru-RU");
  const tokenHits = (identity.match(/repair|replace|wet_zone|technical_room|commission|pressure_test|seal|opening|reinforce|ремонт|замен|влажн|испытан|гермет|про[её]м|армирован/gu) ?? []).length;
  return tokenHits * 1_000 + candidate.parameterCount;
}

function selectAvailable(
  ordered: readonly Candidate[],
  used: ReadonlySet<string>,
  code: string,
): Candidate {
  const selected = ordered.find((candidate) => !used.has(candidate.catalogId));
  invariant(selected, `BEFORE50_SELECTION_EXHAUSTED:${code}`);
  return selected;
}

function signal(candidate: Candidate): Json {
  return {
    total_rows: candidate.totalRows,
    material_rows: candidate.materialRows,
    valid_material_rows: candidate.validMaterialRows,
    work_rows: candidate.workRows,
    machine_rows: candidate.machineRows,
    delivery_rows: candidate.deliveryRows,
    parameter_count: candidate.parameterCount,
    generic_title_rows: candidate.genericTitleRows,
    missing_formula_rows: candidate.missingFormulaRows,
    unknown_formula_parameter_count: candidate.unknownFormulaParameterCount,
    missing_source_rows: candidate.missingSourceRows,
    delivery_without_cargo_rows: candidate.deliveryWithoutCargoRows,
    delivery_without_distance_rows: candidate.deliveryWithoutDistanceRows,
    delivery_without_vehicle_rows: candidate.deliveryWithoutVehicleRows,
    cross_domain_rows: candidate.crossDomainRows.length,
    duplicate_owners: candidate.duplicateOwners.length,
    conditional_signal: conditionalSignal(candidate),
  };
}

function main(): void {
  invariant(hashFile(MASTER) === MASTER_SHA256, "BEFORE50_MASTER_SHA256_DRIFT");
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "BEFORE50_SOURCE_IDENTITY_MASTER_DRIFT");
  const audits = readJsonl(AUTHORITATIVE_AUDIT);
  const facts = readJsonl(AUTHORITATIVE_FACTS);
  invariant(audits.length === 4282 && facts.length === 4282, "BEFORE50_AUTHORITATIVE_DENOMINATOR_DRIFT");
  const auditByCatalog = new Map(audits.map((row) => [String(row.catalogId), row]));
  invariant(auditByCatalog.size === 4282, "BEFORE50_DUPLICATE_AUDIT_CATALOG_ID");

  const authoritativeBatchCandidates: Candidate[] = facts.map((fact) => {
    const catalogId = String(fact.catalog_id);
    const audit = auditByCatalog.get(catalogId);
    invariant(audit, `BEFORE50_AUDIT_JOIN_MISSING:${catalogId}`);
    return {
      batchId: String(audit.batchId),
      catalogId,
      domainId: String(fact.domain_id),
      canonicalTitleRu: String(fact.title_ru),
      definitionVersionId: String(fact.definition_version_id),
      definitionSha256: String(fact.definition_sha256),
      sourceReleaseId: String(fact.source_release_id),
      totalRows: number(fact.total_rows),
      materialRows: number(fact.total_material_rows),
      validMaterialRows: number(fact.valid_material_rows),
      workRows: number(fact.total_work_rows),
      machineRows: number(fact.total_machine_rows),
      deliveryRows: number(fact.total_delivery_rows),
      parameterCount: number(fact.parameter_count),
      genericTitleRows: number(fact.generic_title_rows),
      missingFormulaRows: number(fact.missing_formula_rows),
      unknownFormulaParameterCount: number(fact.unknown_formula_parameter_count),
      missingSourceRows: number(fact.missing_source_rows),
      deliveryWithoutCargoRows: number(fact.delivery_without_cargo_rows),
      deliveryWithoutDistanceRows: number(fact.delivery_without_distance_rows),
      deliveryWithoutVehicleRows: number(fact.delivery_without_vehicle_rows),
      crossDomainRows: strings(fact.cross_domain_rows),
      duplicateOwners: strings(fact.duplicate_owners),
      parameterDefects: strings(fact.parameterDefectCodes),
      resourceDefects: strings(fact.resourceDefects),
      searchSelectable: fact.search_selectable === true,
      adjudicationClass: String(fact.adjudication_class),
      searchClassification: String(fact.search_classification),
    };
  }).filter((candidate) => BATCH_IDS.includes(candidate.batchId));
  invariant(authoritativeBatchCandidates.length === 4211,
    `BEFORE50_BATCH001008_DENOMINATOR:${authoritativeBatchCandidates.length}`);
  for (const batchId of BATCH_IDS) {
    const count = authoritativeBatchCandidates.filter((candidate) => candidate.batchId === batchId).length;
    invariant(count === EXPECTED_BATCH_COUNTS[batchId], `BEFORE50_BATCH_DENOMINATOR:${batchId}:${count}`);
  }
  const candidates = authoritativeBatchCandidates.filter((candidate) =>
    candidate.searchSelectable
    && candidate.adjudicationClass === "EFFECTIVE_WORK"
    && candidate.searchClassification === "CANONICAL");
  invariant(candidates.length === 3318, `BEFORE50_SELECTABLE_REAL_WORK_DENOMINATOR:${candidates.length}`);
  for (const batchId of BATCH_IDS) {
    const count = candidates.filter((candidate) => candidate.batchId === batchId).length;
    invariant(count === EXPECTED_SELECTABLE_REAL_WORK_COUNTS[batchId],
      `BEFORE50_SELECTABLE_REAL_WORK_BATCH_DENOMINATOR:${batchId}:${count}`);
  }
  invariant(candidates.some((candidate) => candidate.catalogId === REQUIRED_PARTITION), "BEFORE50_REQUIRED_PARTITION_MISSING");

  const used = new Set<string>();
  const selections: Json[] = [];
  const add = (candidate: Candidate, selectionScope: string, selectionCriterion: string, evidenceNote?: string): void => {
    invariant(!used.has(candidate.catalogId), `BEFORE50_DUPLICATE_SELECTION:${candidate.catalogId}`);
    used.add(candidate.catalogId);
    selections.push({
      ordinal: selections.length + 1,
      selection_scope: selectionScope,
      selection_criterion: selectionCriterion,
      batch_id: candidate.batchId,
      catalog_id: candidate.catalogId,
      domain_id: candidate.domainId,
      canonical_title_ru: candidate.canonicalTitleRu,
      definition_version_id: candidate.definitionVersionId,
      definition_sha256: candidate.definitionSha256,
      source_release_id: candidate.sourceReleaseId,
      predecessor_signal: signal(candidate),
      evidence_note: evidenceNote ?? null,
    });
  };

  for (const batchId of BATCH_IDS) {
    const rows = candidates.filter((candidate) => candidate.batchId === batchId);
    const ascending = [...rows].sort((left, right) => left.totalRows - right.totalRows || byCatalog(left, right));
    const descending = [...rows].sort((left, right) => right.totalRows - left.totalRows || byCatalog(left, right));
    const medianValue = ascending[Math.floor((ascending.length - 1) / 2)]!.totalRows;
    const aroundMedian = [...rows].sort((left, right) => Math.abs(left.totalRows - medianValue) - Math.abs(right.totalRows - medianValue) || byCatalog(left, right));
    const conditional = [...rows].sort((left, right) => conditionalSignal(right) - conditionalSignal(left) || byCatalog(left, right));
    const machinesAndFlows = [...rows].sort((left, right) =>
      (right.machineRows + right.deliveryRows) - (left.machineRows + left.deliveryRows)
      || right.deliveryRows - left.deliveryRows
      || byCatalog(left, right));

    add(selectAvailable(ascending, used, `${batchId}:SIMPLE`), "BASE_BATCH_STRATIFIED", "SIMPLE_MINIMUM_PREDECESSOR_ROW_COUNT");
    add(selectAvailable(aroundMedian, used, `${batchId}:MEDIUM`), "BASE_BATCH_STRATIFIED", "MEDIUM_MEDIAN_PREDECESSOR_ROW_COUNT");
    add(selectAvailable(descending, used, `${batchId}:COMPLEX`), "BASE_BATCH_STRATIFIED", "COMPLEX_MAXIMUM_PREDECESSOR_ROW_COUNT");
    if (batchId === "BATCH-004") {
      const required = rows.find((candidate) => candidate.catalogId === REQUIRED_PARTITION);
      invariant(required, "BEFORE50_REQUIRED_PARTITION_BATCH004_MISSING");
      add(required, "BASE_BATCH_STRATIFIED", "CONDITIONAL_REQUIRED_MOISTURE_PARTITION_TECHNICAL_ROOM_19_25_M2",
        "The root canonical parent is the primary BEFORE composition. The required 19.25 m2 scenario is bound and shown separately if it exists only in a child revision; it never replaces the parent.");
    } else {
      add(selectAvailable(conditional, used, `${batchId}:CONDITIONAL`), "BASE_BATCH_STRATIFIED", "CONDITIONAL_BRANCH_SIGNAL");
    }
    add(selectAvailable(machinesAndFlows, used, `${batchId}:MACHINE_DELIVERY`), "BASE_BATCH_STRATIFIED", "MAXIMUM_MACHINE_DELIVERY_OR_WASTE_SIGNAL");
  }
  invariant(selections.length === 40, `BEFORE50_BASE_SELECTION_DENOMINATOR:${selections.length}`);

  const signatureGroups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const signature = [candidate.totalRows, candidate.materialRows, candidate.workRows, candidate.machineRows, candidate.deliveryRows, candidate.parameterCount].join(":");
    const group = signatureGroups.get(signature) ?? [];
    group.push(candidate);
    signatureGroups.set(signature, group);
  }
  const sameness = [...signatureGroups.entries()]
    .filter(([, rows]) => rows.length > 1 && new Set(rows.map((row) => row.canonicalTitleRu)).size > 1)
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .flatMap(([signature, rows]) => [...rows].sort(byCatalog).map((row) => ({ row, signature, groupSize: rows.length })));

  const riskPlans: readonly {
    criterion: string;
    ordered: readonly Candidate[];
    note: (candidate: Candidate) => string;
  }[] = [
    {
      criterion: "RISK_MINIMUM_MATERIAL_ROWS",
      ordered: [...candidates].sort((left, right) => left.materialRows - right.materialRows || left.totalRows - right.totalRows || byCatalog(left, right)),
      note: (candidate) => `Predecessor material rows=${candidate.materialRows}; independent passport must prove whether zero/minimum is valid.`,
    },
    {
      criterion: "RISK_MAXIMUM_TOTAL_ROWS",
      ordered: [...candidates].sort((left, right) => right.totalRows - left.totalRows || byCatalog(left, right)),
      note: (candidate) => `Predecessor total rows=${candidate.totalRows}; high padding/double-count risk.`,
    },
    {
      criterion: "RISK_GENERIC_PUBLIC_TITLE",
      ordered: [...candidates].sort((left, right) => right.genericTitleRows - left.genericTitleRows || byCatalog(left, right)),
      note: (candidate) => `Predecessor generic row-title signal=${candidate.genericTitleRows}; public definition title and every row are rechecked.`,
    },
    {
      criterion: "RISK_GENERIC_EQUIPMENT",
      ordered: [...candidates].filter((candidate) => candidate.machineRows > 0)
        .sort((left, right) => right.genericTitleRows - left.genericTitleRows || right.machineRows - left.machineRows || byCatalog(left, right)),
      note: (candidate) => `Predecessor has ${candidate.machineRows} machine rows but no independent key-characteristic gate; treated as unproven.`,
    },
    {
      criterion: "RISK_GENERIC_DELIVERY",
      ordered: [...candidates].filter((candidate) => candidate.deliveryRows > 0)
        .sort((left, right) =>
          (right.deliveryWithoutCargoRows + right.deliveryWithoutDistanceRows + right.deliveryWithoutVehicleRows)
          - (left.deliveryWithoutCargoRows + left.deliveryWithoutDistanceRows + left.deliveryWithoutVehicleRows)
          || right.deliveryRows - left.deliveryRows || byCatalog(left, right)),
      note: (candidate) => `Incomplete delivery metadata signal=${candidate.deliveryWithoutCargoRows + candidate.deliveryWithoutDistanceRows + candidate.deliveryWithoutVehicleRows}.`,
    },
    {
      criterion: "RISK_MISSING_MATERIAL_SPECIFICATION",
      ordered: [...candidates].filter((candidate) => candidate.materialRows > 0)
        .sort((left, right) => right.materialRows - left.materialRows || byCatalog(left, right)),
      note: (candidate) => `The predecessor ledger has ${candidate.materialRows} material rows but no row-level specification completeness metric; fail-closed re-audit required.`,
    },
    {
      criterion: "RISK_UNKNOWN_OR_MISSING_FORMULA",
      ordered: [...candidates].sort((left, right) =>
        (right.missingFormulaRows + right.unknownFormulaParameterCount) - (left.missingFormulaRows + left.unknownFormulaParameterCount)
        || right.missingSourceRows - left.missingSourceRows || byCatalog(left, right)),
      note: (candidate) => `Missing formula rows=${candidate.missingFormulaRows}, unknown formula parameters=${candidate.unknownFormulaParameterCount}.`,
    },
    {
      criterion: "RISK_CROSS_ESTIMATE_SAMENESS",
      ordered: sameness.map((entry) => entry.row),
      note: (candidate) => {
        const entry = sameness.find((current) => current.row.catalogId === candidate.catalogId)!;
        return `Predecessor composition-count signature ${entry.signature} is shared by ${entry.groupSize} differently titled definitions.`;
      },
    },
    {
      criterion: "RISK_CONDITIONAL_BRANCHES",
      ordered: [...candidates].sort((left, right) => conditionalSignal(right) - conditionalSignal(left) || byCatalog(left, right)),
      note: (candidate) => `Conditional identity/parameter signal=${conditionalSignal(candidate)}; mutually exclusive branches must be proven.`,
    },
    {
      criterion: "RISK_CROSS_DOMAIN_ROWS",
      ordered: [...candidates].sort((left, right) => right.crossDomainRows.length - left.crossDomainRows.length || byCatalog(left, right)),
      note: (candidate) => `Predecessor cross-domain signal=${candidate.crossDomainRows.length}; a zero legacy signal is not accepted as a new independent pass.`,
    },
  ];

  for (const risk of riskPlans) {
    const candidate = selectAvailable(risk.ordered, used, risk.criterion);
    add(candidate, "GLOBAL_DETERMINISTIC_RISK", risk.criterion, risk.note(candidate));
  }
  invariant(Number(selections.length) === 50 && used.size === 50,
    `BEFORE50_FINAL_DENOMINATOR:${selections.length}:${used.size}`);
  invariant(used.has(REQUIRED_PARTITION), "BEFORE50_REQUIRED_PARTITION_NOT_SELECTED");
  const baseCounts = Object.fromEntries(BATCH_IDS.map((batchId) => [batchId,
    selections.filter((entry) => entry.selection_scope === "BASE_BATCH_STRATIFIED" && entry.batch_id === batchId).length]));
  invariant(Object.values(baseCounts).every((count) => count === 5), "BEFORE50_BASE_BATCH_COVERAGE_RED");

  const generatedAt = new Date().toISOString();
  const payload = {
    schema_version: CONTRACT,
    generated_at: generatedAt,
    master_contract: { path: MASTER.replaceAll("\\", "/"), sha256: MASTER_SHA256 },
    source_identity: {
      path: SOURCE_IDENTITY.replaceAll("\\", "/"),
      sha256: hashFile(SOURCE_IDENTITY),
      head: sourceIdentity.git?.head,
      tree: sourceIdentity.git?.tree,
      app_source_state_id: sourceIdentity.accepted_before_source?.app_source_state_id,
      harness_state_id: sourceIdentity.accepted_before_source?.harness_state_id,
      definition_set_sha256: sourceIdentity.accepted_before_source?.definition_set_sha256,
      apk_sha256: sourceIdentity.accepted_before_source?.apk_sha256,
      db_identity: sourceIdentity.database_identity,
    },
    authoritative_inputs: [AUTHORITATIVE_AUDIT, AUTHORITATIVE_FACTS].map((path) => ({
      path: path.replaceAll("\\", "/"), sha256: hashFile(path),
    })),
    corpus: {
      authoritative_catalog_ids: 4211,
      exact_batch_counts: EXPECTED_BATCH_COUNTS,
      legacy_non_batch_entries_excluded: 71,
      selectable_real_work_sample_pool: 3318,
      selectable_real_work_batch_counts: EXPECTED_SELECTABLE_REAL_WORK_COUNTS,
      search_aliases_redirects_and_nonselectable_entries_excluded_from_runtime_sample_only: 893,
      runtime_composition_source_rule: "SELECTION_ONLY_FROM_LEDGER; ACTUAL BEFORE ROWS_MUST_COME_FROM_CANONICAL_RUNTIME_OR_ACCEPTED_IMMUTABLE REVISION EVIDENCE",
    },
    selection_contract: {
      base: "5 deterministic identities per BATCH-001...008: simple, medium, complex, conditional, machines/delivery/waste",
      global_risks: riskPlans.map((risk) => risk.criterion),
      required_identity: REQUIRED_PARTITION,
      required_identity_scenario_physical_input: { area_m2: 19.25 },
      revision_binding_policy: {
        primary_before_composition: "ROOT_CANONICAL_PARENT",
        root_predicate: "parent_revision_id IS NULL",
        required_19_25_scenario: "SEPARATE_REVISION_OR_SEPARATE_READ_ONLY_COMPILE",
        child_revision_never_replaces_parent: true,
      },
      no_clones: true,
      no_source_array_runtime_substitution: true,
      predecessor_zero_signal_is_not_new_green: true,
    },
    denominators: {
      total: 50,
      distinct_catalog_ids: 50,
      base_stratified: 40,
      global_risk: 10,
      base_batch_counts: baseCounts,
      batch_coverage: "8/8",
    },
    selections,
    catalog_set_sha256: hashObject([...used].sort()),
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    blockers: [],
    status: "GREEN_BEFORE_50_DETERMINISTIC_SELECTION_FROZEN_CONTENT_AUDIT_PENDING_NO_RELEASE",
  };
  const manifest = { ...payload, payload_sha256: hashObject(payload) };
  atomicJson(OUTPUT, manifest);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    output: OUTPUT.replaceAll("\\", "/"),
    denominator: manifest.denominators,
    catalog_set_sha256: manifest.catalog_set_sha256,
    payload_sha256: manifest.payload_sha256,
  }, null, 2)}\n`);
}

main();
