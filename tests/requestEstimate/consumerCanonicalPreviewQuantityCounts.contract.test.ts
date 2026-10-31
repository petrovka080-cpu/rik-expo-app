import { canonicalPreviewQuantityCounts as counts, canonicalPreviewPublicRows } from '../../src/features/consumerRepair/consumerCanonicalPreviewQuantityCounts';
import actual from '../../data/estimate-benchmarks/fixtures/master24-ct29-initial-preview-r1.json';
test('the size-only support preview retains four known preliminary requirements', () => {
    const result = counts({ calculatedRowIds: Array.from({ length: 32 }, (_, i) => `ready-${i}`),
        preliminaryNeeds: [
            { rowId: 'sts-sets', quantity: '51' }, { rowId: 'studs', quantity: '201' },
            { rowId: 'plugs', quantity: '201' }, { rowId: 'nuts', quantity: '201' },
            ...Array.from({ length: 20 }, (_, i) => ({ rowId: `unknown-${i}`, quantity: null })),
        ] });
    expect(result).toEqual({ knownQuantityCount: 36, missingQuantityCount: 20, preliminaryNeedCount: 24 });
});
test('counts legitimate zero once and never treats an empty quantity as known', () => {
    expect(counts({ calculatedRowIds: ['same'], preliminaryNeeds: [
            { rowId: 'same', quantity: 1 }, { rowId: 'zero', quantity: '0' },
            { rowId: 'empty', quantity: '' }, { rowId: 'empty', quantity: null },
        ] })).toEqual({ knownQuantityCount: 2, missingQuantityCount: 1, preliminaryNeedCount: 3 });
});

test('actual Android CT29 preview shows public resources without norms and retains all16 known quantities and2 genuine gaps', () => {
    const before = JSON.stringify(actual);
    expect(counts({ calculatedRowIds: actual.rows.map(row => row.rowId), preliminaryNeeds: actual.preliminaryNeeds }))
        .toEqual({ knownQuantityCount: 16, missingQuantityCount: 2, preliminaryNeedCount: 2 });
    expect(canonicalPreviewPublicRows(actual.rows).map(row => row.titleRu)).toEqual([
        'Сухая смесь CT29 к покупке, мешок 25 кг', 'Вода для приготовления смеси CT29',
        'Работа штукатура с обычным инвентарём', 'Растворосмеситель 65 л',
    ]);
    expect(canonicalPreviewPublicRows(actual.rows).map(row => row.quantity)).toEqual([
        2975, 756.4, actual.rows.find(row => row.rowId.endsWith(':labor'))!.quantity,
        actual.rows.find(row => row.rowId.endsWith(':mixer'))!.quantity,
    ]);
    expect(JSON.stringify(actual)).toBe(before);
});

const closed = actual.preliminaryNeeds.find(need => need.scopeRequirementDecision != null)!;

test.each(['INCLUDED', 'NOT_APPLICABLE', 'COMPLETED', 'USER_EXCLUDED', 'PROCESS_REQUIRED', 'FINANCIAL_POLICY'])(
    'verified %s scope has no numeric quantity gap', status => {
        expect(counts({ calculatedRowIds: [], preliminaryNeeds: [{ ...closed,
            scopeRequirementDecision: { ...closed.scopeRequirementDecision, status } }] }))
            .toEqual({ knownQuantityCount: 0, missingQuantityCount: 0, preliminaryNeedCount: 0 });
    });

test.each(['PROJECT_SCOPE_OPEN', 'PARTLY_INCLUDED', 'OBJECT_FACT_REQUIRED', 'LEGACY_SOURCE_REQUIRED', 'SCOPE_UNVERIFIED', 'REQUIRED_RESOURCE_EXCLUDED'])(
    'verified %s scope remains outstanding without asking for a numeric quantity', status => {
        expect(counts({ calculatedRowIds: [], preliminaryNeeds: [{ ...closed,
            scopeRequirementDecision: { ...closed.scopeRequirementDecision, status } }] }))
            .toEqual({ knownQuantityCount: 0, missingQuantityCount: 0, preliminaryNeedCount: 1 });
    });

test.each([
    { ...closed, scopeRequirementDecision: { ...closed.scopeRequirementDecision, rowId: 'other-row' } },
    { ...closed, scopeRequirementDecision: { ...closed.scopeRequirementDecision, numericNormAccepted: true } },
    { ...closed, needState: 'QUANTITY_REQUIRED' },
])('malformed, mismatched or physical quantity needs cannot borrow closed scope evidence', need => {
    expect(counts({ calculatedRowIds: [], preliminaryNeeds: [need] }))
        .toEqual({ knownQuantityCount: 0, missingQuantityCount: 1, preliminaryNeedCount: 1 });
});

test('preview retains an explicit manual title, quantity, price or purchased owner on a folded counter', () => {
    const counter = actual.rows[0];
    for (const edit of [
        { unitPrice: 12 },
        { sourceParameters: { ...counter.structuredRow.sourceParameters, canonicalManualTitleOverride: true } },
        { sourceParameters: { ...counter.structuredRow.sourceParameters, manualQuantityOverride: true } },
        { sourceParameters: { ...counter.structuredRow.sourceParameters, includedInProcurement: true } },
    ]) {
        const edited = { ...counter, structuredRow: { ...counter.structuredRow, ...edit } };
        expect(canonicalPreviewPublicRows([edited])).toHaveLength(1);
        if (edited.structuredRow.sourceParameters.canonicalManualTitleOverride)
            expect(canonicalPreviewPublicRows([edited])[0].titleRu).toBe(counter.visibleName);
    }
});
