// WORK proposal. Exact ROOT file admission belongs to the factory, not this pure metadata adapter.
import {manualTrench05701QuantityDefinitionR1 as historical,manualTrench05701QuantityPackR1 as pack,
 manualTrench05701NeedParameterIdsR1 as needParameters} from './manualSlopedTrenchGroup1Krer01QuantityR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const manualTrench05701CatalogIdR1='canonical-work:master:manual_trench_sloped_depth_upto2m_soil1_actual_bank_m3_krer01_02_057_01';
export const manualTrench05701WorkKeyR1='manual_trench_sloped_depth_upto2m_soil1_actual_bank_m3_krer01_02_057_01';
export const manualTrench05701SourceIdentityR1='kg:krer01:01-02-057-01:manual-trench:depth-le2m:no-support:designed-slopes:soil1:actual-bank-m3';
export const manualTrench05701GroupIdR1='wg:base:earthworks_interior_trench_excavate';
export const manualTrench05701RootDecisionStatusR1='ROOT_REVIEWED_SOURCE_SPECIFIC_PARTIAL_MANUAL_TRENCH05701_APPEND_R1';
export type ManualTrench05701RootScopeR1=Readonly<{
 contractVersion:'manual-trench05701-root-scope-provenance/r1';
 rootDecisionStatus:typeof manualTrench05701RootDecisionStatusR1;
 rootDecisionSha256:string;groupSourceCaptureSha256:string;sourceArtifactSha256:string;
 bodyReadSha256:'7341a49fef8f6dbeb0a77d977205566bc3acab2055d894290c074ab1677c0ef5';
 quantityScope:'PARTIAL';
}>;
export function manualTrench05701AdmittedDefinitionR1(scope:ManualTrench05701RootScopeR1):AutomaticOwnerDefinition{
 if(scope?.contractVersion!=='manual-trench05701-root-scope-provenance/r1'
  ||scope.rootDecisionStatus!==manualTrench05701RootDecisionStatusR1
  ||!/^[a-f0-9]{64}$/u.test(scope.rootDecisionSha256)
  ||scope.groupSourceCaptureSha256!=='4c131d2e1a5b21696494b03d3348c6d9f0a25b62a7b93ee633bfe143496816e7'
  ||scope.sourceArtifactSha256!==pack.source.sha256
  ||scope.bodyReadSha256!=='7341a49fef8f6dbeb0a77d977205566bc3acab2055d894290c074ab1677c0ef5'
  ||scope.quantityScope!=='PARTIAL')throw Error('MANUAL_TRENCH05701_EXACT_ROOT_SCOPE_REQUIRED');
 const base=historical();
 const resources=base.resources.map(resource=>{
  const need=resource.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM';
  const {row_sha256:_old,...body}=resource;
  const {catalogue_identity_pending:_identity,normative_binding_pending:_binding,...metadata}=resource.source_metadata??{};
  const changed={...body,source_metadata:{...metadata,
   ...(!need?{sourceRole:'OFFICIAL_NORM',normativeTrace:((metadata.normativeTrace??[]) as Record<string,unknown>[])
    .map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'}))}:{}),
   rootScopeProvenanceR1:{...scope,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,
    genericExcavationAlreadyExists:true,existingEightDisposition:'KEEP_CURRENT_IMMUTABLE',
    globalPhysicalAbsenceProved:false,machinePaidBranchAdmitted:false,purchaseOrderAdmitted:false,applicationNeedUnresolved:need}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // No catalogue-null historical flag becomes a runtime knob; no arithmetic/owner/inclusion edit.
 return {parameters:base.parameters,formulas:base.formulas,resources,runtimeInput:base.runtimeInput,
  runtimeClassification:base.runtimeClassification,runtimeSourceIds:base.runtimeSourceIds,ordinaryParameterIds:base.ordinaryParameterIds};
}
/** Exact append baseline map: project facts are KNOWN inputs, not DERIVED controls or runtime defaults.
 * The source array records this profile's provenance; it does not certify the project/product references. */
export function manualTrench05701ExplicitParameterSourcesR1(){
 const d=historical();return Object.fromEntries(d.parameters.map(parameter=>[parameter.parameter_id,
  needParameters.includes(parameter.parameter_id)?{kind:'UNRESOLVED' as const,sourceIds:[]}:
   {kind:'KNOWN' as const,sourceIds:[pack.sourceKeyProposal]}]));
}
