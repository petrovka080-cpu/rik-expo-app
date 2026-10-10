import pack from '../../../../data/estimate-benchmarks/source-packs/incandescent-vl-luminaire-krer33-04-014-01-s27-58.json';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildVlLuminaireDefinitionR1} from './vlLuminaireOwnerR1';

export const incandescentVlPackS2758=pack;
export const incandescentVlPrefixS2758='incandescent-vl-luminaire';
export const ownLuminaireTruckS2758='Собственный бортовой автомобиль; водитель включён в стоимость эксплуатации';
export const hiredLuminaireTruckS2758='Аренда бортового автомобиля; водитель включён в ставку машины';
const prefix=incandescentVlPrefixS2758;

export function incandescentVlDefinitionS2758():AutomaticOwnerDefinition{
  return buildVlLuminaireDefinitionR1({pack,prefix,column:'01',verifiedAt:'2026-10-10T16:48:05Z',orderConversionError:'INCANDESCENT_ORDER_UNIT_CONVERSION_NOT_ADMITTED',
    labour:{title:'Труд рабочих-строителей, средний разряд4,0; вся операция установки',rate:'1.29',includedOperationDetails:'Операция включена в единый труд1,29ч на светильник; отдельной оплаты и закупки нет.'},
    machines:[{id:'truck',parameterId:'truck_fulfillment',parameterTitle:'Собственный бортовой автомобиль или аренда с водителем',rate:'0.06',sourceTitle:'Нормативная работа бортового автомобиля грузоподъёмностью до5т',
      ownTitle:'Бортовой автомобиль грузоподъёмностью до5т — собственный, эксплуатация',hiredTitle:'Бортовой автомобиль грузоподъёмностью до5т — аренда с водителем',ownValue:ownLuminaireTruckS2758,hiredValue:hiredLuminaireTruckS2758,
      operationTitle:'Бортовой автомобиль и включённый водитель',details:'0,06маш.-ч на светильник; водитель включён, аренда и собственная эксплуатация взаимоисключающие.',guide:'Выберите фактический способ обеспечения. Водитель включён в стоимость эксплуатации/ставку; собственного автомобиля нет в списке аренды.',
      operatorCostOwnership:'DRIVER_INCLUDED_IN_MACHINE_PRICE_NO_SECOND_OWNER',ownershipSourceKey:'driverPriceOwnershipSource'}],
    readySupportGuide:'Укажите фактический проект готовой пригодной опоры ВЛ, детали крепления, точки присоединения и светильника с лампой накаливания. Строительство опоры и питающей сети сюда не входит.',
    accessGuide:'Укажите предусмотренный проектом/технологической картой фактический способ доступа. Вышка из соседней колонки не добавляется; дополнительный состав и количество требуют источника.',
    supplyGuide:'Выберите только подтверждённую раздельную поставку/оплату всех пяти проектных позиций. Если крепёж/кронштейн/хомут/провод включён в другой комплект, данный раздельный заказ остаётся открытым: его нельзя дублировать. Лампа в указанном светильнике не получает второй заказ.'});
}
export function compileIncandescentVlS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'luminaire_count',definition:incandescentVlDefinitionS2758(),submittedParameters:input});}
export function incandescentVlCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
    ...[{id:'whole-labor',unitId:'man_hour',spec:'Труд всей операции1,29ч на светильник'},{id:'truck-consumed',unitId:'machine_hour',spec:'Автомобиль бортовой до5т0,06маш.-ч на светильник'}].map(x=>({expectedResourceId:pack.normId+':'+x.id,operationId:'installation',category:x.id==='whole-labor'?'labor':'equipment',specification:x.spec,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:x.unitId,quantityRule:'EXACT_FIXED_RATE_PER_LUMINAIRE',formulaId:prefix+':formula:'+x.id,resolution:{kind:'ROW',rowId:prefix+':'+x.id}})),
    ...pack.materials.map(m=>({expectedResourceId:pack.normId+':'+m.id,operationId:'installation',category:'material',specification:m.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:m.sourceUnitId,quantityRule:m.projectDefined?'DOCUMENTED_PROJECT_TOTAL_DIRECT':'EXACT_FIXED_RATE_PER_LUMINAIRE',formulaId:prefix+':formula:'+m.id+'-consumed',resolution:{kind:'ROW',rowId:prefix+':'+m.id+'-consumed'}})),
    ...pack.operations.map(o=>({expectedResourceId:pack.normId+':operation:'+o.id,operationId:'installation',category:'work',specification:o.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:'pcs',quantityRule:'OPERATION_INCLUDED_IN_WHOLE_LABOR_NO_SPLIT_HOURS',formulaId:prefix+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'}})),
    ...[true,false].map(own=>({expectedResourceId:pack.normId+':truck-fulfillment:'+own,operationId:'truck',category:'equipment',specification:'Бортовой автомобиль до5т с включённым водителем',condition:own?ownLuminaireTruckS2758:hiredLuminaireTruckS2758,sourceId:pack.sourceId,unitId:'machine_hour',quantityRule:'EXCLUSIVE_FULFILLMENT_OF_SINGLE_PHYSICAL_TRUCK_NORM',formulaId:prefix+':formula:truck-'+(own?'own':'hired'),resolution:{kind:'ROW',rowId:prefix+':truck-'+(own?'own':'hired')}})),
    ...pack.gaps.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,category:g.category,specification:g.nameRu,condition:'Проверить фактическую применимость, единицу, количество и включение в цену',sourceId:pack.sourceId,unitId:null,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}}))]};}
