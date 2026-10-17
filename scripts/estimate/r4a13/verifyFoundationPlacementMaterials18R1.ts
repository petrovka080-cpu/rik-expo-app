import fs from 'node:fs';import {strict as assert} from 'node:assert';
import {buildFoundationPlacementMaterials18R1 as build} from './foundationPlacementMaterials18R1';
import {verifyPlacementMaterialModelsR1 as verify} from './verifyPlacementMaterials28R1';
async function main(){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));assert.equal(context.status,'PASS_READ_ONLY_FOUNDATION_PLACEMENT21_CURRENT_FULL_PARENTS');
 const parents=context.parents.filter((p:any)=>p.definition.definition_version===12&&p.parameters.length===101&&p.resources.length===41);assert.equal(parents.length,18);
 const preserved=context.parents.filter((p:any)=>!parents.includes(p));assert.equal(preserved.length,3);
 const result={...await verify(parents,build,18),preservedSpecialCatalogIds:preserved.map((p:any)=>p.definition.catalog_id),specialModelsReplaced:false};
 fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,models:18,specialModelsPreserved:3}));
}
if(process.argv[1]?.endsWith('verifyFoundationPlacementMaterials18R1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
