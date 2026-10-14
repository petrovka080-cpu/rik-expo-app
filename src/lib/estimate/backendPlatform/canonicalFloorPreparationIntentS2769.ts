import pack from '../../../../data/estimate-benchmarks/source-packs/floor-demolition-planned-preparation-thirteen-s27-69.json';

type Json=Record<string,unknown>;
export const floorPreparationIntentBindingS2769=pack;
export const floorPreparationFreshDefaultsS2769:Record<string,string>={
 [pack.modeId]:pack.plannedMode,...Object.fromEntries(pack.stages.map(s=>[s.id,s.planned])),
 [pack.barrierMethodId]:pack.barrierValue,[pack.dustMethodId]:pack.dustValue,
};
export function isFloorPreparationConsumerS2769(catalogId:string){return pack.targets.some(t=>t.catalogId===catalogId);}
/** Absence in an old estimate is migration intent, never a construction fact.
 * A subsequent explicit composition choice can opt into the new planned work. */
export function floorPreparationRuntimeDefaultsS2769(input:{catalogId:string;baseline:Json;parentParameters:Json|null;submittedParameters?:Json}):Json{
 if(!isFloorPreparationConsumerS2769(input.catalogId)||input.parentParameters==null)return {...input.baseline};
 if(input.submittedParameters?.[pack.modeId]===pack.plannedMode)return {...input.baseline};
 const mode=input.parentParameters[pack.modeId];
 if(mode===pack.plannedMode)return {...input.baseline};
 const r={...input.baseline};
 for(const id of Object.keys(floorPreparationFreshDefaultsS2769))delete r[id];
 r[pack.modeId]=mode??pack.legacyMode;
 return r;
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
