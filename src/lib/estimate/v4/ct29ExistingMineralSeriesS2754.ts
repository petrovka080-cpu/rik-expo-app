import series from '../../../../data/estimate-benchmarks/source-packs/ct29-existing-mineral-series-s27-54.json';
import {ct29IndoorPlasterPackS2754,buildCt29PlasterDefinitionS2754,buildCt29PlasterCompletenessMapS2754,type Ct29PlasterSourcePackS2754} from './ct29IndoorPlasterS2754';
import {ct29ExteriorPlasterPackS2754} from './ct29ExteriorPlasterS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

export const ct29ExistingMineralSeriesS2754=series;
export const ct29ExistingMineralPrefixS2754=(index:number)=>'plaster:ct29-existing:'+series.types[index]?.key;
export function ct29ExistingMineralPackS2754(index:number):Ct29PlasterSourcePackS2754{
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
export const ct29ExistingMineralDefinitionS2754=(index:number)=>buildCt29PlasterDefinitionS2754(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index));
export const ct29ExistingMineralCompletenessMapS2754=(index:number)=>buildCt29PlasterCompletenessMapS2754(ct29ExistingMineralPackS2754(index),ct29ExistingMineralPrefixS2754(index));
export function compileCt29ExistingMineralS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:series.types[index].catalogId,
  compilerVersion:series.contract,primaryMeasureParameterId:'plaster_area_m2',definition:ct29ExistingMineralDefinitionS2754(index),submittedParameters:input});}
