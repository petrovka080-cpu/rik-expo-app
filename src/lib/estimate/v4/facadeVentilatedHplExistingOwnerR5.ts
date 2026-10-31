import panelSource from '../../../../data/estimate-benchmarks/source-packs/facade-panel-face-fixing-r3.json';
import {
  facadeVentilatedThermowoodDefinitionR5,facadeVentilatedThermowoodPrimarySelectionR5,facadeVentilatedThermowoodCompletenessR5,
  facadeVentilatedThermowoodSelectorR5 as selector,facadeVentilatedThermowoodCatalogR5 as catalogId,
} from './masterFacadeVentilatedThermowoodR5';
import {
  facadePanelFaceFixingDefinitionR3,facadeApprovedPanelFixingCountsR3,facadeFaceFixingPrimaryR3,
  type FacadeApprovedPanelScheduleR3,
} from './facadePanelFaceFixingR3';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {assertCanonicalPrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {isFormulaGraphExactDecimal,compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

// WORK IN PROGRESS after exact48+49. Not part of their frozen intake manifests,
// not executed, not registered, and not a second catalog/calculation pipeline.
const profile=(()=>{const p=panelSource.profiles.find(p=>p.key==='hpl-rivet8-aluminium');
  if(!p)throw Error('HPL_EXISTING_EXACT_SOURCE_PROFILE_REQUIRED');return p;})();
const prefix='facade:ventilated-hpl:existing-owner:r5',contract='gox.facade.ventilated.hpl-existing-owner/r5';
const sourceId='gox_facade_ventilated_hpl_existing_owner_r5';
export const facadeVentilatedHplAreaR5='ventilated_hpl_net_area_m2';
export const facadeVentilatedHplChoiceR5=profile.titleRu;
const coveredArea='ventilated_hpl_source_covered_net_area_m2',document='ventilated_hpl_geometry_point_layout_sha256';
const grossSupply='ventilated_hpl_unknown_gross_panel_supply';
const selected={kind:'equals' as const,parameterId:selector,value:facadeVentilatedHplChoiceR5};
const active:AutomaticInclusionCondition={kind:'and',operands:[selected,{kind:'greater_than',parameterId:facadeVentilatedHplAreaR5,value:0}]};
const and=(...operands:unknown[])=>({kind:'and',operands});
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail:(message:string)=>never=message=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};
const rehash=(row:CanonicalEstimateResourceDefinition)=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};

export function facadeVentilatedHplPrimarySelectionR5(){const base=facadeVentilatedThermowoodPrimarySelectionR5();
  return {...base,selections:[...base.selections,{selectorValue:facadeVentilatedHplChoiceR5,primaryMeasureParameterId:facadeVentilatedHplAreaR5,unitId:'m2'}]};}

/** One new native source profile inside the SAME existing facade owner. The
 * existing panel component's IDs, formulae, source roles and payment survive.
 * No namespace or numeric alias: its panel IDs do not collide with board IDs.
 */
export function facadeVentilatedHplDefinitionR5():AutomaticOwnerDefinition {
  const parent=facadeVentilatedThermowoodDefinitionR5(),child=facadePanelFaceFixingDefinitionR3('hpl-rivet8-aluminium');
  const withChoice:AutomaticOwnerDefinition={...parent,parameters:parent.parameters.map(p=>{
    if(p.parameter_id!==selector)return p;
    const values=p.constraints_json?.values,guide=p.truth_metadata.guide;
    if(!Array.isArray(values)||!values.every((v:unknown)=>typeof v==='string')||values.includes(facadeVentilatedHplChoiceR5)||!record(guide))
      throw Error('HPL_EXISTING_SELECTOR_EXACT_EXTENSION_REQUIRED');
    return {...p,constraints_json:{...p.constraints_json,values:[...values,facadeVentilatedHplChoiceR5]},
      truth_metadata:{...p.truth_metadata,guide:{...guide,
        guide_short_ru:'Выберите сохранённый расчёт или готовый исходный профиль вентилируемого фасада.',
        source_locator:String(guide.source_locator??'')+';HPL NorthAmericaJuly2026 PDF35–37;original8mm aluminium rivet profile'}}};
  })};
  const scope=buildAutomaticConstructionOwnerR1({contract,semanticOwner:prefix,sourceId,normId:'EXACT_HPL_PROFILE_GEOMETRY_SCOPE_NOT_AREA_QUANTITY_RATE',
    sourceMetadata:{source_title:facadeVentilatedHplChoiceR5,source_document_version:profile.source.territory,
      definition_hash:profile.source.sha256,artifact_sha256:profile.source.sha256,exact_locator:'PDF35–37 exact original8mm aluminium rivet profile;actual accepted point schedule'},
    applicabilityRu:'Только исходная наружная компактная плита8мм на алюминиевой подсистеме. Площадь не определяет сетку крепежа и не подтверждает конструктивный расчёт.',
    ordinary:[{id:facadeVentilatedHplAreaR5,title:'Фактическая площадь компактной фасадной облицовки без проёмов',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],
    profile:[],conditional:[{id:coveredArea,title:'Площадь того же фасада по принятой поэлементной схеме',kind:'conditional',valueType:'decimal',unitId:'m2',min:0,requiredWhen:active},
      {id:document,title:'Идентичность документа обмера и схемы точек крепления',kind:'conditional',valueType:'text',unitId:null,requiredWhen:active},
      {id:grossSupply,title:'Полная поставка совместимой компактной фасадной плиты',kind:'internal',valueType:'decimal',unitId:null,min:0}],
    rows:[{rowId:prefix+':net-area-scope',formulaId:prefix+':formula:net-area-scope',section:'Облицовка фасада компактными плитами',title:'Площадь облицовки компактными плитами',
      category:'work',unitId:'m2',expression:facadeVentilatedHplAreaR5,inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'},
      {rowId:prefix+':need:panel-supply',formulaId:prefix+':formula:need:panel-supply',section:'Облицовка фасада компактными плитами',title:'Компактная фасадная плита: поставка по полному раскрою',
        category:'material',unitId:'',expression:grossSupply,inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'}],
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Площадь не задаёт число плит, точек, размер зазора, шаг подсистемы, отходы и труд.',
      'Старые инженерные нормы и крепёж другого плитного профиля не переносятся.','Схема фиксированных/подвижных точек не является полной закупочной ведомостью плиты.']});
  const scoped:AutomaticOwnerDefinition={...scope,parameters:scope.parameters.map(p=>{
    if(p.parameter_id===grossSupply)return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Нет полного принятого раскроя и поставки совместимой плиты с реальными форматами, остатками и упаковкой; число крепёжных точек поставку не задаёт.')};
    if(p.parameter_id===facadeVentilatedHplAreaR5)return {...p,truth_metadata:{...p.truth_metadata,visible_when:selected}};
    return {...p,required:false,constraints_json:{...p.constraints_json,...(p.parameter_id===coveredArea?{equalToParameter:facadeVentilatedHplAreaR5}:{})},
      truth_metadata:{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:false,
        preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
  }),resources:scope.resources.map(r=>{
    const need=r.row_id===prefix+':need:panel-supply',operation=need?'receive-supply':'accept-area';
    return rehash({...r,resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,
      groupTitleRu:'Облицовка фасада компактными плитами',operationId:prefix+':operation:'+operation,operationTitleRu:need?'Принять поставку плиты по полному раскрою':'Проверить площадь и границу облицовки',
      processOrdinal:need?2:1,completionCriterionRu:need?'Принята полная поставка, не только число точек крепления.':'Обмер относится к той же принятой поэлементной схеме.'}},
      source_metadata:{...r.source_metadata,sourceRole:need?'UNRESOLVED_APPLICATION_NORM':'ACTUAL_PUBLIC_GEOMETRY_SCOPE_NOT_SUPPLY_OR_LABOUR',
        normativeTrace:[],quantityNormAccepted:false,automaticGenericPriceInheritanceAllowed:false,...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true}:{}),
        full_technical_acceptance:false,newFull:0}});
  })};
  const withScope=appendOptionalAutomaticOwnerR1({parent:withChoice,child:scoped,when:selected});
  const bound:AutomaticOwnerDefinition={...child,parameters:child.parameters.map(p=>({...p,required:false,
    constraints_json:{...p.constraints_json,requiredWhen:and(active,p.constraints_json?.requiredWhen??{kind:'literal',value:false})}})),
    resources:child.resources.map(r=>{const ids=r.resource_graph.inputParameterIds;
      if(!Array.isArray(ids)||!ids.every((id:unknown)=>typeof id==='string'))throw Error('HPL_NATIVE_CHILD_CONTEXT_REQUIRED');
      return rehash({...r,resource_graph:{...r.resource_graph,inputParameterIds:[...new Set([...ids,coveredArea,document])]}});})};
  const result=appendOptionalAutomaticOwnerR1({parent:withScope,child:bound,when:active}),consumers=buildMasterParameterCalculationConsumers(result);
  return {...result,ordinaryParameterIds:[...parent.ordinaryParameterIds,...scope.ordinaryParameterIds],parameters:result.parameters.map(p=>({...p,
    truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}

/** Original operation/source requirements, not a map generated from rows. */
export function facadeVentilatedHplCompletenessR5(){
  const base=facadeVentilatedThermowoodCompletenessR5();
  const pointEntry=(key:string,title:string,category:string,unitId:string|null)=>{
    const operations=key==='fixed'||key==='sliding'?panelSource.operations.filter(o=>['drill-center','rivet','inspect-clean'].includes(o.key)):panelSource.operations;
    return {expectedResourceId:profile.prefix+':expected:'+key,operationId:profile.prefix+':operation:'+operations[0]!.key,
      requiredOperationIds:operations.map(o=>profile.prefix+':operation:'+o.key),category,unitId,specification:title,
      condition:'EXACT_HPL8_ALUMINIUM_PROFILE_AND_SAME_APPROVED_PANEL_POINT_SCHEDULE',
      sourceId:'gox_facade_panel_face_fixing_r3_hpl-rivet8-aluminium',
      quantityRule:key==='fixed'?'ORIGINAL_ONE_FIXED_POINT_PER_ACTUAL_PANEL':key==='sliding'?'ACTUAL_APPROVED_POINTS_MINUS_ONE_FIXED_POINT_PER_PANEL':'UNRESOLVED_WHOLE_FACADE_CYCLE_REQUIREMENT',
      formulaId:profile.prefix+':formula:'+key,resolution:{kind:'ROW',rowId:profile.prefix+':'+key}};
  };
  const scopeEntry=(key:string,title:string,category:string,unitId:string|null,operation:string)=>({
    expectedResourceId:prefix+':expected:'+key,operationId:prefix+':operation:'+operation,requiredOperationIds:[prefix+':operation:'+operation],
    category,unitId,specification:title,condition:'EXACT_HPL_PROFILE_NET_FACADE_AREA_POSITIVE',sourceId,
    quantityRule:key==='net-area-scope'?'ACTUAL_PUBLIC_GEOMETRY_NOT_SUPPLY_OR_LABOUR_RATE':'UNRESOLVED_FULL_PROJECT_PANEL_SUPPLY',
    formulaId:prefix+':formula:'+key,resolution:{kind:'ROW',rowId:prefix+':'+key}});
  return {...base,entries:[...base.entries,
    scopeEntry('net-area-scope','Площадь облицовки компактными плитами','work','m2','accept-area'),
    scopeEntry('need:panel-supply','Компактная фасадная плита: полная поставка по раскрою','material',null,'receive-supply'),
    pointEntry('fixed','Лицевая заклёпка в фиксированной точке','material','piece'),
    pointEntry('sliding','Лицевая заклёпка в подвижной точке','material','piece'),
    ...panelSource.protectedNeeds.map(n=>pointEntry('need:'+n.key,n.titleRu,n.category,n.unitId))],
    evidenceReferences:[...base.evidenceReferences,profile.source.path],additionalEvidenceSha256:[profile.source.sha256],
    hplApplicableUnknownNeeds:8,originalTwoOtherProfilesNotClaimedClosed:true,wholeFacadeAccepted:false,fullTechnicalAcceptance:false,newFULL:0};
}

export type FacadeVentilatedHplReadbackR5=Readonly<{sourceProfile:'hpl-rivet8-aluminium';netFacadeAreaM2:string;
  geometryDocumentSha256:string;schedule:FacadeApprovedPanelScheduleR3}>;
function sourceFacts(input:Record<string,unknown>,readback:FacadeVentilatedHplReadbackR5):Record<string,unknown> {
  const area=input[facadeVentilatedHplAreaR5];
  if(readback.sourceProfile!=='hpl-rivet8-aluminium'||readback.schedule.profile!=='hpl-rivet8-aluminium'
    ||(typeof area!=='string'&&typeof area!=='number')||!isFormulaGraphExactDecimal(area)||cmp(area,'0')<=0
    ||typeof readback.netFacadeAreaM2!=='string'||!isFormulaGraphExactDecimal(readback.netFacadeAreaM2)||cmp(area,readback.netFacadeAreaM2)!==0
    ||!/^[0-9a-f]{64}$/iu.test(readback.geometryDocumentSha256)||readback.geometryDocumentSha256!==readback.schedule.approvedPointLayoutSha256)
    fail('HPL_EXACT_SAME_SOURCE_GEOMETRY_REQUIRED');
  const n=facadeApprovedPanelFixingCountsR3(readback.schedule);
  return {[coveredArea]:readback.netFacadeAreaM2,[document]:readback.geometryDocumentSha256,[facadeFaceFixingPrimaryR3]:n.panels,
    panel_fixing_actual_total_points:n.total,panel_fixing_approved_project:readback.schedule.approvedProjectReference,
    panel_fixing_layout_sha256:readback.schedule.approvedPointLayoutSha256,panel_fixing_exact_source:readback.schedule.sourceSha256};
}
function schema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[]{return model.parameters.map(p=>{
  const t=p.truth_metadata,provenance=t.provenance,consumers=t.formula_consumers;
  if(typeof t.visibility_role!=='string'||typeof t.value_source_role!=='string'||(provenance!=null&&!record(provenance))
    ||!Array.isArray(consumers)||!consumers.every((id:unknown)=>typeof id==='string'))throw Error('HPL_PRIMARY_SCHEMA_SOURCE_SHAPE_REQUIRED');
  return {parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,
    provenance:provenance??undefined,constraints:p.constraints_json??undefined,formulaConsumers:consumers};
});}

/** New-profile fresh compile only. Readback is an INTERNAL trusted-import
 * envelope, not authentication or an ordinary technical questionnaire. Saved
 * primary changes go through the existing NEW_ROOT_REQUIRED boundary. */
export function compileFacadeVentilatedHplR5(input:Record<string,unknown>,options:Readonly<{readback?:FacadeVentilatedHplReadbackR5;
  parentPrimaryMeasure?:unknown;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']} >={}) {
  if(input[selector]!==facadeVentilatedHplChoiceR5)fail('HPL_EXACT_SELECTED_PROFILE_REQUIRED');
  const allowed=new Set([selector,facadeVentilatedHplAreaR5]);if(Object.keys(input).some(id=>!allowed.has(id)))fail('HPL_TECHNICAL_FACTS_REQUIRE_TRUSTED_READBACK');
  const model=facadeVentilatedHplDefinitionR5(),primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:facadeVentilatedHplPrimarySelectionR5(),
    submittedParameters:input,parameterSchema:schema(model),parentPrimaryMeasure:options.parentPrimaryMeasure});
  if(primary.kind!=='RESOLVED')fail('HPL_EXPLICIT_PRIMARY_SELECTION_REQUIRED');
  return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:contract,catalogId,primaryMeasureParameterId:primary.primaryMeasure.parameterId,
    parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:input,
    confirmedParameters:options.readback?sourceFacts(input,options.readback):{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',
    maximumResourceRows:model.resources.length,hashJson:hash});
}
