import fs from 'node:fs';import {strict as assert} from 'node:assert';
import {buildStairPlacementMaterialsSevenR1 as build} from './stairPlacementMaterialsSevenR1';
import {verifyPlacementMaterialModelsR1 as verify} from './verifyPlacementMaterials28R1';
async function main(){const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));assert.equal(context.status,'PASS_READ_ONLY_STAIR_PLACEMENT7_CURRENT_FULL_PARENTS');const result=await verify(context.parents,build,7);fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,models:7}));}
if(process.argv[1]?.endsWith('verifyStairPlacementMaterialsSevenR1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
