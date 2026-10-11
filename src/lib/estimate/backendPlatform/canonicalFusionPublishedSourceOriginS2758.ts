import { fusionPublishedLegacyOriginEnvelopeS2758 } from './sourceOrigins/fusionPublishedLegacyOriginEnvelopeS2758';
import { buildCanonicalMasterSingleDefinitionSourceOriginR1,
  canonicalMasterSingleDefinitionSourceOriginMatchesR1 } from './canonicalMasterSingleDefinitionSourceOriginR1';
import { canonicalFusionPublishedSourceProjectionS2758,
  type CanonicalFusionPublishedSourcePacketS2758 as Packet } from './canonicalFusionPublishedSourcePacketS2758';
import { type CanonicalDerivedQuantitySourceBindingV1 } from './canonicalDerivedQuantityClearEvidenceV1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';

type Row = Readonly<Record<string, any>>;
const CATALOG = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const CONTRACT = 'rik-expo-app.s27-58.fusion-bench-prepared-concrete.v1';
const LEGACY_RELEASE = '86d50858-8860-5819-98fc-c0ceb56b9684';
const LEGACY_DEFINITION = '944adedd-6edd-5eea-a07e-2a9d99dfac12';
const LEGACY_BASELINE = '235aa96e-6d15-53bd-b30e-1733dc6a6a49';
const LEGACY_FINGERPRINT = '0d25fd59266acf957800a345caab425c4c737c403e7c445bbad8d4efc532041e';
// Independently admitted complete SQL meaning, including all baseline,
// passport and normative records. Only the three reviewed policies are omitted.
const SOURCE_SEMANTIC_SHA = '556312c516b7542c0bb6336b9a4a38ea69ac3b81e394d2ad6b3fa0e150720b3d';
const SHA = /^[a-f0-9]{64}$/u;
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
// Detached at module initialization; caller mutation cannot change the capsule.
const legacyOrigin = freeze(buildCanonicalMasterSingleDefinitionSourceOriginR1({
  catalogId: CATALOG, envelope: fusionPublishedLegacyOriginEnvelopeS2758,
}));

// This first adoption changes only three quantity policies. The complete SQL
// meaning and the producer meaning are independently anchored to the admitted
// historical source. A correctly rehashed declaration cannot change a source,
// passport, fixture result, locator, runtime input or search meaning. Code/source
// inventory and parent IDs change during publication and have separate gates.
const PRODUCER_MEANING_KEYS = ['contract', 'masterSha256', 'sourceId', 'normId', 'sourceMetadata',
  'passport', 'applicability', 'binding', 'locators', 'projectSourcePackage', 'projectSourcePackageSet',
  'runtimeProfileInput', 'runtimeProfileClassification', 'runtimeProfileSourceIds', 'search',
  'validationScenario', 'coreAcceptance'] as const;
function producerMeaningMatchesLegacy(envelope: Row): boolean {
  return legacyOrigin !== null && !Object.hasOwn(envelope, 'catalogAppend')
    && PRODUCER_MEANING_KEYS.every(key => Object.hasOwn(envelope, key)
      && canonicalEstimateStableJson(envelope[key]) === canonicalEstimateStableJson(legacyOrigin.envelope[key]));
}

function sourceReleaseMatches(packet: Packet, release: unknown): release is Row {
  return isRow(release) && release.id === packet.definition.release_id && release.status === 'prepared'
    && release.schema_version === 6 && release.activated_at === null
    && (typeof release.sealed_at === 'string' || release.sealed_at instanceof Date)
    && Number.isFinite(new Date(release.sealed_at).getTime())
    && isRow(release.metadata) && release.metadata.contract === CONTRACT
    && release.metadata.masterSha256 === packet.definition.source_metadata.masterSha256
    && packet.passport.source_head === release.source_commit && packet.passport.source_tree === release.source_tree;
}

/** Exact, server-owned historical source declaration. Independently loaded SQL
 * records are mandatory; no client path, permission flag or generic inherited
 * metadata fingerprint can select this capsule. It is never a definition used
 * to calculate estimates or populate user inputs. */
export function canonicalFusionPublishedLegacyOriginSourceBindingS2758(input: {
  packet: Packet;
  originalSourceRelease: unknown;
}): CanonicalDerivedQuantitySourceBindingV1 | null {
  try {
    const p = input.packet, r = input.originalSourceRelease;
    if (!legacyOrigin || !sourceReleaseMatches(p, r) || r.id !== LEGACY_RELEASE
      || p.definition.id !== LEGACY_DEFINITION || p.baseline.id !== LEGACY_BASELINE
      || p.definition.catalog_id !== CATALOG || p.definition.definition_version !== 1
      || p.definition.source_metadata.sourceFingerprint !== LEGACY_FINGERPRINT
      || Object.hasOwn(r.metadata, 'masterSingleDefinitionSourceOriginV1')
      || r.parent_release_id !== legacyOrigin.envelope.parentReleaseId) return null;
    const projection = canonicalFusionPublishedSourceProjectionS2758(p);
    if (!projection || projection.binding.mode !== 'LEGACY'
      || projection.binding.sourceSemanticSha256 !== SOURCE_SEMANTIC_SHA) return null;
    return canonicalMasterSingleDefinitionSourceOriginMatchesR1({ origin: legacyOrigin, catalogId: CATALOG,
      fingerprint: LEGACY_FINGERPRINT, sourceCommit: r.source_commit, sourceTree: r.source_tree,
      masterSha256: r.metadata.masterSha256, sourcePackageSha256: r.source_package_sha256,
      parameterSchemaSha256: projection.parameterSchemaSha256,
      definitionSchemaSha256: projection.definitionSchemaSha256 }) ? projection.binding : null;
  } catch { return null; }
}

/** Necessary server source-origin join for the first policy-only successor.
 * Manifest ancestry/aggregate in a consistent DB snapshot, owner/org rights,
 * pinned revisions, checksum, consent, user inputs, amendments and exact price
 * selection must still be checked at intake and again at the worker. */
export function canonicalFusionPublishedPolicyAdoptionOriginBindingsS2758(input: {
  from: Packet;
  fromOriginalSourceRelease: unknown;
  to: Packet;
  toOriginalSourceRelease: unknown;
}): Readonly<{ from: CanonicalDerivedQuantitySourceBindingV1; to: CanonicalDerivedQuantitySourceBindingV1 }> | null {
  try {
    const from = canonicalFusionPublishedLegacyOriginSourceBindingS2758({ packet: input.from,
      originalSourceRelease: input.fromOriginalSourceRelease });
    const p = input.to, r = input.toOriginalSourceRelease;
    if (!from || !sourceReleaseMatches(p, r) || p.expectedReleaseId !== r.id
      || r.parent_release_id !== input.from.expectedReleaseId
      || !Object.hasOwn(r.metadata, 'masterSingleDefinitionSourceOriginV1')) return null;
    const origin = r.metadata.masterSingleDefinitionSourceOriginV1;
    if (!isRow(origin) || !isRow(origin.envelope) || origin.envelope.contract !== CONTRACT
      || origin.envelope.parentReleaseId !== r.parent_release_id
      || !producerMeaningMatchesLegacy(origin.envelope)
      || typeof p.definition.source_metadata.sourceFingerprint !== 'string'
      || !SHA.test(p.definition.source_metadata.sourceFingerprint)) return null;
    const projection = canonicalFusionPublishedSourceProjectionS2758(p, input.from);
    if (!projection || projection.binding.mode !== 'PARAMETERS_ONLY'
      || projection.binding.sourceSemanticSha256 !== from.sourceSemanticSha256) return null;
    if (!canonicalMasterSingleDefinitionSourceOriginMatchesR1({ origin, catalogId: CATALOG,
      fingerprint: p.definition.source_metadata.sourceFingerprint, sourceCommit: r.source_commit, sourceTree: r.source_tree,
      masterSha256: r.metadata.masterSha256, sourcePackageSha256: r.source_package_sha256,
      parameterSchemaSha256: projection.parameterSchemaSha256,
      definitionSchemaSha256: projection.definitionSchemaSha256 })) return null;
    return { from, to: projection.binding };
  } catch { return null; }
}
