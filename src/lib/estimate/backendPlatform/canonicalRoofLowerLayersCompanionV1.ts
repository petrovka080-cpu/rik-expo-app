import data from '../../../../data/estimate-benchmarks/source-packs/roof-lower-layers-companion-s27-67.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {roofMetalTrimConditionsV1} from './canonicalRoofMetalTrimCompanionV1';
import {ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1,ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1,ROOF_FORECAST_LOWER_LAYERS_GUIDE_V1} from './canonicalRoofForecastConditionV1';
import type {FormulaAst} from './formulaGraph';
type Json=Record<string,any>;
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
export const ROOF_LOWER_LAYERS_PACK_V1=data;
export const ROOF_ASSEMBLY_SEMANTIC_ROW_V1='roof:torch-two:krer12-002-09:source-gap:roof_assembly';
export const ROOF_OTHER_LAYERS_PARAMETER_V1='roof_other_layers_scope';
export const ROOF_OTHER_LAYERS_NONE_V1='Кроме отдельно выбранных слоёв иных дополнительных слоёв в этом участке нет по проекту';
export const ROOF_OTHER_LAYERS_UNKNOWN_V1='Другие дополнительные слои ещё не проверены';
export const ROOF_OTHER_LAYERS_PRESENT_V1='По проекту предусмотрены другие дополнительные слои';
export const ROOF_VAPOR_OPERATION_KEY_V1=JSON.stringify([data.vapor.prefix,data.vapor.prefix+':installation']);
export const ROOF_CLAY_OPERATION_KEY_V1=JSON.stringify([data.clay.prefix,data.clay.prefix+':installation']);
export const ROOF_VAPOR_SCOPE_ROW_V1=data.vapor.prefix+':project-scope';
export const ROOF_CLAY_SCOPE_ROW_V1=data.clay.prefix+':project-scope';
export const ROOF_LOWER_CHAIN_SCOPE_ROW_V1=data.prefix+':project-chain-check';
export const ROOF_LOWER_LAYER_PAIRS_V1=[{rowId:ROOF_VAPOR_SCOPE_ROW_V1,operationKey:ROOF_VAPOR_OPERATION_KEY_V1},{rowId:ROOF_CLAY_SCOPE_ROW_V1,operationKey:ROOF_CLAY_OPERATION_KEY_V1}];
const eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
/** New transform only: historical ready/forecast builders remain unchanged. */
export function extendRoofLowerLayersConditionV1(ast:unknown):unknown {
 const replace=(v:unknown):unknown=>Array.isArray(v)?v.map(replace):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,child])=>[k,k==='value'&&(v as Json).parameterId==='roof_torch_conditions'&&child===ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1?ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1:replace(child)])):v;
 const next=replace(ast);return canonicalEstimateStableJson(ast)===canonicalEstimateStableJson(next)?ast:{kind:'or',operands:[ast,next]};
}
export function roofLowerLayersContextV1(){return extendRoofLowerLayersConditionV1(roofMetalTrimConditionsV1().context);}
export function roofLowerLayerConditionsV1(layer:typeof data.vapor|typeof data.clay){return {kind:'and',operands:[roofLowerLayersContextV1(),eq('roof_torch_conditions',ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1),eq(layer.systemParameterId,layer.systemYesRu)]};}
export function lowerLayersExistingRowV1(row:Json):Json {
 const scope=row.resource_graph?.scopeRequirementV1;
 const expanded=scope?{...scope,exactScopeWhen:extendRoofLowerLayersConditionV1(scope.exactScopeWhen),...(scope.contextWhen==null?{}:{contextWhen:extendRoofLowerLayersConditionV1(scope.contextWhen)})}:null;
 const residual=row.row_id===ROOF_ASSEMBLY_SEMANTIC_ROW_V1?{...expanded,kind:'PROJECT_SCOPE',groupId:'other_roof_layers',groupTitleRu:'Другие дополнительные слои кровли',titleRu:'Другие слои сверх отдельно выбранных пароизоляции и утепления',contextWhen:roofLowerLayersContextV1(),exactScopeWhen:{kind:'and',operands:[roofLowerLayersContextV1(),eq(ROOF_OTHER_LAYERS_PARAMETER_V1,ROOF_OTHER_LAYERS_PRESENT_V1)]},
  notApplicableWhen:eq(ROOF_OTHER_LAYERS_PARAMETER_V1,ROOF_OTHER_LAYERS_NONE_V1),objectFactParameterId:ROOF_OTHER_LAYERS_PARAMETER_V1,unknownObjectValues:[ROOF_OTHER_LAYERS_UNKNOWN_V1],
  reasonRu:'Отдельно выбранные пароизоляция и керамзитовое утепление имеют собственные расчёты. Здесь остаются другие защитные, эксплуатируемые или дополнительные слои. Отсутствие подтверждается только проектом; оно не подтверждает неизвестную пароизоляцию, утепление или фактическую готовность.'}:expanded;
 return {...row,inclusion_ast:extendRoofLowerLayersConditionV1(row.inclusion_ast),resource_graph:{...row.resource_graph,...(scope?{scopeRequirementV1:residual}:{})}};
}
export function lowerLayersConditionParameterV1(p:Json):Json {
 if(p.parameter_id!=='roof_torch_conditions')return p;
 return {...p,constraints_json:{...p.constraints_json,values:[...p.constraints_json.values,ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1]},truth_metadata:{...p.truth_metadata,guide:{...p.truth_metadata.guide,guide_short_ru:ROOF_FORECAST_LOWER_LAYERS_GUIDE_V1}}};
}
function primitive(layer:typeof data.vapor|typeof data.clay,catalogId:string){
 if(!data.targets.some(t=>t.catalogId===catalogId))throw Error('ROOF_LOWER_LAYERS_CATALOG_UNSUPPORTED');
 const owner=sourcePinnedRoofNormOwnerR1(layer as SourcePinnedRoofNormPackR1),conditions=roofLowerLayerConditionsV1(layer);
 return {...owner,parameters:owner.parameters.filter(p=>[layer.systemParameterId,layer.measurementParameterId].includes(p.parameter_id)).map(p=>({...p,
  constraints_json:p.parameter_id===layer.measurementParameterId?{...p.constraints_json,exclusiveMin:0,requiredWhen:conditions}:p.constraints_json,
  truth_metadata:{...p.truth_metadata,semantic_parameter_key:catalogId+':'+p.parameter_id} as Json})),
  resources:owner.resources.map(r=>({...r,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id,inclusion_ast:conditions}))};
}
/** Rewrites precisely the source-volume operand, never coefficients or another parameter. */
export function roofClayGeometryAstV1(ast:unknown):FormulaAst {
 const volumeId=data.clay.measurementParameterId,A=data.clay.areaParameterIdForGeometry,D=data.clay.thicknessParameterId;
 let replaced=0;
 const rewrite=(v:any):any=>{
  if(v&&typeof v==='object'&&!Array.isArray(v)&&v.kind==='parameter'&&v.id===volumeId){replaced++;return {kind:'binary',operator:'/',left:{kind:'binary',operator:'*',left:{kind:'parameter',id:A},right:{kind:'parameter',id:D}},right:{kind:'literal',value:'1000'}};}
  return Array.isArray(v)?v.map(rewrite):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([key,child])=>[key,rewrite(child)])):v;
 };
 const result=rewrite(ast);if(replaced!==1)throw Error('ROOF_CLAY_EXACT_VOLUME_OPERAND_REQUIRED');return result;
}
export function roofLowerLayersOwnersV1(catalogId:string){
 const vapor=primitive(data.vapor,catalogId),original=primitive(data.clay,catalogId),volume=original.parameters.find(p=>p.parameter_id===data.clay.measurementParameterId)!;
 const A=data.clay.areaParameterIdForGeometry,D=data.clay.thicknessParameterId;
 const geometryParameters=[
  {...volume,parameter_id:A,unit_id:'m2',title_ru:'Площадь керамзитового утепления, м²',truth_metadata:{...volume.truth_metadata,semantic_parameter_key:catalogId+':'+A,guide:{...(volume.truth_metadata.guide as Json),guide_short_ru:'Введите проектную площадь именно этого керамзитового слоя. Площадь покрытия и пароизоляции автоматически не переносится.'}}},
  {...volume,parameter_id:D,unit_id:'mm',title_ru:'Средняя по площади проектная толщина устроенного керамзитового слоя, мм',truth_metadata:{...volume.truth_metadata,semantic_parameter_key:catalogId+':'+D,guide:{...(volume.truth_metadata.guide as Json),guide_short_ru:'Введите среднюю по площади утепления проектную толщину устроенного слоя в миллиметрах. При переменной толщине это не обязательно среднее минимума и максимума. Приложение само вычислит объём A×D/1000; насыпной объём, плотность марки400 и повторный коэффициент уплотнения не подставляются.'}}},
 ];
 const clay={...original,parameters:[...original.parameters.filter(p=>p.parameter_id!==data.clay.measurementParameterId),...geometryParameters],
  formulas:original.formulas.map(f=>{const ast=roofClayGeometryAstV1(f.ast);return {...f,ast,input_parameter_ids:[A,D].sort(),expression_source:`${A}*${D}/1000/1*${data.clay.rates.find(r=>f.formula_id===data.clay.prefix+':formula:'+r.role)!.perMeasure}`,ast_sha256:hash(ast)};}),
  resources:original.resources.map(r=>{const {normativeMeasureParameterId:_v,...source}=r.source_metadata as Json;
   return {...r,source_metadata:{...source,normativeMeasureExpressionV1:{unitId:'m3',inputParameterIds:[A,D],areaUnitId:'m2',thicknessUnitId:'mm',conversionDivisor:'1000',volumeBasis:'INSTALLED_PROJECT_LAYER',noPreliminaryVolumeRounding:true}},
    resource_graph:{...r.resource_graph,derivedQuantityEditPolicyV1:{...(r.resource_graph.derivedQuantityEditPolicyV1 as Json),parameterIds:[A,D],reasonRu:data.clay.quantityEditReasonRu}} as Record<string,unknown>};})};
 const example=vapor.parameters.find(p=>p.parameter_id===data.vapor.systemParameterId)!;
 const other={...example,parameter_id:ROOF_OTHER_LAYERS_PARAMETER_V1,title_ru:'Другие слои сверх выбранных пароизоляции и утепления',constraints_json:{values:[ROOF_OTHER_LAYERS_NONE_V1,ROOF_OTHER_LAYERS_PRESENT_V1,ROOF_OTHER_LAYERS_UNKNOWN_V1]},truth_metadata:{...example.truth_metadata,semantic_parameter_key:catalogId+':'+ROOF_OTHER_LAYERS_PARAMETER_V1,guide:{...(example.truth_metadata.guide as Json),guide_short_ru:'По проекту проверьте только оставшиеся дополнительные, защитные и эксплуатируемые слои сверх отдельно выбранных пароизоляции и утепления. Ответ «нет» не определяет сами эти два слоя или готовность конструкции.'}}};
 return {vapor,clay,other};
}
/** Reuses the existing informational source-gap formula; never introduces a
 * fake zero amount or another user-supplied coefficient. Put numeric owners first. */
export function roofLowerLayersObligationsV1(originalAssembly:Json,catalogId:string){
 const owners=roofLowerLayersOwnersV1(catalogId),ctx=roofLowerLayersContextV1(),evidence=data.sources.map(s=>({sha256:s.sha256,locator:s.locators}));
 const paid=(name:'vapor'|'clay')=>owners[name].resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id);
 const create=(rowId:string,title:string,scope:Json)=>({...originalAssembly,id:'resource-'+rowId.replaceAll(':','-'),row_id:rowId,title_ru:title,semantic_owner:catalogId+':'+rowId,cost_owner_id:catalogId+':'+rowId,
  resource_graph:{...originalAssembly.resource_graph,scopeRequirementV1:scope},source_metadata:{...originalAssembly.source_metadata,scopeClassificationContract:data.contract,numericNormClosed:false}});
 const layerScope=(name:'vapor'|'clay',rowId:string)=>{const layer=data[name];return {contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:layer.prefix,groupTitleRu:layer.groupTitleRu,titleRu:layer.groupTitleRu,reasonRu:layer.scopeRu+' Количества приложение получает из источника и исходных данных. Расчёт не подтверждает выполнение.',exactScopeWhen:roofLowerLayerConditionsV1(layer),contextWhen:ctx,
  notApplicableWhen:eq(layer.systemParameterId,layer.notApplicableChoiceRu),satisfiedWhen:eq(layer.systemParameterId,layer.completedChoiceRu),objectFactParameterId:layer.systemParameterId,unknownObjectValues:[layer.unknownChoiceRu],requiredFactParameterIds:name==='vapor'?[data.vapor.measurementParameterId]:[data.clay.areaParameterIdForGeometry,data.clay.thicknessParameterId],operationExclusionSatisfiesScopeV1:true,sourceEvidence:evidence,coveringRowIds:paid(name),originalRowIds:[]};};
 const unknownUpperStates=['Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства','Принятое минеральное основание; совместимая готовая эмульсия на всю площадь; огрунтовка оплачивается только здесь; обычные условия до 15 м',ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1,'Условия ещё не проверены'];
 const chain={contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:'lower_layers_project_chain',groupTitleRu:'Проектная применимость будущего кровельного пирога',titleRu:'Согласованная предстоящая конструкция',reasonRu:ROOF_FORECAST_LOWER_LAYERS_GUIDE_V1,exactScopeWhen:{kind:'and',operands:[ctx,eq('roof_torch_conditions',ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1)]},objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:'roof_torch_conditions',unknownObjectValues:unknownUpperStates,
  projectOperationContextsV1:[{when:eq(data.vapor.systemParameterId,data.vapor.systemYesRu),resourceRowIds:paid('vapor')},{when:eq(data.clay.systemParameterId,data.clay.systemYesRu),resourceRowIds:paid('clay')}],sourceEvidence:evidence,coveringRowIds:[],originalRowIds:[]};
 return [create(ROOF_VAPOR_SCOPE_ROW_V1,data.vapor.groupTitleRu,layerScope('vapor',ROOF_VAPOR_SCOPE_ROW_V1)),create(ROOF_CLAY_SCOPE_ROW_V1,data.clay.groupTitleRu,layerScope('clay',ROOF_CLAY_SCOPE_ROW_V1)),create(ROOF_LOWER_CHAIN_SCOPE_ROW_V1,chain.titleRu,chain)];
}
