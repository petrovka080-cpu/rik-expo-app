import kg from '../../../../data/estimate-benchmarks/source-packs/masonry-wall-krer08-systems-r1.json';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const MASONRY_CERAMIC250_NORM_OBJECT_BOUNDARY_R4='gox-build.masonry-ceramic250-norm-object-boundary/r4';
const prefix='masonry:wall:krer08-02-001-07:';
const legacyInputs=['m33_masonry_kg_project_basis','m33_masonry_source_system_conformance','m33_masonry_approved_masonry_design_reference'];
const objectInputs=legacyInputs.slice(1);
const quantityKeys=['labour','operators','tower-crane-consumed','tower-crane-own','tower-crane-hired','water-consumed','water','brick-consumed','brick','timber-consumed','timber','mortar-consumed','mortar','operation:masonry','operation:handling','operation:access'];
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

/** A saved international rate can produce a preliminary quantity without a
 * fictional project adoption. Existing project/material obligations stay in
 * their original row and become mandatory through the existing scope contract.
 * No norm, effective output, commercial owner or general guard is replaced. */
export function applyMasonryCeramic250NormObjectBoundaryR4(model:Rep):Rep{
 const result=structuredClone(model),ids=new Set(quantityKeys.map(key=>prefix+key));
 if(result.definition.id!=='9e2b5498-7b4d-5f82-ace7-6c6b822b4ef8'||result.definition.definition_sha256!=='f72f853aaffcab2b21cf172e7a3371dbe80a378a8f74b2b427d255c775166c6b')throw Error('MASONRY_NORM_OBJECT_R4_EXACT_PARENT');
 const scopeRow=result.resources.find(row=>row.row_id===prefix+'need:source-system-fit');
 if(!scopeRow||scopeRow.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'||scopeRow.resource_graph.scopeRequirementV1!=null)throw Error('MASONRY_NORM_OBJECT_R4_SOURCE_REQUIREMENT_PREIMAGE');
 const count=result.resources.filter(row=>ids.has(row.row_id)).length;
 if(count!==quantityKeys.length)throw Error('MASONRY_NORM_OBJECT_R4_EXACT_QUANTITY_CONSUMERS');
 result.resources=result.resources.map(row=>{
  if(!ids.has(row.row_id)&&row.row_id!==scopeRow.row_id)return row;
  const {row_sha256:_previous,...body}=row;
  if(ids.has(row.row_id)){
   if(!same(row.resource_graph.inputParameterIds,legacyInputs))throw Error('MASONRY_NORM_OBJECT_R4_EXACT_DEPENDENCY_PREIMAGE:'+row.row_id);
   const updated={...body,resource_graph:{...row.resource_graph,inputParameterIds:[],sourceMethodObjectSeparationV1:{contract:MASONRY_CERAMIC250_NORM_OBJECT_BOUNDARY_R4,sourceArtifactSha256:kg.source.sha256,capturedObjectDependencyParameterIds:legacyInputs,requiredObjectCheckRowId:scopeRow.row_id,sourceCountry:'Kyrgyzstan',sourceEdition:'2015',countryConformityClaim:false,preliminarySourceQuantityOnly:true,internationalPreliminarySourceQuantity:true,actualProjectConfirmed:false}}};
   return{...updated,row_sha256:hash(updated)};
  }
  const updated={...body,resource_graph:{...row.resource_graph,scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:prefix.slice(0,-1),groupTitleRu:'Кладка кирпичной стены 250 мм на готовом растворе М50',titleRu:'Совместимость исходного кирпичного способа с проектом',reasonRu:'Предварительный расход по точной исходной норме не подтверждает фактические материалы, конструктивное решение и пригодность для объекта. Эти требования сохраняются отдельно и не могут быть исключены из выбранного способа.',exactScopeWhen:structuredClone(row.inclusion_ast),sourceEvidence:[{sha256:kg.source.sha256,locator:'КРЕР08-2015,08-02-001-07; исходные материалы и область, PDF8§2.3/2.5'}],coveringRowIds:[],originalRowIds:[...ids],objectFactParameterId:objectInputs[1],unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:objectInputs},masonryNormObjectBoundaryR4:{contract:MASONRY_CERAMIC250_NORM_OBJECT_BOUNDARY_R4,sourceMethodChoiceIsNotProjectApproval:true,mandatoryObjectRequirement:true,legacyCountryAdoptionPreservedButNotGlobalPrerequisite:true,newPaidOwner:false,newProcurementOwner:false,full:false}}};
  return{...updated,row_sha256:hash(updated)};
 });
 result.definition.applicability={...result.definition.applicability,masonryCeramic250NormObjectBoundaryR4:{contract:MASONRY_CERAMIC250_NORM_OBJECT_BOUNDARY_R4,sourceCountry:'Kyrgyzstan',sourceEdition:'2015',countryConformityClaim:false,quantityConsumerRowIds:[...ids],mandatoryObjectCheckRowId:scopeRow.row_id,actualObjectFactsNotConfirmedBySelection:true}};
 return result;
}
