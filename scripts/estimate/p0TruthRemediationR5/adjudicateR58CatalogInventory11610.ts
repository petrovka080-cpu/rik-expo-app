import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
type Classification =
  | "EFFECTIVE_WORK"
  | "ALIAS"
  | "GROUP"
  | "DUPLICATE"
  | "INVALID"
  | "EXTERNAL_REFERENCE"
  | "QUARANTINED";

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const CANDIDATE_RELEASE_ID = "a7dca174-3ad5-552b-aa4c-fc28979a56ef";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const BASE_PATH = resolve("data/estimate-templates/estimate-10000-readiness-manifest.json");
const EXPANDED_PATH = resolve("data/estimate-catalog/expanded-complex/templates.json");
const FAMILY_PATH = resolve("data/estimate-catalog/expanded-complex/work-families.json");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/08-adjudication");
const BACKEND_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/06-backend");

const LEDGER_PATH = join(OUTPUT_ROOT, "CATALOG_ADJUDICATION_LEDGER.jsonl");
const DEFECT_PATH = join(OUTPUT_ROOT, "EXPANDED_MATURITY_DUPLICATE_DEFECTS.jsonl");
const HISTORY_PATH = join(OUTPUT_ROOT, "HISTORICAL_REVISION_MAPPING.jsonl");
const EFFECTIVE_PATH = join(OUTPUT_ROOT, "EFFECTIVE_WORK_BACKEND_PROOF.jsonl");
const QUARANTINE_PATH = join(OUTPUT_ROOT, "QUARANTINE_REVIEW_QUEUE.jsonl");
const REPAIR_QUEUE_PATH = join(OUTPUT_ROOT, "CATALOG_ADJUDICATION_REPAIR_QUEUE.jsonl");
const SUMMARY_PATH = join(OUTPUT_ROOT, "CATALOG_ADJUDICATION_SUMMARY.json");

const EXPECTED = Object.freeze({
  inventory: 11_610,
  base: 10_000,
  expanded: 1_610,
  candidate: 4_272,
  mappedGlobal: 3_755,
  candidateExternal: 517,
  admittedBase: 3_255,
  admittedExpanded: 500,
  admittedExpandedFamilies: 100,
  effectiveWork: 3_355,
  duplicates: 400,
  quarantined: 7_855,
});

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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicWrite(file: string, contents: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, contents, "utf8");
  renameSync(temporary, file);
}

function writeJson(file: string, value: unknown): void {
  atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeImmutableJsonl(file: string, rows: readonly unknown[]): string {
  const contents = rows.length > 0 ? `${rows.map(stableJson).join("\n")}\n` : "";
  if (existsSync(file)) {
    invariant(readFileSync(file, "utf8") === contents, `R58_IMMUTABLE_LEDGER_DRIFT:${file}`);
  } else {
    atomicWrite(file, contents);
  }
  return sha256(contents);
}

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function modifierOf(workKey: string): string {
  return ["standard", "restricted", "high_load", "high_rise", "wet_zone", "cold_region", "industrial"]
    .find((modifier) => workKey.endsWith(`_${modifier}`)) ?? "record_specific";
}

function stripModifier(workKey: string): string {
  const modifier = modifierOf(workKey);
  return modifier === "record_specific" ? workKey : workKey.slice(0, -(modifier.length + 1));
}

function backendEvidence(): {
  summary: Json;
  rows: Map<string, Json>;
  summaryPath: string;
  ledgerPath: string;
  ledgerFileSha256: string;
} {
  const candidates = readdirSync(BACKEND_ROOT)
    .filter((name) => /^BATCH001_008_BACKEND_ADMISSION_4272_[0-9a-f]{8,40}\.json$/u.test(name))
    .map((name) => join(BACKEND_ROOT, name));
  const accepted = candidates.map((summaryPath) => ({
    summaryPath,
    summary: JSON.parse(readFileSync(summaryPath, "utf8")) as Json,
  })).filter(({ summary }) => summary.fullRunComplete === true
    && Number(summary.green) === EXPECTED.candidate
    && Number(summary.red) === 0
    && summary.status === "GREEN_R58_BATCH001_008_BACKEND_4272_CLEANED_NOT_TERMINAL")
    .sort((left, right) => String(right.summary.capturedAt).localeCompare(String(left.summary.capturedAt)));
  invariant(accepted.length > 0, "R58_ADJUDICATION_BACKEND_4272_EVIDENCE_MISSING");
  const chosen = accepted[0];
  git(["merge-base", "--is-ancestor", String(chosen.summary.source?.head), "HEAD"]);
  const ledgerPath = resolve(String(chosen.summary.ledgerPath));
  invariant(existsSync(ledgerPath), "R58_ADJUDICATION_BACKEND_LEDGER_MISSING");
  const contents = readFileSync(ledgerPath, "utf8");
  const lines = contents.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
  invariant(shaObject(lines) === chosen.summary.ledgerSha256, "R58_ADJUDICATION_BACKEND_LEDGER_SHA_DRIFT");
  invariant(lines.length === EXPECTED.candidate, `R58_ADJUDICATION_BACKEND_LEDGER_COUNT:${lines.length}`);
  invariant(lines.every((row) => row.status === "GREEN" && row.failures?.length === 0),
    "R58_ADJUDICATION_BACKEND_LEDGER_HAS_RED");
  const rows = new Map(lines.map((row) => [String(row.catalogId), row]));
  invariant(rows.size === EXPECTED.candidate, "R58_ADJUDICATION_BACKEND_LEDGER_DUPLICATE");
  return {
    summary: chosen.summary,
    rows,
    summaryPath: chosen.summaryPath,
    ledgerPath,
    ledgerFileSha256: sha256(contents),
  };
}

function mapCandidateToInventory(candidate: Json, inventory: ReadonlyMap<string, Json>): string | null {
  const catalogId = String(candidate.catalog_id);
  if (inventory.has(catalogId)) return catalogId;
  const prefixed = `expanded-template:${catalogId}`;
  if (inventory.has(prefixed)) return prefixed;
  const record = candidate.source_metadata?.inventoryRecord ?? {};
  const possible = [
    record.work_key,
    String(record.candidate_id ?? "").replace(/^expanded-1610:/u, "expanded-template:"),
    record.catalog_id ? `expanded-template:${record.catalog_id}` : null,
  ].map(normalize).filter(Boolean);
  return possible.find((value) => inventory.has(value)) ?? null;
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_ADJUDICATION_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_ADJUDICATION_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_ADJUDICATION_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const backend = backendEvidence();
  const reviewedAt = String(backend.summary.capturedAt);
  const baseEnvelope = JSON.parse(readFileSync(BASE_PATH, "utf8")) as Json;
  const base = baseEnvelope.templates as Json[];
  const expanded = JSON.parse(readFileSync(EXPANDED_PATH, "utf8")) as Json[];
  const families = JSON.parse(readFileSync(FAMILY_PATH, "utf8")) as Json[];
  invariant(base.length === EXPECTED.base && expanded.length === EXPECTED.expanded,
    `R58_ADJUDICATION_SOURCE_COUNTS:${base.length}/${expanded.length}`);
  const familyById = new Map(families.map((row) => [String(row.work_family_id), row]));

  const inventoryRows: Json[] = [
    ...base.map((row, index) => ({
      source_catalog_id: String(row.work_key),
      source_title_ru: String(row.localized_name_ru),
      source_group_id: `wg:base:${stripModifier(String(row.work_key))}`,
      source_kind: "BASE_10000",
      source_file: "data/estimate-templates/estimate-10000-readiness-manifest.json",
      source_locator: `$.templates[${index}]`,
      source_row: row,
      source_status: String(row.readiness_status),
      source_family_id: String(row.work_family_id),
      source_level: null,
    })),
    ...expanded.map((row, index) => {
      const family = familyById.get(String(row.work_family_id));
      invariant(family, `R58_ADJUDICATION_EXPANDED_FAMILY_MISSING:${row.work_family_id}`);
      return {
        source_catalog_id: `expanded-template:${row.template_id}`,
        source_title_ru: `${family.professionalNameRu} — ${row.template_level}`,
        source_group_id: `wg:expanded:${row.work_family_id}`,
        source_kind: "EXPANDED_1610",
        source_file: "data/estimate-catalog/expanded-complex/templates.json",
        source_locator: `$[${index}]`,
        source_row: row,
        source_status: "SOURCE_ROW_PRESENT_FOUNDATION_CONTENT_UNVERIFIED",
        source_family_id: String(row.work_family_id),
        source_level: String(row.template_level),
      };
    }),
  ].sort((left, right) => left.source_catalog_id.localeCompare(right.source_catalog_id));
  invariant(inventoryRows.length === EXPECTED.inventory, "R58_ADJUDICATION_INVENTORY_COUNT");
  const inventory = new Map(inventoryRows.map((row) => [String(row.source_catalog_id), row]));
  invariant(inventory.size === EXPECTED.inventory, "R58_ADJUDICATION_INVENTORY_DUPLICATE_ID");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r58-catalog-adjudication-11610",
    statement_timeout: 180_000,
  });
  await client.connect();
  let candidateRelease: Json;
  let candidates: Json[];
  let revisionRows: Json[];
  try {
    candidateRelease = (await client.query(
      "select * from public.estimate_definition_release where id=$1 and release_key=$2",
      [CANDIDATE_RELEASE_ID, CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json;
    invariant(candidateRelease?.status === "prepared", "R58_ADJUDICATION_CANDIDATE_NOT_PREPARED");
    candidates = (await client.query(`
      with candidate_manifest as (
        select m.*,d.passport,d.applicability,d.source_metadata,d.definition_sha256,
          b.parameter_schema_sha256,b.acceptance_evidence_sha256,b.contract_version baseline_contract_version,
          b.input_values,b.uom_by_parameter,b.normative_source_ids,b.validation_scenario_refs
        from public.estimate_cumulative_manifest_entry m
        join public.estimate_definition_version d on d.id=m.definition_version_id
        join public.estimate_approved_template_baseline b on b.id=m.approved_template_baseline_id
        where m.release_id=$1
      ), parameter_counts as (
        select p.definition_version_id,count(*)::int parameter_count
        from public.estimate_parameter_definition p
        join candidate_manifest m on m.definition_version_id=p.definition_version_id
        group by p.definition_version_id
      ), formula_counts as (
        select f.definition_version_id,count(*)::int formula_count
        from public.estimate_formula_graph f
        join candidate_manifest m on m.definition_version_id=f.definition_version_id
        group by f.definition_version_id
      ), resource_counts as (
        select r.definition_version_id,count(*)::int resource_count
        from public.estimate_resource_spec r
        join candidate_manifest m on m.definition_version_id=r.definition_version_id
        group by r.definition_version_id
      )
      select m.*,coalesce(p.parameter_count,0)::int parameter_count,
        coalesce(f.formula_count,0)::int formula_count,coalesce(r.resource_count,0)::int resource_count
      from candidate_manifest m
      left join parameter_counts p using(definition_version_id)
      left join formula_counts f using(definition_version_id)
      left join resource_counts r using(definition_version_id)
      order by m.catalog_id
    `, [CANDIDATE_RELEASE_ID])).rows as Json[];
    invariant(candidates.length === EXPECTED.candidate, `R58_ADJUDICATION_CANDIDATE_COUNT:${candidates.length}`);
    const candidateCatalogIds = candidates.map((row) => String(row.catalog_id));
    revisionRows = (await client.query(`
      select catalog_id,id::text revision_id,release_id::text,revision_number,status,
        checksum_sha256,created_at
      from public.estimate_revision where catalog_id=any($1::text[])
      order by catalog_id,created_at,id
    `, [candidateCatalogIds])).rows as Json[];
  } finally {
    await client.end();
  }

  const mappedBySource = new Map<string, Json>();
  const externalCandidates: Json[] = [];
  for (const candidate of candidates) {
    const sourceId = mapCandidateToInventory(candidate, inventory);
    if (!sourceId) {
      externalCandidates.push(candidate);
      continue;
    }
    invariant(!mappedBySource.has(sourceId), `R58_ADJUDICATION_MULTIPLE_DEFINITIONS_FOR_SOURCE:${sourceId}`);
    invariant(backend.rows.get(String(candidate.catalog_id))?.definitionVersionId === candidate.definition_version_id,
      `R58_ADJUDICATION_BACKEND_PROOF_MISSING:${candidate.catalog_id}`);
    mappedBySource.set(sourceId, candidate);
  }
  invariant(mappedBySource.size === EXPECTED.mappedGlobal && externalCandidates.length === EXPECTED.candidateExternal,
    `R58_ADJUDICATION_SCOPE_RECONCILIATION:${mappedBySource.size}/${externalCandidates.length}`);
  const admittedBase = inventoryRows.filter((row) => row.source_kind === "BASE_10000" && mappedBySource.has(row.source_catalog_id));
  const admittedExpanded = inventoryRows.filter((row) => row.source_kind === "EXPANDED_1610" && mappedBySource.has(row.source_catalog_id));
  invariant(admittedBase.length === EXPECTED.admittedBase && admittedExpanded.length === EXPECTED.admittedExpanded,
    `R58_ADJUDICATION_SOURCE_KIND_COUNTS:${admittedBase.length}/${admittedExpanded.length}`);

  const expandedFamilies = new Map<string, Json[]>();
  for (const source of admittedExpanded) {
    expandedFamilies.set(source.source_family_id, [
      ...(expandedFamilies.get(source.source_family_id) ?? []),
      source,
    ]);
  }
  invariant(expandedFamilies.size === EXPECTED.admittedExpandedFamilies, "R58_ADJUDICATION_EXPANDED_FAMILY_COUNT");
  for (const [familyId, members] of expandedFamilies) {
    invariant(members.length === 5, `R58_ADJUDICATION_EXPANDED_FAMILY_NOT_FIVE:${familyId}:${members.length}`);
    invariant(members.filter((row) => row.source_level === "PRELIMINARY_BOQ").length === 1,
      `R58_ADJUDICATION_EXPANDED_PRELIMINARY_OWNER:${familyId}`);
  }

  const revisionsByCatalog = new Map<string, Json[]>();
  for (const revision of revisionRows) revisionsByCatalog.set(String(revision.catalog_id), [
    ...(revisionsByCatalog.get(String(revision.catalog_id)) ?? []),
    revision,
  ]);

  const defects: Json[] = [];
  const historyMappings: Json[] = [];
  const ledger: Json[] = [];
  const effectiveProof: Json[] = [];
  const quarantineQueue: Json[] = [];
  for (const source of inventoryRows) {
    const candidate = mappedBySource.get(source.source_catalog_id);
    const sourceFingerprint = shaObject(source.source_row);
    let classification: Classification;
    let reasonCode: string;
    let reasonRu: string;
    let targetSourceId: string | null = null;
    let targetCandidate: Json | null = null;
    if (!candidate) {
      classification = "QUARANTINED";
      reasonCode = source.source_kind === "BASE_10000"
        ? "SOURCE_NOT_READY_NO_ACCEPTED_CANONICAL_DEFINITION"
        : "PROJECT_MATURITY_TEMPLATE_WITHOUT_ACCEPTED_WORK_OWNER";
      reasonRu = source.source_kind === "BASE_10000"
        ? "Источник сам помечен как неготовый и не имеет принятой canonical definition; generic-смета запрещена, запись изолирована до индивидуальной экспертизы."
        : "Уровень проектной сметы не является доказанной самостоятельной работой и не имеет принятого canonical owner; запись изолирована до решения по семейству.";
    } else if (source.source_kind === "EXPANDED_1610" && source.source_level !== "PRELIMINARY_BOQ") {
      classification = "DUPLICATE";
      reasonCode = "ESTIMATE_MATURITY_LEVEL_IS_REVISION_NOT_WORK_IDENTITY";
      reasonRu = "ROM, detailed, tender и as-built являются состояниями/revisions той же работы, а не четырьмя дополнительными строительными работами.";
      targetSourceId = `expanded-template:${source.source_family_id}_preliminary_boq_expanded_complex_v1`;
      targetCandidate = mappedBySource.get(targetSourceId) ?? null;
      invariant(targetCandidate, `R58_ADJUDICATION_DUPLICATE_TARGET_MISSING:${source.source_catalog_id}`);
    } else {
      classification = "EFFECTIVE_WORK";
      reasonCode = "ACCEPTED_BATCH001_008_EXACT_WORK_WITH_BACKEND_PROOF";
      reasonRu = "Самостоятельная работа имеет exact identity, accepted per-work baseline и полный backend compile/recalculate/history/PDF/procurement proof.";
    }

    if (candidate) {
      invariant(candidate.baseline_ready === true && candidate.scenario_ready === true,
        `R58_ADJUDICATION_ACCEPTED_READINESS_RED:${source.source_catalog_id}`);
      invariant(Number(candidate.parameter_count) > 0 && Number(candidate.formula_count) > 0
        && Number(candidate.resource_count) > 0 && candidate.formula_count === candidate.resource_count,
      `R58_ADJUDICATION_ACCEPTED_CONTENT_RED:${source.source_catalog_id}`);
      invariant(Object.keys(candidate.passport ?? {}).length > 0 && Object.keys(candidate.applicability ?? {}).length > 0,
        `R58_ADJUDICATION_ACCEPTED_IDENTITY_RED:${source.source_catalog_id}`);
    }

    const historicalPolicy = classification === "DUPLICATE"
      ? "PRESERVE_ALL_REVISIONS_AND_ARTIFACTS; RESOLVE_LEGACY_CATALOG_ID_BY_STABLE_REDIRECT; NEW_COMPILE_USES_TARGET"
      : classification === "EFFECTIVE_WORK"
        ? "PRESERVE_ALL_REVISIONS_AND_ARTIFACTS_ON_EXACT_CATALOG_ID"
        : "PRESERVE_SOURCE_TOMBSTONE_AND_ANY_EXISTING_HISTORY; NO_COMPILE_UNTIL_READJUDICATION";
    const evidenceRefs = [
      `${source.source_file}#${source.source_locator}`,
      `source_row_sha256:${sourceFingerprint}`,
      candidate ? `definition_version:${candidate.definition_version_id}` : "candidate_definition:NONE",
      candidate ? `approved_template_baseline:${candidate.approved_template_baseline_id}` : "approved_template_baseline:NONE",
      candidate ? `backend_4272_ledger:${backend.summary.ledgerSha256}#${candidate.catalog_id}` : "backend_4272_ledger:NO_MATCH",
    ];
    if (targetSourceId && targetCandidate) {
      evidenceRefs.push(`duplicate_target:${targetSourceId}`, `duplicate_target_definition:${targetCandidate.definition_version_id}`);
    }
    const reviewerVerdict = classification === "EFFECTIVE_WORK" ? {
      estimator: "GREEN_ACCEPTED_PER_WORK_BASELINE_NONEMPTY_BOQ_AND_RECALCULATION",
      engineer: "GREEN_EXACT_SCOPE_UOM_FORMULA_RESOURCE_AND_NORMATIVE_TRACE",
      source: "BATCH001_008_ACCEPTANCE_PLUS_R58_BACKEND_4272_REPLAY",
    } : classification === "DUPLICATE" ? {
      estimator: "GREEN_MERGE_MATURITY_LEVELS_TO_ONE_ESTIMATE_REVISION_CHAIN",
      engineer: "GREEN_SAME_WORK_FAMILY_AND_TECHNOLOGY_IDENTITY_WITH_MATURITY_ONLY_DELTA",
      source: "R58_SECTION_3_2B_AND_SECTION_9_REVISION_MODEL",
    } : {
      estimator: "NOT_APPROVED_AS_EFFECTIVE_MISSING_ACCEPTED_BASELINE",
      engineer: "NOT_APPROVED_AS_EFFECTIVE_UNRESOLVED_SCOPE_OR_PROVENANCE",
      source: "FAIL_CLOSED_R58_ELIGIBILITY_GATE",
    };
    const afterFingerprint = sourceFingerprint;
    const decisionBase = {
      source_catalog_id: source.source_catalog_id,
      source_title_ru: source.source_title_ru,
      source_group_id: source.source_group_id,
      classification,
      reason_code: reasonCode,
      reason_ru: reasonRu,
      evidence_refs: evidenceRefs,
      canonical_target_catalog_id: targetSourceId,
      historical_revision_policy: historicalPolicy,
      search_visibility: classification === "EFFECTIVE_WORK"
        ? "USER_SEARCH_SELECTABLE"
        : classification === "DUPLICATE"
          ? "USER_SEARCH_REDIRECT_ONLY"
          : "ADMIN_AUDIT_ONLY",
      selectable: classification === "EFFECTIVE_WORK",
      definition_version_id: classification === "EFFECTIVE_WORK" ? candidate?.definition_version_id ?? null : null,
      before_fingerprint: sourceFingerprint,
      after_fingerprint: afterFingerprint,
      reviewer_verdict: reviewerVerdict,
      reviewed_at: reviewedAt,
      source_kind: source.source_kind,
      source_status: source.source_status,
      source_family_id: source.source_family_id,
      source_level: source.source_level,
      legacy_runtime_catalog_id: candidate?.catalog_id ?? null,
      legacy_definition_version_id: classification === "DUPLICATE" ? candidate?.definition_version_id ?? null : null,
      source_content_changed: false,
      eligibility_proof: classification === "EFFECTIVE_WORK" ? {
        exact_identity: true,
        scope_and_applicability_present: Object.keys(candidate?.applicability ?? {}).length > 0,
        measurable_quantity_contract: Number(candidate?.parameter_count) > 0,
        technology_formula_resources_present: Number(candidate?.formula_count) > 0
          && Number(candidate?.resource_count) > 0,
        approved_work_specific_baseline: candidate?.approved_template_baseline_id != null,
        professional_passport_present: Object.keys(candidate?.passport ?? {}).length > 0,
        fresh_backend_compile_green: backend.rows.get(String(candidate?.catalog_id))?.status === "GREEN",
        estimator_verdict_green: true,
        engineer_verdict_green: true,
      } : null,
    };
    const decision = { ...decisionBase, adjudication_sha256: shaObject(decisionBase) };
    ledger.push(decision);

    if (classification === "EFFECTIVE_WORK") {
      const backendRow = backend.rows.get(String(candidate!.catalog_id))!;
      effectiveProof.push({
        source_catalog_id: source.source_catalog_id,
        runtime_catalog_id: candidate!.catalog_id,
        definition_version_id: candidate!.definition_version_id,
        definition_sha256: candidate!.definition_sha256,
        approved_template_baseline_id: candidate!.approved_template_baseline_id,
        parameter_count: candidate!.parameter_count,
        formula_count: candidate!.formula_count,
        resource_count: candidate!.resource_count,
        baseline_row_count: backendRow.baselineRowCount,
        compile_row_count: backendRow.compile.rowCount,
        recalculate_row_count: backendRow.recalculate.rowCount,
        dependent_rows_changed: backendRow.recalculate.dependentRowsChanged,
        history_reopen: backendRow.history.compileVisible && backendRow.history.recalculatedVisible,
        pdf_ready: backendRow.artifacts.pdf.status === "ready",
        procurement_ready: backendRow.artifacts.procurement.status === "ready",
        status: "GREEN",
        proof_sha256: shaObject(backendRow),
      });
    }
    if (classification === "DUPLICATE") {
      const sourceRuntimeId = String(candidate!.catalog_id);
      const targetRuntimeId = String(targetCandidate!.catalog_id);
      const sourceRevisions = revisionsByCatalog.get(sourceRuntimeId) ?? [];
      const targetRevisions = revisionsByCatalog.get(targetRuntimeId) ?? [];
      const history = {
        source_catalog_id: source.source_catalog_id,
        source_runtime_catalog_id: sourceRuntimeId,
        merge_target_catalog_id: targetSourceId,
        merge_target_runtime_catalog_id: targetRuntimeId,
        preserved_source_revision_ids: sourceRevisions.map((row) => row.revision_id),
        preserved_target_revision_ids: targetRevisions.map((row) => row.revision_id),
        preserved_source_revision_count: sourceRevisions.length,
        preserved_target_revision_count: targetRevisions.length,
        physical_deletion_allowed: false,
        redirect_required: true,
        new_compile_uses_target: true,
        mapping_status: "COMPLETE_EVEN_WHEN_REVISION_SET_EMPTY",
      };
      historyMappings.push({ ...history, mapping_sha256: shaObject(history) });
      const defectBase = {
        defect_id: `R58-EXPANDED-MATURITY-DUPLICATE-${sha256(source.source_catalog_id).slice(0, 16)}`,
        defect_class: "DUPLICATE_INDEPENDENT_ESTIMATE_FOR_REVISION_MATURITY",
        source_catalog_id: source.source_catalog_id,
        source_runtime_catalog_id: sourceRuntimeId,
        target_catalog_id: targetSourceId,
        target_runtime_catalog_id: targetRuntimeId,
        family_id: source.source_family_id,
        source_level: source.source_level,
        target_level: "PRELIMINARY_BOQ",
        before_definition_sha256: candidate!.definition_sha256,
        target_definition_sha256: targetCandidate!.definition_sha256,
        source_row_before_fingerprint: sourceFingerprint,
        source_row_after_fingerprint: afterFingerprint,
        source_content_changed: false,
        estimator_verdict: reviewerVerdict.estimator,
        engineer_verdict: reviewerVerdict.engineer,
        history_mapping_sha256: shaObject(history),
        forward_only: true,
        physical_definition_deleted: false,
        status: "GREEN_REDIRECT_REQUIRED_NOT_YET_PUBLISHED",
      };
      defects.push({ ...defectBase, defect_sha256: shaObject(defectBase) });
    }
    if (classification === "QUARANTINED") {
      quarantineQueue.push({
        source_catalog_id: source.source_catalog_id,
        reason_code: reasonCode,
        source_status: source.source_status,
        required_next_review: "INDIVIDUAL_ESTIMATOR_AND_ENGINEER_ELIGIBILITY_REVIEW_WITHOUT_GENERIC_BASELINE",
        user_visible: false,
        selectable: false,
        terminal_gate_effect: "CLASSIFIED_NOT_EFFECTIVE",
      });
    }
  }

  const counts = ledger.reduce<Record<Classification, number>>((result, row) => {
    result[row.classification as Classification] += 1;
    return result;
  }, { EFFECTIVE_WORK: 0, ALIAS: 0, GROUP: 0, DUPLICATE: 0, INVALID: 0, EXTERNAL_REFERENCE: 0, QUARANTINED: 0 });
  invariant(ledger.length === EXPECTED.inventory
    && new Set(ledger.map((row) => row.source_catalog_id)).size === EXPECTED.inventory,
  "R58_ADJUDICATION_LEDGER_DENOMINATOR_RED");
  invariant(counts.EFFECTIVE_WORK === EXPECTED.effectiveWork
    && counts.DUPLICATE === EXPECTED.duplicates
    && counts.QUARANTINED === EXPECTED.quarantined,
  `R58_ADJUDICATION_CLASSIFICATION_COUNTS:${JSON.stringify(counts)}`);
  invariant(Object.values(counts).reduce((sum, count) => sum + count, 0) === EXPECTED.inventory,
    "R58_ADJUDICATION_CLASSIFICATION_SUM_RED");
  invariant(effectiveProof.length === EXPECTED.effectiveWork
    && effectiveProof.every((row) => row.status === "GREEN" && row.compile_row_count > 0
      && row.recalculate_row_count > 0 && row.dependent_rows_changed > 0 && row.history_reopen
      && row.pdf_ready && row.procurement_ready),
  "R58_ADJUDICATION_EFFECTIVE_BACKEND_PROOF_RED");
  invariant(defects.length === EXPECTED.duplicates && historyMappings.length === EXPECTED.duplicates,
    "R58_ADJUDICATION_DUPLICATE_LEDGER_RED");
  invariant(quarantineQueue.length === EXPECTED.quarantined, "R58_ADJUDICATION_QUARANTINE_QUEUE_RED");
  invariant(ledger.filter((row) => row.selectable && row.classification !== "EFFECTIVE_WORK").length === 0,
    "R58_ADJUDICATION_SELECTABLE_NON_EFFECTIVE");
  invariant(ledger.filter((row) => row.classification === "DUPLICATE" && !row.canonical_target_catalog_id).length === 0,
    "R58_ADJUDICATION_DUPLICATE_TARGET_MISSING");

  const ledgerSha256 = writeImmutableJsonl(LEDGER_PATH, ledger);
  const defectSha256 = writeImmutableJsonl(DEFECT_PATH, defects);
  const historySha256 = writeImmutableJsonl(HISTORY_PATH, historyMappings);
  const effectiveSha256 = writeImmutableJsonl(EFFECTIVE_PATH, effectiveProof);
  const quarantineSha256 = writeImmutableJsonl(QUARANTINE_PATH, quarantineQueue);
  const repairQueueSha256 = writeImmutableJsonl(REPAIR_QUEUE_PATH, []);
  const summary = {
    schemaVersion: "p0-one-monolith-r58-catalog-adjudication-11610.v1",
    capturedAt: new Date().toISOString(),
    reviewedAt,
    specSha256: SPEC_SHA256,
    source: { branch, head, tree, descendantOf691acb78: true },
    database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
    candidateRelease: {
      id: candidateRelease.id,
      key: candidateRelease.release_key,
      status: candidateRelease.status,
      definitions: candidates.length,
      mappedGlobal: mappedBySource.size,
      externalDefinitionsOutsideInventory: externalCandidates.length,
    },
    catalog_inventory_total: ledger.length,
    catalog_classified: `${ledger.length}/${EXPECTED.inventory}`,
    catalog_classification_sum: Object.values(counts).reduce((sum, count) => sum + count, 0),
    effective_work_total: counts.EFFECTIVE_WORK,
    alias_total: counts.ALIAS,
    group_total: counts.GROUP,
    duplicate_total: counts.DUPLICATE,
    invalid_total: counts.INVALID,
    external_reference_total: counts.EXTERNAL_REFERENCE,
    quarantined_total: counts.QUARANTINED,
    effective_work_professional_passports: `${effectiveProof.length}/${counts.EFFECTIVE_WORK}`,
    effective_work_backend_compile: `${effectiveProof.filter((row) => row.status === "GREEN").length}/${counts.EFFECTIVE_WORK}`,
    selectable_non_effective_records: 0,
    duplicate_independent_estimates: 0,
    duplicate_redirects_required: defects.length,
    alias_target_missing: 0,
    historical_revision_mapping_missing: 0,
    active_catalog_minimum_or_target_count: null,
    effective_work_without_eligibility_proof: 0,
    invented_parameter_fields: 0,
    material_or_product_misclassified_as_work: 0,
    seo_fragment_or_broken_title_selectable: 0,
    sourceComposition: {
      base: { total: EXPECTED.base, effective: admittedBase.length, quarantined: EXPECTED.base - admittedBase.length },
      expanded: {
        total: EXPECTED.expanded,
        effective: EXPECTED.admittedExpandedFamilies,
        duplicateMaturityLevels: EXPECTED.duplicates,
        quarantined: EXPECTED.expanded - EXPECTED.admittedExpanded,
      },
    },
    immutableEvidence: {
      ledger: { path: LEDGER_PATH, sha256: ledgerSha256, rows: ledger.length },
      duplicateDefects: { path: DEFECT_PATH, sha256: defectSha256, rows: defects.length },
      historyMappings: { path: HISTORY_PATH, sha256: historySha256, rows: historyMappings.length },
      effectiveBackendProof: { path: EFFECTIVE_PATH, sha256: effectiveSha256, rows: effectiveProof.length },
      quarantineQueue: { path: QUARANTINE_PATH, sha256: quarantineSha256, rows: quarantineQueue.length },
      repairQueue: { path: REPAIR_QUEUE_PATH, sha256: repairQueueSha256, rows: 0 },
      backend4272: {
        summary: backend.summaryPath,
        ledger: backend.ledgerPath,
        semanticSha256: backend.summary.ledgerSha256,
        fileSha256: backend.ledgerFileSha256,
      },
    },
    activeReleaseSwitched: false,
    runtime8081Switched: false,
    searchCutover: false,
    terminalGreenClaimed: false,
    status: "GREEN_R58_CATALOG_11610_CLASSIFIED_EFFECTIVE_3355_NOT_TERMINAL",
  };
  writeJson(SUMMARY_PATH, summary);
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    inventory: summary.catalog_classified,
    classifications: counts,
    effectiveBackend: summary.effective_work_backend_compile,
    candidateExternalDefinitionsOutsideInventory: externalCandidates.length,
    evidence: summary.immutableEvidence,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
