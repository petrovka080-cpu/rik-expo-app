import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { withG6NextServiceComponents } from '../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';
import { G6_COMPLETION_NOT_REQUIRED_S2741 } from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
import { withPvcRoofVolumeMinimalCustomerInputS2747 } from '../../src/lib/estimate/v4/pvcRoofVolumeMinimalCustomerInputS2747';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { canonicalEstimateConsumerInputRole } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';

const profile = G6_PVC_COMMERCIAL_LABOR_SERIES_S2741[1]!;
const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
const previous = withG6NextServiceComponents(profile.definition, { ...profile, ...operation });
const definition = withPvcRoofVolumeMinimalCustomerInputS2747(previous);
const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  catalogId: profile.catalogId, compilerVersion: 's2747-pvc12-minimal-input-fixture',
  primaryMeasureParameterId: 'area_m2', definition, submittedParameters,
});

test('five initial object facts leave source rates and supplier options outside the short form', () => {
  const facts = definition.parameters.filter(parameter => canonicalEstimateConsumerInputRole({
    provenance: parameter.truth_metadata.provenance as Record<string, unknown>,
  }) === 'OBJECT_FACT');
  expect(facts.map(parameter => parameter.parameter_id)).toEqual(expect.arrayContaining([
    'area_m2', 'roof_height_m', 'cleaned_surface_m2', 'g6_cleanup_applicability', 'g6_waste_applicability',
  ]));
  // Two more genuine object facts apply only if waste handling is selected.
  expect(facts.filter(parameter => !['g6_waste_mass_kg', 'g6_waste_loading_method'].includes(parameter.parameter_id))).toHaveLength(5);
  expect(definition.runtimeInput.roof_height_m).toBeUndefined();
  expect(definition.parameters.find(parameter => parameter.parameter_id === 'roof_height_m')?.default_value).toBeNull();
  expect(definition.resources).toBe(previous.resources);
  expect(definition.formulas).toBe(previous.formulas);
});

test('ordinary measured roof calculates resources without manual norm or completion-reference entry', async () => {
  const result = await compile({ area_m2: 458, roof_height_m: 6, cleaned_surface_m2: 20,
    g6_cleanup_applicability: G6_COMPLETION_NOT_REQUIRED_S2741,
    g6_waste_applicability: G6_COMPLETION_NOT_REQUIRED_S2741,
  });
  expect(result.preliminaryNeeds).toHaveLength(0);
  expect(result.rows.find(row => row.row_id === 'pvc-roof:labor:workers')?.quantity).toBe('24.4114');
  expect(result.rows.find(row => row.row_id === 'pvc-roof:material:field')).toMatchObject({
    quantity: '577.5', calculation_trace: { purchaseBalance: { consumed: '526.7' } },
  });
  expect(result.rows.find(row => row.row_id === 'pvc-roof:material:cleaner-volume-472219')).toMatchObject({
    quantity: '6', unit_price: null, calculation_trace: { purchaseBalance: { consumed: '5' } },
  });
  expect(result.totals.unpricedRowCount).toBeGreaterThan(0);
});

test('unknown geometry and completion remain honest gaps; saved stock and project descriptions are preserved', async () => {
  const unknown = await compile({ area_m2: 458 });
  expect(unknown.preliminaryNeeds.some(need => need.missing_parameter_ids.includes('roof_height_m'))).toBe(true);
  expect(unknown.preliminaryNeeds.some(need => need.missing_parameter_ids.includes('cleaned_surface_m2'))).toBe(true);
  const result = await compile({ area_m2: 458, roof_height_m: 6, cleaned_surface_m2: 20,
    roof_field_stock: 458, roof_field_reserve: 100,
    g6_cleanup_applicability: G6_COMPLETION_NOT_REQUIRED_S2741,
    g6_waste_applicability: G6_COMPLETION_NOT_REQUIRED_S2741,
    g6_cleanup_boundary_reference: 'VALIDATION_FIXTURE: отдельное завершение за границей заказа',
  });
  expect(result.rows.find(row => row.row_id === 'pvc-roof:material:field')).toMatchObject({ quantity: '210',
    calculation_trace: { purchaseBalance: { consumed: '526.7', stock: '458', reserve: '100' } },
  });
});
