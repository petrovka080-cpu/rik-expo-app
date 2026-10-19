import {strict as assert} from 'node:assert';
import {buildPlacementProjectMaterialExpansionR1} from './placementProjectMaterialExpansionR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
export const stairPlacementMaterialsSevenContractR1='rik-expo-app.stair-placement7-individual-materials.r1';
export const STAIR_PLACEMENT_MATERIALS7_CATALOG_IDS_R1=['standard','high_load','large_area','repair','small_area','technical_room','wet_zone'].map(c=>'canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_'+c);
export function buildStairPlacementMaterialsSevenR1(parent:Parent){
 const catalogId=String(parent.definition.catalog_id);assert(STAIR_PLACEMENT_MATERIALS7_CATALOG_IDS_R1.includes(catalogId),'STAIR_PLACEMENT7_EXACT_TARGET_REQUIRED');
 return buildPlacementProjectMaterialExpansionR1(parent,{catalogId,contract:stairPlacementMaterialsSevenContractR1});
}
