import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { waterValtecShortInputS2747Config } from './prepareS2747WaterValtecShortInput';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_EXACT_FITTINGS_S2747 as pack, VALTEC_EXACT_FITTINGS_S2747_PARAMETERS as parameters,
  VALTEC_EXACT_FITTINGS_S2747_RESOURCES as resources, VALTEC_EXACT_FITTINGS_S2747_SOURCE_PACK_SHA256 as packHash,
  compileWaterValtecPpr20ExactFittingsS2747 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT as facts } from '../../../src/lib/estimate/v4/waterValtecPpr20StandardS2723';

export function waterValtecExactFittingsS2747Config(parent: {releaseId: string; searchReleaseId: string}): MasterSingleDefinitionSuccessorConfig {
  const previous = waterValtecShortInputS2747Config(parent);
  const selections = Object.fromEntries(pack.projectSelections.map(selection => [selection.parameterId, selection.values[0]]));
  return { ...previous, contract: 'rik-expo-app.s27-47.water-valtec-exact-fittings.v1',
    stopCode: 'S2747_WATER_VALTEC_EXACT_FITTINGS', applicationName: 's2747-water-valtec-exact-fittings',
    owner: 'S2747_WATER_VALTEC_SINGLE_WRITER', receiptFileStem: 'water_valtec_exact_fittings',
    outputRoot: resolve('.release-runtime/r568/s27-47/g7-valtec-exact-fittings'),
    sourcePaths: [...previous.sourcePaths, 'data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json',
      'src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747.ts',
      'tests/estimateNorms/waterValtecPpr20ExactFittingsS2747.contract.test.ts',
      'scripts/estimate/r4a13/prepareS2747WaterValtecExactFittings.ts'],
    sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash,
      exact_locator: previous.sourceMetadata.exact_locator + ' | ' + [...pack.fixedComponents, ...pack.projectSelections].map(component => component.exactLocator).join(' | ') },
    expectedParentShape: [37, 38, 52], parameterDefinitions: parameters, resourceDefinitions: resources,
    acceptanceInput: { ...facts, ...selections },
    passport: { ...previous.passport, includedScopeRu: [...previous.passport.includedScopeRu,
      'Муфта VTp.703 и заглушка VTp.790 — 20 мм; угол отвода, равнопроходное ответвление и резьбовое присоединение определяются по фактическому узлу'],
      excludedScopeRu: [...previous.passport.excludedScopeRu, 'Смешанные углы или резьбовые подключения внутри одной строки; переходные и резьбовые тройники без отдельной спецификации'] },
    locator: { ...previous.locator, key: previous.locator.key + '-exact-fittings-1224-s2747',
      payload: { ...previous.locator.payload, exactFittingSourcePackSha256: packHash,
        manufacturerPassportSha256: pack.artifactSha256, unknownInterfaceNeverDefaulted: true,
        conditionalProjectSelectionIds: pack.projectSelections.map(selection => selection.parameterId) } },
    search: { ...previous.search,
      sourceProvenance: { ...previous.search.sourceProvenance, exactFittingSourcePackSha256: packHash,
        conditionalInterfacesOnlyForPresentNodes: true } },
    verifyCore: async () => {
      const oldProof = await previous.verifyCore();
      const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
      assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json'), packHash);
      assert.equal(hash('.release-runtime/r568/s27-23/q5-valtec-ppr-official-sources/VALTEC_VTp.700_FITTINGS_PASSPORT.pdf'), pack.artifactSha256);
      const unresolved = await compile({ ...facts });
      assert.equal(unresolved.preliminaryNeeds.length, 3);
      for (const selection of pack.projectSelections) assert.equal(unresolved.preliminaryNeeds.find(need => need.row_id === selection.rowId)?.quantity,
        String(facts[selection.countParameterId as keyof typeof facts]));
      const complete = await compile({ ...facts, ...selections });
      assert.equal(complete.preliminaryNeeds.length, 0); assert.equal(complete.rows.length, 52);
      assert.equal(complete.rows.find(row => row.row_id === 'water-ppr20:04:equipment:fusion-machine')?.quantity, '3.223333333');
      return { ...oldProof, sourcePackVerified: true, fittingCountAndNormsUnchanged: true,
        conditionalInterfaceSelections: 3, interfacesDefaulted: false, unknownInterfaceQuantityPreserved: true,
        ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
    },
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747WaterValtecExactFittings.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'), 'utf8'));
  void runMasterSingleDefinitionSuccessorR1(waterValtecExactFittingsS2747Config({releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId}))
    .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
