import fixture from '../../../data/estimate-benchmarks/fixtures/asphalt-standard-captured-fixture-provenance-r571.json';
import {canonicalPublisherRegisteredSourceKeysR1,canonicalPublisherRequiredBindingSourceKeysR1} from './canonicalDefinitionPublisherR1';
import {prepareAsphaltInstallExistingStandardDraftR564} from './prepareAsphaltInstallExistingStandardR564';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,
 assertMasterRetainedParentComputationR1,type MasterRetainedBindingGuardInputR1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';

const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function setup(index=0){
 const parent=fixture.parents[index]!,c=clone(parent.capturedParent) as MasterRetainedParentCaptureR1,registered=new Set(c.normativeSources.map(s=>s.source_key));
 const parameterSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids as Record<string,string[]>).map(([id,keys])=>
  [id,keys.filter(key=>!registered.has(key))]).filter(([,keys])=>(keys as string[]).length));
 const newSource={id:'10000000-0000-5000-8000-000000000571',source_key:'test-new-registered-physical-source-r571',
  title_ru:'Проверенный источник новой физической нормы',authority:'TEST',official_url:null,
  artifact_sha256:'a'.repeat(64),effective_from:null,effective_to:null,metadata:{test:true}};
 const newLocators=[{id:'10000000-0000-5000-8000-000000000572',source_id:newSource.id,
  locator_key:'test-r571',locator:{page:1},excerpt_sha256:'b'.repeat(64)}];
 const i:MasterRetainedBindingGuardInputR1={config:{stopCode:'TEST_CAPTURED_FIXTURE',catalogId:c.definition.catalog_id,
  parentReleaseId:c.definition.release_id,binding:{retainParentBindings:{capturedParent:c,
   capturedParentSha256:parent.capturedParentSha256,newParameterSources:{},
   legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1',parameterSources}}}},newSource,newLocators};
 const plan:any={definition:{catalog_id:c.definition.catalog_id},parameters:clone(c.parameters),formulas:clone(c.formulas),
  resources:clone(c.resources),baseline:{...clone(c.baseline),source_definition_version_id:c.definition.id,supersedes_baseline_id:c.baseline.id}};
 const observed:string[]=[];
 const client:any={query:async(sql:string,values:any[])=>{
  observed.push(sql);expect(sql.trim().startsWith('select ')).toBe(true);let rows:readonly any[];
  if(sql.includes('estimate_cumulative_manifest_entry'))rows=[{release_id:i.config.parentReleaseId,catalog_id:i.config.catalogId,
   definition_version_id:c.definition.id,approved_template_baseline_id:c.baseline.id,definition_hash:c.definition.definition_sha256}];
  else if(sql.includes('from public.estimate_normative_source')&&values[0]===newSource.id)rows=[{...clone(newSource),
   created_at:(i.config.binding as any).reuseExistingNormativeRegistry?.source.created_at??'2026-10-20T00:00:00+00:00'}];
  else if(sql.includes('from public.estimate_normative_locator')&&values[1]===newSource.id)rows=clone(newLocators);
  else {
   const table=sql.match(/from public\.(estimate_[a-z_]+)/)?.[1];
   const tables:Record<string,readonly any[]>={estimate_definition_version:[c.definition],estimate_approved_template_baseline:[c.baseline],
    estimate_parameter_definition:c.parameters,estimate_formula_graph:c.formulas,estimate_resource_spec:c.resources,
    estimate_work_normative_binding:c.bindings,estimate_normative_locator:c.normativeLocators,estimate_normative_source:c.normativeSources};
   if(!table||!Object.hasOwn(tables,table))throw Error('UNEXPECTED_SQL');rows=clone(tables[table]!);
  }
  return{rows:rows.map(row=>({raw:JSON.stringify(row)}))};
 }};
 return{i,c,plan,client,observed};
}
describe('exact captured fixture provenance remains historical',()=>{
 it.each([0,1,2])('admits only the actual reviewed parent %i and keeps all bytes unchanged',index=>{
  const s=setup(index),before=clone(s.i);expect(()=>masterRetainParentBindingsOptInR1(s.i)).not.toThrow();expect(s.i).toEqual(before);
  expect(Object.values(s.c.baseline.input_classification).every(x=>x==='VALIDATION_FIXTURE'||x==='DERIVED')).toBe(true);
 });
 it('keeps the undeclared missing-registry-source default closed',()=>{
  const s=setup();delete(s.i.config.binding.retainParentBindings as any).legacyCapturedFixtureSources;
  expect(()=>masterRetainParentBindingsOptInR1(s.i)).toThrow('CAPTURE_BASELINE_SOURCE_CLOSURE');
 });
 it.each([null,undefined,{},false])('rejects a malformed present opt-in %p',value=>{
  const s=setup();(s.i.config.binding.retainParentBindings as any).legacyCapturedFixtureSources=value;
  expect(()=>masterRetainParentBindingsOptInR1(s.i)).toThrow('LEGACY_CAPTURED_FIXTURE_');
 });
 it.each(['value','classification','source','metadata','formula','catalog'])('rejects recomputed forged capture %s',kind=>{
  const s=setup(),c=s.c as any,opt=s.i.config.binding.retainParentBindings as any;
  if(kind==='value')c.baseline.input_values.area_m2=10000;
  if(kind==='classification')c.baseline.input_classification.area_m2='CONFIRMED_NORM';
  if(kind==='source')c.baseline.normative_source_ids.area_m2=['invented-source'];
  if(kind==='metadata')c.definition.source_metadata.contract='unrelated';
  if(kind==='formula')c.formulas[0].expression_source='area_m2*100';
  if(kind==='catalog'){c.definition.catalog_id='canonical-work:base:unreviewed_standard';c.baseline.catalog_id=c.definition.catalog_id;(s.i.config as any).catalogId=c.definition.catalog_id;}
  opt.capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  expect(()=>masterRetainParentBindingsOptInR1(s.i)).toThrow('LEGACY_CAPTURED_FIXTURE_EXACT_REVIEWED_PARENT');
 });
 it.each(['omit','extra','registered','other'])('requires the exact unregistered per-parameter map %s',kind=>{
  const s=setup(),map=(s.i.config.binding.retainParentBindings as any).legacyCapturedFixtureSources.parameterSources;
  if(kind==='omit')delete map.area_m2;if(kind==='extra')map.forged=['project_quantity_inputs_v3'];
  if(kind==='registered')map.area_m2.push('kg_krer_27_roadworks_2015');if(kind==='other')map.area_m2=['other'];
  expect(()=>masterRetainParentBindingsOptInR1(s.i)).toThrow('LEGACY_CAPTURED_FIXTURE_SOURCE_MAP');
 });
 it('prevents a new formula from treating a historical fixture as a quantity norm',()=>{
  const s=setup();s.plan.formulas.push({formula_id:'new-quantity-r571',input_parameter_ids:['area_m2']});
  expect(()=>assertMasterRetainedParentComputationR1(s.i,s.plan,'REPRESENTATIVE')).toThrow('LEGACY_CAPTURED_FIXTURE_NOT_A_NEW_QUANTITY_NORM');
 });
 it('prevents a new resource from laundering a fixture through an old formula',()=>{
  const s=setup(),old=s.c.resources.find(r=>s.c.formulas.find(f=>f.formula_id===r.formula_id)?.input_parameter_ids.includes('area_m2'))!;
  s.plan.resources.push({...clone(old),id:'new-id-r571',row_id:'new-row-r571'});
  expect(()=>assertMasterRetainedParentComputationR1(s.i,s.plan,'REPRESENTATIVE')).toThrow('LEGACY_CAPTURED_FIXTURE_NOT_A_NEW_QUANTITY_NORM');
 });
 it('separates provenance keys while preserving the registered roadworks source and re-reading the entire parent',async()=>{
  const s=setup(),before=clone(s.plan);
  expect(await canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).toEqual(['kg_krer_27_roadworks_2015']);
  expect(s.plan).toEqual(before);expect(s.observed.some(sql=>sql.includes('source_key=any'))).toBe(true);
 });
 it.each(['value','unit','classification','sourceArray','newSourceUse','changedDb'])('rejects publication drift %s',async kind=>{
  const s=setup();
  if(kind==='value')s.plan.baseline.input_values.area_m2=5000;
  if(kind==='unit')s.plan.baseline.uom_by_parameter.area_m2='m3';
  if(kind==='classification')s.plan.baseline.input_classification.area_m2='NORMATIVE';
  if(kind==='sourceArray')s.plan.baseline.normative_source_ids.area_m2=[];
  if(kind==='newSourceUse')s.plan.baseline.normative_source_ids.new_area=['project_quantity_inputs_v3'];
  if(kind==='changedDb')s.client.query=async()=>({rows:[]});
  await expect(canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).rejects.toThrow();
 });
 it.each([0,1,2])('keeps registered historical fixture source bytes without inventing a physical binding %i',async index=>{
  const s=setup(index),before=clone(s.plan);
  expect(await canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).toEqual(['kg_krer_27_roadworks_2015']);
  expect(await canonicalPublisherRequiredBindingSourceKeysR1(s.client,s.plan,s.i)).toEqual([]);
  expect(s.plan).toEqual(before);expect(s.observed.some(sql=>sql.includes('source_key=any'))).toBe(true);
 });
 it('keeps the ordinary source-binding closure strict when the captured declaration is absent',async()=>{
  const s=setup();expect(await canonicalPublisherRequiredBindingSourceKeysR1(s.client,s.plan)).toEqual([
   'kg_krer_27_roadworks_2015','project_quantity_inputs_v3','selected_equipment_passport_v1','selected_material_or_product_passport_v1']);
  expect(s.observed).toEqual([]);
 });
 it('requires the actual new physical source while preserving the old registered source in its baseline',async()=>{
  const s=setup(),d=prepareAsphaltInstallExistingStandardDraftR564();
  const {created_at:_created,...source}=d.binding.reuseExistingNormativeRegistry.source;
  Object.assign(s.i.newSource,source);(s.i.newLocators as any[]).splice(0,s.i.newLocators.length,...d.binding.reuseExistingNormativeRegistry.locators);
  (s.i.config as any).binding=d.binding;
  s.plan.parameters=d.model.parameters;s.plan.formulas=d.model.formulas;s.plan.resources=d.model.resources;
  s.plan.baseline.input_values={...s.c.baseline.input_values,...d.model.runtimeProfileInput};
  s.plan.baseline.normative_source_ids=d.representative.normativeSourceIds;
  const before=clone(s.plan);
  expect(await canonicalPublisherRequiredBindingSourceKeysR1(s.client,s.plan,s.i)).toEqual([source.source_key]);
  expect(s.plan).toEqual(before);expect(Object.values(s.plan.baseline.normative_source_ids).flat()).toContain('kg_krer_27_roadworks_2015');
 });
 it.each(['value','unit','classification','newSourceUse','newFormula','newResource'])('rejects historical registered fixture laundering %s',async kind=>{
  const s=setup(),id=Object.entries(s.c.baseline.normative_source_ids).find(([,keys])=>(keys as string[]).includes('kg_krer_27_roadworks_2015'))![0];
  if(kind==='value')s.plan.baseline.input_values[id]='777';
  if(kind==='unit')s.plan.baseline.uom_by_parameter[id]='invented-unit';
  if(kind==='classification')s.plan.baseline.input_classification[id]='CONFIRMED_NORM';
  if(kind==='newSourceUse')s.plan.baseline.normative_source_ids.new_norm=['kg_krer_27_roadworks_2015'];
  if(kind==='newFormula')s.plan.formulas.push({formula_id:'forged-new-registered-fixture',input_parameter_ids:[id]});
  if(kind==='newResource'){
   const formula=s.c.formulas.find(f=>f.input_parameter_ids.includes(id))!;
   s.plan.resources.push({...clone(s.c.resources.find(r=>r.formula_id===formula.formula_id)!),row_id:'forged-new-registered-fixture-row'});
  }
  await expect(canonicalPublisherRequiredBindingSourceKeysR1(s.client,s.plan,s.i)).rejects.toThrow();
 });
});
