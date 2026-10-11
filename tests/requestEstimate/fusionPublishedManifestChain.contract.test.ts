import saved from './fixtures/fusionPublishedManifestChainS2758.json';
import originalRelease from './fixtures/fusionPublishedSourceReleaseS2758.json';
import { parent } from './fixtures/fusionPolicySuccessorFixtureS2758';
import { canonicalFusionPublishedManifestChainMatchesS2758 as chain } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedManifestChainS2758';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const input = () => ({ packet: parent(), originalSourceRelease: clone(originalRelease), nodes: clone(saved.chain) });

test('checks all seven actual inherited entries, source-root hash and same-snapshot aggregates', () => {
  expect(chain(input())).toBe(true);
  expect(input().nodes).toHaveLength(7);
});

test.each(['parent', 'entry', 'aggregate', 'count', 'manifestRelease', 'definition', 'baseline', 'sourceRelease',
  'contract', 'schema', 'status', 'seal', 'active', 'master'] as const)('rejects changed middle-node %s', field => {
  const request = input(), node = request.nodes[3];
  if (field === 'parent') node.release.parent_release_id = request.nodes[5].release.id;
  if (field === 'entry') node.manifest.entry_sha256 = 'f'.repeat(64);
  if (field === 'aggregate') node.aggregate.manifest_sha256 = 'f'.repeat(64);
  if (field === 'count') node.aggregate.entry_count++;
  if (field === 'manifestRelease') node.manifest.release_id = request.nodes[0].release.id;
  if (field === 'definition') node.manifest.definition_version_id = request.nodes[0].release.id;
  if (field === 'baseline') node.manifest.approved_template_baseline_id = request.nodes[0].release.id;
  if (field === 'sourceRelease') node.manifest.source_release_id = request.nodes[0].release.id;
  if (field === 'contract') node.release.metadata.contract += ':changed';
  if (field === 'schema') node.release.schema_version++;
  if (field === 'status') node.release.status = 'draft';
  if (field === 'seal') node.release.sealed_at = 'invalid';
  if (field === 'active') node.release.activated_at = node.release.sealed_at as any;
  if (field === 'master') node.release.metadata.masterSha256 = 'invalid';
  expect(chain(request)).toBe(false);
});

test('rejects fabricated packet pin/entry hashes even when their syntax is valid', () => {
  const request = input();
  request.packet = { ...request.packet, expectedReleaseId: '00000000-0000-4000-8000-000000000001' };
  request.packet.manifest.release_id = request.packet.expectedReleaseId;
  request.packet.manifest.entry_sha256 = 'a'.repeat(64);
  expect(chain(request)).toBe(false);
});

test('requires the packet manifest to belong to its explicit pinned release', () => {
  const request = input();
  request.packet.manifest.release_id = '00000000-0000-4000-8000-000000000001';
  expect(chain(request)).toBe(false);
});

test('rejects truncated, reordered, repeated, empty and overlong chains', () => {
  const request = input();
  expect(chain({ ...request, nodes: request.nodes.slice(0, -1) })).toBe(false);
  expect(chain({ ...request, nodes: [...request.nodes].reverse() })).toBe(false);
  expect(chain({ ...request, nodes: [request.nodes[0], ...request.nodes] })).toBe(false);
  expect(chain({ ...request, nodes: [] })).toBe(false);
  expect(chain({ ...request, nodes: Array.from({ length: 33 }, () => request.nodes[0]) })).toBe(false);
});

test('checks the root entry against producer identity and original commit/tree/package', () => {
  for (const field of ['source_commit', 'source_tree', 'source_package_sha256', 'parent_release_id'] as const) {
    const request = input();
    request.originalSourceRelease[field] = 'f'.repeat(64);
    expect(chain(request)).toBe(false);
  }
  const request = input();
  request.nodes.at(-1)!.manifest.entry_sha256 = 'f'.repeat(64);
  expect(chain(request)).toBe(false);
});

test('supports PostgreSQL Date seals without changing any input records', () => {
  const request = input();
  for (const node of request.nodes) node.release.sealed_at = new Date(node.release.sealed_at) as any;
  const before = JSON.stringify(request);
  expect(chain(request)).toBe(true);
  expect(JSON.stringify(request)).toBe(before);
});
