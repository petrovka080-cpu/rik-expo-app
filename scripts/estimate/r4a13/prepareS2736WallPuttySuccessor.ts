import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import {
  compileWallPuttyConstructorS2736 as compile, WALL_PUTTY_DEFINITION_S2736 as definition,
  WALL_PUTTY_CATALOG_S2736 as catalogId, WALL_PUTTY_SOURCE_ID_S2736 as sourceId,
  WALL_PUTTY_NORM_ID_S2736 as normId, WALL_PUTTY_SOURCE_METADATA_S2736 as sourceMetadata,
} from '../../../src/lib/estimate/v4/wallPuttyConstructorS2736';
const currentReleasePath = resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const parent = JSON.parse(readFileSync(currentReleasePath, 'utf8'));
const title = 'Третья финишная шпаклёвка подготовленных минеральных стен CT127';
const config: MasterSingleDefinitionSuccessorConfig = {
  contract: 'rik-expo-app.s27-36.wall-putty-third-mineral.v1', stopCode: 'S2736_WALL_PUTTY', applicationName: 's2736-wall-putty-third-mineral',
  expectedBranch: 'codex/r4-a5-clean-08b18902',
  masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (76).md',
  masterSha256: 'd1dc1e4c3bf0166b4ccb1ed28d6eb3c8e08fad02a0c2ad68fd707425969a45e8',
  parentReleaseId: parent.definitionReleaseId, parentSearchReleaseId: parent.searchReleaseId, currentReleasePath,
  outputRoot: resolve('.release-runtime/r568/s27-35/wall-putty-third-mineral'),
  sourcePaths: [
    'src/lib/estimate/v4/wallPuttyConstructorS2736.ts',
    'src/lib/estimate/v4/domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1.ts',
    'src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts',
    'src/lib/estimate/v4/domains/interiorFinishesComplete/paintCeresitCt54Ct17ProfessionalV1.ts',
    'src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts',
    'src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'data/estimate-benchmarks/source-packs/wall-putty-third-mineral-ct127-s27-36.json',
    'tests/estimateNorms/wallPuttyConstructorS2736.contract.test.ts', 'tests/estimateNorms/wallPuttyCt127Krer15Wave.contract.test.ts',
    'scripts/estimate/r4a13/prepareS2736WallPuttySuccessor.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts', 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  ],
  catalogId, sourceId, normId, sourceMetadata,
  parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
  shortInput: { area_m2: 50 }, acceptanceInput: { area_m2: 50, ...definition.runtimeInput },
  runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification, runtimeProfileSourceIds: definition.runtimeSourceIds,
  verifyCore: async () => {
    const short = await compile({ area_m2: 50 });
    assert.equal(short.rows.length, 29); assert.equal(short.preliminaryNeeds.length, 0);
    assert.equal(short.rows.filter(row => row.included_in_procurement).length, 19);
    assert.equal(short.rows.find(row => row.row_id === 'wall-putty:ready:construction_worker_labor')?.quantity, '5.995');
    assert.equal(short.rows.find(row => row.row_id === 'wall-putty:ready:machine_operator_labor')?.included_in_estimate, false);
    const stocked = await compile({ area_m2: 50, wall_putty_ct127_stock: 40, wall_putty_ct127_reserve: 20 });
    assert.equal(stocked.rows.find(row => row.row_id === 'material:wall-putty:ct127')?.quantity, '20');
    assert.equal(stocked.rows.find(row => row.row_id === 'scope:wall-putty:wet-surplus')?.quantity, '5');
    const confirmed = await compile({ area_m2: 50, applicability_mode: 'CONFIRMED_PROJECT_FACTS' });
    assert(confirmed.preliminaryNeeds.some(row => row.missing_parameter_ids.includes('third_coat_and_ct127_norm_replacement_confirmed')));
    assert(!Object.keys(definition.runtimeInput).some(id => /_confirmed|productivity|_reference/.test(id)));
    return { status: 'GREEN_S2736_THIRD_MINERAL_WALL_PUTTY_CORE', rows: 29, procurementPositions: 19,
      exactNorm: '15-04-027-05', engineeringAccepted: false, ordinaryUiAccepted: false,
      automaticQuantitiesUnderVisiblePreliminaryProfile: true, fixtureFactsNeverRuntimeDefaults: true };
  },
  expectedParentShape: [16, 7, 7], benchmarkOrdinal: 153, validationScenario: 'S2736_THIRD_MINERAL_WALL_PUTTY_ORDINARY_AREA',
  passport: {
    canonicalRuName: title, workKey: 'plaster_paint_interior_wall_putty_apply_standard',
    physicalResultRu: 'Один третий финишный слой и шлифование подготовленных минеральных стен под высококачественную окраску; CT127 выбран предварительно',
    includedScopeRu: [
      'Готовые труд и машины КРЕР15-04-027-05; колонка01 для дерева исключена',
      'Материал таблицы заменён CT127 по отдельному паспорту; применимость замены труда подтверждается по проекту',
      'Чистый укладываемый расход, выбранные полные замесы, мокрый остаток и сухой резерв раскрыты отдельно',
      'Вода замеса и мойки объединена до округления с неоплачиваемыми распределениями',
      'Инструменты, абразив, ветошь, защита и расходники названы по отдельности',
      'Машинист входит в полную стоимость эксплуатации машин; отдельная повторная оплата исключена',
      'Новое CT17 включается явно, получает свой материал и отдельный труд',
    ],
    excludedScopeRu: ['Предыдущие слои и полное выравнивание', 'Дерево, потолок, постоянно влажная зона',
      'Универсальный расход на миллиметр', 'Подтверждение основания и замены материала по одной площади', 'Придуманные цены/скрытые DEMO-входы'],
  },
  applicability: { country: 'KG', primaryMeasureParameterId: 'area_m2', knownScopeParameters: ['area_m2'], ordinaryUserInputCount: 1,
    scope: 'THIRD_COAT_PREPARED_MINERAL_WALL', hiddenDemoFixtureInputs: false, ordinaryUiAccepted: false, engineeringAccepted: false },
  binding: { rowId: 'material:wall-putty:ct127', applicability: { technology_class: 'PRELIMINARY_THIRD_PREPARED_MINERAL_WALL_CT127',
    operation_class: 'THIRD_PUTTY_AND_SANDING', source_id: sourceId, norm_id: normId, exact_locator: sourceMetadata.exact_locator,
    quantity_basis: 'MEASURED_AREA_VISIBLE_CT127_RATE_AND_SELECTED_FULL_BAG_MIXES', norm_replacement_approval_required: true } },
  locator: { key: 'third-mineral-wall-putty-s27-36-v1', payload: { kind: 'MEASURED_AREA_REUSED_EXACT_THIRD_COAT',
    sourcePackSha256: sourceMetadata.artifact_sha256, ordinaryKnownInputs: ['area_m2'], visibleProfileInputs: Object.keys(definition.runtimeInput),
    normCode: '15-04-027-05', fixtureValuesNeverRuntimeDefaults: true, projectReplacementApprovalRequired: true } },
  search: { primaryUom: 'm2', canonicalNameRu: title,
    aliases: ['третья шпаклёвка минеральных стен', 'финишная шпаклевка подготовленных стен CT127'],
    shortScopeRu: 'Третье нанесение и шлифование подготовленных минеральных стен: CT127, труд и машины КРЕР, индивидуальное оснащение. Предварительный профиль требует согласования замены материала.',
    keyDistinguishingParameters: ['area_m2', 'putty_scope', 'ct127_delivered_version'], clarificationFields: ['putty_priming_mode', 'applicability_mode'],
    includedBoundaries: ['Один третий финишный слой и шлифование', 'Индивидуальные материалы/оснащение и совместимая поставка'],
    excludedBoundaries: ['Все предыдущие слои и полное выравнивание', 'Дерево, потолок и постоянная влажность'],
    extraSearchTermsRu: 'шпаклевание шпаклевка шпатлевка минеральная стена третий слой финиш CT127 шлифование закупка остаток',
    sourceProvenance: { acceptedOperationReused: true, hiddenDemoFixtureInputs: false, engineeringApprovalClaimed: false } },
  forbiddenAdjacentMatchers: [/materials_0[1-6]/iu, /professional_.*_set/iu, /facade_scaffold/iu, /wall_paint_ct54/iu],
  owner: 'S2736_WALL_PUTTY_THIRD_MINERAL', receiptFileStem: 'wall_putty_third_mineral',
};
void runMasterSingleDefinitionSuccessorR1(config).catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
