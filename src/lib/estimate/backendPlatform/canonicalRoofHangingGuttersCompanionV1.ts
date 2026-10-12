import pack from '../../../../data/estimate-benchmarks/source-packs/roof-hanging-gutters-companion-s27-67.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {flatRoofScopePackS2765} from '../v4/flatRoofScopeS2765';
import {roofLowerLayersContextV1} from './canonicalRoofLowerLayersCompanionV1';
export const ROOF_HANGING_GUTTERS_PACK_V1=pack;
export const ROOF_WATER_SEMANTIC_ROWS_V1=['materials_06','labor_23'].map(s=>flatRoofScopePackS2765.prefix+':remaining:'+s);
export const ROOF_GUTTER_SCOPE_ROW_V1=pack.prefix+':project-scope';
export const ROOF_GUTTER_OPERATION_KEY_V1=JSON.stringify([pack.prefix,pack.prefix+':installation']);
export const ROOF_OTHER_DRAINAGE_PARAMETER_V1='roof_other_drainage_scope';
export const ROOF_OTHER_DRAINAGE_NONE_V1='Кроме отдельно выбранных подвесных желобов иных работ водоотвода в границе этой сметы нет по проекту';
export const ROOF_OTHER_DRAINAGE_PRESENT_V1='Есть другие материалы или работы водоотвода';
export const ROOF_OTHER_DRAINAGE_UNKNOWN_V1='Другие работы водоотвода ещё не проверены';
type Json=Record<string,any>;
const eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
export const roofGutterConditionsV1=()=>({kind:'and',operands:[roofLowerLayersContextV1(),eq(pack.systemParameterId,pack.systemYesRu)]});
/** Both historical requirements become residual scopes. Their exclusion is
 * not a permanent alias for the complete manufactured gutter operation. */
export function roofGutterExistingRowV1(row:Json):Json {
 if(!ROOF_WATER_SEMANTIC_ROWS_V1.includes(row.row_id))return row;
 const old=row.resource_graph?.scopeRequirementV1;if(!old||old.groupId!=='drainage_installation')throw Error('ROOF_GUTTERS_WATER_SCOPE_DRIFT');
 const titleRu=row.row_id.endsWith('materials_06')?'Другие материалы водоотвода сверх подвесных желобов':'Другой монтаж водоотвода сверх изготовления и крепления подвесных желобов';
 return {...row,title_ru:titleRu,resource_graph:{...row.resource_graph,scopeRequirementV1:{...old,kind:'PROJECT_SCOPE',groupId:'other_roof_drainage',groupTitleRu:'Другие работы водоотвода',titleRu,
  contextWhen:roofLowerLayersContextV1(),exactScopeWhen:{kind:'and',operands:[roofLowerLayersContextV1(),eq(ROOF_OTHER_DRAINAGE_PARAMETER_V1,ROOF_OTHER_DRAINAGE_PRESENT_V1)]},
  notApplicableWhen:eq(ROOF_OTHER_DRAINAGE_PARAMETER_V1,ROOF_OTHER_DRAINAGE_NONE_V1),objectFactParameterId:ROOF_OTHER_DRAINAGE_PARAMETER_V1,unknownObjectValues:[ROOF_OTHER_DRAINAGE_UNKNOWN_V1],
  reasonRu:'Подвесные желоба выбранного профиля имеют собственный расчёт изготовления, установки и крепления. Здесь остаются другие элементы и монтаж: воронки, трубы, соединения, выпуск и иной водоотвод. Отсутствие других работ в границе сметы подтверждает проект; оно не подтверждает отсутствие необходимости отвода воды или работоспособность системы.'}}};
}
export function roofGutterOwnerV1(catalogId:string){
 if(!pack.targets.some(t=>t.catalogId===catalogId))throw Error('ROOF_GUTTERS_CATALOG_UNSUPPORTED');
 const raw=sourcePinnedRoofNormOwnerR1(pack as SourcePinnedRoofNormPackR1),conditions=roofGutterConditionsV1();
 const parameters=raw.parameters.filter(p=>[pack.systemParameterId,pack.measurementParameterId].includes(p.parameter_id)).map(p=>({...p,
  constraints_json:p.parameter_id===pack.measurementParameterId?{...p.constraints_json,exclusiveMin:0,requiredWhen:conditions}:p.constraints_json,
  truth_metadata:{...p.truth_metadata,semantic_parameter_key:catalogId+':'+p.parameter_id} as Json}));
 const example=parameters.find(p=>p.parameter_id===pack.systemParameterId)!;
 const other={...example,parameter_id:ROOF_OTHER_DRAINAGE_PARAMETER_V1,title_ru:'Другие работы водоотвода сверх подвесных желобов',constraints_json:{values:[ROOF_OTHER_DRAINAGE_NONE_V1,ROOF_OTHER_DRAINAGE_PRESENT_V1,ROOF_OTHER_DRAINAGE_UNKNOWN_V1]},truth_metadata:{...example.truth_metadata,semantic_parameter_key:catalogId+':'+ROOF_OTHER_DRAINAGE_PARAMETER_V1,guide:{...example.truth_metadata.guide,guide_short_ru:'Проверьте проектную границу остальных материалов и монтажа водоотвода: воронки, трубы, соединения, выпуск воды и другие желоба. Отсутствие этих работ в данной смете не подтверждает работоспособность или отсутствие потребности в водоотводе.'}}};
 return {...raw,parameters:[...parameters,other],resources:raw.resources.map(r=>({...r,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id,inclusion_ast:conditions,
  resource_graph:{...r.resource_graph,derivedQuantityEditPolicyV1:{...(r.resource_graph.derivedQuantityEditPolicyV1 as Json),reasonRu:'Количество рассчитано по009-02 и самостоятельной длине подвесных желобов. Изменяйте длину в исходных данных; расход, запас и крепёж приложение получает из источника.'}} as Json}))};
}
export function roofGutterObligationV1(original:Json,catalogId:string){
 const paid=roofGutterOwnerV1(catalogId).resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id);
 return {...original,id:'resource-'+ROOF_GUTTER_SCOPE_ROW_V1.replaceAll(':','-'),row_id:ROOF_GUTTER_SCOPE_ROW_V1,title_ru:pack.groupTitleRu,semantic_owner:catalogId+':'+ROOF_GUTTER_SCOPE_ROW_V1,cost_owner_id:catalogId+':'+ROOF_GUTTER_SCOPE_ROW_V1,
  resource_graph:{...original.resource_graph,scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,titleRu:pack.groupTitleRu,reasonRu:pack.systemRu,
   contextWhen:roofLowerLayersContextV1(),exactScopeWhen:roofGutterConditionsV1(),notApplicableWhen:eq(pack.systemParameterId,pack.notApplicableChoiceRu),satisfiedWhen:eq(pack.systemParameterId,pack.completedChoiceRu),objectFactParameterId:pack.systemParameterId,unknownObjectValues:[pack.unknownChoiceRu],requiredFactParameterIds:[pack.measurementParameterId],operationExclusionSatisfiesScopeV1:true,sourceEvidence:pack.sources.map(s=>({sha256:s.sha256,locator:s.locators})),coveringRowIds:paid,originalRowIds:[]}},
  source_metadata:{...original.source_metadata,scopeClassificationContract:pack.contract,numericNormClosed:false}};
}
