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
