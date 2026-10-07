import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {g6CompletionSeriesConfigS2741} from './prepareS2741G6PvcCompletionSeries';
import {runMasterSingleDefinitionSuccessorR1} from './prepareMasterSingleDefinitionSuccessorR1';

async function run() {
  const target = process.argv.find(value => value.startsWith('--target='))?.slice('--target='.length);
  assert(target != null && ['0','1','2'].includes(target), 'S2742_SINGLE_DISPLAY_TARGET_REQUIRED');
  const index = Number(target);
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  assert(typeof current.definitionReleaseId==='string'&&typeof current.searchReleaseId==='string','S2742_CURRENT_PARENT_REQUIRED');
  const config = g6CompletionSeriesConfigS2741(index, {releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId});
  await runMasterSingleDefinitionSuccessorR1({...config,
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (83).md',
    masterSha256:'fd66f75f6cf92709662216fb407c9659113fe7f93903ccaad898f0ebf036afbe',
    contract:'rik-expo-app.s27-42.g6-display-successor-'+index+'.v1',
    stopCode:'S2742_G6_DISPLAY_'+index,applicationName:'s2742-g6-display-'+index,
    owner:'S2742_G6_01_SINGLE_WRITER',receiptFileStem:'g6_display_'+index,
    outputRoot:resolve('.release-runtime/r568/s27-42/g6-display-series',String(index)),
    expectedParentShape:[config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length],
    sourcePaths:[...new Set([...config.sourcePaths,'scripts/estimate/r4a13/prepareS2742G6PvcDisplaySuccessors.ts',
      'src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/v4/g6PvcResourcePresentationS2741.ts'])],
    locator:{...config.locator,key:config.locator.key+'-display',payload:{...config.locator.payload,
      authoredDimensionLabelsOnly:true,quantityAndCommercialScopeUnchanged:true}},
  });
}
if(require.main===module)run().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
