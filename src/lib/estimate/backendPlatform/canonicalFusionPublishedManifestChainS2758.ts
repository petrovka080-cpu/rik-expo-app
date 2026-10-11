import { canonicalDefinitionPublicationStableValueR1 } from './canonicalDefinitionPublicationStableValueR1';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import type { CanonicalFusionPublishedSourcePacketS2758 as Packet } from './canonicalFusionPublishedSourcePacketS2758';

type Row = Readonly<Record<string, any>>;
export type CanonicalFusionPublishedManifestNodeS2758 = Readonly<{
  release: Row;
  manifest: Row;
  aggregate: Readonly<{ entry_count: number; manifest_sha256: string }>;
}>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const SHA = /^[a-f0-9]{64}$/u, COMMIT = /^[a-f0-9]{40}$/u;
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown) => canonicalEstimateSha256HexText(JSON.stringify(canonicalDefinitionPublicationStableValueR1(value)));
const meaning = (row: Row) => Object.fromEntries(Object.entries(row)
  .filter(([key]) => !['release_id', 'entry_sha256', 'created_at'].includes(key)));
const same = (a: unknown, b: unknown) => canonicalEstimateStableJson(a) === canonicalEstimateStableJson(b);

/** Necessary publication proof, never migration permission. The server loads
 * every release, exact catalog entry and SQL aggregate in ONE repeatable-read
 * transaction. HTTP input must never supply these records or aggregate claims.
 * Origin, inventory, revision/owner, consent and command gates remain required. */
export function canonicalFusionPublishedManifestChainMatchesS2758(input: {
  packet: Packet;
  originalSourceRelease: unknown;
  nodes: readonly CanonicalFusionPublishedManifestNodeS2758[];
}): boolean {
  try {
    const { packet: p, nodes } = input, original = input.originalSourceRelease;
    if (!isRow(original) || !Array.isArray(nodes) || !nodes.length || nodes.length > 32
      || nodes[0].release.id !== p.expectedReleaseId
      || p.manifest.release_id !== p.expectedReleaseId
      || nodes[nodes.length - 1].release.id !== p.definition.release_id
      || original.id !== p.definition.release_id) return false;
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const { release: r, manifest: m, aggregate: a } = nodes[i];
      if (!isRow(r) || !isRow(m) || !isRow(a) || typeof r.id !== 'string' || !UUID.test(r.id)
        || seen.has(r.id) || r.status !== 'prepared' || r.schema_version !== 6 || r.activated_at !== null
        || !(typeof r.sealed_at === 'string' || r.sealed_at instanceof Date)
        || !Number.isFinite(new Date(r.sealed_at).getTime())
        || !COMMIT.test(r.source_commit) || !COMMIT.test(r.source_tree)
        || !SHA.test(r.source_package_sha256) || !isRow(r.metadata)
        || typeof r.metadata.contract !== 'string' || !r.metadata.contract || !SHA.test(r.metadata.masterSha256)
        || !Number.isSafeInteger(r.definition_count) || r.definition_count < 1
        || a.entry_count !== r.definition_count || !SHA.test(a.manifest_sha256)
        || a.manifest_sha256 !== r.source_manifest_sha256
        || m.release_id !== r.id || !SHA.test(m.entry_sha256)
        || !same(meaning(m), meaning(p.manifest))) return false;
      seen.add(r.id);
      if (i === 0 && m.entry_sha256 !== p.manifest.entry_sha256) return false;
      let expected: string;
      if (i + 1 < nodes.length) {
        const next = nodes[i + 1];
        if (r.parent_release_id !== next.release.id) return false;
        expected = canonicalEstimateSha256HexText(`${r.metadata.contract}:${r.id}:${p.definition.catalog_id}:${next.manifest.entry_sha256}`);
      } else {
        if (r.id !== original.id || r.parent_release_id !== original.parent_release_id
          || r.source_commit !== original.source_commit || r.source_tree !== original.source_tree
          || r.source_package_sha256 !== original.source_package_sha256
          || r.metadata.contract !== original.metadata.contract || r.metadata.masterSha256 !== original.metadata.masterSha256
          || p.passport.source_head !== r.source_commit || p.passport.source_tree !== r.source_tree) return false;
        expected = hash({ contract: p.definition.source_metadata.contract, releaseId: r.id,
          catalogId: p.definition.catalog_id, definitionId: p.definition.id,
          baselineId: p.baseline.id, targetDefinitionSha256: p.definition.definition_sha256 });
      }
      if (m.entry_sha256 !== expected) return false;
    }
    return true;
  } catch { return false; }
}
