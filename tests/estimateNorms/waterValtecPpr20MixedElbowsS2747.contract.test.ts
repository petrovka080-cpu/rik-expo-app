import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VALTEC_MIXED_ELBOWS_S2747 as pack, VALTEC_MIXED_ELBOWS_S2747_SOURCE_PACK_SHA256 as hash, VALTEC_MIXED_ELBOWS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ELBOWS_S2747_FORMULAS as formulas, VALTEC_MIXED_ELBOWS_S2747_RESOURCES as resources, compileWaterValtecPpr20MixedElbowsS2747 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20MixedElbowsS2747';
import { VALTEC_SINGLE_ROUTE_S2747 as route, compileWaterValtecPpr20SingleStraightRouteS2747 as previous } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { VALTEC_EXACT_FITTINGS_S2747 as fitting } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { canonicalInheritedConfirmedParameters } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
const simple = { route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps,
    substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const project = { route_length_m: 100, straight_coupling_count: 24, elbow_count: 8, tee_count: 0, threaded_transition_count: 0, terminal_cap_count: 2,
    substrate_profile: simple.substrate_profile, valtec_elbow_selection: fitting.projectSelections[0].values[0] };
const mixed = { ...project, route_geometry_mode: pack.geometryMode, valtec_elbows45_count: 3, valtec_elbows90_count: 5 };
const generic = 'water-ppr20:05:component:elbows';
const manual = { kind: 'manual' as const, reason: 'DEMO / VALIDATION_FIXTURE' };
const shape = (r: Awaited<ReturnType<typeof compile>>) => r.rows.map(v => [v.row_id, v.quantity, v.included_in_estimate, v.included_in_procurement]);
test('pins the existing primary fitting document and bounded two-model source pack', () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-elbows-s27-47.json')).digest('hex')).toBe(hash);
    expect(createHash('sha256').update(readFileSync(pack.primarySource.localArtifact)).digest('hex')).toBe(pack.primarySource.artifactSha256);
    expect([parameters.length, formulas.length, resources.length]).toEqual([47, 41, 58]);
});
test('preserves the accepted four-fact straight route and old homogeneous records without a new mode', async () => {
    expect(shape(await compile(simple))).toEqual(shape(await previous(simple)));
    expect(shape(await compile(project))).toEqual(shape(await previous(project)));
    const size = await compile({ route_length_m: 100 });
    expect([...new Set(size.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))].sort()).toEqual(['route_geometry_mode', 'substrate_profile']);
});
test('derives the total and model-specific owners from actual3x45 and5x90 without billing the generic owner', async () => {
    const result = await compile({ ...mixed, elbow_count: undefined }, { rowOverrides: {
            [generic]: { unitPrice: '999', provenance: manual },
            [pack.variants[0].rowId]: { unitPrice: '30', provenance: manual },
            [pack.variants[1].rowId]: { unitPrice: '20', provenance: manual },
        } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.parameters.elbow_count).toBe('8');
    expect(result.rows).toHaveLength(57);
    expect(result.rows.find(r => r.row_id === generic)).toBeUndefined();
    expect(result.rows.find(r => r.row_id === pack.variants[0].rowId)).toMatchObject({ quantity: '3', amount: '90', included_in_procurement: true });
    expect(result.rows.find(r => r.row_id === pack.variants[1].rowId)).toMatchObject({ quantity: '5', amount: '100', included_in_procurement: true });
    expect(result.totals.amount).toBe('190');
    expect(result.totals.pricedRowCount).toBe(2);
    // 24 couplings × 2 sockets + 8 elbows × 2 sockets + 2 end caps.
    expect(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity).toBe('66');
});
test('cannot split an unspecified total8 and does not ask the former homogeneous angle selection', async () => {
    const result = await compile({ ...project, route_geometry_mode: pack.geometryMode, valtec_elbow_selection: undefined });
    expect(result.parameters.valtec_elbows45_count).toBeUndefined();
    expect(result.parameters.valtec_elbows90_count).toBeUndefined();
    expect([...new Set(result.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))].sort()).toEqual(['valtec_elbows45_count', 'valtec_elbows90_count']);
});
test('a zero model has no purchase or payment row and contradictory project totals are rejected', async () => {
    const result = await compile({ ...mixed, elbow_count: undefined, valtec_elbows45_count: 0 });
    expect(result.parameters.elbow_count).toBe('5');
    expect(result.rows.find(r => r.row_id === pack.variants[0].rowId)).toBeUndefined();
    expect(result.rows.find(r => r.row_id === pack.variants[1].rowId)?.quantity).toBe('5');
    await expect(compile({ ...mixed, elbow_count: 9 })).rejects.toMatchObject({ code: 'PROJECT_GEOMETRY_PARAMETER_CONFLICT', parameterId: 'elbow_count' });
    await expect(compile({ ...mixed, valtec_elbows45_count: -1 })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});
test('recalculates changed angle quantities and preserves inactive facts when returning to a straight scope', async () => {
    const parent = await compile({ ...mixed, elbow_count: undefined });
    const inherited = canonicalInheritedConfirmedParameters(parent.parameters, parent.derivedParameters);
    const changed = await compile({ valtec_elbows45_count: 4 }, { confirmedParameters: inherited });
    expect(changed.parameters.elbow_count).toBe('9');
    const straight = await compile({ route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps }, { confirmedParameters: { ...inherited, straight_coupling_count: 24 } });
    expect(straight.preliminaryNeeds).toEqual([]);
    expect(straight.parameters.elbow_count).toBe('0');
    expect(straight.parameters.valtec_elbows45_count).toBe(3);
    expect(straight.rows.find(r => r.row_id === pack.variants[0].rowId)).toBeUndefined();
});
