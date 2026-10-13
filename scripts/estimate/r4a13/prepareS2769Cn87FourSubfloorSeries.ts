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
import { type PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
import {overlayS2769Cn87SubfloorFour} from './s2769Cn87SubfloorFourOverlay';
import {buildCn87SubfloorMigrationProofS2769,admitCn87SubfloorMigrationProofS2769} from '../../../src/lib/estimate/backendPlatform/canonicalCn87SubfloorMigrationS2769';
import pack from '../../../data/estimate-benchmarks/source-packs/cn87-four-subfloor-bindings-s27-69.json';
import {cn87SeparationSourcePackS2754 as source} from '../../../src/lib/estimate/v4/cn87SeparationScreedS2754';
const CONTRACT=pack.contract;

const ROOT = "C:/dev/rik-expo-app-r4a5-dc4f0ce7";
const BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER = "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (100).md";
const CURRENT = "data/estimate-benchmarks/r568-local-developer-canonical-release.json";
const SNAPSHOT="data/estimate-benchmarks/fixtures/cn87-four-subfloor-v4-parents-s27-69.json";
const OUTPUT=".release-runtime/r568/s27-69/cn87-four-subfloor/publication";
const SOURCES = [
 "scripts/estimate/r4a13/prepareS2769Cn87FourSubfloorSeries.ts","scripts/estimate/r4a13/s2769Cn87SubfloorFourOverlay.ts",
 "src/lib/estimate/v4/cn87SubfloorSeriesS2769.ts","src/lib/estimate/v4/cn87SubfloorSeriesS2769.test.ts",
 "src/lib/estimate/backendPlatform/canonicalCn87SubfloorMigrationS2769.ts","src/lib/estimate/backendPlatform/canonicalCn87SubfloorMigrationS2769.test.ts",
 "data/estimate-benchmarks/source-packs/cn87-four-subfloor-bindings-s27-69.json",SNAPSHOT,
 "src/lib/estimate/v4/cn87SeparationScreedS2754.ts","data/estimate-benchmarks/source-packs/cn87-separation-screed-s27-54.json",
 source.acceptedPhysicalSourcePack,source.source.localArtifact,
 "src/lib/estimate/v4/cn69SubfloorSeriesS2769.ts","data/estimate-benchmarks/source-packs/cn69-four-subfloor-bindings-s27-69.json",
 "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts","scripts/estimate/r4a13/canonicalPreparedSearchCloneR1.ts",
 "src/lib/estimate/v4/automaticConstructionOwnerR1.ts","src/lib/estimate/v4/effectivePurchaseBalanceR1.ts",
 "src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts","src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
 "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts","scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
 "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts","src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts",
 "src/features/consumerRepair/consumerCanonicalParameterEditor.ts","scripts/dev/startWholeAppDeveloperReview.ps1"];
const APPLY = process.argv.includes("--apply");
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stringifyCanonicalEstimateJson(value)).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2769_CN87_FOUR_SUBFLOOR_SERIES:${code}`); }
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
  const catalogIds = pack.targets.map(t=>t.catalogId).sort();
  invariant(pack.targets.length===4 && catalogIds.length===4, "FINITE_SCOPE_DRIFT");
  for(const s of [source.source])invariant(hash(readFileSync(s.localArtifact))===s.sha256,'PRIMARY_SOURCE_ARTIFACT_DRIFT');
  invariant(hash(readFileSync(SNAPSHOT))===pack.parentSnapshotSha256,'EXACT_PARENT_SNAPSHOT_DRIFT');
  if (APPLY) {
    const gatePath = process.argv.find(a => a.startsWith("--gate-receipt="))?.slice("--gate-receipt=".length);
    invariant(gatePath && existsSync(gatePath), "CURRENT_GATE_RECEIPT_REQUIRED");
    const gate = JSON.parse(readFileSync(gatePath, "utf8"));
    invariant(gate.head_sha === head && gate.exit_code === 0 && gate.final_status === "GREEN_VERIFICATION_GATE"
      && gate.input_integrity?.passed === true && gate.failed_tests === 0 && gate.skipped_tests === 0, "CURRENT_GATE_NOT_GREEN");
  }
  invariant(current.productionAccessed === false, "PRODUCTION_FLAG");
  const predecessorReleaseId = String(frozen.current.definitionReleaseId), predecessorSearchReleaseId = String(frozen.current.searchReleaseId);
  const fingerprint = hash({ contract: CONTRACT, masterSha256, predecessorReleaseId, predecessorSearchReleaseId, sourceHashes, snapshotSha256: hash(readFileSync(SNAPSHOT)) });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`), searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;
  invariant((current.definitionReleaseId === predecessorReleaseId && current.searchReleaseId === predecessorSearchReleaseId)
    || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId), "EXACT_CURRENT_POINTER_TUPLE_DRIFT");
  const client = new Client({ connectionString: url.toString(), application_name: "s2769-local-cn87-four-subfloor" });
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
    const locators={} as {manufacturer:string};
    for(const [kind,artifact] of [['manufacturer',source.source]] as const){
      const sourceKey=source.contract+':'+kind,sourceId=uuid(sourceKey+':'+artifact.sha256),locatorId=uuid(sourceKey+':locator:'+artifact.sha256),locatorKey=pack.contract+':'+kind;
      const locatorPayload={contract:pack.contract,kind,facts:artifact,scopeRu:pack.scopeRu,exclusionsRu:source.excludedRu,completeEstimateAccepted:false};
      const title='Ceresit CN87, CN_87_KT_10.21: 50 мм на разделительном слое';
      const official=artifact.officialUrl;
      await client.query('insert into public.estimate_normative_source(id,source_key,title_ru,authority,official_url,artifact_sha256,metadata) values($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict(source_key) do nothing',
        [sourceId,sourceKey,title,'Henkel/Ceresit',official,artifact.sha256,JSON.stringify({contract:CONTRACT,activationAllowed:false,sourceRole:'ACCEPTED_MANUFACTURER_SEPARATION_SCREED_CONSUMPTION',sourceId:source.sourceId})]);
      const actual=(await client.query('select id::text,artifact_sha256 from public.estimate_normative_source where source_key=$1',[sourceKey])).rows[0];
      invariant(actual?.id===sourceId&&actual.artifact_sha256===artifact.sha256,'PRIMARY_SOURCE_IDENTITY_DRIFT');
      await client.query('insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256) values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing',[locatorId,sourceId,locatorKey,JSON.stringify(locatorPayload),hash(locatorPayload)]);
      const actualLocator=(await client.query('select id::text,locator,excerpt_sha256 from public.estimate_normative_locator where source_id=$1 and locator_key=$2',[sourceId,locatorKey])).rows[0];
      invariant(actualLocator?.id===locatorId&&hash(actualLocator.locator)===hash(locatorPayload)&&actualLocator.excerpt_sha256===hash(locatorPayload),'PRIMARY_LOCATOR_DRIFT');
      locators[kind]=locatorId;
    }
    const plans = [], transitions: Json[] = [];
    for (const catalogId of catalogIds) {
      const manifest = (await client.query("select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2", [predecessorReleaseId, catalogId])).rows[0];
      invariant(manifest, `TARGET_MISSING:${catalogId}`);
      const parent = await load(client, manifest.definition_version_id, manifest.approved_template_baseline_id);
      const frozenParent = frozen.reps.find((r: Json) => r.definition.catalog_id === catalogId);
      invariant(frozenParent && hash(parent) === hash(Object.fromEntries(Object.keys(parent).map(key => [key, frozenParent[key]]))), `PARENT_SNAPSHOT_DRIFT:${catalogId}`);
      const overlay=overlayS2769Cn87SubfloorFour(parent,locators.manufacturer),r=overlay.representative;
      const definitionId = uuid(`${fingerprint}:definition:${catalogId}`), baselineId = uuid(`${fingerprint}:baseline:${catalogId}`);
      const definitionSha256 = hash({ contract: CONTRACT, predecessorHash: parent.definition.definition_sha256,
        parameters: r.parameters, formulas: r.formulas, resources: r.resources });
      const evidenceSha256 = hash({ contract: CONTRACT, catalogId, fingerprint, definitionSha256, predecessorEvidence: parent.baseline.acceptance_evidence_sha256 });

      const migrationProof=buildCn87SubfloorMigrationProofS2769({fromDefinition:{id:String(parent.definition.id),catalogId,sha256:String(parent.definition.definition_sha256)},
        toDefinition:{id:definitionId,catalogId,sha256:definitionSha256},from:parent,to:r});
      const plan = createCanonicalDefinitionClonePlan({contract:CONTRACT,
        definition:{id:definitionId,releaseId,catalogId,definitionVersion:5,passport:{...parent.definition.passport,cn87SeriesContract:pack.contract},
          applicability:{...parent.definition.applicability,cn87ExactScopeRu:pack.scopeRu,cn87Only50mmReadySeparationManual:true},definitionSha256,
          sourceMetadata:{...parent.definition.source_metadata,contract:CONTRACT,predecessorDefinitionId:parent.definition.id,cn87SeriesContract:pack.contract,
            cn87SubfloorMigrationS2769:migrationProof,sourceHashes,activationAllowed:false,productionEligible:false}},
        representative:r,parameterTruthMetadata:p=>p.truth_metadata,
        resourceId:row=>uuid(fingerprint+':resource:'+catalogId+':'+row.row_id),resourceSemanticOwner:row=>String(row.semantic_owner),resourceSha256:row=>hash({contract:CONTRACT,catalogId,row}),
        baseline:{id:baselineId,key:CONTRACT+':'+fingerprint.slice(0,16)+':'+catalogId,sourceDefinitionVersionId:parent.definition.id,
          validationScenarioRefs:[...(parent.baseline.validation_scenario_refs??[]),{scenario:'S2769_CN87_FOUR_EXACT_SEPARATION_50MM_ADDITIVE',acceptanceEvidenceSha256:evidenceSha256,
            primarySourceArtifactSha256:source.source.sha256,quantityQuality:'SOURCE_BACKED_CN87_50MM_AND_ACTUAL_DOSAGE',completeTechnicalEstimateAccepted:false}],
          acceptanceEvidenceSha256:evidenceSha256,acceptedReleaseId:releaseId,supersedesBaselineId:parent.baseline.id},
        passport:{physicalResultRu:String(parent.passport.physical_result_ru),excludedScopeRu:parent.passport.excluded_scope_ru,
          decision:{...r.passport.decision,waveContract:CONTRACT,predecessorWaveContract:parent.passport.decision.waveContract,materialSeriesContract:pack.contract,activationAllowed:false,productionEligible:false},
          payloadSha256:hash({predecessor:parent.passport.payload_sha256,definitionSha256,evidenceSha256}),sourceHead:head,sourceTree:tree},
        bindingApplicability:b=>({...b.applicability,clonedByContract:CONTRACT}),expectedNormativeBindingCount:r.bindings.length});
      invariant(admitCn87SubfloorMigrationProofS2769({proof:migrationProof,fromDefinition:{id:String(parent.definition.id),catalogId,sha256:String(parent.definition.definition_sha256)},
        toDefinition:{id:definitionId,catalogId,sha256:definitionSha256},from:parent,to:plan})!=null,'FINAL_PLAN_MIGRATION_NOT_ADMITTED');
      invariant(hash(plan.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})))===plan.baseline.parameter_schema_sha256,'FINAL_PARAMETER_SCHEMA_DIGEST_DRIFT');
      invariant(plan.passport.decision.materialSourceScopeOnly === true && plan.passport.decision.completeTechnicalEstimateAccepted === false
        && plan.passport.decision.legacyPreliminarySourcesRemainUnaccepted === true, "LIMITED_MATERIAL_SCOPE_FLAGS_LOST");
      plans.push(plan);
      transitions.push({ catalogId, predecessorDefinitionId: parent.definition.id, successorDefinitionId: definitionId,
        predecessorBaselineId: parent.baseline.id, successorBaselineId: baselineId, ownerRowIds: overlay.newPayableOwnerRowId?[overlay.newPayableOwnerRowId]:[], legacyRowIds: overlay.legacyRowIds, addedRowIds: overlay.addedRowIds,
        addedParameterIds: overlay.addedParameterIds, changedFormulaIds: overlay.changedFormulaIds,
        physicalNormOwnerRowIds:overlay.physicalNormOwnerRowIds,ownerDisposition:overlay.ownerDisposition,physicalNormClosureCount:2,titleOnly:false,
        parameterDelta: r.parameters.length - parent.parameters.length, formulaDelta: r.formulas.length - parent.formulas.length,
        resourceDelta: r.resources.length - parent.resources.length, quantityScope: parent.passport.decision.quantityScope, completeTechnicalEstimateAccepted: false });
    }

    const existing = (await client.query("select * from public.estimate_definition_release where id=$1", [releaseId])).rows[0];
    if (existing) {
      const recovered = existing.metadata.preparedRecoveryReceipt as Json | undefined;
      invariant(existing.status === "prepared" && existing.activated_at == null && existing.parent_release_id === predecessorReleaseId
        && existing.source_commit === head && existing.source_tree === tree && existing.metadata.sourceFingerprint === fingerprint,
        "COMMITTED_SUCCESSOR_IDENTITY_DRIFT");
      invariant(recovered && recovered.fingerprint === fingerprint && recovered.sourceHead === head && recovered.sourceTree === tree
        && recovered.masterSha256 === masterSha256 && hash(recovered.sourceHashes) === hash(sourceHashes)
        && recovered.successor.releaseId === releaseId && recovered.successor.searchReleaseId === searchReleaseId,
        "COMMITTED_RECOVERY_RECEIPT_DRIFT");
      const project = (actual: Json, expected: Json) => Object.fromEntries(Object.keys(expected).map(k => [k, actual[k]]));
      for (const plan of plans) {
        const actual = await load(client, plan.definition.id, plan.baseline.id);
        const { content_status: _status, content_gate_status: _gate, ...expectedDefinition } = plan.definition;
        invariant(hash(project(actual.definition, expectedDefinition)) === hash(expectedDefinition), "RECOVERY_DEFINITION_DRIFT");
        for (const key of ["parameters", "formulas", "resources"] as const) {
          const identity = key === "parameters" ? "parameter_id" : key === "formulas" ? "formula_id" : "row_id";
          invariant(actual[key].length === plan[key].length && plan[key].every(expected => {
            const item = actual[key].find(a => a[identity] === (expected as Json)[identity]);
            return item && hash(project(item, expected)) === hash(expected);
          }), `RECOVERY_${key.toUpperCase()}_DRIFT`);
        }
        invariant(hash(project(actual.baseline, plan.baseline)) === hash(plan.baseline)
          && hash(project(actual.passport, plan.passport)) === hash(plan.passport), "RECOVERY_BASELINE_PASSPORT_DRIFT");
        const expectedBindings = plan.bindings.map(b => ({ row_id: plan.resources.find(r => r.id === b.resource_spec_id)!.row_id,
          locator_id: b.locator_id, applicability: b.applicability })).sort((a, b) => a.row_id.localeCompare(b.row_id));
        invariant(hash(actual.bindings) === hash(expectedBindings), "RECOVERY_BINDING_DRIFT");
      }
      const manifest = (await client.query(`select count(*)::int identities,
        encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0];
      const search = (await client.query(`select count(*)::int documents,
        encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
        from public.estimate_search_document where search_release_id=$1`, [searchReleaseId])).rows[0];
      const searchRelease = (await client.query("select * from public.estimate_search_index_release where id=$1", [searchReleaseId])).rows[0];
      invariant(hash(manifest) === hash(recovered.audit.manifest) && hash(search) === hash(recovered.audit.search)
        && existing.source_manifest_sha256 === manifest.snapshot && searchRelease?.status === "draft"
        && searchRelease.metadata.definitionReleaseId === releaseId && searchRelease.metadata.sourceFingerprint === fingerprint
        && searchRelease.metadata.parentSearchReleaseId === predecessorSearchReleaseId && searchRelease.source_commit === head
        && searchRelease.source_tree === tree && searchRelease.snapshot_sha256 === search.snapshot_sha256, "RECOVERY_MANIFEST_SEARCH_DRIFT");
      await client.query("rollback");
      if (APPLY) {
        atomic(`${OUTPUT}/acceptance.json`, { ...recovered, recoveredCommittedPublication: true, recoveryVerifiedAt: new Date().toISOString() });
        atomic(CURRENT, { ...current, definitionReleaseId: releaseId, searchReleaseId, definitionReleaseStatus: "prepared", searchReleaseStatus: "draft",
          definitionSnapshotSha256: manifest.snapshot, manifestHashChainSha256: manifest.snapshot, searchHashChainSha256: search.snapshot_sha256,
          owner:"S27_69_CN87_FOUR_SUBFLOOR", productionAccessed: false, fakeGreenClaimed: false });
      }
      process.stdout.write(JSON.stringify({ status: "COMMITTED_SERIES_VERIFIED_NO_DATABASE_REAPPLY", successor: recovered.successor,
        adoptedPointer: APPLY, databaseMutationPerformed: false }) + "\n");
      return;
    }
    invariant(current.definitionReleaseId === predecessorReleaseId && current.searchReleaseId === predecessorSearchReleaseId,
      "POINTER_WITHOUT_COMMITTED_SUCCESSOR");
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
    for(const catalogId of catalogIds){
      const updated=await client.query(`update public.estimate_search_document set normalized_search_terms=array_append(normalized_search_terms,$3),
        normalized_search_blob=normalized_search_blob||' '||$3,source_provenance=source_provenance||jsonb_build_object('cn87SeriesContract',$4::text),
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3,'UTF8'),'sha256'),'hex') where search_release_id=$1 and catalog_id=$2`,
        [searchReleaseId,catalogId,'ceresit cn87 стяжка 50 мм готовый разделительный слой ручное уплотнение',CONTRACT]);
      invariant(updated.rowCount===1,'CN87_SEARCH_TARGET_REQUIRED');
    }
    const finalSearch=(await client.query(`select count(*)::int documents,encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256 from public.estimate_search_document where search_release_id=$1`,[searchReleaseId])).rows[0];
    Object.assign(search,finalSearch);
    await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2 where id=$1 and status='draft'`,[searchReleaseId,search.snapshot_sha256]);

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
    const receipt = { contract: CONTRACT, status: APPLY ? "GREEN_GROUP_PREPARED_NOT_ACTIVE" : "DRY_RUN_GROUP_VALIDATED", capturedAt: new Date().toISOString(),
      predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId }, successor: { releaseId, searchReleaseId, releaseKey },
      sourceHead: head, sourceTree: tree, sourceHashes, masterSha256, fingerprint, transitions, preflight, persisted,
      audit: { manifest, search, unrelatedManifestChanges: unrelated }, mutationPerformed: APPLY, productionAccessed: false,
      newPhysicalNormConsumerCount:pack.targets.length,newPhysicalNormClosureCount:pack.targets.length*2,titleOnlyChangeCount:0,inheritedNeedsPerType:13,activeUnresolvedDefinitionsPerCn87Type:21,newCompleteTechnicalTypeCount:0,
      activationPerformed: false, uiAccepted: false, engineeringAccepted: false, fullGateAccepted: false };
    await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
      metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [releaseId, manifest.snapshot,
      JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId, searchSnapshotSha256: search.snapshot_sha256, transitions,
        preparedRecoveryReceipt: receipt })]);
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    atomic(`${OUTPUT}/${APPLY ? "acceptance" : "dry-run"}.json`, receipt);
    if (APPLY) atomic(CURRENT, { ...current, definitionReleaseId: releaseId, searchReleaseId, definitionReleaseStatus: "prepared", searchReleaseStatus: "draft",
      definitionSnapshotSha256: manifest.snapshot, manifestHashChainSha256: manifest.snapshot, searchHashChainSha256: search.snapshot_sha256,
      owner:"S27_69_CN87_FOUR_SUBFLOOR", productionAccessed: false, fakeGreenClaimed: false });
    else invariant(Number((await client.query("select count(*)::int count from public.estimate_definition_release where id=$1", [releaseId])).rows[0].count) === 0, "DRY_RUN_RESIDUE");
    process.stdout.write(JSON.stringify({ status: receipt.status, successor: receipt.successor, targets: catalogIds.length,
      newPhysicalNormConsumers:receipt.newPhysicalNormConsumerCount,newPhysicalNormClosures:receipt.newPhysicalNormClosureCount,
      completeTypes: 0, unrelatedManifestChanges: unrelated, mutationPerformed: APPLY }) + "\n");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
void main().catch(error => { process.stderr.write(String(error.stack ?? error) + "\n"); process.exitCode = 1; });
