import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  type CanonicalPublisherJson,
} from "./canonicalDefinitionPublisherR1";

const CONTRACT = "rik-expo-app.r4-a13-6.canonical-definition-publisher-r1.acceptance.v1";
const SOURCE_RELEASE_ID = "50739ecf-b47f-5294-96d8-503c00d92200";
const SOURCE_CATALOG_ID = "canonical-work:base:concrete_foundation_interior_formwork_form_standard";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const OUTPUT_PATH = resolve(
  ".release-runtime/r4a13-6/canonical-definition-publisher-r1/acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as CanonicalPublisherJson)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_CANONICAL_PUBLISHER_ACCEPTANCE_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_CANONICAL_PUBLISHER_ACCEPTANCE_DATABASE_NOT_CANONICAL:${parsed.port}:${parsed.pathname}`);
}

async function expectedPreflightFailure(
  client: Client,
  plan: ReturnType<typeof createCanonicalDefinitionClonePlan>,
  mutate: (copy: ReturnType<typeof createCanonicalDefinitionClonePlan>) => void,
  expectedCode: string,
) {
  const copy = structuredClone(plan);
  mutate(copy);
  try {
    await preflightCanonicalDefinitionPublishPlans(client, [copy]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    invariant(message.includes(expectedCode),
      `STOP_CANONICAL_PUBLISHER_NEGATIVE_WRONG_ERROR:${expectedCode}:${message}`);
    return { expectedCode, rejected: true, message };
  }
  throw new Error(`STOP_CANONICAL_PUBLISHER_NEGATIVE_ACCEPTED:${expectedCode}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const releaseId = uuid(`${CONTRACT}:${head}:rollback-release`);
  const definitionId = uuid(`${CONTRACT}:${head}:rollback-definition`);
  const baselineId = uuid(`${CONTRACT}:${head}:rollback-baseline`);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "canonical-definition-publisher-r1-acceptance",
  });
  await client.connect();
  try {
    const release = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [SOURCE_RELEASE_ID],
    )).rows[0] as CanonicalPublisherJson;
    const representative = (await client.query(`select definition.*,manifest.approved_template_baseline_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      SOURCE_RELEASE_ID,
      SOURCE_CATALOG_ID,
    ])).rows[0] as CanonicalPublisherJson;
    invariant(release?.status === "prepared" && representative,
      "STOP_CANONICAL_PUBLISHER_ACCEPTANCE_SOURCE_MISSING");
    const parameters = (await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [representative.id],
    )).rows as CanonicalPublisherJson[];
    const formulas = (await client.query(
      "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [representative.id],
    )).rows as CanonicalPublisherJson[];
    const resources = (await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [representative.id],
    )).rows as CanonicalPublisherJson[];
    const bindings = (await client.query(`select binding.*,resource.row_id
      from public.estimate_work_normative_binding binding
      join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
      where binding.definition_version_id=$1 order by resource.ordinal`, [
      representative.id,
    ])).rows as CanonicalPublisherJson[];
    const baseline = (await client.query(
      "select * from public.estimate_approved_template_baseline where id=$1",
      [representative.approved_template_baseline_id],
    )).rows[0] as CanonicalPublisherJson;
    const passport = (await client.query(
      "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
      [representative.id],
    )).rows[0] as CanonicalPublisherJson;
    invariant(parameters.length === 52 && formulas.length === 20 && resources.length === 24
      && bindings.length === 9 && baseline && passport,
    "STOP_CANONICAL_PUBLISHER_ACCEPTANCE_SOURCE_SHAPE");
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [SOURCE_CATALOG_ID],
    )).rows[0].value);
    const definitionSha256 = sha256({ contract: CONTRACT, head, definitionId });
    const evidenceSha256 = sha256({ contract: CONTRACT, head, representativeId: representative.id });
    const plan = createCanonicalDefinitionClonePlan({
      contract: CONTRACT,
      definition: {
        id: definitionId,
        releaseId,
        catalogId: SOURCE_CATALOG_ID,
        definitionVersion: nextDefinitionVersion,
        passport: {
          ...representative.passport,
          publisherAcceptanceReplay: true,
        },
        applicability: {
          ...representative.applicability,
          publisherAcceptanceReplay: true,
        },
        definitionSha256,
        sourceMetadata: {
          ...representative.source_metadata,
          contract: CONTRACT,
          predecessorDefinitionId: representative.id,
          publisherAcceptanceReplay: true,
        },
      },
      representative: { parameters, formulas, resources, bindings, baseline, passport },
      parameterTruthMetadata: (parameter) => ({
        ...parameter.truth_metadata,
        contract: CONTRACT,
        semantic_parameter_key: `${SOURCE_CATALOG_ID}:${parameter.parameter_id}`,
      }),
      resourceId: (resource) => uuid(`${CONTRACT}:${head}:resource:${resource.row_id}`),
      resourceSemanticOwner: (resource) => `${SOURCE_CATALOG_ID}:${resource.row_id}`,
      resourceSha256: (resource) => sha256({ contract: CONTRACT, head, resource }),
      baseline: {
        id: baselineId,
        key: `${CONTRACT}:${head.slice(0, 16)}`,
        sourceDefinitionVersionId: representative.id,
        validationScenarioRefs: [{ scenario: "CANONICAL_PUBLISHER_ROLLBACK_REPLAY", evidenceSha256 }],
        acceptanceEvidenceSha256: evidenceSha256,
        acceptedReleaseId: releaseId,
        supersedesBaselineId: representative.approved_template_baseline_id,
      },
      passport: {
        physicalResultRu: passport.physical_result_ru,
        excludedScopeRu: passport.excluded_scope_ru,
        decision: {
          ...passport.decision,
          status: "GREEN",
          allowed: true,
          waveContract: CONTRACT,
          quantityScope: "FULL",
          priceState: "PARTIAL_NEEDS_PRICE",
          activationAllowed: false,
          productionEligible: false,
        },
        payloadSha256: sha256({ definitionSha256, evidenceSha256 }),
        sourceHead: head,
        sourceTree: tree,
      },
      bindingApplicability: (binding) => ({
        ...binding.applicability,
        publisher_acceptance_replay: true,
      }),
      expectedNormativeBindingCount: 9,
    });

    const negatives = [];
    negatives.push(await expectedPreflightFailure(client, plan, (copy) => {
      copy.resources[0]!.row_type = "delivery";
    }, "RESOURCE_ROW_TYPE"));
    negatives.push(await expectedPreflightFailure(client, plan, (copy) => {
      copy.parameters[0]!.truth_metadata.guide.guide_kind = "UNSUPPORTED_GUIDE";
    }, "PARAMETER_TRUTH_METADATA_INVALID"));
    negatives.push(await expectedPreflightFailure(client, plan, (copy) => {
      copy.passport.capability_matrix = copy.passport.capability_matrix.slice(0, 3);
    }, "PASSPORT_CAPABILITY_MATRIX"));
    negatives.push(await expectedPreflightFailure(client, plan, (copy) => {
      copy.baseline.normative_source_ids = { unexpected: ["unknown-source"] };
    }, "NORMATIVE_SOURCE_CLOSURE"));
    negatives.push(await expectedPreflightFailure(client, plan, (copy) => {
      const parameterId = String(Object.keys(copy.baseline.input_values)[0]);
      copy.baseline.input_classification[parameterId] = "PROJECT_OR_SUPPLIER";
    }, "BASELINE_PAYLOAD_R54"));
    const preflight = await preflightCanonicalDefinitionPublishPlans(client, [plan]);

    const attempts: CanonicalPublisherJson[] = [];
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await client.query("begin");
      try {
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='120s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
            metadata||$6::jsonb,$7,$8,parameter_count,formula_count
          from public.estimate_definition_release where id=$7`, [
          releaseId,
          `${CONTRACT}-${head.slice(0, 12)}`,
          head,
          tree,
          sha256({ contract: CONTRACT, head, attempt }),
          JSON.stringify({
            contract: CONTRACT,
            lifecycle: "ROLLBACK_ACCEPTANCE_ONLY",
            activationAllowed: false,
            productionEligible: false,
          }),
          SOURCE_RELEASE_ID,
          sha256({ contract: CONTRACT, head }),
        ]);
        const persisted = await publishCanonicalDefinitionDraft(client, plan);
        const insideTransaction = (await client.query(`select
            (select count(*)::int from public.estimate_definition_release where id=$1) releases,
            (select count(*)::int from public.estimate_definition_version where id=$2) definitions,
            (select count(*)::int from public.estimate_content_passport_r3 where definition_version_id=$2) passports,
            (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=$2) bindings`, [
          releaseId,
          definitionId,
        ])).rows[0] as CanonicalPublisherJson;
        invariant(Number(insideTransaction.releases) === 1
          && Number(insideTransaction.definitions) === 1
          && Number(insideTransaction.passports) === 1
          && Number(insideTransaction.bindings) === 9,
        `STOP_CANONICAL_PUBLISHER_ACCEPTANCE_TRANSACTION_SHAPE:${JSON.stringify(insideTransaction)}`);
        attempts.push({ attempt, persisted, insideTransaction });
      } finally {
        await client.query("rollback");
      }
      const residue = (await client.query(`select
          (select count(*)::int from public.estimate_definition_release where id=$1) releases,
          (select count(*)::int from public.estimate_definition_version where id=$2) definitions,
          (select count(*)::int from public.estimate_approved_template_baseline where id=$3) baselines`, [
        releaseId,
        definitionId,
        baselineId,
      ])).rows[0] as CanonicalPublisherJson;
      invariant(Number(residue.releases) === 0 && Number(residue.definitions) === 0
        && Number(residue.baselines) === 0,
      `STOP_CANONICAL_PUBLISHER_ACCEPTANCE_RESIDUE:${JSON.stringify(residue)}`);
      attempts.at(-1)!.residueAfterRollback = residue;
    }

    const body = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: "GREEN_CANONICAL_DEFINITION_PUBLISHER_PREFLIGHT_ROLLBACK_IDEMPOTENCY",
      source: { head, tree, releaseId: SOURCE_RELEASE_ID, catalogId: SOURCE_CATALOG_ID },
      preflight,
      negativePreflight: negatives,
      rollbackReplay: attempts,
      persistentMutationPerformed: false,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
    };
    const receipt = { ...body, receiptSha256: sha256(body) };
    atomicJson(OUTPUT_PATH, receipt);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      output: OUTPUT_PATH,
      schema: preflight.schema,
      negativeCount: negatives.length,
      rollbackAttempts: attempts.length,
      receiptSha256: receipt.receiptSha256,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
