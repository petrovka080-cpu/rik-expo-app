import { PVC15_MINIMAL_INPUT_DEFINITION_S2744 as definition, PVC15_CUSTOMER_FACT_IDS_S2744 } from '../../src/lib/estimate/v4/pvcRoofMinimalCustomerInputS2744';
import { PVC15_BASE, PVC15_SYSTEM } from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { PVC15_FIELD_TRANSITION_DEFINITION_S2743 as historical } from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import { buildConsumerCanonicalParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type { CanonicalEstimateCatalogItem } from '../../src/lib/estimate/backendPlatform/contracts';
import type { CanonicalEstimateParameterSessionRevision } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import { consumerCanonicalInheritedRecalculationInputs } from '../../src/features/consumerRepair/consumerCanonicalReleaseMigration';
import { pvc15MinimalCustomerInputPublishConfigS2744 } from '../../scripts/estimate/r4a13/prepareS2744Pvc15MinimalCustomerInput';

const compile = (input: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({ definition,
  catalogId: 'canonical-work:base:roofing_interior_flat_roof_install_standard', primaryMeasureParameterId: 'area_m2', compilerVersion: 'minimal-input-control', submittedParameters: input });
describe('PVC15 size and object facts instead of a technical questionnaire', () => {
  test.each([75, 154, 5000])('automatically calculates the primary-source preliminary membrane and whole fastener demand for %s m²', async area => {
    const result = await compile({ area_m2: area });
    expect(Number(result.parameters.pvc15_membrane_consumption_m2)).toBeCloseTo(area * 1.15, 9);
    expect(Number(result.parameters.telescopic_fastener_quantity_piece)).toBe(Math.ceil(area * 4));
    expect(result.parameters.reinforced_membrane_designation).toContain('LOGICROOF V-RP');
    expect(result.parameters).not.toHaveProperty('edge_rail_length_m');
    expect(result.parameters).not.toHaveProperty('hot_air_welder_machine_h');
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.rows.some(row => row.included_in_procurement)).toBe(false);
    for (const id of ['pvc15:labor:layout', 'pvc15:labor:fastening', 'pvc15:labor:welding']) {
      expect(result.rows.find(row => row.row_id === id)).toMatchObject({ quantity: String(area), unit_id: 'm2', unit_price: null, included_in_procurement: false });
    }
  });
  test('applies the glass-mat coefficient only to the compatible substrate and retains a project override', async () => {
    expect((await compile({ area_m2: 75, pvc15_base: PVC15_BASE.eps })).parameters.pvc15_separation_area_m2).toBe('88.5');
    expect((await compile({ area_m2: 75, pvc15_base: PVC15_BASE.mineral })).parameters).not.toHaveProperty('pvc15_separation_area_m2');
    const custom = await compile({ area_m2: 75, pvc15_membrane_consumption_m2: 80.5, telescopic_fastener_quantity_piece: 324 });
    expect(custom.parameters.pvc15_membrane_consumption_m2).toBe(80.5);
    expect(custom.parameters.telescopic_fastener_quantity_piece).toBe(324);
    expect((await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.other })).parameters).not.toHaveProperty('pvc15_membrane_consumption_m2');
  });
  test('keeps only actual dimensions and scope choices customer-owned; no hours, product passports, stocks or norm inputs', () => {
    const customer = definition.parameters.filter(p => p.truth_metadata.visibility_role !== 'INTERNAL_ONLY'
      && !['NORM_REQUIRED_BUT_PROJECT_SELECTED', 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'].includes(String(p.truth_metadata.value_source_role)));
    expect(customer.map(p => p.parameter_id)).toEqual(expect.arrayContaining(['area_m2', 'pvc15_base', 'edge_rail_length_m', 'detail_membrane_mode', 'pvc15_joint_transition_scope']));
    expect(customer.every(p => PVC15_CUSTOMER_FACT_IDS_S2744.includes(p.parameter_id))).toBe(true);
    expect(customer.length).toBeLessThanOrEqual(7);
    expect(historical.runtimeInput).toEqual({});
    expect(historical.parameters.find(p => p.parameter_id === 'telescopic_fastener_quantity_piece')!.truth_metadata).not.toHaveProperty('preliminary_value_formula_v1');
  });
  test('continues to reject fractional fastening counts and never fabricates physical purchase or prices', async () => {
    await expect(compile({ area_m2: 75, telescopic_fastener_quantity_piece: '324.5' })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    const result = await compile({ area_m2: 75 });
    expect(result.parameters).not.toHaveProperty('reinforced_membrane_quantity_m2');
    expect(result.parameters).not.toHaveProperty('pvc15_supply_rc09_reinforced_pvc_roof_membrane_1_5mm_stock');
    expect(result.rows.every(row => row.unit_price == null)).toBe(true);
  });
  test('projects a size-only calculation into four object questions and does not resubmit automatic quantities as user facts', async () => {
    const result = await compile({ area_m2: 75 });
    const consumers = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
    const catalog = { catalogId: 'canonical-work:base:roofing_interior_flat_roof_install_standard', releaseId: 'current',
      workKey: 'roofing_interior_flat_roof_install_standard', definitionVersion: 5,
      parameterSchema: definition.parameters.map(p => {
        const guide = p.truth_metadata.guide as Record<string, string>;
        return { parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type, unitId: p.unit_id, titleRu: p.title_ru,
          required: p.required, defaultValue: p.default_value, constraints: p.constraints_json,
          visibilityRole: p.truth_metadata.visibility_role, valueSourceRole: p.truth_metadata.value_source_role,
          runtimeProfileClassification: p.truth_metadata.runtime_profile_classification,
          requiredWhen: p.constraints_json?.requiredWhen, formulaConsumers: consumers.formulaConsumers[p.parameter_id],
          resourceBranchConsumers: consumers.resourceConsumers[p.parameter_id], guide: { guideKind: guide.guide_kind,
            guideValidationPolicy: guide.guide_validation_policy, sourceRole: guide.source_role, sourceDocument: guide.source_document,
            sourceLocator: guide.source_locator, sourceSnapshotHash: guide.source_snapshot_hash, guideShortRu: guide.guide_short_ru } };
      }) } as unknown as CanonicalEstimateCatalogItem;
    const current = { revisionId: 'preview', releaseId: 'current', catalogId: catalog.catalogId, parameters: result.parameters,
      userInputSnapshot: { area_m2: 75 }, createdAt: '2026-10-07T00:00:00Z',
      preliminaryNeeds: result.preliminaryNeeds.map(n => ({ rowId: n.row_id, selected: n.selected, missingParameterIds: n.missing_parameter_ids,
        quantity: n.quantity, needState: n.need_state })) } as CanonicalEstimateParameterSessionRevision;
    const session = buildConsumerCanonicalParameterSession({ catalog, revision: current, draftId: 'short-normal-request' });
    expect([...session.blockingMissingParameterIds].sort()).toEqual(['detail_membrane_mode', 'edge_rail_length_m', 'pvc15_base', 'pvc15_joint_transition_scope'].sort());
    expect(session.parameters.find(p => p.parameterId === 'pvc15_membrane_consumption_m2')).toMatchObject({ value: 86.25, source: 'ASSUMED' });
    expect(session.parameters).not.toEqual(expect.arrayContaining([expect.objectContaining({ parameterId: 'hot_air_welder_machine_h', value: null })]));
    const inherited = consumerCanonicalInheritedRecalculationInputs(current as Parameters<typeof consumerCanonicalInheritedRecalculationInputs>[0], catalog);
    expect(inherited).not.toHaveProperty('pvc15_membrane_consumption_m2');
    expect(inherited.area_m2).toBe(75);
    expect(consumerCanonicalInheritedRecalculationInputs({ ...current, userInputSnapshot: { area_m2: 75, pvc15_membrane_consumption_m2: 86.25 } } as Parameters<typeof consumerCanonicalInheritedRecalculationInputs>[0], catalog))
      .toHaveProperty('pvc15_membrane_consumption_m2', '86.25');
  });
  test.each(['standard', 'small_area', 'large_area'])('preflights the shared %s binding without publishing or treating the fixture as a default', async variant => {
    const config = pvc15MinimalCustomerInputPublishConfigS2744({ definition: 'current', search: 'current-search' }, variant);
    expect(config.catalogAppend).toBeUndefined();
    expect(config.parameterDefinitions).toBe(definition.parameters);
    expect(config.runtimeProfileInput).toEqual(definition.runtimeInput);
    expect(await config.verifyCore()).toMatchObject({ completeRows: 26, fixturesAreNotDefaults: true, sourceGapsRetained: true, acceptedNewTypeDelta: 0 });
  });
});
