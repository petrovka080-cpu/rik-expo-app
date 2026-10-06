import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { waterValtecPpr20StandardPublishConfig as base } from './prepareS2723WaterValtecPpr20StandardSuccessor';
import { pvcRoofRussianPresentationS2737PublishConfig as russian } from './prepareS2737PvcRoofRussianPresentationSuccessor';
import { pvcRoofVolumeCleanerS2737PublishConfig, resolveS2737SealedSuccessorParent } from './prepareS2737PvcRoofVolumeCleanerSuccessor';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { compileWaterValtecPpr20StandardS2723 } from '../../../src/lib/estimate/v4/waterValtecPpr20StandardS2723';
import { canonicalEstimateWorkProcess } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

type Parent = { releaseId: string; searchReleaseId: string };
const title = 'Монтаж открытого внутреннего водопровода из труб VALTEC PP-R PN25, 20 × 3,4 мм';
export function waterValtecWorkProcessS2737PublishConfig(parent: Parent): MasterSingleDefinitionSuccessorConfig {
  return {
    ...base,
    contract: 'rik-expo-app.s27-37.water-valtec-work-process.v1', stopCode: 'S2737_WATER_VALTEC_WORK_PROCESS',
    applicationName: 's2737-water-valtec-work-process',
    masterPath: russian.masterPath, masterSha256: russian.masterSha256,
    parentReleaseId: parent.releaseId, parentSearchReleaseId: parent.searchReleaseId,
    outputRoot: resolve('.release-runtime/r568/s27-37/water-valtec-work-process'),
    sourcePaths: [...base.sourcePaths, 'scripts/estimate/r4a13/prepareS2737WaterValtecWorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
      'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
      'src/features/consumerRepair/requestEstimateViewModel.ts', 'src/features/consumerRepair/RequestEstimateSummaryCard.tsx'],
    expectedParentShape: [base.parameterDefinitions.length, base.formulaDefinitions.length, base.resourceDefinitions.length],
    benchmarkOrdinal: 161,
    passport: { ...base.passport, canonicalRuName: title,
      includedScopeRu: [...base.passport.includedScopeRu, 'Подработы и их сохранённые ресурсы раскрыты внутри основной работы; очередность объекта уточняется по ППР'],
    },
    locator: { key: 'water-valtec-work-process-s27-37', payload: { ...base.locator.payload,
      disclosureOnly: true, quantityAndCostOwnersPreserved: true, siteSequenceNotInferred: true } },
    search: { ...base.search, canonicalNameRu: title },
    verifyCore: async () => {
      const existing = await base.verifyCore();
      const short = await compileWaterValtecPpr20StandardS2723({ route_length_m: 100 });
      const rows = [...short.rows, ...short.preliminaryNeeds];
      const process = canonicalEstimateWorkProcess(rows.map(row => ({ rowId: row.row_id,
        operation: (row.calculation_trace as { resourceGraph?: { operationCompositionV1?: unknown } })?.resourceGraph?.operationCompositionV1 })));
      assert.equal(process.length, 1); assert.equal(process[0]?.operations.length, 9);
      assert.equal(process[0]?.sequenceUnspecified, true);
      assert.equal(new Set(process[0]?.operations.flatMap(step => step.resourceIds)).size, rows.length);
      return { ...existing, savedWorkProcessDisclosed: true, siteSequenceNotInferred: true, commonArithmeticChanged: false };
    },
    owner: 'S2737_WATER_VALTEC_WORK_PROCESS', receiptFileStem: 'water_valtec_work_process',
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2737WaterValtecWorkProcessSuccessor.ts')) {
  // Resolve the immutable volume receipt, rather than the pointer this writer
  // will advance. Before publication, dry-run against the known current base.
  const volume = pvcRoofVolumeCleanerS2737PublishConfig({ releaseId: russian.parentReleaseId, searchReleaseId: russian.parentSearchReleaseId });
  void runMasterSingleDefinitionSuccessorR1(waterValtecWorkProcessS2737PublishConfig(
    resolveS2737SealedSuccessorParent(volume, process.argv.includes('--apply')),
  )).catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
