import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VALTEC_MIXED_ENDPOINTS_S2747 as pack, VALTEC_MIXED_ENDPOINTS_S2747_SOURCE_PACK_SHA256 as hash, VALTEC_MIXED_ENDPOINTS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ENDPOINTS_S2747_FORMULAS as formulas, VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES as resources, compileWaterValtecPpr20MixedEndpointsS2747 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20MixedEndpointsS2747';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { VALTEC_EXACT_FITTINGS_S2747 as fitting } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { VALTEC_MIXED_ELBOWS_S2747 as elbows, compileWaterValtecPpr20MixedElbowsS2747 as previous } from '../../src/lib/estimate/v4/waterValtecPpr20MixedElbowsS2747';
import { canonicalInheritedConfirmedParameters } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
const simple = { route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps,
    substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const input = { ...simple, route_end_connections: pack.endMode, route_start_thread_interface: pack.variants[0].interfaceRu,
    route_finish_thread_interface: pack.variants[3].interfaceRu };
const generic = 'water-ppr20:05:component:threaded-transitions';
const shape = (r: Awaited<ReturnType<typeof compile>>) => r.rows.map(v => [v.row_id, v.title_ru, v.quantity, v.included_in_estimate, v.included_in_procurement]);
const missing = (r: Awaited<ReturnType<typeof compile>>) => [...new Set(r.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))].sort();

test('pins source-backed variants and one canonical component table', () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-endpoints-s27-47.json')).digest('hex')).toBe(hash);
    expect(createHash('sha256').update(readFileSync(pack.primarySource.localArtifact)).digest('hex')).toBe(pack.primarySource.artifactSha256);
    expect(pack.variants.map(v => v.titleRu)).toEqual(fitting.projectSelections[2].values);
    expect([parameters.length, formulas.length, resources.length]).toEqual([53, 45, 62]);
});
test('preserves caps, homogeneous threads, explicit project schedules and mixed elbow records', async () => {
    const project = { route_length_m: 100, route_geometry_mode: elbows.geometryMode, straight_coupling_count: 24, valtec_elbows45_count: 3,
        valtec_elbows90_count: 5, tee_count: 0, threaded_transition_count: 0, terminal_cap_count: 2, substrate_profile: simple.substrate_profile };
    for (const old of [simple, { ...simple, route_end_connections: route.ends.threaded, valtec_thread_selection: fitting.projectSelections[2].values[0] }, project])
        expect(shape(await compile(old))).toEqual(shape(await previous(old)));
    expect(missing(await compile({ route_length_m: 100 }))).toEqual(['route_geometry_mode', 'substrate_profile']);
});
test('all16 actual interface pairs select complementary models without a zero or generic owner', async () => {
    for (const start of pack.variants) for (const finish of pack.variants) {
        const result = await compile({ ...input, route_start_thread_interface: start.interfaceRu, route_finish_thread_interface: finish.interfaceRu });
        expect(result.preliminaryNeeds).toEqual([]);
        expect(result.parameters.threaded_transition_count).toBe('2');
        expect(result.parameters.terminal_cap_count).toBe('0');
        expect(result.rows.some(r => r.row_id === generic)).toBe(false);
        for (const variant of pack.variants) {
            const count = Number(start === variant) + Number(finish === variant);
            const row = result.rows.find(r => r.row_id === variant.rowId);
            if (!count) expect(row).toBeUndefined();
            else expect(row).toMatchObject({ quantity: String(count), title_ru: variant.titleRu, included_in_procurement: true, unit_price: null });
        }
        //24 installed couplings×2 sockets +2 adapter sockets. Supplier reserve does not add installed joins.
        expect(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity).toBe('50');
    }
});
test('unknown interfaces remain actual questions and cannot be replaced by a former homogeneous selection', async () => {
    const result = await compile({ ...simple, route_end_connections: pack.endMode, valtec_thread_selection: fitting.projectSelections[2].values[0] });
    expect(missing(result)).toEqual(pack.endpointQuestions.map(q => q.parameterId).sort());
    for (const variant of pack.variants) expect(result.rows.some(r => r.row_id === variant.rowId)).toBe(false);
    const one = await compile({ ...input, route_finish_thread_interface: undefined });
    expect(missing(one)).toEqual(['route_finish_thread_interface']);
    await expect(compile({ ...input, route_finish_thread_interface: 'NPT 1/2' })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});
test('model prices remain separate and the obsolete generic override cannot be billed or copied', async () => {
    const provenance = { kind: 'manual' as const, reason: 'DEMO / VALIDATION_FIXTURE' };
    const result = await compile(input, { rowOverrides: {
        [generic]: { unitPrice: '999', provenance },
        [pack.variants[0].rowId]: { unitPrice: '100', provenance },
        [pack.variants[3].rowId]: { unitPrice: '150', provenance },
        [pack.variants[1].rowId]: { unitPrice: '777', provenance },
    } });
    expect(result.totals.amount).toBe('250');
    expect(result.totals.pricedRowCount).toBe(2);
    expect(result.rows.find(r => r.row_id === pack.variants[0].rowId)?.amount).toBe('100');
    expect(result.rows.find(r => r.row_id === pack.variants[3].rowId)?.amount).toBe('150');
    expect(result.rows.find(r => r.row_id === pack.variants[1].rowId)).toBeUndefined();
});
test('recalculates an interface change and keeps inactive actual facts when returning to caps', async () => {
    const parent = await compile(input);
    const inherited = canonicalInheritedConfirmedParameters(parent.parameters, parent.derivedParameters);
    const same = await compile({ route_finish_thread_interface: input.route_start_thread_interface }, { confirmedParameters: inherited });
    expect(same.rows.find(r => r.row_id === pack.variants[0].rowId)?.quantity).toBe('2');
    expect(same.rows.find(r => r.row_id === pack.variants[3].rowId)).toBeUndefined();
    const capped = await compile({ route_end_connections: route.ends.caps }, { confirmedParameters: inherited });
    expect(shape(capped)).toEqual(shape(await previous(simple)));
    expect(capped.parameters.route_start_thread_interface).toBe(input.route_start_thread_interface);
    await expect(compile({ ...input, threaded_transition_count: 3 })).rejects.toMatchObject({ code: 'PROJECT_GEOMETRY_PARAMETER_CONFLICT' });
});
