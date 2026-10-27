import {applyMasonryAacKz250OwnWholeKitReuseR4} from './masonryAacKz250OwnWholeKitReuseR4';
import capture from '../../../../data/estimate-benchmarks/fixtures/masonry-aac-current-v5-parent-r4.json';
import contentPassport from '../../../../data/estimate-benchmarks/fixtures/masonry-aac-current-v5-content-passport-r4.json';
import {buildMasonryAacKz250WholePartR4,MASONRY_AAC_KZ250_WHOLE_R4 as pack} from './masonryAacKz250WholeCycleR4';
import {buildMasonryBearingDpcLoosePartR4,MASONRY_BEARING_DPC_LOOSE_R4 as dpcSource} from './masonryBearingDpcLooseWholeMethodR4';
import {masonryThreeBoxEffectiveMassExpressionR4,MASONRY_M50_EFFECTIVE_LIFT_R4 as liftSource} from './masonryM50EffectiveLiftCorrectionR4';
import {applyMasonryAacKz250WholeFirstRowFeedReuseR4} from './masonryAacKz250WholeFirstRowFeedReuseR4';
import {applyMasonryAacKz250NormObjectBoundaryR4} from './masonryAacKz250NormObjectBoundaryR4';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalDefinitionPublicationStableValueR1 as publicationStable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

export const MASONRY_AAC_KZ250_PRIMARY_AREA_R4='aackz4_net_wall_area_m2';
const geom={lengthId:'m33_masonry_wall_length_m',heightId:'m33_masonry_wall_height_m',openingsId:'m33_masonry_openings_area_m2'};
const id=(key:string)=>'aackz4_'+key;
const row=(key:string)=>pack.prefix+':'+key;
const effective=id('effective_first_row_m3');
const selected={kind:'selected',parameterId:pack.selectorId,value:pack.selectorValue};
const volume='('+geom.lengthId+'*'+geom.heightId+'-'+geom.openingsId+')*0.25';
const active={kind:'and',operands:[selected,{kind:'formula_greater_than',expression:volume,unitId:'m3',value:0}]};
const dpcActive={kind:'and',operands:[active,{kind:'selected',parameterId:id('dpc_scope'),value:'GROUND_CONTACT_STRAIGHT_UNPENETRATED_RUN'}]};
const feedActive={kind:'and',operands:[active,{kind:'selected',parameterId:id('first_row_feed_method'),value:'EXACT_THREE_YAR1_BOXES_025M3'}]};
const rehash=(value:Json):Json=>{const {row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
export function masonryAacExactV5ParentR4():Rep{const value=structuredClone(capture),rowIds=new Map(value.resources.map(resource=>[resource.id,resource.row_id]));return{definition:value.definition,baseline:value.baseline,parameters:value.parameters,formulas:value.formulas,resources:value.resources,passport:structuredClone(contentPassport),bindings:value.bindings.map(binding=>({row_id:rowIds.get(binding.resource_spec_id),locator_id:binding.locator_id,applicability:binding.applicability}))};}

/** Finite integration delta over the actual current AAC parent. No publisher,
 * runtime or database is created. The saved KZ operation owner, tested DPC
 * geometry and tested physical mass expression are used directly. */
export function buildMasonryAacKz250CurrentCardSuccessorR4(parent:Rep):Rep{
 if(parent.definition.id!==pack.currentParent.definitionId||parent.definition.definition_version!==5||parent.definition.definition_sha256!==pack.currentParent.definitionSha256)throw Error('AAC_KZ250_R4_EXACT_CURRENT_PARENT');
 const expected=masonryAacExactV5ParentR4();
 // This is an exact captured-parent boundary, not a calculation identity.
 // Preserve source metadata, baseline evidence and every numeric digit; the
 // calculation serializer intentionally rounds and must not certify provenance.
 const exactParent=(value:Rep)=>JSON.stringify(publicationStable({definition:value.definition,baseline:value.baseline,parameters:value.parameters,formulas:value.formulas,resources:value.resources,passport:value.passport,bindings:value.bindings}));
 if(exactParent(parent)!==exactParent(expected))throw Error('AAC_KZ250_R4_CURRENT_COMPUTATION_DRIFT');
 const result=structuredClone(parent),oldParameterIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 // Selected missing means false under the existing optional-scope graph. Old
 // source choices therefore retain exactly their old calculation behaviour.
 result.resources=result.resources.map(resource=>rehash({...resource,inclusion_ast:{kind:'and',operands:[resource.inclusion_ast,{kind:'not',operand:selected}]}}));
 const part=buildMasonryAacKz250WholePartR4({...geom,netAreaId:MASONRY_AAC_KZ250_PRIMARY_AREA_R4}),dpc=buildMasonryBearingDpcLoosePartR4('0.25',geom.lengthId);
 for(const parameter of part.parameters)if(!oldParameterIds.has(parameter.parameter_id))result.parameters.push({...decl(parameter),ordinal:result.parameters.length});
 for(const formula of part.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 for(const resource of part.resources)result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active}));
 // Reuse all seven rows of the existing straight-run DPC method. Its
 // unknown mortar bed below the strip is a distinct source scope from the
 // AAC first-course mortar; no source proves that .017V covers both layers.
 for(const parameter of dpc.parameters)if(parameter.parameter_id!==geom.lengthId)result.parameters.push({...decl(parameter),ordinal:result.parameters.length});
 for(const formula of dpc.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 // Keep the original German IDs, norm gaps and informational payment mode;
 // only adapt the operation group to the existing wall card.
 for(const resource of dpc.resources)result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:{kind:'and',operands:[dpcActive,resource.inclusion_ast]},resource_graph:{...resource.resource_graph,operationCompositionV1:{...resource.resource_graph.operationCompositionV1,groupId:pack.prefix,groupTitleRu:pack.titleRu}}}));
 const bed=result.resources.find(resource=>resource.row_id===row('first_row_mortar'))!;
 // This remains the sole paid AAC first-course mortar and effective lift
 // quantity owner. It supplies no unproved DPC bed operation.
 bed.resource_graph={...bed.resource_graph,effectiveQuantityOutputV1:{parameterId:effective,unitId:'m3'}};
 // Same effective-resource contract and same physical formula as the tested
 // M50 correction. Only the compatible fresh mortar volume owner is adapted.
 const specs:AutomaticParameterSpec[]=[{id:id('dpc_scope'),title:'Внутренняя применимость выбранной отсечки капиллярной влаги',valueType:'enum',unitId:null,kind:'ordinary',values:['GROUND_CONTACT_STRAIGHT_UNPENETRATED_RUN','NOT_REQUIRED_BY_OWN_DESIGN']},{id:id('first_row_feed_method'),title:'Связанный цельный способ подачи раствора первого ряда',valueType:'enum',unitId:null,kind:'ordinary',values:['EXACT_THREE_YAR1_BOXES_025M3','OTHER_METHOD_NOT_ADMITTED']},{id:effective,title:'Сохранённый объём раствора первого ряда',valueType:'decimal',unitId:'m3',kind:'internal',effectiveQuantitySourceRowId:bed.row_id},{id:id('mortar_density_kg_m3'),title:'Плотность готового цементно-песчаного раствора',valueType:'decimal',unitId:null,kind:'ordinary',min:0.001},{id:id('handler_mass_kg'),title:'Масса полного грузозахвата растворных ящиков',valueType:'decimal',unitId:'kg',kind:'ordinary',min:0},{id:id('handler_limit_kg'),title:'Допустимый груз полного захвата трёх растворных ящиков',valueType:'decimal',unitId:'kg',kind:'ordinary',min:0.001},{id:id('crane_limit_kg'),title:'Допустимый груз крюка для ящиков и полного захвата',valueType:'decimal',unitId:'kg',kind:'ordinary',min:0.001}];
 const mass=masonryThreeBoxEffectiveMassExpressionR4(effective,id('mortar_density_kg_m3'));
 const controlSpecs:AutomaticRowSpec[]=[{rowId:row('first-row-handler-control'),formulaId:row('formula:first-row-handler-control'),section:'Подача раствора первого ряда',title:'Контроль нагрузки захвата трёх растворных ящиков',category:'service',unitId:'kg',expression:'max(0,('+mass+')-'+id('handler_limit_kg')+')',costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:'Фактическая масса раствора и трёх ящиков превышает допустимый груз полного захвата.'}},{rowId:row('first-row-crane-control'),formulaId:row('formula:first-row-crane-control'),section:'Подача раствора первого ряда',title:'Контроль нагрузки крюка при подаче раствора первого ряда',category:'service',unitId:'kg',expression:'max(0,('+mass+')+'+id('handler_mass_kg')+'-'+id('crane_limit_kg')+')',costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:'Фактическая масса раствора, трёх ящиков и полного захвата превышает доступный груз крюка.'}},{rowId:row('first-row-scope'),formulaId:row('formula:first-row-scope'),section:'Первый ряд газобетонной кладки',title:'Обеспечение раствором первого ряда',category:'service',unitId:'set',expression:'0',costTreatment:'INFORMATIONAL_SCOPE',procurement:false}];
 const controls=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:'REUSED_MAKER_THREE_BOX_EFFECTIVE_PHYSICAL_LIMITS_NOT_M50_CONSUMPTION',sourceMetadata:{source_title:'Физический контроль подачи раствора первого ряда',source_document_version:'Original maker box and KZ2019 whole three-box method, effective correctionR4',definition_hash:liftSource.makerEvidence.sha256,artifact_sha256:liftSource.makerEvidence.sha256,exact_locator:liftSource.makerEvidence.locator},applicabilityRu:'Тот же физический способ трёх точных ящиков с собственным эффективным объёмом готового цементно-песчаного раствора. Норма М50, марка и расход0.234 не переносятся. Полное обеспечение подъёма остаётся отдельно видимой потребностью.',ordinary:specs,profile:[],conditional:[],rows:controlSpecs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No nominal-volume safety check after manual quantity amendment','No M50 or CT21 material substitution','No crane nominal capacity instead of actual curve']});
 for(const parameter of controls.parameters){const internal=parameter.parameter_id===effective;result.parameters.push({...decl(parameter),required:false,default_value:null,ordinal:result.parameters.length,truth_metadata:internal?parameter.truth_metadata:{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:parameter.parameter_id===id('dpc_scope')?'PROJECT_DOCUMENTATION':parameter.parameter_id===id('first_row_feed_method')?'SOURCE_BACKED_PRELIMINARY_PROFILE':parameter.parameter_id===id('mortar_density_kg_m3')?'MANUFACTURER_CONFIRMED':'SELECTED_EQUIPMENT_PASSPORT',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});}
 for(const formula of controls.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 for(const resource of controls.resources)result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:resource.row_id===row('first-row-scope')?active:feedActive,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Первый ряд и подача раствора',operationId:row('operation:'+resource.row_id.slice(pack.prefix.length+1)),operationTitleRu:resource.title_ru,processOrdinal:1,completionCriterionRu:'Сохранён единственный исходный раствор и проверена применимая фактическая нагрузка.'},scopeRequirementV1:resource.row_id===row('first-row-scope')?{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:pack.prefix,groupTitleRu:pack.titleRu,titleRu:'Раствор первого ряда учитывается общей исходной позицией',reasonRu:'Одна исходная строка готового цементно-песчаного раствора обеспечивает первый ряд газобетона; её исключение оставляет первый ряд незавершённым. Постель под отсечкой влаги остаётся отдельной неизвестной потребностью.',exactScopeWhen:active,sourceEvidence:[{path:pack.source.path,sha256:pack.source.sha256,locator:'PDF14 first row; PDF39 table3'}],coveringRowIds:[bed.row_id],originalRowIds:[],costExclusionBreaksScopeV1:true}:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:pack.prefix,groupTitleRu:'Подача раствора первого ряда',titleRu:resource.title_ru,reasonRu:'Физический контроль нельзя исключить из выбранного способа подъёма раствора.',exactScopeWhen:feedActive,sourceEvidence:[liftSource.makerEvidence,liftSource.methodEvidence],coveringRowIds:[],originalRowIds:[bed.row_id],objectFactParameterId:pack.selectorId,unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:controls.formulas.find(formula=>formula.formula_id===resource.formula_id)!.input_parameter_ids}}}));
 // Row rehash and consumers use the existing common owners.
 result.resources=result.resources.map(rehash);
 // The retained wall-height fact already has a real scalar relation to the
 // storey height. Keep that original relation and ask its simple geometric
 // peer explicitly; never invent a storey height or silently remove the rule.
 const simple=new Set([...Object.values(geom),'m33_masonry_storey_height_m']);
 for(const parameter of result.parameters.filter(parameter=>oldParameterIds.has(parameter.parameter_id))){
  const visible=parameter.truth_metadata.visible_when??{kind:'literal',value:true};
  // The ordinary successor owns one source-backed whole method. Its four
  // measurements stay visible before and after filling the form; a hidden
  // technical selector must never become a consumer visibility dependency.
  parameter.truth_metadata={...parameter.truth_metadata,visible_when:{kind:'literal',value:simple.has(parameter.parameter_id)},provenance:{...parameter.truth_metadata.provenance,...(!simple.has(parameter.parameter_id)?{retainedNonOrdinaryVisibilityV1:{capturedDefinitionId:parent.definition.id,visibleWhen:structuredClone(visible),currentProfileSelector:pack.selectorId,currentProfileValue:pack.selectorValue,reason:'This one-profile successor asks only four geometry facts. Absence of an internal source selector in ordinary submitted values must not expose historical questions. Source roles, mandatory object needs and historical revisions are unchanged.'}}:{})}};
  if(simple.has(parameter.parameter_id)){
   // The ordinary definition owns one exact source profile. Its user-fact
   // validator deliberately does not merge the INTERNAL selector, so required
   // measurements must not depend on that hidden value.
   parameter.required=true;
   parameter.constraints_json={...parameter.constraints_json,requiredWhen:{kind:'literal',value:true}};
   const prior=parent.parameters.find(prior=>prior.parameter_id===parameter.parameter_id)!,ownGuide=part.parameters.find(candidate=>candidate.parameter_id===parameter.parameter_id)?.truth_metadata.guide??part.parameters.find(candidate=>candidate.parameter_id===pack.selectorId)!.truth_metadata.guide;
   parameter.truth_metadata={...parameter.truth_metadata,guide:{...(ownGuide as Json),guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT',guide_short_ru:parameter.title_ru+': фактическое измерение объекта; ресурсную норму и технологию выбирает приложение.'},provenance:{...parameter.truth_metadata.provenance,consumer_input_role_v1:'OBJECT_FACT',retainedGeometryVisibilityV1:{capturedDefinitionId:parent.definition.id,visibleWhen:structuredClone(visible),consumerInputRole:prior.truth_metadata.provenance?.consumer_input_role_v1??null,guide:structuredClone(prior.truth_metadata.guide)},currentGeometryVisibilityReason:'Four ordinary object measurements of the single application-owned whole profile; no technical source selector question.'}};
  }
  if(parameter.parameter_id===geom.openingsId){const impossible={kind:'formula_greater_than',expression:geom.openingsId+'-'+geom.lengthId+'*'+geom.heightId,unitId:'m2',value:0};parameter.constraints_json={...parameter.constraints_json,forbiddenWhen:parameter.constraints_json.forbiddenWhen?{kind:'or',operands:[parameter.constraints_json.forbiddenWhen,impossible]}:impossible};}
 }
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldParameterIds.has(key))result.baseline.normative_source_ids[key]=key==='mdpc4_bed_m3'?[]:[pack.sourceId];}
 // This successor's approved runtime profile is the one source-owned whole
 // method. The captured predecessor retains its own public selector and
 // immutable revisions. Never infer its selection when this profile is absent.
 result.definition.applicability={...result.definition.applicability,primaryMeasureParameterId:MASONRY_AAC_KZ250_PRIMARY_AREA_R4,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.selectorId,selections:[{selectorValue:pack.selectorValue,primaryMeasureParameterId:MASONRY_AAC_KZ250_PRIMARY_AREA_R4,unitId:'m2'}]},masonryAacKz250CurrentCardR4:{contract:pack.contract,selectorId:pack.selectorId,selectorValue:pack.selectorValue,sourceCountry:'Kazakhstan',sourceEdition:'2019',kgComplianceClaim:false,wholeFamilyReady:false,historicalPrimaryMetadataPreservedInCapturedDefinitionId:parent.definition.id}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',masonryAacKz250CurrentCardR4:{reusedSavedWholeKzMethod:true,reusedDpcModule:true,reusedEffectiveMassOwner:true,mainLabourPaidOnceBy:part.paidMainLabourOwnerRowId,aacFirstCourseMortarOwnerRowId:bed.row_id,dpcBedNeedRowId:'masonry:bearing-dpc:loose-polyolefin:r4:bed-mortar',dpcBedNotCoveredByAacFirstCourse:true,dpcLabourNotFalselyIncluded:true,closedParentNeeds:0,newPublicCards:0,full:0}};
 return applyMasonryAacKz250OwnWholeKitReuseR4(applyMasonryAacKz250NormObjectBoundaryR4(applyMasonryAacKz250WholeFirstRowFeedReuseR4(result)));
}
export function compileMasonryAacKz250CurrentCardR4(model:Rep,parameters:Record<string,unknown>,options:Partial<Pick<CanonicalEstimateCompileCoreInput,'confirmedParameters'|'rowOverrides'|'compositionSelectionV1'>>={}){
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:model.definition.catalog_id,primaryMeasureParameterId:options.confirmedParameters?.[pack.selectorId]===pack.selectorValue?MASONRY_AAC_KZ250_PRIMARY_AREA_R4:geom.lengthId,parameterDefinitions:model.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:model.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:model.resources as CanonicalEstimateResourceDefinition[],submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},compositionSelectionV1:options.compositionSelectionV1,priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
}
