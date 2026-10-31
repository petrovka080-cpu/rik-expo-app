import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {extractPromptOwnedProfessionalParameters} from './consumerCanonicalBaselineCompile';
import {buildCanonicalBaselinePlan} from '../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';
import {ct29ExistingMineralDeliveryCleanupPackR2,ct29ExistingMineralPrefixS2754} from '../../lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorDeliveryCleanupDefinitionR2,ct29IndoorDeliveryCleanupCompletenessMapR2,ct29IndoorDeliveryCleanupPackR2 as deliverySource} from '../../lib/estimate/v4/ct29IndoorDeliveryCleanupR2';
import {compileAutomaticConstructionOwnerR1} from '../../lib/estimate/v4/automaticConstructionOwnerR1';

// Keep all twelve accepted distance regressions against their exact R2 scope.
// The active resource successor is checked separately without replacing them.
const compileCt29ExistingMineralS2754=(index:number,submittedParameters:Record<string,unknown>)=>{
  const source=ct29ExistingMineralDeliveryCleanupPackR2(index);
  return compileAutomaticConstructionOwnerR1({catalogId:source.catalogId,compilerVersion:source.contract,
    primaryMeasureParameterId:'plaster_area_m2',definition:buildCt29IndoorDeliveryCleanupDefinitionR2(source,ct29ExistingMineralPrefixS2754(index)),submittedParameters});
};

const catalog:CanonicalEstimateCatalogItem={
  catalogId:'canonical-work:master:ct29_existing_cement_lime_plaster_indoor_standard',
  releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'interior_finishes',
  workKey:'ct29_existing_cement_lime_plaster_indoor_standard',titleRu:'CT29 внутри',definitionVersion:1,
  applicability:{primaryMeasureParameterId:'plaster_area_m2'},professionalMetadata:{},
  parameterSchema:[['plaster_area_m2','m2','Площадь штукатурки'],['layer_thickness_mm','mm','Толщина слоя'],
    ['ct29_delivery_distance_km','km','Расстояние доставки CT29 от склада до объекта']].map(([parameterId,unitId,titleRu],ordinal)=>({
      parameterId,unitId,titleRu,ordinal,valueType:'decimal' as const,required:ordinal<2,defaultValue:null,
      constraints:{min:ordinal===2?0:0.01},visibilityRole:'USER_INPUT' as const,valueSourceRole:'USER_INPUT' as const,
      formulaConsumers:['ct29:'+parameterId],provenance:{consumer_input_role_v1:'OBJECT_FACT'},
    })),
};
const extract=(prompt:string)=>extractPromptOwnedProfessionalParameters(catalog.parameterSchema,prompt).ct29_delivery_distance_km;

it.each([
  ['Доставка 20 км.','20'],['Расстояние доставки CT29: 22,5 км.','22.5'],
  ['Доставка смеси Ceresit CT 29 от склада до объекта 0 км.','0'],
  ['Расстояние от склада до объекта 20 км в одну сторону.','20'],
])('retains the explicitly supplied CT29 route: %s',(prompt,expected)=>expect(extract(prompt)).toBe(expected));

it.each(['CT29, площадь 160 м², толщина 10,5 мм.','Доставка песка 20 км.',
  'Длина стены 20 м.','Доставка 20 км. Доставка 30 км.','Доставка 20 км².'])(
  'does not invent or select an ambiguous route: %s',prompt=>expect(extract(prompt)).toBeUndefined());

it('keeps a negative supplied route for the existing validator and never turns it positive',()=>{
  expect(extract('Доставка -20 км.')).toBe('-20');
  expect(()=>buildCanonicalBaselinePlan({catalog,prompt:'CT29, площадь 160 м², толщина 10,5 мм. Доставка -20 км.'})).toThrow();
});

it('does not submit route values for a historical schema or an internal field',()=>{
  expect(extractPromptOwnedProfessionalParameters(catalog.parameterSchema.slice(0,2),'Доставка 20 км.')).not.toHaveProperty('ct29_delivery_distance_km');
  const schema=catalog.parameterSchema.map(p=>p.unitId==='km'?{...p,visibilityRole:'INTERNAL_ONLY' as const}:p);
  expect(extractPromptOwnedProfessionalParameters(schema,'Доставка 20 км.')).not.toHaveProperty('ct29_delivery_distance_km');
});

it('carries short input to the shared core and preserves a later edited distance',async()=>{
  const prompt='CT29, площадь 160 м², толщина 10,5 мм. Доставка 20 км.';
  const before=JSON.stringify(catalog),plan=buildCanonicalBaselinePlan({catalog,prompt});
  expect(plan.parameters.ct29_delivery_distance_km).toBe('20');
  const r=await compileCt29ExistingMineralS2754(1,plan.parameters);
  const id=ct29ExistingMineralPrefixS2754(1)+':delivery';
  expect(r.rows.find(row=>row.row_id===id)?.quantity).toBe('60.5');
  const prefix=ct29ExistingMineralPrefixS2754(1),source=ct29ExistingMineralDeliveryCleanupPackR2(1),
    definition=buildCt29IndoorDeliveryCleanupDefinitionR2(source,prefix),map=ct29IndoorDeliveryCleanupCompletenessMapR2(source,prefix),
    laborId=prefix+':labor';
  const held=[{key:'curing-water',parameterId:'ct29_curing_water_l',unitId:'l'},
    {key:'scope-tools',parameterId:'ct29_tools_scope',unitId:''},{key:'scope-cleanup',parameterId:'ct29_cleanup_scope',unitId:''}];
  const assertHeldNeeds=(result:Awaited<ReturnType<typeof compileCt29ExistingMineralS2754>>)=>{
    expect(result.preliminaryNeeds.map(need=>need.row_id)).toEqual(held.map(need=>prefix+':'+need.key));
    for(const expected of held){
      const need=result.preliminaryNeeds.find(need=>need.row_id===prefix+':'+expected.key);expect(need).toBeDefined();
      expect(need!.need_state).toBe(expected.key==='curing-water'?'QUANTITY_REQUIRED':'CONDITION_REQUIRED');expect(need!.quantity).toBeNull();expect(need!.unit_id).toBe(expected.unitId);
      if(expected.key==='curing-water') expect(need!.missing_parameter_ids).toContain(expected.parameterId);
      else expect(need!.missing_parameter_ids).toEqual([]);
      expect(result.parameters[expected.parameterId]??null).toBeNull();
      expect(need!.calculation_trace).toMatchObject({preliminaryNeed:true});
      expect(result.rows.some(row=>row.row_id===need!.row_id)).toBe(false);
    }
    for(const key of ['scope-tools','scope-cleanup']){
      const need=result.preliminaryNeeds.find(need=>need.row_id===prefix+':'+key)!;
      expect(need.selected).toBe(false);expect(need.procurement_eligible).toBe(false);expect(need.unit_price).toBeNull();
      expect(need.calculation_trace).toMatchObject({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',
        parentCostOwnerId:laborId,includedInResourceOwnerRowId:laborId,scopeRequirementDecisionV1:{status:'INCLUDED',
          missingObjectFactParameterIds:[],coveringRowIds:[laborId],numericNormAccepted:false,separatePaymentAccepted:false}}});
    }
  };
  assertHeldNeeds(r);
  expect(deliverySource.readiness.fullTechnicalAcceptance).toBe(false);expect(deliverySource.readiness.geometryOnlyFullBranch).toBe(false);
  expect(map).toMatchObject({generatedFromCurrentRows:false,fullTechnicalAcceptance:false});
  expect(map).toMatchObject({documentedIncludedScopes:expect.arrayContaining([expect.objectContaining({
    expectedResourceId:'ordinary-hand-tools-access-ppe',resolution:{kind:'INCLUDED',coveringRowIds:[laborId]}})])});
  expect(map.entries.find(entry=>entry.expectedResourceId==='scope-cleanup')).toMatchObject({unitId:'',
    quantityRule:'DOCUMENTED_INCLUDED_SCOPE_NOT_NUMERIC_NORM',resolution:{kind:'ROW',rowId:prefix+':scope-cleanup'}});
  for(const key of ['scope-tools','scope-cleanup']){
    const resource=definition.resources.find(resource=>resource.row_id===prefix+':'+key);expect(resource?.cost_owner_id).toBe(laborId);
    expect(resource?.resource_graph).toMatchObject({costTreatment:'INFORMATIONAL_SCOPE',parentCostOwnerId:laborId,
      includedInResourceOwnerRowId:laborId,scopeRequirementV1:{kind:'INCLUDED',coveringRowIds:[laborId],costExclusionBreaksScopeV1:true}});
    expect(resource?.source_metadata?.full_technical_acceptance).toBe(false);
  }
  expect(definition.resources.find(resource=>resource.row_id===prefix+':scope-cleanup')?.source_metadata?.numericWasteOrLaborNormAccepted).toBe(false);
  expect(definition.parameters.find(parameter=>parameter.parameter_id==='ct29_curing_water_l')?.truth_metadata?.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
  expect(definition.resources.find(resource=>resource.row_id===id)?.source_metadata).toMatchObject({
    transportMassBasis:'EFFECTIVE_ORDER_DRY_MASS_KG',automaticTariffForbidden:true,vehicleTripsHoursFuelNotInferred:true});
  expect(r.parameters.ct29_delivery_distance_km).toBe('20');expect(r.rows.find(row=>row.row_id===id)?.unit_id).toBe('t_km');
  expect(r.rows.find(row=>row.row_id===id)?.unit_price).toBeNull();
  const edited=buildCanonicalBaselinePlan({catalog,prompt,parameterOverrides:{ct29_delivery_distance_km:'22.5'}});
  const changed=await compileCt29ExistingMineralS2754(1,edited.parameters);
  expect(changed.rows.find(row=>row.row_id===id)?.quantity).toBe('68.0625');
  expect(changed.parameters.ct29_delivery_distance_km).toBe('22.5');assertHeldNeeds(changed);
  const fixedRows=(result:typeof r)=>result.rows.filter(row=>row.row_id!==id).map(row=>[row.row_id,row.unit_id,row.quantity,row.included_in_estimate,row.included_in_procurement]);
  expect(fixedRows(changed)).toEqual(fixedRows(r));
  expect(JSON.stringify(catalog)).toBe(before);
});
