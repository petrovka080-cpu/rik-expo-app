import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {trayConfigS2758} from './prepareS2758TrayKerbSupplyWave';
import {incandescentVlPackS2758 as pack,incandescentVlPrefixS2758 as prefix,incandescentVlDefinitionS2758,incandescentVlCompletenessMapS2758} from '../../../src/lib/estimate/v4/incandescentVlLuminaireS2758';
import {incandescentVlControlS2758,verifyIncandescentVlS2758} from './preflightS2758IncandescentVl';

export function incandescentVlConfigS2758(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const base=trayConfigS2758(parent),d=incandescentVlDefinitionS2758();
  const included=[pack.scopeRu,'Пять операций КРЕР оплачиваются единым трудом1,29ч на светильник без выделения придуманных часов',
    'Бортовой автомобиль до5т0,06маш.-ч на светильник; водитель включён, собственная эксплуатация и аренда взаимоисключающие',
    'Бензин-растворитель0,00006т на светильник; точный перевод массы заказа в кг×1000. СмазкаЗЭС0,01кг на светильник',
    'Болты с гайками/шайбами, кронштейны, стальные хомуты, светильники и провод: только документированные итоги проекта в т/кг/кг/шт/т; П не превращается в числовую норму',
    'Раздельная подтверждённая поставка проектных позиций; один заказ на материал по пригодному наличию, резерву и кратности поставщика; лампа не заказывается повторно'];
  const groupId='existing_vl_incandescent_luminaires_330401401_s2758',groupNameRu='Светильники накаливания на готовых опорах ВЛ';
  return {...base,contract:pack.contract,stopCode:'S2758_INCANDESCENT_VL_330401401',applicationName:'s2758-incandescent-existing-vl-support',outputRoot:resolve('.release-runtime/r568/s27-58/lighting-wave/publication'),
    sourcePaths:[...new Set([...base.sourcePaths,'scripts/estimate/r4a13/prepareS2758IncandescentVl.ts','scripts/estimate/r4a13/preflightS2758IncandescentVl.ts','src/lib/estimate/v4/incandescentVlLuminaireS2758.ts','src/lib/estimate/v4/incandescentVlLuminaireS2758.test.tsx',
      'data/estimate-benchmarks/source-packs/incandescent-vl-luminaire-krer33-04-014-01-s27-58.json',pack.source.path,pack.guidance.path,
      '.release-runtime/r568/s27-58/review/outdoor-lighting/source-plan.json','.release-runtime/r568/s27-58/review/outdoor-lighting/primary-cell-clarification.json','.release-runtime/r568/s27-58/review/outdoor-lighting/project-bom-contract-admission.json'])],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,expectedParentShape:[0,0,0],
    sourceMetadata:{source_title:'КРЕР33-2015, таблица33-04-014, колонка01',source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_FIXED_RATES_AND_DOCUMENTED_PROJECT_TOTALS_COMPLETION_UNRESOLVED',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
      exact_locator:pack.source.locatorRu+'; '+pack.guidance.locatorRu,use_restriction:pack.scopeRu},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{luminaire_count:11},acceptanceInput:incandescentVlControlS2758(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    validationScenario:'S2758_EXACT_KRER33_04_014_01_FIXED_FOUR_CELLS_FIVE_PROJECT_TOTALS_NO_NUMERIC_P_SIX_OPEN_NEEDS',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Светильник с лампой накаливания собран, закреплён на пригодной готовой опоре ВЛ и присоединён к линии освещения. Шесть дополнительных технологических потребностей пока не нормированы.',includedScopeRu:included,excludedScopeRu:pack.excludedRu,independentCompletenessMap:incandescentVlCompletenessMapS2758(),unresolvedApplicableResourceRowIds:pack.gaps.map(g=>prefix+':'+g.id)},
    applicability:{country:'KG',primaryMeasureParameterId:'luminaire_count',exactRateColumn:pack.normId,incandescentOnly:true,readyVlSupportOnly:true,projectBomTotalsNotPerUnitNorms:true,separateProjectMaterialSupplyOnly:true,driverIncludedInMachinePrice:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':whole-labor',applicability:{exactRateColumn:pack.normId,incandescentOnly:true,readyVlSupportOnly:true,fullTechnicalAcceptance:false}},
    locator:{key:'s2758-incandescent-existing-vl-support',payload:{sourcePack:pack,controlOnly:incandescentVlControlS2758(),fullTechnicalAcceptance:false}},
    search:{primaryUom:'pcs',canonicalNameRu:pack.titleRu,aliases:['Монтаж светильника накаливания на готовой опоре ВЛ','Установка светильника с лампой накаливания на существующей готовой опоре'],shortScopeRu:'Точная колонкаКРЕР33-04-014-01: светильник накаливания на готовой опоре ВЛ. Проектные массы и состав вводятся по документу; дополнительное оснащение и завершение открыты.',
      keyDistinguishingParameters:['construction_scope_conditions','ready_support_connection_reference','access_method_reference'],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'наружное освещение светильник накаливания готовая опора воздушная линия ВЛ кронштейн хомут провод',sourceProvenance:{sourcePack:'incandescent-vl-luminaire-krer33-04-014-01-s27-58.json',primaryMeasureParameterId:'luminaire_count',exactRateColumn:pack.normId,fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'electrical',sourceIdentity:pack.sourceId,workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'electrical',systemId:'electrical',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,breadcrumb:[groupNameRu],groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},membershipOrdinal:0,
      independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,sourceCompositionPartial:true},elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'INCANDESCENT_EXISTING_VL_SUPPORT',constructionState:'READY_SUPPORT',normativeClassifiers:[],applicabilityTags:['INCANDESCENT','READY_VL_SUPPORT','KRER33_04_014_01'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/33-04-014-02|люминесцент|ртутн|светодиод/iu],owner:'S2758_INCANDESCENT_VL_SINGLE_WRITER',receiptFileStem:'incandescent_vl_luminaire',verifyCore:verifyIncandescentVlS2758};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2758IncandescentVl.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(incandescentVlConfigS2758({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
