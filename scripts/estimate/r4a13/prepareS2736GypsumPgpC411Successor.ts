import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {
  compileGypsumPgpC411S2736 as compile, PGP_C411_DEFINITION_S2736 as definition,
  PGP_C411_CATALOG_S2736 as catalogId, PGP_C411_WORK_KEY_S2736 as workKey,
  PGP_C411_SOURCE_ID_S2736 as sourceId, PGP_C411_NORM_ID_S2736 as normId,
  PGP_C411_SOURCE_METADATA_S2736 as sourceMetadata,
} from '../../../src/lib/estimate/v4/gypsumPgpC411ConstructorS2736';

// Pin the reviewed parent: repeating this publisher must not chase the
// subsequently updated developer pointer and create another successor.
const parent={definitionReleaseId:'271fe94c-35d0-500b-ab69-abcdd9fd8a74',searchReleaseId:'7190d68d-95cb-5a0e-a5e0-1e0a4c5d4535'};
const title='Одинарная перегородка КНАУФ C411 из стандартных ПГП100мм: монтаж, эластичные примыкания и местные швы';
const groupId='wg:master:gypsum_pgp_c411_100mm',groupNameRu='Перегородки из стандартных гипсовых пазогребневых плит100мм';
const config:MasterSingleDefinitionSuccessorConfig={
  contract:'rik-expo-app.s27-36.gypsum-pgp-c411.v1',stopCode:'S2736_GYPSUM_PGP_C411',applicationName:'s2736-gypsum-pgp-c411',
  expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (76).md',
  masterSha256:'d1dc1e4c3bf0166b4ccb1ed28d6eb3c8e08fad02a0c2ad68fd707425969a45e8',
  parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/r568/s27-35/gypsum-pgp-c411'),
  sourcePaths:[
    'src/lib/estimate/v4/gypsumPgpC411ConstructorS2736.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
    'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','data/estimate-benchmarks/source-packs/gypsum-pgp-c411-s27-36.json',
    'tests/estimateNorms/gypsumPgpC411ConstructorS2736.contract.test.ts','scripts/estimate/r4a13/prepareS2736GypsumPgpC411Successor.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  ],
  catalogId,sourceId,normId,sourceMetadata,
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{area_m2:30},acceptanceInput:{area_m2:30,...definition.runtimeInput},
  runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
  verifyCore:async()=>{
    const r=await compile({area_m2:30});assert.equal(r.preliminaryNeeds.length,0);assert.equal(r.rows.length,40);
    assert.equal(r.rows.filter(x=>x.included_in_procurement).length,7);
    assert.equal(r.rows.find(x=>x.row_id==='material:pgp:plate')?.quantity,'95');
    assert.equal(r.rows.find(x=>x.row_id==='material:pgp:fugen')?.quantity,'45');
    assert.equal(r.rows.find(x=>x.row_id==='work:pgp:worker')?.quantity,'33.213');
    assert.equal(r.rows.filter(x=>x.category==='labor'&&x.included_in_estimate).length,1);
    const confirmed=await compile({area_m2:30,applicability_mode:'CONFIRMED_PROJECT_FACTS'});
    assert(confirmed.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes('pgp_ready_substrate_and_krer_confirmed')));
    assert(!Object.keys(definition.runtimeInput).some(id=>/_confirmed|productivity|_reference/.test(id)));
    return {status:'GREEN_S2736_PGP_C411_CORE_PRELIMINARY_PROFILE',rows:40,procurementPositions:7,exactNorm:'08-04-001-09',
      sourceConflictRetained:true,historicalMaterialRatesNotImported:true,commonCompilerAndBalance:true,engineeringAccepted:false,ordinaryUiAccepted:false};
  },
  expectedParentShape:[0,0,0],benchmarkOrdinal:155,validationScenario:'S2736_PGP_C411_STANDARD_100MM_DRY_STRAIGHT_NO_OPENINGS',
  passport:{canonicalRuName:title,workKey,
    physicalResultRu:'Одинарная сухая перегородка из стандартных гипсовых ПГП667×500×100мм, на готовом ровном основании, эластичные примыкания и местная заделка швов',
    includedScopeRu:['Геометрия, очистка готового основания, монтаж ПГП и местные стыки Фуген; отсутствующая конкретная операция добавлена без замены кирпичной/керамической кладки',
      'Плиты, пробка, скобы, шурупы и дюбели раскрыты; поштучная/погонная поставка предварительная, паллетность не выдумана',
      'Фуген текущей редакции и вода объединяются по владельцам до округления, потребность/наличие/резерв/заказ/остаток раздельно',
      'Труд и машины КРЕР08-04-001-09 один раз; машинист включён в машину, индивидуальное оснащение включено в труд',
      'Потери и периметральная схема креплений — открытые предварительные планы; геометрия, примыкания и применимость труда требуют подтверждения'],
    excludedScopeRu:['Выравнивание негоризонтального основания и дополнительные неизвестные ремонтные слои','Дверные/инженерные проёмы, перемычки, штрабы, свободные торцы и наружные углы',
      'Влажная зона, гидрофобная/двойная/80мм система','Сплошная шпаклёвка, окраска и универсальная грунтовка ПГП','Внешняя доставка/вывоз, придуманные цены и подтверждённые DEMO-факты']},
  applicability:{country:'KG',primaryMeasureParameterId:'area_m2',knownScopeParameters:['area_m2'],ordinaryUserInputCount:1,
    scope:'PRELIMINARY_STANDARD_PGP_100MM_C411_NO_OPENINGS',hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false},
  binding:{rowId:'material:pgp:plate',applicability:{technology_class:'PRELIMINARY_KNAUF_STANDARD_PGP_C411_100MM',operation_class:'PGP_PARTITION_MOUNT_ELASTIC_JUNCTIONS',source_id:sourceId,norm_id:normId,
    exact_locator:sourceMetadata.exact_locator,quantity_basis:'NET_SINGLE_FACE_AREA_VISIBLE_PRODUCT_AND_PROJECT_LOSSES',norm_replacement_approval_required:true}},
  locator:{key:'gypsum-pgp-c411-s27-36-v1',payload:{kind:'CURRENT_PGP_PRODUCT_MOUNT_PROFILE_WITH_VISIBLE_PROJECT_LAYOUT',sourcePackSha256:sourceMetadata.artifact_sha256,
    ordinaryKnownInputs:['area_m2'],visibleProfileInputs:Object.keys(definition.runtimeInput),normCode:'08-04-001-09',fixtureValuesNeverRuntimeDefaults:true,projectReplacementApprovalRequired:true}},
  search:{primaryUom:'m2',canonicalNameRu:title,aliases:['перегородка из пазогребневых плит','перегородка ПГП100мм','перегородка КНАУФ C411','С411 ПГП'],
    shortScopeRu:'Стандартная ПГП667×500×100мм, одинарная прямая сухая перегородка без проёмов на готовом ровном основании. Монтаж и местные швы, эластичные примыкания; видимые предварительные допущения.',
    keyDistinguishingParameters:['area_m2','pgp_height_m','pgp_plate_loss_fraction'],clarificationFields:['applicability_mode','pgp_height_m','pgp_extra_junction_glue_kg'],
    includedBoundaries:['Монтаж ПГП100мм и местные швы','Совместимые материалы и индивидуальное оснащение','Эластичные примыкания, единый труд и исторические машины'],
    excludedBoundaries:['Проёмы/перемычки, мокрая зона и свободные торцы','Сплошная отделка и внешняя доставка/вывоз'],
    extraSearchTermsRu:'пгп пазогребневая гипсоплита гипсовая перегородка C411 С411 кнауф фуген 100мм',
    sourceProvenance:{missingProductSpecificOperationAdded:true,commonCompilerReused:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
  catalogAppend:{identity:{namespace:'global',domain:'masonry',sourceIdentity:'master-work:'+workKey,workKey,titleRu:title,denominatorEligible:true},
    searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'masonry',systemId:'interior_partitions',subsystemId:groupId,assemblyId:groupId,workFamilyId:'standard_gypsum_pgp_partition',breadcrumb:[groupNameRu],
      groupOracleDisposition:{contract:'rik-expo-app.s27-3.catalog-append.v1',disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:'KRER_08_04_001_09_CURRENT_KNAUF_C411'},membershipOrdinal:0,
      independentDisposition:{contract:'rik-expo-app.s27-3.catalog-append.v1',classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,appendedWithoutReplacingExistingIdentity:true},
      elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'Стандартная ПГП100мм C411, одинарная сухая перегородка с эластичными примыканиями',constructionState:'NEW',
      normativeClassifiers:['КРЕР08-04-001-09'],applicabilityTags:['GYPSUM_PGP','C411','100MM','DRY_INTERIOR','ELASTIC_JUNCTIONS','NO_OPENINGS'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/bia_tn10|fired_clay|ceramic_block|gas_block/iu,/hydrophobic|double_partition|pgp_80mm/iu,/professional_.*_set|materials_0[1-6]/iu],
  owner:'S2736_GYPSUM_PGP_C411',receiptFileStem:'gypsum_pgp_c411',
};
void runMasterSingleDefinitionSuccessorR1(config).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
