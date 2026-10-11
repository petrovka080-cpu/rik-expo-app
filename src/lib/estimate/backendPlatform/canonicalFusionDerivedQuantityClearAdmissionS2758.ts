import { canonicalEstimateStableJson as stable } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { isCanonicalEstimateRevisionContractVersion } from './canonicalEstimateRevisionWriter';
import { canonicalDerivedQuantityClearEvidenceV1, type CanonicalDerivedQuantitySourceBindingV1 } from './canonicalDerivedQuantityClearEvidenceV1';
import { canonicalFusionUnroutedClearPriceEvidenceS2758 } from './canonicalFusionUnroutedClearPriceEvidenceS2758';

type Row = Readonly<Record<string, any>>;
const CATALOG = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const PHYSICAL_IDS = ['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const SHA = /^[a-f0-9]{64}$/u;
export type CanonicalFusionDerivedQuantityClearConsentS2758 = Readonly<{
  contractVersion: 'canonical-fusion-derived-quantity-clear/v1';
  acknowledged: true;
  parentChecksumSha256: string;
  clearedRowIds: readonly string[];
}>;

/** A RR worker may observe an older max(revision_number) before the existing
 * SQL writer's advisory lock. Retry only that known allocation conflict in a
 * fresh transaction; other uniqueness violations retain their normal failure. */
export function canonicalFusionQuantityClearRevisionNumberConflictS2758(error: unknown): boolean {
  return isRow(error) && error.code === '23505'
    && error.constraint === 'estimate_revision_owner_user_id_catalog_id_revision_number_key';
}

export function canonicalFusionDerivedQuantityClearConsentS2758(value: unknown): CanonicalFusionDerivedQuantityClearConsentS2758 | null {
  if (!isRow(value) || Object.keys(value).some(key => !['contractVersion', 'acknowledged', 'parentChecksumSha256', 'clearedRowIds'].includes(key))
    || value.contractVersion !== 'canonical-fusion-derived-quantity-clear/v1' || value.acknowledged !== true
    || typeof value.parentChecksumSha256 !== 'string' || !SHA.test(value.parentChecksumSha256)
    || !Array.isArray(value.clearedRowIds) || value.clearedRowIds.length < 1 || value.clearedRowIds.length > 3
    || new Set(value.clearedRowIds).size !== value.clearedRowIds.length
    || value.clearedRowIds.some((id: unknown) => typeof id !== 'string' || !PHYSICAL_IDS.includes(id))) return null;
  return { contractVersion: value.contractVersion, acknowledged: true,
    parentChecksumSha256: value.parentChecksumSha256, clearedRowIds: [...value.clearedRowIds] };
}

/** Necessary bounded command admission AFTER both source packets and their
 * publication chains have been read and verified in one server transaction.
 * Intake accepts only staged nulls; the worker accepts only the exact persisted
 * merge. Neither phase allows a simultaneous parameter, price or identity edit.
 * The existing SQL writer still owns descendant/replay/concurrency rights. */
export function canonicalFusionDerivedQuantityClearAdmissionS2758(input: {
  phase: 'INTAKE' | 'WORKER';
  parent: unknown;
  request: unknown;
  ownerUserId: string;
  organizationId: string | null;
  targetReleaseId: string;
  sourceBindings: Readonly<{ from: CanonicalDerivedQuantitySourceBindingV1; to: CanonicalDerivedQuantitySourceBindingV1 }> | null;
  parentRouteBindings: unknown;
  targetRouteBindings: unknown;
}): Readonly<{ consent: CanonicalFusionDerivedQuantityClearConsentS2758; rowOverrides: Record<string, unknown>;
  customRows: readonly []; parameters: Record<string, unknown>; priceSnapshotIds: string[]; sourceSemanticSha256: string }> | null {
  try {
    const { parent: p, request: r, sourceBindings: source } = input;
    if (!isRow(p) || !isRow(r) || !source || !['INTAKE', 'WORKER'].includes(input.phase)) return null;
    const consent = canonicalFusionDerivedQuantityClearConsentS2758(r.derivedQuantityClearV1);
    const migration = r.releaseMigration;
    if (!consent || !isRow(migration) || Object.keys(migration).some(key => !['contractVersion', 'acknowledged', 'fromReleaseId', 'toReleaseId'].includes(key))
      || migration.contractVersion !== 'canonical_revision_release_migration.r2' || migration.acknowledged !== true
      || migration.fromReleaseId !== p.release_id || migration.toReleaseId !== input.targetReleaseId
      || p.release_id === input.targetReleaseId || !UUID.test(String(p.release_id)) || !UUID.test(input.targetReleaseId)
      || !UUID.test(String(p.id)) || r.parentRevisionId !== p.id || r.catalogId !== CATALOG || p.catalog_id !== CATALOG
      || p.owner_user_id !== input.ownerUserId || (p.organization_id ?? null) !== input.organizationId
      || p.status !== 'ready' || !isCanonicalEstimateRevisionContractVersion(p.revision_contract_version)
      || p.checksum_sha256 !== consent.parentChecksumSha256 || !SHA.test(String(p.checksum_sha256))
      || p.currency_code !== r.currencyCode || !/^[A-Z]{3}$/u.test(String(p.currency_code))
      || !isRow(p.amendment_contract) || !isRow(p.amendment_contract.parameterSources)
      || !isRow(p.amendment_contract.parameterSources.userParameters) || !isRow(r.parameters)
      || stable(r.parameters) !== stable(p.amendment_contract.parameterSources.userParameters)
      || typeof p.source_request_text !== 'string' || !p.source_request_text.trim()
      || p.source_request_hash !== canonicalEstimateSha256HexText(p.source_request_text)
      || typeof p.primary_measure_parameter_id !== 'string' || !p.primary_measure_parameter_id
      || (r.sourceRequestText !== undefined && r.sourceRequestText !== p.source_request_text)
      || (r.primaryMeasureParameterId !== undefined && r.primaryMeasureParameterId !== p.primary_measure_parameter_id)
      || (r.requestIdentity !== undefined && (!isRow(r.requestIdentity)
        || Object.keys(r.requestIdentity).some(key => !['sourceRequestText', 'primaryMeasureParameterId'].includes(key))
        || r.requestIdentity.sourceRequestText !== p.source_request_text
        || r.requestIdentity.primaryMeasureParameterId !== p.primary_measure_parameter_id))
      || (r.customRows !== undefined && (!Array.isArray(r.customRows) || r.customRows.length))) return null;
    const staged = Object.fromEntries(consent.clearedRowIds.map(id => [id, { quantity: null }]));
    const evidence = canonicalDerivedQuantityClearEvidenceV1({ from: source.from, to: source.to,
      parentOverrides: p.amendment_contract.rowOverrides, parentCustomRows: p.amendment_contract.customRows,
      stagedOverrides: input.phase === 'INTAKE' ? r.rowOverrides : staged });
    if (!evidence || stable([...consent.clearedRowIds].sort()) !== stable(evidence.clearedRowIds)
      || (input.phase === 'WORKER' && stable(r.rowOverrides) !== stable(evidence.mergedOverrides))) return null;
    const prices = canonicalFusionUnroutedClearPriceEvidenceS2758({ clearEvidence: evidence,
      parentRouteBindings: input.parentRouteBindings, targetRouteBindings: input.targetRouteBindings,
      parentSelection: p.price_snapshot_ids, request: r, phase: input.phase });
    if (!prices) return null;
    return { consent, rowOverrides: evidence.mergedOverrides, customRows: [],
      parameters: JSON.parse(stable(p.amendment_contract.parameterSources.userParameters)),
      priceSnapshotIds: [...prices.priceSnapshotIds], sourceSemanticSha256: evidence.sourceSemanticSha256 };
  } catch { return null; }
}
