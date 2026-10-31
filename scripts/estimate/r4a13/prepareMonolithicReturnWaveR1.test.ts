import {monolithicReturnWaveTargetsR1 as targets,monolithicReturnWaveConfigR1 as config} from './prepareMonolithicReturnWaveR1';
import {monolithicPhysicalCaptureR2 as capture} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {PHYSICAL_R2_MODE,PHYSICAL_R2_LEGACY} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionR2';
import {monolithicRemainingPackR1 as structures} from '../../../src/lib/estimate/v4/monolithicRemainingKrer06R1';
import {masterRetainParentBindingsOptInR1,prepareMasterRetainedBindingRepresentativeR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {buildMasterCapabilityMatrix,buildMasterScopeReadiness,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
const context={releaseId:'d91453c6-20a0-5b18-9995-cb24731bd72d',searchReleaseId:'ab1eff60-cd53-5c8a-8374-2e83ab66b2f7'};
function inputFor(c:ReturnType<typeof config>){const newSource={id:'10000000-0000-5000-8000-000000000001',source_key:c.sourceId,title_ru:c.sourceMetadata.source_title,
 authority:c.sourceMetadata.source_authority,official_url:c.sourceMetadata.official_url,artifact_sha256:c.sourceMetadata.artifact_sha256,effective_from:null,effective_to:null,metadata:{}};
 const locator={id:'10000000-0000-5000-8000-000000000002',source_id:newSource.id,locator_key:c.locator.key,locator:c.locator.payload,excerpt_sha256:'a'.repeat(64)};
 return{input:{config:c,newSource,newLocators:[locator]},locator};}
describe('one concrete composition on each ORIGINAL current card',()=>{
 test('exactly eight current cards and eight distinct composite source keys',()=>{
  expect(targets).toHaveLength(8);expect(new Set(targets.map(t=>config(context,t.catalogId).sourceId)).size).toBe(8);
 });
 test.each(targets)('preserves historical runtime inputs and pending closure: $catalogId',t=>{
  const c=config(context,t.catalogId),old=capture(t.catalogId),ids=Object.keys(old.baseline.input_values),{input,locator}=inputFor(c),opt=c.binding.retainParentBindings!;
  expect(opt.capturedParent.definition.id).toBe(t.definitionId);expect(c.runtimeProfileInput).toEqual(old.baseline.input_values);
  for(const id of ids)expect(c.acceptanceInput[id]).toEqual(old.baseline.input_values[id]);
  expect(c.acceptanceInput[PHYSICAL_R2_MODE]).toBe(PHYSICAL_R2_LEGACY);
  expect(Object.keys(c.runtimeProfileSourceIds!).sort()).toEqual(ids.sort());
  expect(masterRetainParentBindingsOptInR1(input)).not.toBeNull();
  const e=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions,
   newBindings:[c.binding.rowId,...c.binding.additionalRowIds!].map(row_id=>({row_id,locator_id:locator.id,applicability:c.binding.applicabilityByRowId![row_id]})),
   successorProvenance:{parentDefinitionId:old.definition.id,parentBaselineId:old.baseline.id,capturedParentSha256:opt.capturedParentSha256}});
  for(const [id,sources]of Object.entries(old.baseline.normative_source_ids))expect(e.normativeSourceIds[id]).toEqual(sources);
  const gaps=c.passport.unresolvedApplicableResourceRowIds;
  expect(canonicalPublisherQuantityScopeIsConsistent({parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions,
   baseline:{input_values:c.acceptanceInput},passport:{decision:buildMasterScopeReadiness(gaps,c.resourceDefinitions),capability_matrix:buildMasterCapabilityMatrix(gaps,c.resourceDefinitions)}})).toBe(true);
  for(const rowId of old.contentPassport.decision.unresolvedResourceRowIds??[])expect(gaps).toContain(rowId);
  expect(validateIndependentCompletenessMapReferences({completenessMap:c.passport.independentCompletenessMap!,formulaDefinitions:c.formulaDefinitions,resourceDefinitions:c.resourceDefinitions})).toEqual([]);
  expect(c.applicability.fullTechnicalAcceptance).toBe(false);expect(c.applicability.newFullTechnologies).toBe(0);
  expect(c.locator.payload.originalCurrentParentDefinitionId).toBe(old.definition.id);
 });
 test('synthetic new technology controls never become saved runtime defaults',()=>{
  for(const t of targets.filter(t=>structures.profiles.some(p=>p.catalogId===t.catalogId))){const c=config(context,t.catalogId),old=capture(t.catalogId);
   expect(c.acceptanceInput[structures.selectorId]).toEqual(old.baseline.input_values[structures.selectorId]);
   for(const p of c.parameterDefinitions.filter(p=>p.parameter_id.startsWith('mono_remaining_'))){expect(c.runtimeProfileInput).not.toHaveProperty(p.parameter_id);}
  }
 });
 test('old formwork zero normative gaps are not converted to a fabricated new application norm',()=>{
  const c=config(context,targets[0]!.catalogId);expect(c.passport.unresolvedApplicableResourceRowIds).toBeUndefined();
  expect(c.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(0);
  expect(c.applicability.fullTechnicalAcceptance).toBe(false);
 });
});
