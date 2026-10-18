// Pure metadata adapter only. The factory verifies exact ROOT files before constructing this scope.
import {flatMetalOil03002QuantityDefinitionR1 as historical,flatMetalOil03002QuantityPackR1 as pack,
 flatMetalOil03002PrimaryR1 as primary,flatMetalOil03002FactIdsR1 as facts,
 flatMetalOil03002NeedParameterIdsR1 as needs} from './flatMetalOil03002QuantityR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const flatMetalOil03002CatalogIdR1='canonical-work:master:metal_flat_interior_oil_two_coats_ma25_krer15_04_030_02';
export const flatMetalOil03002WorkKeyR1='metal_flat_interior_oil_two_coats_ma25_krer15_04_030_02';
export const flatMetalOil03002SourceIdentityR1='kg:krer15:15-04-030-02:flat-nonstructural-metal:interior:ma25-light-colours:two-coats:actual-painted-m2';
export const flatMetalOil03002GroupIdR1='wg:master:metal_flat_interior_oil_two_coats_ma25_krer15_04_030_02';
export const flatMetalOil03002TitleRuR1='Окраска больших плоских металлических поверхностей внутри помещения, МА-25, 2 слоя';
export const flatMetalOil03002RootDecisionStatusR1='ROOT_REVIEWED_PAINTING03002_SOURCE_SPECIFIC_PARTIAL_CREATE_NOT_PUBLISHED_R1';
export const flatMetalOil03002RootDecisionShaR1='9be99f15ca3928d4bc0f2c39b487875a79591585a4d181417cf0bc084961cb2c';
export const flatMetalOil03002ActualContinuationShaR1='464b86314076af3b8d73b2de98548ef9a1eafa3296c65613e271c00ee609f60e';
export const flatMetalOil03002ContinuationStatusR1='PASS_PAINTING03002_R8_CURRENT_FOUR_HEADERS_SOURCE0_WITH_PINNED_HISTORICAL_GROUP_R7';
export const flatMetalOil03002RootClassificationShaR1='27235c6d88417f64dfa6f70ade8addf2d7e0ced5b773b901e0575abd088e42be';
export type FlatMetalOil03002RootScopeR1=Readonly<{
 contractVersion:'painting03002-root-scope-provenance/r1';rootDecisionStatus:typeof flatMetalOil03002RootDecisionStatusR1;
 rootDecisionSha256:typeof flatMetalOil03002RootDecisionShaR1;rootClassificationSha256:typeof flatMetalOil03002RootClassificationShaR1;
 continuationStatus:typeof flatMetalOil03002ContinuationStatusR1;continuationReadSha256:typeof flatMetalOil03002ActualContinuationShaR1;
 sourceArtifactSha256:string;quantityPackSha256:'9cf784f9848df164187529d8aeee2442ccd736e91ea04ae0f729e488f7ee42f7';
 quantityScope:'PARTIAL';placement:'CREATE_EXACT_ROOT_GROUP';
}>;
export function flatMetalOil03002AdmittedDefinitionR1(scope:FlatMetalOil03002RootScopeR1):AutomaticOwnerDefinition&{catalogId:typeof flatMetalOil03002CatalogIdR1}{
 if(scope?.contractVersion!=='painting03002-root-scope-provenance/r1'
  ||scope.rootDecisionStatus!==flatMetalOil03002RootDecisionStatusR1
  ||scope.rootDecisionSha256!==flatMetalOil03002RootDecisionShaR1
  ||scope.rootClassificationSha256!==flatMetalOil03002RootClassificationShaR1
  ||scope.continuationStatus!==flatMetalOil03002ContinuationStatusR1
  ||scope.continuationReadSha256!==flatMetalOil03002ActualContinuationShaR1
  ||scope.sourceArtifactSha256!==pack.source.sha256
  ||scope.quantityPackSha256!=='9cf784f9848df164187529d8aeee2442ccd736e91ea04ae0f729e488f7ee42f7'
  ||scope.quantityScope!=='PARTIAL'||scope.placement!=='CREATE_EXACT_ROOT_GROUP')throw Error('PAINTING03002_EXACT_ROOT_SCOPE_REQUIRED');
 const base=historical(),resources=base.resources.map(resource=>{
  const need=resource.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM';
  const {row_sha256:_old,...body}=resource;
  const {catalogue_identity_pending:_identity,normative_binding_pending:_binding,...metadata}=resource.source_metadata??{};
  const changed={...body,source_metadata:{...metadata,
   ...(!need?{sourceRole:'OFFICIAL_NORM',normativeTrace:((metadata.normativeTrace??[]) as Record<string,unknown>[])
    .map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'}))}:{}),
   rootScopeProvenanceR1:{...scope,existing24Disposition:'KEEP_CURRENT_IMMUTABLE',globalPhysicalAbsenceProved:false,
    fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,machinePaidBranchAdmitted:false,
    purchaseOrderAdmitted:false,applicationNeedUnresolved:need}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // Explicit reconstruction drops historical catalogue-null flags; no quantities, owners, gates or defaults change.
 return {catalogId:flatMetalOil03002CatalogIdR1,parameters:base.parameters,formulas:base.formulas,resources,
  runtimeInput:base.runtimeInput,runtimeClassification:base.runtimeClassification,runtimeSourceIds:base.runtimeSourceIds,
  ordinaryParameterIds:base.ordinaryParameterIds};
}
/** Exact opt-in baseline map. Provenance arrays do not certify the project/product facts. */
export type FlatMetalOil03002ParameterSourceR1=
 |{kind:'KNOWN';sourceIds:string[]}
 |{kind:'UNRESOLVED';sourceIds:[]};
export function flatMetalOil03002ExplicitParameterSourcesR1():Record<string,FlatMetalOil03002ParameterSourceR1>{
 const known=new Set<string>([primary,...facts]),unresolved=new Set<string>(needs),d=historical();
 if(known.size!==9||unresolved.size!==10||d.parameters.length!==19)throw Error('PAINTING03002_EXACT_PARAMETER_MAP_REQUIRED');
 return Object.fromEntries(d.parameters.map((p):[string,FlatMetalOil03002ParameterSourceR1]=>{
  if(known.has(p.parameter_id)&&!unresolved.has(p.parameter_id))return[p.parameter_id,{kind:'KNOWN' as const,sourceIds:[pack.sourceKeyProposal]}];
  if(unresolved.has(p.parameter_id)&&!known.has(p.parameter_id))return[p.parameter_id,{kind:'UNRESOLVED' as const,sourceIds:[]}];
  throw Error('PAINTING03002_UNKNOWN_OR_COLLIDING_PARAMETER:'+p.parameter_id);
 }));
}
