import {strict as assert} from 'node:assert';
import {assembleConcretePlacement25ForwardR1 as ordinary} from './concretePlacement25ForwardAssemblerR1';
import {assembleFoundationSpecialPaymentThreeForwardR1 as special} from './foundationSpecialPaymentThreeForwardAssemblerR1';
import {FOUNDATION_SPECIAL_PAYMENT3_CATALOG_IDS_R1 as specialIds} from './foundationSpecialPaymentThreeR1';
export const concretePlacement28ContractR1='rik-expo-app.remaining-placement28-materials-and-payment.r1';
export function assembleConcretePlacement28ForwardR1(input:Parameters<typeof ordinary>[0]){
 assert.equal(input.parents.length,28);const a=input.parents.filter(p=>!specialIds.includes(p.definition.catalog_id)),b=input.parents.filter(p=>specialIds.includes(p.definition.catalog_id));assert.equal(a.length,25);assert.equal(b.length,3);
 const models=[...ordinary({...input,parents:a}).models,...special({...input,parents:b}).models];assert.equal(new Set(models.map(m=>m.plan.definition.catalog_id)).size,28);
 return {contract:concretePlacement28ContractR1,models,preservedCatalogIds:[],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
