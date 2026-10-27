import source from '../../../../data/estimate-benchmarks/source-packs/facade-board-source-fixing-r3.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {compareFormulaGraphDecimals as cmp,isFormulaGraphExactDecimal} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const isSourceMetadataObject=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function sourceProvenance(value:unknown):Record<string,unknown>{
 if(value==null)return{};
 if(!isSourceMetadataObject(value))throw new Error('FACADE_BOARD_SOURCE_PROVENANCE_OBJECT_REQUIRED');
 return value;
}
export type FacadeBoardFixingKeyR3='thermowood-horizontal-tg'|'wpc-horizontal-wood';
export type FacadeApprovedBoardScheduleR3=Readonly<{profile:FacadeBoardFixingKeyR3;sourceSha256:string;approvedProjectReference:string;approvedLayoutSha256:string;exactMaterialSupportAndFastenerAccepted:true;boards:ReadonlyArray<Readonly<{boardId:string;widthMm:string;supportIntersectionIds:ReadonlyArray<string>}>>}>;
const fail=(m:string):never=>{throw Object.assign(new Error(m),{code:'PARAMETER_VALIDATION_FAILED'});};
const pack=(key:FacadeBoardFixingKeyR3)=>source.profiles.find(p=>p.key===key)??fail('EXACT_BOARD_FIXING_METHOD_REQUIRED');
export const facadeBoardFixingPrimaryR3='board_fixing_scheduled_boards';
const norm=(key:string)=>'board_fixing_unknown_'+key.replaceAll('-','_');
/** Count only the actual approved intersections. The source's600/406.4mm
 * spacing is not an area-to-batten structural generator. Exact140mm Thermowood
 * is excluded because the read source explicitly states<140 and>140. */
export function facadeApprovedBoardFixingCountsR3(c:FacadeApprovedBoardScheduleR3){
 const p=pack(c.profile);if(c.sourceSha256!==p.source.sha256||c.exactMaterialSupportAndFastenerAccepted!==true)fail('EXACT_BOARD_MATERIAL_SUPPORT_FASTENER_REQUIRED');
 if(!c.approvedProjectReference.trim()||!/^[0-9a-f]{64}$/i.test(c.approvedLayoutSha256)||!c.boards.length)fail('ACTUAL_APPROVED_BOARD_LAYOUT_REQUIRED');
 let narrow=0n,wide=0n;const boards=new Set<string>();
 for(const b of c.boards){
  if(!b.boardId.trim()||boards.has(b.boardId))fail('UNIQUE_PROJECT_BOARD_IDS_REQUIRED');boards.add(b.boardId);
  // Validate source text before the scale9 comparator can round another
  // physical width into the exact selected profile.
  if(typeof b.widthMm!=='string'||!isFormulaGraphExactDecimal(b.widthMm))fail('EXACT_BOARD_WIDTH_DECIMAL_REQUIRED');
  const intersections=new Set<string>();for(const id of b.supportIntersectionIds){if(!id.trim()||intersections.has(id))fail('UNIQUE_INTERSECTIONS_PER_BOARD_REQUIRED');intersections.add(id);}
  // A schedule with fewer than3supports is outside this conservative selected
  // profile, not an invented normative minimum for every possible board cut.
  if(intersections.size<3)fail('SELECTED_THREE_SUPPORT_BOARD_SCOPE_REQUIRED');
  const n=BigInt(intersections.size);
  if(c.profile==='thermowood-horizontal-tg'){
   if(cmp(b.widthMm,'0')<=0||cmp(b.widthMm,'140')===0)fail('EXACT_THERMOWOOD_WIDTH_SOURCE_SCOPE_REQUIRED');
   if(cmp(b.widthMm,'140')<0)narrow+=n;else wide+=n;
  }else{if(cmp(b.widthMm,'184.15')!==0)fail('EXACT_SELECTED_WPC_BOARD_WIDTH_REQUIRED');wide+=n;}
 }
 return{boards:BigInt(c.boards.length).toString(),narrow:narrow.toString(),wide:wide.toString(),all:(narrow+wide).toString(),screws:(narrow+wide*2n).toString()};
}
export function facadeBoardSourceFixingDefinitionR3(key:FacadeBoardFixingKeyR3):AutomaticOwnerDefinition{
 const p=pack(key),rid=(s:string)=>p.prefix+':'+s,primary=facadeBoardFixingPrimaryR3,positive={kind:'greater_than' as const,parameterId:primary,value:0};
 const context=['board_fixing_approved_project','board_fixing_layout_sha256','board_fixing_exact_source'];
 const conditional:AutomaticParameterSpec[]=[...['board_fixing_actual_narrow_intersections','board_fixing_actual_wide_intersections'].map(id=>({id,title:id.endsWith('narrow_intersections')?'Принятые пересечения досок шириной менее140мм с обрешёткой':'Принятые пересечения досок двухвинтового крепления с обрешёткой',unitId:'piece',valueType:'integer' as const,kind:'conditional' as const,min:0,requiredWhen:positive})),...context.map(id=>({id,title:'Фактическая идентичность принятой схемы фасадной облицовки',unitId:null,valueType:'text' as const,kind:'conditional' as const,requiredWhen:positive})),...p.needs.map(n=>({id:norm(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0}))];
 const row=(s:string,title:string,category:string,unitId:string,expression:string,more:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({rowId:rid(s),formulaId:rid('formula:'+s),section:p.titleRu,title,category,unitId,expression,inclusion:positive,inputParameterIds:context,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',...more});
 const rows:AutomaticRowSpec[]=[row('screws','Винт лицевого крепления фасадной доски','material','piece','board_fixing_actual_narrow_intersections+board_fixing_actual_wide_intersections*2',{costTreatment:'OWN_COST',procurement:true}),...p.needs.map(n=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',norm(n.key)))];
 const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:p.prefix,sourceId:'gox_facade_board_source_fixing_r3_'+key,normId:'SOURCE_SCREWS_PER_ACTUAL_APPROVED_BOARD_SUPPORT_INTERSECTION',sourceMetadata:{source_title:p.titleRu,source_document_version:key==='thermowood-horizontal-tg'?'10.2022':'OriginalWildwood14pageguide',definition_hash:p.source.sha256,artifact_sha256:p.source.sha256,exact_locator:'PDF'+p.source.pdfPagesRead.join(',')},applicabilityRu:p.titleRu+'; только принятые исходные материалы и схема; не универсальная норма из площади и не полный фасад.',ordinary:[{id:primary,title:'Число досок по принятой поэлементной схеме',unitId:'piece',valueType:'integer',kind:'ordinary',min:0}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Число опор не получается из площади или примера шага.','Один винт термодревесины не переносится на ДПК.','Необработанная древесина не объявлена совместимой с выбранным термомодифицированным материалом.','Все внутренние нормы полного обеспечения защищены и остаются null.']});
 return{...built,ordinaryParameterIds:[],parameters:built.parameters.map(q=>{const n=p.needs.find(n=>q.parameter_id===norm(n.key));return n?{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,n.missing)}:q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?q:{...q,truth_metadata:{...q.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:q.parameter_id.endsWith('exact_source')?'MANUFACTURER_CONFIRMED':'PROJECT_DOCUMENTATION',source_confirmation_required:false,preliminary_compilation_allowed:true,provenance:{...sourceProvenance(q.truth_metadata.provenance),consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};}),resources:built.resources.map(r=>{
  const n=p.needs.find(n=>r.row_id===rid('need:'+n.key)),f=built.formulas.find(f=>f.formula_id===r.formula_id)!,ops=n?source.operations:source.operations.filter(o=>['drill','screw','inspect-clean'].includes(o.key)),{row_sha256:_old,...body}=r;
  const next={...body,resource_graph:{...r.resource_graph,...(n?{}:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...f.input_parameter_ids],reasonRu:'Используйте принятую поэлементную схему досок и опор.'}}),operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p.prefix,groupTitleRu:p.titleRu,operationId:rid('operation:'+ops[0]!.key),operationTitleRu:ops[0]!.titleRu,processOrdinal:1,additionalOperations:ops.slice(1).map((o,i)=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:i+2,processRole:'PROCESS',completionCriterionRu:'Выполнена операция «'+o.titleRu+'» в точном исходном методе; незакрытое обеспечение сохранено.'})),completionCriterionRu:n?n.missing:'Буквальное число винтов на принятых пересечениях; обеспечение полного фасада проверяется отдельно.'}},source_metadata:{...r.source_metadata,source_artifact_sha256:p.source.sha256,sourceRole:n?'UNRESOLVED_APPLICATION_NORM':'SOURCE_FIXINGS_PER_CAPTURED_APPROVED_BOARD_INTERSECTION',normativeTrace:n?[]:[{sourceId:'gox_facade_board_source_fixing_r3_'+key,source_artifact_sha256:p.source.sha256,exact_locator:key==='thermowood-horizontal-tg'?'PDF36':'PDF6,9'}],automaticGenericPriceInheritanceAllowed:false,requiresEnclosingWholeFacadeOwner:true,noAreaRateInferred:true,boardSupplyOwnedByEnclosingFacade:true,...(n?{normative_source_ids:[],quantityNormAccepted:false,missingFact:n.missing}:{}),full_technical_acceptance:false,newFull:0}};return{...next,row_sha256:hash(next)};
 })};
}
export function compileFacadeBoardSourceFixingR3(c:FacadeApprovedBoardScheduleR3,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}){
 const q=facadeApprovedBoardFixingCountsR3(c),d=facadeBoardSourceFixingDefinitionR3(c.profile);
 // Internal intersection takeoff has no public measure: board count is captured
 // scope/inclusion, not a screw-rate variable. The enclosing whole facade owns
 // its real geometric primary; no artificial formula dependency is added here.
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{},confirmedParameters:{[facadeBoardFixingPrimaryR3]:q.boards,board_fixing_actual_narrow_intersections:q.narrow,board_fixing_actual_wide_intersections:q.wide,board_fixing_approved_project:c.approvedProjectReference,board_fixing_layout_sha256:c.approvedLayoutSha256,board_fixing_exact_source:c.sourceSha256},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
