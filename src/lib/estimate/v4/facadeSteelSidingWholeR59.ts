import data from '../../../../data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json';
import current from '../../../../data/estimate-benchmarks/source-packs/facade-steel-siding-current-whole-r59.json';
import {facadeSteelSidingDefinitionR2,facadeSteelSidingCompletenessR2,facadeSteelSidingPrimaryR2,
 facadeSteelSidingNeedsR2,facadeSteelSidingNeedParametersR2,facadeSteelSidingScenarioFactsR2,
 assertFacadeSteelSidingSourceR2,compileFacadeSteelSidingR2} from './facadeSteelSidingKrer15R2';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
export const facadeSteelSidingCurrentPackR59=current,facadeSteelSidingSourcePackR59=data;
export const facadeSteelSidingPrimaryR59=facadeSteelSidingPrimaryR2;
export const facadeSteelSidingNeedsR59=facadeSteelSidingNeedsR2,facadeSteelSidingNeedParametersR59=facadeSteelSidingNeedParametersR2;
export const facadeSteelSidingRowIdR59=(key:string)=>current.prefix+':'+key;
export const facadeSteelSidingScenarioFactsR59=(more:Record<string,unknown>={})=>facadeSteelSidingScenarioFactsR2(more);
export const facadeSteelSidingSelectedSourceFactsR59=()=>({source_system_conformance:data.sourceFitValue});
export function facadeSteelSidingDefinitionR59():AutomaticOwnerDefinition{
 assertFacadeSteelSidingSourceR2();
 if(data.catalogId!==current.catalogId||data.sourceId!==current.sourceId||data.normId!==current.normId)
  throw Error('EXACT_EXISTING_STEEL_SIDING_SOURCE_REQUIRED');
 const definition=facadeSteelSidingDefinitionR2(),names:Readonly<Record<string,string>>=current.publicResourceNames;
 return{...definition,resources:definition.resources.map(row=>{
  const name=names[row.row_id.slice(current.prefix.length+1)];if(name===undefined)return row;
  const{row_sha256:_old,...body}=row;const next={...body,title_ru:name,resource_graph:{...row.resource_graph,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,
    nameRu:name,brandAndModelRu:null,specificationRu:null,detailsRu:[]}}};return{...next,row_sha256:hash(next)};
 })};
}
/** Literal source-owner roster. No generated current resource inventory is used. */
export function facadeSteelSidingCompletenessR59(){
 const base=facadeSteelSidingCompletenessR2(),rid=facadeSteelSidingRowIdR59;
 const owners=[
  {
    "key": "screwdriver-own",
    "operationKeys": [
      "brackets",
      "profiles",
      "starter",
      "cladding"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Шуруповёрт",
    "rule": "EXCLUSIVE_OWN_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Собственная полная эксплуатация"
  },
  {
    "key": "screwdriver-hired",
    "operationKeys": [
      "brackets",
      "profiles",
      "starter",
      "cladding"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Шуруповёрт",
    "rule": "EXCLUSIVE_HIRED_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Услуга полной эксплуатации"
  },
  {
    "key": "electric-grinding-machine-own",
    "operationKeys": [
      "profiles"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Машина шлифовальная электрическая",
    "rule": "EXCLUSIVE_OWN_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Собственная полная эксплуатация"
  },
  {
    "key": "electric-grinding-machine-hired",
    "operationKeys": [
      "profiles"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Машина шлифовальная электрическая",
    "rule": "EXCLUSIVE_HIRED_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Услуга полной эксплуатации"
  },
  {
    "key": "perforator-own",
    "operationKeys": [
      "drilling"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Перфоратор электрический мощностью 1,5 кВт с энергией удара до 18 Дж",
    "rule": "EXCLUSIVE_OWN_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Собственная полная эксплуатация"
  },
  {
    "key": "perforator-hired",
    "operationKeys": [
      "drilling"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Перфоратор электрический мощностью 1,5 кВт с энергией удара до 18 Дж",
    "rule": "EXCLUSIVE_HIRED_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Услуга полной эксплуатации"
  },
  {
    "key": "flatbed-own",
    "operationKeys": [
      "handling"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Автомобиль бортовой грузоподъёмностью до 5 т",
    "rule": "EXCLUSIVE_OWN_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Собственная полная эксплуатация"
  },
  {
    "key": "flatbed-hired",
    "operationKeys": [
      "handling"
    ],
    "category": "equipment",
    "unitId": "machine_hour",
    "title": "Автомобиль бортовой грузоподъёмностью до 5 т",
    "rule": "EXCLUSIVE_HIRED_FULL_SOURCE_MACHINE_HOURS",
    "mode": "Услуга полной эксплуатации"
  },
  {
    "key": "dowel-screw",
    "operationKeys": [
      "brackets"
    ],
    "category": "material",
    "unitId": "piece",
    "title": "Дюбель с шурупом диаметром 6 мм длиной 35 мм",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "screw",
    "operationKeys": [
      "starter",
      "cladding"
    ],
    "category": "material",
    "unitId": "piece",
    "title": "Саморез 4,2×16 мм",
    "rule": "SOLE_ROUNDED_SOURCE_EFFECTIVE_SUPPLY",
    "mode": null
  },
  {
    "key": "levelling-bracket",
    "operationKeys": [
      "brackets"
    ],
    "category": "material",
    "unitId": "piece",
    "title": "Кронштейн выравнивающий стальной оцинкованный высотой 200 мм толщиной 1,2 мм",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "stud-profile",
    "operationKeys": [
      "profiles"
    ],
    "category": "material",
    "unitId": "m",
    "title": "Профиль стоечный стальной",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "expansion-dowel",
    "operationKeys": [
      "brackets"
    ],
    "category": "material",
    "unitId": "piece",
    "title": "Дюбель распорный с гайкой",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "steel-siding",
    "operationKeys": [
      "cladding"
    ],
    "category": "material",
    "unitId": "m",
    "title": "Сайдинг стальной с полимерным покрытием",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "insulation",
    "operationKeys": [
      "insulation"
    ],
    "category": "material",
    "unitId": "m3",
    "title": "Утеплитель фасадный",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "weather-membrane",
    "operationKeys": [
      "membrane"
    ],
    "category": "material",
    "unitId": "m2",
    "title": "Мембрана гидроветрозащитная",
    "rule": "SOLE_ROUNDED_SOURCE_EFFECTIVE_SUPPLY",
    "mode": null
  },
  {
    "key": "cover-strip",
    "operationKeys": [
      "junctions"
    ],
    "category": "material",
    "unitId": "m",
    "title": "Нащельник стальной оцинкованный с полимерным покрытием",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "starter-strip",
    "operationKeys": [
      "starter"
    ],
    "category": "material",
    "unitId": "m",
    "title": "Планка начальная стальная оцинкованная с полимерным покрытием",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  },
  {
    "key": "corner-strip",
    "operationKeys": [
      "junctions"
    ],
    "category": "material",
    "unitId": "m",
    "title": "Угол стальной оцинкованный с полимерным покрытием",
    "rule": "SOLE_ACTUAL_PROJECT_SUPPLY_ABSOLUTE_BASE_UNITS",
    "mode": null
  }
] as const;
 const ownerEntries=owners.map(owner=>({
  expectedResourceId:data.normId+':'+owner.key,operationId:rid('operation:'+owner.operationKeys[0]),
  requiredOperationIds:owner.operationKeys.map(key=>rid('operation:'+key)),category:owner.category,
  unitId:owner.unitId,specification:owner.title,condition:data.normId+(owner.mode===null?'':';'+owner.mode),sourceId:data.sourceId,
  quantityRule:owner.rule,formulaId:rid('formula:'+owner.key),resolution:{kind:'ROW',rowId:rid(owner.key)}}));
 const key=(operationId:string,expectedResourceId:string)=>operationId+'\u0000'+expectedResourceId;
 const materialOwners=ownerEntries.filter(entry=>entry.category==='material');
 const machineOwners=ownerEntries.filter(entry=>entry.category==='equipment');
 if(base.entries.length!==45||materialOwners.length!==11||machineOwners.length!==8)
  throw Error('FACADE_STEEL_WHOLE_MAP_SHAPE_DRIFT');
 // Each source consumption row already links to this exact sole material
 // order owner through purchaseBalanceOwnerRowId. Retain the source entry;
 // a second expectation with the same operation/resource key is not a norm.
 for(const owner of materialOwners){
  const matches=base.entries.filter(entry=>key(entry.operationId,entry.expectedResourceId)===key(owner.operationId,owner.expectedResourceId));
  const source=matches[0];
  if(matches.length!==1||!source||source.category!=='material'||source.unitId!==owner.unitId
   ||source.sourceId!==owner.sourceId||source.condition!==owner.condition
   ||source.resolution.kind!=='ROW'||source.resolution.rowId!==owner.resolution.rowId+'-consumed'
   ||source.formulaId!==owner.formulaId+'-consumed'
   ||JSON.stringify(source.requiredOperationIds)!==JSON.stringify(owner.requiredOperationIds))
   throw Error('FACADE_STEEL_WHOLE_MATERIAL_MAP_PAIR_INVALID:'+owner.expectedResourceId);
 }
 const entries=[...base.entries,...machineOwners];
 if(entries.length!==53||new Set(entries.map(entry=>key(entry.operationId,entry.expectedResourceId))).size!==53)
  throw Error('FACADE_STEEL_WHOLE_UNIFIED_MAP_KEYS_INVALID');
 return{...base,operationResourceBindingRequired:true,entries,
  fullTechnicalAcceptance:false,newFULL:0};
}
export function compileFacadeSteelSidingR59(parameters:Record<string,unknown>,options:Readonly<{
 confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters'];rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
 model?:AutomaticOwnerDefinition;
}>={}){return compileFacadeSteelSidingR2(parameters,{...options,model:options.model??facadeSteelSidingDefinitionR59()});}
