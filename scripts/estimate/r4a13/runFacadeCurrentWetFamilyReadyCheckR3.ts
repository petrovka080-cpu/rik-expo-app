import {resolve} from 'node:path';
import {facadeCurrentWetFamilyMasterConfigR3} from './prepareFacadeCurrentWetFamilyR3';
import {runMasterSingleDefinitionSuccessorR1} from './prepareMasterSingleDefinitionSuccessorR1';
/** ROOT only. Thin standard-publisher entry; no import-time execution. */
export async function runFacadeCurrentWetFamilyReadyCheckR3(){const releaseId=process.env.GOX_FACADE_PARENT_RELEASE_ID,searchReleaseId=process.env.GOX_FACADE_PARENT_SEARCH_RELEASE_ID,outputRoot=process.env.GOX_FACADE_OUTPUT_DIRECTORY;if(!releaseId||!searchReleaseId||!outputRoot)throw Error('GOX_FACADE_RELEASE_SEARCH_OUTPUT_REQUIRED');if(!/^[0-9a-f-]{36}$/i.test(releaseId)||!/^[0-9a-f-]{36}$/i.test(searchReleaseId))throw Error('GOX_FACADE_ACTUAL_RELEASE_UUID_REQUIRED');await runMasterSingleDefinitionSuccessorR1(facadeCurrentWetFamilyMasterConfigR3({releaseId,searchReleaseId,outputRoot,sourceRoot:process.cwd()}));}
if(process.argv[1]&&resolve(process.argv[1])===resolve(process.cwd(),'scripts/estimate/r4a13/runFacadeCurrentWetFamilyReadyCheckR3.ts'))void runFacadeCurrentWetFamilyReadyCheckR3();
