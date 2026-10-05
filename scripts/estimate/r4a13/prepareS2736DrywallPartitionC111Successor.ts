import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {
  compileDrywallPartitionC111S2736 as compile, C111_DEFINITION_S2736 as definition, C111_CATALOG_S2736 as catalogId,
  C111_WORK_KEY_S2736 as workKey, C111_SOURCE_ID_S2736 as sourceId, C111_NORM_ID_S2736 as normId,
  C111_SOURCE_METADATA_S2736 as sourceMetadata, C111_READY_OPERATIONS_S2736 as ready,
} from '../../../src/lib/estimate/v4/drywallPartitionC111ConstructorS2736';
const currentReleasePath = resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
// Freeze the reviewed parent. Reading the moving local pointer here would
// turn a same-candidate replay into a new, incompatible successor request.
const parent = {definitionReleaseId: 'c0190c9e-003d-551b-8116-67dac777d02c', searchReleaseId: 'fd800a08-3955-56ad-94aa-2942631adc09'};
const title = 'Прямая перегородка C111 из ГКЛ: каркас, обшивка двух сторон, изоляция и швы Q1';
const config: MasterSingleDefinitionSuccessorConfig = {
  contract: 'rik-expo-app.s27-36.drywall-partition-c111.v1', stopCode: 'S2736_DRYWALL_C111', applicationName: 's2736-drywall-partition-c111',
  expectedBranch: 'codex/r4-a5-clean-08b18902',
  masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (76).md',
  masterSha256: 'd1dc1e4c3bf0166b4ccb1ed28d6eb3c8e08fad02a0c2ad68fd707425969a45e8',
  parentReleaseId: parent.definitionReleaseId, parentSearchReleaseId: parent.searchReleaseId, currentReleasePath,
  outputRoot: resolve('.release-runtime/r568/s27-35/drywall-partition-c111'),
  sourcePaths: [
    'src/lib/estimate/v4/drywallPartitionC111ConstructorS2736.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateSearchInput.ts', 'src/lib/estimate/backendPlatform/catalogSearchIntent.ts',
    'src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts',
    'src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionSuccessorR56.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'data/estimate-benchmarks/source-packs/drywall-partition-c111-s27-36.json',
    'tests/estimateNorms/drywallPartitionC111ConstructorS2736.contract.test.ts',
    'scripts/estimate/r4a13/prepareS2736DrywallPartitionC111Successor.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts', 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  ],
  catalogId, sourceId, normId, sourceMetadata,
  parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
  shortInput: {area_m2: 30}, acceptanceInput: {area_m2: 30, ...definition.runtimeInput},
  runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification, runtimeProfileSourceIds: definition.runtimeSourceIds,
  verifyCore: async () => {
    const short = await compile({area_m2: 30});
    assert.equal(short.preliminaryNeeds.length, 0);assert.equal(short.rows.filter(row => row.included_in_procurement).length, 12);
    assert.equal(short.rows.find(row => row.row_id === 'material:c111:board')?.quantity, '20');
    assert.equal(short.rows.find(row => row.row_id === 'work:c111:worker')?.quantity, '29.4');
    assert.equal(short.rows.filter(row => row.category === 'labor' && row.included_in_estimate).length, 1);
    assert.equal(short.rows.find(row => row.row_id === 'material:c111:tiefengrund')?.unit_id, 'kg');
    const stocked = await compile({area_m2: 30, c111_board_stock: 4, c111_board_reserve: 2});
    assert.equal(stocked.rows.find(row => row.row_id === 'material:c111:board')?.quantity, '18');
    const confirmed = await compile({area_m2: 30, applicability_mode: 'CONFIRMED_PROJECT_FACTS'});
    assert(confirmed.preliminaryNeeds.some(row => row.missing_parameter_ids.includes('c111_modern_materials_krer_labor_confirmed')));
    assert(!Object.keys(definition.runtimeInput).some(id => /_confirmed|productivity|_reference/.test(id)));
    return {status: 'GREEN_S2736_C111_CORE_PRELIMINARY_PROFILE', rows: short.rows.length, procurementPositions: 12,
      readyOperations: ready, exactNorm: '10-05-001-01', engineeringAccepted: false, ordinaryUiAccepted: false,
      automaticQuantitiesUnderVisiblePreliminaryProfile: true, fixtureFactsNeverRuntimeDefaults: true};
  },
  expectedParentShape: [22, 10, 10], benchmarkOrdinal: 154, validationScenario: 'S2736_C111_STRAIGHT_DRY_NO_OPENINGS_ORDINARY_AREA',
  passport: {
    canonicalRuName: title, workKey,
    physicalResultRu: 'Прямая сухая перегородка без проёмов, один слой ГСП-А12.5мм с каждой стороны, ПН/ПС50, выбранная изоляция, швы Q1 и последующее неразбавленное грунтование',
    includedScopeRu: ['Переиспользованы границы готовых FRAME, CLAD, INSULATE, FINISH_JOINT; общий труд КРЕР10-05-001-01 один раз',
      'Листы и стойки поставляются целыми3м; раскрой и отходы раскрыты без превращения обрезков в целое наличие',
      'Профили, ГСП-А, TN25, дюбели, три типа ленты, АкустиКНАУФ, Фуген, Тифенгрунд и вода названы отдельно',
      'Тифенгрунд06/2026 рассчитывается в кг; отдельный паспорт вместо переименования литров C11',
      'Вода частичных замесов и мойки объединена до округления; распределения отдельно не оплачиваются',
      'Индивидуальные инструменты, расходники и доступ предоставляет подрядчик с включением в ставки по видимому плану',
      'Основание/высота/раскрой, поставка и замена материалов исторической нормы требуют проектного подтверждения'],
    excludedScopeRu: ['Дверные и инженерные проёмы, усиления и закладные', 'Сплошная шпаклёвка и окраска',
      'Влажная зона, подтверждённые противопожарные и акустические показатели', 'Высота более3м и горизонтальные стыки',
      'Доставка на объект и внешний вывоз отходов', 'Придуманные цены и скрытые подтверждённые DEMO-факты'],
  },
  applicability: {country: 'KG', primaryMeasureParameterId: 'area_m2', knownScopeParameters: ['area_m2'], ordinaryUserInputCount: 1,
    scope: 'STRAIGHT_DRY_C111_NO_OPENINGS_Q1', hiddenDemoFixtureInputs: false, ordinaryUiAccepted: false, engineeringAccepted: false},
  binding: {rowId: 'material:c111:board', applicability: {technology_class: 'PRELIMINARY_C111_PN50_PS50_GSP_A_ONE_LAYER_BOTH_FACES',
    operation_class: 'C111_STRAIGHT_PARTITION_COMPLETE', source_id: sourceId, norm_id: normId, exact_locator: sourceMetadata.exact_locator,
    quantity_basis: 'MEASURED_SINGLE_FACE_AREA_VISIBLE_HEIGHT_AND_CUT_LAYOUT', norm_replacement_approval_required: true}},
  locator: {key: 'drywall-partition-c111-s27-36-v1', payload: {kind: 'MEASURED_SINGLE_FACE_AREA_C111_READY_OPERATIONS',
    sourcePackSha256: sourceMetadata.artifact_sha256, ordinaryKnownInputs: ['area_m2'], visibleProfileInputs: Object.keys(definition.runtimeInput),
    normCode: '10-05-001-01', fixtureValuesNeverRuntimeDefaults: true, projectReplacementApprovalRequired: true}},
  search: {primaryUom: 'm2', canonicalNameRu: title, aliases: ['перегородка из гипсокартона C111', 'перегородка из ГКЛ', 'прямая сухая перегородка КНАУФ C111'],
    shortScopeRu: 'Прямая сухая перегородка без проёмов: ПН/ПС50, ГКЛ обеих сторон, изоляция, швы Q1 и грунт. Площадь по одной стороне; видимый предварительный профиль и согласование применимости труда.',
    keyDistinguishingParameters: ['area_m2', 'c111_height_m', 'c111_insulation_mode'], clarificationFields: ['applicability_mode', 'c111_height_m'],
    includedBoundaries: ['Каркас, однослойная обшивка обеих сторон, изоляция и швы Q1', 'Конкретные изделия, совместимая закупка, труд/машины и оснащение'],
    excludedBoundaries: ['Проёмы и закладные', 'Окраска, мокрая зона и внешний транспорт'],
    extraSearchTermsRu: 'гкл гипсокартон перегородка C111 С111 кнауф один слой каркас профили фуген минеральная вата изоляция швы',
    sourceProvenance: {acceptedOperationBoundariesReused: true, hiddenDemoFixtureInputs: false, engineeringApprovalClaimed: false}},
  forbiddenAdjacentMatchers: [/materials_0[1-6]/iu, /professional_.*_set/iu, /facade_scaffold/iu, /ceiling_norm/iu],
  owner: 'S2736_DRYWALL_C111', receiptFileStem: 'drywall_partition_c111',
};
void runMasterSingleDefinitionSuccessorR1(config).catch(error => {process.stderr.write(String(error.stack ?? error) + '\n');process.exitCode = 1;});
