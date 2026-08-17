import path from "node:path";
import {
  B9_RELEASE_A,
  EVIDENCE,
  GLOBAL_LEDGER,
  SCHEMA_VERSION,
  ensureDir,
  invariant,
  journal,
  producer,
  readJsonl,
  sha256Object,
  sourceIdentity,
  writeJson,
  writeJsonl,
} from "./support";

type LedgerRow = {
  catalog_id: string;
  title_ru: string;
  source_family: string;
  operation: string;
  current_owner: string;
  classificationSha256: string;
};

type WorkRow = {
  catalogId: string;
  namespace: "global" | "external_reference";
  domain: string;
  titleRu: string;
  sourceIdentity: string;
  definitionVersion: number;
  sourceMetadata: Record<string, unknown>;
};

const COMMAND = "npx tsx scripts/estimate/p0TruthRemediationR2/buildR2RouteMatrix.ts";
const worksPath = path.join(B9_RELEASE_A, "works.jsonl");
const ledger = readJsonl<LedgerRow>(GLOBAL_LEDGER);
const works = readJsonl<WorkRow>(worksPath);
const source = sourceIdentity();
ensureDir(EVIDENCE);
invariant(ledger.length === 11_610, `GLOBAL_LEDGER_COUNT:${ledger.length}`);
invariant(works.length === 4_503, `CUMULATIVE_WORK_COUNT:${works.length}`);

const globalWorks = works.filter((row) => row.namespace === "global");
const globalBySource = new Map(globalWorks.map((row) => [row.sourceIdentity, row]));
const globalById = new Map(globalWorks.map((row) => [row.catalogId, row]));
const globalMatrix = ledger.map((row) => {
  const admitted = globalById.get(row.catalog_id) ?? globalBySource.get(row.catalog_id);
  const isFire = admitted?.domain === "fire";
  const routeDecision = admitted
    ? isFire ? "BACKEND_CANDIDATE_QUARANTINED" : "BACKEND_CANONICAL"
    : "PRELIMINARY_NOT_CANONICAL";
  const body = {
    schema_version: SCHEMA_VERSION,
    producer_command: COMMAND,
    semantic_role: "Read-only classification of every baseline global runtime route",
    source_head: source.head,
    source_tree: source.tree,
    request_id: null,
    draft_id: null,
    global_ledger_catalog_id: row.catalog_id,
    catalog_id: admitted?.catalogId ?? row.catalog_id,
    title_ru: admitted?.titleRu ?? row.title_ru,
    domain: admitted?.domain ?? row.source_family,
    operation: row.operation,
    route_decision: routeDecision,
    route_reason: admitted
      ? isFire
        ? "Fire definition exists only in quarantined BATCH009 candidate; professional compile remains fail-closed until corrected single activation."
        : "Definition belongs to exact BATCH008 cumulative backend release."
      : "Global queue identity is searchable but has no admitted backend definition.",
    release_id: admitted ? (isFire ? "2c1cb615-187c-50f6-980d-66b62bd3d5d1" : "da29dc2b-1384-5487-b8da-6ee93f4e514e") : null,
    definition_version: admitted?.definitionVersion ?? null,
    compiler_owner: admitted ? "backend" : null,
    parameter_schema_hash: null,
    input_hash: null,
    output_revision_id: null,
    output_hash: null,
    fallback_used: false,
    fallback_reason: null,
    professional_label_allowed: Boolean(admitted && !isFire),
    source_classification_sha256: row.classificationSha256,
  };
  return { ...body, route_record_sha256: sha256Object(body) };
});

const nonAsphalt = works.filter((row) => row.domain !== "asphalt").map((row) => {
  const isFire = row.domain === "fire";
  const body = {
    schema_version: SCHEMA_VERSION,
    producer_command: COMMAND,
    semantic_role: "Baseline non-Asphalt backend reachability without fallback",
    source_head: source.head,
    source_tree: source.tree,
    catalog_id: row.catalogId,
    source_identity: row.sourceIdentity,
    namespace: row.namespace,
    domain: row.domain,
    route_decision: isFire ? "BACKEND_CANDIDATE_QUARANTINED" : "BACKEND_CANONICAL",
    current_professional_reachability: isFire ? "RED_NOT_ACTIVE" : "GREEN_EXACT_BATCH008_RELEASE",
    expected_corrected_successor_route: "BACKEND_CANONICAL",
    compiler_owner: "backend",
    fallback_used: false,
    fallback_allowed: false,
    definition_version: row.definitionVersion,
    candidate_release_id: isFire ? "2c1cb615-187c-50f6-980d-66b62bd3d5d1" : null,
  };
  return { ...body, reachability_record_sha256: sha256Object(body) };
}).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));

invariant(nonAsphalt.length === 4_440, `NON_ASPHALT_COUNT:${nonAsphalt.length}`);
const globalPath = path.join(EVIDENCE, "GLOBAL_11610_RUNTIME_ROUTE_MATRIX.jsonl");
const nonAsphaltPath = path.join(EVIDENCE, "NON_ASPHALT_4440_BACKEND_REACHABILITY.jsonl");
writeJsonl(globalPath, globalMatrix);
writeJsonl(nonAsphaltPath, nonAsphalt);

const counts = {
  global_total: globalMatrix.length,
  exact_b8_backend: globalMatrix.filter((row) => row.route_decision === "BACKEND_CANONICAL").length,
  fire_candidate_quarantined: globalMatrix.filter((row) => row.route_decision === "BACKEND_CANDIDATE_QUARANTINED").length,
  preliminary_not_canonical: globalMatrix.filter((row) => row.route_decision === "PRELIMINARY_NOT_CANONICAL").length,
  admitted_fallback: globalMatrix.filter((row) => row.fallback_used).length,
  non_asphalt_total: nonAsphalt.length,
  non_asphalt_current_green: nonAsphalt.filter((row) => row.current_professional_reachability.startsWith("GREEN")).length,
  non_asphalt_current_red: nonAsphalt.filter((row) => row.current_professional_reachability.startsWith("RED")).length,
};
writeJson(path.join(EVIDENCE, "RUNTIME_ROUTE_MATRIX_SUMMARY.json"), {
  ...producer(COMMAND, "Exact count summary for runtime route matrix", [GLOBAL_LEDGER, worksPath]),
  counts,
  expected: {
    global_total: 11_610,
    exact_b8_backend: 3_755,
    fire_candidate_quarantined: 88,
    preliminary_not_canonical: 7_767,
    non_asphalt_total: 4_440,
    non_asphalt_current_green: 4_209,
    non_asphalt_current_red: 231,
  },
  generic_professional_label_count: 0,
  frontend_canonical_compiler_reachability: 0,
  status: counts.non_asphalt_current_red === 0 ? "GREEN" : "RED_FIRE_231_QUARANTINED_NOT_ACTIVE",
});

journal({
  gate: "A1",
  check: "11610 runtime-route inventory и 4440 non-Asphalt backend reachability",
  why: "Admitted работы не могут уходить в generic fallback; queue работы не могут называться профессиональными.",
  command: COMMAND,
  result: `Global ${counts.global_total}; B8 backend ${counts.exact_b8_backend}; Fire quarantined ${counts.fire_candidate_quarantined}; preliminary ${counts.preliminary_not_canonical}; fallback 0.`,
  status: "RED",
  affected: counts,
  rootCause: "231 Fire definitions находятся только в BATCH009 candidate и не активированы согласно R2.",
  repair: "Все 11610 получили явное route state; preliminary не получает professional label; fallback=false.",
  completed: "Route classification 11610/11610 и non-Asphalt set 4440/4440 материализованы.",
  next: "Завершить truth-аудит 4440, пересобрать corrected successor и выполнить одну activation.",
});

console.info(JSON.stringify({ status: "RED_FIRE_231_QUARANTINED_NOT_ACTIVE", counts }, null, 2));
