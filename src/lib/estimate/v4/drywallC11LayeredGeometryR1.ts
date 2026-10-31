import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import physicalC11 from '../../../../data/estimate-benchmarks/source-packs/c11-current-physical-continuation-r1.json';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import pack from '../../../../data/estimate-benchmarks/source-packs/drywall-c11-layered-geometry-r1.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
type Json=Record<string,any>;
export const drywallC11LayeredGeometryPackR1=pack;
export type DrywallC11LayeredProfileR1='two-layer'|'three-layer';
type Parent=Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;
export const drywallC11LayeredPrimarySelectionR1={contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.selector.id,
 selections:[{selectorValue:pack.selector.legacyValue,primaryMeasureParameterId:'area_m2',unitId:'m2'},
  ...pack.profiles.map(p=>({selectorValue:p.value,primaryMeasureParameterId:pack.geometry.areaId,unitId:'m2'}))]} as const;
const prefix=(key:string)=>'drywall:c11:'+key,id=(key:string,suffix:string)=>prefix(key)+':'+suffix;
const condition=(value:string)=>({kind:'equals',parameterId:pack.selector.id,value});
const selected={kind:'or',operands:pack.profiles.map(p=>condition(p.value))};
const operations=(key:string,keys:readonly string[])=>{const refs=keys.map(k=>{const op=pack.operations.find(o=>o.id===k);if(!op)throw Error('C11_OPERATION:'+k);return{
 operationId:id(key,'operation:'+k),operationTitleRu:op.nameRu,processOrdinal:pack.operations.indexOf(op),processRole:'PROCESS' as const,
 completionCriterionRu:'Монтаж выполнен в границах выбранной многослойной системы; незакрытые физические потребности сохранены.'};});return{
 contractVersion:'canonical-operation-resource/v1',groupId:prefix(key),groupTitleRu:pack.titleRu,...refs[0]!,additionalOperations:refs.slice(1)};};
const expression=(text:string,layers:number,step35:string)=>text.replaceAll('LAYERS',String(layers)).replaceAll('STEP35',step35);
const unknowns=(key:string)=>pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||key==='three-layer');
const materials=(key:string)=>pack.materials.filter(m=>m.key!=='screw55'||key==='three-layer');

/** Reuses the full accepted four-stage C111 kit inventory and the same purchase
 * and calculation owners. Only explicit new layered branches get new source
 * geometry. Existing C111 arithmetic and saved definitions are not rewritten. */
export function buildDrywallC11LayeredGeometryBranchR1(key:DrywallC11LayeredProfileR1,parent:Parent):AutomaticOwnerDefinition{
 const profile=pack.profiles.find(p=>p.key===key)!;if(!profile)throw Error('C11_EXACT_LAYERED_PROFILE_REQUIRED');
 const rows:AutomaticRowSpec[]=[],owner=id(key,'whole-work'),specs=new Map<string,{ops:string[];role:'RESOURCE'|'CALCULATION_DETAIL';reuse?:string;unknown?:string}>();
 const add=(suffix:string,title:string,category:string,unitId:string,formula:string,ops:string[],extra:Partial<AutomaticRowSpec>={},role:'RESOURCE'|'CALCULATION_DETAIL'='RESOURCE',reuse?:string,unknown?:string)=>{
  const rowId=id(key,suffix);rows.push({rowId,formulaId:id(key,'formula:'+suffix),section:pack.titleRu,title,category,unitId,expression:formula,procurement:false,...extra});specs.set(rowId,{ops,role,reuse,unknown});};
 const sourceRows=new Map(parent.resources.map(r=>[r.row_id,r]));
 for(const m of materials(key)){
  const old='material:c111:'+m.reuseC111Key;if(!sourceRows.has(old))throw Error('C11_WHOLE_KIT_REUSE_ROW_MISSING:'+old);
  const consumed=expression(m.consumedExpression,profile.layers,profile.step35),rowId=id(key,m.key+'-order'),
   balance=m.quantum?effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:m.unitId,consumed,stock:'0',reserve:'0',quantum:m.quantum}):
    effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:m.unitId,consumed,stock:'0',reserve:'0',quantityMode:'canonical_decimal',balanceScope:'new_order_vs_required_consumption'}),
   order=m.quantum?`ceil((${consumed})/(${m.quantum}))*(${m.quantum})`:consumed;
  add(m.key+'-order',m.nameRu,'material',m.unitId,order,[m.operation],{procurement:true,costTreatment:'OWN_COST',...balance.owner},'RESOURCE',old);
  add(m.key+'-consumed','Расход: '+m.nameRu,'material',m.unitId,consumed,[m.operation],{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:rowId},'CALCULATION_DETAIL',old);
  add(m.key+'-remaining','Остаток: '+m.nameRu,'material',m.unitId,balance.remaining,[m.operation],{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:rowId},'CALCULATION_DETAIL',old);
 }
 const all=pack.operations.map(o=>o.id);
 add('whole-work','Монтаж перегородки с '+(profile.layers===2?'двумя':'тремя')+' слоями обшивки с каждой стороны','work','m2',pack.geometry.areaId,all,{costTreatment:'OWN_COST'});
 add('board-offcuts','Обрезки гипсового листа 12,5 мм','material','m2',`2*${profile.layers}*ceil(partition_length_m/1.2)*3.6-2*${profile.layers}*partition_area_m2`,['clad','cleanup'],{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 add('track-offcuts','Обрезки направляющего профиля 50 × 40 мм','material','m','6*ceil(partition_length_m/3)-2*partition_length_m',['frame','cleanup'],{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 add('stud-offcuts','Обрезки стоечного профиля 50 × 50 мм','material','m','(ceil(partition_length_m/0.6)+1)*(3-partition_height_m)',['frame','cleanup'],{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const need of unknowns(key))add('open-'+need.key,need.nameRu,need.category,need.unitId,
  'c11_'+profile.layers+'_open_'+need.key.replaceAll('-','_'),need.operations,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},'RESOURCE',undefined,need.reason);
 const source=pack.sources[0]!,built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix(key),sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:'C11 02/2025 + Fugen07/2025 + Tiefengrund06/2026; explicit layered geometry',
   definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locator},applicabilityRu:pack.scopeRu,
  ordinary:[{id:pack.geometry.lengthId,title:'Длина прямой перегородки',valueType:'decimal',unitId:'m',kind:'ordinary',min:1.2,max:15},
   {id:pack.geometry.heightId,title:'Высота перегородки',valueType:'decimal',unitId:'m',kind:'ordinary',min:1,max:3}],profile:[],
  conditional:[{id:pack.geometry.areaId,title:'Площадь перегородки по одной стороне',valueType:'decimal',unitId:'m2',kind:'internal',min:1.2},
   ...unknowns(key).map(n=>({id:'c11_'+profile.layers+'_open_'+n.key.replaceAll('-','_'),title:n.nameRu,valueType:'decimal' as const,unitId:n.unitId,kind:'internal' as const,min:0}))],rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[pack.scopeRu,...pack.reuse.notTransferred]});
 const parameters=built.parameters.map(p=>p.parameter_id===pack.geometry.areaId?{...p,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,
  visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',
  runtime_profile_value:true,preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:pack.geometry.areaExpression,when:{kind:'literal',value:true},explicitValuePolicy:'REQUIRE_MATCH'},
  guide:{...(p.truth_metadata.guide as Json),guide_kind:'DERIVED_VALUE_RULE',source_role:'ENGINEERING_DESIGN',guide_version:pack.contract,applicability:pack.scopeRu,
   guide_short_ru:'Площадь по одной стороне вычисляется из измеренных длины и высоты. Число слоёв не умножает первичную площадь.',guide_validation_policy:'MANDATORY_BLOCK',
   source_document:pack.geometry.rule.sourceDocument,source_locator:pack.geometry.rule.locator,source_snapshot_hash:pack.geometry.rule.sha256,verified_at:pack.geometry.rule.verifiedAt}}}:
  p.parameter_id.startsWith('c11_'+profile.layers+'_open_')?{...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,unknowns(key).find(n=>'c11_'+profile.layers+'_open_'+n.key.replaceAll('-','_')===p.parameter_id)!.reason)}:
   {...p,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,
    ...([pack.geometry.lengthId,pack.geometry.heightId].includes(p.parameter_id)?{provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Json),source_role:'USER_MEASURED'}}:{})}});
 const resources=built.resources.map(row=>{const spec=specs.get(row.row_id)!,included=row.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS',old=spec.reuse?sourceRows.get(spec.reuse):null,
  {row_sha256:_old,...body}=row,content={...body,...(included?{cost_owner_id:owner}:{}),
   resource_graph:{...row.resource_graph,scopeContextParameterIds:[pack.geometry.lengthId,pack.geometry.heightId],
    inputParameterIds:[...new Set([...(row.resource_graph.inputParameterIds as string[]??[]),pack.geometry.lengthId,pack.geometry.heightId])],
    ...(included?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),operationCompositionV1:operations(key,spec.ops),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
     brandAndModelRu:null,specificationRu:null,detailsRu:[],...(spec.role==='CALCULATION_DETAIL'?{rowKind:'CALCULATION_DETAIL'}:{})}},
   source_metadata:{...row.source_metadata,full_technical_acceptance:false,sourceRole:spec.unknown?'UNRESOLVED_APPLICATION_NORM':'EXPLICIT_LAYERED_SOURCE_GEOMETRY',
    ...(spec.unknown?{normativeTrace:[],normative_source_ids:[],unresolved_norm_reason:spec.unknown}:{}),
    selectedPrivateSystem:profile.designationPrivate,wholeSubworksReused:pack.reuse.wholeSubworks,sourcePins:pack.sources,
    ...(old?{reusedC111WholeKitRow:{rowId:old.row_id,formulaId:old.formula_id,sourceMetadata:old.source_metadata,
     oldQuantitiesTransferred:false,oldPpeOrCleaningAssumptionsTransferred:false}}:{}),
    engineeringLayout:pack.engineeringLayout,projectGatesRetained:pack.projectGatesRetained,engineeringAcceptanceClaimed:false,noLaborTimeTransferred:true,noWarehouseCreditClaimed:true,
    physicalDemandWithoutSupplierMoq:row.unit_id==='piece',priceSourceRequired:false}};
  return{...content,row_sha256:hash(content)};});
 return{...built,parameters,resources};
}

/** Exact captured parent is supplied by the existing publisher retain contract. */
export function appendDrywallC11LayeredGeometryR1(parent:Parent,identity:{definitionVersionId:string;definitionSha256:string}):AutomaticOwnerDefinition{
 if(identity.definitionVersionId!=='91004f43-a66d-5bb2-aade-d85837a9e695'||identity.definitionSha256!=='6f0b62ebd87ac3aa2a94adf60daa90d12460f3777b2196d317f5eda85d4fdcf4'
  ||parent.parameters.length!==77||parent.formulas.length!==50||parent.resources.length!==50)throw Error('C11_CURRENT_V6_RETAINED_PARENT_REQUIRED');
 const branches=pack.profiles.map(p=>buildDrywallC11LayeredGeometryBranchR1(p.key as DrywallC11LayeredProfileR1,parent));
 const selector=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'drywall:c11:layered',sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.contract,definition_hash:pack.sources[0]!.sha256,artifact_sha256:pack.sources[0]!.sha256,exact_locator:pack.sources[0]!.locator},
  applicabilityRu:pack.scopeRu,ordinary:[],conditional:[],profile:[{id:pack.selector.id,title:pack.selector.titleRu,valueType:'enum',unitId:null,kind:'profile',values:[pack.selector.legacyValue,...pack.profiles.map(p=>p.value)],defaultValue:pack.selector.legacyValue}],rows:[],excludedUnownedAssumptions:[]});
 const legacy=condition(pack.selector.legacyValue),commonIds=new Set([pack.geometry.lengthId,pack.geometry.heightId,pack.geometry.areaId]),seen=new Set<string>();
 const params=[...parent.parameters.map(p=>({...p,required:false,constraints_json:{...p.constraints_json,...(p.required?{requiredWhen:legacy}:{})},truth_metadata:{...p.truth_metadata,visible_when:legacy}})),
  ...selector.parameters.map(p=>({...p,required:false,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Json),guide_kind:'ENUM_DECISION_RULE',source_role:'ENGINEERING_DESIGN'}}})),
  ...branches.flatMap((branch,index)=>branch.parameters.flatMap<AutomaticOwnerDefinition['parameters'][number]>(p=>{
   if(commonIds.has(p.parameter_id)){if(seen.has(p.parameter_id))return[];seen.add(p.parameter_id);return[{...p,required:false,
    constraints_json:{...p.constraints_json,...(p.parameter_id!==pack.geometry.areaId?{requiredWhen:selected}:{})},truth_metadata:{...p.truth_metadata,visible_when:selected,
     ...(p.parameter_id===pack.geometry.areaId?{preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:pack.geometry.areaExpression,when:selected,explicitValuePolicy:'REQUIRE_MATCH'}}:{})}}];}
   return[{...p,required:false,truth_metadata:{...p.truth_metadata,visible_when:condition(pack.profiles[index]!.value)}}];}))].map((p,ordinal)=>({...p,ordinal}));
 const gate=(row:AutomaticOwnerDefinition['resources'][number],when:Json,ordinal:number)=>{const{row_sha256:_old,...body}=row,content={...body,ordinal,inclusion_ast:{kind:'and',operands:[when,row.inclusion_ast]}};return{...content,row_sha256:hash(content)};};
 const resources=[...parent.resources.map(row=>({row,when:legacy})),...branches.flatMap((d,index)=>d.resources.map(row=>({row,when:condition(pack.profiles[index]!.value)})))].map(({row,when},ordinal)=>gate(row,when,ordinal));
 return{parameters:params,formulas:[...parent.formulas,...branches.flatMap(d=>d.formulas)],resources,runtimeInput:{...pack.legacyRuntime.input,...selector.runtimeInput},
  runtimeClassification:{...pack.legacyRuntime.classification,...selector.runtimeClassification} as AutomaticOwnerDefinition['runtimeClassification'],
  runtimeSourceIds:{...pack.legacyRuntime.sourceIds,...selector.runtimeSourceIds},ordinaryParameterIds:['area_m2',pack.geometry.lengthId,pack.geometry.heightId]};
}
export function compileDrywallC11LayeredGeometryR1(parent:Parent,identity:Parameters<typeof appendDrywallC11LayeredGeometryR1>[1],facts:Record<string,unknown>){
 const choice=facts[pack.selector.id]??pack.selector.legacyValue;
 return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:choice===pack.selector.legacyValue?'area_m2':pack.geometry.areaId,
  definition:appendDrywallC11LayeredGeometryR1(parent,identity),submittedParameters:facts});
}
export function drywallC11LayeredCompletenessR1(){
 const entries=pack.profiles.flatMap(profile=>{const key=profile.key,owner=id(key,'whole-work');
  const entry=(suffix:string,category:string,unitId:string|null,ops:string[],included=false,detail=false)=>({expectedResourceId:id(key,suffix),operationId:id(key,'operation:'+ops[0]),sourceId:pack.sourceId,
   condition:profile.value,category,unitId,requiredOperationIds:ops.map(o=>id(key,'operation:'+o)),formulaId:id(key,'formula:'+suffix),
   quantityRule:detail?'CALCULATED_BALANCE_NOT_SECOND_PHYSICAL_RESOURCE':suffix.startsWith('open-')?'UNRESOLVED_REQUIRED_PHYSICAL_RESOURCE_NOT_ZERO':'EXPLICIT_LAYERED_GEOMETRY_AND_SOURCE_PACK',
   resolution:included?{kind:'INCLUDED_COMPONENT_ROW',rowId:id(key,suffix),parentRowId:owner}:{kind:'ROW',rowId:id(key,suffix)}});
  return[...pack.independentExpectedInventory.materialOrders.filter(m=>m[0]!=='screw55'||key==='three-layer').flatMap(m=>{
   const [material,category,unit,ops]=m as [string,string,string,string[]];return[entry(material+'-order',category,unit,ops),entry(material+'-consumed',category,unit,ops,false,true),entry(material+'-remaining',category,unit,ops,false,true)];}),
   entry('whole-work','work','m2',pack.operations.map(o=>o.id)),
   ...pack.independentExpectedInventory.physicalWaste.map(m=>{const[k,c,u,o]=m as [string,string,string,string[]];return entry(k,c,u,o,true);}),
   ...pack.independentExpectedInventory.unresolved.filter(m=>m[0]!=='inner-tape'||key==='three-layer').map(m=>{const[k,c,u,o]=m as [string,string,string|null,string[]];return entry('open-'+k,c,u,o,true);})];});
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
  evidenceSha256:pack.sources[0]!.sha256,entries,fullTechnicalAcceptance:false,coverage:'NEW_C112_C113_GEOMETRY_BRANCHES_LEGACY_C111_RETAINED',
  newFullTechnologies:0,physicalResourcesAndCalculationDetailsIndependentlyDeclared:true};
}


export const drywallC11CurrentPhysicalPackR1=physicalC11;
export const drywallC11PhysicalFactR1=(key:string)=>'c11_current_fact_'+key;
export const drywallC11PhysicalUnknownR1=(key:string)=>'c11_current_unknown_'+key.replaceAll('-','_');
export type DrywallC11CurrentReadbackR1=Readonly<{definitionId:string;definitionSha256:string;catalogId:string;body:Parent}>;
/** Optional whole-current continuation. It never calls append(old50), creates a
 * second layered graph, hydrates an unknown quantity or widens a selected norm.
 * The exact approved R694 body is a required preimage argument from the existing
 * publisher/readback path. New facts are source readback, not consumer prompts. */
export function drywallC11CurrentPhysicalContinuationR1(base:AutomaticOwnerDefinition,readback:DrywallC11CurrentReadbackR1):AutomaticOwnerDefinition{
 const p=physicalC11,fact=drywallC11PhysicalFactR1,unknown=drywallC11PhysicalUnknownR1,id=(profile:string,key:string)=>'c11-current-physical:'+profile+':'+key;
 if(readback.catalogId!==p.catalogId||readback.definitionId!==p.current.definitionId||readback.definitionSha256!==p.current.definitionSha256
  ||hash(canonicalEstimateStableJson({parameters:readback.body.parameters,formulas:readback.body.formulas,resources:readback.body.resources}))!==p.current.bodyTextHash
  ||base.parameters.length!==181||base.formulas.length!==212||base.resources.length!==212
  ||readback.body.parameters.length!==181||readback.body.formulas.length!==212||readback.body.resources.length!==212)
  throw Error('C11_ACTUAL_CURRENT_WHOLE_R919_REQUIRED');
 const signature=(row:unknown,keys:readonly string[])=>canonicalEstimateStableJson(Object.fromEntries(keys.map(key=>[key,(row as Json)[key]??null]))),
  verify=(kind:string,rows:readonly unknown[],expected:readonly unknown[],key:string,fields:readonly string[])=>{
   for(const original of expected){const identity=(original as Json)[key],row=rows.find(value=>(value as Json)[key]===identity);
    if(!row||signature(row,fields)!==signature(original,fields))throw Error('C11_CURRENT_SEMANTIC_PREIMAGE_REQUIRED:'+kind+':'+identity);
   }
  };
 verify('parameter',base.parameters,readback.body.parameters,'parameter_id',['parameter_id','ordinal','value_type','unit_id','title_ru','required','default_value','constraints_json','truth_metadata']);
 verify('formula',base.formulas,readback.body.formulas,'formula_id',['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256']);
 verify('resource',base.resources,readback.body.resources,'row_id',['row_id','ordinal','section','category','title_ru','unit_id','formula_id','inclusion_ast','resource_graph','cost_owner_id','procurement_eligible','source_metadata','row_sha256']);
 for(const old of p.retainedRowRoster){const row=base.resources.find(row=>row.row_id===old.rowId);
  if(!row||row.row_sha256!==old.rowSha256||row.formula_id!==old.formulaId||row.unit_id!==old.unit||row.cost_owner_id!==old.costOwnerId)
   throw Error('C11_CURRENT_ROW_ID_OWNER_OR_SOURCE_PREIMAGE_DRIFT:'+old.rowId);
 }
 const selected={kind:'or',operands:p.profiles.map(profile=>({kind:'equals',parameterId:p.selectorId,value:profile.value}))},
  allFacts=p.requiredTechnologyFactKeys.map(fact),factSpecs:AutomaticParameterSpec[]=p.facts.map(item=>({id:fact(item.key),title:item.nameRu,unitId:item.unit,
   valueType:item.type as AutomaticParameterSpec['valueType'],kind:'internal',...('values' in item?{values:item.values}:{}),
   ...('min' in item?{min:item.min}:{}),...('max' in item?{max:item.max}:{})})),
  primary=p.sources.find(source=>source.id==='c11')!,recipe=p.sources.find(source=>source.id==='fugen')!;
 const definitions=p.profiles.map(profile=>{
  const branch={kind:'equals',parameterId:p.selectorId,value:profile.value},
   extra=buildAutomaticConstructionOwnerR1({contract:p.contract,semanticOwner:id(profile.key,'source'),sourceId:p.contract,normId:'C11_PHYSICAL_METHOD_AND_ACTUAL_FUGEN_RECIPE_NOT_NEW_LABOUR_OR_TOOL_NORM',
    sourceMetadata:{source_title:'Физическое обеспечение выбранной перегородки',source_document_version:'R919_SOURCE_ONLY_UNRUN',definition_hash:hash(p),
     artifact_sha256:primary.sha256!,exact_locator:primary.locator+'; '+recipe.locator},applicabilityRu:p.scope,ordinary:profile.key==='c111'?p.measurementInputs.map(item=>({id:item.id,title:item.titleRu,unitId:item.unitId,valueType:'decimal' as const,kind:'ordinary' as const,min:0})):[],profile:[],
    conditional:profile.key==='c111'?[...factSpecs,...p.newFunctions.map(item=>({id:unknown(item.key),title:item.nameRu,unitId:item.unit||null,
     valueType:item.unit==='piece'||item.unit==='pair'?'integer' as const:'decimal' as const,kind:'internal' as const,min:0}))]:[],
    rows:[...p.newFunctions.map(item=>({rowId:id(profile.key,'function:'+item.key),formulaId:id(profile.key,'formula:function:'+item.key),title:item.nameRu,
     section:'Физическое обеспечение выбранной перегородки',category:item.kind==='SERVICE'?'service':['MATERIAL','CONSUMABLE'].includes(item.kind)?'material':['TOOL','PPE','ACCESSORY'].includes(item.kind)?'tool':'equipment',unitId:item.unit,
     expression:unknown(item.key),procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
     ...p.measuredBalanceRule.rules.map(item=>({rowId:id(profile.key,'control:'+item.key),formulaId:id(profile.key,'formula:control:'+item.key),title:item.nameRu,unitId:item.unitId,expression:item.expression,section:'Измеренные фактические расходы, не второй заказ',category:'service',procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId:item.unitId,minimum:0,reasonRu:'Конечное показание не меньше начального; сброс/оборот/другие потребители требуют иной подтверждённый баланс.'}})),
     ...[
      {key:'water-lower',title:'Нижняя рецептурная граница воды по реально замешанной сухой массе гипсовой смеси',unit:'l',expression:'0.6*'+fact('mixed_dry_kg')},
      {key:'water-upper',title:'Верхняя рецептурная граница воды по реально замешанной сухой массе гипсовой смеси',unit:'l',expression:'0.7*'+fact('mixed_dry_kg')},
      {key:'water-under-recipe',title:'Фактическая вода ниже рецептурной границы гипсовой смеси',unit:'l',expression:'max(0,0.6*'+fact('mixed_dry_kg')+'-'+fact('mix_water_l')+')'},
      {key:'water-over-recipe',title:'Фактическая вода выше рецептурной границы гипсовой смеси',unit:'l',expression:'max(0,'+fact('mix_water_l')+'-0.7*'+fact('mixed_dry_kg')+')'},
      {key:'water-supply-shortage',title:'Недостаток принятой поставки воды для фактического замеса'+(profile.waterIncludesWash?' и мойки':''),unit:'l',
       expression:'max(0,'+fact('mix_water_l')+(profile.waterIncludesWash?'+'+fact('wash_water_l'):'')+'-'+profile.waterEffectiveParameterId+')'},
      {key:'method-facts',title:'Подтверждение применимости и организации выбранного монтажа перегородки',unit:'m2',expression:profile.primaryMeasureId},
      {key:'whole-coverage',title:'Обязательный каркас, листы, крепёж, стыки и общий труд выбранного whole scope сохранены',unit:'m2',expression:profile.primaryMeasureId},
      {key:'physical-source-scope',title:'Открытые количество, комплектность и границы оплаты физического обеспечения',unit:'m2',expression:profile.primaryMeasureId}
     ].map(item=>({rowId:id(profile.key,'control:'+item.key),formulaId:id(profile.key,'formula:control:'+item.key),title:item.title,unitId:item.unit,expression:item.expression,
      section:'Рецептура и комплектность выбранной перегородки',category:'service',procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const}))],
    excludedUnownedAssumptions:['CeilingP113 norms and C11198h are not transferred to layered profiles.',
     'Existing current212 rows and73 layered source needs retained. No automatic opening/wet/fire/acoustic scope; no new paid INFOowner.']});
  return{profile,branch,extra};
 });
 const extras=definitions.flatMap(item=>item.extra.parameters),parameters=[...base.parameters,...extras.map(parameter=>{
  const measured=p.measurementInputs.find(item=>item.id===parameter.parameter_id);
  if(measured)return{...parameter,truth_metadata:{...parameter.truth_metadata,value_source_role:'MEASUREMENT_RULE',visibility_role:'USER_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_kind:'MEASUREMENT_RULE',source_role:'USER_MEASURED',source_document:p.contract,source_locator:p.measuredBalanceRule.locator,source_snapshot_hash:p.measuredBalanceRule.sha256}},constraints_json:{...parameter.constraints_json}}; // Pure balance operands, not a method/coherence prerequisite; existing formula minimum0 rejects negative complete deltas.
  const item=p.newFunctions.find(item=>unknown(item.key)===parameter.parameter_id);
  if(item)return{...parameter,truth_metadata:unresolvedApplicationNormTruthR1(parameter.truth_metadata,item.returnWhen)};
  return{...parameter,required:false,default_value:null,constraints_json:{...parameter.constraints_json,...(allFacts.includes(parameter.parameter_id)?{requiredWhen:selected}:{}),...(parameter.parameter_id===fact('mixed_dry_kg')?{exclusiveMin:0}:{})},truth_metadata:{...parameter.truth_metadata,
   value_source_role:'PROJECT_DOCUMENTATION',visibility_role:'INTERNAL_ONLY',source_confirmation_required:true,
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
 })].map((parameter,index)=>index<base.parameters.length?parameter:{...parameter,ordinal:index}),
  rehash=(row:typeof base.resources[number])=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
 const op=(profile:typeof p.profiles[number],key:string)=>{
  const stage=p.operations.find(item=>item.key===key);if(!stage)throw Error('C11_PHYSICAL_OPERATION_REQUIRED:'+key);
  return{operationId:id(profile.key,'operation:'+key),operationTitleRu:stage.nameRu,processOrdinal:stage.ordinal,processRole:'PROCESS' as const,
   completionCriterionRu:'Выбранная система, проектные узлы, фактическое оснащение и его единственный владелец подтверждены; исполнение удостоверяется отдельно.',
   ...(key==='insulate'?{whenResourcePresent:[profile.key==='c111'?'material:c111:insulation':'drywall:c11:'+profile.key+':insulation-order']}:{})};
 },composition=(profile:typeof p.profiles[number],keys:readonly string[])=>{
  const[first,...rest]=[...new Set(keys)].map(key=>op(profile,key));if(!first)throw Error('C11_PHYSICAL_EMPTY_CONSUMER');
  const original=base.resources.find(row=>row.row_id===profile.wholeOwnerRowId)!.resource_graph.operationCompositionV1 as Json;
  return{contractVersion:'canonical-operation-resource/v1',groupId:profile.groupId,groupTitleRu:String(original.groupTitleRu),...first,...(rest.length?{additionalOperations:rest}:{})};
 };
 // Existing original operation references and COST_SUMMARY roles stay intact.
 // Additional physical consumers share the same row/quantity and group.
 const physicalKeys=(row:typeof base.resources[number]):string[]=>{
  const text=row.row_id;
  const c111=/^(?:material|work|tool):c111:(.+)$/u.exec(text),open=/^drywall:c11:(?:two|three)-layer:open-(.+)$/u.exec(text),material=/^drywall:c11:(?:two|three)-layer:(.+)-(?:order|consumed|remaining)$/u.exec(text),
   exact=c111?(p.retainedConsumerFunctionRules.legacyC111 as Record<string,readonly string[]>)[c111[1]!]:(open||material)?(p.retainedConsumerFunctionRules.layered as Record<string,readonly string[]>)[(open||material)![1]!]:undefined;
  if(exact)return[...exact];
  if(text.endsWith('whole-work')||text==='work:c111:worker')return p.operations.map(item=>item.key);
  if(/separation-tape/.test(text))return ['frame','clad-first','clad-second','joints'];
  if(/sealing-tape/.test(text))return ['frame'];
  if(/washing-water|wash-vessel|waste-recipient/.test(text))return ['joints','surface','cleanup'];
  if(/mixing-water/.test(text))return ['joints'];
  if(/water|vessel|bucket|spatula/.test(text))return ['joints','cleanup'];
  if(/fugen|compound|joint|tape/.test(text))return ['joints'];
  if(/sheet-cut|stud-cut|offcuts/.test(text))return ['clad-first','clad-second','cleanup'];
  if(/board|tn25|screw|knife|plane|driver/.test(text))return ['clad-first','clad-second',...(text.includes('plane')?['joints']:[])];
  if(/insulation/.test(text))return ['insulate'];
  if(/primer|tiefengrund|roller|brush|vacuum|abrasive|dust/.test(text))return ['joints','surface','cleanup'];
  if(/access|gloves|protection/.test(text))return ['access','frame','clad-first','clad-second','insulate','joints','surface','cleanup'];
  if(/pn50|ps50|track|stud|anchor|dowel|perforator|shears|punch/.test(text))return ['frame','control'];
  if(/laser|measure|level/.test(text))return ['setout','frame','control'];
  if(/waste|offcut/.test(text))return ['cleanup'];
  if(/delivery|handling|lift/.test(text))return ['handling'];
  return ['control'];
 };
 const resources=base.resources.map(row=>{
  const profile=p.profiles.find(profile=>profile.key==='c111'? !row.row_id.startsWith('drywall:c11:') :row.row_id.startsWith('drywall:c11:'+profile.key+':')),
   original=row.resource_graph.operationCompositionV1 as Json|undefined;
  if(!profile||!original)return row;
  const additions=physicalKeys(row).map(key=>op(profile,key)),existing=canonicalEstimateOperationReferences(original),seen=new Set(existing.map(op=>op.operationId));
  return rehash({...row,resource_graph:{...row.resource_graph,operationCompositionV1:{...original,
   additionalOperations:[...(Array.isArray(original.additionalOperations)?original.additionalOperations:[]),...additions.filter(op=>!seen.has(op.operationId))]}},
   source_metadata:row.source_metadata});
 });
 for(const{profile,branch,extra}of definitions)for(const row of extra.resources){
  const item=p.newFunctions.find(item=>row.row_id===id(profile.key,'function:'+item.key)),key=row.row_id.slice(id(profile.key,'control:').length),
   recipeCheck=['water-under-recipe','water-over-recipe','water-supply-shortage'].includes(key),method=key==='method-facts',coverage=key==='whole-coverage',held=key==='physical-source-scope',
   measured=p.measuredBalanceRule.rules.find(item=>item.key===key),
   keys=item?.ops??measured?.ops??(method||coverage||held?['control']:['joints']),
   insulation=item?.key==='insulation-knife-blade'&&profile.key==='c111'?[{kind:'equals',parameterId:'c111_insulation_mode',value:'AKUSTIKNAUF_50'}]:[],
   inclusion={kind:'and',operands:[branch,...insulation,...(recipeCheck?[{kind:'formula_greater_than',expression:extra.formulas.find(f=>f.formula_id===row.formula_id)!.expression_source,
    unitId:row.unit_id,value:0}]:[])]},
   covered=base.resources.filter(candidate=>candidate.resource_graph.costTreatment==='OWN_COST'&&candidate.procurement_eligible&&
    (profile.key==='c111'?candidate.row_id.startsWith('material:c111:')&&candidate.row_id!=='material:c111:insulation':candidate.row_id.startsWith('drywall:c11:'+profile.key+':')&&candidate.row_id.endsWith('-order'))).map(row=>row.row_id),
   scope=recipeCheck?{kind:'PROCESS',coveringRowIds:[],reasonRu:'Фактический замес должен соответствовать рецептуре; действующая поставка воды должна покрывать его без двойного заказа.'}:
    method?{kind:'OBJECT_SCOPE',coveringRowIds:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:fact('opening_scope'),unknownObjectValues:[],requiredFactParameterIds:allFacts,
     reasonRu:'Только подтверждённая исходная система/геометрия/основание/организация; открытый проём или другая технология этим source не приняты.'}:
    coverage?{kind:'INCLUDED',coveringRowIds:[...covered,profile.wholeOwnerRowId],costExclusionBreaksScopeV1:true,
     reasonRu:'Исключение обязательного материала или единого труда нарушает выбранный whole scope; количество этапов не создаёт дополнительный труд.'}:
    held?{kind:'PROJECT_SCOPE',coveringRowIds:[],reasonRu:'Не закрыты точные количества/комплектность, проектные условия и единая граница оплаты физического обеспечения. Старые UNKNOWN и видимый contractorcount1 не являются приёмкой.'}:null;
  resources.push(rehash({...row,ordinal:resources.length,inclusion_ast:inclusion,resource_graph:{...row.resource_graph,inputParameterIds:method||coverage||held||measured?[]:item?item.requiredConditionKeys.map(fact):[fact('fugen_reference'),fact('water_temperature_c'),fact('ambient_temperature_c')],
   operationCompositionV1:composition(profile,keys),...(held||measured?{scopeContextParameterIds:p.quantityEvidenceFactKeys.map(fact)}:{}),...(scope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',groupId:profile.groupId,
    groupTitleRu:composition(profile,['control']).groupTitleRu,titleRu:row.title_ru,exactScopeWhen:branch,originalRowIds:[],...scope,
    sourceEvidence:[{sha256:recipeCheck?recipe.sha256!:primary.sha256!,locator:recipeCheck?recipe.locator:primary.locator}]}}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:[item?'Количество/совместимость/обеспечение и граница оплаты требуют source/PPR; это не автоматический комплект1.':'Физический контроль, не дополнительная норма или оплачиваемая операция.'],
    ...(item?{resourceKind:item.kind}:{rowKind:'CALCULATION_DETAIL'})}},source_metadata:{...row.source_metadata,normativeTrace:[],newPaidOwnerAccepted:false,...(measured?{sourceRole:'MEASURED_ALLOCATION_BALANCE_NOT_SUPPLY_NORM',artifact_sha256:p.measuredBalanceRule.sha256,exact_locator:p.measuredBalanceRule.locator,recordedConsumptionNotOrder:true,legacySourceNeedsNotAutoClosed:true}:{}),
    actualObjectFactsAsserted:false,numericNormAccepted:false,full_technical_acceptance:false,physicalResourceCoverageComplete:false,retainedLayeredQuantityNeeds:73,
    ...(item?{sourceQuantityReturnWhen:item.returnWhen,physicalPrimarySourceId:item.source,
     sourceRole:'AUTHORED_PHYSICAL_FUNCTION_SOURCE_QUANTITY_HELD',artifact_sha256:p.sources.find(source=>source.id===item.source)?.sha256??null,
     exact_locator:p.sources.find(source=>source.id===item.source)?.locator??'ACTUAL_PPR_REQUIRED',unitNotGuessed:item.unit===''}:{}),actualDryMassNotPurchasedBagMass:true}}));
 }
 const formulas=[...base.formulas,...definitions.flatMap(item=>item.extra.formulas)],consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 return{...base,formulas,resources,ordinaryParameterIds:[...new Set([...base.ordinaryParameterIds,...p.measurementInputs.map(item=>item.id)])],parameters:parameters.map(parameter=>({...parameter,truth_metadata:{...parameter.truth_metadata,
  formula_consumers:[...new Set([...(Array.isArray(parameter.truth_metadata.formula_consumers)?parameter.truth_metadata.formula_consumers as string[]:[]),...(consumers.formulaConsumers[parameter.parameter_id]??[])])],
  resource_branch_consumers:[...new Set([...(Array.isArray(parameter.truth_metadata.resource_branch_consumers)?parameter.truth_metadata.resource_branch_consumers as string[]:[]),...(consumers.resourceConsumers[parameter.parameter_id]??[])])]}}))};
}


export function drywallC11CurrentPhysicalCompletenessR1(){
 const p=physicalC11,id=(profile:string,key:string)=>'c11-current-physical:'+profile+':'+key;
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:p.sourceKind,
  generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:p.sources.find(source=>source.id==='c11')!.sha256!,fullTechnicalAcceptance:false,
  existing212RowsAnd73UnknownNeedsRetained:true,entries:p.profiles.flatMap(profile=>[
   ...p.newFunctions.map(item=>({expectedResourceId:id(profile.key,'function:'+item.key),operationId:id(profile.key,'operation:'+item.ops[0]!),
    requiredOperationIds:item.ops.map(key=>id(profile.key,'operation:'+key)),sourceId:item.source,condition:p.selectorId+'='+profile.value,
    quantityRule:'UNRESOLVED_APPLICATION_SOURCE_NO_CONSUMER_COUNT1',unitId:item.unit,formulaId:id(profile.key,'formula:function:'+item.key),
    resolution:{kind:'ROW',rowId:id(profile.key,'function:'+item.key)}})),
   ...[...p.measuredBalanceRule.rules.map(item=>item.key),'water-lower','water-upper','water-under-recipe','water-over-recipe','water-supply-shortage','method-facts','whole-coverage','physical-source-scope'].map(key=>({
    expectedResourceId:id(profile.key,'control:'+key),operationId:id(profile.key,'operation:'+(p.measuredBalanceRule.rules.find(item=>item.key===key)?.ops[0]??(['method-facts','whole-coverage','physical-source-scope'].includes(key)?'control':'joints'))),
    requiredOperationIds:(p.measuredBalanceRule.rules.find(item=>item.key===key)?.ops??[(['method-facts','whole-coverage','physical-source-scope'].includes(key)?'control':'joints')]).map(op=>id(profile.key,'operation:'+op)),
    sourceId:key.startsWith('water-')?'fugen':p.contract,condition:p.selectorId+'='+profile.value,
    quantityRule:p.measuredBalanceRule.rules.some(item=>item.key===key)?'DEDICATED_METER_DELTA_NOT_SUPPLY_OR_ORDER':'ACTUAL_DRY_MIX_RECIPE_ACCEPTED_EXISTING_WATER_OWNER_OR_EXPLICIT_SCOPE_GUARD',unitId:p.measuredBalanceRule.rules.find(item=>item.key===key)?.unitId??(key.startsWith('water-')?'l':'m2'),
    formulaId:id(profile.key,'formula:control:'+key),resolution:{kind:'ROW',rowId:id(profile.key,'control:'+key)}}))])};
}

/** Structural typed view of the exact existing-reader body. It accepts no
 * baseline inputs as runtime values. The continuation still checks catalog,
 * header and an unrounded canonical-text body digest before any append. */
export function drywallC11ActualRetainedModelR2(raw:unknown):AutomaticOwnerDefinition{
 const rec=(value:unknown,label:string):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('C11_ACTUAL_RECORD_REQUIRED:'+label);return value as Record<string,unknown>;},
  arr=(value:unknown,label:string)=>{if(!Array.isArray(value))throw Error('C11_ACTUAL_ARRAY_REQUIRED:'+label);return value.map(item=>rec(item,label));},
  text=(value:unknown,label:string)=>{if(typeof value!=='string')throw Error('C11_ACTUAL_TEXT_REQUIRED:'+label);return value;},
  number=(value:unknown,label:string)=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error('C11_ACTUAL_NUMBER_REQUIRED:'+label);return value;},
  bool=(value:unknown,label:string)=>{if(typeof value!=='boolean')throw Error('C11_ACTUAL_BOOLEAN_REQUIRED:'+label);return value;},
  nullable=(value:unknown,label:string)=>value===null?null:text(value,label),body=rec(raw,'body'),
  parameters=arr(body.parameters,'parameters').map(q=>({...q,parameter_id:text(q.parameter_id,'parameter_id'),ordinal:number(q.ordinal,'ordinal'),
   unit_id:nullable(q.unit_id,'parameterunit'),title_ru:text(q.title_ru,'parametertitle'),value_type:text(q.value_type,'value_type'),required:bool(q.required,'required'),
   default_value:q.default_value,constraints_json:q.constraints_json===null?null:rec(q.constraints_json,'constraints'),truth_metadata:rec(q.truth_metadata,'truth')})),
  formulas=arr(body.formulas,'formulas').map(f=>{
   const source=text(f.expression_source,'expression'),compiled=compileFormulaGraph(source);
   if(canonicalEstimateStableJson(compiled.ast)!==canonicalEstimateStableJson(f.ast)||canonicalEstimateStableJson(compiled.inputParameterIds)!==canonicalEstimateStableJson(f.input_parameter_ids))
    throw Error('C11_RETAINED_FORMULA_AST_OR_INPUTS_REQUIRED:'+String(f.formula_id));
   return{...f,formula_id:text(f.formula_id,'formula_id'),output_unit_id:text(f.output_unit_id,'outputunit'),expression_source:source,
    ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:text(f.ast_sha256,'ast_sha256')};
  }),resources=arr(body.resources,'resources').map(r=>({...r,id:text(r.id,'resourceid'),row_id:text(r.row_id,'rowid'),ordinal:number(r.ordinal,'ordinal'),
   section:text(r.section,'section'),category:text(r.category,'category'),title_ru:text(r.title_ru,'title'),unit_id:text(r.unit_id,'unit'),formula_id:text(r.formula_id,'formula'),
   inclusion_ast:rec(r.inclusion_ast,'inclusion'),resource_graph:rec(r.resource_graph,'resourcegraph'),procurement_eligible:bool(r.procurement_eligible,'procurement'),
   cost_owner_id:nullable(r.cost_owner_id,'costowner'),source_metadata:r.source_metadata===null?null:rec(r.source_metadata,'sourcemetadata'),row_sha256:text(r.row_sha256,'rowhash')}));
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['area_m2','partition_length_m','partition_height_m']};
}
