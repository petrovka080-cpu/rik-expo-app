import {resolve} from 'node:path';
import {facadeFamilyReadyRecipesR2,facadeFamilyHeldRecipesR3,
 assertFacadeReadyRecipeIdentitiesR3,assertFacadeReadyPublicationRouteR3} from './facadeFamilyReadyRecipesR2';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
type Selection=Readonly<{technologyKey?:unknown;catalogId?:unknown}>;
export type FacadeReadyRecipeR3=Readonly<{technologyKey:string;catalogId:string;route:string;
 configFactory:(context:{releaseId:string;searchReleaseId:string;outputRoot:string;sourceRoot:string})=>MasterSingleDefinitionSuccessorConfig}>;
function stop(code:string):never{throw Object.assign(new Error(code),{code});}
const selectedText=(value:unknown):string|undefined=>{
 if(value===undefined)return undefined;
 if(typeof value!=='string'||value.length===0||value!==value.trim())stop('GOX_FACADE_READY_SELECTION_INVALID');
 return value;
};
/** Pure finite lookup. A held declaration takes precedence even if a stale
 * READY entry with the same identity is accidentally composed beside it.
 * Resolving a recipe performs no Config construction or publisher activity. */
export function resolveFacadeFamilyReadyRecipeR3(selection:Selection):FacadeReadyRecipeR3{
 const recipes=facadeFamilyReadyRecipesR2,held=facadeFamilyHeldRecipesR3;
 const key=selectedText(selection.technologyKey),catalogId=selectedText(selection.catalogId);
 if(key===undefined&&catalogId===undefined)stop('GOX_FACADE_FINITE_REGISTERED_TECHNOLOGY_REQUIRED');
 if(held.some(r=>r.technologyKey===key||r.catalogId===catalogId))stop('GOX_FACADE_TECHNOLOGY_HELD');
 assertFacadeReadyRecipeIdentitiesR3([...recipes,...held]);
 const byKey=key===undefined?[]:recipes.filter(r=>r.technologyKey===key);
 const byCatalog=catalogId===undefined?[]:recipes.filter(r=>r.catalogId===catalogId);
 if((key!==undefined&&byKey.length!==1)||(catalogId!==undefined&&byCatalog.length!==1))stop('GOX_FACADE_FINITE_REGISTERED_TECHNOLOGY_REQUIRED');
 const recipe=(key===undefined?byCatalog:byKey)[0];if(!recipe)stop('GOX_FACADE_FINITE_REGISTERED_TECHNOLOGY_REQUIRED');
 if(key!==undefined&&catalogId!==undefined&&byKey[0]!==byCatalog[0])stop('GOX_FACADE_READY_SELECTION_MISMATCH');
 assertFacadeReadyPublicationRouteR3(recipe.route);
 if(typeof recipe.configFactory!=='function')stop('GOX_FACADE_READY_FACTORY_REQUIRED');
 return recipe;
}
/** ROOT only. A selected existing registry recipe enters the SAME standard
 * publisher. ROOT advances actual parent releases sequentially in its wave;
 * this file has no loop/client/DB/launcher or import-time execution. */
export async function runFacadeFamilyReadyCheckR3(selection:Selection={
 technologyKey:process.env.GOX_FACADE_TECHNOLOGY_KEY,catalogId:process.env.GOX_FACADE_CATALOG_ID,
}){
 const recipe=resolveFacadeFamilyReadyRecipeR3(selection);
 const releaseId=process.env.GOX_FACADE_PARENT_RELEASE_ID,searchReleaseId=process.env.GOX_FACADE_PARENT_SEARCH_RELEASE_ID,
  outputRoot=process.env.GOX_FACADE_OUTPUT_DIRECTORY;
 if(!releaseId||!searchReleaseId||!outputRoot)throw Error('GOX_FACADE_RELEASE_SEARCH_OUTPUT_TECHNOLOGY_REQUIRED');
 if(!/^[0-9a-f-]{36}$/i.test(releaseId)||!/^[0-9a-f-]{36}$/i.test(searchReleaseId))throw Error('GOX_FACADE_ACTUAL_RELEASE_UUID_REQUIRED');
 const config=recipe.configFactory({releaseId,searchReleaseId,outputRoot,sourceRoot:process.cwd()});
 await runMasterSingleDefinitionSuccessorR1(config);
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(process.cwd(),'scripts/estimate/r4a13/runFacadeFamilyReadyCheckR3.ts'))void runFacadeFamilyReadyCheckR3();
