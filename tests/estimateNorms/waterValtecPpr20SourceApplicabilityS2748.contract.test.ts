import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compileCanonicalEstimateCore } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateConsumerInputRole } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
import { VALTEC_SOURCE_APPLICABILITY_S2748 as pack, VALTEC_SOURCE_APPLICABILITY_S2748_SHA256 as hash,
    VALTEC_SOURCE_APPLICABILITY_S2748_PARAMETERS as parameters, VALTEC_SOURCE_APPLICABILITY_S2748_FORMULAS as formulas,
    VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES as resources, VALTEC_SOURCE_APPLICABILITY_S2748_RUNTIME_INPUT as runtime,
    compileWaterValtecSourceApplicabilityS2748 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20SourceApplicabilityS2748';
import { VALTEC_KNOWN_ZERO_S2748_PARAMETERS as oldParameters, compileWaterValtecPpr20KnownZeroS2748 as previous } from '../../src/lib/estimate/v4/waterValtecPpr20KnownZeroS2748';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { VALTEC_EXACT_FITTINGS_S2747 as fittings } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { waterValtecSourceApplicabilityS2748Config } from '../../scripts/estimate/r4a13/prepareS2748WaterValtecSourceApplicability';

const input = { route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps,
    substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const objectIds = (list: typeof parameters) => list.filter(p => canonicalEstimateConsumerInputRole({ provenance: p.truth_metadata?.provenance as Record<string, unknown> }) === 'OBJECT_FACT').map(p => p.parameter_id);
const unresolved = Object.keys(pack.unresolvedApplicationParameters);

test('pins the applicability audit and gives the publisher an explicit partial boundary', async () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-source-applicability-s27-48.json')).digest('hex')).toBe(hash);
    expect([parameters.length, formulas.length, resources.length]).toEqual([54, 45, 62]);
    const config = waterValtecSourceApplicabilityS2748Config({ releaseId: 'TEST', searchReleaseId: 'TEST' });
    expect(config.passport.unresolvedApplicableResourceRowIds).toEqual(pack.unresolvedResourceRowIds);
    expect(await config.verifyCore()).toMatchObject({ knownRows: 39, unresolvedRows: 18, fullTechnicalAcceptance: false, acceptedNewTypes: 0 });
});

test('retains physical quantities and exact specifications while unconfirmed work remains visible', async () => {
    const old = await previous(input); const result = await compile(input);
    expect(old.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(old.rows.length - 18); expect(result.preliminaryNeeds).toHaveLength(18);
    expect(result.preliminaryNeeds.map(r => r.row_id).sort()).toEqual([...pack.unresolvedResourceRowIds].sort());
    for (const row of result.rows) expect([row.quantity, row.included_in_procurement, row.included_in_estimate])
        .toEqual([old.rows.find(r => r.row_id === row.row_id)!.quantity, old.rows.find(r => r.row_id === row.row_id)!.included_in_procurement, old.rows.find(r => r.row_id === row.row_id)!.included_in_estimate]);
    expect(result.preliminaryNeeds.every(r => r.quantity === null && r.selected)).toBe(true);
    expect(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity).toBe('50');
    expect(result.rows.find(r => r.row_id === 'water-ppr20:02:material:pipe-net')?.quantity).toBe('100');
    for (const resource of resources.filter(r => pack.unresolvedResourceRowIds.includes(r.row_id))) expect(resource.source_metadata).toMatchObject({ normativeTrace: [] });
});

test('keeps the same object questions and never asks the customer to invent a numerical norm', () => {
    expect(objectIds(parameters)).toEqual(objectIds([...oldParameters]));
    for (const id of unresolved) {
        expect(runtime).not.toHaveProperty(id);
        expect(parameters.find(p => p.parameter_id === id)).toMatchObject({ required: false, default_value: null,
            truth_metadata: { visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM',
                provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } });
    }
});

test('rejects supplied zero, supplied positive and confirmed unconfirmed norm values', async () => {
    for (const id of unresolved) {
        for (const value of [0, 1]) await expect(compile({ ...input, [id]: value })).rejects.toThrow('unresolved application norm cannot be supplied');
        await expect(compile(input, { confirmedParameters: { [id]: 1 } })).rejects.toThrow('unresolved application norm cannot be supplied');
    }
});

test('rejects a forged definition default through the same compiler validation', async () => {
    await expect(compileCanonicalEstimateCore({ operation: 'compile', compilerVersion: 'TEST', catalogId: pack.catalogId, primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: parameters.map(p => p.parameter_id === 'delivery_trip_count' ? { ...p, default_value: 1 } : p),
        formulaDefinitions: formulas, resourceDefinitions: resources, submittedParameters: input, confirmedParameters: runtime,
        currencyCode: 'KGS', priceItems: [], maximumResourceRows: resources.length, hashJson: estimateDeterministicHash }))
        .rejects.toThrow('unresolved application norm cannot have a default');
});

test('eliminates the hidden bag-per50m formula without hiding the waste need', async () => {
    for (const length of [4, 100, 458]) {
        const result = await compile({ ...input, route_length_m: length });
        expect(result.preliminaryNeeds.find(r => r.row_id === 'water-ppr20:08:consumable:waste-bags'))
            .toMatchObject({ quantity: null, missing_parameter_ids: ['waste_bag_count'], selected: true });
    }
});

test('retains an exact paid spare order without adding installed fittings or welds', async () => {
    const elbow = 'water-ppr20:05:component:elbows';
    const result = await compile({ ...input, valtec_elbow_selection: fittings.projectSelections[0].values[0] }, {
        rowOverrides: { [elbow]: { quantity: '5', unitPrice: '10', provenance: { kind: 'manual', reason: 'DEMO / VALIDATION_FIXTURE exact spare' } } } });
    expect(result.rows.find(r => r.row_id === elbow)).toMatchObject({ quantity: '5', amount: '50', included_in_procurement: true,
        calculation_trace: { purchaseBalance: { consumed: '0', procurementReady: true } } });
    expect(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity).toBe('50');
    expect(result.preliminaryNeeds).toHaveLength(18);
});
