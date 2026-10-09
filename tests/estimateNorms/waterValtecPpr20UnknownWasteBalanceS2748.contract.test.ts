import { VALTEC_UNKNOWN_WASTE_BALANCE_S2748 as pack, VALTEC_UNKNOWN_WASTE_BALANCE_S2748_RESOURCES as resources,
    compileWaterValtecUnknownWasteBalanceS2748 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20UnknownWasteBalanceS2748';
import { VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES as oldResources, compileWaterValtecSourceApplicabilityS2748 as previous } from '../../src/lib/estimate/v4/waterValtecPpr20SourceApplicabilityS2748';
import { waterValtecUnknownWasteBalanceS2748Config } from '../../scripts/estimate/r4a13/prepareS2748WaterValtecUnknownWasteBalance';

const input = { route_length_m: 100, substrate_profile: 'Сухой бетон, крепление напрямую без отделки',
    route_geometry_mode: 'Один прямой участок — подбор по отрезкам 4 м', route_end_connections: 'Два резьбовых подключения — каждое отдельно',
    route_start_thread_interface: 'Внутренняя резьба G 1/2″', route_finish_thread_interface: 'Наружная резьба G 3/4″' };

test('removes the observed false bag consumption without losing the unknown procurement need', async () => {
    const old = await previous(input);
    expect(old.preliminaryNeeds.find(r => r.row_id === pack.affectedRowId)?.calculation_trace)
        .toMatchObject({ purchaseRequirementV1: { consumed: '2', plannedConsumption: '2' } });
    for (const route_length_m of [4, 100, 458]) {
        const result = await compile({ ...input, route_length_m });
        const bags = result.preliminaryNeeds.find(r => r.row_id === pack.affectedRowId)!;
        expect(bags).toMatchObject({ quantity: null, missing_parameter_ids: ['waste_bag_count'], selected: true, procurement_eligible: true });
        expect(bags.calculation_trace).not.toHaveProperty('purchaseRequirementV1');
        expect(bags.calculation_trace).not.toHaveProperty('purchaseBalance');
    }
});

test('changes only the waste resource and preserves exact physical quantities and fitting specifications', async () => {
    expect(resources.filter((r, i) => r.row_sha256 !== oldResources[i].row_sha256).map(r => r.row_id)).toEqual([pack.affectedRowId]);
    const result = await compile(input), old = await previous(input);
    expect(result.rows.map(r => [r.row_id, r.quantity, r.included_in_estimate, r.included_in_procurement]))
        .toEqual(old.rows.map(r => [r.row_id, r.quantity, r.included_in_estimate, r.included_in_procurement]));
    expect(result.rows).toHaveLength(39); expect(result.preliminaryNeeds).toHaveLength(18);
    for (const need of result.preliminaryNeeds) expect(need.calculation_trace).not.toHaveProperty('purchaseRequirementV1');
    await expect(compile({ ...input, waste_bag_count: 0 })).rejects.toThrow('unresolved application norm cannot be supplied');
});

test('publishes a successor with the same shape and explicit incomplete technology boundary', async () => {
    const config = waterValtecUnknownWasteBalanceS2748Config({ releaseId: 'TEST', searchReleaseId: 'TEST' });
    expect(config.expectedParentShape).toEqual([54, 45, 62]);
    expect([config.parameterDefinitions.length, config.formulaDefinitions.length, config.resourceDefinitions.length]).toEqual([54, 45, 62]);
    expect(await config.verifyCore()).toMatchObject({ unknownBagConsumptionPreserved: true, fullTechnicalAcceptance: false, acceptedNewTypes: 0 });
});
