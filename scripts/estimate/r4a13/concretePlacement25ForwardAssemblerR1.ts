import {strict as assert} from 'node:assert';
import {assembleFoundationPlacementMaterials18ForwardR1 as foundation} from './foundationPlacementMaterials18ForwardAssemblerR1';
import {assembleStairPlacementMaterialsSevenForwardR1 as stair} from './stairPlacementMaterialsSevenForwardAssemblerR1';
import {FOUNDATION_PLACEMENT_MATERIALS18_CATALOG_IDS_R1 as foundationIds} from './foundationPlacementMaterials18R1';
import {STAIR_PLACEMENT_MATERIALS7_CATALOG_IDS_R1 as stairIds} from './stairPlacementMaterialsSevenR1';
export const concretePlacement25ContractR1='rik-expo-app.remaining-placement25-individual-materials.r1';
export function assembleConcretePlacement25ForwardR1(input:Parameters<typeof foundation>[0]){
 assert.equal(input.parents.length,25);const a=input.parents.filter(p=>foundationIds.includes(p.definition.catalog_id)),b=input.parents.filter(p=>stairIds.includes(p.definition.catalog_id));assert.equal(a.length,18);assert.equal(b.length,7);
 const models=[...foundation({...input,parents:a}).models,...stair({...input,parents:b}).models];assert.equal(new Set(models.map(m=>m.plan.definition.catalog_id)).size,25);
 return {contract:concretePlacement25ContractR1,models,preservedCatalogIds:[],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
