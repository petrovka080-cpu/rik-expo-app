import { canonicalDerivedQuantityClearParentPricesV1 as selection } from '../../src/lib/estimate/backendPlatform/canonicalDerivedQuantityClearParentPricesV1';
const A = '94f350ab-777f-4edc-8630-6a4a347e8607', B = '5a04d9a1-15c1-540a-b674-565051baedf9';

test.each([[], [A], [B, A], [A, A]].map(parent => ({ parent })))('intake preserves exact parent selection $parent even when no selection was supplied', ({ parent }) => {
  const result = selection({ parentSelection: parent, request: { parameters: {} }, phase: 'INTAKE' });
  expect(result).toEqual(parent); expect(result).not.toBe(parent);
});

test.each(['INTAKE', 'WORKER'] as const)('%s keeps an explicitly empty selection empty, with no default-price sentinel', phase => {
  expect(selection({ parentSelection: [], request: { priceSnapshotIds: [] }, phase })).toEqual([]);
  expect(selection({ parentSelection: [], request: { priceSnapshotIds: [A] }, phase })).toBeNull();
});

test('worker rejects an absent, undefined or inherited selection instead of resolving default prices', () => {
  for (const request of [{}, { priceSnapshotIds: undefined }, Object.create({ priceSnapshotIds: [A] })]) {
    expect(selection({ parentSelection: [A], request, phase: 'WORKER' })).toBeNull();
  }
  expect(selection({ parentSelection: [], request: {}, phase: 'WORKER' })).toBeNull();
});

test.each(['INTAKE', 'WORKER'] as const)('%s preserves order and duplicates without sorting or deduplicating', phase => {
  const parent = [B, A, A], request = { priceSnapshotIds: [B, A, A] }, before = JSON.stringify({ parent, request });
  expect(selection({ parentSelection: parent, request, phase })).toEqual(parent);
  for (const different of [[A, B, A], [B, A], [B, B, A], [], [B, A, A, B]]) {
    expect(selection({ parentSelection: parent, request: { priceSnapshotIds: different }, phase })).toBeNull();
  }
  expect(JSON.stringify({ parent, request })).toBe(before);
});

test.each([null, undefined, 'default', {}, [A, 7], [''], ['not-a-uuid']].map(parentSelection => ({ parentSelection })))('rejects malformed parent selection $parentSelection without filtering its contents', ({ parentSelection }) => {
  expect(selection({ parentSelection, request: {}, phase: 'INTAKE' })).toBeNull();
  expect(selection({ parentSelection, request: { priceSnapshotIds: [] }, phase: 'WORKER' })).toBeNull();
});

test.each([null, undefined, 'default', {}, [A, null], [A, ''], ['not-a-uuid']].map(priceSnapshotIds => ({ priceSnapshotIds })))('rejects malformed explicit selection $priceSnapshotIds without filtering it', ({ priceSnapshotIds }) => {
  for (const phase of ['INTAKE', 'WORKER'] as const) {
    expect(selection({ parentSelection: [A], request: { priceSnapshotIds }, phase })).toBeNull();
  }
});

test('preserves exact UUID text rather than normalizing an explicit request silently', () => {
  expect(selection({ parentSelection: [A], request: { priceSnapshotIds: [A.toUpperCase()] }, phase: 'INTAKE' })).toBeNull();
});

test('rejects sparse selections and malformed request objects', () => {
  expect(selection({ parentSelection: new Array(1), request: {}, phase: 'INTAKE' })).toBeNull();
  expect(selection({ parentSelection: [A], request: { priceSnapshotIds: new Array(1) }, phase: 'WORKER' })).toBeNull();
  expect(selection({ parentSelection: [], request: null, phase: 'INTAKE' })).toBeNull();
});

test.each(['INTAKE', 'WORKER'] as const)('%s enforces the existing sixty-four snapshot boundary before filtering or persistence', phase => {
  const maximum = Array.from({ length: 64 }, () => A), tooMany = [...maximum, A];
  expect(selection({ parentSelection: maximum, request: { priceSnapshotIds: maximum }, phase })).toEqual(maximum);
  expect(selection({ parentSelection: tooMany, request: { priceSnapshotIds: tooMany }, phase })).toBeNull();
  expect(selection({ parentSelection: tooMany, request: {}, phase })).toBeNull();
  if (phase === 'INTAKE') expect(selection({ parentSelection: maximum, request: {}, phase })).toEqual(maximum);
});
