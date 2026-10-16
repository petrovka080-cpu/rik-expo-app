// Governed partial EUROFLEX material profile through the shared publisher.
// No publication runs on import.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  buildMasterScopeReadiness,
  resolveMasterSingleDefinitionBindingRowIds,
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig,
} from './prepareMasterSingleDefinitionSuccessorR1';
import {
  compileEuroflexRecycling50MaterialsR1,
  euroflexRecycling50MaterialDefinitionR1,
  euroflexRecycling50PrimaryMeasureParameterIdR1,
  euroflexRecycling50SourcePackR1 as pack,
} from '../../../src/lib/estimate/v4/euroflexRecycling50MaterialsR1';

type Parent = Readonly<{releaseId: string; searchReleaseId: string}>;
const selectedParent: Parent = {
  releaseId: '74563994-33de-5963-870a-b6d4b86f0143',
  searchReleaseId: '611c7ccb-6014-5a82-8995-43270d72d0f4',
};
const catalogId = 'canonical-work:master:rubber_playground_surface_euroflex_recycling_50mm_rectangular';
const workKey = 'rubber_playground_surface_euroflex_recycling_50mm_rectangular';
const sourceIdentity = 'manufacturer:euroflex:recycling-50mm:rectangular-t-joints';
const groupId = 'wg:master:playground_rubber_tile_surface';
const groupNameRu = 'Резиновое покрытие детских площадок';
const titleRu = 'Плитки EUROFLEX Recycling 50 мм для прямоугольного покрытия — частичный состав';
const packPath = 'data/estimate-benchmarks/source-packs/euroflex-recycling50-materials-s27-75.json';
const primaryId = 'effective_resource_quantity_euroflex_recycling_50mm_installed_area';
const manifestPath = '.release-runtime/r568/s27-75/euroflex-materials/primary/euroflex-two-primary-documents-manifest-v1.json';
const manifestSha256 = '0ab53a42ce69c7042bc1d9e981f24d3d00548b4a2ad58c1dfcea5c2c9e743285';
const independentReviewSha256 = 'a92ec69df15124a963696b442931317681a9da97ae002100afd79e564300d694';
const appendDecisionReviewSha256 = '9d7f9612d870f9eb65fef4dabe503972295890c4d6a08c2f43b218761758059d';
const primaryDocuments = [
  {
    id: 'euroflex-pds-9301-r05-2026-09',
    localArtifact: '.release-runtime/r568/s27-75/euroflex-materials/primary/EUROFLEX-9301-R05-2026-09.pdf',
    sha256: '5d5a503a1879d7f9ada9939a9c5287a866255311926b6ce9e4b1d4f4c13f28fb',
  },
  {
    id: 'euroflex-ii-9301-1-r11-2025-08',
    localArtifact: '.release-runtime/r568/s27-75/euroflex-materials/primary/EUROFLEX-9301-1-R11-2025-08.pdf',
    sha256: '756186d6bd37e6bccbd4d9b6faf31b0747baf121773023eb6a907306fa29f81a',
  },
] as const;

// Independent declarations, not a list inferred from the current emitted rows.
export const euroflexS2775BindingRowIds = [
  'euroflex:recycling-50mm:installed-area',
  'euroflex:recycling-50mm:full-consumed',
  'euroflex:recycling-50mm:full-order',
  'euroflex:recycling-50mm:full-packages',
  'euroflex:recycling-50mm:full-remaining',
  'euroflex:recycling-50mm:full-free',
  'euroflex:recycling-50mm:full-shortage',
  'euroflex:recycling-50mm:full-reserve-deficit',
  'euroflex:recycling-50mm:half-consumed',
  'euroflex:recycling-50mm:half-order',
  'euroflex:recycling-50mm:half-packages',
  'euroflex:recycling-50mm:half-remaining',
  'euroflex:recycling-50mm:half-free',
  'euroflex:recycling-50mm:half-shortage',
  'euroflex:recycling-50mm:half-reserve-deficit',
] as const;
export const euroflexS2775UnresolvedRowIds = [
  'euroflex:recycling-50mm:open-layout',
  'euroflex:recycling-50mm:open-substrate',
  'euroflex:recycling-50mm:open-edge-boundary',
  'euroflex:recycling-50mm:open-perimeter-glue',
  'euroflex:recycling-50mm:open-installation-labor',
  'euroflex:recycling-50mm:open-tools',
  'euroflex:recycling-50mm:open-delivery',
  'euroflex:recycling-50mm:open-protection-cleanup',
  'euroflex:recycling-50mm:open-safety-acceptance',
] as const;
// The source obligations were authored before the production rows, in the
// independent review identified above. The tuple links below are checked separately.
const independentObligationLinks = [
  ['bounded-manufacturer-slab-layout', 'factory-full-recycling-50mm-slabs', 0, 'ROW', 'full-order'],
  ['bounded-manufacturer-slab-layout', 'factory-half-recycling-50mm-slabs', 0, 'ROW', 'half-order'],
  ['site-installation-and-completion', 'substrate', 1, 'ROW', 'open-substrate'],
  ['site-installation-and-completion', 'edge-boundary', 1, 'ROW', 'open-edge-boundary'],
  ['site-installation-and-completion', 'perimeter-glue', 1, 'ROW', 'open-perimeter-glue'],
  ['site-installation-and-completion', 'installation-labor', 1, 'ROW', 'open-installation-labor'],
  ['site-installation-and-completion', 'tools', 1, 'ROW', 'open-tools'],
  ['site-installation-and-completion', 'delivery', 1, 'ROW', 'open-delivery'],
  ['site-installation-and-completion', 'protection-cleanup', 1, 'ROW', 'open-protection-cleanup'],
  ['site-installation-and-completion', 'safety-acceptance', 1, 'ROW', 'open-safety-acceptance'],
  ['non-modular-layout', 'verified-cut-and-fit-plan', 1, 'ROW', 'open-layout'],
  ['factory-slab-composition', 'included-connectors-full-format', 0, 'INCLUDED_IN_PARENT', 'full-order'],
  ['factory-slab-composition', 'included-connectors-half-format', 0, 'INCLUDED_IN_PARENT', 'half-order'],
] as const;
const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

export function euroflexRecycling50MaterialsS2775Config(
  parent: Parent = selectedParent,
): MasterSingleDefinitionSuccessorConfig {
  assert.deepEqual(parent, selectedParent, 'S2775_EXACT_REVIEWED_PARENT_PAIR_REQUIRED');
  assert.equal(euroflexRecycling50PrimaryMeasureParameterIdR1, primaryId);
  assert.equal(pack.sourceId, 'euroflex_recycling50_materials_s2775');
  assert.equal(pack.normId, 'euroflex_recycling50_geometry_balance_s2775');
  assert.deepEqual(pack.catalogBinding, {
    decision: 'EXPLICIT_NEW_PROFILE_APPEND', persisted: false, catalogId, sourceIdentity, workKey,
    groupMode: 'create', groupId, decisionReviewSha256: appendDecisionReviewSha256,
  });
  assert.deepEqual(JSON.parse(readFileSync(resolve(packPath), 'utf8')), pack, 'S2775_IMPORTED_PACK_FILE_DRIFT');

  const definition = euroflexRecycling50MaterialDefinitionR1();
  // A validation fixture only. Neither measured geometry nor supplier facts become defaults.
  const acceptanceInput = {surface_length_along_rows_mm: 6000, surface_width_across_rows_mm: 4000};
  const includedScopeRu = [
    pack.scopeRu,
    'Измеренная площадь и расход двух заводских форматов по модульной раскладке; показатели расхода и баланса справочные.',
    'Отдельный заказ полных и половинных плиток по фактическому наличию, резерву и подтверждённой кратности поставки.',
    'В составе изделия учтены соединительные штифты. Отдельное количество и отдельная закупка штифтов не назначены.',
  ];
  const excludedScopeRu = [
    ...pack.excludedUnprovenAssumptionsRu,
    'Восемь потребностей монтажа и завершения остаются открытыми; для немодульного участка дополнительно нужна подтверждённая раскладка и резка.',
    'Паспорт плиты с указанной высотой падения не подтверждает безопасность, соответствие зон падения и приёмку всей площадки.',
  ];
  const config: MasterSingleDefinitionSuccessorConfig = {
    contract: pack.contract,
    stopCode: 'S2775_EUROFLEX_RECYCLING50_MATERIALS',
    applicationName: 's2775-euroflex-recycling50-materials',
    expectedBranch: 'codex/r4-a5-clean-08b18902',
    masterPath: 'C:/Users/User/Documents/Codex/2026-10-15/files-pasted-by-the-user-c/outputs/MASTER_TZ_GOX_BUILD_PRODUCTION.md',
    masterSha256: '482a69faabd5b78ca284b5ffcc590e512e8ad543b514357ead97c479c0b8ebda',
    parentReleaseId: parent.releaseId,
    parentSearchReleaseId: parent.searchReleaseId,
    currentReleasePath: resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
    outputRoot: resolve('.release-runtime/r568/s27-75/euroflex-materials/publication'),
    sourcePaths: [
      'scripts/estimate/r4a13/prepareS2775EuroflexRecycling50Materials.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts',
      'scripts/estimate/r4a13/s2775EuroflexMaterialIntegration.test.ts',
      'scripts/estimate/r4a13/s2775SharedPublisherGuards.test.ts',
      'src/lib/estimate/v4/euroflexRecycling50MaterialsR1.ts',
      packPath, manifestPath, ...primaryDocuments.map(source => source.localArtifact),
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts',
      'src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'src/lib/estimate/backendPlatform/canonicalMasterSingleDefinitionSourceOriginR1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts',
      'src/lib/estimate/backendPlatform/contracts.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation.ts',
      'src/features/consumerRepair/consumerCanonicalBaselineCompile.ts',
      'src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts',
      'src/features/consumerRepair/consumerCanonicalDerivedPrimaryMeasureS2775.test.ts',
      'src/lib/estimate/professionalUnitRegistry.ts',
      'src/lib/estimate/v4/engineeringUnitRegistryV4.ts',
      'src/lib/ai/globalEstimate/formatEstimateUnitLabel.ts',
    ],
    catalogId,
    sourceId: pack.sourceId,
    normId: pack.normId,
    sourceMetadata: {
      source_title: pack.sourceTitleRu,
      source_authority: 'KRAIBURG Relastec GmbH & Co. KG — EUROFLEX',
      source_kind: 'COMPOSITE_MANUFACTURER_PRODUCT_AND_INSTALLATION_GEOMETRY_NOT_COMPLETE_SITE_NORM',
      official_url: null,
      artifact_sha256: sha256(readFileSync(resolve(packPath))),
      exact_locator: pack.sources.map(source =>
        source.id + ': ' + source.officialUrl + '; ' + source.locatorRu + '; SHA256 ' + source.sha256).join(' | '),
      use_restriction: 'Размеры двух изделий и условия производителя применяются к измеренной геометрии. ' +
        'Количество к заказу требует самостоятельных фактов о наличии, резерве и кратности поставки каждого формата. ' +
        'Труд, основание, клей, доставка, оснащение, защита, уборка, безопасность и приёмка не нормированы размерами плитки. ' +
        'Девять открытых позиций определения, включая условную раскладку с резкой; полный технический состав не принят.',
    },
    parameterDefinitions: definition.parameters,
    formulaDefinitions: definition.formulas,
    resourceDefinitions: definition.resources,
    shortInput: {...acceptanceInput},
    acceptanceInput,
    runtimeProfileInput: {},
    runtimeProfileClassification: {},
    runtimeProfileSourceIds: {},
    expectedParentShape: [0, 0, 0],
    // Metadata only, as in the existing append writer. No case0741/old definition is adopted.
    benchmarkOrdinal: 0,
    validationScenario: 'S2775_EXPLICIT_NEW_EUROFLEX_MATERIAL_PROFILE_15_BINDINGS_13_OBLIGATIONS_9_OPEN_NEEDS',
    passport: {
      canonicalRuName: titleRu,
      workKey,
      physicalResultRu: 'Частичный расчёт плиток EUROFLEX Recycling толщиной 50 мм для прямоугольного участка. ' +
        'Монтаж и завершение покрытия сохраняются открытыми потребностями.',
      includedScopeRu,
      excludedScopeRu,
      independentCompletenessMap: pack.independentCompletenessMap,
      unresolvedApplicableResourceRowIds: euroflexS2775UnresolvedRowIds,
    },
    applicability: {
      primaryMeasureParameterId: primaryId,
      exactManufacturerProduct: 'EUROFLEX Recycling',
      thicknessMm: 50,
      manufacturerFormatsMm: [[500, 500], [500, 250]],
      rectangularWithoutInternalObstacles: true,
      fixedRowOrientation: true,
      rowModuleMm: 500,
      everySecondRowStartsWithFactoryHalf: true,
      requiredObjectFactIds: [...pack.applicability.requiredObjectFactIds],
      productListedMaximumFreeFallHeightM: 1.5,
      nonModularLayoutRequiresCutPlan: true,
      manufacturerHeightIsNotInstalledPlaygroundCertification: true,
      stockReserveAndSupplyQuantumIndependentForEachFormat: true,
      unknownSupplyFactsHaveNoDefault: true,
      quantityScope: 'PARTIAL',
      fullTechnicalAcceptance: false,
      acceptedNewCompleteTypes: 0,
    },
    binding: {
      rowId: euroflexS2775BindingRowIds[0],
      additionalRowIds: euroflexS2775BindingRowIds.slice(1),
      applicability: {
        sourceKind: 'MANUFACTURER_DIMENSIONS_WITH_PROJECT_GEOMETRY_AND_EFFECTIVE_PURCHASE_BALANCE',
        exactProduct: 'EUROFLEX Recycling 50 мм',
        oneCompositeLocator: true,
        installationNormQuantityAccepted: false,
        fullTechnicalAcceptance: false,
      },
    },
    locator: {
      key: 'euroflex-recycling50-materials-s2775',
      payload: {
        sourcePack: pack,
        compositeSourceArtifact: packPath,
        primaryArtifactManifestPath: manifestPath,
        primaryArtifactManifestSha256: manifestSha256,
        productDocuments: pack.sources,
        independentlyDeclaredBindingRowIds: euroflexS2775BindingRowIds,
        independentCompletenessEvidenceSha256: independentReviewSha256,
        explicitAppendDecisionEvidenceSha256: appendDecisionReviewSha256,
        fixtureValuesAreNotObjectDefaults: true,
        wholePlaygroundAcceptance: false,
        fullTechnicalAcceptance: false,
        acceptedNewCompleteTypes: 0,
      },
    },
    search: {
      primaryUom: 'm2',
      canonicalNameRu: titleRu,
      aliases: ['Расчёт резиновой плитки EUROFLEX Recycling 50 мм',
        'Полные и половинные плитки EUROFLEX для прямоугольной площадки'],
      shortScopeRu: 'Площадь и раскладка полных плиток 500 × 500 мм и заводских половинных плиток 500 × 250 мм. ' +
        'Наличие, резерв и кратность поставки задаются отдельно. Монтаж и приёмка остаются открытыми.',
      keyDistinguishingParameters: ['surface_length_along_rows_mm', 'surface_width_across_rows_mm',
        'equipment_max_free_fall_height_m', 'prepared_base_condition', 'fall_zone_condition',
        'full_supply_specification', 'half_supply_specification'],
      clarificationFields: definition.parameters
        .filter(parameter => parameter.truth_metadata.visibility_role === 'USER_INPUT')
        .map(parameter => parameter.parameter_id),
      includedBoundaries: includedScopeRu,
      excludedBoundaries: excludedScopeRu,
      extraSearchTermsRu: 'резиновая плитка детская игровая площадка ударопоглощающее покрытие еврофлекс евро флекс Recycling половинная плитка',
      sourceProvenance: {
        sourcePack: packPath,
        sourceManifestSha256: manifestSha256,
        primaryMeasureParameterId: primaryId,
        manufacturerDimensionsWithMeasuredGeometry: true,
        explicitNewProfileAppend: true,
        wholeTypeReplaced: false,
        sourceQuantityNormsForInstallationAccepted: 0,
        quantityScope: 'PARTIAL',
        fullTechnicalAcceptance: false,
        acceptedNewCompleteTypes: 0,
      },
    },
    catalogAppend: {
      requireUniqueWorkKey: true,
      identity: {namespace: 'global', domain: 'landscaping', sourceIdentity, workKey, titleRu, denominatorEligible: true},
      searchPlacement: {
        groupMode: 'create', groupId, groupNameRu, domainId: 'landscaping', systemId: 'landscaping',
        subsystemId: groupId, assemblyId: groupId, workFamilyId: groupId, breadcrumb: [groupNameRu],
        groupOracleDisposition: {contract: pack.contract, disposition: 'EXACT_PHYSICAL_WORK_GROUP'},
        membershipOrdinal: 0,
        independentDisposition: {contract: pack.contract, classification: 'CANONICAL_VISIBLE',
          exactPhysicalIdentity: true, preliminaryCompositionOnly: true, fullTechnicalAcceptance: false},
        elementType: 'WORK', operationKind: 'NEW_INSTALLATION',
        technologyVariant: 'EUROFLEX_RECYCLING_50MM_RECTANGULAR_FIXED_T_JOINTS',
        constructionState: 'NEW', normativeClassifiers: [],
        applicabilityTags: ['PLAYGROUND_RUBBER_TILE_SURFACE', 'EUROFLEX_RECYCLING_50MM',
          'RECTANGULAR_FACTORY_FULL_AND_HALF', 'PARTIAL_MATERIAL_COMPOSITION'],
        publicationState: 'ADMITTED_BACKEND', catalogOrigin: 'GLOBAL',
        adjudicationClass: 'EFFECTIVE_WORK', selectable: true,
      },
    },
    forbiddenAdjacentMatchers: [/Softsystem|EPDM|1000\s*[×xх]\s*500/iu],
    owner: 'S2775_EUROFLEX_MATERIALS_SINGLE_WRITER',
    receiptFileStem: 'euroflex_recycling50_materials',
    verifyCore: async () => {
      assert.equal(pack.quantityScope, 'PARTIAL');
      assert.equal(pack.fullTechnicalAcceptance, false);
      assert.equal(pack.productionEligible, false);
      assert.equal(pack.activationAllowed, false);
      assert.deepEqual(definition.runtimeInput, {});
      assert(definition.parameters.every(parameter => parameter.default_value == null));
      assert.deepEqual(pack.normativeBindingRowIds, euroflexS2775BindingRowIds);
      assert.deepEqual(pack.unresolvedApplicableResourceRowIds, euroflexS2775UnresolvedRowIds);
      assert.deepEqual(definition.resources.map(resource => resource.row_id),
        [...euroflexS2775BindingRowIds, ...euroflexS2775UnresolvedRowIds]);
      assert.deepEqual(resolveMasterSingleDefinitionBindingRowIds(config, definition.resources,
        [config.locator.key]), euroflexS2775BindingRowIds);
      assert.equal(config.projectSourcePackagePath, undefined);

      assert.equal(pack.sourceManifestPath, manifestPath);
      assert.equal(pack.sourceManifestSha256, manifestSha256);
      assert.equal(sha256(readFileSync(resolve(manifestPath))), manifestSha256);
      const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
      assert.equal(manifest.contract, 'rik-expo-app.s27-75.euroflex-two-primary-documents.v1');
      assert.deepEqual(manifest.sources, pack.sources.map(source => ({
        id: source.id, titleRu: source.titleRu, edition: source.edition,
        officialUrl: source.officialUrl, localArtifact: source.localArtifact,
        sha256: source.sha256, locatorRu: source.locatorRu,
      })));
      assert.equal(pack.sources.length, primaryDocuments.length);
      const sourceChecks = primaryDocuments.map((source, index) => {
        assert.equal(pack.sources[index].id, source.id);
        assert.equal(pack.sources[index].localArtifact, source.localArtifact);
        assert.equal(pack.sources[index].sha256, source.sha256);
        const actualSha256 = sha256(readFileSync(resolve(source.localArtifact)));
        assert.equal(actualSha256, source.sha256, 'S2775_PRIMARY_DOCUMENT_SHA256:' + source.id);
        return {id: source.id, path: source.localArtifact, sha256: actualSha256};
      });

      const completeness = pack.independentCompletenessMap;
      assert.equal(completeness.sourceKind, 'PRODUCT_SYSTEM_TDS');
      assert.equal(completeness.generatedFromCurrentRows, false);
      assert.equal(completeness.evidenceSha256, independentReviewSha256);
      assert.equal(completeness.entries.length, 13);
      assert.deepEqual(completeness.entries.map(entry => [
        entry.operationId, entry.expectedResourceId, entry.sourceId, entry.resolution.kind,
        entry.resolution.rowId ?? entry.resolution.parentRowId, entry.formulaId,
      ]), independentObligationLinks.map(([operationId, expectedResourceId, sourceIndex, kind, key]) => [
        operationId, expectedResourceId, primaryDocuments[sourceIndex].id, kind,
        'euroflex:recycling-50mm:' + key, 'euroflex:recycling-50mm:formula:' + key,
      ]));
      assert.deepEqual(validateIndependentCompletenessMapReferences({
        completenessMap: completeness, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
      }), []);
      const scopeReadiness = buildMasterScopeReadiness(euroflexS2775UnresolvedRowIds, definition.resources);
      assert.equal(scopeReadiness.quantityScope, 'PARTIAL');
      assert.equal(scopeReadiness.technicalScopeStatus, 'NEEDS_SOURCE');

      const primary = definition.parameters.find(parameter => parameter.parameter_id === primaryId);
      assert(primary);
      assert.equal(primary.unit_id, 'm2');
      assert.equal(primary.truth_metadata.visibility_role, 'INTERNAL_ONLY');
      assert.equal(primary.truth_metadata.value_source_role, 'COMPILER_DERIVED_RESOURCE_QUANTITY');
      assert.deepEqual(primary.truth_metadata.effective_resource_quantity_v1, {
        sourceRowId: euroflexS2775BindingRowIds[0], unitId: 'm2',
      });
      assert(definition.formulas.some(formula => formula.input_parameter_ids.includes(primaryId)));
      // This checks the integrated config/model connection, not the historical 20+6 control suite.
      const compiled = await compileEuroflexRecycling50MaterialsR1(catalogId, acceptanceInput);
      assert.equal(compiled.parameters[primaryId], '24');
      const area = compiled.rows.find(row => row.row_id === euroflexS2775BindingRowIds[0]);
      assert.equal(area?.quantity, '24');
      assert.equal(area?.unit_id, 'm2');
      for (const role of ['full', 'half']) {
        const order = compiled.preliminaryNeeds.find(need => need.row_id === 'euroflex:recycling-50mm:' + role + '-order');
        assert(order);
        assert.equal(order.quantity, null);
        assert.notEqual(order.procurement_readiness, 'READY');
        for (const suffix of ['usable_stock_pcs', 'reserve_pcs', 'supply_quantum_pcs', 'supply_specification'])
          assert.equal(compiled.parameters[role + '_' + suffix], undefined);
      }
      assert.deepEqual(compiled.preliminaryNeeds.filter(need => need.row_id.startsWith('euroflex:recycling-50mm:open-'))
        .map(need => need.row_id).sort(), euroflexS2775UnresolvedRowIds.filter(id => id !== 'euroflex:recycling-50mm:open-layout').slice().sort());
      return {
        status: 'GREEN_S2775_CONFIG_SOURCE_AND_PARTIAL_SCOPE_CONNECTION',
        serializedSha256: sha256(JSON.stringify(compiled)),
        sourceChecks, sourceManifestSha256: manifestSha256,
        bindingRowCount: 15, independentObligationCount: 13, unresolvedDefinitionRowCount: 9,
        measuredPrimaryUnit: 'm2', validationGeometryAreaM2: '24',
        runtimeProfileInput: {}, unknownSupplierFactsRemainUnknown: true,
        scopeReadiness, fullTechnicalAcceptance: false, acceptedNewCompleteTypes: 0,
        persistedReopenTested: false, serverApiTested: false, currentWebTested: false, androidTested: false, pdfTested: false,
      };
    },
  };
  return config;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2775EuroflexRecycling50Materials.ts')) {
  void runMasterSingleDefinitionSuccessorR1(euroflexRecycling50MaterialsS2775Config()).catch(error => {
    process.stderr.write(String(error.stack ?? error) + '\n');
    process.exitCode = 1;
  });
}

