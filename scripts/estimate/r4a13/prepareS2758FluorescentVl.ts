import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {trayConfigS2758} from './prepareS2758TrayKerbSupplyWave';
import {fluorescentVlPackS2758 as pack,fluorescentVlPrefixS2758 as prefix,fluorescentVlDefinitionS2758,fluorescentVlCompletenessMapS2758} from '../../../src/lib/estimate/v4/fluorescentVlLuminaireS2758';
import {fluorescentVlControlS2758,verifyFluorescentVlS2758} from './preflightS2758FluorescentVl';

export function fluorescentVlConfigS2758(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const base=trayConfigS2758(parent),d=fluorescentVlDefinitionS2758();
  const included=[pack.scopeRu,'Пять операций КРЕР оплачиваются единым трудом 2,29 чел.-ч на светильник; средний разряд 3,3',
    'Автогидроподъёмник высотой подъёма 12 м: 0,8 маш.-ч; автомобиль бортовой до 5 т: 0,11 маш.-ч на светильник. Собственная эксплуатация и аренда выбираются отдельно для каждой машины',
    'Совокупные 0,8 чел.-ч машинистов на светильник включены в цены машин, без отдельной оплаты, заказа или распределения на единственного владельца',
    'Бензин-растворитель 0,00006 т на светильник, заказ в кг строго ×1000; смазка ЗЭС 0,01 кг на светильник',
    'Болты с гайками/шайбами, кронштейны, стальные хомуты, люминесцентные светильники и провод: документированные итоги проекта в т/кг/кг/шт/т; П не превращается в числовую норму',
    'Раздельная подтверждённая поставка пяти проектных позиций; один заказ по пригодному наличию, резерву и кратности. Лампы и пускорегулирующая аппаратура входят в выбранный светильник без повторного заказа'];
  const groupId='existing_vl_fluorescent_luminaires_330401402_s2758',groupNameRu='Люминесцентные светильники на готовых опорах ВЛ';
  return {...base,contract:pack.contract,stopCode:'S2758_FLUORESCENT_VL_330401402',applicationName:'s2758-fluorescent-existing-vl-support',outputRoot:resolve('.release-runtime/r568/s27-58/fluorescent-wave/publication'),
    sourcePaths:[...new Set([...base.sourcePaths,'scripts/estimate/r4a13/prepareS2758FluorescentVl.ts','scripts/estimate/r4a13/preflightS2758FluorescentVl.ts','src/lib/estimate/v4/fluorescentVlLuminaireS2758.ts','src/lib/estimate/v4/fluorescentVlLuminaireS2758.test.tsx','src/lib/estimate/v4/vlLuminaireOwnerR1.ts','src/lib/estimate/v4/incandescentVlLuminaireS2758.ts',
      'data/estimate-benchmarks/source-packs/fluorescent-vl-luminaire-krer33-04-014-02-s27-58.json',pack.source.path,pack.guidance.path,
      '.release-runtime/r568/s27-58/lighting-wave/review/next-ready-source-plan.json','.release-runtime/r568/s27-58/review/outdoor-lighting/project-bom-contract-admission.json'])],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,expectedParentShape:[0,0,0],
    sourceMetadata:{source_title:'КРЕР33-2015, таблица33-04-014, колонка02',source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_FIXED_RATES_AND_DOCUMENTED_PROJECT_TOTALS_COMPLETION_UNRESOLVED',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
      exact_locator:pack.source.locatorRu+'; '+pack.guidance.locatorRu,use_restriction:pack.scopeRu},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{luminaire_count:11},acceptanceInput:fluorescentVlControlS2758(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    validationScenario:'S2758_EXACT_KRER33_04_014_02_SIX_SOURCE_CELLS_FIVE_PROJECT_TOTALS_TWO_MACHINES_OPERATORS_INFO_SIX_OPEN_NEEDS',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Светильник с люминесцентными лампами собран, закреплён на пригодной готовой опоре ВЛ и присоединён к линии освещения. Шесть дополнительных технологических потребностей пока не нормированы.',includedScopeRu:included,excludedScopeRu:pack.excludedRu,independentCompletenessMap:fluorescentVlCompletenessMapS2758(),unresolvedApplicableResourceRowIds:pack.gaps.map(g=>prefix+':'+g.id)},
    applicability:{country:'KG',primaryMeasureParameterId:'luminaire_count',exactRateColumn:pack.normId,fluorescentOnly:true,readyVlSupportOnly:true,projectBomTotalsNotPerUnitNorms:true,separateProjectMaterialSupplyOnly:true,machineOperatorsIncludedInMachinePrices:true,actualLiftAccessCompatibilityRequired:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':whole-labor',applicability:{exactRateColumn:pack.normId,fluorescentOnly:true,readyVlSupportOnly:true,actualLiftAccessCompatibilityRequired:true,fullTechnicalAcceptance:false}},
    locator:{key:'s2758-fluorescent-existing-vl-support',payload:{sourcePack:pack,controlOnly:fluorescentVlControlS2758(),fullTechnicalAcceptance:false}},
    search:{primaryUom:'pcs',canonicalNameRu:pack.titleRu,aliases:['Монтаж люминесцентного светильника на готовой опоре ВЛ','Установка светильника с люминесцентными лампами на существующей готовой опоре'],shortScopeRu:'Точная колонка КРЕР33-04-014-02: люминесцентный светильник на готовой опоре ВЛ; два механизма и подтверждение доступа. Проектные итоги по документу; дополнительные потребности открыты.',
      keyDistinguishingParameters:['construction_scope_conditions','ready_support_connection_reference','access_method_reference','lift_access_compatibility_reference'],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'наружное освещение люминесцентный светильник готовая опора воздушная линия ВЛ кронштейн хомут провод автогидроподъёмник',sourceProvenance:{sourcePack:'fluorescent-vl-luminaire-krer33-04-014-02-s27-58.json',primaryMeasureParameterId:'luminaire_count',exactRateColumn:pack.normId,fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'electrical',sourceIdentity:pack.sourceId,workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'electrical',systemId:'electrical',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,breadcrumb:[groupNameRu],groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},membershipOrdinal:0,
      independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,sourceCompositionPartial:true},elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'FLUORESCENT_EXISTING_VL_SUPPORT',constructionState:'READY_SUPPORT',normativeClassifiers:[],applicabilityTags:['FLUORESCENT','READY_VL_SUPPORT','KRER33_04_014_02'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/33-04-014-01|накаливан|ртутн|светодиод/iu],owner:'S2758_FLUORESCENT_VL_SINGLE_WRITER',receiptFileStem:'fluorescent_vl_luminaire',verifyCore:verifyFluorescentVlS2758};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2758FluorescentVl.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(fluorescentVlConfigS2758({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
