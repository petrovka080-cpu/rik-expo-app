import fixture from '../../../data/estimate-benchmarks/fixtures/basin-mixer-current-retained-parent-r2.json';
import {grohe33265002RegistryDescriptorWorkR1} from '../../../work/stream-c-plumbing-mixer/grohe33265002RegistryDescriptorWorkR1';
import {prepareBasinMixerGrohe33265002RetainedDraftWorkR1} from '../../../work/stream-c-plumbing-mixer/prepareBasinMixerGrohe33265002RetainedWorkR1';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,assertMasterRetainedParentComputationR1,
 type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalPublisherRegisteredSourceKeysR1} from './canonicalDefinitionPublisherR1';

const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const input=():MasterRetainedBindingGuardInputR1=>{
 const c=clone(fixture.capturedParent),r=grohe33265002RegistryDescriptorWorkR1();
 return {config:{stopCode:'TEST_LEGACY_TEMPLATE',catalogId:c.definition.catalog_id,parentReleaseId:c.definition.release_id,
  binding:{retainParentBindings:{capturedParent:c,capturedParentSha256:fixture.capturedParentSha256,newParameterSources:{},
   legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
    parameterSources:{q:clone(c.baseline.normative_source_ids.q)}}}}},newSource:r.managedSource,newLocators:r.managedLocators};
};
describe('explicit frozen legacy template input provenance',()=>{
 it('preserves an actual approved assumption while keeping it out of physical normative sources',()=>{
  const i=input(),r=masterRetainParentBindingsOptInR1(i)!;
  expect(r.capturedParent.normativeSources).toEqual([]);expect(r.capturedParent.bindings).toEqual([]);
  expect(r.capturedParent.baseline.input_classification.q).toBe('ASSUMPTION');
 });
 it('keeps the old fail-closed default for an undeclared missing registry source',()=>{
  const i=input();delete (i.config.binding.retainParentBindings as any).legacyTemplateAssumptionSources;
  expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow('CAPTURE_BASELINE_SOURCE_CLOSURE');
 });
 it.each([null,undefined,{}, {contract:'other'}])('does not treat invalid opt-in %p as omission',value=>{
  const i=input();(i.config.binding.retainParentBindings as any).legacyTemplateAssumptionSources=value;
  expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow('LEGACY_TEMPLATE_ASSUMPTION_DECLARATION');
 });
 it.each(['input_classification','approved_value','source_tree','bound_source','formula_consumers','template_identity'])('rejects a forged %s even after the capture hash is recomputed',kind=>{
  const i=input(),r=i.config.binding.retainParentBindings!,c=r.capturedParent as any,b=c.parameters[0].truth_metadata.provenance.approvedTemplateBinding;
  if(kind==='input_classification')c.baseline.input_classification.q='CONFIRMED_NORM';
  if(kind==='approved_value')b.value=77;
  if(kind==='source_tree')b.sourceTree='0'.repeat(40);
  if(kind==='bound_source')b.normativeSourceIds=['unrelated:source'];
  if(kind==='formula_consumers')b.formulaConsumerIds=[];
  if(kind==='template_identity')c.definition.source_metadata.templateId='unrelated-template';
  (r as any).capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow('LEGACY_TEMPLATE_ASSUMPTION_');
 });
 it('forbids using the old assumption as a new quantity norm',()=>{
  const i=input(),c=i.config.binding.retainParentBindings!.capturedParent;
  expect(()=>assertMasterRetainedParentComputationR1(i,{parameters:c.parameters,resources:c.resources,
   formulas:[...c.formulas,{formula_id:'TEST_NEW_QUANTITY',input_parameter_ids:['q'],ast:compileFormulaGraph('q')}]},'REPRESENTATIVE'))
   .toThrow('LEGACY_TEMPLATE_ASSUMPTION_NOT_A_NEW_QUANTITY_NORM');
 });
 it('actual successor retains old manual price/title/quantity/exclusion and one complete-kit owner',async()=>{
  const d=prepareBasinMixerGrohe33265002RetainedDraftWorkR1({capturedParent:fixture.capturedParent,capturedParentSha256:fixture.capturedParentSha256,
   parentPassport:fixture.passport,parentSearch:fixture.search,parentPriceBindings:fixture.priceBindings});
  await expect(d.verifyCore()).resolves.toMatchObject({legacyManualTitleQuantityPriceExclusionPreserved:true,oneProductPurchaseOwner:true,
   newLaborHoursNormClaimed:false,nextShape:[65,103,103]});
  expect(d.legacyBaselineProfile).toEqual({input:fixture.capturedParent.baseline.input_values,
   classification:fixture.capturedParent.baseline.input_classification,sourceIds:fixture.capturedParent.baseline.normative_source_ids});
  expect(d.legacyBaselineProfile.input.q).toBe(100);expect(d.legacyBaselineProfile.classification.q).toBe('ASSUMPTION');
  for(const parameter of d.next.parameters.filter(p=>p.truth_metadata.visibility_role!=='INTERNAL_ONLY'))
   expect(parameter.truth_metadata.guide).toMatchObject({applicability:expect.any(String)});
 });
});

describe('publisher registered sources and exact historical assumption provenance',()=>{
 function setup(){
  const i=input(),c=i.config.binding.retainParentBindings!.capturedParent;
  const d=prepareBasinMixerGrohe33265002RetainedDraftWorkR1({capturedParent:fixture.capturedParent,capturedParentSha256:fixture.capturedParentSha256,
   parentPassport:fixture.passport,parentSearch:fixture.search,parentPriceBindings:fixture.priceBindings});
  const plan:any={...d.next,definition:{catalog_id:c.definition.catalog_id},baseline:{...clone(c.baseline),
   source_definition_version_id:c.definition.id,supersedes_baseline_id:c.baseline.id,
   normative_source_ids:{...clone(c.baseline.normative_source_ids),[d.next.parameters[1]!.parameter_id]:[i.newSource.source_key]}}};
  const observed:string[]=[];
  const client:any={query:async(sql:string,values:any[])=>{
   observed.push(sql);expect(sql.trim().startsWith('select ')).toBe(true);
   let rows:any[];
   if(sql.includes('estimate_cumulative_manifest_entry'))rows=[{release_id:i.config.parentReleaseId,catalog_id:i.config.catalogId,
    definition_version_id:c.definition.id,approved_template_baseline_id:c.baseline.id,definition_hash:c.definition.definition_sha256}];
   else if(sql.includes('from public.estimate_normative_source')&&values[0]===i.newSource.id)rows=[{...clone(i.newSource),created_at:'2026-10-20T00:00:00+00:00'}];
   else if(sql.includes('from public.estimate_normative_locator')&&values[1]===i.newSource.id)rows=[...i.newLocators];
   else {const table=sql.match(/from public\.(estimate_[a-z_]+)/)?.[1];
    const byTable:Record<string,any[]>={estimate_definition_version:[c.definition],estimate_approved_template_baseline:[c.baseline],
     estimate_parameter_definition:[...c.parameters],estimate_formula_graph:[...c.formulas],estimate_resource_spec:[...c.resources],
     estimate_work_normative_binding:[...c.bindings],estimate_normative_locator:[...c.normativeLocators],estimate_normative_source:[...c.normativeSources]};
    if(!table||!Object.hasOwn(byTable,table))throw Error('UNEXPECTED_SQL');rows=byTable[table]!;
   }
   return{rows:rows.map(row=>({raw:JSON.stringify(row)}))};
  }};
  return{i,c,d,plan,client,observed};
 }
 it('default retains the complete source requirement without silently skipping unknown keys',async()=>{
  const s=setup();expect(await canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan)).toEqual(
   [s.i.newSource.source_key,...s.c.baseline.normative_source_ids.q].sort());expect(s.observed).toEqual([]);
 });
 it('separates only the captured assumption after reading the exact registered source and full parent',async()=>{
  const s=setup(),before=clone(s.plan);expect(await canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).toEqual([s.i.newSource.source_key]);
  expect(s.observed.some(sql=>sql.includes('estimate_normative_source'))).toBe(true);expect(s.plan).toEqual(before);
 });
 it.each(['newSourceUse','sourceArray','value','unit','classification','lineage','newFormula','forgedParent'])('rejects %s',async kind=>{
  const s=setup();
  if(kind==='newSourceUse')s.plan.baseline.normative_source_ids.forged=s.c.baseline.normative_source_ids.q;
  if(kind==='sourceArray')s.plan.baseline.normative_source_ids.q=[s.i.newSource.source_key];
  if(kind==='value')s.plan.baseline.input_values.q='777';
  if(kind==='unit')s.plan.baseline.uom_by_parameter.q='item';
  if(kind==='classification')s.plan.baseline.input_classification.q='CONFIRMED_NORM';
  if(kind==='lineage')s.plan.baseline.supersedes_baseline_id='forged';
  if(kind==='newFormula')s.plan.formulas=[...s.plan.formulas,{formula_id:'FORGED_NEW',input_parameter_ids:['q'],ast:compileFormulaGraph('q')}];
  if(kind==='forgedParent')s.client.query=async()=>({rows:[]});
  await expect(canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).rejects.toThrow();
 });
 it('requires the explicit retained contract even when a caller supplies a context',async()=>{
  const s=setup();delete(s.i.config.binding.retainParentBindings as any).legacyTemplateAssumptionSources;
  await expect(canonicalPublisherRegisteredSourceKeysR1(s.client,s.plan,s.i)).rejects.toThrow('CAPTURE_BASELINE_SOURCE_CLOSURE');
 });
});
