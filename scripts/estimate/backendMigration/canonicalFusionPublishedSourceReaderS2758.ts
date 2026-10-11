import type { PoolClient } from 'pg';
import type { CanonicalFusionPublishedSourcePacketS2758 as Packet } from '../../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourcePacketS2758';
import { canonicalFusionPublishedManifestChainMatchesS2758,
  type CanonicalFusionPublishedManifestNodeS2758 as Node } from '../../../src/lib/estimate/backendPlatform/canonicalFusionPublishedManifestChainS2758';

const CATALOG = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const failure = () => Object.assign(new Error('Опубликованный источник Fusion не прошёл проверку целостности.'),
  { code: 'FUSION_PUBLICATION_SOURCE_REVIEW_REQUIRED' });
function one<T>(rows: readonly T[]): T { if (rows.length !== 1) throw failure(); return rows[0]; }
export type CanonicalFusionSourceTransactionIdentityS2758 = Readonly<{ transaction_id: string; backend_id: number }>;
export async function assertCanonicalFusionSourceTransactionS2758(client: Pick<PoolClient, 'query'>,
  expected?: CanonicalFusionSourceTransactionIdentityS2758): Promise<CanonicalFusionSourceTransactionIdentityS2758> {
  const actual = one((await client.query(`select current_setting('transaction_isolation') isolation,
    pg_current_xact_id()::text transaction_id,pg_backend_pid() backend_id`)).rows);
  if (!['repeatable read', 'serializable'].includes(actual.isolation) || !/^\d+$/u.test(actual.transaction_id)
    || !Number.isSafeInteger(actual.backend_id) || (expected && (actual.transaction_id !== expected.transaction_id
      || actual.backend_id !== expected.backend_id))) throw failure();
  return { transaction_id: actual.transaction_id, backend_id: actual.backend_id };
}

/** Server-only reader inside the caller-owned explicit repeatable-read (or
 * serializable) transaction. The SAME transaction must cover parent/target
 * reads and the command/worker write. No independently supplied packet or
 * aggregate replaces these DB queries. This reader never grants command rights. */
export async function readCanonicalFusionPublishedSourceS2758(client: Pick<PoolClient, 'query'>,
  pinnedReleaseId: string, expectedTransaction?: CanonicalFusionSourceTransactionIdentityS2758): Promise<{
    packet: Packet; originalSourceRelease: Record<string, any>; transactionIdentity: CanonicalFusionSourceTransactionIdentityS2758; manifestNodes: readonly Node[] }> {
  if (!UUID.test(pinnedReleaseId)) throw failure();
  const isolation = await assertCanonicalFusionSourceTransactionS2758(client, expectedTransaction);
  // An isolation setting alone also occurs in autocommit. Every actual read
  // carries the transaction/backend identity in the SAME SQL statement, so
  // separate snapshots or a structurally supplied Pool.query cannot pass.
  async function read(sql: string, values: unknown[] = []) {
    const receipt = one((await client.query(`select pg_current_xact_id()::text transaction_id,
      pg_backend_pid() backend_id,coalesce((select jsonb_agg(to_jsonb(source)) from (${sql}) source),'[]'::jsonb) records`, values)).rows);
    if (receipt.transaction_id !== isolation.transaction_id || receipt.backend_id !== isolation.backend_id
      || !Array.isArray(receipt.records)) throw failure();
    return { rows: receipt.records as Record<string, any>[] };
  }
  const manifest = one((await read(
    'select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2',
    [pinnedReleaseId, CATALOG])).rows);
  const id = manifest.definition_version_id;
  const queries: [string, unknown[]][] = [
    ['select * from public.estimate_definition_version where id=$1 and catalog_id=$2', [id, CATALOG]],
    ['select * from public.estimate_approved_template_baseline where id=$1', [manifest.approved_template_baseline_id]],
    ['select * from public.estimate_content_passport_r3 where definition_version_id=$1', [id]],
    ['select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal', [id]],
    ['select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id', [id]],
    ['select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal', [id]],
    ['select * from public.estimate_work_normative_binding where definition_version_id=$1 order by resource_spec_id,locator_id', [id]],
    [`select binding.* from public.estimate_resource_price_route_binding binding
      join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
      where resource.definition_version_id=$1 order by resource.ordinal,binding.priority,binding.route_id`, [id]],
  ];
  // One PG connection and transaction: sequential queries retain one snapshot
  // without pg's deprecated concurrent client.query queue.
  const records = [];
  for (const [sql, values] of queries) records.push(await read(sql, values));
  const [definition, baseline, passport] = records.slice(0, 3).map(result => one(result.rows));
  const bindings = records[6].rows;
  if (bindings.length !== 1 || records[3].rows.length !== 25 || records[4].rows.length !== 13
    || records[5].rows.length !== 13 || records[7].rows.length !== 0) throw failure();
  const locators = (await read('select * from public.estimate_normative_locator where id=$1', [bindings[0].locator_id])).rows;
  const locator = one(locators);
  const sources = (await read('select * from public.estimate_normative_source where id=$1', [locator.source_id])).rows;
  one(sources);
  const packet: Packet = { expectedReleaseId: pinnedReleaseId, manifest, definition, baseline, passport,
    parameters: records[3].rows, formulas: records[4].rows, resources: records[5].rows, bindings,
    priceBindings: records[7].rows, locators, sources };
  const nodes: Node[] = [], seen = new Set<string>();
  let releaseId = pinnedReleaseId, originalSourceRelease: Record<string, any> | null = null;
  for (let i = 0; i < 32; i++) {
    if (!UUID.test(releaseId) || seen.has(releaseId)) throw failure();
    seen.add(releaseId);
    const release = one((await read(`select id,schema_version,status,activated_at,sealed_at,parent_release_id,
      source_commit,source_tree,source_manifest_sha256,source_package_sha256,definition_count,metadata
      from public.estimate_definition_release where id=$1`, [releaseId])).rows);
    const entry = i === 0 ? manifest : one((await read(
      'select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2',
      [releaseId, CATALOG])).rows);
    const aggregate = one((await read(`select count(*)::integer entry_count,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') manifest_sha256
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows);
    nodes.push({ release, manifest: entry, aggregate: { entry_count: aggregate.entry_count, manifest_sha256: aggregate.manifest_sha256 } });
    if (release.id === definition.release_id) { originalSourceRelease = release; break; }
    releaseId = release.parent_release_id;
  }
  if (!originalSourceRelease || !canonicalFusionPublishedManifestChainMatchesS2758({ packet, originalSourceRelease, nodes })) throw failure();
  return { packet, originalSourceRelease, transactionIdentity: isolation, manifestNodes: nodes };
}
