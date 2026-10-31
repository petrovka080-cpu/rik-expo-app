import {facadeNvfSteelPorcelainDefinitionR221 as definition,facadeNvfSteelPorcelainCompletenessR221 as completeness,
 facadeNvfSteelPorcelainIdentityR221 as identity} from '../../../src/lib/estimate/v4/facadeNvfSteelPorcelainOneOwnerR221';
import {facadeSteelSidingDefinitionR59 as steelDefinition} from '../../../src/lib/estimate/v4/facadeSteelSidingWholeR59';
import {facadePorcelainDefinitionR59 as porcelainDefinition} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import type {MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

/** The two original source owners are not interchangeable. This descriptor is
 * an input requirement for ROOT's existing common publisher, not a second
 * registry/publisher, a fabricated current registry row or a new source key. */
export function facadeNvfSteelPorcelainSourceRequirementR221(){
 const source=(key:string,d:ReturnType<typeof steelDefinition>)=>({sourceKey:key,
  knownParameterIds:d.parameters.filter(p=>!['UNRESOLVED_APPLICATION_NORM','COMPILER_DERIVED_RESOURCE_QUANTITY'].includes(String(p.truth_metadata.value_source_role)))
   .map(p=>p.parameter_id),
  unresolvedParameterIds:d.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id),
  derivedParameterIds:d.parameters.filter(p=>p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY').map(p=>p.parameter_id),
  boundRowIds:d.resources.filter(r=>r.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id)});
 const steel=source(identity.steelSourceKey,steelDefinition()),porcelain=source(identity.porcelainSourceKey,porcelainDefinition());
 return{contract:'existing-nvf-two-original-source-authorities/r221',catalogId:identity.catalogId,
  currentDefinitionId:'301c5e16-0784-51ea-a6a0-cb6f889c464d',currentVersion:6,steel,porcelain,
  currentRegistryFacts:{steel:'ACTUAL_ABSENT_NORMAL_AND_LOCKED_R214',porcelain:'UNKNOWN_NO_CURRENT_SOURCEKEY_READ'},
  currentCommonContract:{primaryNewSources:1,additionalRegistryKind:'CAPTURED_EXISTING_ONLY',
   additionalKnownParameterMaximum:16,additionalBoundRowMaximum:32},
  requiredAdditionalPorcelainScope:{knownParameters:36,boundRows:115},
  alternateAdditionalSteelScope:{knownParameters:18,boundRows:43},
  noSourceIdAlias:true,noCompositeSourceKey:true,noFakeRegistryRows:true,noEmptySourceArraySubstitution:true,
  oldCapturedSourcesAndBaselinesUnchanged:true,normalLocked:'UNRUN_FOR_THIS_COMPOSITION',READY:false,FULL:false};
}
export function facadeNvfSteelPorcelainSourceOnlyPlanR221(){
 const model=definition(),map=completeness();return{identity,model,independentCompletenessMap:map,
  sourceRequirement:facadeNvfSteelPorcelainSourceRequirementR221(),publicationAdmission:'HOLD_SHARED_SOURCE_AUTHORITY_CONTRACT',
  actualConfigCoreNormalLocked:'UNRUN',READY:false,FULL:false};
}
/** Fail before ordinary Config/publisher while the common owner cannot express
 * both real source authorities. ROOT must resolve that existing contract; this
 * author does not weaken its limits or relabel porcelain as steel. */
export function facadeNvfSteelPorcelainMasterConfigR221(context:Readonly<{
 releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string;
}>):Config{
 void context;
 throw Object.assign(new Error('The existing shared publisher cannot yet bind both exact original whole source owners in one definition.'),{
  code:'EXISTING_NVF_TWO_SOURCE_AUTHORITY_CONTRACT_HOLD',
  sourceRequirement:facadeNvfSteelPorcelainSourceRequirementR221(),publisherCalls:0,databaseDml:0,coreCalls:0});
}
