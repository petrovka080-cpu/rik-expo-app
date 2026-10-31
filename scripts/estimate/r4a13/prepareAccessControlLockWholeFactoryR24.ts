// Existing metadata export only. Full isolated physical Config snapshots remain SOURCE/HOLD.
import {withAccessControlWholeOperationReferencesR1} from '../../../src/lib/estimate/v4/accessControlSystemR1';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1 as currentScopeManagedR5} from './prepareMasterSingleDefinitionSuccessorR1';
import {prepareMasterRetainedBindingRepresentativeR1 as currentScopeGuardR5,
 masterProjectScopeMetadataCompactR1 as currentScopeCompactR5,
 type MasterProjectScopeMetadataOnlyV1 as CurrentScopeModeR5} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionDefinitionR1';

export function accessControlCurrentProjectScopeMetadataConfigR5(input:Readonly<{
 hostConfig:MasterSingleDefinitionSuccessorConfig;capturedParentDefinition:AutomaticOwnerDefinition;
 mode:CurrentScopeModeR5;newSourcePaths:readonly string[];
 verifyCurrentScopeCore:(value:Readonly<{captured:AutomaticOwnerDefinition;candidate:AutomaticOwnerDefinition}>)=>ReturnType<MasterSingleDefinitionSuccessorConfig['verifyCore']>;
}>):MasterSingleDefinitionSuccessorConfig{
 const host=input.hostConfig,retained=host.binding.retainParentBindings,base=input.capturedParentDefinition;
 if(!retained||host.catalogAppend!==undefined||host.projectSourcePackagePath!==undefined
  ||host.capturedScopedNormativeRegistry!==undefined||host.binding.additionalRowIds!==undefined
  ||!host.binding.reuseExistingNormativeRegistry)throw Error('ACS_CURRENT_SCOPE_EXACT_NATIVE_SOURCE_REUSE_REQUIRED');
 if(Object.keys(retained).sort().join('|')!=='capturedParent|capturedParentSha256|newParameterSources'
  ||Object.keys(retained.newParameterSources).length!==0)throw Error('ACS_CURRENT_SCOPE_NO_MIXED_RETAINED_MODE');
 const capture=retained.capturedParent;
 if(capture.definition.source_metadata.contract!==host.contract
  ||!base.parameters.every(p=>p.truth_metadata.contract===host.contract))
  throw Error('ACS_CURRENT_SCOPE_NATIVE_PUBLICATION_CONTRACT_REQUIRED');
 for(const [configured,captured,provided]of[[host.parameterDefinitions,capture.parameters,base.parameters],
  [host.formulaDefinitions,capture.formulas,base.formulas],[host.resourceDefinitions,capture.resources,base.resources]])
  if(canonicalEstimateStableJson(configured)!==canonicalEstimateStableJson(captured)||canonicalEstimateStableJson(captured)!==canonicalEstimateStableJson(provided))throw Error('ACS_CURRENT_SCOPE_FULL_NATIVE_CAPTURE_MISMATCH');
 if(canonicalEstimateStableJson(host.shortInput)!==canonicalEstimateStableJson(capture.baseline.input_values)||canonicalEstimateStableJson(host.acceptanceInput)!==canonicalEstimateStableJson(capture.baseline.input_values))
  throw Error('ACS_CURRENT_SCOPE_DIAGNOSTIC_BASELINE_CANNOT_GAIN_OBJECT_FACTS');
 const candidate=withAccessControlWholeOperationReferencesR1({catalogId:host.catalogId,definition:base,objectScopeR5:true});
 const nextRetained={capturedParent:capture,capturedParentSha256:retained.capturedParentSha256,newParameterSources:{},projectScopeMetadataOnlyV1:input.mode};
 let invoked=false;
 const config:MasterSingleDefinitionSuccessorConfig={...host,sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
  parameterDefinitions:candidate.parameters,formulaDefinitions:candidate.formulas,resourceDefinitions:candidate.resources,
  binding:{...host.binding,retainParentBindings:nextRetained},verifyCore:async()=>{
   if(invoked)throw Error('ACS_CURRENT_SCOPE_CORE_CALLBACK_ALREADY_INVOKED');invoked=true;
   // ROOT supplies/reviews this exact existing-core proof. No project facts are synthesized.
   const result=await input.verifyCurrentScopeCore({captured:base,candidate});
   return {...result,scopeMetadataOnly:true,sourceAdmission:false,engineeringAcceptance:false,FULL:false};
  }};
 // Same publisher assembler and same retained guard; no second admission/UUID path.
 const managed=currentScopeManagedR5(config,{projectSourcePackage:null,projectSourcePackageSet:null});
 currentScopeGuardR5(managed.retentionCandidate,{parameters:candidate.parameters,formulas:candidate.formulas,
  resources:candidate.resources,newBindings:[],successorProvenance:{contract:config.contract,parentDefinitionId:capture.definition.id,
   parentBaselineId:capture.baseline.id,capturedParentSha256:retained.capturedParentSha256,
   sourceFingerprint:canonicalEstimateSha256HexText(canonicalEstimateStableJson({parameters:candidate.parameters,formulas:candidate.formulas,resources:candidate.resources})),
   projectScopeMetadataOnlyV1:currentScopeCompactR5(nextRetained)}});
 return config;
}
