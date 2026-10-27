import rawCapture from '../../../../data/estimate-benchmarks/fixtures/facade-ventilated-current-parent-source-r5.json';
import source from '../../../../data/estimate-benchmarks/source-packs/facade-ventilated-thermowood-existing-owner-r5.json';
import endSource from '../../../../data/estimate-benchmarks/source-packs/facade-timber-end-protection-r5.json';
import boardSource from '../../../../data/estimate-benchmarks/source-packs/facade-board-source-fixing-r3.json';
import {
  buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticInclusionCondition,
} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {
  facadeBoardWithEndProtectionDefinitionR5,facadeBoardCutEndFactsR5,facadeTimberEndAreaR5,facadeTimberEndCompletenessR5,
  type FacadeTimberCutEndReadbackR5,
} from './facadeTimberEndProtectionWholeR5';
import {facadeApprovedBoardFixingCountsR3,facadeBoardFixingPrimaryR3,type FacadeApprovedBoardScheduleR3} from './facadeBoardSourceFixingR3';
import {
  compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,
  type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition,
} from '../backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph,compareFormulaGraphDecimals,isFormulaGraphExactDecimal,type FormulaAst} from '../backendPlatform/formulaGraph';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {assertCanonicalPrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
const record=(value:unknown):value is Json=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const requireRecord=(value:unknown,key:string):Json=>{
  if(!record(value))throw Error('VENTILATED_THERMOWOOD_CAPTURE_RECORD_REQUIRED:'+key);
  return value;
};
const fail: (message:string)=>never=(message:string):never=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const and=(...operands:unknown[]):Json=>({kind:'and',operands});
const rehash=(row:CanonicalEstimateResourceDefinition):CanonicalEstimateResourceDefinition=>{
  const {row_sha256:_previous,...body}=row;
  return {...body,row_sha256:hash(body)};
};
export const facadeVentilatedThermowoodCatalogR5=source.catalogId;
export const facadeVentilatedThermowoodSelectorR5='ventilated_cladding_exact_source_profile';
export const facadeVentilatedThermowoodLegacyR5='Сохранённый предварительный расчёт вентилируемого фасада';
export const facadeVentilatedThermowoodChoiceR5='Горизонтальная термодревесная шпунтованная облицовка по точному принятому исходному методу';
export const facadeVentilatedThermowoodAreaR5='ventilated_thermowood_net_area_m2';
const coveredArea='ventilated_thermowood_source_covered_net_area_m2';
const geometryDocument='ventilated_thermowood_geometry_document_sha256';
const supplyUnknown='ventilated_thermowood_unknown_gross_board_supply';
const prefix='facade:ventilated-thermowood:existing-owner:r5';
export const facadeVentilatedThermowoodSourceIdR5='gox_facade_ventilated_thermowood_existing_owner_r5';
const selected=(value:string):Json=>({kind:'selected',parameterId:facadeVentilatedThermowoodSelectorR5,value});
const legacy=selected(facadeVentilatedThermowoodLegacyR5),active=and(selected(facadeVentilatedThermowoodChoiceR5),
  {kind:'greater_than',parameterId:facadeVentilatedThermowoodAreaR5,value:0});

/** Exact existing source capture, not current object/BOM or a readback provider.
 * Normal and locked publisher checks must still prove the actual DB preimage.
 */
export function facadeVentilatedThermowoodCapturedParentR5():Readonly<{capture:Json;contentPassport:Json}> {
  const packet=requireRecord(rawCapture as unknown,'packet');
  if(packet.readOnly!==true||packet.databaseWrites!==0||packet.sameRawFullRowsReadTwice!==true
    ||!Array.isArray(packet.currentParents)||packet.currentParents.length!==1)throw Error('VENTILATED_THERMOWOOD_EXACT_SOURCE_CAPTURE_REQUIRED');
  const parent=requireRecord(packet.currentParents[0],'parent'),capture=requireRecord(parent.capture,'capture');
  const definition=requireRecord(capture.definition,'definition'),baseline=requireRecord(capture.baseline,'baseline');
  if(parent.catalogId!==source.catalogId||definition.catalog_id!==source.catalogId
    ||definition.id!==source.currentDefinitionId||definition.definition_sha256!==source.currentDefinitionSha256
    ||baseline.id!==source.currentBaselineId||!Array.isArray(capture.parameters)||capture.parameters.length!==5
    ||!Array.isArray(capture.formulas)||capture.formulas.length!==45||!Array.isArray(capture.resources)||capture.resources.length!==45
    ||!Array.isArray(capture.bindings)||capture.bindings.length!==0)throw Error('VENTILATED_THERMOWOOD_PARENT_IDENTITY_OR_SHAPE_DRIFT');
  return structuredClone({capture,contentPassport:requireRecord(parent.contentPassport,'contentPassport')});
}

function capturedOwner():AutomaticOwnerDefinition {
  const {capture}=facadeVentilatedThermowoodCapturedParentR5();
  if(!Array.isArray(capture.parameters)||!Array.isArray(capture.formulas)||!Array.isArray(capture.resources))throw Error('VENTILATED_THERMOWOOD_CAPTURE_ARRAYS_REQUIRED');
  const rawParameters:readonly unknown[]=capture.parameters,rawFormulas:readonly unknown[]=capture.formulas,rawResources:readonly unknown[]=capture.resources;
  const parameters=rawParameters.map(value=>{
    const p=requireRecord(value,'parameter'),truth=requireRecord(p.truth_metadata,'parameter.truth');
    if(typeof p.parameter_id!=='string'||typeof p.value_type!=='string'||typeof p.required!=='boolean'
      ||typeof p.title_ru!=='string'||!Number.isInteger(p.ordinal)||(p.unit_id!==null&&typeof p.unit_id!=='string')
      ||(p.constraints_json!==null&&!record(p.constraints_json)))throw Error('VENTILATED_THERMOWOOD_PARAMETER_SHAPE_REQUIRED');
    return {...p,parameter_id:p.parameter_id,value_type:p.value_type,required:p.required,default_value:p.default_value,
      title_ru:p.title_ru,ordinal:p.ordinal as number,unit_id:p.unit_id,
      constraints_json:p.constraints_json,truth_metadata:truth};
  });
  const formulas:CanonicalEstimateFormulaDefinition[]=rawFormulas.map(value=>{
    const f=requireRecord(value,'formula');
    if(typeof f.formula_id!=='string'||typeof f.expression_source!=='string'||typeof f.output_unit_id!=='string'
      ||typeof f.ast_sha256!=='string'||!Array.isArray(f.input_parameter_ids)||!f.input_parameter_ids.every((id:unknown)=>typeof id==='string')
      ||!same(compileFormulaGraph(f.expression_source).ast,f.ast))throw Error('VENTILATED_THERMOWOOD_ORIGINAL_FORMULA_SHAPE_REQUIRED');
    // The existing parser validates shape; retain the actual original AST/hash.
    return {...f,formula_id:f.formula_id,expression_source:f.expression_source,output_unit_id:f.output_unit_id,
      ast:f.ast as FormulaAst,input_parameter_ids:f.input_parameter_ids,ast_sha256:f.ast_sha256};
  });
  const resources:CanonicalEstimateResourceDefinition[]=rawResources.map(value=>{
    const r=requireRecord(value,'resource');
    for(const key of ['id','row_id','section','category','title_ru','unit_id','formula_id','row_sha256'])
      if(typeof r[key]!=='string')throw Error('VENTILATED_THERMOWOOD_RESOURCE_STRING_REQUIRED:'+key);
    if(!Number.isInteger(r.ordinal)||typeof r.procurement_eligible!=='boolean'||(r.cost_owner_id!==null&&typeof r.cost_owner_id!=='string')
      ||!record(r.resource_graph)||!record(r.inclusion_ast)||(r.source_metadata!==null&&!record(r.source_metadata)))throw Error('VENTILATED_THERMOWOOD_RESOURCE_SHAPE_REQUIRED');
    if(r.inclusion_ast.kind!=='literal'||typeof r.inclusion_ast.value!=='boolean')throw Error('VENTILATED_THERMOWOOD_ORIGINAL_LITERAL_SCOPE_REQUIRED');
    return {...r,id:r.id as string,row_id:r.row_id as string,ordinal:r.ordinal as number,section:r.section as string,
      category:r.category as string,title_ru:r.title_ru as string,unit_id:r.unit_id as string,formula_id:r.formula_id as string,
      inclusion_ast:r.inclusion_ast,resource_graph:r.resource_graph,procurement_eligible:r.procurement_eligible,
      cost_owner_id:r.cost_owner_id,source_metadata:r.source_metadata,row_sha256:r.row_sha256 as string};
  });
  if(resources.filter(row=>row.inclusion_ast.value===true).length!==16)throw Error('VENTILATED_THERMOWOOD_LEGACY16_29_REQUIRED');
  return {parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)};
}

export const facadeVentilatedThermowoodPrimarySelectionR5=()=>({contract:'canonical-primary-measure-selection/v1' as const,
  selectorParameterId:facadeVentilatedThermowoodSelectorR5,selections:[
    {selectorValue:facadeVentilatedThermowoodLegacyR5,primaryMeasureParameterId:'facade_area_m2',unitId:'m2'},
    {selectorValue:facadeVentilatedThermowoodChoiceR5,primaryMeasureParameterId:facadeVentilatedThermowoodAreaR5,unitId:'m2'},
  ]});

/** Reuse one whole existing component through the existing composition helper.
 * No namespace: all original child IDs/owner references are retained once.
 * The new area is scope, not an area-to-screw/board/labour conversion.
 */
export function facadeVentilatedThermowoodDefinitionR5():AutomaticOwnerDefinition {
  const parent=capturedOwner(),child=facadeBoardWithEndProtectionDefinitionR5();
  const legacyParent={...parent,parameters:parent.parameters.map(p=>({...p,required:false,
    constraints_json:{...p.constraints_json,requiredWhen:and(legacy,p.constraints_json?.requiredWhen??{kind:'literal',value:p.required})},
    truth_metadata:{...p.truth_metadata,visible_when:and(legacy,p.truth_metadata.visible_when??{kind:'literal',value:true})}})),
    resources:parent.resources.map(row=>rehash({...row,inclusion_ast:and(legacy,row.inclusion_ast)}))};
  const scope=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:prefix,
    sourceId:facadeVentilatedThermowoodSourceIdR5,normId:'EXACT_EXISTING_SOURCE_PROFILE_SCOPE_NOT_AREA_RATE',
    sourceMetadata:{source_title:'Точный профиль термодревесной фасадной облицовки',source_document_version:'Original cladding2022;endgrain TDS2022-10-11rev3',
      definition_hash:endSource.parentBoardSourceSha256,artifact_sha256:endSource.parentBoardSourceSha256,exact_locator:'Original cladding PDF36;onecoat endgrain TDS PDF2;actual same-piece imported layout'},
    applicabilityRu:'Только исходная термодревесная шпунтованная облицовка с принятой подсистемой, креплением и совместимым торцевым составом. Площадь не подтверждает проект и раскрой.',
    ordinary:[{id:facadeVentilatedThermowoodSelectorR5,title:'Готовый профиль вентилируемого фасада',kind:'ordinary',valueType:'enum',unitId:null,
      values:[facadeVentilatedThermowoodLegacyR5,facadeVentilatedThermowoodChoiceR5]},
      {id:facadeVentilatedThermowoodAreaR5,title:'Фактическая площадь облицовки без проёмов',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],
    profile:[],conditional:[
      {id:coveredArea,title:'Чистая площадь того же фасада по принятой ведомости раскроя',kind:'conditional',valueType:'decimal',unitId:'m2',min:0,requiredWhen:active as AutomaticInclusionCondition},
      {id:geometryDocument,title:'Идентичность исходного документа обмера и раскроя',kind:'conditional',valueType:'text',unitId:null,requiredWhen:active as AutomaticInclusionCondition},
      {id:supplyUnknown,title:'Поставка совместимой термодревесной доски по полному раскрою',kind:'internal',valueType:'decimal',unitId:null,min:0},
    ],rows:[
      {rowId:prefix+':net-area-scope',formulaId:prefix+':formula:net-area-scope',section:'Облицовка фасада термодревесной доской',title:'Площадь облицовки термодревесной доской',category:'work',unitId:'m2',
        expression:facadeVentilatedThermowoodAreaR5,inclusion:active as AutomaticInclusionCondition,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'},
      {rowId:prefix+':need:board-supply',formulaId:prefix+':formula:need:board-supply',section:'Облицовка фасада термодревесной доской',title:'Термодревесная фасадная доска: поставка по принятому раскрою',category:'material',unitId:'',
        expression:supplyUnknown,inclusion:active as AutomaticInclusionCondition,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'},
    ],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[
      'Прежние инженерные коэффициенты не определяют состав нового профиля.',
      'Площадь не задаёт шаг обрешётки, число досок, креплений, торцов, запас, фасовку и труд.',
      'Без реального источникового обмера и принятого раскроя состав остаётся предварительным.',
    ]});
  const scoped:AutomaticOwnerDefinition={...scope,parameters:scope.parameters.map(p=>{
    if(p.parameter_id===supplyUnknown)return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Не принят полный проектный раскрой, исходные размеры/профиль и фактическая поставка доски с остатками и упаковкой; крепёжная ведомость не является поставкой доски.')};
    if(p.parameter_id===facadeVentilatedThermowoodAreaR5)return {...p,required:false,
      constraints_json:{...p.constraints_json,requiredWhen:selected(facadeVentilatedThermowoodChoiceR5)},
      truth_metadata:{...p.truth_metadata,visible_when:selected(facadeVentilatedThermowoodChoiceR5)}};
    if(p.parameter_id===coveredArea||p.parameter_id===geometryDocument)return {...p,required:false,
      constraints_json:{...p.constraints_json,...(p.parameter_id===coveredArea?{equalToParameter:facadeVentilatedThermowoodAreaR5}:{})},
      truth_metadata:{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',
        source_confirmation_required:false,preliminary_compilation_allowed:true,
        provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
    return p;
  }),resources:scope.resources.map(row=>{
    const need=row.row_id===prefix+':need:board-supply';
    const operation=need?'receive-supply':'accept-area';
    return rehash({...row,resource_graph:{...row.resource_graph,operationCompositionV1:{
      contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Облицовка фасада термодревесной доской',
      operationId:prefix+':operation:'+operation,operationTitleRu:need?'Принять поставку доски по полному раскрою':'Проверить площадь и границу облицовки',
      processOrdinal:need?2:1,completionCriterionRu:need?'Приняты полный раскрой и фактическая поставка; крепёжная ведомость не заменяет поставку.':'Площадь совпадает с той же принятой ведомостью деталей.'}},source_metadata:{...row.source_metadata,
      sourceRole:need?'UNRESOLVED_APPLICATION_NORM':'ACTUAL_PUBLIC_GEOMETRY_SCOPE_NOT_SUPPLY_OR_LABOUR',
      normativeTrace:[],quantityNormAccepted:false,automaticGenericPriceInheritanceAllowed:false,
      ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true}:{}),full_technical_acceptance:false,newFull:0}});
  })};
  const anyProfile:AutomaticInclusionCondition={kind:'or',operands:[
    {kind:'equals',parameterId:facadeVentilatedThermowoodSelectorR5,value:facadeVentilatedThermowoodLegacyR5},
    {kind:'equals',parameterId:facadeVentilatedThermowoodSelectorR5,value:facadeVentilatedThermowoodChoiceR5}]};
  const withScope=appendOptionalAutomaticOwnerR1({parent:legacyParent,child:scoped,when:anyProfile});
  const boundChild:AutomaticOwnerDefinition={...child,parameters:child.parameters.map(p=>({...p,required:false,
    constraints_json:{...p.constraints_json,requiredWhen:and(active,p.constraints_json?.requiredWhen??{kind:'literal',value:false})}})),
    resources:child.resources.map(row=>{
      const context=row.resource_graph.inputParameterIds;
      if(!Array.isArray(context)||!context.every((id:unknown)=>typeof id==='string'))throw Error('VENTILATED_THERMOWOOD_NATIVE_CHILD_CONTEXT_REQUIRED');
      return rehash({...row,resource_graph:{...row.resource_graph,inputParameterIds:[...new Set([...context,coveredArea,geometryDocument])]},
        source_metadata:{...row.source_metadata,existingComponentIdsUnchanged:true,noAdditionalPaidOrPurchaseOwner:true,full_technical_acceptance:false}});
    })};
  const joined=appendOptionalAutomaticOwnerR1({parent:withScope,child:boundChild,when:active as AutomaticInclusionCondition});
  const consumers=buildMasterParameterCalculationConsumers(joined);
  return {...joined,ordinaryParameterIds:[...parent.ordinaryParameterIds,...scope.ordinaryParameterIds],
    parameters:joined.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
      formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}})),
    resources:joined.resources.map(rehash)};
}

/** Requirements come from the two original component source packs, not the
 * generated rows. The old engineering-reference branch remains a separate
 * retained preliminary scope and is not claimed covered by these norms. */
export function facadeVentilatedThermowoodCompletenessR5() {
  const p=boardSource.profiles.find(p=>p.key==='thermowood-horizontal-tg');
  if(!p)throw Error('VENTILATED_THERMOWOOD_ORIGINAL_PROFILE_REQUIRED');
  const boardEntry=(key:string,title:string,category:string,unitId:string|null)=>{
    const ops=key==='screws'?boardSource.operations.filter(o=>['drill','screw','inspect-clean'].includes(o.key)):boardSource.operations;
    return {expectedResourceId:p.prefix+':expected:'+key,operationId:p.prefix+':operation:'+ops[0]!.key,
      requiredOperationIds:ops.map(o=>p.prefix+':operation:'+o.key),category,unitId,specification:title,
      condition:'EXACT_THERMOWOOD_PROFILE_AND_ACTUAL_APPROVED_PIECE_SCHEDULE',
      sourceId:'gox_facade_board_source_fixing_r3_thermowood-horizontal-tg',
      quantityRule:key==='screws'?'LITERAL_ONE_OR_TWO_SCREWS_PER_ACTUAL_SOURCE_FIT_INTERSECTION':'UNRESOLVED_WHOLE_CYCLE_INTERNAL_NORM',
      formulaId:p.prefix+':formula:'+key,resolution:{kind:'ROW',rowId:p.prefix+':'+key}};
  };
  const scopeEntry=(key:string,title:string,category:string,unitId:string|null,operation:string)=>({
    expectedResourceId:prefix+':expected:'+key,operationId:prefix+':operation:'+operation,
    requiredOperationIds:[prefix+':operation:'+operation],category,unitId,specification:title,
    condition:'EXACT_THERMOWOOD_PROFILE_NET_FACADE_AREA_POSITIVE',sourceId:facadeVentilatedThermowoodSourceIdR5,
    quantityRule:key==='net-area-scope'?'ACTUAL_PUBLIC_GEOMETRY_NOT_MATERIAL_OR_LABOUR_RATE':'UNRESOLVED_GROSS_BOARD_SUPPLY',
    formulaId:prefix+':formula:'+key,resolution:{kind:'ROW',rowId:prefix+':'+key}});
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',
    generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:p.source.sha256,
    evidenceReferences:source.retainedPrimarySourceMetadata.map(d=>d.path),
    entries:[scopeEntry('net-area-scope','Площадь облицовки термодревесной доской','work','m2','accept-area'),
      scopeEntry('need:board-supply','Термодревесная фасадная доска по полному раскрою','material',null,'receive-supply'),
      boardEntry('screws','Винт лицевого крепления фасадной доски','material','piece'),
      ...p.needs.map(n=>boardEntry('need:'+n.key,n.titleRu,n.category,n.unitId)),
      ...facadeTimberEndCompletenessR5().entries],
    retainedLegacyCoverage:'EXACT_OLD_PRELIMINARY_BRANCH_NOT_NEW_MANUFACTURER_NORM',
    wholeFacadeAccepted:false,fullTechnicalAcceptance:false,newFULL:0};
}

/** Independently captured original owner: used for original-before-overlay
 * replays, never obtained by removing rows from the candidate definition. */
export const facadeVentilatedOriginalDefinitionR5=()=>capturedOwner();

export type FacadeVentilatedThermowoodReadbackR5=Readonly<{
  sourceProfile:'thermowood-horizontal-tg';netFacadeAreaM2:string;geometryDocumentSha256:string;
  schedule:FacadeApprovedBoardScheduleR3;ends:FacadeTimberCutEndReadbackR5;
}>;

/** Internal trusted importer data, never a second request/provider or proof of
 * document authenticity. The existing imported-source channel owns that proof.
 */
function confirmedReadback(input:Record<string,unknown>,readback:FacadeVentilatedThermowoodReadbackR5):Record<string,unknown> {
  const area=input[facadeVentilatedThermowoodAreaR5];
  if(readback.sourceProfile!=='thermowood-horizontal-tg'||(typeof area!=='string'&&typeof area!=='number')||!isFormulaGraphExactDecimal(area)
    ||typeof readback.netFacadeAreaM2!=='string'||!isFormulaGraphExactDecimal(readback.netFacadeAreaM2)||compareFormulaGraphDecimals(area,'0')<=0
    ||compareFormulaGraphDecimals(area,readback.netFacadeAreaM2)!==0||!/^[0-9a-f]{64}$/iu.test(readback.geometryDocumentSha256)
    ||readback.geometryDocumentSha256!==readback.schedule.approvedLayoutSha256)
    fail('VENTILATED_THERMOWOOD_EXACT_SAME_SOURCE_GEOMETRY_REQUIRED');
  const ends=facadeBoardCutEndFactsR5(readback.schedule,readback.ends),counts=facadeApprovedBoardFixingCountsR3(readback.schedule);
  return {[coveredArea]:readback.netFacadeAreaM2,[geometryDocument]:readback.geometryDocumentSha256,
    [facadeBoardFixingPrimaryR3]:counts.boards,board_fixing_actual_narrow_intersections:counts.narrow,
    board_fixing_actual_wide_intersections:counts.wide,board_fixing_approved_project:readback.schedule.approvedProjectReference,
    board_fixing_layout_sha256:readback.schedule.approvedLayoutSha256,board_fixing_exact_source:readback.schedule.sourceSha256,
    [facadeTimberEndAreaR5]:ends.netEndAreaM2,timber_end_protection_exact_method:endSource.selectedMethod.publicNameRu,
    timber_end_protection_approved_source:ends.approvedSourceFitReference,timber_end_protection_layout_sha256:ends.approvedEndLayoutSha256};
}

function primarySchema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[] {
  return model.parameters.map(p=>{
    const truth=p.truth_metadata,provenance=truth.provenance,consumers=truth.formula_consumers;
    if(typeof truth.visibility_role!=='string'||typeof truth.value_source_role!=='string'
      ||(provenance!=null&&!record(provenance))||!Array.isArray(consumers)||!consumers.every((id:unknown)=>typeof id==='string'))
      throw Error('VENTILATED_THERMOWOOD_PRIMARY_SCHEMA_SOURCE_SHAPE_REQUIRED');
    return {parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:truth.visibility_role,
      valueSourceRole:truth.value_source_role,provenance:provenance??undefined,constraints:p.constraints_json??undefined,
      formulaConsumers:consumers};
  });
}

export function compileFacadeVentilatedThermowoodR5(input:Record<string,unknown>,options:Readonly<{
  readback?:FacadeVentilatedThermowoodReadbackR5;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
}>={}) {
  const choice=input[facadeVentilatedThermowoodSelectorR5],legacyIds=['source_prompt','facade_area_m2','floors','project_location','drawings_or_specification'];
  const allowed=new Set([facadeVentilatedThermowoodSelectorR5,...(choice===facadeVentilatedThermowoodLegacyR5?legacyIds:[facadeVentilatedThermowoodAreaR5])]);
  if(Object.keys(input).some(id=>!allowed.has(id)))fail('VENTILATED_THERMOWOOD_TECHNICAL_FACTS_REQUIRE_TRUSTED_READBACK');
  if(options.readback&&choice!==facadeVentilatedThermowoodChoiceR5)fail('VENTILATED_THERMOWOOD_READBACK_WRONG_PROFILE');
  const model=facadeVentilatedThermowoodDefinitionR5();
  const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:facadeVentilatedThermowoodPrimarySelectionR5(),submittedParameters:input,
    parameterSchema:primarySchema(model)});
  if(primary.kind!=='RESOLVED')fail('VENTILATED_THERMOWOOD_EXPLICIT_PROFILE_REQUIRED');
  return compileCanonicalEstimateCore({operation:'recalculate',catalogId:source.catalogId,compilerVersion:source.contract,
    primaryMeasureParameterId:primary.primaryMeasure.parameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
    submittedParameters:input,confirmedParameters:options.readback?confirmedReadback(input,options.readback):{},rowOverrides:options.rowOverrides??{},
    priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
