import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import {
  compilePvcRoofConcreteKrer12S2736 as compile,
  PVC_ROOF_CONCRETE_DEFINITION_S2736 as definition,
  PVC_ROOF_CONCRETE_CATALOG_S2736 as catalogId,
  PVC_ROOF_CONCRETE_WORK_KEY_S2736 as workKey,
  PVC_ROOF_CONCRETE_SOURCE_ID_S2736 as sourceId,
  PVC_ROOF_CONCRETE_NORM_ID_S2736 as normId,
  PVC_ROOF_CONCRETE_SOURCE_METADATA_S2736 as sourceMetadata,
} from '../../../src/lib/estimate/v4/pvcRoofConcreteKrer12ConstructorS2736';

// Immutable local parent. Do not follow the pointer written by this publisher.
const parent = { definition: 'f56e8320-8880-5755-8a37-8f46e1ee0fca', search: '1ca582b5-ffdb-5d9c-b88d-e6bb299e8ea6' };
const title = 'Поле ПВХ-кровли1.2мм по готовому утеплителю и бетонному основанию: крепление и сварка';
const groupId = 'wg:master:pvc_roof_concrete_1_2mm_krer12';
const groupNameRu = 'Кровля: выбранное поле ПВХ1.2мм по готовому основанию';
const packPath = 'data/estimate-benchmarks/source-packs/pvc-roof-concrete-1_2mm-krer12-s27-36.json';
// Density and cleaned area below exercise the unit conversion only. They are
// never project facts or runtime defaults, and never inserted into the UI.
const acceptanceFixture = { area_m2: 100, cleaned_surface_m2: 8, cleaner_density_kg_l: 1.2 };

export const pvcRoofConcreteS2736PublishConfig: MasterSingleDefinitionSuccessorConfig = {
  contract: 'rik-expo-app.s27-36.pvc-roof-concrete-krer12.v1', stopCode: 'S2736_PVC_ROOF_CONCRETE',
  applicationName: 's2736-pvc-roof-concrete', expectedBranch: 'codex/r4-a5-clean-08b18902',
  masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (76).md',
  masterSha256: 'd1dc1e4c3bf0166b4ccb1ed28d6eb3c8e08fad02a0c2ad68fd707425969a45e8',
  parentReleaseId: parent.definition, parentSearchReleaseId: parent.search,
  currentReleasePath: resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot: resolve('.release-runtime/r568/s27-35/pvc-roof-concrete-krer12'),
  sourcePaths: [
    'src/lib/estimate/v4/pvcRoofConcreteKrer12ConstructorS2736.ts', packPath,
    'tests/estimateNorms/pvcRoofConcreteKrer12ConstructorS2736.contract.test.ts',
    'scripts/estimate/r4a13/prepareS2736PvcRoofConcreteKrer12Successor.ts',
    'src/lib/estimate/v4/pvcRoofMembraneInstallationR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
    'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  ],
  catalogId, sourceId, normId, sourceMetadata,
  parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
  shortInput: { area_m2: 100 }, acceptanceInput: { ...acceptanceFixture, ...definition.runtimeInput },
  runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification,
  runtimeProfileSourceIds: definition.runtimeSourceIds,
  verifyCore: async () => {
    assert.equal(createHash('sha256').update(readFileSync(packPath)).digest('hex'), sourceMetadata.definition_hash);
    const short = await compile({ area_m2: 100 });
    assert.equal(short.rows.length, 25);
    assert.equal(short.rows.filter(r => r.included_in_procurement).length, 6);
    assert.equal(short.preliminaryNeeds.length, 1);
    assert.equal(short.preliminaryNeeds[0]!.row_id, 'pvc-roof:material:cleaner');
    assert.deepEqual([...short.preliminaryNeeds[0]!.missing_parameter_ids].sort(), ['cleaned_surface_m2', 'cleaner_density_kg_l']);
    for (const [id, q] of [['pvc-roof:labor:workers', '5.33'], ['pvc-roof:material:anchor', '4'], ['pvc-roof:scope:original646', '0.9']]) {
      assert.equal(short.rows.find(r => r.row_id === id)?.quantity, q);
    }
    const complete = await compile(acceptanceFixture);
    assert.equal(complete.preliminaryNeeds.length, 0);
    assert.equal(complete.rows.filter(r => r.included_in_procurement).length, 7);
    assert.equal(complete.rows.find(r => r.row_id === 'pvc-roof:scope:original646')?.included_in_procurement, false);
    assert(!Object.hasOwn(definition.runtimeInput, 'cleaner_density_kg_l'));
    assert(!Object.hasOwn(definition.runtimeInput, 'cleaned_surface_m2'));
    assert(!Object.values(definition.runtimeInput).includes('YES'));
    return { status: 'GREEN_BOUNDED_KRER_PVC_FIELD_CORE', shortRows: 25, normPurchaseOwners: 6, explicitCleanerNeeds: 2,
      machineRows: 7, readyProjectTestOperationReused: true, commonCoreChanged: false,
      densityFixtureOnly: true, engineeringAccepted: false, ordinaryUiAccepted: false };
  },
  expectedParentShape: [0, 0, 0], benchmarkOrdinal: 157,
  validationScenario: 'S2736_KRER12_01_028_02_PVC_FIELD_CONCRETE_READY_INSULATION',
  passport: {
    canonicalRuName: title, workKey,
    physicalResultRu: 'Однослойное поле ПВХ1.2мм с разделительным слоем, механическим креплением, горячей сваркой и местным усилением Т-стыков',
    includedScopeRu: [
      'Шесть материалов исходной КРЕР, нормативные труд и семь машин раскрыты по100м²',
      'Выбранные V-RP1.2/V-SR1.5 привязаны к техническим листам; нормативный бюджет требует согласования замены',
      'Совместимый очиститель рассчитывается по обмеренной обработке и подтверждённой плотности канистры3л',
      'Запас и резерв учитываются до единственного округления заказа к упаковке; штучная потребность и наличие целочисленные',
      'Ручная оснастка подрядчика раскрыта, входит в труд; машинисты входят в машины, без второй оплаты',
      'Готовая операция отдельных проектных испытаний подключается только по явному решению',
    ],
    excludedScopeRu: [
      'Утепление, пароизоляция, формирование уклонов, ремонт основания и примыкания без проекта',
      'Раскладка и ветровая схема крепления из одной площади',
      'Подмена существующих PVC1.5/FPO1.8 этим нормативом1.2',
      'Растворитель646 в закупке, выдуманная плотность, обмер очистки и цены',
    ],
  },
  applicability: { country: 'KG', primaryMeasureParameterId: 'area_m2', knownScopeParameters: ['area_m2'], ordinaryUserInputCount: 1,
    scope: 'PRELIMINARY_KRER_PVC_1_2MM_FIELD_READY_INSULATION_CONCRETE', hiddenDemoFixtureInputs: false,
    ordinaryUiAccepted: false, engineeringAccepted: false, normativeBudgetNotWindOrRollLayout: true },
  binding: { rowId: 'pvc-roof:material:field', applicability: {
    technology_class: 'MECHANICALLY_FIXED_PVC_1_2MM_ON_READY_INSULATION_CONCRETE', operation_class: 'BOUNDED_ROOF_FIELD',
    source_id: sourceId, norm_id: normId, exact_locator: sourceMetadata.exact_locator,
    quantity_basis: 'KRER_RESOURCE_BUDGET_PER_100M2_NOT_FINAL_ROLL_LAYOUT', norm_replacement_approval_required: true,
  } },
  locator: { key: 'pvc-roof-concrete-krer12-s27-36-v1', payload: {
    kind: 'EXACT_KRER_FIELD_AND_PINNED_MANUFACTURER_VARIANTS', sourcePackSha256: sourceMetadata.definition_hash,
    originalArtifactSha256: sourceMetadata.artifact_sha256, ordinaryKnownInputs: ['area_m2'],
    visibleProfileInputs: Object.keys(definition.runtimeInput), densityFixtureNeverRuntimeDefault: true,
    originalUnits: { screws: '4×100шт', roofDowels: '4×100шт', anchors: '0.4×10шт', solvent: '0.0009т=0.9кг; informational only' },
  } },
  search: {
    primaryUom: 'm2', canonicalNameRu: title,
    aliases: ['поле ПВХ кровли1.2мм бетонное основание', 'ПВХ кровля1.2мм готовый утеплитель', 'КРЕР12-01-028-02'],
    shortScopeRu: 'Предварительный нормативный бюджет поля ПВХ1.2мм по готовому утеплителю и бетонному основанию. Примыкания и соседние слои отдельно; очистка по обмеру, плотность по паспорту.',
    keyDistinguishingParameters: ['area_m2', 'roof_height_m', 'roof_applicability_mode'],
    clarificationFields: ['cleaned_surface_m2', 'cleaner_density_kg_l', 'roof_applicability_mode', 'separate_weld_tests'],
    includedBoundaries: ['Дорнит, раскрой, крепление, сварка и усиление Т-стыков поля', 'Материалы, нормативный труд и машины', 'Явно выбранная дополнительная операция испытаний'],
    excludedBoundaries: ['Непринятое основание, утепление и пароизоляция', 'Примыкания, воронки, парапеты без проекта', 'Проектная ветровая схема и окончательная раскладка'],
    extraSearchTermsRu: 'ПВХ мембрана кровля1.2мм бетон готовый утеплитель LOGICROOF V-RP V-SR Дорнит КРЕР12-01-028-02',
    sourceProvenance: { exactNormAdded: true, readyProjectTestOperationReused: true, commonCompilerReused: true,
      hiddenDemoFixtureInputs: false, engineeringApprovalClaimed: false, productReplacementApprovalRequired: true },
  },
  catalogAppend: {
    identity: { namespace: 'global', domain: 'roofing', sourceIdentity: 'master-work:' + workKey, workKey, titleRu: title, denominatorEligible: true },
    searchPlacement: {
      groupMode: 'create', groupId, groupNameRu, domainId: 'roofing', systemId: 'flat_roof', subsystemId: groupId,
      assemblyId: groupId, workFamilyId: 'pvc_1_2mm_concrete_field_krer12', breadcrumb: [groupNameRu],
      groupOracleDisposition: { contract: 'rik-expo-app.s27-3.catalog-append.v1', disposition: 'EXACT_PHYSICAL_WORK_GROUP', exactRateFamily: 'KRER12_01_028_02' },
      membershipOrdinal: 0,
      independentDisposition: { contract: 'rik-expo-app.s27-3.catalog-append.v1', classification: 'CANONICAL_VISIBLE', exactPhysicalIdentity: true, appendedWithoutReplacingExistingIdentity: true },
      elementType: 'WORK', operationKind: 'NEW_INSTALLATION', technologyVariant: 'Поле ПВХ1.2мм по готовому утеплителю на бетоне',
      constructionState: 'NEW', normativeClassifiers: ['КРЕР12-01-028-02'],
      applicabilityTags: ['PVC_ROOF_1_2MM', 'CONCRETE_BEARING_BASE', 'INSULATION_ALREADY_ACCEPTED', 'MECHANICAL_FIXING', 'PRELIMINARY_NORM_BUDGET'],
      publicationState: 'ADMITTED_BACKEND', catalogOrigin: 'GLOBAL', adjudicationClass: 'EFFECTIVE_WORK', selectable: true,
    },
  },
  forbiddenAdjacentMatchers: [/rc09:reinforced_pvc_roof_membrane_1_5mm|bridge:|road-base:|sarnafil/i],
  owner: 'S2736_PVC_ROOF_CONCRETE', receiptFileStem: 'pvc_roof_concrete_krer12',
};

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2736PvcRoofConcreteKrer12Successor.ts')) {
  void runMasterSingleDefinitionSuccessorR1(pvcRoofConcreteS2736PublishConfig).catch(error => {
    process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;
  });
}
