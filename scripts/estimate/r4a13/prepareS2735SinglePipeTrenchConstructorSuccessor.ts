import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileSinglePipeTrenchConstructorS2735 as compile,SINGLE_PIPE_TRENCH_DEFINITION_S2735 as definition,
  SINGLE_PIPE_TRENCH_CATALOG_ID_S2735 as catalogId,SINGLE_PIPE_TRENCH_SOURCE_ID_S2735 as sourceId,
  SINGLE_PIPE_TRENCH_NORM_ID_S2735 as normId,SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735 as sourceMetadata} from '../../../src/lib/estimate/v4/singlePipeTrenchConstructorS2735';
async function verifyCore(){
  const short=await compile({length_m:100});
  const explicit={length_m:100,diameter_mm:315,trench_width_m:0.8,trench_depth_m:1.6,lower_base_thickness_m:0.1,
    pbb_bedding_thickness_mm:150,pbb_surround_cover_above_pipe_mm:300,bedding_loose_per_installed_m3:1.2,backfill_loose_per_installed_m3:1.15,base_loose_per_installed_m3:1.3,
    pbb_bedding_material:'EXPLICIT_VERIFICATION_SAND',pbb_backfill_material:'EXPLICIT_VERIFICATION_PGS',pbb_foundation_aggregate_designation:'EXPLICIT_VERIFICATION_BASE',pbb_assembly_designation:'EXPLICIT_VERIFICATION_NOT_RUNTIME',pbb_compaction_coefficient:0.95};
  const checked=await compile(explicit),doubled=await compile({...explicit,length_m:200});
  assert.equal(short.rows.length,1);assert(short.preliminaryNeeds.length>25);
  assert.equal(checked.rows.find(r=>r.row_id==='scope:trench:excavation')?.quantity,'128');
  assert.equal(doubled.rows.find(r=>r.row_id==='scope:trench:excavation')?.quantity,'256');
  assert(!Object.keys(definition.runtimeInput).some(id=>/diameter|depth|width|thickness|labor_h|machine_h|worker_h|loose_per|coefficient/.test(id)));
  return {status:'GREEN_S2735_SINGLE_PIPE_TRENCH_LOCAL_GEOMETRY_AND_REUSED_OPERATIONS',ordinaryKnownInputs:['length_m'],shortKnownRows:short.rows.length,shortNeeds:short.preliminaryNeeds.length,
    validationDimensionsNeverRuntimeDefaults:true,universalProductivityClaimed:false,engineeringAccepted:false,ordinaryUiAccepted:false,
    sha256:createHash('sha256').update(JSON.stringify({short,checked,doubled})).digest('hex')};
}
void runMasterSingleDefinitionSuccessorR1({contract:'rik-expo-app.s27-35.single-pipe-trench-constructor.v1',stopCode:'S2735_SINGLE_PIPE_TRENCH_CONSTRUCTOR',applicationName:'s2735-single-pipe-trench',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md',
  masterSha256:'bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230',
  parentReleaseId:'d9306e5b-cb07-5161-9127-40bf0dc13182',parentSearchReleaseId:'a36c6da3-66dc-5566-b83f-fb71c5abe3fe',
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve('.release-runtime/r568/s27-35/single-pipe-trench-successor'),
  sourcePaths:['src/lib/estimate/v4/singlePipeTrenchConstructorS2735.ts','src/lib/estimate/v4/pipeBeddingBackfillR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'data/estimate-benchmarks/source-packs/single-pipe-trench-constructor-s27-35.json','tests/estimateNorms/singlePipeTrenchConstructorS2735.contract.test.ts',
    'scripts/estimate/r4a13/prepareS2735SinglePipeTrenchConstructorSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
  catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{length_m:100},acceptanceInput:{length_m:100,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,
  runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,verifyCore,expectedParentShape:[6,45,45],benchmarkOrdinal:122,
  validationScenario:'S2735_SINGLE_PIPE_TRENCH_ORDINARY_LENGTH_ACTUAL_GEOMETRY',
  passport:{canonicalRuName:'Траншея одного трубопровода: разработка, постель, обсыпка и засыпка',workKey:'utility_trench',
    physicalResultRu:'Выемка постоянного прямоугольного сечения одного круглого трубопровода, подготовка дна, постель, обсыпка, выбранная засыпка, уплотнение и применимые условные операции по проекту',
    includedScopeRu:['Повторное использование операции постели и засыпки без её DEMO параметров','Объёмы по фактическим ширине, глубине, длине и диаметру с вычетом трубы',
      'Поставка рыхлых материалов по проектным коэффициентам и фактическим спецификациям','Совместимая партия объединяется до округления; отдельные распределения не оплачиваются',
      'Реальные материалы, отдельные расходники/инструмент, фактические часы и рейсы','Геотекстиль, лента, замена грунта, водоотлив и крепление по применимости'],
    excludedScopeRu:['Трубы, колодцы, соединения и испытания сети','Откосы, переменное сечение, несколько труб, переборы и восстановление покрытия','Неподтверждённые универсальные нормы труда/техники','Автоматическое инженерное утверждение и цены']},
  applicability:{country:'KG',primaryMeasureParameterId:'length_m',knownScopeParameters:['length_m'],ordinaryUserInputCount:1,additionalDimensionsRequired:true,visiblePreliminaryProfile:true,
    hiddenDemoFixtureInputs:false,actualSurveyConfirmed:false,ordinaryUiAccepted:false,engineeringAccepted:false},
  binding:{rowId:'material:trench:bedding',applicability:{technology_class:'ONE_PIPE_RECTANGULAR_CONSTANT_SECTION_PROJECT_GEOMETRY',operation_class:'REUSED_PIPE_BEDDING_BACKFILL_ACTUAL_FACTS',
    source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,quantity_basis:'ACTUAL_GEOMETRY_AND_PROJECT_LOOSE_SUPPLY_CONVERSION',universal_productivity_claimed:false}},
  locator:{key:'single-pipe-trench-constructor-s27-35-v1',payload:{kind:'PROJECT_GEOMETRY_AND_REUSED_OPERATIONS',sourcePackSha256:sourceMetadata.artifact_sha256,
    ordinaryKnownInputs:['length_m'],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,operationReuse:true,engineeringApprovalClaimed:false}},
  search:{primaryUom:'m',canonicalNameRu:'Траншея одного трубопровода: разработка, постель, обсыпка и засыпка',
    aliases:['траншея под один трубопровод','земляные работы для трубопровода с постелью и засыпкой','разработка траншеи постель обсыпка обратная засыпка'],
    shortScopeRu:'Расширенный состав траншеи одного трубопровода. Объёмы из фактических размеров; геология, рыхлая поставка, труд, механизмы и условные ветви уточняются по проекту.',
    keyDistinguishingParameters:['length_m','diameter_mm','trench_width_m','trench_depth_m','pbb_bedding_thickness_mm','pbb_surround_cover_above_pipe_mm'],
    clarificationFields:['pbb_assembly_designation','pbb_compaction_coefficient','pbb_shoring_mode','pbb_dewatering_mode','soil_reuse_export_reference'],
    includedBoundaries:['Разработка, подготовка дна, постель, обсыпка, засыпка, уплотнение, оснащение, фактическая логистика'],
    excludedBoundaries:['Поставка трубы и соединения','Несколько труб, колодцы, откосы, покрытие','Инженерное утверждение без обследования'],
    extraSearchTermsRu:'траншея грунт экскаватор постель обсыпка песок пгс геотекстиль уплотнение обратная засыпка',sourceProvenance:{existingOperationReused:true,projectGeometryRequired:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
  forbiddenAdjacentMatchers:[/service_chambers/iu,/professional_.*_set/iu],owner:'S2735_SINGLE_PIPE_TRENCH_CONSTRUCTOR',receiptFileStem:'single_pipe_trench',
}).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
