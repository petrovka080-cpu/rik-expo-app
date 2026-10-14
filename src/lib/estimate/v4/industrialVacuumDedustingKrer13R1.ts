import pack from '../../../../data/estimate-benchmarks/source-packs/aggressive-floor-complete-protection-dust-four-s27-69.json';
import {buildAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

/** Reusable source owner. The published measure is ONE square metre. Quality
 * control belongs to the operation; the source lists no separate consumables. */
export function industrialVacuumDedustingKrer13R1(areaParameterId:string){
 const s=pack.dustSource,prefix='dust:industrial-vacuum:krer13-06-004-01';
 return buildAutomaticConstructionOwnerR1({contract:'rik-expo-app.industrial-vacuum-dedusting-krer13-r1',
  semanticOwner:prefix,sourceId:s.sourceId,normId:'norm:kg:krer:'+s.norm+':2015',
  sourceMetadata:{source_title:'КРЕР13-2015 «Защита строительных конструкций и оборудования от коррозии»',
   source_document_version:s.edition,definition_hash:s.sha256,artifact_sha256:s.sha256,exact_locator:s.locatorRu},
  applicabilityRu:pack.scopeRu,ordinary:[{id:areaParameterId,title:'Площадь обеспыливания промышленным пылесосом',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001}],
  profile:[],conditional:[],deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Материалы, вода, фильтры, дополнительный машинист и рыночные цены в норме не заданы'],
  rows:[
   {rowId:prefix+':operation',formulaId:prefix+':formula:operation',section:'Обеспыливание и контроль качества',category:'construction_work',
    title:'Обеспыливание всей площади промышленным пылесосом с контролем качества',unitId:'m2',expression:areaParameterId,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},
   {rowId:prefix+':workers',formulaId:prefix+':formula:workers',section:'Труд при обеспыливании',category:'construction_work',
    title:'Труд рабочих-строителей при обеспыливании, средний разряд 3,0',unitId:'man_hour',expression:areaParameterId+' * 0.1'},
   {rowId:prefix+':vacuum',formulaId:prefix+':formula:vacuum',section:'Машины для обеспыливания',category:'equipment',
    title:s.vacuum.titleRu,unitId:'machine_hour',expression:areaParameterId+' * 0.10',procurement:true},
  ]});
}
