import {knaufHandPlasterToolProfilesPackS2763 as pack} from '../../../src/lib/estimate/v4/knaufHandPlasterToolProfilesS2763';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {parseCanonicalPublicResourcePresentationV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

/** Enrich existing unresolved requirements. No calculator, quantity, price,
 * inventory, scope, procurement or cost-owner remap is introduced. */
export function overlayS2763KnaufHandPlasterToolProfiles(parent:PurchaseGroupRepresentative){
 const target=pack.targets.find(t=>t.catalogId===String(parent.definition.catalog_id));
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.definition.definition_sha256!==target.parentDefinitionHash)throw Error('KNAUF_TOOL_PROFILE_EXACT_PARENT_DRIFT');
 if(parent.resources.length!==113||parent.formulas.length!==113||parent.parameters.length!==48)throw Error('KNAUF_TOOL_PROFILE_PARENT_SHAPE_DRIFT');
 for(const pin of target.preservedOwners){const old=parent.resources.find(r=>r.row_id===pin.rowId);if(!old||old.id!==pin.resourceSpecId||old.cost_owner_id!==pin.costOwnerId||old.unit_id!==pin.unitId||old.formula_id!==pin.formulaId)throw Error('KNAUF_TOOL_PROFILE_OWNER_DRIFT:'+pin.rowId);}
 const result=structuredClone(parent),changedRowIds:string[]=[];
 for(const spec of pack.rows){const row=result.resources.find(r=>r.row_id===spec.rowId)!;const pin=target.selectedOwnerPins.find(p=>p.rowId===row.row_id)!;
  if(row.row_sha256!==pin.rowSha256||row.source_metadata.sourceNormQuantityAccepted!==false)throw Error('KNAUF_TOOL_PROFILE_SOURCE_TRUTH_DRIFT:'+row.row_id);
  const requirements=spec.profileKeys.map(key=>{const profile=pack.requirements.find(p=>p.key===key);if(!profile||profile.ownerRowId!==row.row_id||profile.quantityNorm!==null||profile.purchaseNorm!==null)throw Error('KNAUF_TOOL_PROFILE_REQUIREMENT_DRIFT:'+key);return profile;});
  const stageDetails=row.row_id.endsWith('open-hand-tool')?[target.surface==='ceiling'
   ?'Нанесение на потолок: использовать штукатурный сокол движением на себя. Кельма не считается подтверждённой заменой сокола.'
   :'Нанесение на стену: источник допускает набрасывание кельмой либо выбранное намазывание соколом снизу вверх. Альтернативы не означают две обязательные покупки.']:[];
  const detailsRu=[...stageDetails,...requirements.map(p=>`${p.requirementRu}. ${p.whenRu} ${p.limitsRu}`),...spec.additionalDetailsRu,...pack.baseDetailsRu];
  const presentation={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:spec.nameRu,brandAndModelRu:null,specificationRu:spec.specificationRu,detailsRu};
  if(!parseCanonicalPublicResourcePresentationV1(presentation))throw Error('KNAUF_TOOL_PUBLIC_PRESENTATION_INVALID:'+row.row_id);
  row.resource_graph={...row.resource_graph,publicResourcePresentationV1:presentation,toolRequirementProfileV1:{contractVersion:'canonical-tool-requirement-profile/v1',surface:target.surface,requirements,sourceEvidence:requirements.length?{sourceId:pack.source.id,documentVersion:pack.source.edition,sha256:pack.source.sha256,pages:[2,3],admission:'SPECIFICATION_ONLY',quantityAdmitted:false}:null,consumableSpecificationStatus:requirements.length?null:'NOT_CONFIRMED',reusePolicy:pack.reusePolicy,availabilityEvidence:null,scheduleEvidence:null,costScopeEvidence:null}};
  row.source_metadata={...row.source_metadata,toolRequirementPresentationEnrichment:{contract:pack.contract,specificationOnly:true,sourceAdmissionSha256:pack.sourceAdmissionSha256,sourceRequirementKeys:spec.profileKeys,oldResourceSpecId:row.id,physicalNormQuantityAdmitted:false,wholeNeedClosed:false}};
  const{row_sha256:_oldHash,...body}=row;row.row_sha256=estimateDeterministicHash(body);changedRowIds.push(row.row_id);
 }
 return{representative:result,changedRowIds,preservedOwnerIdentities:target.preservedOwners.length,newPhysicalNormClosureCount:0,newWholeNeedClosureCount:0,newCompleteTechnicalTypeCount:0};
}
