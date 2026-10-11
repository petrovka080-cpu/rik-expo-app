import {buildAutomaticConstructionOwnerR1,type AutomaticInclusionCondition,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export type SourcePinnedRoofNormSourceR1={kind:string;id:string;titleRu:string;printedEdition:string;sha256:string;locators:string;reviewedAt:string};
export type SourcePinnedRoofNormRateR1={role:string;resourceCode:string|null;titleRu:string;unitId:string;category:string;per100m2:string;
 sourceRatePer100m2:string;sourceUnit:string;exactUnitConversionFactor:string;costTreatment:'OWN_COST'|'INFORMATIONAL_SCOPE';detailsRu:string[];machinePriceCoverageRequired?:string};
export type SourcePinnedRoofNormPackR1={contract:string;prefix:string;normId:string;sources:SourcePinnedRoofNormSourceR1[];scopeRu:string;systemRu:string;conditionsRu:string;measurementRu:string;remainingScopeRu:string[];
 groupTitleRu:string;operationTitleRu:string;completionCriterionRu:string;systemParameterId:string;conditionsParameterId:string;areaParameterId:string;
 systemYesRu:string;conditionsYesRu:string;areaYesRu:string;unknownChoiceRu:string;legacyChoiceRu:string;rates:SourcePinnedRoofNormRateR1[]};

/** Builds only source quantities. Project selection, actual area and source
 * applicability stay explicit; procurement and prices do not supply norms. */
export function sourcePinnedRoofNormGuardsR1(pack:SourcePinnedRoofNormPackR1){
 const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
 const selected=eq(pack.systemParameterId,pack.systemYesRu),legacy=eq(pack.systemParameterId,pack.legacyChoiceRu);
 const admitted:AutomaticInclusionCondition={kind:'and',operands:[selected,eq(pack.conditionsParameterId,pack.conditionsYesRu),eq(pack.areaParameterId,pack.areaYesRu)]};
 return{selected,legacy,admitted};
}

export function sourcePinnedRoofNormOwnerR1(pack:SourcePinnedRoofNormPackR1):AutomaticOwnerDefinition{
 const source=pack.sources.find(s=>s.kind==='roof');if(!source)throw Error('ROOF_PRIMARY_SOURCE_REQUIRED');
 if(pack.rates.length===0||new Set(pack.rates.map(r=>r.role)).size!==pack.rates.length)throw Error('ROOF_RATE_ROLE_IDENTITY_INVALID');
 const guards=sourcePinnedRoofNormGuardsR1(pack);
 const rows:AutomaticRowSpec[]=pack.rates.map(rate=>({rowId:pack.prefix+':'+rate.role,formulaId:pack.prefix+':formula:'+rate.role,
  title:rate.titleRu,unitId:rate.unitId,category:rate.category,section:pack.groupTitleRu,expression:'q/100*'+rate.per100m2,
  inclusion:guards.admitted,procurement:false,costTreatment:rate.costTreatment}));
 const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:source.id,normId:pack.contract+':roof',
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locators},applicabilityRu:pack.scopeRu,
  ordinary:[{id:'q',title:'Площадь покрытия скатов по обмеру, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0},
   {id:pack.systemParameterId,title:'Какое покрытие и основание предусмотрены',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.systemYesRu,pack.unknownChoiceRu,pack.legacyChoiceRu]}],profile:[],
  conditional:[{id:pack.conditionsParameterId,title:'Подходит ли участок под условия расчёта',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsYesRu,'Условия ещё не проверены','Нужен другой расчёт'],requiredWhen:guards.selected},
   {id:pack.areaParameterId,title:'Как проверена площадь покрытия',valueType:'enum',unitId:null,kind:'conditional',values:[pack.areaYesRu,'Площадь ещё нужно проверить'],requiredWhen:guards.selected}],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remainingScopeRu});
 const guides:Record<string,string>={q:'Введите измеренную площадь покрытия скатов по правилам обмера. Прежний шаблон100м² не является данными объекта.',
  [pack.systemParameterId]:pack.systemRu,[pack.conditionsParameterId]:pack.conditionsRu,[pack.areaParameterId]:pack.measurementRu};
 const parameters=original.parameters.map(p=>({...p,default_value:null,truth_metadata:{...p.truth_metadata,visibility_role:'USER_INPUT',value_source_role:p.parameter_id==='q'?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
  provenance:{consumer_input_role_v1:'OBJECT_FACT',historicalTemplateValueNotMeasurement:true},
  guide:{...p.truth_metadata.guide as object,guide_kind:p.parameter_id==='q'?'MEASUREMENT_RULE':'PROJECT_DEFINED',source_role:p.parameter_id==='q'?'USER_MEASURED':'PROJECT_DOCUMENTATION',guide_short_ru:guides[p.parameter_id],
   source_id:source.id,source_title:source.titleRu,source_document:source.id,source_document_version:source.printedEdition,source_snapshot_hash:source.sha256,source_sha256:source.sha256,source_artifact_sha256:source.sha256,
   definition_hash:source.sha256,artifact_sha256:source.sha256,source_locator:source.locators,exact_locator:source.locators,verified_at:source.reviewedAt}}}));
 const resources=original.resources.map(row=>{const rate=pack.rates.find(r=>row.row_id===pack.prefix+':'+r.role)!;const{row_sha256:_sha,...body}=row;
  const result={...body,source_metadata:{...row.source_metadata,sourceRole:'PINNED_CONDITIONAL_KRER_ROOF_NORM',sourceNormQuantityAccepted:rate.costTreatment==='OWN_COST',
   normativeRatePer100M2:rate.per100m2,normativeResourceCode:rate.resourceCode,sourceNormRatePer100M2:rate.sourceRatePer100m2,sourceNormUnit:rate.sourceUnit,exactUnitConversionFactor:rate.exactUnitConversionFactor,
   sourceHistoricalPrintedPriceNotAdmitted:true,physicalNormNotActualRentalOrPurchase:true,full_technical_acceptance:false,machinePriceCoverageRequired:rate.machinePriceCoverageRequired??null,
   normativeTrace:pack.sources.map(s=>({sourceId:s.id,normId:pack.contract+':'+s.kind,sourceDocument:s.titleRu,sourceLocator:s.locators,sourceSnapshotHash:s.sha256}))},
   resource_graph:{...row.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,parameterIds:['q'],
    reasonRu:'Количество рассчитано по подтверждённой норме и измеренной площади покрытия. Изменяйте площадь в исходных данных; коэффициент нормы приложение получает из источника.'},
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,operationId:pack.prefix+':installation',operationTitleRu:pack.operationTitleRu,processOrdinal:20,completionCriterionRu:pack.completionCriterionRu},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:row.title_ru,detailsRu:[pack.scopeRu,...rate.detailsRu,
     'Склад, упаковка и цена не изменяют известную физическую норму. Заказ и фактическая аренда проверяются отдельно; неизвестные данные не подменяются нулём.']}}};
  return{...result,row_sha256:estimateDeterministicHash(result)};});
 return{...original,parameters,resources};
}
