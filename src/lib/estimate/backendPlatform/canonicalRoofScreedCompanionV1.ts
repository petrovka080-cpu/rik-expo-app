import pack from '../../../../data/estimate-benchmarks/source-packs/roof-screed15-companion-s27-67.json';
import admittedPrimitive from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import {sourcePinnedRoofNormOwnerR1,sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1} from './canonicalRoofPlannedPreparationV1';
import {ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1,ROOF_FORECAST_SCREED_PRIMER_GUIDE_V1} from './canonicalRoofForecastConditionV1';
export const ROOF_SCREED_PACK_V1=pack as SourcePinnedRoofNormPackR1 & typeof pack;
export const ROOF_SCREED_SEMANTIC_ROW_V1='roof:torch-two:krer12-002-09:remaining:labor_18';
export const ROOF_SCREED_OPERATION_KEY_V1=JSON.stringify([pack.prefix,pack.prefix+':installation']);
type Json=Record<string,any>;
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
/** New 7→8 transform only. Historical 5→6/6→7 builders stay unchanged. */
export function extendRoofForecastConditionV1(ast:unknown):unknown {
 const replace=(v:unknown):unknown=>Array.isArray(v)?v.map(replace):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,child])=>
  [k,k==='value'&&(v as Json).parameterId==='roof_torch_conditions'&&child===ROOF_PLANNED_PRIMER_CONDITIONS_V1?ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1:replace(child)])):v;
 const forecast=replace(ast);return same(ast,forecast)?ast:{kind:'or',operands:[ast,forecast]};
}
export function roofScreedConditionsV1(){return sourcePinnedRoofNormGuardsR1(ROOF_SCREED_PACK_V1).admitted;}
export function roofScreedScopeV1(previous:Json,paidRowIds:string[]):Json {
 return {...previous,kind:'INCLUDED',groupId:pack.prefix,groupTitleRu:'Подготовка основания',coveringRowIds:paidRowIds,
  exactScopeWhen:{kind:'or',operands:[previous.exactScopeWhen,roofScreedConditionsV1()]},requiredFactParameterIds:[pack.measurementParameterId],
  reasonRu:'Приложение рассчитывает запланированную машинную стяжку ровно 15 мм из готового М100 по её отдельной измеренной площади. Покрыты только подготовка готового основания и устройство этой стяжки. Ремонт, разуклонка, остальные слои, выдерживание и приёмка этим расчётом не подтверждаются.',
  sourceEvidence:[...previous.sourceEvidence,{sha256:pack.sources[0]!.sha256,locator:pack.sources[0]!.locators}]};
}
/** Exact old-row change: numerical formulas, sources, cost owners are untouched.
 * No satisfiedWhen is widened: forecast is not execution acceptance. */
export function forecastRoofExistingRowV1(row:Json,paidRowIds:string[]):Json {
 const graph=row.resource_graph??{},scope=graph.scopeRequirementV1;
 const extended=scope?{...scope,exactScopeWhen:extendRoofForecastConditionV1(scope.exactScopeWhen),
  ...(scope.contextWhen==null?{}:{contextWhen:extendRoofForecastConditionV1(scope.contextWhen)})}:null;
 return {...row,inclusion_ast:extendRoofForecastConditionV1(row.inclusion_ast),resource_graph:{...graph,
  ...(scope?{scopeRequirementV1:row.row_id===ROOF_SCREED_SEMANTIC_ROW_V1?roofScreedScopeV1(scope,paidRowIds):extended}:{})}};
}
export function forecastRoofConditionParameterV1(p:Json):Json {
 if(p.parameter_id!=='roof_torch_conditions')return p;
 return {...p,constraints_json:{...p.constraints_json,values:[...p.constraints_json.values,ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1]},
  truth_metadata:{...p.truth_metadata,guide:{...p.truth_metadata.guide,guide_short_ru:ROOF_FORECAST_SCREED_PRIMER_GUIDE_V1}}};
}
export function roofScreedCompanionOwnerV1(catalogId:string){
 // Reuse the admitted primitive's complete source/rates, not a newly invented norm.
 if(pack.prefix!==admittedPrimitive.prefix||pack.normId!==admittedPrimitive.normId||!same(pack.rates,admittedPrimitive.rates)||!same(pack.sources,admittedPrimitive.sources)
  ||pack.sourceAdmissionSha256!==admittedPrimitive.sourceAdmissionSha256||pack.conditionsYesRu!==ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1)throw Error('ROOF_SCREED_ADMITTED_PRIMITIVE_DRIFT');
 const owner=sourcePinnedRoofNormOwnerR1(ROOF_SCREED_PACK_V1);
 return {...owner,parameters:owner.parameters.filter(p=>p.parameter_id===pack.measurementParameterId).map(p=>({...p,
  constraints_json:{...p.constraints_json,exclusiveMin:0,requiredWhen:roofScreedConditionsV1()},
  truth_metadata:{...p.truth_metadata,semantic_parameter_key:catalogId+':'+p.parameter_id}})),
  resources:owner.resources.map(r=>({...r,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id}))};
}
