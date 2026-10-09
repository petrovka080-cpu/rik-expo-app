import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compileCanonicalEstimateCore } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
import { canonicalEstimateRevisionRowFromStorage } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import { selectCanonicalArtifactRows } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import { VALTEC_KNOWN_ZERO_S2748 as pack, VALTEC_KNOWN_ZERO_S2748_SOURCE_PACK_SHA256 as hash,
    VALTEC_KNOWN_ZERO_S2748_PARAMETERS as parameters, VALTEC_KNOWN_ZERO_S2748_FORMULAS as formulas,
    VALTEC_KNOWN_ZERO_S2748_RESOURCES as resources, VALTEC_KNOWN_ZERO_S2748_RUNTIME_INPUT as runtime,
    compileWaterValtecPpr20KnownZeroS2748 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20KnownZeroS2748';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { VALTEC_EXACT_FITTINGS_S2747 as fittings } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { compileWaterValtecPpr20MixedEndpointsS2747 as previous, VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES as previousResources } from '../../src/lib/estimate/v4/waterValtecPpr20MixedEndpointsS2747';
import { waterValtecKnownZeroS2748Config } from '../../scripts/estimate/r4a13/prepareS2748WaterValtecKnownZero';

const input = { route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps,
    substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const [coupling, elbow, tee, thread, cap] = pack.rowIds;
const manual = { kind: 'manual' as const, reason: 'DEMO / VALIDATION_FIXTURE spare order' };

test('pins the finite successor, retains all inherited runtime facts and changes exactly five opt-in rows', async () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-known-zero-s27-48.json')).digest('hex')).toBe(hash);
    expect(createHash('sha256').update(readFileSync(pack.previousSourcePack)).digest('hex')).toBe(pack.previousSourcePackSha256);
    expect([parameters.length, formulas.length, resources.length]).toEqual([53, 45, 62]);
    expect(resources.filter((r, i) => r.row_sha256 !== previousResources[i].row_sha256).map(r => r.row_id)).toEqual(pack.rowIds);
    const config = waterValtecKnownZeroS2748Config({ releaseId: 'TEST', searchReleaseId: 'TEST' });
    for (const [id, value] of Object.entries(runtime)) expect(config.acceptanceInput[id]).toEqual(value);
    expect((await config.verifyCore()).wholeG7Accepted).toBe(false);
});
test('straight100m keeps24 couplings and2 caps, but zero fittings require neither prices nor purchase', async () => {
    const old = await previous(input);
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map(r => [r.row_id, r.quantity])).toEqual(old.rows.map(r => [r.row_id, r.quantity]));
    expect(result.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '24', included_in_procurement: true });
    expect(result.rows.find(r => r.row_id === cap)).toMatchObject({ quantity: '2', included_in_procurement: true });
    for (const id of [elbow, tee, thread]) {
        expect(result.rows.find(r => r.row_id === id)).toMatchObject({ quantity: '0', unit_price: null,
            included_in_estimate: false, included_in_procurement: false,
            calculation_trace: { knownZeroExclusionV1: { calculatedQuantity: '0', orderedQuantity: '0' } } });
        expect(old.rows.find(r => r.row_id === id)?.included_in_estimate).toBe(true);
    }
    expect(result.totals.unpricedRowCount).toBe(old.totals.unpricedRowCount - 3);
    const stored = JSON.parse(JSON.stringify(result.rows)) as typeof result.rows;
    const selection = selectCanonicalArtifactRows(stored);
    for (const id of [elbow, tee, thread]) {
        expect(selection.procurementRows.some(r => r.row_id === id)).toBe(false);
        expect(canonicalEstimateRevisionRowFromStorage(stored.find(r => r.row_id === id)!, null)).toMatchObject({ quantity: '0', includedInEstimate: false, includedInProcurement: false });
    }
});
test('one4m section has no interior coupling; changing length restores its automatic ownership', async () => {
    const short = await compile({ ...input, route_length_m: 4 });
    expect(short.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '0', included_in_estimate: false, included_in_procurement: false });
    const changed = await compile({ route_length_m: 8 }, { confirmedParameters: input });
    expect(changed.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '1', included_in_estimate: true, included_in_procurement: true });
});
test('unknown project quantities remain needs and positive quantities retain their exact specifications', async () => {
    const unknown = await compile({ route_length_m: 100, route_geometry_mode: route.geometry.project, substrate_profile: input.substrate_profile });
    for (const id of pack.rowIds) expect(unknown.preliminaryNeeds.find(r => r.row_id === id)).toMatchObject({ quantity: null, selected: true });
    const project = { route_length_m: 100, route_geometry_mode: route.geometry.project, substrate_profile: input.substrate_profile,
        straight_coupling_count: 24, elbow_count: 3, tee_count: 2, threaded_transition_count: 1, terminal_cap_count: 2,
        valtec_elbow_selection: fittings.projectSelections[0].values[0], valtec_tee_selection: fittings.projectSelections[1].values[0],
        valtec_thread_selection: fittings.projectSelections[2].values[0] };
    const result = await compile(project);
    expect(result.preliminaryNeeds).toEqual([]);
    for (const id of pack.rowIds) expect(result.rows.find(r => r.row_id === id)).toMatchObject({ included_in_estimate: true, included_in_procurement: true });
});
test('spare order with zero consumption survives; missing exact spare specification remains a need', async () => {
    const rowOverrides = { [elbow]: { quantity: '5', unitPrice: '10', provenance: manual } };
    const unknown = await compile(input, { rowOverrides });
    expect(unknown.preliminaryNeeds.find(r => r.row_id === elbow)).toMatchObject({ quantity: '5', selected: true,
        missing_parameter_ids: ['valtec_elbow_selection'] });
    const known = await compile({ ...input, valtec_elbow_selection: fittings.projectSelections[0].values[0] }, { rowOverrides });
    expect(known.rows.find(r => r.row_id === elbow)).toMatchObject({ quantity: '5', amount: '50', included_in_estimate: true, included_in_procurement: true,
        calculation_trace: { calculatedQuantityBeforeOverride: '0', manualAmendment: manual, purchaseBalance: { consumed: '0', procurementReady: true } } });
    expect(known.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity).toBe('50');
});
test('zero manual order against24 installed couplings remains a shortage, not an automatic exclusion', async () => {
    const result = await compile(input, { rowOverrides: { [coupling]: { quantity: '0', provenance: manual } } });
    expect(result.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '0', included_in_estimate: true, included_in_procurement: false,
        calculation_trace: { purchaseBalance: { consumptionShortage: '24', procurementReady: false } } });
    expect(result.rows.find(r => r.row_id === coupling)?.calculation_trace).not.toHaveProperty('knownZeroExclusionV1');
});
test('zero priced rows do not require payment and explicit positive-row exclusions are retained', async () => {
    const result = await compile(input, { rowOverrides: { [elbow]: { unitPrice: '999', includedInEstimate: true, provenance: manual },
        [coupling]: { unitPrice: '10', includedInEstimate: false, provenance: manual } } });
    expect(result.totals.amount).toBe('0');
    expect(result.rows.find(r => r.row_id === elbow)?.included_in_estimate).toBe(false);
    expect(result.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '24', included_in_estimate: false });
});
test('negative and fractional orders are rejected before known-zero ownership decisions', async () => {
    for (const quantity of ['-1', '0.5']) await expect(compile({ ...input, valtec_elbow_selection: fittings.projectSelections[0].values[0] },
        { rowOverrides: { [elbow]: { quantity, provenance: manual } } })).rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
});
test('malformed definition policy fails closed before inclusion can hide it', async () => {
    await expect(compileCanonicalEstimateCore({ operation: 'compile', compilerVersion: 'TEST', catalogId: 'TEST', primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: [...parameters], formulaDefinitions: [...formulas], resourceDefinitions: resources.map(r => r.row_id === elbow
            ? { ...r, inclusion_ast: { kind: 'literal', value: false }, resource_graph: { ...r.resource_graph, excludeKnownZeroQuantityV1: 'yes' } } : r),
        confirmedParameters: runtime, submittedParameters: input, currencyCode: 'KGS', priceItems: [], maximumResourceRows: resources.length, hashJson: value => estimateDeterministicHash(value) }))
        .rejects.toMatchObject({ code: 'DEFINITION_INTEGRITY_FAILED' });
});
test('a separate positive purchase requirement cannot disappear behind a zero order formula', async () => {
    const zeroFormula = formulas.find(f => f.formula_id === resources.find(r => r.row_id === elbow)!.formula_id)!;
    const result = await compileCanonicalEstimateCore({ operation: 'compile', compilerVersion: 'TEST', catalogId: 'TEST', primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: [...parameters], formulaDefinitions: [...formulas], resourceDefinitions: resources.map(r => r.row_id === coupling
            ? { ...r, formula_id: zeroFormula.formula_id } : r), confirmedParameters: runtime, submittedParameters: input,
        currencyCode: 'KGS', priceItems: [], maximumResourceRows: resources.length, hashJson: value => estimateDeterministicHash(value) });
    expect(result.rows.find(r => r.row_id === coupling)).toMatchObject({ quantity: '0', included_in_estimate: true, included_in_procurement: false,
        calculation_trace: { purchaseBalance: { consumed: '24', consumptionShortage: '24', procurementReady: false } } });
});
