import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {trayConfigS2758} from './prepareS2758TrayKerbSupplyWave';
import {fusionBenchPackS2758 as pack,fusionBenchPrefixS2758 as prefix,fusionBenchDefinitionS2758,fusionBenchCompletenessMapS2758} from '../../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import {fusionBenchControlS2758,verifyFusionBenchS2758} from './preflightS2758FusionBench';

export function fusionBenchConfigS2758(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const base=trayConfigS2758(parent),d=fusionBenchDefinitionS2758(),source=pack.sources[1];
  const included=['Только готовая собранная Glasdon Fusion Bench 1800×310×425мм на сплошном готовом бетоне',
    'Бетон не менее200мм; ось крепления не ближе110мм к краю; четыре крепления и отверстия на установленную скамью',
    'Сверло10мм, отверстия140мм, гайкаM10, головка17мм, рекомендуемый максимум27Н·м; это условия операции, не нормы времени',
    'Штатные болт, гайка и шайбы входят в один совместимый узел; большая шайба ИЛИ пластина, без повторных компонентных закупок',
    'Заказ скамей и, при раздельной поставке, крепежа по пригодному наличию, резерву и кратности фактического поставщика'];
  const groupId='prepared_concrete_ready_benches_s2758',groupNameRu='Установка готовых скамей на бетонное основание';
  return {...base,contract:pack.contract,stopCode:'S2758_FUSION_BENCH',applicationName:'s2758-fusion-bench-prepared-concrete',
    outputRoot:resolve('.release-runtime/r568/s27-58/hydration-bench-wave/publication'),
    sourcePaths:[...new Set([...base.sourcePaths,'scripts/estimate/r4a13/prepareS2758FusionBench.ts','scripts/estimate/r4a13/preflightS2758FusionBench.ts',
      'data/estimate-benchmarks/source-packs/fusion-bench-prepared-concrete-s27-58.json','src/lib/estimate/v4/fusionBenchPreparedConcreteS2758.ts',
      'src/lib/estimate/v4/fusionBenchPreparedConcreteS2758.test.tsx','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/features/consumerRepair/ConsumerRepairItemRow.tsx','src/features/consumerRepair/consumerRepairRowMetadata.ts',
      'src/features/consumerRepair/useConsumerRepairItemRowEditing.ts',
      'src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx','tests/requestEstimate/canonicalPrecompileParameterCollection.contract.test.tsx',
      'tests/requestEstimate/canonicalRowPendingQuantityBaseline.contract.test.tsx',...pack.sources.map(s=>s.path)])],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,expectedParentShape:[0,0,0],
    sourceMetadata:{source_title:'Glasdon Fusion Bench; C000/0096 concrete fixing',source_authority:'Glasdon, производитель изделия',
      source_kind:'MANUFACTURER_PHYSICAL_COMPOSITION_COMPLETION_UNRESOLVED',official_url:source.url,artifact_sha256:source.sha256,
      exact_locator:'C000/0096 Issue1 June2006 page2 steps1–6; current product page links these exact bytes',
      use_restriction:included[0]+'; фундамент, мягкий грунт и другие модели не входят. Количественной нормы труда/техники нет.'},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
    shortInput:{bench_count:3},acceptanceInput:fusionBenchControlS2758(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    validationScenario:'S2758_EXACT_FUSION_BENCH_FOUR_FIXINGS_PREPARED_CONCRETE_TWO_SUPPLY_BRANCHES_EIGHT_OPEN_NEEDS',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Готовая скамья закреплена на пригодном подготовленном бетоне. Восемь дополнительных ресурсных потребностей пока не нормированы.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,independentCompletenessMap:fusionBenchCompletenessMapS2758(),
      unresolvedApplicableResourceRowIds:pack.gaps.map(g=>prefix+':'+g.id)},
    applicability:{primaryMeasureParameterId:'bench_count',exactManufacturerProduct:'Glasdon Fusion Bench',preparedContinuousConcreteOnly:true,
      exactManual:'C000/0096',fixingsPerInstalledBench:4,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':bench-consumed',applicability:{exactManufacturerProduct:'Glasdon Fusion Bench',preparedContinuousConcreteOnly:true,fullTechnicalAcceptance:false}},
    locator:{key:'s2758-fusion-bench-prepared-concrete',payload:{sourcePack:pack,controlOnly:fusionBenchControlS2758(),fullTechnicalAcceptance:false}},
    search:{primaryUom:'pcs',canonicalNameRu:pack.titleRu,aliases:['Монтаж готовой скамьи на подготовленный бетон','Установка Fusion Bench на готовое бетонное основание'],
      shortScopeRu:'Точное готовое изделие Fusion Bench на сплошном бетонном основании, четыре крепления; количественные нормы труда, инструмента и завершения открыты.',
      keyDistinguishingParameters:['prepared_foundation_acceptance_reference','actual_bench_supply_specification','anchor_supply_scope'],
      clarificationFields:pack.userInputs.map(p=>p.id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'скамья готовая бетон основание Fusion Bench Glasdon M10 крепление',
      sourceProvenance:{sourcePack:'fusion-bench-prepared-concrete-s27-58.json',primaryMeasureParameterId:'bench_count',exactManufacturerProduct:'Glasdon Fusion Bench',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'landscape',sourceIdentity:pack.sourceId,workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
      searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'landscape',systemId:'landscape',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
        breadcrumb:[groupNameRu],groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},membershipOrdinal:0,
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerPhysicalCompositionPartial:true},
        elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'FUSION_PREPARED_CONTINUOUS_CONCRETE',constructionState:'PREPARED_BASE',normativeClassifiers:[],
        applicabilityTags:['FUSION_BENCH','PREPARED_CONCRETE','FOUR_FIXINGS'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/Jubilee|paving.slab|soft.ground|tamper.resistant/iu],owner:'S2758_HYDRATION_BENCH_SINGLE_WRITER',receiptFileStem:'fusion_bench',verifyCore:verifyFusionBenchS2758};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2758FusionBench.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(fusionBenchConfigS2758({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
    .catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
