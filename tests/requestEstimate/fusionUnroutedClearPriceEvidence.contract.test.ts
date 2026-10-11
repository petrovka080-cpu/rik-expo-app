import { canonicalFusionUnroutedClearPriceEvidenceS2758 as prices } from '../../src/lib/estimate/backendPlatform/canonicalFusionUnroutedClearPriceEvidenceS2758';
import { buildCanonicalDerivedQuantitySourceBindingV1 as binding, canonicalDerivedQuantityClearEvidenceV1 as clear } from '../../src/lib/estimate/backendPlatform/canonicalDerivedQuantityClearEvidenceV1';
import { fusionBenchDefinitionS2758, fusionBenchPackS2758 as pack } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
const ID = 'fusion-bench-prepared-concrete:bench-consumed', ORDER = 'fusion-bench-prepared-concrete:bench-order';
const SNAPSHOT = '94f350ab-777f-4edc-8630-6a4a347e8607';
function evidence(unitPrice: string | null = '1800') {
  const before = JSON.parse(JSON.stringify(fusionBenchDefinitionS2758())) as ReturnType<typeof fusionBenchDefinitionS2758>;
  const after = JSON.parse(JSON.stringify(before)) as typeof before;
  for (const row of before.resources) {
    delete row.resource_graph.derivedQuantityEditPolicyV1;
    const { row_sha256: ignored, ...body } = row; row.row_sha256 = estimateDeterministicHash(body);
  }
  const source = (definition: typeof before) => binding({ ...definition, representation: 'FACTORY_ARTIFACT',
    catalogId: pack.catalogId, definitionMeaning: { sourceId: pack.sourceId } });
  const parent = { [ID]: { quantity: '7', unitPrice, provenance: { kind: 'manual', reason: 'Actual saved price source' } },
    [ORDER]: { quantity: '9', unitPrice: '2300', provenance: { kind: 'manual', reason: 'Paid order source' } } };
  const result = clear({ from: source(before), to: source(after), parentOverrides: parent,
    stagedOverrides: { [ID]: { quantity: null } }, parentCustomRows: [] });
  if (!result) throw Error('Expected independently built necessary clear evidence');
  return { clearEvidence: result, parent };
}
const input = () => ({ ...evidence(), parentRouteBindings: [], targetRouteBindings: [], parentSelection: [],
  request: { priceSnapshotIds: [] }, phase: 'WORKER' as const });

test('unrouted empty parent selection produces no source price items for either definition', () => {
  const result = prices(input());
  expect(result?.priceSnapshotIds).toEqual([]);
  expect(result?.parentResolvedSourcePriceItems).toEqual([]); expect(result?.targetResolvedSourcePriceItems).toEqual([]);
});

test('unrouted nonempty parent selection stays exact while both source resolutions remain empty', () => {
  const result = prices({ ...input(), parentSelection: [SNAPSHOT], request: { priceSnapshotIds: [SNAPSHOT] } });
  expect(result?.priceSnapshotIds).toEqual([SNAPSHOT]);
  expect(result?.parentResolvedSourcePriceItems).toEqual([]); expect(result?.targetResolvedSourcePriceItems).toEqual([]);
});

test.each(['parentRouteBindings', 'targetRouteBindings'] as const)('rejects an added %s instead of assuming source prices remain absent', owner => {
  expect(prices({ ...input(), [owner]: [{ route_id: SNAPSHOT, price_key: ORDER, priority: 0 }] })).toBeNull();
  expect(prices({ ...input(), [owner]: null })).toBeNull();
});

test.each(['1800', '0', null])('preserves manual unitPrice %j and provenance independently of empty source prices', unitPrice => {
  const actual = evidence(unitPrice), before = JSON.stringify(actual.parent);
  expect(prices({ ...input(), clearEvidence: actual.clearEvidence })).not.toBeNull();
  expect(Object.hasOwn(actual.clearEvidence.mergedOverrides[ID] as object, 'unitPrice')).toBe(true);
  expect(actual.clearEvidence.mergedOverrides[ID]).toEqual({ ...actual.parent[ID], quantity: null });
  expect(actual.clearEvidence.mergedOverrides[ORDER]).toEqual(actual.parent[ORDER]);
  expect(JSON.stringify(actual.parent)).toBe(before);
});

test('missing clear evidence and replacement price selection cannot pass the unrouted gate', () => {
  expect(prices({ ...input(), clearEvidence: null })).toBeNull();
  expect(prices({ ...input(), parentSelection: [SNAPSHOT], request: { priceSnapshotIds: [] } })).toBeNull();
});

test.each(['INTAKE', 'WORKER'] as const)('%s rejects an oversized parent selection even though both source route sets are empty', phase => {
  const maximum = Array.from({ length: 64 }, () => SNAPSHOT), tooMany = [...maximum, SNAPSHOT];
  expect(prices({ ...input(), parentSelection: maximum, request: { priceSnapshotIds: maximum }, phase })).not.toBeNull();
  expect(prices({ ...input(), parentSelection: tooMany, request: { priceSnapshotIds: tooMany }, phase })).toBeNull();
  expect(prices({ ...input(), parentSelection: tooMany, request: {}, phase })).toBeNull();
});
