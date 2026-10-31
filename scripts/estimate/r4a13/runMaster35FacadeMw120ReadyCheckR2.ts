/** Thin entry into the EXISTING single-definition publisher. ROOT execution only.
 * No import-time login, DB connection, API request, launch or publication. */
import {resolve} from 'node:path';
import {master35FacadeMw120MasterConfigR1} from './prepareMaster35FacadeMw120R1';
import {runMasterSingleDefinitionSuccessorR1} from './prepareMasterSingleDefinitionSuccessorR1';

export async function runMaster35FacadeMw120ReadyCheckR2(){
 const releaseId=process.env.GOX_FACADE_PARENT_RELEASE_ID,searchReleaseId=process.env.GOX_FACADE_PARENT_SEARCH_RELEASE_ID;
 const outputRoot=process.env.GOX_FACADE_OUTPUT_DIRECTORY;
 if(!releaseId||!searchReleaseId||!outputRoot)throw Error('GOX_FACADE_RELEASE_SEARCH_OUTPUT_REQUIRED');
 if(!/^[0-9a-f-]{36}$/i.test(releaseId)||!/^[0-9a-f-]{36}$/i.test(searchReleaseId))throw Error('GOX_FACADE_ACTUAL_RELEASE_UUID_REQUIRED');
 const cfg=master35FacadeMw120MasterConfigR1({releaseId,searchReleaseId,outputRoot,sourceRoot:process.cwd()});
 await runMasterSingleDefinitionSuccessorR1(cfg);
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(process.cwd(),'scripts/estimate/r4a13/runMaster35FacadeMw120ReadyCheckR2.ts'))void runMaster35FacadeMw120ReadyCheckR2();
