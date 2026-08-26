import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type IdentityClass =
  | "EFFECTIVE_CANONICAL_WORK"
  | "MANDATORY_SUCCESSOR"
  | "REDIRECT"
  | "DUPLICATE"
  | "EXTERNAL_REFERENCE"
  | "RETIRED"
  | "BLOCKED_UNCLASSIFIED";
type Transition = "KEEP" | "SUCCESSOR" | "REDIRECT" | "EXTERNAL" | "RETIRED" | "SPLIT" | "MERGE";

const ROOT = resolve(".");
const MASTER_SHA256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820";
const EVIDENCE_ROOT = resolve(".release-runtime/real-estimates-global-green-r3/evidence");
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json");
const R2_DENOMINATOR = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-denominator/AUTHORITATIVE_DENOMINATOR_R2.json");
const R2_IDENTITIES = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-denominator/AUTHORITATIVE_DENOMINATOR_R2_IDENTITIES_4282.jsonl");
const FROZEN_RECONCILIATION = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_DENOMINATOR_RECONCILIATION.json");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildAuthoritativeDenominatorR3.ts");
const INVENTORY_OUTPUT = resolve(EVIDENCE_ROOT, "04_AUTHORITATIVE_IDENTITY_INVENTORY_R3.json");
const INVENTORY_JSONL = resolve(EVIDENCE_ROOT, "04_AUTHORITATIVE_IDENTITY_INVENTORY_R3.jsonl");
const DENOMINATOR_OUTPUT = resolve(EVIDENCE_ROOT, "05_CONTENT_AUTHORING_DENOMINATOR_R3.json");
const TRANSITION_OUTPUT = resolve(EVIDENCE_ROOT, "39_DENOMINATOR_TRANSITION_4211_TO_R3_R3.json");
const TRANSITION_JSONL = resolve(EVIDENCE_ROOT, "39_DENOMINATOR_TRANSITION_4211_TO_R3_R3.jsonl");

const EXPECTED_INPUT_HASHES = new Map<string, string>([
  [R2_DENOMINATOR, "ef7e4c168afb87a88962a1fe6fee65b9e389cf17b5b45c3bc39e3436eff105fd"],
  [R2_IDENTITIES, "43e1ef95e87a493ab92fbf76bc88ba0c976542f6858a4d4263132a60f41f653d"],
  [FROZEN_RECONCILIATION, "026838c59cb3fa9a79149b9370d23a363d69347a59cfd8579ef32539454f8f45"],
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
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

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function countBy(rows: readonly Json[], field: string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[field] ?? "NULL");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function classification(entry: Json): IdentityClass {
  if (!entry.included_in_predecessor_4272 && entry.identity_class === "canonical") {
    return "MANDATORY_SUCCESSOR";
  }
  if (entry.identity_class === "canonical") return "EFFECTIVE_CANONICAL_WORK";
  if (entry.identity_class === "external_reference") return "EXTERNAL_REFERENCE";
  if (entry.identity_class === "duplicate" && entry.routing_class === "redirect") return "REDIRECT";
  if (entry.identity_class === "duplicate") return "DUPLICATE";
  return "BLOCKED_UNCLASSIFIED";
}

function hasRedirectCycle(entries: readonly Json[]): boolean {
  const targets = new Map(entries
    .filter((entry) => entry.identity_class === "REDIRECT" || entry.identity_class === "DUPLICATE")
    .map((entry) => [String(entry.catalog_id), String(entry.canonical_target_id ?? entry.replaced_by ?? "")]));
  for (const start of targets.keys()) {
    const seen = new Set<string>();
    let cursor: string | undefined = start;
    while (cursor && targets.has(cursor)) {
      if (seen.has(cursor)) return true;
      seen.add(cursor);
      cursor = targets.get(cursor);
    }
  }
  return false;
}

function writePayload(path: string, payload: Json): string {
  const output = { ...payload, payload_sha256: hashObject(payload) };
  atomicWrite(path, `${JSON.stringify(output, null, 2)}\n`);
  return hashFile(path);
}

function main(): void {
  const generatedAt = new Date().toISOString();
  for (const [path, expected] of EXPECTED_INPUT_HASHES) {
    invariant(hashFile(path) === expected, `DENOMINATOR_INPUT_DRIFT:${repoPath(path)}`);
  }
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const productManifest = readJson(PRODUCT_MANIFEST);
  invariant(sourceIdentity.status === "R3_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_NOT_GREEN");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(productManifest.master_contract_sha256 === MASTER_SHA256, "PRODUCT_MANIFEST_MASTER_DRIFT");
  const toolEntry = (productManifest.files as Json[]).find((entry) => entry.path === repoPath(TOOL));
  invariant(toolEntry?.sha256 === hashFile(TOOL), "DENOMINATOR_TOOL_NOT_IN_CURRENT_SEAL");

  const r2Denominator = readJson(R2_DENOMINATOR);
  const frozenReconciliation = readJson(FROZEN_RECONCILIATION);
  const sourceRows = readJsonl(R2_IDENTITIES);
  invariant(sourceRows.length === 4282, `IDENTITY_INVENTORY_NOT_4282:${sourceRows.length}`);
  invariant(new Set(sourceRows.map((row) => row.catalog_id)).size === 4282, "IDENTITY_INVENTORY_DUPLICATE_ID");
  invariant(r2Denominator.acceptance?.unclassified === 0, "R2_DENOMINATOR_UNCLASSIFIED");
  invariant(frozenReconciliation.accepted_predecessor_runtime_set?.total === 4272, "FROZEN_PREDECESSOR_NOT_4272");
  invariant(frozenReconciliation.r3_target_manifest?.total === 4282, "FROZEN_CURRENT_NOT_4282");

  const inputEvidence = [...EXPECTED_INPUT_HASHES].map(([path, fileSha256]) => ({
    path: repoPath(path), sha256: fileSha256,
  }));
  const identities = sourceRows.map((entry) => {
    const identityClass = classification(entry);
    const includedInContent = identityClass === "EFFECTIVE_CANONICAL_WORK"
      || identityClass === "MANDATORY_SUCCESSOR";
    const evidencePayload = {
      source_identity_inventory_sha256: EXPECTED_INPUT_HASHES.get(R2_IDENTITIES),
      catalog_id: entry.catalog_id,
      source_registry: entry.source_registry,
      source_release_id: entry.source_release_id,
      definition_version_id: entry.definition_version_id,
      predecessor_membership: entry.included_in_predecessor_4272,
      legacy_4211_membership: entry.included_in_legacy_content_corpus_4211,
      adjudication_class: entry.adjudication_class,
      routing_class: entry.routing_class,
      r2_reason: entry.reason,
      r2_reconciled_from_omitted_adjudication: entry.r2_reconciled_from_omitted_adjudication,
    };
    return {
      catalog_id: String(entry.catalog_id),
      work_key: String(entry.catalog_id),
      source_batch: String(entry.batch_id),
      source_registry: String(entry.source_registry),
      identity_class: identityClass,
      canonical_target_id: identityClass === "REDIRECT" || identityClass === "DUPLICATE"
        ? entry.canonical_target_id : includedInContent ? String(entry.catalog_id) : null,
      successor_of: null,
      successor_of_reason: identityClass === "MANDATORY_SUCCESSOR"
        ? "Authoritative source marks a new mandatory successor identity but provides no predecessor mapping; no mapping inferred."
        : null,
      replaced_by: identityClass === "REDIRECT" || identityClass === "DUPLICATE"
        ? entry.canonical_target_id : null,
      external_reference_reason: identityClass === "EXTERNAL_REFERENCE" ? String(entry.reason) : null,
      redirect_reason: identityClass === "REDIRECT" || identityClass === "DUPLICATE"
        ? String(entry.reason) : null,
      retired_reason: identityClass === "RETIRED" ? String(entry.reason) : null,
      search_selectable: entry.search_selectable_before_remediation === true,
      included_in_content_authoring: includedInContent,
      included_in_predecessor_4272: entry.included_in_predecessor_4272 === true,
      included_in_predecessor_content_baseline_4211: entry.included_in_legacy_content_corpus_4211 === true,
      source_release_id: entry.source_release_id ?? null,
      definition_version_id: entry.definition_version_id,
      classification_reason: String(entry.reason),
      classification_evidence_sha256: hashObject(evidencePayload),
      explicit_reconciliation: entry.r2_reconciled_from_omitted_adjudication === true,
    };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));

  const classCounts = countBy(identities, "identity_class");
  invariant(classCounts.EFFECTIVE_CANONICAL_WORK === 3357, "EFFECTIVE_CANONICAL_NOT_3357");
  invariant(classCounts.MANDATORY_SUCCESSOR === 10, "MANDATORY_SUCCESSOR_NOT_10");
  invariant(classCounts.EXTERNAL_REFERENCE === 515, "EXTERNAL_REFERENCE_NOT_515");
  invariant(classCounts.REDIRECT === 400, "REDIRECT_NOT_400");
  invariant((classCounts.DUPLICATE ?? 0) === 0, "UNROUTED_DUPLICATE_NONZERO");
  invariant((classCounts.BLOCKED_UNCLASSIFIED ?? 0) === 0, "BLOCKED_UNCLASSIFIED_NONZERO");
  const knownIds = new Set(identities.map((entry) => entry.catalog_id));
  const redirectProblems = identities.filter((entry) => entry.identity_class === "REDIRECT"
    && (!entry.canonical_target_id || !knownIds.has(entry.canonical_target_id) || !entry.redirect_reason));
  invariant(redirectProblems.length === 0, `REDIRECT_TARGET_OR_REASON_MISSING:${redirectProblems.length}`);
  invariant(!hasRedirectCycle(identities), "REDIRECT_CYCLE_NONZERO");
  const contentIdentities = identities.filter((entry) => entry.included_in_content_authoring);
  invariant(contentIdentities.length === 3367, `CONTENT_AUTHORING_NOT_3367:${contentIdentities.length}`);
  invariant(contentIdentities.every((entry) => entry.identity_class !== "EXTERNAL_REFERENCE"),
    "EXTERNAL_IN_CONTENT_AUTHORING");
  invariant(new Set(contentIdentities.map((entry) => entry.catalog_id)).size === 3367,
    "CONTENT_AUTHORING_DOUBLE_COUNT");
  const successors = identities.filter((entry) => entry.identity_class === "MANDATORY_SUCCESSOR");
  invariant(successors.length === 10 && successors.every((entry) => entry.included_in_content_authoring),
    "SUCCESSOR_MEMBERSHIP_RED");

  const predecessorOnly = identities.filter((entry) =>
    entry.included_in_predecessor_4272 && !entry.included_in_predecessor_content_baseline_4211);
  const targetOnlyConcrete = identities.filter((entry) =>
    !entry.included_in_predecessor_4272 && entry.included_in_predecessor_content_baseline_4211);
  invariant(predecessorOnly.length === 63, `PREDECESSOR_ONLY_NOT_63:${predecessorOnly.length}`);
  invariant(targetOnlyConcrete.length === 2, `TARGET_ONLY_CONCRETE_NOT_2:${targetOnlyConcrete.length}`);
  invariant(targetOnlyConcrete.every((entry) => /concrete/iu.test(entry.catalog_id)), "TARGET_ONLY_NOT_CONCRETE");
  invariant(predecessorOnly.length + targetOnlyConcrete.length === 65, "SYMMETRIC_DIFFERENCE_NOT_65");
  invariant(4272 - 4211 === 61, "NET_DIFFERENCE_NOT_61");
  const bollard = identities.find((entry) => entry.catalog_id === "r58-real:concrete-bollard-installation");
  invariant(bollard?.identity_class === "MANDATORY_SUCCESSOR", "BOLLARD_NOT_MANDATORY_SUCCESSOR");
  invariant(bollard.explicit_reconciliation === true && bollard.classification_reason.includes("omitted adjudication_class"),
    "BOLLARD_EXPLICIT_EVIDENCE_MISSING");

  const contentTargetProjection = contentIdentities.map((entry) => ({
    catalog_id: entry.catalog_id,
    identity_class: entry.identity_class,
    classification_evidence_sha256: entry.classification_evidence_sha256,
  }));
  const contentTargetSha256 = hashObject(contentTargetProjection);
  invariant(/^[a-f0-9]{64}$/u.test(contentTargetSha256), "CONTENT_TARGET_SHA_INVALID");

  const transitions = identities
    .filter((entry) => entry.included_in_predecessor_content_baseline_4211)
    .map((entry) => {
      let transition: Transition;
      let newCatalogId: string | null;
      if (entry.identity_class === "REDIRECT" || entry.identity_class === "DUPLICATE") {
        transition = "REDIRECT";
        newCatalogId = entry.canonical_target_id;
      } else if (entry.identity_class === "EXTERNAL_REFERENCE") {
        transition = "EXTERNAL";
        newCatalogId = null;
      } else if (entry.identity_class === "RETIRED") {
        transition = "RETIRED";
        newCatalogId = null;
      } else {
        transition = entry.identity_class === "MANDATORY_SUCCESSOR" ? "SUCCESSOR" : "KEEP";
        newCatalogId = entry.catalog_id;
      }
      const transitionPayload = {
        old_catalog_id: entry.catalog_id,
        old_identity_class: "PREDECESSOR_CONTENT_BASELINE_DEFINITION",
        new_catalog_id: newCatalogId,
        new_identity_class: entry.identity_class,
        transition,
        reason: entry.classification_reason,
        classification_evidence_sha256: entry.classification_evidence_sha256,
      };
      return { ...transitionPayload, evidence_sha256: hashObject(transitionPayload) };
    });
  invariant(transitions.length === 4211, `TRANSITION_ROWS_NOT_4211:${transitions.length}`);
  invariant(new Set(transitions.map((entry) => entry.old_catalog_id)).size === 4211,
    "TRANSITION_OLD_ID_DUPLICATE");
  invariant(transitions.every((entry) => entry.new_catalog_id == null
    || knownIds.has(entry.new_catalog_id)), "TRANSITION_TARGET_UNKNOWN");

  atomicWrite(INVENTORY_JSONL, `${identities.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  atomicWrite(TRANSITION_JSONL, `${transitions.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  const sourceIdentitySha256 = hashFile(SOURCE_IDENTITY);
  const productSourceSha256 = sourceIdentity.hashes.product_source_sha256 as string;
  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    parent_source_identity_sha256: sourceIdentitySha256,
    exact_product_source_sha256: productSourceSha256,
    tool: { path: repoPath(TOOL), sha256: hashFile(TOOL) },
  };

  const inventorySha256 = writePayload(INVENTORY_OUTPUT, {
    schema_version: "real-estimates-global-green-r3.authoritative-identity-inventory.v1",
    ...common,
    status: "AUTHORITATIVE_IDENTITY_INVENTORY_GREEN",
    identity_inventory_denominator: 4282,
    identity_class_counts: classCounts,
    source_evidence: inputEvidence,
    control_numbers: {
      predecessor_inventory: 4272,
      predecessor_content_baseline: 4211,
      mandatory_successors: 10,
      external_references: 515,
      redirects_or_duplicates: 400,
      predecessor_only_asphalt: 63,
      target_only_concrete: 2,
      symmetric_difference: 65,
      net_cardinality_difference_not_alias_list: 61,
    },
    concrete_bollard_reconciliation: bollard,
    entries_jsonl: { path: repoPath(INVENTORY_JSONL), sha256: hashFile(INVENTORY_JSONL), rows: identities.length },
    entries: identities,
    content_green_claimed: false,
  });

  const denominatorSha256 = writePayload(DENOMINATOR_OUTPUT, {
    schema_version: "real-estimates-global-green-r3.content-authoring-denominator.v1",
    ...common,
    parent_identity_inventory: { path: repoPath(INVENTORY_OUTPUT), sha256: inventorySha256 },
    status: "AUTHORITATIVE_DENOMINATOR_GREEN",
    identity_inventory_denominator: 4282,
    content_authoring_denominator: 3367,
    content_target_name: "R3_EFFECTIVE_CANONICAL_WORK_AND_MANDATORY_SUCCESSOR",
    content_target_sha256: contentTargetSha256,
    membership: contentTargetProjection,
    excluded: {
      external_reference: 515,
      redirect: 400,
      duplicate: 0,
      retired: 0,
      blocked_unclassified: 0,
    },
    acceptance: {
      all_known_identities_classified_percent: 100,
      unclassified: 0,
      redirect_cycles: 0,
      duplicate_without_target_or_reason: 0,
      external_in_content_authoring: 0,
      successor_double_count: 0,
      one_content_target_sha: true,
    },
    engineer_accepted: 0,
    content_green_claimed: false,
  });

  const transitionSha256 = writePayload(TRANSITION_OUTPUT, {
    schema_version: "real-estimates-global-green-r3.denominator-transition-4211-to-r3.v1",
    ...common,
    parent_identity_inventory: { path: repoPath(INVENTORY_OUTPUT), sha256: inventorySha256 },
    content_authoring_denominator: { path: repoPath(DENOMINATOR_OUTPUT), sha256: denominatorSha256, content_target_sha256: contentTargetSha256 },
    status: "GREEN_R3_DENOMINATOR_TRANSITION_4211_TO_3367",
    old_denominator: 4211,
    new_denominator: 3367,
    transitions_by_type: countBy(transitions, "transition"),
    rows_jsonl: { path: repoPath(TRANSITION_JSONL), sha256: hashFile(TRANSITION_JSONL), rows: transitions.length },
    rows: transitions,
    cardinality_note: "61 is 4272 - 4211 = 63 predecessor-only - 2 target-only; it is not an alias list.",
    content_green_claimed: false,
  });

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson(executionStatePath);
  atomicWrite(executionStatePath, `${JSON.stringify({
    ...executionState,
    generated_at_utc: generatedAt,
    current_phase: "R3_2_COMPLETE_R3_3_PENDING",
    denominator: {
      status: "AUTHORITATIVE_DENOMINATOR_GREEN",
      identity_inventory: 4282,
      content_authoring: 3367,
      content_target_sha256: contentTargetSha256,
      identity_inventory_artifact_sha256: inventorySha256,
      denominator_artifact_sha256: denominatorSha256,
      transition_artifact_sha256: transitionSha256,
    },
    engineer_accepted: "0_OF_71_KNOWN_DRAFTS",
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
    terminal_wording: ["R3_IN_PROGRESS","GLOBAL_RED","NOT_PRODUCTION_READY","NO_RELEASE"],
  }, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: "AUTHORITATIVE_DENOMINATOR_GREEN",
    source_identity_sha256: sourceIdentitySha256,
    product_source_sha256: productSourceSha256,
    identity_inventory_denominator: identities.length,
    identity_class_counts: classCounts,
    content_authoring_denominator: contentIdentities.length,
    content_target_sha256: contentTargetSha256,
    transition_rows: transitions.length,
    control_numbers: { predecessor: 4272, old_content: 4211, successors: 10, symmetric_difference: 65, net_difference_not_alias_list: 61 },
    gates: { unclassified: 0, redirect_cycles: 0, external_in_content: 0, successor_double_count: 0 },
    engineer_accepted: 0,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
