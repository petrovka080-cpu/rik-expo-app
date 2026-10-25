import {resolveMasterSingleDefinitionBindingRowIds,buildMasterCapabilityMatrix,buildMasterScopeReadiness} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {prepareAsphaltInstallExistingStandardR564} from './prepareAsphaltInstallExistingStandardR564';
import {asphaltInstallExistingStandardPackR564 as pack} from '../../../src/lib/estimate/v4/asphaltInstallExistingStandardR564';
import {resolvePrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';

describe('real existing Master preparation of fixed 50 mm asphalt work',()=>{
 it('retains the exact old parent and registry through the current shared guards',()=>{
  const config=prepareAsphaltInstallExistingStandardR564();
  expect(config.expectedParentShape).toEqual([20,26,26]);
  expect(config.binding).not.toHaveProperty('additionalRowIds');
  expect(resolveMasterSingleDefinitionBindingRowIds(config,config.resourceDefinitions,[pack.source.locatorId])).toEqual([config.binding.rowId]);
  expect(config.binding.retainParentBindings?.capturedParentSha256).toBe(pack.parent.sha256);
  expect(config.binding.reuseExistingNormativeRegistry).toMatchObject({source:{id:pack.source.id},locators:[{id:pack.source.locatorId}]});
 });
 it('uses the static measured primary with a protected internal method, without a public selector contract',()=>{
  const config=prepareAsphaltInstallExistingStandardR564();
  expect(config.applicability.primaryMeasureParameterId).toBe(pack.areaId);
  expect(config.applicability).not.toHaveProperty('primaryMeasureSelectionV1');
  expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:config.applicability.primaryMeasureSelectionV1,
   parameterSchema:[],submittedParameters:{}})).toEqual({kind:'LEGACY_PATH_UNCHANGED'});
  const runtime=canonicalApprovedBaselineRuntimeParameters({input_values:config.runtimeProfileInput,input_classification:config.runtimeProfileClassification});
  expect(runtime[pack.selectorId]).toBe(pack.selectedValueRu);expect(runtime).not.toHaveProperty(pack.areaId);
  expect(config.parameterDefinitions.find(p=>p.parameter_id===pack.selectorId)?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
 });
 it('executes the staged shared-core verification without a writer or a database',async()=>{
  await expect(prepareAsphaltInstallExistingStandardR564().verifyCore()).resolves.toMatchObject({
   status:'PASS_SELECTED_KRER_50_MM_EXISTING_STANDARD_CORE',selectedRows:56,needs:2,fullTechnicalAcceptance:false});
 });
 it('declares both real application-owned project gaps as partial scope in the actual publisher contract',()=>{
  const c=prepareAsphaltInstallExistingStandardR564(),rows=c.passport.unresolvedApplicableResourceRowIds;
  const input={parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions,
   baseline:{input_values:{...c.acceptanceInput,...c.runtimeProfileInput}},passport:{
    decision:buildMasterScopeReadiness(rows,c.resourceDefinitions),capability_matrix:buildMasterCapabilityMatrix(rows,c.resourceDefinitions)}};
  expect(rows).toHaveLength(2);expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(true);
  expect(input.passport.decision.quantityScope).toBe('PARTIAL');
  const pending=c.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM');
  expect(pending).toHaveLength(2);
  for(const p of pending){
   expect(p.truth_metadata.provenance.consumer_input_role_v1).toBe('APPLICATION_TECHNICAL');
   expect(input.baseline.input_values).not.toHaveProperty(p.parameter_id);
   const forged={...input,parameters:input.parameters.map(q=>q.parameter_id===p.parameter_id?{...q,truth_metadata:{...q.truth_metadata,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}:q)};
   expect(canonicalPublisherQuantityScopeIsConsistent(forged)).toBe(false);
  }
 });
});
