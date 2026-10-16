import {strict as assert} from 'node:assert';
import {PILE_CAP_EMBEDDED_ITEMS_TARGETS as targets} from '../../../src/lib/estimate/v4/pileCapEmbeddedItemsR1';
import {buildEmbeddedProjectMaterialExpansionR1,type EmbeddedProjectMaterialParentR1} from './embeddedProjectMaterialExpansionR1';

export const pileCapEmbeddedMaterialsSixContractR1='rik-expo-app.pile-cap-six-individual-materials.r1';
export type PileCapEmbeddedMaterialsParentR1=EmbeddedProjectMaterialParentR1;

export function buildPileCapEmbeddedMaterialsSixR1(parent:PileCapEmbeddedMaterialsParentR1){
 const target=targets.find(t=>t.catalogId===String(parent.definition.catalog_id));assert(target,'PILE_CAP_SIX_EXACT_TARGET_REQUIRED');
 return buildEmbeddedProjectMaterialExpansionR1(parent,{contract:pileCapEmbeddedMaterialsSixContractR1,target,
  changedOwnerRowIds:['work:concrete:pile-cap-embedded-items-fixing','equipment:concrete:pile-cap-embedded-items-lifting']});
}
