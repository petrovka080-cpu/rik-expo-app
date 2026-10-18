// WORK proposal. Exact ROOT file admission belongs to the factory, not this pure metadata adapter.
import {roadMarking01601QuantityDefinitionR1 as historical,roadMarking01601QuantityPackR1 as pack,
 roadMarking01601NeedParameterIdsR1 as needParameters} from './roadMarkingContinuous100Pf133QuantityR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const roadMarking01601CatalogIdR1='canonical-work:master:road_marking_continuous_100mm_pf133_darkgrey_actual_line_km_krer27_09_016_01';
export const roadMarking01601WorkKeyR1='road_marking_continuous_100mm_pf133_darkgrey_actual_line_km_krer27_09_016_01';
export const roadMarking01601SourceIdentityR1='kg:krer27:27-09-016-01:continuous:100mm:pf133-darkgrey:actual-line-km';
export const roadMarking01601GroupIdR1='wg:expanded:road_marking';
export const roadMarking01601RootDecisionStatusR1='ROOT_REVIEWED_SOURCE_SPECIFIC_PARTIAL_ROAD_MARKING01601_APPEND_R1';
export type RoadMarking01601RootScopeR1=Readonly<{
 contractVersion:'road-marking01601-root-scope-provenance/r1';
 rootDecisionStatus:typeof roadMarking01601RootDecisionStatusR1;
 rootDecisionSha256:string;groupSourceCaptureSha256:string;sourceArtifactSha256:string;
 bodyReadSha256:'deae249b7687926ac82f5f14cdc47e8c3bbe8b5927747fa6d412ffbc88badcaa';
 quantityScope:'PARTIAL';
}>;
export function roadMarking01601AdmittedDefinitionR1(scope:RoadMarking01601RootScopeR1):AutomaticOwnerDefinition{
 if(scope?.contractVersion!=='road-marking01601-root-scope-provenance/r1'
  ||scope.rootDecisionStatus!==roadMarking01601RootDecisionStatusR1
  ||!/^[a-f0-9]{64}$/u.test(scope.rootDecisionSha256)
  ||scope.groupSourceCaptureSha256!=='074ece84478be854a9077e28d1b1639af14505a4f6ed2a71e47798883e8ebbaf'
  ||scope.sourceArtifactSha256!==pack.source.sha256
  ||scope.bodyReadSha256!=='deae249b7687926ac82f5f14cdc47e8c3bbe8b5927747fa6d412ffbc88badcaa'
  ||scope.quantityScope!=='PARTIAL')throw Error('ROAD01601_EXACT_ROOT_SCOPE_REQUIRED');
 const base=historical();
 const resources=base.resources.map(resource=>{
  const need=resource.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM';
  const {row_sha256:_old,...body}=resource;
  const {catalogue_identity_pending:_identity,normative_binding_pending:_binding,...metadata}=resource.source_metadata??{};
  const changed={...body,source_metadata:{...metadata,
   ...(!need?{sourceRole:'OFFICIAL_NORM',normativeTrace:((metadata.normativeTrace??[]) as Record<string,unknown>[])
    .map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'}))}:{}),
   rootScopeProvenanceR1:{...scope,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,
    genericRoadMarkingAlreadyExists:true,otherFourInstallBodies:'HEADER_ONLY_NOT_EXCLUDED',
    globalPhysicalAbsenceProved:false,machinePaidBranchAdmitted:false,paintPurchaseAdmitted:false,
    cordPurchaseAdmitted:false,applicationNeedUnresolved:need}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // No catalogue-null historical flag becomes a runtime knob; no arithmetic/owner/inclusion edit.
 return {parameters:base.parameters,formulas:base.formulas,resources,runtimeInput:base.runtimeInput,
  runtimeClassification:base.runtimeClassification,runtimeSourceIds:base.runtimeSourceIds,ordinaryParameterIds:base.ordinaryParameterIds};
}
/** Exact append baseline map: project facts are KNOWN inputs, not DERIVED controls or runtime defaults.
 * The source array records this profile's provenance; it does not certify the project/product references. */
export function roadMarking01601ExplicitParameterSourcesR1(){
 const d=historical();return Object.fromEntries(d.parameters.map(parameter=>[parameter.parameter_id,
  needParameters.includes(parameter.parameter_id)?{kind:'UNRESOLVED' as const,sourceIds:[]}:
   {kind:'KNOWN' as const,sourceIds:[pack.sourceKeyProposal]}]));
}
