import pack from '../../../../data/estimate-benchmarks/source-packs/roof-valley-torch-two-companion-s27-67.json';
import {sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {flatRoofScopePackS2765} from '../v4/flatRoofScopeS2765';
import {extendRoofPlannedPreparationConditionV1} from './canonicalRoofPreparationMigrationV1';
export const ROOF_VALLEY_PACK_V1=pack as SourcePinnedRoofNormPackR1 & typeof pack;
export const ROOF_VALLEY_SEMANTIC_ROW_V1=flatRoofScopePackS2765.prefix+':remaining:components_08';
export const ROOF_VALLEY_OPERATION_KEY_V1=JSON.stringify([pack.prefix,pack.prefix+':installation']);
export function roofValleyConditionsV1(){
 const context=extendRoofPlannedPreparationConditionV1(sourcePinnedRoofNormGuardsR1(flatRoofScopePackS2765 as unknown as SourcePinnedRoofNormPackR1).admitted) as Record<string,unknown>;
 const selected={kind:'equals',parameterId:pack.systemParameterId,value:pack.systemYesRu};
 return {context,selected,admitted:{kind:'and',operands:[context,selected]}};
}
export function roofValleyScopeV1(previous:Record<string,unknown>,rowIds:string[]){
 const conditions=roofValleyConditionsV1();
 return {...previous,kind:'INCLUDED',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,coveringRowIds:rowIds,
  reasonRu:'Приложение рассчитывает два дополнительных слоя ЭПП-4 по норме 005-03 и измеренной длине ендов. Укажите только проектный узел и длину. Варианты «нет», «уже выполнено» и «неизвестно» учитываются отдельно; другие узлы требуют другого расчёта.',
  exactScopeWhen:conditions.admitted,contextWhen:conditions.context,
  notApplicableWhen:{kind:'equals',parameterId:pack.systemParameterId,value:pack.notApplicableChoiceRu},
  satisfiedWhen:{kind:'equals',parameterId:pack.systemParameterId,value:pack.completedChoiceRu},
  objectFactParameterId:pack.systemParameterId,unknownObjectValues:[pack.unknownChoiceRu],requiredFactParameterIds:[pack.measurementParameterId],
  sourceEvidence:[...(previous.sourceEvidence as unknown[]),{sha256:pack.sources[0]!.sha256,locator:pack.sources[0]!.locators}]};
}
