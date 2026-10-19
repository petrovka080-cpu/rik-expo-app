// Pure metadata projection of the existing 53-row factory; no new calculator or monetary owner.
// ROOT file evidence is checked by prepareFloorConcreteUnderlayerColumn09AppendR1 before this is used.
import {floorConcreteUnderlayerDefinitionR1 as historical, floorConcreteUnderlayerPackR1 as pack,
 floorConcreteUnderlayerNeedParameterIdsR1} from './floorConcreteUnderlayerKrer11Column09R1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';

export const floorConcrete00209AppendIdentityR1={...pack.proposedIdentity,
 sourceIdentity:'master-work:'+pack.proposedIdentity.workKey,
 locatorKey:'krer11-01-002-09-floor-concrete-underlayer-exact'} as const;
export const floorConcrete00209MachineBoundaryRuR1='На 1 м³ слоя проверены 0,48 маш.-ч. Первичный источник раскрывает амортизацию, ремонт и обслуживание с ремонтным трудом, а также сетевую электроэнергию. Оплата вибратора пока не рассчитана: нужно подтвердить, где учтён труд работающего с ним человека, и получить совместимую ставку. Отдельные часы оператора и повторная оплата компонентов не добавлены.';
export type FloorConcrete00209RootScopeR1=Readonly<{
 contractVersion:'floor-concrete00209-root-scope/r1';
 rootDecisionSha256:string;currentIntakeSha256:string;
 parentReleaseId:string;parentSearchReleaseId:string;
 sourceArtifactSha256:typeof pack.source.sha256;
 quantityPackSha256:'d6c43122d3020d595e556f39b97a6efc9ef6ace0b900c82b5bef513144c2bffd';
 disposition:'SOURCE_SPECIFIC_PARTIAL_APPEND';quantityScope:'PARTIAL';
}>;
export function floorConcrete00209AdmittedDefinitionR1(scope:FloorConcrete00209RootScopeR1):AutomaticOwnerDefinition {
 if(scope?.contractVersion!=='floor-concrete00209-root-scope/r1'
  ||!/^[a-f0-9]{64}$/u.test(scope.rootDecisionSha256)
  ||scope.currentIntakeSha256!=='97da664fd5b9c444dfb1feb37f531700459c20ad5c13ac773367bf5cd72e17fe'
  ||scope.parentReleaseId!=='f36fa786-6634-518c-853d-b9ae54ab3ccf'
  ||scope.parentSearchReleaseId!=='304b7f3f-1618-5e0e-91ea-da062e4f287e'
  ||scope.sourceArtifactSha256!==pack.source.sha256
  ||scope.quantityPackSha256!=='d6c43122d3020d595e556f39b97a6efc9ef6ace0b900c82b5bef513144c2bffd'
  ||scope.disposition!=='SOURCE_SPECIFIC_PARTIAL_APPEND'||scope.quantityScope!=='PARTIAL')
  throw Error('FLOOR_CONCRETE00209_ROOT_SCOPE_REQUIRED');
 const base=historical();
 const resources=base.resources.map(resource=>{
  const {row_sha256:_old,...body}=resource;
  const {sourceAdmissionPending:_source,identityAdmissionPending:_identity,publicationAllowed:_publication,
   ...metadata}=resource.source_metadata??{};
  const machine=resource.row_id.startsWith(pack.prefix+':surface-vibrator-');
  const unresolved=metadata.sourceRole==='UNRESOLVED_APPLICATION_NORM';
  const presentation=resource.resource_graph.publicResourcePresentationV1 as Record<string,any>;
  const changed={...body,resource_graph:{...body.resource_graph,
   ...(machine||resource.row_id===pack.prefix+':open-machine-price-scope'?{
    publicResourcePresentationV1:{...presentation,detailsRu:[pack.selectionRestrictionRu,pack.source.locatorRu,
     floorConcrete00209MachineBoundaryRuR1]}}:{})},
   source_metadata:{...metadata,full_technical_acceptance:false,
    rootScopeProvenanceR1:{...scope,globalPhysicalAbsenceProved:false,newCompleteTypesAccepted:0,
     sourceQuantityAdmitted:metadata.sourceNormQuantityAccepted===true,
     applicationNeedUnresolved:unresolved,machinePaidBranchAdmitted:false,
     existingAdjacentDefinitionsDisposition:'KEEP_CURRENT_IMMUTABLE'}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...base,resources};
}
/** Provenance arrays describe the profile, and do not certify a supplied project/site fact. */
export function floorConcrete00209ExplicitParameterSourcesR1(){
 const needIds=new Set([...floorConcreteUnderlayerNeedParameterIdsR1,
  'floor_concrete_underlayer_application_need_machine_price_scope']);
 const base=historical();
 if(base.parameters.length!==32||needIds.size!==5)throw Error('FLOOR_CONCRETE00209_PARAMETER_SET');
 return Object.fromEntries(base.parameters.map(parameter=>[parameter.parameter_id,
  needIds.has(parameter.parameter_id)?{kind:'UNRESOLVED' as const,sourceIds:[]}:
   parameter.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'
    ?{kind:'DERIVED' as const,sourceIds:[]}:
   {kind:'KNOWN' as const,sourceIds:[pack.sourceId]}]));
}
