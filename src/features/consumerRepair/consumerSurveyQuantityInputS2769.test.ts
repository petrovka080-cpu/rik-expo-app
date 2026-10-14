import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {buildCanonicalBaselinePlan} from './consumerCanonicalBaselineCompile';
import {aggressiveFloorCompleteBindingS2769 as pack} from '../../lib/estimate/v4/aggressiveFloorProtectionDustCompleteS2769';
import {aggressiveFloorWorkScopeIdS2769 as work} from '../../lib/estimate/v4/aggressiveFloorActualThicknessScopeS2769';

const snapshot=require('../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-public-input-schema-s27-69.json') as {catalogs:CanonicalEstimateCatalogItem[]};
const areaId='floor_covering_area_m2';

test.each(snapshot.catalogs)('reuses explicit surveyed floor area without inventing other object facts: $catalogId',catalog=>{
 const before=JSON.stringify(catalog);
 expect(catalog.applicability.primaryMeasureParameterId).toBe(areaId);
 expect(catalog.parameterSchema.find(p=>p.parameterId===areaId)?.valueSourceRole).toBe('USER_OR_APPROVED_EXISTING_CONDITION_SURVEY');
 const plan=buildCanonicalBaselinePlan({catalog,prompt:'Разборка цементного или бетонного пола в агрессивной среде 35,5 м²'});
 expect(plan.parameters[areaId]).toBe('35.5');
 expect(plan.primaryMeasureParameterId).toBe(areaId);
 const areaTitle=catalog.parameterSchema.find(p=>p.parameterId===areaId)!.titleRu;
 expect(plan.assumptions.some(text=>text.startsWith(areaTitle+':'))).toBe(false);
 expect(plan.parameters[pack.barrierAreaParameterId]).toBeUndefined();
 expect(plan.parameters[work]).toBeUndefined();
 expect(JSON.stringify(catalog)).toBe(before);
});

test.each(snapshot.catalogs)('keeps conflicting areas and incompatible units unresolved: $catalogId',catalog=>{
 for(const prompt of ['Разборка пола 35,5 м² или 12 м²','Разборка пола 3,55 м³','Разборка пола без обмера']){
  const plan=buildCanonicalBaselinePlan({catalog,prompt});
  expect(plan.parameters[areaId]).toBeUndefined();
  expect(plan.parameters[pack.barrierAreaParameterId]).toBeUndefined();
 }
});

test('explicit editor correction takes priority over the surveyed quantity in the request',()=>{
 const plan=buildCanonicalBaselinePlan({catalog:snapshot.catalogs[0],prompt:'Разборка пола 35,5 м²',parameterOverrides:{[areaId]:'36.2'}});
 expect(plan.parameters[areaId]).toBe('36.2');
 expect(plan.parameters[pack.barrierAreaParameterId]).toBeUndefined();
});

test.each([
 {visibilityRole:'INTERNAL_ONLY',valueSourceRole:'USER_OR_APPROVED_EXISTING_CONDITION_SURVEY'},
 {visibilityRole:'USER_INPUT',valueSourceRole:'MANUFACTURER_CONFIRMED'},
 {visibilityRole:'USER_INPUT',valueSourceRole:'COMPILER_DERIVED_RESOURCE_QUANTITY'},
])('does not grant source or internal parameters user quantity authority: %j',metadata=>{
 const catalog=structuredClone(snapshot.catalogs[0]);
 Object.assign(catalog.parameterSchema.find(p=>p.parameterId===areaId)!,metadata);
 const plan=buildCanonicalBaselinePlan({catalog,prompt:'Разборка пола 35,5 м²'});
 expect(plan.parameters[areaId]).toBeUndefined();
});
