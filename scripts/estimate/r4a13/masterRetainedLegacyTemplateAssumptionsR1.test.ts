import fixture from '../../../data/estimate-benchmarks/fixtures/basin-mixer-current-retained-parent-r2.json';
import {grohe33265002RegistryDescriptorWorkR1} from '../../../work/stream-c-plumbing-mixer/grohe33265002RegistryDescriptorWorkR1';
import {prepareBasinMixerGrohe33265002RetainedDraftWorkR1} from '../../../work/stream-c-plumbing-mixer/prepareBasinMixerGrohe33265002RetainedWorkR1';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,assertMasterRetainedParentComputationR1,
 type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';

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
 });
});
