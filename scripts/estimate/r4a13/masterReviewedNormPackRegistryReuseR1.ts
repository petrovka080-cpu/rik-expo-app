import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

type Json = Record<string, any>;
export type MasterReviewedNormPackProofR1 = Readonly<{artifactPath: string; artifactUtf8: string}>;
const object = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const same = (a: unknown, b: unknown) => canonicalEstimateStableJson(a) === canonicalEstimateStableJson(b);

/** Reproduce an already registered reviewed-pack publisher's provenance. This
 * proves neither a new physical norm nor a price; existing full-row normal,
 * locked and registered snapshots still have to match the captured registry. */
export function masterReviewedNormPackRegistryEvidenceR1(input: Readonly<{
  proof: MasterReviewedNormPackProofR1;
  source: Json;
  locators: readonly Json[];
}>): Readonly<{metadata: Json; excerptByLocatorKey: Readonly<Record<string, string>>}> {
  const requireThat = (v: unknown, code: string): void => {
    if (!v) throw Error('MASTER_REVIEWED_NORM_PACK_' + code);
  };
  const {proof, source, locators} = input;
  requireThat(object(proof) && same(Object.keys(proof).sort(), ['artifactPath', 'artifactUtf8'])
    && typeof proof.artifactUtf8 === 'string' && Buffer.byteLength(proof.artifactUtf8) <= 524288
    && typeof proof.artifactPath === 'string' && /^data\/estimate-norms\/[a-zA-Z0-9_./-]+\.json$/u.test(proof.artifactPath)
    && !proof.artifactPath.split('/').includes('..'), 'EXACT_ARTIFACT_PROOF_REQUIRED');
  requireThat(object(source) && source.artifact_sha256 === hash(proof.artifactUtf8), 'ARTIFACT_BYTES_CHANGED');
  const pack: unknown = JSON.parse(proof.artifactUtf8.replace(/^\uFEFF/u, ''));
  requireThat(object(pack) && pack.review_status === 'reviewed' && typeof pack.source_pack_version === 'string'
    && typeof pack.license_status === 'string' && object(pack.review_evidence)
    && pack.review_evidence.method === 'DIRECT_PRIMARY_SOURCE_REVIEW' && Array.isArray(pack.review_evidence.items)
    && Array.isArray(pack.norm_items), 'REVIEWED_PACK_REQUIRED');
  const p = pack as Json;
  const metadata = {artifactKind: 'REVIEWED_LOCAL_NORM_PACK_JSON', artifactPath: proof.artifactPath,
    remotePdfBytesHashed: false, sourcePackVersion: p.source_pack_version, reviewEvidence: p.review_evidence,
    licenseStatus: p.license_status, existingNormReused: true, newPhysicalNorms: 0, automaticReferenceRateAllowed: false};
  requireThat(same(source.metadata, metadata), 'ORIGINAL_METADATA_CHANGED');
  requireThat(Array.isArray(locators) && locators.length > 0 && locators.length <= 32
    && new Set(locators.map(l => l.locator_key)).size === locators.length, 'COMPLETE_LOCATOR_SET_REQUIRED');
  const excerptByLocatorKey: Record<string, string> = {};
  for (const row of locators) {
    requireThat(object(row) && object(row.locator), 'LOCATOR_OBJECT_REQUIRED');
    const l = row.locator, items = p.norm_items.filter((n: Json) => n.norm_id === l.normId);
    requireThat(items.length === 1, 'ONE_EXACT_NORM_ITEM_REQUIRED');
    const item = items[0], excerpt = hash(canonicalEstimateStableJson(item));
    requireThat(object(item.source) && object(item.applicability)
      && item.applicability.reference_rate_not_for_automatic_production_binding === true
      && item.unit === l.unitId && item.source.url === l.sourceUrl && item.source.url === source.official_url
      && item.source.page === l.exactLocator && l.sourceDocumentVersion === p.source_pack_version
      && l.reviewedNormItemSha256 === excerpt && row.excerpt_sha256 === excerpt
      && l.automaticReferenceRateAllowed === false
      && p.review_evidence.items.some((r: Json) => r.norm_id === item.norm_id && r.source_url === item.source.url),
    'EXACT_ITEM_SOURCE_OR_EXCERPT_CHANGED');
    excerptByLocatorKey[row.locator_key] = excerpt;
  }
  return {metadata, excerptByLocatorKey};
}
