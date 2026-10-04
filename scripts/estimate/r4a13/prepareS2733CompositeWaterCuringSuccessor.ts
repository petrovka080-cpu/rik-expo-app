import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans, publishCanonicalDefinitionDraft,
  type CanonicalPublisherJson as Json } from "./canonicalDefinitionPublisherR1";
import { cloneCanonicalPreparedSearchR1 } from "./canonicalPreparedSearchCloneR1";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
import { overlayS2733CompositeWaterCuring, COMPOSITE_WATER_COMPLETION_TARGETS_S2733 } from "./s2733CompositeWaterCuringOverlay";
const CONTRACT = "rik-expo-app.s27-33.composite-water-curing-completion.v1";

const ROOT = "C:/dev/rik-expo-app-r4a5-dc4f0ce7";
const BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER = "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (73).md";
const CURRENT = "data/estimate-benchmarks/r568-local-developer-canonical-release.json";
const SNAPSHOT = ".release-runtime/r568/s27-32/p15-composite-water-parent-snapshot.json";
const OUTPUT = ".release-runtime/r568/s27-32/composite-water-curing-completion-successor";
const SOURCES = ["scripts/estimate/r4a13/prepareS2733CompositeWaterCuringSuccessor.ts", "scripts/estimate/r4a13/s2733CompositeWaterCuringOverlay.ts",
  "scripts/estimate/r4a13/canonicalPreparedSearchCloneR1.ts", "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts", "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts", "scripts/estimate/r4a13/s2732PurchaseGroupOverlay.ts",
  "src/lib/estimate/v4/anchorGroupWaterCuringResourcesS2733.ts", "scripts/estimate/r4a13/s2733AnchorWaterCuringOverlay.ts", "src/lib/estimate/v4/concreteSlabCuringR1.ts", "scripts/estimate/r4a13/s2733ConcreteWaterCuringGroupOverlay.ts", "src/lib/estimate/v4/effectivePurchaseBalanceR1.ts", "src/lib/estimate/v4/automaticConstructionOwnerR1.ts"];
const APPLY = process.argv.includes("--apply");
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stringifyCanonicalEstimateJson(value)).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2733_COMPOSITE_WATER_CURING_COMPLETION_SUCCESSOR:${code}`); }
const git = (...args: string[]) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
const uuid = (seed: string) => { const chars = hash(seed).slice(0, 32).split(""); chars[12] = "5"; chars[16] = "8";
  const s = chars.join(""); return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`; };
function atomic(path: string, value: unknown) { mkdirSync(dirname(resolve(path)), { recursive: true });
  const tmp = `${resolve(path)}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n"); renameSync(tmp, resolve(path)); }
async function load(client: Client, definitionId: string, baselineId: string): Promise<PurchaseGroupRepresentative> {
  const queries = [];
  for (const [sql, id] of [
    ["select * from public.estimate_definition_version where id=$1", definitionId],
    ["select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", definitionId],
    ["select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", definitionId],
    ["select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", definitionId],
    [`select r.row_id,b.locator_id::text,b.applicability from public.estimate_work_normative_binding b
      join public.estimate_resource_spec r on r.id=b.resource_spec_id where b.definition_version_id=$1 order by r.row_id,b.locator_id`, definitionId],
    ["select * from public.estimate_approved_template_baseline where id=$1", baselineId],
    ["select * from public.estimate_content_passport_r3 where definition_version_id=$1", definitionId],
  ] as const) queries.push(await client.query(sql, [id]));
  return JSON.parse(JSON.stringify({ definition: queries[0]!.rows[0], parameters: queries[1]!.rows, formulas: queries[2]!.rows,
    resources: queries[3]!.rows, bindings: queries[4]!.rows, baseline: queries[5]!.rows[0], passport: queries[6]!.rows[0] }));
}

async function main() {
  invariant(process.cwd().replaceAll("\\", "/") === ROOT && git("rev-parse", "--show-toplevel").replaceAll("\\", "/") === ROOT, "ROOT_DRIFT");
  invariant(git("branch", "--show-current") === BRANCH, "BRANCH_DRIFT");
  invariant(SOURCES.every(path => git("status", "--short", "--", path) === ""), "CANDIDATE_SOURCES_MUST_BE_COMMITTED");
  const url = new URL(process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2");
  invariant(url.hostname === "127.0.0.1" && url.port === "55432" && url.pathname === "/rik_r4_runtime_b5_v2", "LOCAL_DATABASE_REQUIRED");
  const current = JSON.parse(readFileSync(CURRENT, "utf8")) as Json;
  const frozen = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Json;
  const head = git("rev-parse", "HEAD"), tree = git("rev-parse", "HEAD^{tree}");
  const masterSha256 = hash(readFileSync(MASTER));
  const sourceHashes = SOURCES.map(path => ({ path, sha256: hash(readFileSync(path)) }));
  const catalogIds = [...COMPOSITE_WATER_COMPLETION_TARGETS_S2733].sort();
  invariant(catalogIds.length === 79 && new Set(catalogIds).size === 79, "FINITE_SCOPE_DRIFT");
  invariant(current.productionAccessed === false, "PRODUCTION_FLAG");
  if (current.definitionReleaseId !== frozen.current.definitionReleaseId) {
    const previous = existsSync(`${OUTPUT}/acceptance.json`) ? JSON.parse(readFileSync(`${OUTPUT}/acceptance.json`, "utf8")) as Json : null;
    invariant(previous, "EXISTING_SUCCESSOR_RECEIPT_MISSING");
    invariant(previous.successor.releaseId === current.definitionReleaseId && previous.successor.searchReleaseId === current.searchReleaseId
      && hash(previous.sourceHashes) === hash(sourceHashes), "PREDECESSOR_POINTER_DRIFT");
    process.stdout.write(JSON.stringify({ status: "EXISTING_GROUP_PREPARED_NO_REAPPLY", successor: previous.successor, mutationPerformed: false }) + "\n");
    return;
  }
  const predecessorReleaseId = String(current.definitionReleaseId), predecessorSearchReleaseId = String(current.searchReleaseId);
  const fingerprint = hash({ contract: CONTRACT, masterSha256, predecessorReleaseId, predecessorSearchReleaseId, sourceHashes, snapshotSha256: hash(readFileSync(SNAPSHOT)) });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`), searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;
  const client = new Client({ connectionString: url.toString(), application_name: "s2732-local-composite-water-curing-completion-successor" });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='900s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
    const parentRelease = (await client.query("select * from public.estimate_definition_release where id=$1", [predecessorReleaseId])).rows[0];
    invariant(parentRelease?.status === "prepared" && parentRelease.activated_at == null, "PARENT_NOT_LOCAL_PREPARED");
    const parentSearch = (await client.query("select status,metadata from public.estimate_search_index_release where id=$1", [predecessorSearchReleaseId])).rows[0];
    invariant(parentSearch?.status === "draft" && parentSearch.metadata.definitionReleaseId === predecessorReleaseId, "SEARCH_PARENT_LINK");
    const plans = [], transitions: Json[] = [];
    for (const catalogId of catalogIds) {
      const manifest = (await client.query("select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2", [predecessorReleaseId, catalogId])).rows[0];
      invariant(manifest, `TARGET_MISSING:${catalogId}`);
      const parent = await load(client, manifest.definition_version_id, manifest.approved_template_baseline_id);
      const frozenParent = frozen.reps.find((r: Json) => r.target.catalog_id === catalogId);
      invariant(frozenParent && hash(parent) === hash(Object.fromEntries(Object.keys(parent).map(key => [key, frozenParent[key]]))), `PARENT_SNAPSHOT_DRIFT:${catalogId}`);
      const overlay = overlayS2733CompositeWaterCuring(parent, String(frozen.locator.id)), r = overlay.representative;
      const definitionId = uuid(`${fingerprint}:definition:${catalogId}`), baselineId = uuid(`${fingerprint}:baseline:${catalogId}`);
      const definitionSha256 = hash({ contract: CONTRACT, predecessorHash: parent.definition.definition_sha256,
        parameters: r.parameters, formulas: r.formulas, resources: r.resources });
      const evidenceSha256 = hash({ contract: CONTRACT, catalogId, fingerprint, definitionSha256, predecessorEvidence: parent.baseline.acceptance_evidence_sha256 });
      const plan = createCanonicalDefinitionClonePlan({ contract: CONTRACT,
        definition: { id: definitionId, releaseId, catalogId, definitionVersion: Number(parent.definition.definition_version) + 1,
          passport: { ...parent.definition.passport, compositeWaterCuringCompletionContract: CONTRACT }, applicability: r.definition.applicability,
          definitionSha256, sourceMetadata: { ...parent.definition.source_metadata, contract: CONTRACT, predecessorDefinitionId: parent.definition.id,
            compositeWaterCuringCompletionContract: CONTRACT, sourceHashes, activationAllowed: false, productionEligible: false } },
        representative: r,
        parameterTruthMetadata: p => ({ ...p.truth_metadata, contract: CONTRACT, semantic_parameter_key: `${catalogId}:${p.parameter_id}` }),
        resourceId: row => uuid(`${fingerprint}:resource:${catalogId}:${row.row_id}`), resourceSemanticOwner: row => String(row.semantic_owner),
        resourceSha256: row => hash({ contract: CONTRACT, catalogId, row }),
        baseline: { id: baselineId, key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${catalogId}`, sourceDefinitionVersionId: parent.definition.id,
          validationScenarioRefs: [...(parent.baseline.validation_scenario_refs ?? []), { scenario: "S2733_COMPOSITE_WATER_CURING_COMPLETION", acceptanceEvidenceSha256: evidenceSha256 }],
          acceptanceEvidenceSha256: evidenceSha256, acceptedReleaseId: releaseId, supersedesBaselineId: parent.baseline.id },
        passport: { physicalResultRu: String(parent.passport.physical_result_ru), excludedScopeRu: parent.passport.excluded_scope_ru,
          decision: { ...parent.passport.decision, waveContract: CONTRACT, predecessorWaveContract: parent.passport.decision.waveContract,
            compositeWaterCuringCompletionContract: CONTRACT, activationAllowed: false, productionEligible: false },
          payloadSha256: hash({ predecessor: parent.passport.payload_sha256, definitionSha256, evidenceSha256 }), sourceHead: head, sourceTree: tree },
        bindingApplicability: b => ({ ...b.applicability, clonedByContract: CONTRACT }), expectedNormativeBindingCount: r.bindings.length });
      plans.push(plan);
      transitions.push({ catalogId, predecessorDefinitionId: parent.definition.id, successorDefinitionId: definitionId,
        predecessorBaselineId: parent.baseline.id, successorBaselineId: baselineId, ownerRowIds: overlay.targetRowIds,
        addedParameterIds: overlay.addedParameterIds, addedFormulaIds: overlay.addedFormulaIds, changedFormulaIds: overlay.changedFormulaIds,
        parameterDelta: r.parameters.length - parent.parameters.length, formulaDelta: r.formulas.length - parent.formulas.length,
        resourceDelta: r.resources.length - parent.resources.length, quantityScope: parent.passport.decision.quantityScope });
    }
    const preflight = await preflightCanonicalDefinitionPublishPlans(client, plans);
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,definition_count,resource_row_count,
      metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
      select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count+$6,
        metadata||$7::jsonb,$8,$9,parameter_count+$10,formula_count+$11 from public.estimate_definition_release where id=$8`, [
      releaseId, releaseKey, head, tree, hash(`${fingerprint}:draft`), transitions.reduce((n, t) => n + t.resourceDelta, 0),
      JSON.stringify({ contract: CONTRACT, masterSha256, sourceHashes, sourceFingerprint: fingerprint, lifecycle: "DRAFT_FORWARD_ONLY", searchReleaseId,
        replacedDefinitionCount: catalogIds.length, activationAllowed: false, productionEligible: false }), predecessorReleaseId, hash({ fingerprint, sourceHashes }),
      transitions.reduce((n, t) => n + t.parameterDelta, 0), transitions.reduce((n, t) => n + t.formulaDelta, 0) ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state)
      select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,approved_template_baseline_id,
        baseline_ready,scenario_ready,definition_hash,encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),runtime_publication_state
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, predecessorReleaseId]);
    const persisted = [];
    for (const plan of plans) {
      persisted.push(await publishCanonicalDefinitionDraft(client, plan));
      const updated = await client.query(`update public.estimate_cumulative_manifest_entry set definition_version_id=$3,source_batch=$4,
        source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,definition_hash=$6,
        entry_sha256=$7,runtime_publication_state='CANDIDATE' where release_id=$1 and catalog_id=$2`, [
        releaseId, plan.definition.catalog_id, plan.definition.id, CONTRACT, plan.baseline.id, plan.definition.definition_sha256,
        hash({ contract: CONTRACT, releaseId, catalogId: plan.definition.catalog_id, definitionId: plan.definition.id, baselineId: plan.baseline.id, definitionSha256: plan.definition.definition_sha256 })]);
      invariant(updated.rowCount === 1, "MANIFEST_TARGET_UPDATE");
    }
    const search = await cloneCanonicalPreparedSearchR1(client, { contract: CONTRACT, releaseId, searchReleaseId,
      parentSearchReleaseId: predecessorSearchReleaseId, releaseKey, head, tree, fingerprint, targetCount: catalogIds.length });
    const unrelated = Number((await client.query(`select count(*)::int changed from public.estimate_cumulative_manifest_entry p
      full join public.estimate_cumulative_manifest_entry n on n.release_id=$2 and n.catalog_id=p.catalog_id
      where p.release_id=$1 and not(p.catalog_id=any($3::text[])) and
      (n.catalog_id is null or (p.definition_version_id,p.source_batch,p.source_release_id,p.approved_template_baseline_id,p.runtime_publication_state,p.publication_state,p.baseline_ready,p.scenario_ready)
        is distinct from (n.definition_version_id,n.source_batch,n.source_release_id,n.approved_template_baseline_id,n.runtime_publication_state,n.publication_state,n.baseline_ready,n.scenario_ready))`, [predecessorReleaseId, releaseId, catalogIds])).rows[0].changed);
    invariant(unrelated === 0, "UNRELATED_MANIFEST_DRIFT");
    const manifest = (await client.query(`select count(*)::int identities,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0];
    invariant(manifest.identities === Number(parentRelease.definition_count), "MANIFEST_IDENTITY_LOSS");
    await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
      metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [releaseId, manifest.snapshot,
      JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId, searchSnapshotSha256: search.snapshot_sha256, transitions })]);
    const receipt = { contract: CONTRACT, status: APPLY ? "GREEN_GROUP_PREPARED_NOT_ACTIVE" : "DRY_RUN_GROUP_VALIDATED", capturedAt: new Date().toISOString(),
      predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId }, successor: { releaseId, searchReleaseId, releaseKey },
      sourceHead: head, sourceTree: tree, sourceHashes, masterSha256, fingerprint, transitions, preflight, persisted,
      audit: { manifest, search, unrelatedManifestChanges: unrelated }, mutationPerformed: APPLY, productionAccessed: false,
      activationPerformed: false, uiAccepted: false, engineeringAccepted: false, fullGateAccepted: false };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    atomic(`${OUTPUT}/${APPLY ? "acceptance" : "dry-run"}.json`, receipt);
    if (APPLY) atomic(CURRENT, { ...current, definitionReleaseId: releaseId, searchReleaseId, definitionReleaseStatus: "prepared", searchReleaseStatus: "draft",
      definitionSnapshotSha256: manifest.snapshot, manifestHashChainSha256: manifest.snapshot, searchHashChainSha256: search.snapshot_sha256,
      owner: "S27_33_COMPOSITE_WATER_CURING_COMPLETION_SUCCESSOR", productionAccessed: false, fakeGreenClaimed: false });
    else invariant(Number((await client.query("select count(*)::int count from public.estimate_definition_release where id=$1", [releaseId])).rows[0].count) === 0, "DRY_RUN_RESIDUE");
    process.stdout.write(JSON.stringify({ status: receipt.status, successor: receipt.successor, targets: catalogIds.length, addedResourceRows: transitions.reduce((n, t) => n + t.resourceDelta, 0), unrelatedManifestChanges: unrelated, mutationPerformed: APPLY }) + "\n");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
void main().catch(error => { process.stderr.write(String(error.stack ?? error) + "\n"); process.exitCode = 1; });
