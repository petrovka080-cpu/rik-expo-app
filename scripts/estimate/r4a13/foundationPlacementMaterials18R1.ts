import {strict as assert} from 'node:assert';
import {buildPlacementProjectMaterialExpansionR1} from './placementProjectMaterialExpansionR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
export const foundationPlacementMaterials18ContractR1='rik-expo-app.foundation-placement18-individual-materials.r1';
const prefix='canonical-work:base:concrete_foundation_interior_';
export const FOUNDATION_PLACEMENT_MATERIALS18_CATALOG_IDS_R1=[
 ...['standard','high_load','large_area','repair','small_area','technical_room','wet_zone'].map(c=>prefix+'concrete_slab_pour_'+c),
 ...['high_load','large_area','small_area','technical_room','wet_zone'].map(c=>prefix+'slab_foundation_pour_'+c),
 ...['standard','high_load','repair','small_area','technical_room','wet_zone'].map(c=>prefix+'strip_foundation_pour_'+c),
];
/** The three existing special definitions are deliberately outside this exact
 * target set: their established paid scope and primary measure must survive. */
export function buildFoundationPlacementMaterials18R1(parent:Parent){
 const catalogId=String(parent.definition.catalog_id);assert(FOUNDATION_PLACEMENT_MATERIALS18_CATALOG_IDS_R1.includes(catalogId),'FOUNDATION_PLACEMENT18_EXACT_TARGET_REQUIRED');
 return buildPlacementProjectMaterialExpansionR1(parent,{catalogId,contract:foundationPlacementMaterials18ContractR1});
}
