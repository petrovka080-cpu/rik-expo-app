import fs from 'node:fs';
import {createHash} from 'node:crypto';
import pack from '../../data/estimate-benchmarks/source-packs/pvc15-existing-area-bindings-s27-43.json';
import {pvc15ExistingAreaPublishConfigS2743,type Pvc15AreaVariantS2743} from '../../scripts/estimate/r4a13/prepareS2743Pvc15ExistingAreaBindings';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743 as definition} from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {pvc15AreaVariantControlInputS2743} from '../fixtures/pvc15AreaVariantBindingsS2743';
const parent={definition:'3444a36d-584c-5bc3-bdaa-872a3345e6ea',search:'71b2296d-25fc-53fc-9341-85db8bc7c217'};
const compile=(variant:Pvc15AreaVariantS2743,submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,catalogId:pack.members.find(m=>m.variant===variant)!.catalogId,primaryMeasureParameterId:'area_m2',compilerVersion:pack.contract,submittedParameters});
describe('two existing area bindings, one accepted PVC15 owner without size norms',()=>{
 test('seals the actual source packs and selects two existing IDs without special-context or new type claims',()=>{
  expect(pack.members.map(m=>m.variant)).toEqual(['small_area','large_area']);expect(pack.newTypeDelta).toBe(0);
  for(const source of pack.components)expect(createHash('sha256').update(fs.readFileSync(source.path)).digest('hex')).toBe(source.sha256);
  for(const member of pack.members){const c=pvc15ExistingAreaPublishConfigS2743(parent,member.variant as Pvc15AreaVariantS2743);
   expect(c.catalogAppend).toBeUndefined();expect(c.expectedParentShape).toEqual([1,59,59]);expect(c.catalogId).toBe(member.catalogId);
   expect(c.search.canonicalNameRu).toContain('ПВХ-мембраны 1,5 мм');expect(c.parameterDefinitions).toBe(definition.parameters);expect(c.formulaDefinitions).toBe(definition.formulas);expect(c.resourceDefinitions).toBe(definition.resources);
   expect(c.runtimeProfileInput).toEqual({});expect(c.parameterDefinitions.every(p=>p.default_value===null)).toBe(true);
  }
 });
 test.each(['small_area','large_area'] as const)('%s short measured input keeps the known primary area and asks for project facts',async variant=>{
  const area=variant==='small_area'?75:5000,result=await compile(variant,{area_m2:area});
  expect(result.rows.map(r=>[r.row_id,r.quantity])).toEqual([['rc09:pvc_membrane_hot_air_install',String(area)]]);expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
  expect(result.rows.some(r=>r.included_in_procurement)).toBe(false);
  await expect(compile(variant,{q:100})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unknown estimate parameters: q'});
 });
 test.each(['small_area','large_area'] as const)('%s honors independent measured consumption and order, with no area productivity factor',async variant=>{
  const result=await compile(variant,pvc15AreaVariantControlInputS2743(variant));const row=(id:string)=>result.rows.find(r=>r.row_id===id)!;
  expect(result.preliminaryNeeds).toEqual([]);expect(result.rows.length).toBe(26);
  expect(row('rc09:reinforced_pvc_roof_membrane_1_5mm').quantity).toBe(variant==='small_area'?'85':'5160');
  expect((row('rc09:reinforced_pvc_roof_membrane_1_5mm').calculation_trace as {purchaseBalance:{consumed:string;remaining:string}}).purchaseBalance).toMatchObject({consumed:variant==='small_area'?'80.5':'5150',remaining:variant==='small_area'?'4.5':'10'});
  expect(row('rc09:pvc_membrane_telescopic_fastener').quantity).toBe(variant==='small_area'?'400':'10100');
  expect(row('rc09:pvc_membrane_weld_probe_test').quantity).toBe(variant==='small_area'?'7':'38');
  expect(row('pvc15:equipment:own-use').quantity).toBe('9');expect(row('pvc15:labor:preparation').quantity).toBe('2.5');
  expect(result.rows.some(r=>r.included_in_procurement&&r.unit_id==='machine_hour')).toBe(false);
 });
 test.each(['small_area','large_area'] as const)('%s rejects fractional fastening and control counts without changing fractional material consumption',async variant=>{
  for(const id of ['telescopic_fastener_quantity_piece','weld_probe_control_count_test'])await expect(compile(variant,{...pvc15AreaVariantControlInputS2743(variant),[id]:'7.5'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'invalid integer '+id});
  const result=await compile(variant,{...pvc15AreaVariantControlInputS2743(variant),pvc15_membrane_consumption_m2:variant==='small_area'?'80.5':'5150.5'});
  expect(result.preliminaryNeeds).toEqual([]);
 });
 test.each(['small_area','large_area'] as const)('%s passes the same governed publisher core preflight',async variant=>{
  expect(await pvc15ExistingAreaPublishConfigS2743(parent,variant).verifyCore()).toMatchObject({rows:26,needs:0,sizeRateFactorUsed:false,acceptedNewTypeDelta:0});
 });
});
