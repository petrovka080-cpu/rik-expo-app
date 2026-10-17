import {strict as assert} from 'node:assert';
import {buildPlacementProjectMaterialExpansionR1} from './placementProjectMaterialExpansionR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
export {PLACEMENT_PROJECT_MATERIAL_RETIRED_KIT_IDS_R1 as PLACEMENT28_RETIRED_KIT_IDS_R1} from './placementProjectMaterialExpansionR1';
export const placementMaterials28ContractR1='rik-expo-app.placement28-individual-materials.r1';
const prefix='canonical-work:base:concrete_foundation_interior_';
const families=['pile_cap','column_base','pedestal','belt'];
const contexts=['standard','high_load','large_area','repair','small_area','technical_room','wet_zone'];
export const PLACEMENT_MATERIALS28_CATALOG_IDS_R1=families.flatMap(f=>contexts.map(c=>prefix+f+'_pour_'+c));
export function buildPlacementMaterials28R1(parent:Parent){
 const catalogId=String(parent.definition.catalog_id);assert(PLACEMENT_MATERIALS28_CATALOG_IDS_R1.includes(catalogId),'PLACEMENT28_EXACT_TARGET_REQUIRED');
 return buildPlacementProjectMaterialExpansionR1(parent,{catalogId,contract:placementMaterials28ContractR1});
}
