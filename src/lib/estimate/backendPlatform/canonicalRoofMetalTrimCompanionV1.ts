import pack from '../../../../data/estimate-benchmarks/source-packs/roof-metal-trim-companion-s27-67.json';
import {sourcePinnedRoofNormOwnerR1,sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {flatRoofScopePackS2765} from '../v4/flatRoofScopeS2765';
import {extendRoofPlannedPreparationConditionV1} from './canonicalRoofPreparationMigrationV1';
import {extendRoofForecastConditionV1} from './canonicalRoofScreedCompanionV1';
export const ROOF_METAL_TRIM_PACK_V1=pack as SourcePinnedRoofNormPackR1 & typeof pack;
export const ROOF_METAL_TRIM_SEMANTIC_ROWS_V1=['materials_04','components_09','labor_22'].map(s=>flatRoofScopePackS2765.prefix+':remaining:'+s);
export const ROOF_METAL_TRIM_OPERATION_KEY_V1=JSON.stringify([pack.prefix,pack.prefix+':installation']);
type Json=Record<string,any>;
export function roofMetalTrimConditionsV1(){
 const original=sourcePinnedRoofNormGuardsR1(flatRoofScopePackS2765 as unknown as SourcePinnedRoofNormPackR1).admitted;
 const context=extendRoofForecastConditionV1(extendRoofPlannedPreparationConditionV1(original));
 const selected={kind:'equals',parameterId:pack.systemParameterId,value:pack.systemYesRu};
 return {context,selected,admitted:{kind:'and',operands:[context,selected]}};
}
export function roofMetalTrimExistingRowV1(row:Json,paidRowIds:string[]):Json {
 if(!ROOF_METAL_TRIM_SEMANTIC_ROWS_V1.includes(row.row_id))return row;
 const previous=row.resource_graph?.scopeRequirementV1;if(!previous||previous.groupId!=='edge_and_parapet_details')throw Error('ROOF_METAL_TRIM_SEMANTIC_SCOPE_DRIFT');
 const c=roofMetalTrimConditionsV1();
 return {...row,resource_graph:{...row.resource_graph,scopeRequirementV1:{...previous,kind:'INCLUDED',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,
  coveringRowIds:paidRowIds,exactScopeWhen:c.admitted,contextWhen:c.context,
  notApplicableWhen:{kind:'equals',parameterId:pack.systemParameterId,value:pack.notApplicableChoiceRu},
  satisfiedWhen:{kind:'equals',parameterId:pack.systemParameterId,value:pack.completedChoiceRu},
  objectFactParameterId:pack.systemParameterId,unknownObjectValues:[pack.unknownChoiceRu],requiredFactParameterIds:[pack.measurementParameterId],
  reasonRu:'Приложение считает изготовление и крепление всех доборов этого участка только для выбранного полного состава из оцинкованной стали 0,7 мм. Другие или смешанные доборы сохраняются открытыми. Площадь самих доборов измеряется отдельно; гидроизоляционные примыкания и водосток этим этапом не закрыты.',
  sourceEvidence:[...previous.sourceEvidence,{sha256:pack.sources[0]!.sha256,locator:pack.sources[0]!.locators}]}}};
}
export function roofMetalTrimCompanionOwnerV1(catalogId:string){
 if(!pack.targets.some(t=>t.catalogId===catalogId))throw Error('ROOF_METAL_TRIM_CATALOG_UNSUPPORTED');
 const owner=sourcePinnedRoofNormOwnerR1(ROOF_METAL_TRIM_PACK_V1),c=roofMetalTrimConditionsV1();
 return {...owner,
  parameters:owner.parameters.filter(p=>[pack.systemParameterId,pack.measurementParameterId].includes(p.parameter_id)).map(p=>({...p,
   constraints_json:p.parameter_id===pack.measurementParameterId?{...p.constraints_json,exclusiveMin:0,requiredWhen:c.admitted}:p.constraints_json,
   truth_metadata:{...p.truth_metadata,semantic_parameter_key:catalogId+':'+p.parameter_id}})),
  resources:owner.resources.map(r=>({...r,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id,inclusion_ast:c.admitted,
   resource_graph:{...r.resource_graph,derivedQuantityEditPolicyV1:{...(r.resource_graph.derivedQuantityEditPolicyV1 as Record<string,unknown>),
    reasonRu:'Количество рассчитано по подтверждённой норме и измеренной площади металлических малых покрытий. Изменяйте эту площадь в исходных данных; нормы приложение получает из источника.'}} as Record<string,unknown>}))};
}
