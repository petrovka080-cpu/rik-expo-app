import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { withG6NextServiceComponents } from '../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';
import { G6_COMPLETION_NOT_REQUIRED_S2741 as none, G6_COMPLETION_REQUIRED_S2741 as required } from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
import { withPvcRoofMinimalCustomerInputS2747 } from '../../src/lib/estimate/v4/pvcRoofVolumeMinimalCustomerInputS2747';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { canonicalEstimateConsumerInputRole } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';

const profile = series[0]!;
const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
const previous = withG6NextServiceComponents(profile.definition, { ...profile, ...operation });
const definition = withPvcRoofMinimalCustomerInputS2747(previous);
const input = { area_m2: 458, roof_height_m: 6, cleaned_surface_m2: 20, g6_cleanup_applicability: none, g6_waste_applicability: none };
const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  catalogId: profile.catalogId, compilerVersion: 's2748-pvc-mass-minimal-control', primaryMeasureParameterId: 'area_m2', definition, submittedParameters,
});

test('mass cleaner keeps five measured object facts and no customer density/norm question', () => {
  const role = (id: string) => canonicalEstimateConsumerInputRole({ provenance: definition.parameters.find(p => p.parameter_id === id)!.truth_metadata.provenance as Record<string, unknown> });
  for (const id of Object.keys(input)) expect(role(id)).toBe('OBJECT_FACT');
  expect(role('cleaner_density_kg_l')).toBe('APPLICATION_TECHNICAL');
  expect(definition.runtimeInput.cleaner_density_kg_l).toBeUndefined();
  expect(definition.runtimeInput.roof_height_m).toBeUndefined();
  expect(definition.formulas).toBe(previous.formulas);
  expect(definition.resources).toBe(previous.resources);
  expect(definition.resources.some(r => r.row_id.endsWith('cleaner-volume-472219'))).toBe(false);
});

test('20m2 cleaning retains5kg need while three-litre package order and price stay unknown', async () => {
  const result = await compile(input);
  expect(result.preliminaryNeeds).toHaveLength(1);
  expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: 'pvc-roof:material:cleaner', unit_id: 'kg', quantity: null, unit_price: null,
    missing_parameter_ids: ['cleaner_density_kg_l'], calculation_trace: { purchaseRequirementV1: { consumed: '5', unitId: 'kg' } } });
  expect(result.rows.find(r => r.row_id === 'pvc-roof:labor:workers')?.quantity).toBe('24.4114');
});

test('saved nonzero stock and reserve survive missing density; unknown cleaned area never becomes zero', async () => {
  const result = await compile({ ...input, roof_cleaner_stock: 2, roof_cleaner_reserve: 1 });
  expect(result.parameters).toMatchObject({ roof_cleaner_stock: 2, roof_cleaner_reserve: 1 });
  expect(result.preliminaryNeeds[0]).toMatchObject({ quantity: null, calculation_trace: {
    purchaseRequirementV1: { consumed: '5', unitId: 'kg' } } });
  const unknown = await compile({ area_m2: 458 });
  const cleaner = unknown.preliminaryNeeds.find(r => r.row_id === 'pvc-roof:material:cleaner');
  expect(cleaner?.missing_parameter_ids).toContain('cleaned_surface_m2');
  expect(cleaner?.quantity).toBeNull();
  expect(cleaner?.calculation_trace.purchaseRequirementV1).toBeUndefined();
});

test('selecting completion keeps its missing programme visible without inferred service norms', async () => {
  const result = await compile({ ...input, g6_cleanup_applicability: required, g6_waste_applicability: required });
  const serviceNeeds = result.preliminaryNeeds.filter(r => r.row_id.startsWith('g6:completion:'));
  expect(serviceNeeds.length).toBeGreaterThan(0);
  expect(serviceNeeds.every(r => r.quantity === null)).toBe(true);
  expect(result.preliminaryNeeds.find(r => r.row_id === 'pvc-roof:material:cleaner')?.calculation_trace.purchaseRequirementV1)
    .toMatchObject({ consumed: '5', unitId: 'kg' });
});
