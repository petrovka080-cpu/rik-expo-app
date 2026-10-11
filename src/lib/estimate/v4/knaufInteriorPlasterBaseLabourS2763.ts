import pack from '../../../../data/estimate-benchmarks/source-packs/knauf-interior-plaster-base-labour-six-s27-63.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticInclusionCondition,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {knaufInteriorPlasterChoiceIdS2763,knaufInteriorPlasterPackS2763 as material} from './knaufInteriorPlasterMaterialsS2763';

export const knaufInteriorPlasterBaseLabourPackS2763=pack;
export const knaufPlasterLabourPrefixS2763='plaster:krer15-manual-base';
export const knaufPlasterNormBasisYesS2763='КРЕР Кыргызской Республики применимы к этой смете';
export const knaufPlasterNormConditionsYesS2763='Условия ниже проверены и подходят';
export const knaufPlasterNormAreaYesS2763='Указанная площадь соответствует правилам ниже';
const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
export const knaufPlasterManualMaterialGuardS2763=eq(knaufInteriorPlasterChoiceIdS2763,material.manualChoiceRu);
export const knaufPlasterBaseAdmittedGuardS2763:AutomaticInclusionCondition={kind:'and',operands:[knaufPlasterManualMaterialGuardS2763,
  eq('krer15_manual_norm_basis',knaufPlasterNormBasisYesS2763),eq('krer15_manual_conditions',knaufPlasterNormConditionsYesS2763),eq('krer15_manual_area_scope',knaufPlasterNormAreaYesS2763)]};

/** The project supplies applicability and an actual measure; all rates and
 * included operations belong to the pinned source. Materials remain separate. */
export function knaufInteriorPlasterBaseLabourDefinitionS2763(surface:'WALL'|'CEILING'):AutomaticOwnerDefinition {
  const prefix=knaufPlasterLabourPrefixS2763,ceiling=surface==='CEILING',source=pack.sources[ceiling?1:0],guidance=pack.sources[2],rate=pack.rates.find(x=>x.surface===surface)!;
  const areaRule=ceiling?pack.measurementRules.ceiling.ruleRu:pack.measurementRules.wall.ruleRu;
  const specs=[
    ['workers','Базовое ручное оштукатуривание: приготовление, обеспыливание, нанесение с затиркой и плоские углы','man_hour','labor',rate.per100M2.workersPersonHours,'OWN_COST'],
    ['loader','Автопогрузчик 5 т — нормативная эксплуатация с машинистом','machine_hour','equipment',rate.per100M2.loader5tMachineHours,'OWN_COST'],
    ['lift','Одностоечный грузовой подъёмник до 500 кг, высота подъёма 45 м — эксплуатация с машинистом','machine_hour','equipment',rate.per100M2.singleMastLiftMachineHours,'OWN_COST'],
    ['mixer','Передвижной растворосмеситель 65 л — нормативная эксплуатация с обслуживанием','machine_hour','equipment',rate.per100M2.mortarMixer65lMachineHours,'OWN_COST'],
    ['operators','Машинисты и обслуживающие работники — часы учтены в стоимости эксплуатации машин','man_hour','labor',rate.per100M2.machineOperatorsPersonHours,'INFORMATIONAL_SCOPE'],
  ] as const;
  const rows:AutomaticRowSpec[]=specs.map(([id,title,unitId,category,scalar,costTreatment])=>({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,title,unitId,category,
    section:'Базовая ручная штукатурка по подтверждённой норме',expression:'q/100*'+scalar,inclusion:knaufPlasterBaseAdmittedGuardS2763,procurement:false,costTreatment}));
  const def=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:source.id,normId:pack.contract+':'+source.kind,
    sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,artifact_sha256:source.sha256,definition_hash:source.sha256,exact_locator:'КРЕР15 PDF137–138; '+rate.normId},
    applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional:[
      {id:'krer15_manual_norm_basis',title:'Нормативная основа этой сметы',kind:'conditional',valueType:'enum',unitId:null,values:[knaufPlasterNormBasisYesS2763,'Применимость КРЕР пока не подтверждена','Другая нормативная основа'],requiredWhen:knaufPlasterManualMaterialGuardS2763},
      {id:'krer15_manual_conditions',title:'Условия участка для базового труда и механизмов',kind:'conditional',valueType:'enum',unitId:null,values:[knaufPlasterNormConditionsYesS2763,'Условия пока не проверены','Есть отличия от условий ниже'],requiredWhen:knaufPlasterManualMaterialGuardS2763},
      {id:'krer15_manual_area_scope',title:'Проверка указанной площади участка',kind:'conditional',valueType:'enum',unitId:null,values:[knaufPlasterNormAreaYesS2763,'Площадь ещё не проверена по этим правилам'],requiredWhen:knaufPlasterManualMaterialGuardS2763},
    ],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
  const guides:Record<string,string>={
    krer15_manual_norm_basis:'Укажите нормативную основу, принятую для проекта. Язык приложения и валюта не подтверждают применимость норм Кыргызской Республики. Коэффициенты труда приложение получает из источника.',
    krer15_manual_conditions:pack.conditionsRu+' Подтвердите также применимость обычной технологии сухой смеси: без принципиального изменения способа, специальной производительности или качества внутри базовой операции. При отдельной проектной замене материала импортным по требованию заказчика применимость этого упрощённого профиля нужно проверить дополнительно; его условия пока не подтверждайте. Дополнительное заглаживание и качество Q3/Q4 остаются отдельным остатком. Если есть отличия, известные материалы сохраняются, а этот базовый нормативный труд не рассчитывается.',
    krer15_manual_area_scope:areaRule+' '+pack.measurementRules.reveals.ruleRu+' Используется уже введённая площадь этого участка; второй обмер и копирование площади грунтования не нужны. Шаблон100 не подтверждает фактический обмер.',
  };
  const sourceRefs=[{sourceId:source.id,titleRu:source.titleRu,sha256:source.sha256,locator:'КРЕР15 PDF8,13–14,137–138'},
    {sourceId:guidance.id,titleRu:guidance.titleRu,sha256:guidance.sha256,locator:'Общие указания PDF2–3,6–9,15; п1.3–1.4,1.7,2.8–2.9,3.1–3.5,4.1–4.2; приложение3'}];
  const parameters=def.parameters.map(p=>{const primary=p.parameter_id==='krer15_manual_area_scope'?source:guidance;
    const locator=p.parameter_id==='krer15_manual_area_scope'?'КРЕР15 PDF13–14, п2.5,2.10–2.14':'Общие указания PDF2–3,6–9,15; п1.3–1.4,1.7,2.8–2.9,3.1–3.5,4.1–4.2; приложение3';
    return({...p,default_value:null,truth_metadata:{...p.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
    visible_when:knaufPlasterManualMaterialGuardS2763,provenance:{...p.truth_metadata.provenance as object,consumer_input_role_v1:'OBJECT_FACT',supporting_source_refs:sourceRefs},
    guide:{...p.truth_metadata.guide as object,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',guide_short_ru:guides[p.parameter_id],source_id:primary.id,source_title:primary.titleRu,source_document:primary.id,
      source_document_version:primary.printedEdition,source_snapshot_hash:primary.sha256,source_sha256:primary.sha256,source_artifact_sha256:primary.sha256,definition_hash:primary.sha256,artifact_sha256:primary.sha256,
      source_locator:locator,exact_locator:locator,verified_at:primary.reviewedAt}}});});
  const resources=def.resources.map(r=>{const {row_sha256:_sha,...body}=r;const operator=r.row_id.endsWith(':operators'),machine=r.unit_id==='machine_hour';
    const result={...body,source_metadata:{...r.source_metadata,sourceRole:'PINNED_CONDITIONAL_KRER_MANUAL_BASE_NORM',sourceNormQuantityAccepted:!operator,physicalLabourHourNormAccepted:!operator&&!machine,full_technical_acceptance:false,
      normativeTrace:[{sourceId:source.id,normId:pack.contract+':'+source.kind,sourceDocument:source.titleRu,sourceLocator:rate.normId+'; PDF137–138',sourceSnapshotHash:source.sha256},
        {sourceId:guidance.id,normId:pack.contract+':guidance',sourceDocument:guidance.titleRu,sourceLocator:'PDF3 п1.7; PDF9 п4.2; условия PDF2,7–8,15',sourceSnapshotHash:guidance.sha256}],
      machinePriceCoverageRequired:machine?'FULL_OPERATED_MACHINE_HOUR_INCLUDING_OPERATORS':null,historic2015PriceNotAdmitted:true},
      resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'plaster:knauf-materials',groupTitleRu:'Гипсовая штукатурка КНАУФ',operationId:prefix+':base',operationTitleRu:'Базовая ручная штукатурка по КРЕР',processOrdinal:20,
        completionCriterionRu:'Выполнена базовая операция; дополнительная отделка, подготовка вне обеспыливания, грунтование и сдача остаются отдельными потребностями.'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,detailsRu:[rate.normId+'; '+pack.scopeRu,areaRule,
          operator?'Не оплачивается второй раз: труд машинистов включён в стоимость эксплуатации указанных машин.':machine?'Принимается только цена полного машиночаса с машинистом и обслуживанием. Нормативные часы не означают фактическую аренду отдельной машины, целую смену или покупку инструмента.':'Норма не включает отдельный труд машинистов; их оплата входит в машины. Дополнительная отделка и грунтование этой строкой не закрыты.']}}};
    return{...result,row_sha256:estimateDeterministicHash(result)};});
  return{...def,parameters,resources};
}
