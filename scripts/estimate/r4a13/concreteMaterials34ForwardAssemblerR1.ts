import {strict as assert} from 'node:assert';
import {assembleConcreteSlabMaterialsSixForwardR1 as slab} from './concreteSlabMaterialsSixForwardAssemblerR1';
import {assemblePlacementMaterials28ForwardR1 as placement} from './placementMaterials28ForwardAssemblerR1';

export const concreteMaterials34ContractR1='rik-expo-app.concrete-materials34-local-forward.r1';
export function assembleConcreteMaterials34ForwardR1(input:Parameters<typeof slab>[0]){
 assert.equal(input.parents.length,34);
 const slabParents=input.parents.filter(p=>String(p.definition.catalog_id).includes('_concrete_slab_anchor_'));
 const placementParents=input.parents.filter(p=>String(p.definition.catalog_id).includes('_pour_'));
 assert.equal(slabParents.length,6);assert.equal(placementParents.length,28);
 const models=[...slab({...input,parents:slabParents}).models,...placement({...input,parents:placementParents}).models];
 assert.equal(new Set(models.map(m=>m.plan.definition.catalog_id)).size,34);
 return {contract:concreteMaterials34ContractR1,models,preservedPrior64:true,engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
