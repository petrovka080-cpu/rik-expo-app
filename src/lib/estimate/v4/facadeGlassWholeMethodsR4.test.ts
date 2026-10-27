import assert from 'node:assert/strict';
import {facadeGlassWholePackR4 as pack,facadeGlassWholeDefinitionR4 as build,compileFacadeGlassWholeMethodR4 as compileConsumer,facadeGlassWholeControlR4 as control,facadeGlassWholeBomParameterR4 as param,facadeGlassWholeNormParameterR4 as norm,facadeGlassWholePrimaryR4 as primary,facadeGlassWholeCompletenessR4 as complete,type FacadeGlassWholeMethodKeyR4 as Key} from './facadeGlassWholeMethodsR4';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const keys:readonly Key[]=['stick','structural','semi-structural','unitized','point-fixed'];
// Synthetic verified source/readback fixtures never become consumer questions.
const compile=(key:Key,fixture:Record<string,unknown>)=>{
 const {[primary]:geometry,...confirmedParameters}=fixture;
 return compileConsumer(key,{[primary]:geometry},{confirmedParameters});
};
// Literal independent synthetic design schedules, not generated rows or area
// multipliers. These fixtures are not real projects/material approval receipts.
const controls:Record<Key,{checks:Record<string,string>;second:Record<string,string>;secondChecks:Record<string,string>}>= {
 stick:{checks:{'bom:glass':'84','bom:frame-vertical':'120','bom:anchors':'48','bom:pressure-screws':'880'},second:{glass:'42','frame-vertical':'70',anchors:'28','pressure-screws':'450'},secondChecks:{'bom:glass':'42','bom:frame-vertical':'70','bom:anchors':'28','bom:pressure-screws':'450'}},
 structural:{checks:{'bom:glass':'84','bom:temporary-retainers':'96','bom:structural-spacer':'220'},second:{glass:'42','temporary-retainers':'52','structural-spacer':'116'},secondChecks:{'bom:glass':'42','bom:temporary-retainers':'52','bom:structural-spacer':'116'}},
 'semi-structural':{checks:{'bom:glass':'84','bom:pressure-horizontal':'90','bom:temporary-retainers':'96'},second:{glass:'42','pressure-horizontal':'48','temporary-retainers':'52'},secondChecks:{'bom:glass':'42','bom:pressure-horizontal':'48','bom:temporary-retainers':'52'}},
 unitized:{checks:{'bom:factory-modules':'12','bom:unit-anchors':'48','bom:unit-joint-gaskets':'90'},second:{'factory-modules':'7','unit-anchors':'28','unit-joint-gaskets':'52'},secondChecks:{'bom:factory-modules':'7','bom:unit-anchors':'28','bom:unit-joint-gaskets':'52'}},
 'point-fixed':{checks:{'bom:point-glass':'84','bom:articulated-fittings':'40','source:fitting-o-rings':'80'},second:{'point-glass':'42','articulated-fittings':'24'},secondChecks:{'bom:point-glass':'42','bom:articulated-fittings':'24','source:fitting-o-rings':'48'}},
};
describe('whole5glass source methods on one existing owner R4, notFULL',()=>{
 for(const key of keys){
  for(const variant of ['nominal','second']as const)test(key+' '+variant+' literalprojectBOM and protected physical needs',async()=>{
   const p=pack(key),c=controls[key],patch=variant==='second'?{[primary]:'50',...Object.fromEntries(Object.entries(c.second).map(([k,v])=>[param(k),v]))}:{},r=await compile(key,control(key,patch));
   for(const[id,q]of Object.entries(variant==='nominal'?c.checks:c.secondChecks)){const row=r.rows.find(row=>row.row_id===p.prefix+':'+id);assert(row,id);assert.equal(cmp(row.quantity,q),0,id);}
   assert.equal(r.preliminaryNeeds.length,p.needs.length);assert(r.preliminaryNeeds.every(n=>n.quantity===null));
   assert(r.rows.every(row=>row.row_id.startsWith(p.prefix+':')));assert(!r.rows.some(row=>['anchors_pcs','glazing_units_m2','installation_labor_hours'].includes(row.row_id)));
   assert(r.rows.every(row=>row.unit_price===null));
  });
  test(key+' internalapplicationnorms cannot be accepted by0/1/77',async()=>{
   const p=pack(key);for(const n of p.needs)for(const value of ['0','1','77'])await assert.rejects(()=>compile(key,control(key,{[norm(n.key)]:value})),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test(key+' exactwholemap/zero/actualscope and no default object facts',async()=>{
   const p=pack(key),d=build(key),map=complete(key);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   assert(d.parameters.every(q=>q.default_value===null));assert(d.resources.every(r=>r.source_metadata?.full_technical_acceptance===false));
   assert(d.resources.every(r=>!/(?:YKK|SADEV|Sikasil|YCW|YUW|R1001)/iu.test(r.title_ru)));
   await assert.rejects(()=>compile(key,control(key,{glass_exact_method:'Другая внешне похожая система'})),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compile(key,control(key,{[param(p.bom[0].key)]:'-1'})),{code:'PARAMETER_VALIDATION_FAILED'});
   const zero=await compile(key,{[primary]:'0'});assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
  });
  test(key+' ordinary area plus fixed source method cannot manufacture a project BOM or lifting approval',async()=>{
   const p=pack(key),r=await compileConsumer(key,{[primary]:'100'},{confirmedParameters:{glass_exact_method:p.titleRu}});
   assert.equal(String(r.parameters[primary]),'100');assert.equal(r.parameters.glass_exact_method,p.titleRu);
   for(const id of ['glass_approved_BOM','glass_glass_frame_passports','glass_lifting_PPR','glass_scope_conditions'])
    assert.equal(r.parameters[id]??null,null,id);
   for(const b of p.bom){
    const id=param(b.key);assert.equal(r.parameters[id]??null,null,id);
    assert(!r.rows.some(row=>row.row_id===p.prefix+':bom:'+b.key&&row.quantity!==null),'MISSING_BOM_IS_NEITHER_A_TEST_FIXTURE_NOR_ZERO');
    assert(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes(id)),id);
   }
   assert(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes('glass_approved_BOM')));
   assert(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes('glass_lifting_PPR')));
   const knownScope=r.preliminaryNeeds.find(need=>need.row_id===p.prefix+':scope:whole');
   assert(knownScope&&knownScope.quantity!==null,'KNOWN_ORDINARY_SCOPE_MUST_SURVIVE_MISSING_PROJECT_CONTEXT');
   assert.equal(cmp(knownScope.quantity,'100'),0);assert.equal(knownScope.unit_id,'m2');
   assert.equal(knownScope.need_state,'CONDITION_REQUIRED');assert.equal(knownScope.selected,false);
   assert.deepEqual(r.preliminaryNeeds.filter(need=>need.quantity!==null).map(need=>need.row_id),[p.prefix+':scope:whole']);
   assert(r.preliminaryNeeds.filter(need=>need.row_id!==p.prefix+':scope:whole').every(need=>need.quantity===null));
   assert(!r.rows.some(row=>row.included_in_estimate||row.included_in_procurement));
  });
  test(key+' consumer form has one geometry field and refuses BOM/PPR/source submissions',()=>{
   assert.deepEqual(build(key).parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),[primary]);
   assert.throws(()=>compileConsumer(key,control(key)),{code:'PARAMETER_VALIDATION_FAILED'});
  });
 }
 test('purchasedfactorymodule does not pay again for unknown factoryglass/frame/gaskets/bond',async()=>{
  const p=pack('unitized'),d=build('unitized'),r=await compile('unitized',control('unitized'));
  assert(!d.resources.some(row=>/bom:(?:glass|frame-vertical|frame-horizontal)$/u.test(row.row_id)));
  for(const row of d.resources.filter(row=>row.row_id.includes(':need:factory-')))assert.equal(row.resource_graph.includedInResourceOwnerRowId,p.prefix+':bom:factory-modules');
  assert(!r.rows.some(row=>row.row_id.includes(':need:factory-')&&(row.included_in_estimate||row.included_in_procurement)));
 });
 test('temporaryretainers are actual stock with a separate unresolved period owner',async()=>{
  for(const key of ['structural','semi-structural']as const){const p=pack(key),r=await compile(key,control(key)),row=r.rows.find(row=>row.row_id===p.prefix+':bom:temporary-retainers');assert(row);assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);assert(r.preliminaryNeeds.some(n=>n.row_id===p.prefix+':need:retainer-period-owner'));}
 });
});
