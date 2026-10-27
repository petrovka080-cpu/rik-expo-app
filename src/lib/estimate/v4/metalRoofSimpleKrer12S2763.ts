import pack from '../../../../data/estimate-benchmarks/source-packs/metal-roof-simple-krer12-six-s27-63.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticInclusionCondition,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const metalRoofSimpleKrer12PackS2763=pack;
export const metalRoofSimplePrefixS2763='roof:metal-tile:krer12-023-01';
export const metalRoofSimpleSystemYesS2763='Металлочерепица с покрытием по готовым прогонам и указанному крепежу';
export const metalRoofSimpleConditionsYesS2763='Простая кровля; условия описания подтверждены';
export const metalRoofSimpleAreaYesS2763='Площадь измерена по этим правилам';
export const metalRoofSimpleLegacyChoiceS2763='Прежний общий состав — количественные нормы требуют проверки';
export const metalRoofSimpleUnknownChoiceS2763='Система или состав кровли ещё не проверены';
const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
export const metalRoofSimpleSelectedGuardS2763=eq('metal_roof_system',metalRoofSimpleSystemYesS2763);
export const metalRoofSimpleLegacyGuardS2763=eq('metal_roof_system',metalRoofSimpleLegacyChoiceS2763);
export const metalRoofSimpleAdmittedGuardS2763:AutomaticInclusionCondition={kind:'and',operands:[metalRoofSimpleSelectedGuardS2763,
 eq('metal_roof_conditions',metalRoofSimpleConditionsYesS2763),eq('metal_roof_area_scope',metalRoofSimpleAreaYesS2763)]};

/** A factual selected scope supplies the measure and applicability. The
 * application owns the pinned rates; stock and package facts cannot change them. */
export function metalRoofSimpleKrer12DefinitionS2763():AutomaticOwnerDefinition {
 const prefix=metalRoofSimplePrefixS2763,source=pack.sources.find(s=>s.kind==='roof')!,guidance=pack.sources.find(s=>s.kind==='guidance')!;
 const rows:AutomaticRowSpec[]=pack.rates.map(rate=>({rowId:prefix+':'+rate.role,formulaId:prefix+':formula:'+rate.role,
  title:rate.titleRu,unitId:rate.unit==='person_hour'?'man_hour':rate.unit,category:rate.costTreatment==='PAID_MATERIAL'?'material':rate.costTreatment==='PAID_MACHINE'?'equipment':'labor',
  section:'Устройство простой кровли из металлочерепицы по КРЕР',expression:'q/100*'+rate.per100m2,
  inclusion:metalRoofSimpleAdmittedGuardS2763,procurement:false,costTreatment:rate.role==='included_machine_operators'?'INFORMATIONAL_SCOPE':'OWN_COST'}));
 const definition=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:source.id,normId:pack.contract+':roof',
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locators},
  applicabilityRu:pack.scopeRu,ordinary:[{id:'q',title:'Площадь покрываемой кровли по обмеру, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0},
   {id:'metal_roof_system',title:'Какое покрытие и основание предусмотрены',valueType:'enum',unitId:null,kind:'ordinary',values:[metalRoofSimpleSystemYesS2763,metalRoofSimpleUnknownChoiceS2763,metalRoofSimpleLegacyChoiceS2763]}],profile:[],
  conditional:[
   {id:'metal_roof_conditions',title:'Этот участок подходит под условия расчёта',valueType:'enum',unitId:null,kind:'conditional',values:[metalRoofSimpleConditionsYesS2763,'Условия ещё не проверены','Нужен другой расчёт'],requiredWhen:metalRoofSimpleSelectedGuardS2763},
   {id:'metal_roof_area_scope',title:'Как проверена указанная площадь кровли',valueType:'enum',unitId:null,kind:'conditional',values:[metalRoofSimpleAreaYesS2763,'Площадь ещё нужно проверить'],requiredWhen:metalRoofSimpleSelectedGuardS2763},
  ],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remainingScopeRu});
 const guides:Record<string,string>={q:'Введите фактическую площадь покрытия. Шаблон 100 м² и историческое неподтверждённое значение не являются обмером.',
  metal_roof_system:pack.systemRu,
  metal_roof_conditions:pack.conditionsRu+' Коэффициенты ресурсов приложение берёт из источника. Если условия отличаются, этот ограниченный нормативный расчёт не применяется.',
  metal_roof_area_scope:pack.measurementRules.map(r=>'§'+r.clause+': '+r.ru).join(' ')+' Подтверждайте реальную введённую площадь, а не прежний шаблон100. Другая сложность кровли не выбирается автоматически по площади.'};
 const parameters=definition.parameters.map(p=>({...p,default_value:null,truth_metadata:{...p.truth_metadata,
  visibility_role:'USER_INPUT',value_source_role:p.parameter_id==='q'?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
  provenance:{...p.truth_metadata.provenance as object,consumer_input_role_v1:'OBJECT_FACT'},
  guide:{...p.truth_metadata.guide as object,guide_kind:p.parameter_id==='q'?'MEASUREMENT_RULE':'PROJECT_DEFINED',source_role:p.parameter_id==='q'?'USER_MEASURED':'PROJECT_DOCUMENTATION',guide_short_ru:guides[p.parameter_id],
   source_id:source.id,source_title:source.titleRu,source_document:source.id,source_document_version:source.printedEdition,source_snapshot_hash:source.sha256,source_sha256:source.sha256,source_artifact_sha256:source.sha256,
   definition_hash:source.sha256,artifact_sha256:source.sha256,source_locator:source.locators,exact_locator:source.locators,verified_at:source.reviewedAt}}}));
 const resources=definition.resources.map(row=>{const rate=pack.rates.find(r=>row.row_id.endsWith(':'+r.role))!,operator=rate.role==='included_machine_operators',machine=rate.costTreatment==='PAID_MACHINE';
  const {row_sha256:_sha,...body}=row;const result={...body,source_metadata:{...row.source_metadata,sourceRole:'PINNED_CONDITIONAL_KRER_ROOF_NORM',sourceNormQuantityAccepted:!operator,
   normativeRatePer100M2:rate.per100m2,normativeResourceCode:rate.resourceCode,sourcePrice2015NotAdmitted:true,physicalNormNotActualRentalOrPurchase:true,full_technical_acceptance:false,
   machinePriceCoverageRequired:machine?(rate.role==='electric_drill'?'EQUIPMENT_OPERATION_BUILDER_ALREADY_IN_LABOUR':'FULL_OPERATED_MACHINE_HOUR'):null,
   normativeTrace:[{sourceId:source.id,normId:pack.contract+':roof',sourceDocument:source.titleRu,sourceLocator:'12-01-023-01; PDF33; техническая часть PDF4–6',sourceSnapshotHash:source.sha256},
    {sourceId:guidance.id,normId:pack.contract+':guidance',sourceDocument:guidance.titleRu,sourceLocator:guidance.locators,sourceSnapshotHash:guidance.sha256}]},
   resource_graph:{...row.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,parameterIds:['q'],
    reasonRu:'Количество ресурса рассчитывается по подтверждённой норме КРЕР и измеренной площади кровли. Изменяйте площадь в исходных данных.'},operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Металлочерепица по готовым прогонам',operationId:prefix+':installation',operationTitleRu:'Укладка, крепление и нормативная обделка кровли',processOrdinal:20,
    completionCriterionRu:'Выполнена нормативная укладка, постановка креплений и обделка. Раскрой, проектные доборы и остальные непокрытые потребности проверяются отдельно.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:row.title_ru,detailsRu:[pack.scopeRu,
     operator?'0,79 чел.-ч машинистов относятся к двум кранам и входят в полную стоимость их эксплуатации. Второй цены нет. Водитель автомобиля входит в цену автомобиля и не добавляется к этой строке.':rate.role==='electric_drill'?'Нормативное время эксплуатации электрической дрели. Рабочие, выполняющие монтаж, оплачиваются общим владельцем строительного труда; второй оплаты их работы в цене инструмента нет. Это не покупка отдельной дрели на каждую смету.':machine?'Это нормативные машиночасы, а не фактический договор аренды, число машин или округлённая смена. Цена должна покрывать полную эксплуатацию.':rate.costTreatment==='PAID_MATERIAL'?'Нормативный расход не заменяет проект крепления, выбор изделия и упаковки. Дробные нормы не округляются до покупаемых пачек, листов или полос.':'Один владелец труда включает укладку листов, постановку креплений и обделку коньков, труб, шахт и примыканий к стенам. Раскрой не включён.',
     rate.role==='coated_metal_tile'?pack.quoteAndProcurementBoundary.tile122BoundaryRu:rate.role==='open_cell_pu_gasket'?pack.quoteAndProcurementBoundary.gasket16BoundaryRu:rate.role.startsWith('screw_')?pack.quoteAndProcurementBoundary.screwBoundaryRu:'Склад, кратность упаковки и цена не блокируют известную физическую норму.']}}};
  return{...result,row_sha256:estimateDeterministicHash(result)};});
 return{...definition,parameters,resources};
}

export function metalRoofProtectedResidualTruthS2763(existing:Record<string,unknown>,reasonRu:string){
 return unresolvedApplicationNormTruthR1(existing,reasonRu);
}
