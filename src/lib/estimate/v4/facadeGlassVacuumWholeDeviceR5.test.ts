import assert from 'node:assert/strict';
import {
  facadeGlassVacuumWholeDefinitionR5 as build,compileFacadeGlassVacuumWholeR5 as compileConsumer,
  facadeGlassVacuumWholeControlR5 as control,facadeGlassVacuumWholeCompletenessR5 as map,
  facadeGlassVacuumNormParameterR5 as norm,facadeGlassVacuumPrefixR5 as prefix,
  facadeGlassVacuumPrimaryR5 as primary,facadeGlassVacuumDevicesR5 as count,
  facadeGlassVacuumControlMethodR5 as method,facadeGlassVacuumAuxControlR5 as auxiliary,
} from './facadeGlassVacuumWholeDeviceR5';
import type {CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {applyFacadeGlassVacuumWholeR5,facadeGlassVacuumSelectionR5 as selection,facadeGlassVacuumChoiceR5 as selectedDevice,facadeGlassVacuumApprovedMethodR5 as approvedMethod} from './facadeGlassVacuumWholeDeviceR5';
// The native device source tests do not consume historical family captures.
// Load that separate consumer only when its existing describe actually runs.
type FamilyRuntime=typeof import('./masterFacadeGlassWholeFamilyR4');
let familyBuild:FamilyRuntime['buildMasterFacadeGlassWholeSuccessorR4'];
let familyOriginal:FamilyRuntime['masterFacadeGlassRepresentativeR4'];
let familyControl:FamilyRuntime['masterFacadeGlassWholeControlR4'];
let compileFamily:FamilyRuntime['compileMasterFacadeGlassWholeR4'];
let familySelector:FamilyRuntime['facadeGlassSelectorR4'];
let familyChoice:FamilyRuntime['facadeGlassFamilyChoiceR4'];
import {facadeGlassWholePackR4 as familyPack,type FacadeGlassWholeMethodKeyR4 as FamilyKey} from './facadeGlassWholeMethodsR4';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const known=['lifter','pads','pad-covers','pad-screens','air-filters','battery-12v','buzzer-battery-9v','charger'];
const needs=['device-period-owner','primary-rigging','crane-operation','whole-labour','access-PPE','power','mild-pad-cleaner','pad-cleaning-water','lint-free-cloth','wear-and-spares','quality-services','delivery-store-feed','exact-version-service'];
// Literal whole-assembly inventory examples. No generator/formula evaluation
// manufactures expected quantities, no field production or wear norm claimed.
const oracles=[{devices:'1',quantities:['1','4','4','4','2','1','1','1']},
  {devices:'3',quantities:['3','12','12','12','6','3','3','3']}];
// TEST_ONLY approved source/readback fixture kept outside consumer inputs.
const compile=(fixture:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={})=>{
  const {[primary]:geometry,...confirmedParameters}=fixture;
  return compileConsumer({[primary]:geometry},{...options,confirmedParameters});
};
describe('whole vacuum device source component R5, same existing facade family, product UNRUN',()=>{
  for(const oracle of oracles)test('whole assigned stock '+oracle.devices+' preserves literal internal components without payment',async()=>{
    const result=await compile(control({[count]:oracle.devices}));
    assert.equal(result.rows.length,8);assert.equal(result.preliminaryNeeds.length,13);
    for(let n=0;n<known.length;n++) {
      const row=result.rows.find(r=>r.row_id===prefix+':stock:'+known[n]);assert(row);assert(row.quantity!==null,'ACTUAL_COMPLETE_DEVICE_STOCK_QUANTITY_REQUIRED');
      assert.equal(cmp(row.quantity,oracle.quantities[n]),0);
      assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);assert.equal(row.unit_price,null);
    }
    assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),needs.map(k=>prefix+':need:'+k).sort());
    assert(result.preliminaryNeeds.every(n=>n.quantity===null));
  });
  test('changed area cannot manufacture more lifters, crane time, consumables or wear',async()=>{
    const a=await compile(control()),b=await compile(control({[primary]:'200'}));
    assert.deepEqual(a.rows.map(r=>[r.row_id,r.quantity]),b.rows.map(r=>[r.row_id,r.quantity]));
    assert.deepEqual(a.preliminaryNeeds,b.preliminaryNeeds);
  });
  test('auxiliary handling is a conditional physical need, never an arbitrary extra lifter strap',async()=>{
    const result=await compile(control({[method]:auxiliary}));
    assert.equal(result.rows.length,8);assert.equal(result.preliminaryNeeds.length,14);
    const extra=result.preliminaryNeeds.find(n=>n.row_id===prefix+':need:aux-control');assert(extra);assert.equal(extra.quantity,null);
    assert(!build().resources.some(r=>/страховочн.*строп/iu.test(r.title_ru)));
  });
  for(const value of ['0','1','77'])test('all device internal norms protected from supplied quantity '+value,async()=>{
    for(const key of [...needs,'aux-control'])await assert.rejects(()=>compile(control({[method]:auxiliary,[norm(key)]:value})),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('manual version10.0 does not admit the10.6+ service version or earlier serial by a label',async()=>{
    await assert.rejects(()=>compile(control({glass_vacuum_software_version:'10.6'})),{code:'PARAMETER_VALIDATION_FAILED'});
    await assert.rejects(()=>compile(control({glass_vacuum_serial_number:'20230853'})),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('whole device number is actual positive integer, not area fallback',async()=>{
    for(const quantity of ['0','-1','1.5'])await assert.rejects(()=>compile(control({[count]:quantity})),{code:'PARAMETER_VALIDATION_FAILED'});
    const input=control();delete input[count];const result=await compile(input);
    assert(!result.rows.some(r=>r.row_id.startsWith(prefix+':stock:')));
    assert(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(count)));
  });
  test('zero work creates no stock or unknown operational needs',async()=>{
    const result=await compile({[primary]:'0'});assert.equal(result.rows.length,0);assert.equal(result.preliminaryNeeds.length,0);
  });
  test('raw reference price does not buy or pay for installed pads twice',async()=>{
    const rowId=prefix+':stock:pads',result=await compile(control(),{rowOverrides:{[rowId]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY reference stock price'}}}});
    const row=result.rows.find(r=>r.row_id===rowId);assert(row);
    assert(row.unit_price!==null&&row.amount!==null,'ACTUAL_REFERENCE_PRICE_AND_AMOUNT_REQUIRED');
    assert.equal(cmp(row.unit_price,'200'),0);assert.equal(cmp(row.amount,'800'),0);
    assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
    assert(result.preliminaryNeeds.some(n=>n.row_id===prefix+':need:device-period-owner'));
  });
  test('one protected period owner, generic public names, independent whole map and no defaults',()=>{
    const model=build();assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map(),formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
    assert(model.parameters.every(p=>p.default_value===null));
    for(const r of model.resources.filter(r=>r.row_id.includes(':stock:'))) {
      assert.equal(r.resource_graph.includedInResourceOwnerRowId,prefix+':need:device-period-owner');
      assert.equal(r.source_metadata?.full_technical_acceptance,false);
      assert(!/WPG|Powr.?Grip|MRT|G3370|Intelli/iu.test(r.title_ru));
    }
    assert.equal(map().parentGlassNeedNotAutomaticallyClosed,true);
  });
  test('consumer has one geometry question and cannot submit equipment/PPR/source facts',()=>{
    const visible=build().parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT');
    assert.deepEqual(visible.map(p=>p.parameter_id),[primary]);
    assert.throws(()=>compileConsumer(control()),{code:'PARAMETER_VALIDATION_FAILED'});
  });
});

// Reuse is exercised at the existing family consumer, rather than only in a
// source component. Fixtures are validation-only and use the trusted channel.
const familyInput=(key:FamilyKey,more:Record<string,unknown>={}):Record<string,unknown>=>({...familyControl(key),...control(),[selection]:selectedDevice,[approvedMethod]:familyChoice(key),...more});
const familyCompile=(key:FamilyKey,fixture:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
 const m=familyBuild(familyOriginal()),visible=new Set([primary,familySelector,'glazing_area_m2','floors']);
 return compileFamily(m,Object.fromEntries(Object.entries(fixture).filter(([id])=>visible.has(id))),{
  confirmedParameters:Object.fromEntries(Object.entries(fixture).filter(([id])=>!visible.has(id))),rowOverrides});
};
describe('whole existing vacuum component applied once to compatible glass family consumers R5',()=>{
 beforeAll(()=>{
  const family:FamilyRuntime=require('./masterFacadeGlassWholeFamilyR4');
  ({buildMasterFacadeGlassWholeSuccessorR4:familyBuild,masterFacadeGlassRepresentativeR4:familyOriginal,
    masterFacadeGlassWholeControlR4:familyControl,compileMasterFacadeGlassWholeR4:compileFamily,
    facadeGlassSelectorR4:familySelector,facadeGlassFamilyChoiceR4:familyChoice}=family);
 });
 test('whole factory identities and independent map attach once without new paid owners',()=>{
  const m=familyBuild(familyOriginal()),original=build();
  assert.equal(m.resources.filter(r=>String(r.row_id).startsWith(prefix+':')).length,22);
  assert.equal(new Set(m.resources.map(r=>r.row_id)).size,m.resources.length);
  assert.equal(new Set(m.formulas.map(r=>r.formula_id)).size,m.formulas.length);
  for(const f of original.formulas)assert.deepEqual(m.formulas.find(x=>x.formula_id===f.formula_id),f);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:m.passport.decision.independentCompletenessMap,formulaDefinitions:m.formulas,resourceDefinitions:m.resources}),[]);
  assert(m.resources.filter(r=>String(r.row_id).startsWith(prefix+':')).every(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'));
 });
 test('no selected equipment passport activates no particular vacuum device or component needs',async()=>{
  for(const key of ['stick','structural','semi-structural','point-fixed'] as const){
   const r=await familyCompile(key,familyControl(key));
   assert(!r.rows.some(x=>x.row_id.startsWith(prefix+':')));assert(!r.preliminaryNeeds.some(x=>x.row_id.startsWith(prefix+':')));
   assert(r.preliminaryNeeds.some(x=>x.row_id===familyPack(key).prefix+':need:glass-handling-post'));
  }
 });
 for(const oracle of oracles)test('actual family uses literal whole inventory for '+oracle.devices+' approved devices',async()=>{
  const r=await familyCompile('stick',familyInput('stick',{[count]:oracle.devices}));
  for(let i=0;i<known.length;i++){
   const item=r.rows.find(x=>x.row_id===prefix+':stock:'+known[i]);assert(item);assert(item.quantity!==null,'ACTUAL_FAMILY_STOCK_QUANTITY_REQUIRED');assert.equal(cmp(item.quantity,oracle.quantities[i]),0);
   assert.equal(item.included_in_estimate,false);assert.equal(item.included_in_procurement,false);
  }
  assert.equal(r.preliminaryNeeds.filter(n=>n.row_id.startsWith(prefix+':')).length,13);
  assert(r.preliminaryNeeds.some(n=>n.row_id===familyPack('stick').prefix+':need:glass-handling-post'&&n.quantity===null));
 });
 test('changed glass geometry does not multiply actual assigned equipment',async()=>{
  const a=await familyCompile('structural',familyInput('structural',{[primary]:'100'})),b=await familyCompile('structural',familyInput('structural',{[primary]:'250'}));
  for(const key of known){const x=a.rows.find(r=>r.row_id===prefix+':stock:'+key),y=b.rows.find(r=>r.row_id===prefix+':stock:'+key);assert(x&&y);assert(x.quantity!==null&&y.quantity!==null,'ACTUAL_BOTH_GEOMETRY_RESULTS_REQUIRED');assert.equal(cmp(x.quantity,y.quantity),0);}
 });
 test('source version and old serial cannot be borrowed into family use',async()=>{
  for(const patch of [{glass_vacuum_software_version:'10.6'},{glass_vacuum_serial_number:'20230853'},{[selection]:'OTHER_DEVICE'}])
   await assert.rejects(()=>familyCompile('point-fixed',familyInput('point-fixed',patch)),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('unitized assemblies are not admitted from a nominal load capacity',async()=>{
  await assert.rejects(()=>familyCompile('unitized',familyInput('unitized')),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('exact equipment selection is source-owned at wrapper and direct core even for equal echo',async()=>{
  const m=familyBuild(familyOriginal()),fixture=familyInput('stick'),submittedParameters={[primary]:'100',[familySelector]:familyChoice('stick')},confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>id!==primary&&id!==familySelector));
  for(const id of [selection,approvedMethod])for(const value of [fixture[id],null,undefined]){
   assert.throws(()=>compileFamily(m,{...submittedParameters,[id]:value},{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compileCanonicalEstimateCore({operation:'compile',compilerVersion:'TEST_ONLY_EXISTING_GLASS_DEVICE_REUSE',catalogId:m.definition.catalog_id,primaryMeasureParameterId:primary,parameterDefinitions:m.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],formulaDefinitions:m.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],resourceDefinitions:m.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],submittedParameters:{...submittedParameters,[id]:value},confirmedParameters,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:hash}),{code:'PARAMETER_VALIDATION_FAILED'});
  }
 });
 test('manual stock price stays reference-only and cannot create another purchase or payment',async()=>{
  const rowId=prefix+':stock:lifter',r=await familyCompile('stick',familyInput('stick'),{[rowId]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY preserved stock reference price'}}}),row=r.rows.find(x=>x.row_id===rowId);assert(row&&row.unit_price!==null);
  assert.equal(cmp(row.unit_price,'200'),0);assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
 });
 for(const substitute of ['unitized','unregistered'])test('whole device attachment rejects incompatible branch '+substitute,()=>{
  const m=familyBuild(familyOriginal()),allowed=['stick','structural','semi-structural','point-fixed'].map(key=>familyChoice(key as FamilyKey));
  allowed[3]=substitute==='unitized'?familyChoice('unitized'):'UNREGISTERED_GLASS_METHOD';
  assert.throws(()=>applyFacadeGlassVacuumWholeR5(m,{methodSelectorParameterId:familySelector,compatibleMethodValues:allowed,registeredFamilySourceId:'gox_facade_glass_retained_family_r4'}),/EXACT_REGISTERED_METHOD_COMPATIBILITY_REQUIRED/);
 });
 test('switching a compatible glass method cannot borrow the previous accepted lifting context',async()=>{
  await assert.rejects(()=>familyCompile('structural',familyInput('structural',{[approvedMethod]:familyChoice('stick')})),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('a missing method-bound lifting confirmation remains unknown and admits no device stock',async()=>{
  const fixture:Record<string,unknown>=familyInput('stick');delete fixture[approvedMethod];const r=await familyCompile('stick',fixture);
  assert(!r.rows.some(row=>row.row_id.startsWith(prefix+':stock:')));
  assert(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes(approvedMethod)));
  assert(r.preliminaryNeeds.some(need=>need.row_id===familyPack('stick').prefix+':need:glass-handling-post'&&need.quantity===null));
 });
 test('inactive device selection or zero geometry cannot turn an unused old approval into a blocker',async()=>{
  for(const patch of [{[selection]:undefined},{[primary]:'0'}]){
   const r=await familyCompile('structural',familyInput('structural',{[approvedMethod]:familyChoice('stick'),...patch}));
   assert(!r.rows.some(row=>row.row_id.startsWith(prefix+':stock:')));
  }
 });
 test('reapplying the same whole component refuses duplicate identities',()=>{
  const m=familyBuild(familyOriginal());assert.throws(()=>applyFacadeGlassVacuumWholeR5(m,{methodSelectorParameterId:familySelector,compatibleMethodValues:['stick','structural','semi-structural','point-fixed'].map(k=>familyChoice(k as FamilyKey)),registeredFamilySourceId:'gox_facade_glass_retained_family_r4'}),/ALREADY_ATTACHED/);
 });
});
