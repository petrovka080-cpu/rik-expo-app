import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {extractPromptOwnedProfessionalParameters} from './consumerCanonicalBaselineCompile';
import {buildCanonicalBaselinePlan} from '../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';
import {ct29ExistingMineralDeliveryCleanupPackR2,ct29ExistingMineralPrefixS2754} from '../../lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorDeliveryCleanupDefinitionR2} from '../../lib/estimate/v4/ct29IndoorDeliveryCleanupR2';
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
  expect(r.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id))
    .toEqual([ct29ExistingMineralPrefixS2754(1)+':curing-water']);
  const edited=buildCanonicalBaselinePlan({catalog,prompt,parameterOverrides:{ct29_delivery_distance_km:'22.5'}});
  const changed=await compileCt29ExistingMineralS2754(1,edited.parameters);
  expect(changed.rows.find(row=>row.row_id===id)?.quantity).toBe('68.0625');
  expect(JSON.stringify(catalog)).toBe(before);
});
