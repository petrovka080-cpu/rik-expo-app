import pack from '../../../../data/estimate-benchmarks/source-packs/floor-demolition-planned-preparation-thirteen-s27-69.json';
import concreteBase from '../../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';

type Json=Record<string,unknown>;
export const floorPreparationIntentBindingS2769=pack;
export const floorPreparationFreshDefaultsS2769:Record<string,string>={
 [pack.modeId]:pack.plannedMode,...Object.fromEntries(pack.stages.map(s=>[s.id,s.planned])),
 [pack.barrierMethodId]:pack.barrierValue,[pack.dustMethodId]:pack.dustValue,
};
export function isFloorPreparationConsumerS2769(catalogId:string){return pack.targets.some(t=>t.catalogId===catalogId)||concreteBase.targets.some(t=>t.catalogId===catalogId);}
/** Approved defaults retain their origin. Old composition is a user choice,
 * never a replacement baseline or a physical fact inferred from old absence. */
export function assertFloorPreparationRecalculationChoiceS2769(input:{catalogId:string;parentParameters:Json;submittedParameters:Json}):void{
 if(!isFloorPreparationConsumerS2769(input.catalogId)||Object.hasOwn(input.parentParameters,pack.modeId))return;
 if(input.submittedParameters[pack.modeId]===pack.legacyMode||input.submittedParameters[pack.modeId]===pack.plannedMode)return;
 throw Object.assign(new Error('Выберите состав подготовки при обновлении: сохранить прежний состав или включить подготовку по этой смете. Исходная смета сохранена.'),
  {code:'FLOOR_PREPARATION_COMPOSITION_CHOICE_REQUIRED',httpStatus:409});
}
/** Display the same conservative transition as the server for a saved revision
 * that predates the new intent parameter. No physical input is invented. */
export function floorPreparationEditingParametersS2769(catalogId:string,parameters:Json):Json{
 return isFloorPreparationConsumerS2769(catalogId)&&!Object.hasOwn(parameters,pack.modeId)
  ? {...parameters,[pack.modeId]:pack.legacyMode}:parameters;
}
export function assertFloorPreparationIntentS2769(catalogId:string,parameters:Json){
 if(!isFloorPreparationConsumerS2769(catalogId)||parameters[pack.modeId]!==pack.plannedMode)return;
 if(parameters.object_conditions===pack.oldWoodConditions)throw Object.assign(new Error(
  'Прежняя отметка о выполненной подготовке сохранена. Для планируемого состава выберите условия с подготовкой по этой смете.'),{code:'PARAMETER_VALIDATION_FAILED'});
}
