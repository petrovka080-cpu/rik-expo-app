import assert from 'node:assert/strict';
import {masterFacadeGlassCapturedParentR4 as captured,masterFacadeGlassRepresentativeR4 as original,buildMasterFacadeGlassWholeSuccessorR4 as build,compileMasterFacadeGlassWholeR4 as compileConsumer,masterFacadeGlassWholeControlR4 as control,masterFacadeGlassLegacyInputR4 as legacy,resolveMasterFacadeGlassPrimaryR4 as resolve,facadeGlassSelectorR4 as selector,facadeGlassFamilyChoiceR4 as choice,facadeGlassLegacyChoiceR4 as legacyChoice} from './masterFacadeGlassWholeFamilyR4';
import {facadeGlassWholePackR4 as pack,facadeGlassWholePrimaryR4 as primary,type FacadeGlassWholeMethodKeyR4 as Key} from './facadeGlassWholeMethodsR4';
import {compileFacadeGlassOriginalParentR3 as independentOriginal} from '../../../../scripts/estimate/r4a13/facadeGlassCapturedParentReplaysR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const keys:readonly Key[]=['stick','structural','semi-structural','unitized','point-fixed'];
// Fixture imports are separate from consumer geometry/profile selection.
const visible=new Set([selector,primary,'glazing_area_m2','floors']);
const compile=(model:Parameters<typeof compileConsumer>[0],fixture:Record<string,unknown>,options:Parameters<typeof compileConsumer>[2]={})=>{
 const input=Object.fromEntries(Object.entries(fixture).filter(([id])=>visible.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>!visible.has(id)));
 return compileConsumer(model,input,{...options,confirmedParameters});
};
// This is the exact independent original capture before the new overlay, not
// a baseline regenerated from the successor. Product execution UNRUN by author.
describe('retained existingcurtain-wall owner with5wholemethods R4',()=>{
 test('all45oldrows match independent original baseline with separate explicitselector patch',async()=>{
  const raw=captured().baseline.input_values,beforeRaw=JSON.stringify(raw),before=await independentOriginal('curtain_wall_system');
  const p=original(),beforeParent=JSON.stringify(p),m=build(p),after=await compile(m,legacy());
  const view=(r:typeof before)=>({rows:r.rows.map(x=>[x.row_id,x.unit_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds,totals:r.totals});
  assert.deepEqual(view(after),view(before));assert.equal(p.resources.length,45);assert.deepEqual(m.resources.slice(0,45).map(r=>r.row_id),p.resources.map(r=>r.row_id));assert.equal(after.rows.length,before.rows.length);assert.equal(JSON.stringify(p),beforeParent);assert.equal(JSON.stringify(captured().baseline.input_values),beforeRaw);
  assert(!Object.hasOwn(raw,selector));assert.equal(legacy()[selector],legacyChoice);
 });
 for(const key of keys)test(key+' activatesonlyownnewsourcequantities andneeds',async()=>{
  const m=build(original()),p=pack(key),result=await compile(m,control(key));
  assert(result.rows.every(r=>r.row_id.startsWith(p.prefix+':')));assert.equal(result.preliminaryNeeds.length,p.needs.length);
  assert(result.preliminaryNeeds.every(n=>n.row_id.startsWith(p.prefix+':need:')&&n.quantity===null));
  const scope=result.rows.find(r=>r.row_id===p.prefix+':scope:whole');assert(scope);assert.equal(cmp(scope.quantity,'100'),0);assert.equal(scope.included_in_estimate,false);
  const q=m.parameters.find(q=>q.parameter_id===primary);assert(q);assert.equal(q.default_value,null);assert(q.truth_metadata.formula_consumers.length>0);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:m.passport.decision.independentCompletenessMap,formulaDefinitions:m.formulas,resourceDefinitions:m.resources}),[]);
 });
 test('original45formulaobjects/rowIDs/geometrydefaults and historical service defaults retained without hidden fallback',()=>{
  const p=original(),before=JSON.stringify(p),m=build(p);
  assert.deepEqual(m.formulas.slice(0,45),p.formulas);assert.deepEqual(m.resources.slice(0,45).map(r=>r.row_id),p.resources.map(r=>r.row_id));
  for(const q of p.parameters){const next=m.parameters.find(n=>n.parameter_id===q.parameter_id)!;
   if(['glazing_area_m2','floors'].includes(q.parameter_id))assert.equal(next.default_value,q.default_value);
   else{assert.equal(next.default_value,null);assert.equal(next.truth_metadata.provenance.retained_legacy_default_value_v1,q.default_value);}}
  assert.equal(JSON.stringify(p),before);assert.equal(m.definition.catalog_id,'canonical-work:expanded:curtain_wall_system');
  assert.equal(m.definition.applicability.wholeGlassR4.additionalTwoExistingOwnersUntouched,true);
  assert.equal(m.passport.decision.completeTechnicalEstimateAccepted,false);
 });
 test('oldandnewprimaryneednewroot although botharem2;newmethodchangesretain newprimaryidentity',()=>{
  const m=build(original()),newInput=control('structural');
  const changed=resolve(m,newInput,{parameterId:'glazing_area_m2',unitId:'m2'});assert.equal(changed.kind,'NEW_ROOT_REQUIRED');if(changed.kind==='NEW_ROOT_REQUIRED')assert.deepEqual(changed.carryForward,{parameters:false,rowOverrides:false,prices:false});
  const same=resolve(m,control('unitized'),{parameterId:primary,unitId:'m2'});assert.equal(same.kind,'RESOLVED');
  assert.equal(resolve(m,legacy(),{parameterId:primary,unitId:'m2'}).kind,'NEW_ROOT_REQUIRED');
 });
 test('missingorunknownselectorcannot silentlyfall backtooldquantities',()=>{
  const m=build(original());assert.equal(resolve(m,captured().baseline.input_values).kind,'CLARIFICATION_REQUIRED');
  assert.equal(resolve(m,{[selector]:'Другая похожая система'}).kind,'CLARIFICATION_REQUIRED');
  assert.equal(m.parameters.find(q=>q.parameter_id===selector)!.default_value,null);
 });
 test('changedparenthash/inputgraphorwrongownerisrejectedbeforeoverlay',()=>{
  const p=original(),bad=structuredClone(p);bad.formulas[0].expression_source='1';assert.throws(()=>build(bad),/EXACT_CAPTURED_PARENT_PREIMAGE/u);
  const other=structuredClone(p);other.definition.catalog_id='canonical-work:expanded:high_rise_glazing';assert.throws(()=>build(other),/EXACT_CAPTURED_PARENT_PREIMAGE/u);
 });
 test('referenceprice200ontemporaryretainerstocksurviveswithnopayorprocurement',async()=>{
  const m=build(original()),p=pack('structural'),id=p.prefix+':bom:temporary-retainers',r=await compile(m,control('structural'),{rowOverrides:{[id]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY reference stock price'}}}}),row=r.rows.find(row=>row.row_id===id);assert(row);
  assert(row.unit_price!==null&&row.amount!==null,'ACTUAL_REFERENCE_PRICE_AND_AMOUNT_REQUIRED');
  assert.equal(cmp(row.unit_price,'200'),0);assert.equal(cmp(row.amount,'19200'),0);assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
 });
 test('pointfixedscopecannotacceptIGUorweathersafetybynamealone',async()=>{
  const m=build(original()),input=control('point-fixed'),id=Object.keys(input).find(k=>k.endsWith('_glass_scope_conditions'))!;assert(id);
  await assert.rejects(()=>compile(m,{...input,[id]:'ОБЫЧНЫЙ_ГЕРМЕТИЧНЫЙ_СТЕКЛОПАКЕТ_ОТАПЛИВАЕМОГО_ФАСАДА'}),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('new profiles expose one area plus existing ready-profile choice, never BOM/PPR/source fields',()=>{
  const model=build(original()),allowed=new Set([selector,primary,'glazing_area_m2','floors']);
  assert(model.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').every(p=>allowed.has(p.parameter_id)));
  assert.throws(()=>compileConsumer(model,control('stick')),{code:'PARAMETER_VALIDATION_FAILED'});
 });
});
