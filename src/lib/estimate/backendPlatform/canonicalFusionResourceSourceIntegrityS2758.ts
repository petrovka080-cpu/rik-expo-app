import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { canonicalDefinitionPublicationStableValueR1 } from './canonicalDefinitionPublicationStableValueR1';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';

type Row = Readonly<Record<string, unknown>>;
export const FUSION_SOURCE_CATALOG_S2758 = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const CONTRACT = 'rik-expo-app.s27-58.fusion-bench-prepared-concrete.v1';
const PREFIX = 'fusion-bench-prepared-concrete:';
const IDS = ['bench-consumed', 'bench-order', 'fixing-included', 'fixing-consumed-separate', 'fixing-order',
  'position-mark-reposition', 'drill-clear-seat-tighten', 'drill-and-bit', 'setting-and-tightening-tools',
  'hole-cleaning', 'site-protection-ppe', 'delivery-unload-handling', 'final-inspection-cleanup'].map(id => PREFIX + id);
const BODY_KEYS = ['id', 'row_id', 'ordinal', 'section', 'category', 'title_ru', 'unit_id', 'formula_id',
  'inclusion_ast', 'resource_graph', 'cost_owner_id', 'procurement_eligible', 'source_metadata'];
const SQL_KEYS = [...BODY_KEYS, 'definition_version_id', 'row_type', 'semantic_owner', 'row_sha256', 'created_at'];
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (row: Row, keys: readonly string[]) => Object.keys(row).length === keys.length
  && keys.every(key => Object.hasOwn(row, key));
const publishedSha = (value: unknown) => canonicalEstimateSha256HexText(JSON.stringify(canonicalDefinitionPublicationStableValueR1(value)));
const logicalId = (id: string) => 'resource-' + id.replaceAll(':', '-');
// Exact historical MASTER mapping; it deliberately differs from PDF categories.
const rowType = (category: unknown) => category === 'material' ? 'material' : category === 'equipment' ? 'equipment'
  : category === 'service' ? 'service' : category === 'construction_work' ? 'labor' : 'other';
function publicationUuid(seed: string): string {
  const hex = canonicalEstimateSha256HexText(seed).slice(0, 32).split('');
  hex[12] = '5'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}
export type CanonicalFusionPublishedSourceOriginS2758 = Readonly<{
  contract: string;
  catalogId: string;
  definitionId: string;
  sourceFingerprint: string;
}>;

/** Validates only this exact Fusion factory origin. It does not admit a
 * definition, establish compatibility, or authorize a migration. Published
 * verification runs on the server against independently loaded definition
 * provenance; clients cannot supply a source-verified flag. */
export function canonicalFusionResourceSourceBodyS2758(input: {
  resource: unknown;
  representation: 'FACTORY_ARTIFACT' | 'PUBLISHED_MASTER_SQL';
  publishedOrigin?: CanonicalFusionPublishedSourceOriginS2758;
}): Record<string, unknown> | null {
  if (!isRow(input.resource)) return null;
  const row = input.resource, id = row.row_id;
  if (typeof id !== 'string' || !IDS.includes(id) || row.ordinal !== IDS.indexOf(id)
    || row.formula_id !== PREFIX + 'formula:' + id.slice(PREFIX.length)
    || !isRow(row.resource_graph) || !isRow(row.source_metadata)) return null;
  let body: Record<string, unknown>;
  if (input.representation === 'FACTORY_ARTIFACT') {
    if (!exactKeys(row, [...BODY_KEYS, 'row_sha256']) || row.id !== logicalId(id)) return null;
    body = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'row_sha256'));
    if (row.row_sha256 !== estimateDeterministicHash(body)) return null;
  } else if (input.representation === 'PUBLISHED_MASTER_SQL') {
    const origin = input.publishedOrigin;
    if (!origin || origin.contract !== CONTRACT || origin.catalogId !== FUSION_SOURCE_CATALOG_S2758
      || !/^[a-f0-9]{64}$/u.test(origin.sourceFingerprint)
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(origin.definitionId)
      || !exactKeys(row, SQL_KEYS) || row.definition_version_id !== origin.definitionId
      || row.semantic_owner !== origin.catalogId + ':' + id || row.row_type !== rowType(row.category)
      || row.id !== publicationUuid(`${origin.contract}:${origin.sourceFingerprint}:${origin.catalogId}:resource:${id}`)
      || typeof row.row_sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(row.row_sha256)) return null;
    // This inverse is proven for the Fusion wrapper, which had no top-level
    // row_type/semantic_owner and no projected-away factory fields.
    body = Object.fromEntries(BODY_KEYS.map(key => [key, key === 'id' ? logicalId(id) : row[key]]));
    const normalizedFactory = { ...body, row_sha256: estimateDeterministicHash(body), row_type: row.row_type };
    if (row.row_sha256 !== publishedSha({ contract: origin.contract, targetCatalogId: origin.catalogId,
      resource: normalizedFactory })) return null;
  } else return null;
  return body;
}
