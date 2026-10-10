import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {kerbCementObjectScopeConfigS2754} from './prepareS2754KerbCementObjectScope';
import {kerbOtherObjectScopeConfigS2754} from './prepareS2754KerbOtherObjectScope';
import {kerbSupplyIdentityDefinitionS2758,kerbSupplyIdentityContractS2758} from '../../../src/lib/estimate/v4/concreteKerbSupplyIdentityS2758';
import {precastRcTrayPackS2758 as pack,precastRcTrayPrefixS2758 as prefix,precastRcTrayDefinitionS2758,precastRcTrayCompletenessMapS2758} from '../../../src/lib/estimate/v4/precastRcEmbankmentRunoffTrayS2758';
import {trayControlS2758,traySupplyControlS2758,kerbSupplyControlS2758,verifyTrayS2758,verifyKerbSupplyS2758} from './preflightS2758TrayKerbSupplyWave';

const masterPath='C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (95).md';
const masterSha256='a3de29a5ec2a98a982aec69c7cf091bcd4605c82a1754c3305b6679997281a85';
const sharedPaths=['scripts/estimate/r4a13/prepareS2758TrayKerbSupplyWave.ts','scripts/estimate/r4a13/preflightS2758TrayKerbSupplyWave.ts',
  'src/lib/estimate/v4/precastRcEmbankmentRunoffTrayS2758.ts','src/lib/estimate/v4/concreteKerbSupplyIdentityS2758.ts',
  'data/estimate-benchmarks/source-packs/precast-rc-embankment-runoff-tray-s27-58.json',
  'src/lib/estimate/v4/precastRcTrayKerbSupplyS2758.test.ts',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
  '.release-runtime/r568/s27-58/review/trays/source-plan.json','.release-runtime/r568/s27-58/review/trays/source-admission-amendment.json',
  pack.source.localArtifact,pack.guidance.localArtifact];
type Parent={releaseId:string;searchReleaseId:string};

export function trayConfigS2758(parent:Parent):MasterSingleDefinitionSuccessorConfig{
  const base=floorDemolitionSeriesS2754Config(0,parent),d=precastRcTrayDefinitionS2758();
  const included=[pack.scopeRu,pack.includedTransportRu,pack.trafficExceptionRu,
    'Труд по всей операции, пять конкретных механизмов, щебень 20–40 мм марки400, готовый тяжёлый отделочный цементный раствор1:3 и сборные ЖБ элементы по проекту',
    'Один заказ на каждый материал по подтверждённой спецификации, поставке в м³, пригодному наличию, резерву и кратности поставки'];
  const groupId='precast_rc_embankment_runoff_trays_krer2702004_s2758',groupNameRu='Сборные водосбросные лотки на откосах';
  return {...base,contract:pack.contract,stopCode:'S2758_TRAY_270200401',applicationName:'s2758-precast-rc-embankment-tray',
    masterPath,masterSha256,outputRoot:resolve('.release-runtime/r568/s27-58/tray-kerb-wave/publication/tray'),sourcePaths:sharedPaths,
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,expectedParentShape:[0,0,0],benchmarkOrdinal:0,
    sourceMetadata:{source_title:'КРЕР27-2015: водосбросный лоток в откосе насыпи, '+pack.normId,source_authority:'Министерство строительства Кыргызской Республики',
      source_kind:'OFFICIAL_ORIGINAL_NORMATIVE_CORE_COMPLETION_UNRESOLVED',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
      exact_locator:pack.source.locatorRu+'; '+pack.guidance.locatorRu,use_restriction:pack.scopeRu+' '+pack.trafficExceptionRu},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
    shortInput:{length_m:35.5},acceptanceInput:traySupplyControlS2758(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    validationScenario:'S2758_EXACT_EMBANKMENT_TRAY_004_FIVE_MACHINES_GRADE400_READY_FINISHING_MORTAR_SIX_OPEN_NEEDS',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Устроен сборный лоток на откосе в составе ручной траншеи, щебёночной подготовки и установки элементов. Дополнительные потребности завершения пока открыты.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,independentCompletenessMap:precastRcTrayCompletenessMapS2758(),unresolvedApplicableResourceRowIds:pack.gaps.map(g=>prefix+':'+g.id)},
    applicability:{country:'KG',primaryMeasureParameterId:'length_m',exactRateColumn:pack.normId,wholeManualTrenchBeddingSetting:true,
      halfRoadTrafficCoefficientNotApplicable:true,supplierM3Only:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':labor',applicability:{exactRateColumn:pack.normId,wholeManualTrenchBeddingSetting:true,fullTechnicalAcceptance:false}},
    locator:{key:'s2758-precast-rc-embankment-tray',payload:{sourcePack:pack,initialObjectControl:trayControlS2758(),sourceRatesNotProjectDefaults:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m',canonicalNameRu:pack.titleRu,aliases:['Монтаж сборного железобетонного лотка на откосе насыпи','Сборный водосбросный лоток на откосе'],
      shortScopeRu:'Сборный водосбросный лоток на откосе: ручная траншея, щебёночная подготовка и установка ЖБ элементов. Дополнительные потребности завершения открыты.',
      keyDistinguishingParameters:['construction_scope_conditions','tray_route_project_reference','precast_rc_supply_specification'],
      clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'водосброс сборный железобетонный лоток откос насыпь щебень раствор стыки',sourceProvenance:{sourcePack:'precast-rc-embankment-runoff-tray-s27-58.json',primaryMeasureParameterId:'length_m',exactRateColumn:pack.normId,fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'transport',sourceIdentity:'krer27-2015:embankment-runoff-tray:'+pack.normId,workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
      searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'transport',systemId:'transport',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,breadcrumb:[groupNameRu],
        groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},membershipOrdinal:0,
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,preliminaryNormativeCoreOnly:true},
        elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:pack.normId,constructionState:'NEW',normativeClassifiers:[pack.normId],applicabilityTags:['EMBANKMENT_RUNOFF_TRAY','WHOLE_MANUAL_TRENCH_BEDDING_SETTING'],
        publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/27-02-005|U600|лоток с реш[её]тк/iu],owner:'S2758_TRAY_KERB_WAVE_SINGLE_WRITER',receiptFileStem:'tray_004',verifyCore:verifyTrayS2758};
}

export function kerbSupplyConfigS2758(index:0|1,parent:Parent):MasterSingleDefinitionSuccessorConfig{
  const base=index===0?kerbCementObjectScopeConfigS2754(parent):kerbOtherObjectScopeConfigS2754(parent),d=kerbSupplyIdentityDefinitionS2758(index);
  return {...base,contract:kerbSupplyIdentityContractS2758,stopCode:'S2758_KERB_SUPPLY_'+index,applicationName:'s2758-kerb-supply-'+index,
    masterPath,masterSha256,outputRoot:resolve('.release-runtime/r568/s27-58/tray-kerb-wave/publication/kerb-'+index),
    sourcePaths:[...new Set([...base.sourcePaths,...sharedPaths])],expectedParentShape:[35,27,27],
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,acceptanceInput:kerbSupplyControlS2758(index),
    passport:{...base.passport,physicalResultRu:base.passport.physicalResultRu+' Поставка раствора М100 определена явно; положительный остаток проверяется на пригодность и соответствие.'},
    applicability:{...base.applicability,supplierIdentityAndCompatibleStockRequired:true},
    locator:{key:'s2758-kerb-supply-'+index,payload:{priorObjectScope:base.locator.payload,allNormsAndBalancesPreserved:true,supplierIdentityAndCompatibleStockRequired:true,fullTechnicalAcceptance:false}},
    search:{...base.search,clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),sourceProvenance:{...base.search.sourceProvenance,supplierIdentityAndCompatibleStockRequired:true}},
    owner:'S2758_TRAY_KERB_WAVE_SINGLE_WRITER',receiptFileStem:'kerb_supply_'+index,verifyCore:()=>verifyKerbSupplyS2758(index)};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2758TrayKerbSupplyWave.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8')),parent={releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId};
  const component=process.argv.find(a=>a.startsWith('--component='))?.split('=')[1];
  const config=component==='tray'?trayConfigS2758(parent):component==='kerb-cement'?kerbSupplyConfigS2758(0,parent):component==='kerb-other'?kerbSupplyConfigS2758(1,parent):null;
  if(!config)throw Error('EXACT_COMPONENT_REQUIRED: tray, kerb-cement, kerb-other');
  void runMasterSingleDefinitionSuccessorR1(config).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
