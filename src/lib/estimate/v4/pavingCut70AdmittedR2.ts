// R2 metadata-only promotion of frozen source quantities and six unresolved needs.
// A factory must verify the exact ROOT decision file pin before constructing this provenance.
import {pavingCut70ConditionalConsumerDefinitionR1 as conditional} from './pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityPackR1 as pack} from './pavingCutStationary70QuantityR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const pavingCut70RootDecisionStatusR2='ROOT_REVIEWED_SOURCE_SPECIFIC_PARTIAL_PAVING_CUT70_APPEND_R2';
export type PavingCut70RootScopeR2=Readonly<{
 contractVersion:'paving-cut70-root-scope-provenance/r2';
 rootDecisionStatus:typeof pavingCut70RootDecisionStatusR2;
 rootDecisionSha256:string;
 groupReadSha256:'b0c8f37eda9a1f40662e3b5afc98b107cd6e32eaf1f680ab53d83c9c2e1babeb';
 sourceArtifactSha256:string;
 quantityScope:'PARTIAL';
}>;
export function pavingCut70AdmittedDefinitionR2(scope:PavingCut70RootScopeR2):AutomaticOwnerDefinition{
 if(scope?.contractVersion!=='paving-cut70-root-scope-provenance/r2'
  ||scope.rootDecisionStatus!==pavingCut70RootDecisionStatusR2||!/^[a-f0-9]{64}$/u.test(scope.rootDecisionSha256)
  ||scope.groupReadSha256!=='b0c8f37eda9a1f40662e3b5afc98b107cd6e32eaf1f680ab53d83c9c2e1babeb'
  ||scope.sourceArtifactSha256!==pack.source.sha256||scope.quantityScope!=='PARTIAL')throw Error('CUT70_R2_EXACT_ROOT_SCOPE_REQUIRED');
 const base=conditional();
 const resources=base.resources.map(r=>{
  const need=r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM';
  const {row_sha256:_old,...body}=r;
  const {catalogue_identity_pending:_identityPending,normative_binding_pending:_bindingPending,...metadata}=r.source_metadata??{};
  const changed={...body,source_metadata:{...metadata,
   // Only the four selected exact-column rows lose their historical proposal role.
   ...(!need?{sourceRole:'OFFICIAL_NORM',normativeTrace:((metadata.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'}))}:{}),
   rootScopeProvenanceR2:{...scope,genericCutOperationAlreadyExists:true,genericWalkBodyFullySurveyed:false,
    globalPhysicalUniquenessProved:false,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,
    machinePriceAdmission:false,discOrderAdmission:false,applicationNeedUnresolved:need}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // Keep the exact calculation/parameter/row graph. Do not propagate historical
 // catalogue-null/publication flags from the pure fragment as new runtime knobs.
 return {parameters:base.parameters,formulas:base.formulas,resources,runtimeInput:base.runtimeInput,
  runtimeClassification:base.runtimeClassification,runtimeSourceIds:base.runtimeSourceIds,ordinaryParameterIds:base.ordinaryParameterIds};
}
