import {prepareBrickPartitionDeliveryRetainedDraftR1,prepareBrickPartitionSelectedDeliveryMasterRetainedR1} from './prepareBrickPartitionSelectedDeliveryMasterRetainedR1';
import {SELECTED_DELIVERY_ROW_R1, SELECTED_DELIVERY_QUANTITY_R1} from './selectedMaterialDeliveryForwardR1';
import {resolveMasterExistingNormativeRegistryReuseR1} from './prepareMasterSingleDefinitionSuccessorR1';

test('adds one optional transport owner and retains all 52 parameters, 24 formulas, 24 resources and 11 bindings', async () => {
  const d=prepareBrickPartitionDeliveryRetainedDraftR1(),before=JSON.stringify(d.capture);
  expect(await d.verifyCore()).toMatchObject({shape:[69,25,25],retainedBindings:11,newBindings:1,oldNeeds:8,fullTechnicalAcceptance:false});
  expect(d.model.resources.filter(r=>r.row_id===SELECTED_DELIVERY_ROW_R1)).toHaveLength(1);
  expect(JSON.stringify(d.capture)).toBe(before);
  expect(d.binding.retainParentBindings.newParameterSources[SELECTED_DELIVERY_QUANTITY_R1]).toEqual({kind:'DERIVED',sourceIds:[d.binding.reuseExistingNormativeRegistry.source.source_key]});
});

test('routes the actual captured contract-free Ford registry through the existing Master with zero registry writes', () => {
  const c=prepareBrickPartitionSelectedDeliveryMasterRetainedR1(),source=c.binding.reuseExistingNormativeRegistry!.source;
  const {created_at:_timestamp,...managed}=source;
  expect(resolveMasterExistingNormativeRegistryReuseR1({config:c,newSource:managed,newLocators:c.binding.reuseExistingNormativeRegistry!.locators})?.managedSource).toEqual(managed);
  expect(c.catalogAppend).toBeUndefined();expect(c.binding.retainParentBindings!.capturedSourcePreimage).toBeUndefined();
  expect(c.sourcePaths).toContain('scripts/estimate/r4a13/masterReviewedNormPackRegistryReuseR1.ts');
  expect(c.sourcePaths).toContain('data/estimate-norms/professional/delivery.json');
  expect(c.passport.unresolvedApplicableResourceRowIds).toHaveLength(8);
});

test('keeps only human-entered shipment facts public, with specific guidance and no assumed loads', () => {
  const c=prepareBrickPartitionSelectedDeliveryMasterRetainedR1(),added=c.parameterDefinitions.slice(52);
  expect(added).toHaveLength(17);
  for(const q of added){
    expect(q.default_value).toBeNull();
    const guide=String(q.truth_metadata.guide.guide_short_ru);
    expect(guide.length).toBeGreaterThan(50);expect(guide.length).toBeLessThan(360);
    expect(guide).not.toMatch(/ROOT|compiler|admission|catalogId|NOT_RUN/u);
    expect(q.truth_metadata.visibility_role).toBe(q.parameter_id===SELECTED_DELIVERY_QUANTITY_R1?'INTERNAL_ONLY':'USER_INPUT');
  }
});
