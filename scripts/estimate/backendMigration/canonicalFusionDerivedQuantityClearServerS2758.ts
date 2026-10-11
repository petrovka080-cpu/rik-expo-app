import type { PoolClient } from 'pg';
import { canonicalFusionDerivedQuantityClearAdmissionS2758 as admit } from '../../../src/lib/estimate/backendPlatform/canonicalFusionDerivedQuantityClearAdmissionS2758';
import { canonicalFusionPublishedPolicyAdoptionOriginBindingsS2758 as origins } from '../../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758';
import { assertCanonicalFusionSourceTransactionS2758 as transaction,
  readCanonicalFusionPublishedSourceS2758 as readSource } from './canonicalFusionPublishedSourceReaderS2758';
import { evaluateFormulaGraph, type FormulaAst } from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import type { CanonicalFusionQuantityClearPreviewS2758 } from '../../../src/lib/estimate/backendPlatform/contracts';

const failure = () => Object.assign(new Error('Переход Fusion остановлен: источник, сброс или сохранённые данные не прошли проверку. Исходная смета сохранена.'),
  { code: 'FUSION_QUANTITY_CLEAR_REVIEW_REQUIRED', httpStatus: 409 });

/** Existing command transaction only. All claims below come from DB reads;
 * HTTP cannot supply a source packet, semantic hash or migration permission. */
export async function admitCanonicalFusionDerivedQuantityClearServerS2758(client: PoolClient, input: {
  phase: 'INTAKE' | 'WORKER'; request: Record<string, any>;
  ownerUserId: string; organizationId: string | null; targetReleaseId: string;
}) {
  const identity = await transaction(client);
  const parents = (await client.query(`select id,owner_user_id,organization_id,release_id,catalog_id,
    definition_version_id,status,revision_contract_version,checksum_sha256,currency_code,price_snapshot_ids,
    input_parameters,amendment_contract,source_request_text,source_request_hash,primary_measure_parameter_id
    from public.estimate_revision where id=$1 and owner_user_id=$2 and organization_id is not distinct from $3::uuid`,
    [input.request.parentRevisionId, input.ownerUserId, input.organizationId])).rows;
  if (parents.length !== 1) throw failure();
  const parent = parents[0];
  const from = await readSource(client, parent.release_id, identity);
  const to = await readSource(client, input.targetReleaseId, identity);
  if (parent.definition_version_id !== from.packet.definition.id) throw failure();
  const sourceBindings = origins({ from: from.packet, fromOriginalSourceRelease: from.originalSourceRelease,
    to: to.packet, toOriginalSourceRelease: to.originalSourceRelease });
  const admission = admit({ ...input, parent, sourceBindings,
    parentRouteBindings: from.packet.priceBindings, targetRouteBindings: to.packet.priceBindings });
  if (!admission) throw failure();
  await transaction(client, identity);
  return { admission, transactionIdentity: identity, parent, targetDefinitionId: to.packet.definition.id, targetPacket: to.packet };
}

/** Read-only preview; the generated acknowledgement never creates a command.
 * The subsequent user command supplies consent and is independently rechecked. */
export async function previewCanonicalFusionDerivedQuantityClearServerS2758(client: PoolClient, input: {
  parentRevisionId: string; ownerUserId: string; organizationId: string | null; targetReleaseId: string;
}): Promise<CanonicalFusionQuantityClearPreviewS2758 | null> {
  const parent = (await client.query(`select * from public.estimate_revision
    where id=$1 and owner_user_id=$2 and organization_id is not distinct from $3::uuid`,
    [input.parentRevisionId, input.ownerUserId, input.organizationId])).rows[0];
  if (!parent) throw failure();
  const overrides = parent.amendment_contract?.rowOverrides;
  const ids = ['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key)
    .filter(id => overrides?.[id]?.quantity != null);
  if (!ids.length) return null;
  const request = { parentRevisionId: parent.id, catalogId: parent.catalog_id, parameters: parent.amendment_contract?.parameterSources?.userParameters,
    currencyCode: parent.currency_code, releaseMigration: { contractVersion: 'canonical_revision_release_migration.r2', acknowledged: true,
      fromReleaseId: parent.release_id, toReleaseId: input.targetReleaseId },
    derivedQuantityClearV1: { contractVersion: 'canonical-fusion-derived-quantity-clear/v1', acknowledged: true,
      parentChecksumSha256: parent.checksum_sha256, clearedRowIds: ids }, rowOverrides: Object.fromEntries(ids.map(id => [id, { quantity: null }])) };
  const checked = await admitCanonicalFusionDerivedQuantityClearServerS2758(client, { ...input, phase: 'INTAKE', request });
  const savedRows = (await client.query('select row_id,title_ru,included_in_estimate from public.estimate_revision_row where revision_id=$1 and row_id=any($2::text[])', [parent.id, ids])).rows;
  const rows = ids.map(rowId => {
    const resource = checked.targetPacket.resources.find(row => row.row_id === rowId);
    const formula = checked.targetPacket.formulas.find(row => row.formula_id === resource?.formula_id);
    const saved = savedRows.find(row => row.row_id === rowId);
    if (!resource || !formula) throw failure();
    return { rowId, titleRu: String(saved?.title_ru ?? overrides[rowId].titleRu ?? resource.title_ru), unitId: String(resource.unit_id), oldQuantity: String(overrides[rowId].quantity),
      calculatedQuantity: evaluateFormulaGraph(formula.ast as FormulaAst, parent.input_parameters), excluded: saved?.included_in_estimate !== true };
  });
  await transaction(client, checked.transactionIdentity);
  return { contractVersion: 'canonical-fusion-quantity-clear-preview/v1', catalogId: parent.catalog_id,
    parentRevisionId: parent.id, parentChecksumSha256: parent.checksum_sha256,
    fromReleaseId: parent.release_id, toReleaseId: input.targetReleaseId, rows };
}
