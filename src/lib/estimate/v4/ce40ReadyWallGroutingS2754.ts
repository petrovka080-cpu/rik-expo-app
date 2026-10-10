import wall from '../../../../data/estimate-benchmarks/source-packs/ce40-ready-wall-grouting-s27-54.json';
import {ce40ReadyCeramicPackS2754 as floor,buildCe40ReadyCeramicDefinitionS2754,buildCe40ReadyCeramicCompletenessMapS2754,type Ce40ReadyCeramicSourcePackS2754} from './ce40ReadyCeramicGroutingS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

export const ce40ReadyWallPackS2754:Ce40ReadyCeramicSourcePackS2754={...floor,...wall,
  types:floor.types.map((t,i)=>({...t,...wall.types[i]})),source:{...floor.source,locatorRu:'Стр.1: CE 40 для керамической облицовки стен и полов, готовность и заполнение обычных швов; стр.2: ориентировочная таблица кг/м² облицовки, цвет 1 Белый, ведро2кг, вода0,56–0,60л/2кг, условия и защита'},
  sourceNeeds:[...floor.sourceNeeds,{id:'wall-access-protection',operation:'protection',category:'service',nameRu:'Доступ к фактической высоте керамической стены и защита глаз и кожи при затирке CE 40',unitId:'item',
    reasonRu:'Высота, способ доступа и обеспечение СИЗ подтверждаются заданием исполнителя; оснастка, включённая в его цену, второй раз не оплачивается. Леса, покупка нового оснащения и часы автоматически не назначены.'}]};
export function ce40ReadyWallPrefixS2754(index:number){if(!ce40ReadyWallPackS2754.types[index])throw Error('EXACT_SIX_CE40_WALL_TABLE_PAIRS_ONLY');return 'ceramic:ce40-ready-wall:'+ce40ReadyWallPackS2754.types[index].key;}
export function ce40ReadyWallDefinitionS2754(index:number){return buildCe40ReadyCeramicDefinitionS2754(ce40ReadyWallPackS2754,index,ce40ReadyWallPrefixS2754(index));}
export function ce40ReadyWallCompletenessMapS2754(index:number){return buildCe40ReadyCeramicCompletenessMapS2754(ce40ReadyWallPackS2754,ce40ReadyWallPrefixS2754(index));}
export function compileCe40ReadyWallS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:ce40ReadyWallPackS2754.types[index].catalogId,
  compilerVersion:ce40ReadyWallPackS2754.contract,primaryMeasureParameterId:'grout_area_m2',definition:ce40ReadyWallDefinitionS2754(index),submittedParameters:input});}
