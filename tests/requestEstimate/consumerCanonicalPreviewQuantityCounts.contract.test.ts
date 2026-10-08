import { canonicalPreviewQuantityCounts as counts } from '../../src/features/consumerRepair/consumerCanonicalPreviewQuantityCounts';
test('the size-only support preview retains four known preliminary requirements', () => {
    const result = counts({ calculatedRowIds: Array.from({ length: 32 }, (_, i) => `ready-${i}`),
        preliminaryNeeds: [
            { rowId: 'sts-sets', quantity: '51' }, { rowId: 'studs', quantity: '201' },
            { rowId: 'plugs', quantity: '201' }, { rowId: 'nuts', quantity: '201' },
            ...Array.from({ length: 20 }, (_, i) => ({ rowId: `unknown-${i}`, quantity: null })),
        ] });
    expect(result).toEqual({ knownQuantityCount: 36, missingQuantityCount: 20 });
});
test('counts legitimate zero once and never treats an empty quantity as known', () => {
    expect(counts({ calculatedRowIds: ['same'], preliminaryNeeds: [
            { rowId: 'same', quantity: 1 }, { rowId: 'zero', quantity: '0' },
            { rowId: 'empty', quantity: '' }, { rowId: 'empty', quantity: null },
        ] })).toEqual({ knownQuantityCount: 2, missingQuantityCount: 1 });
});
