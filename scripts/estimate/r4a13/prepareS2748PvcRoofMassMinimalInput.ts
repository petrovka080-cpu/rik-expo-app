import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pvcRoofMinimalConfigS2747 } from './prepareS2747PvcRoofVolumeMinimalInput';
import { runMasterSingleDefinitionSuccessorR1 } from './prepareMasterSingleDefinitionSuccessorR1';

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2748PvcRoofMassMinimalInput.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'), 'utf8'));
  void runMasterSingleDefinitionSuccessorR1(pvcRoofMinimalConfigS2747(0,
    { releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
    .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
