import {strict as assert} from 'node:assert';
import {CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS as targets} from '../../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1';
import {buildEmbeddedProjectMaterialExpansionR1,type EmbeddedProjectMaterialParentR1} from './embeddedProjectMaterialExpansionR1';

export const concreteSlabMaterialsSixContractR1='rik-expo-app.concrete-slab-six-individual-materials.r1';
export type ConcreteSlabMaterialsParentR1=EmbeddedProjectMaterialParentR1;
export function buildConcreteSlabMaterialsSixR1(parent:ConcreteSlabMaterialsParentR1){
 const target=targets.find(t=>t.catalogId===String(parent.definition.catalog_id));assert(target,'CONCRETE_SLAB_SIX_EXACT_TARGET_REQUIRED');
 return buildEmbeddedProjectMaterialExpansionR1(parent,{contract:concreteSlabMaterialsSixContractR1,target,
  changedOwnerRowIds:['work:concrete:slab-embedded-items-fixing','equipment:concrete:slab-embedded-items-lifting']});
}
