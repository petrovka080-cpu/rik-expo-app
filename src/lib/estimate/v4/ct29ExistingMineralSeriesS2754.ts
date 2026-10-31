import series from '../../../../data/estimate-benchmarks/source-packs/ct29-existing-mineral-series-s27-54.json';
import {ct29IndoorPlasterPackS2754,buildCt29PlasterDefinitionS2754,buildCt29PlasterCompletenessMapS2754,ct29IndoorGeometrySourcePackR1,type Ct29PlasterSourcePackS2754} from './ct29IndoorPlasterS2754';
import {ct29ExteriorPlasterPackS2754} from './ct29ExteriorPlasterS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
import {ct29IndoorDeliveryCleanupPackR2} from './ct29IndoorDeliveryCleanupR2';
import {buildCt29IndoorResourceProvisionDefinitionR3,ct29IndoorResourceProvisionCompletenessMapR3,
 ct29IndoorResourceProvisionPackR3} from './ct29IndoorResourceProvisionR3';

export const ct29ExistingMineralSeriesS2754=series;
export const ct29ExistingMineralPrefixS2754=(index:number)=>'plaster:ct29-existing:'+series.types[index]?.key;
export function ct29ExistingMineralAdvancedPackS2754(index:number):Ct29PlasterSourcePackS2754{
  const type=series.types[index];if(!type)throw Error('EXACT_FOUR_CT29_EXISTING_MINERAL_TYPES_ONLY');
  const outside=type.location==='OUTDOOR',base=outside?ct29ExteriorPlasterPackS2754:ct29IndoorPlasterPackS2754;
  const baseValue=`Готовое основание именно из ${type.materialRu}; шероховатое, прочное, очищенное от загрязнений, краски и непрочных слоёв; низкая впитываемость подтверждена обследованием; перед нанесением влажное, но не мокрое`;
  const presentation=`Применение: штукатурное выравнивание поверх готовой ${type.materialRu} ${outside?'снаружи здания':'внутри помещения'}. Низкая впитываемость подтверждается обследованием, не выводится из названия материала. ${outside?'Нанесение в сухих условиях при +5…+25°C, без интенсивного солнечного облучения; защита от дождя и быстрого высыхания минимум 24 ч по принятому заданию.':'Нанесение в сухих условиях при +5…+25°C; исключены сквозняки и низкие температуры при твердении.'}`;
  return {...base,contract:series.contract+':'+type.key,catalogId:type.catalogId,workKey:type.workKey,titleRu:type.titleRu,
    sourceId:'ceresit_ct29_existing_mineral_s2754_'+type.key.replaceAll('-','_'),source:series.source,
    acceptedPhysicalProfileId:'manufacturer-profile:ceresit-ct29:C_CT29_TDS_1_0120:existing-'+type.key+':v1',
    baseValue,baseParameterTitleRu:`Подготовленное основание: ${type.materialTitleRu}, фактическая низкая впитываемость`,
    applicationModeValue:series.applicationModeValue,layerValue:series.layerValue,sourceTitleRu:'Ceresit CT29: штукатурный слой поверх существующей минеральной штукатурки',
    scopeRu:presentation+' '+series.applicationModeValue+'. Совместимость слоя, назначенная толщина и ссылка на узел обязательны; подготовка основания уже принята и повторно не оплачивается. Одна выбранная фасовка 5 или 25 кг; явный последовательный план целых замесов, без автоматического запаса.',
    applicationPresentationRu:presentation,completenessCondition:'EXISTING_'+type.materialValue+'_'+type.location+'_APPROVED_PLASTER_LAYER',
    excludedRu:series.excludedRu};
}
/** Only the exact existing cement-lime indoor owner opts into the ordinary successor.
 * Stored advanced definitions and the other three branches retain their source semantics. */
export function ct29ExistingMineralGeometryPackR1(index:number):Ct29PlasterSourcePackS2754 {
 const advanced=ct29ExistingMineralAdvancedPackS2754(index);
 if(index!==1)return advanced;
 return {...advanced,ordinaryGeometryProfileR1:true,contract:ct29IndoorGeometrySourcePackR1.contract,
  scopeRu:ct29IndoorGeometrySourcePackR1.scopeRu,sourceTitleRu:ct29IndoorGeometrySourcePackR1.titleRu,
  layerValue:'Однослойное CT29 en_GL до20 мм за проход по официальной global product page с тем же en_GL TDS',
  sourceNeeds:advanced.sourceNeeds.filter(gap=>gap.id==='curing-water'||gap.id==='logistics-cleanup'),
  completenessCondition:'EXACT_PREPARED_CEMENT_LIME_INSIDE_SINGLE_COAT_TO_20MM',
  applicationPresentationRu:'CT29 en_GL по готовой цементно-известковой штукатурке внутри: площадь и толщина до 20 мм; мешки 25 кг и целые последовательные замесы считаются автоматически.',
  excludedRu:[...ct29IndoorGeometrySourcePackR1.forbiddenRu]};
}
export function ct29ExistingMineralDeliveryCleanupPackR2(index:number):Ct29PlasterSourcePackS2754 {
 const base=ct29ExistingMineralGeometryPackR1(index);
 return index===1?{...base,contract:ct29IndoorDeliveryCleanupPackR2.contract,
  sourceNeeds:base.sourceNeeds.filter(gap=>gap.id!=='logistics-cleanup'),
  scopeRu:base.scopeRu+' '+ct29IndoorDeliveryCleanupPackR2.transportPolicyRu+' '+ct29IndoorDeliveryCleanupPackR2.cleanupPolicyRu}:base;
}
export function ct29ExistingMineralPackS2754(index:number):Ct29PlasterSourcePackS2754 {
 const base=ct29ExistingMineralDeliveryCleanupPackR2(index);
 return index===1?{...base,contract:ct29IndoorResourceProvisionPackR3.contract}:base;
}
export const ct29ExistingMineralDefinitionS2754=(index:number)=>index===1
 ?buildCt29IndoorResourceProvisionDefinitionR3(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index))
 :buildCt29PlasterDefinitionS2754(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index));
export const ct29ExistingMineralCompletenessMapS2754=(index:number)=>index===1
 ?ct29IndoorResourceProvisionCompletenessMapR3(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index))
 :buildCt29PlasterCompletenessMapS2754(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index));
export function compileCt29ExistingMineralS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:series.types[index].catalogId,
  compilerVersion:ct29ExistingMineralPackS2754(index).contract,primaryMeasureParameterId:'plaster_area_m2',definition:ct29ExistingMineralDefinitionS2754(index),submittedParameters:input});}
