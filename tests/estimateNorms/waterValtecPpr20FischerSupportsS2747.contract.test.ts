import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VALTEC_FISCHER_SUPPORTS_S2747 as pack, VALTEC_FISCHER_SUPPORT_ROW_IDS_S2747 as ids, VALTEC_FISCHER_SUPPORTS_S2747_PARAMETERS as parameters, VALTEC_FISCHER_SUPPORTS_S2747_FORMULAS as formulas, VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES as resources, VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256, compileWaterValtecPpr20FischerSupportsS2747 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20FischerSupportsS2747';
import { compileWaterValtecPpr20ExactFittingsS2747 as previousCompile, VALTEC_EXACT_FITTINGS_S2747 as fittings } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { assertCanonicalPurchaseReadinessV1 } from '../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1';
import { selectCanonicalArtifactRows } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
const facts = { route_length_m: 100, straight_coupling_count: 24, elbow_count: 8, tee_count: 2, threaded_transition_count: 4, terminal_cap_count: 2,
    ...Object.fromEntries(fittings.projectSelections.map(s => [s.parameterId, s.values[0]])) };
const concrete = { ...facts, substrate_profile: pack.baseChoices.concrete };
const rowQuantity = (result: Awaited<ReturnType<typeof compile>>, id: string) => result.rows.find(r => r.row_id === id)?.quantity;
const manual = { kind: 'manual' as const, reason: 'DEMO / VALIDATION_FIXTURE' };
const includedPartIds: readonly string[] = [ids.stud, ids.plug, ids.nut];
test('pins the independent manufacturer parts and bundled content; package sizes cannot be customer norms', () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-fischer-supports-s27-47.json')).digest('hex'))
        .toBe(VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256);
    expect(parameters).toHaveLength(42);
    expect(formulas).toHaveLength(39);
    expect(resources).toHaveLength(56);
    expect(pack.clamp).toMatchObject({ article: '562610', packagePcs: 100, slidingPipeDiameterMm: 20 });
    expect(pack.fastenerSet).toMatchObject({ article: '567615', supportPointsPerPackage: 4 });
    expect(pack.fastenerSet.contents.map(c => c.piecesPerPackage)).toEqual([4, 4, 4]);
    for (const id of ['fischer_fks_package_pcs', 'fischer_sts_points_per_package'])
        expect(parameters.find(p => p.parameter_id === id)?.truth_metadata)
            .toMatchObject({ visibility_role: 'USER_DERIVED_READONLY', catalogue_owned_lookup_v1: true, provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } });
});
test('rounds the two different supplies once and keeps all included physical requirements without purchasing them twice', async () => {
    const result = await compile(concrete);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(56);
    expect(rowQuantity(result, ids.clamps)).toBe('300');
    expect(rowQuantity(result, ids.sets)).toBe('51');
    for (const id of [ids.stud, ids.plug, ids.nut])
        expect(result.rows.find(r => r.row_id === id)).toMatchObject({ quantity: '201',
            included_in_procurement: false, unit_price: null, amount: null, calculation_trace: { resourceGraph: { costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', includedInResourceOwnerRowId: ids.sets } } });
    expect(rowQuantity(result, 'water-ppr20:03:control:support-order')).toBe('204');
    expect(rowQuantity(result, 'water-ppr20:03:control:support-remainder')).toBe('3');
    const buyers = selectCanonicalArtifactRows(result.rows).procurementRows;
    expect(buyers.filter(r => r.row_id === ids.clamps || r.row_id === ids.sets)).toHaveLength(2);
    expect(buyers.some(r => includedPartIds.includes(r.row_id))).toBe(false);
    expect(buyers.some(r => r.row_id === 'water-ppr20:03:fastener:support-packages')).toBe(false);
    const old = await previousCompile(facts);
    for (const row of old.rows.filter(r => !r.row_id.startsWith('water-ppr20:03:')))
        expect(rowQuantity(result, row.row_id)).toBe(row.quantity);
});
test.each([undefined, pack.baseChoices.unknown])('keeps known consumption when the actual base is not admitted (%s)', async (base) => {
    const result = await compile({ ...facts, ...(base == null ? {} : { substrate_profile: base }) });
    expect(rowQuantity(result, ids.clamps)).toBe('300');
    const needs = result.preliminaryNeeds.filter(n => n.row_id === ids.sets || includedPartIds.includes(n.row_id));
    expect(needs).toHaveLength(4);
    expect(needs.find(n => n.row_id === ids.sets)).toMatchObject({ quantity: '51', missing_parameter_ids: ['substrate_profile'] });
    for (const id of [ids.stud, ids.plug, ids.nut])
        expect(needs.find(n => n.row_id === id)).toMatchObject({ quantity: '201', missing_parameter_ids: ['substrate_profile'] });
    expect(result.rows.some(r => r.row_id === ids.sets && r.included_in_procurement)).toBe(false);
});
test('recalculates length and honours only actual supplier orders; an incoming effective service value cannot forge quantity', async () => {
    const longer = await compile({ ...concrete, route_length_m: 130 });
    expect(rowQuantity(longer, ids.clamps)).toBe('300');
    expect(rowQuantity(longer, ids.sets)).toBe('66');
    expect(rowQuantity(longer, ids.stud)).toBe('261');
    expect(rowQuantity(longer, 'water-ppr20:03:control:support-order')).toBe('264');
    const edited = await compile({ ...concrete, fischer_effective_clamps: 1000, fischer_effective_sets: 1000 }, { [ids.clamps]: { quantity: '400', provenance: manual }, [ids.sets]: { quantity: '52', provenance: manual } });
    expect(rowQuantity(edited, 'water-ppr20:03:control:support-order')).toBe('208');
    expect(rowQuantity(edited, 'water-ppr20:03:control:support-remainder')).toBe('7');
    expect(rowQuantity(edited, ids.stud)).toBe('201');
    const short = await compile(concrete, { [ids.clamps]: { quantity: '100', includedInProcurement: true, provenance: manual } });
    expect(() => assertCanonicalPurchaseReadinessV1(short.rows)).toThrow();
    await expect(compile(concrete, { [ids.clamps]: { quantity: '201', provenance: manual } })).rejects.toThrow();
});
test('charges only the two purchased owners; included-part reference prices never create a second payment', async () => {
    const result = await compile(concrete, { [ids.clamps]: { unitPrice: '2', provenance: manual }, [ids.sets]: { unitPrice: '4', provenance: manual } });
    expect(result.rows.filter(r => r.amount != null).map(r => r.amount).sort()).toEqual(['204', '600']);
    for (const id of [ids.stud, ids.plug, ids.nut]) {
        const referenced = await compile(concrete, { [ids.clamps]: { unitPrice: '2', provenance: manual }, [ids.sets]: { unitPrice: '4', provenance: manual },
            [id]: { unitPrice: '1', provenance: manual } });
        expect(referenced.rows.find(r => r.row_id === id)).toMatchObject({ unit_price: '1', amount: '201', included_in_estimate: false, included_in_procurement: false });
        expect(referenced.totals.amount).toBe('804');
        expect(referenced.totals.pricedRowCount).toBe(2);
    }
});
test('does not reinterpret historic generic package orders or arbitrary source-managed supply sizes', async () => {
    await expect(compile(concrete, { 'water-ppr20:03:fastener:support-packages': { quantity: '3', unitPrice: '100', provenance: manual } })).rejects.toThrow();
    await expect(compile({ ...concrete, fischer_fks_package_pcs: 50 })).rejects.toThrow();
    await expect(compile({ ...concrete, fischer_sts_points_per_package: 5 })).rejects.toThrow();
    const unknownSystem = await compile({ ...concrete, selected_system_reference: 'Неподтверждённая другая трубная система' });
    expect(unknownSystem.preliminaryNeeds.some(n => n.row_id === ids.clamps)).toBe(true);
    expect(unknownSystem.rows.some(r => r.row_id === ids.clamps && r.included_in_procurement)).toBe(false);
});
