import { resolve, sep } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { runMasterSingleDefinitionSuccessorR1, hashMasterSingleDefinitionSuccessorReceiptR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { pvcRoofRussianPresentationS2737PublishConfig as russian } from './prepareS2737PvcRoofRussianPresentationSuccessor';
import { pvcRoofConcreteS2736PublishConfig as field } from './prepareS2736PvcRoofConcreteKrer12Successor';
import {
  compilePvcRoofCleanerVolume472219S2737 as compile, PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737 as definition,
  PVC_ROOF_VOLUME_CLEANER_CATALOG_S2737 as catalogId, PVC_ROOF_VOLUME_CLEANER_WORK_KEY_S2737 as workKey,
  PVC_ROOF_VOLUME_CLEANER_SOURCE_ID_S2737 as sourceId, PVC_ROOF_VOLUME_CLEANER_NORM_ID_S2737 as normId,
  PVC_ROOF_VOLUME_CLEANER_SOURCE_METADATA_S2737 as sourceMetadata, PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737 as cleanerRowId,
} from '../../../src/lib/estimate/v4/pvcRoofCleanerVolume472219S2737';
import { PVC_ROOF_FIELD_DISPLAY_NAME_RU } from '../../../src/lib/estimate/backendPlatform/russianTechnologyTitleR542';

type Parent = { releaseId: string; searchReleaseId: string };
const title = PVC_ROOF_FIELD_DISPLAY_NAME_RU + '; очиститель ЕКН 472219 по объёмной листовке';
const packPath = 'data/estimate-benchmarks/source-packs/pvc-roof-cleaner-472219-volume-s27-37.json';
const prerequisitePath = resolve(russian.outputRoot, 'acceptance.json');
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

/** The first dry-run can use the immutable current parent. An apply requires
 * the separately sealed Russian/process publication; retries retain that same
 * prerequisite rather than following the pointer written by this publisher. */
export function resolvePvcRoofVolumeCleanerParentS2737(requirePrerequisite: boolean): Parent {
  if (!existsSync(prerequisitePath)) {
    assert(!requirePrerequisite, 'S2737_VOLUME_REQUIRES_COMPLETED_RUSSIAN_PROCESS_PUBLICATION');
    return { releaseId: russian.parentReleaseId, searchReleaseId: russian.parentSearchReleaseId };
  }
  const sealed = JSON.parse(readFileSync(prerequisitePath, 'utf8'));
  const { receiptSha256, ...body } = sealed;
  assert.equal(hashMasterSingleDefinitionSuccessorReceiptR1(body), receiptSha256, 'S2737_PREREQUISITE_RECEIPT_HASH');
  assert.equal(body.schemaVersion, russian.contract + '.receipt.v1');
  assert.equal(body.status, 'GREEN_S2737_PVC_ROOF_RUSSIAN_PRESENTATION_PREPARED_NOT_ACTIVE');
  assert.equal(body.mutationPerformed, true);
  assert.equal(body.master.sha256, russian.masterSha256);
  assert.equal(body.source.branch, russian.expectedBranch);
  assert.equal(body.source.hashedDirtySourceAccepted, false);
  assert.equal(body.audit.unrelatedManifestChanges, 0);
  assert(/^[a-f0-9]{40}$/.test(body.source.head));
  execFileSync('git', ['merge-base', '--is-ancestor', body.source.head, 'HEAD'], { windowsHide: true, stdio: 'pipe' });
  const expectedPaths = new Set([...russian.sourcePaths,
    'scripts/estimate/r4a13/projectSourcePackageBindingR1.ts', 'scripts/estimate/r4a13/projectSourcePackagePreflightR1.ts']);
  assert.equal(body.source.sourceHashes.length, expectedPaths.size);
  for (const source of body.source.sourceHashes) {
    assert(expectedPaths.delete(source.path), 'S2737_PREREQUISITE_SOURCE_SCOPE');
    const absolute = resolve(source.path);
    assert(absolute.startsWith(process.cwd() + sep), 'S2737_PREREQUISITE_SOURCE_PATH');
    assert.equal(hash(readFileSync(absolute)), source.sha256, 'S2737_PREREQUISITE_SOURCE_CHANGED');
  }
  assert.equal(expectedPaths.size, 0);
  for (const id of [body.successor.releaseId, body.successor.searchReleaseId]) {
    assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id));
  }
  return { releaseId: body.successor.releaseId, searchReleaseId: body.successor.searchReleaseId };
}

export function pvcRoofVolumeCleanerS2737PublishConfig(parent: Parent): MasterSingleDefinitionSuccessorConfig {
  assert(field.catalogAppend);
  return {
    ...russian,
    contract: 'rik-expo-app.s27-37.pvc-roof-volume-cleaner.v1', stopCode: 'S2737_PVC_ROOF_VOLUME_CLEANER',
    applicationName: 's2737-pvc-roof-volume-cleaner', parentReleaseId: parent.releaseId, parentSearchReleaseId: parent.searchReleaseId,
    outputRoot: resolve('.release-runtime/r568/s27-37/pvc-roof-volume-cleaner'),
    sourcePaths: [...russian.sourcePaths, packPath,
      'src/lib/estimate/v4/pvcRoofCleanerVolume472219S2737.ts',
      'tests/estimateNorms/pvcRoofCleanerVolume472219S2737.contract.test.ts',
      'tests/estimateNorms/pvcRoofVolumeCleanerPublisherS2737.contract.test.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor.ts'],
    catalogId, sourceId, normId, sourceMetadata,
    parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
    shortInput: { area_m2: 100 }, acceptanceInput: { area_m2: 100, cleaned_surface_m2: 20, ...definition.runtimeInput },
    runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification,
    runtimeProfileSourceIds: definition.runtimeSourceIds,
    expectedParentShape: [0, 0, 0], benchmarkOrdinal: 160,
    validationScenario: 'S2737_PVC_FIELD_CLEANER_472219_VOLUME',
    passport: { ...russian.passport, canonicalRuName: title, workKey,
      includedScopeRu: [...russian.passport.includedScopeRu.filter(scope => !/плотност|канистры3л/.test(scope)),
        'Отдельная объёмная листовка ЕКН 472219: 0,25 л/м² фактической обработки, канистра 3 л; плотность не вычисляется',
        'Наличие, резерв, цена, ручное количество и подтверждение новой версии отделены от прежнего массового профиля'],
      excludedScopeRu: [...russian.passport.excludedScopeRu, 'Перенос килограммовых остатков, цен и прежнего подтверждения продукта в литры'],
    },
    applicability: { ...russian.applicability, scope: 'PRELIMINARY_KRER_PVC_FIELD_WITH_PINNED_472219_VOLUME_LEAFLET',
      productSourceVersionConfirmationRequired: true, densityConversionPerformed: false },
    binding: { rowId: cleanerRowId, applicability: { ...russian.binding.applicability, source_id: sourceId, norm_id: normId,
      exact_locator: sourceMetadata.exact_locator,
      quantity_basis: 'KRER_FIELD_REUSED_AND_SEPARATE_472219_LITRE_RATE_PER_ACTUAL_CLEANED_M2',
      selected_cleaner_leaflet_sha256: sourceMetadata.primarySources.cleaner.artifactSha256, cleaner_quantity_unit: 'l' } },
    locator: { key: 'pvc-roof-volume-cleaner-472219-s27-37-v1', payload: {
      kind: 'REUSED_KRER_FIELD_AND_SEPARATE_VOLUME_LEAFLET', sourcePackSha256: sourceMetadata.definition_hash,
      primarySources: sourceMetadata.primarySources, ordinaryKnownInputs: ['area_m2'],
      missingProjectInputs: ['cleaned_surface_m2'], oldMassInputsTransferAllowed: false,
    } },
    search: { ...russian.search, canonicalNameRu: title,
      aliases: ['ПВХ-мембрана 1,2 мм очиститель 472219', 'LOGICROOF очиститель объёмная листовка', 'кровля с очистителем 0,25 л/м²'],
      shortScopeRu: 'Выбранная укладка ПВХ-мембраны 1,2 мм; очиститель ЕКН 472219 по отдельной объёмной листовке. Обмер очистки и подтверждение поставленного продукта обязательны; плотность и кг в л не переводятся.',
      clarificationFields: ['cleaned_surface_m2', 'roof_applicability_mode', 'separate_weld_tests'],
      extraSearchTermsRu: 'ПВХ кровля мембрана 1,2 мм LOGICROOF очиститель ТЕХНОНИКОЛЬ ЕКН 472219 литры канистра 3 л',
    },
    catalogAppend: { identity: { ...field.catalogAppend.identity, sourceIdentity: 'master-work:' + workKey, workKey, titleRu: title },
      searchPlacement: { ...field.catalogAppend.searchPlacement, groupMode: 'join', membershipOrdinal: 1,
        technologyVariant: 'ПВХ-мембрана 1,2 мм; очиститель ЕКН 472219 по объёмной листовке 0,25 л/м²' } },
    verifyCore: async () => {
      assert.equal(hash(readFileSync(packPath)), sourceMetadata.definition_hash);
      const short = await compile({ area_m2: 100 });
      assert.equal(short.rows.length, 25);
      assert.deepEqual(short.preliminaryNeeds.map(need => [need.row_id, need.missing_parameter_ids]), [[cleanerRowId, ['cleaned_surface_m2']]]);
      const complete = await compile({ area_m2: 100, cleaned_surface_m2: 20 });
      const cleaner = complete.rows.find(row => row.row_id === cleanerRowId)!;
      assert.equal(cleaner.unit_id, 'l'); assert.equal(cleaner.quantity, '6');
      assert.equal(complete.preliminaryNeeds.length, 0);
      assert.equal(complete.rows.filter(row => row.included_in_procurement).length, 7);
      return { status: 'GREEN_KRER_FIELD_SEPARATE_VOLUME_LEAFLET', existingCoreReused: true,
        preservedMassDefinition: true, unknownCleanedAreaPreserved: true, densityConversionPerformed: false,
        engineeringAccepted: false, ordinaryUiAccepted: false };
    },
    owner: 'S2737_PVC_ROOF_VOLUME_CLEANER', receiptFileStem: 'pvc_roof_volume_cleaner',
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2737PvcRoofVolumeCleanerSuccessor.ts')) {
  void runMasterSingleDefinitionSuccessorR1(pvcRoofVolumeCleanerS2737PublishConfig(
    resolvePvcRoofVolumeCleanerParentS2737(process.argv.includes('--apply')),
  )).catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
