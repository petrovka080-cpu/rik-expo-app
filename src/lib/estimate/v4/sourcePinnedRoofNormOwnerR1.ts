import {buildAutomaticConstructionOwnerR1,type AutomaticInclusionCondition,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export type SourcePinnedRoofNormSourceR1={kind:string;id:string;titleRu:string;printedEdition:string;sha256:string;locators:string;reviewedAt:string};
export type SourcePinnedRoofNormRateR1={role:string;resourceCode:string|null;titleRu:string;unitId:string;category:string;per100m2?:string;
 sourceRatePer100m2?:string;per100Measure?:string;sourceRatePer100Measure?:string;perMeasure?:string;sourceRatePerMeasure?:string;sourceUnit:string;exactUnitConversionFactor:string;costTreatment:'OWN_COST'|'INFORMATIONAL_SCOPE';detailsRu:string[];machinePriceCoverageRequired?:string};
export type SourcePinnedRoofNormPackR1={contract:string;prefix:string;normId:string;sources:SourcePinnedRoofNormSourceR1[];scopeRu:string;systemRu:string;conditionsRu:string;measurementRu:string;remainingScopeRu:string[];
 groupTitleRu:string;operationTitleRu:string;completionCriterionRu:string;systemParameterId:string;conditionsParameterId:string;areaParameterId:string;
 systemYesRu:string;conditionsYesRu:string;areaYesRu:string;unknownChoiceRu:string;legacyChoiceRu:string;rates:SourcePinnedRoofNormRateR1[];
 measurementTitleRu?:string;measurementGuideRu?:string;systemChoiceTitleRu?:string;measurementChoiceTitleRu?:string;operationProcessOrdinal?:number;
 measurementParameterId?:string;measurementUnitId?:'linear_m'|'m2'|'m3';measurementConditional?:boolean;sourceBasisQuantity?:'1';quantityEditReasonRu?:string;
 notApplicableChoiceRu?:string;completedChoiceRu?:string};

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
 for(const key of ['measurementTitleRu','measurementGuideRu','systemChoiceTitleRu','measurementChoiceTitleRu','quantityEditReasonRu']as const){const value=pack[key];if(value!=null&&(typeof value!=='string'||!value.trim()))throw Error('ROOF_PARAMETER_CAPTION_INVALID:'+key);}
 if(pack.operationProcessOrdinal!=null&&(!Number.isInteger(pack.operationProcessOrdinal)||pack.operationProcessOrdinal<0||pack.operationProcessOrdinal>1000))throw Error('ROOF_OPERATION_ORDINAL_INVALID');
 const guards=sourcePinnedRoofNormGuardsR1(pack);
 const customMeasure=pack.measurementParameterId!=null,measureId=pack.measurementParameterId??'q',measureUnit=pack.measurementUnitId??'m2',lengthMeasure=customMeasure&&measureUnit==='linear_m',volumeMeasure=customMeasure&&measureUnit==='m3';
 if(customMeasure&&(!/^[a-z][a-z0-9_]*$/u.test(measureId)||['q',pack.systemParameterId,pack.conditionsParameterId,pack.areaParameterId].includes(measureId)||!['linear_m','m2','m3'].includes(measureUnit)
   ||!pack.measurementTitleRu?.trim()||!pack.measurementGuideRu?.trim())
  ||!customMeasure&&(pack.measurementUnitId!=null||pack.measurementConditional===true))throw Error('ROOF_MEASUREMENT_IDENTITY_INVALID');
 if(volumeMeasure?pack.sourceBasisQuantity!=='1':pack.sourceBasisQuantity!=null)throw Error('ROOF_SOURCE_MEASUREMENT_BASIS_INVALID');
 const rateValue=(rate:SourcePinnedRoofNormRateR1)=>volumeMeasure?rate.perMeasure:lengthMeasure?rate.per100Measure:rate.per100m2;
 const sourceRateValue=(rate:SourcePinnedRoofNormRateR1)=>volumeMeasure?rate.sourceRatePerMeasure:lengthMeasure?rate.sourceRatePer100Measure:rate.sourceRatePer100m2;
 for(const rate of pack.rates)if(!/^\d+(?:\.\d+)?$/u.test(String(rateValue(rate)))||Number(rateValue(rate))<=0
   ||!/^\d+(?:\.\d+)?$/u.test(String(sourceRateValue(rate)))
   ||volumeMeasure&&(rate.per100m2!=null||rate.sourceRatePer100m2!=null||rate.per100Measure!=null||rate.sourceRatePer100Measure!=null)
   ||!volumeMeasure&&(rate.perMeasure!=null||rate.sourceRatePerMeasure!=null)
   ||lengthMeasure&&(rate.per100m2!=null||rate.sourceRatePer100m2!=null)
   ||!lengthMeasure&&!volumeMeasure&&(rate.per100Measure!=null||rate.sourceRatePer100Measure!=null))throw Error('ROOF_RATE_MEASUREMENT_BASIS_INVALID');
 const measurementSpec={id:measureId,title:pack.measurementTitleRu??'Площадь покрытия скатов по обмеру, м²',valueType:'decimal' as const,unitId:measureUnit,
  kind:pack.measurementConditional?'conditional' as const:'ordinary' as const,min:0,...(pack.measurementConditional?{requiredWhen:guards.selected}:{})};
 const rows:AutomaticRowSpec[]=pack.rates.map(rate=>({rowId:pack.prefix+':'+rate.role,formulaId:pack.prefix+':formula:'+rate.role,
  title:rate.titleRu,unitId:rate.unitId,category:rate.category,section:pack.groupTitleRu,expression:measureId+'/'+(volumeMeasure?'1':'100')+'*'+rateValue(rate),
  inclusion:guards.admitted,procurement:false,costTreatment:rate.costTreatment}));
 const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:source.id,normId:pack.contract+':roof',
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locators},applicabilityRu:pack.scopeRu,
  ordinary:[...(pack.measurementConditional?[]:[measurementSpec]),
   {id:pack.systemParameterId,title:pack.systemChoiceTitleRu??'Какое покрытие и основание предусмотрены',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.systemYesRu,pack.unknownChoiceRu,pack.legacyChoiceRu,...(pack.notApplicableChoiceRu?[pack.notApplicableChoiceRu]:[]),...(pack.completedChoiceRu?[pack.completedChoiceRu]:[])]}],profile:[],
  conditional:[{id:pack.conditionsParameterId,title:'Подходит ли участок под условия расчёта',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsYesRu,'Условия ещё не проверены','Нужен другой расчёт'],requiredWhen:guards.selected},
   {id:pack.areaParameterId,title:pack.measurementChoiceTitleRu??'Как проверена площадь покрытия',valueType:'enum',unitId:null,kind:'conditional',values:[pack.areaYesRu,'Площадь ещё нужно проверить'],requiredWhen:guards.selected},...(pack.measurementConditional?[measurementSpec]:[])],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remainingScopeRu});
 const guides:Record<string,string>={[measureId]:pack.measurementGuideRu??'Введите измеренную площадь покрытия скатов по правилам обмера. Прежний шаблон100м² не является данными объекта.',
  [pack.systemParameterId]:pack.systemRu,[pack.conditionsParameterId]:pack.conditionsRu,[pack.areaParameterId]:pack.measurementRu};
 const parameters=original.parameters.map(p=>({...p,default_value:null,truth_metadata:{...p.truth_metadata,visibility_role:'USER_INPUT',value_source_role:p.parameter_id===measureId?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
  provenance:{consumer_input_role_v1:'OBJECT_FACT',historicalTemplateValueNotMeasurement:true},
  guide:{...p.truth_metadata.guide as object,guide_kind:p.parameter_id===measureId?'MEASUREMENT_RULE':'PROJECT_DEFINED',source_role:p.parameter_id===measureId?'USER_MEASURED':'PROJECT_DOCUMENTATION',guide_short_ru:guides[p.parameter_id],
   source_id:source.id,source_title:source.titleRu,source_document:source.id,source_document_version:source.printedEdition,source_snapshot_hash:source.sha256,source_sha256:source.sha256,source_artifact_sha256:source.sha256,
   definition_hash:source.sha256,artifact_sha256:source.sha256,source_locator:source.locators,exact_locator:source.locators,verified_at:source.reviewedAt}}}));
 const resources=original.resources.map(row=>{const rate=pack.rates.find(r=>row.row_id===pack.prefix+':'+r.role)!;const{row_sha256:_sha,...body}=row;
  const result={...body,source_metadata:{...row.source_metadata,sourceRole:'PINNED_CONDITIONAL_KRER_ROOF_NORM',sourceNormQuantityAccepted:rate.costTreatment==='OWN_COST',
   ...(volumeMeasure?{normativeRatePerMeasure:rate.perMeasure,normativeResourceCode:rate.resourceCode,sourceNormRatePerMeasure:rate.sourceRatePerMeasure,sourceBasisQuantity:pack.sourceBasisQuantity,normativeMeasureParameterId:measureId,normativeMeasureUnitId:measureUnit}
    :lengthMeasure?{normativeRatePer100Measure:rate.per100Measure,normativeResourceCode:rate.resourceCode,sourceNormRatePer100Measure:rate.sourceRatePer100Measure,normativeMeasureParameterId:measureId,normativeMeasureUnitId:measureUnit}
    :{normativeRatePer100M2:rate.per100m2,normativeResourceCode:rate.resourceCode,sourceNormRatePer100M2:rate.sourceRatePer100m2,
      ...(customMeasure?{normativeMeasureParameterId:measureId,normativeMeasureUnitId:measureUnit}:{})}),sourceNormUnit:rate.sourceUnit,exactUnitConversionFactor:rate.exactUnitConversionFactor,
   sourceHistoricalPrintedPriceNotAdmitted:true,physicalNormNotActualRentalOrPurchase:true,full_technical_acceptance:false,machinePriceCoverageRequired:rate.machinePriceCoverageRequired??null,
   normativeTrace:pack.sources.map(s=>({sourceId:s.id,normId:pack.contract+':'+s.kind,sourceDocument:s.titleRu,sourceLocator:s.locators,sourceSnapshotHash:s.sha256}))},
   resource_graph:{...row.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,parameterIds:[measureId],
    reasonRu:pack.quantityEditReasonRu??(volumeMeasure?'Количество рассчитано по подтверждённой норме на 1 м³ и проектному объёму устроенного слоя. Изменяйте объём в исходных данных; коэффициенты нормы получает приложение.':lengthMeasure?'Количество рассчитано по подтверждённой норме и измеренной длине ендов. Изменяйте длину в исходных данных; коэффициент нормы приложение получает из источника.':customMeasure?'Количество рассчитано по подтверждённой норме и измеренной площади именно стяжки. Изменяйте эту площадь в исходных данных; коэффициент нормы приложение получает из источника.':'Количество рассчитано по подтверждённой норме и измеренной площади покрытия. Изменяйте площадь в исходных данных; коэффициент нормы приложение получает из источника.')},
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,operationId:pack.prefix+':installation',operationTitleRu:pack.operationTitleRu,processOrdinal:pack.operationProcessOrdinal??20,completionCriterionRu:pack.completionCriterionRu},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:row.title_ru,detailsRu:[pack.scopeRu,...rate.detailsRu,
     'Склад, упаковка и цена не изменяют известную физическую норму. Заказ и фактическая аренда проверяются отдельно; неизвестные данные не подменяются нулём.']}}};
  return{...result,row_sha256:estimateDeterministicHash(result)};});
 return{...original,parameters,resources};
}
