import {strict as assert} from 'node:assert';
import {COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,columnBaseEmbeddedItemsAcceptanceInputR1} from '../../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1';
import {PEDESTAL_EMBEDDED_ITEMS_TARGETS,pedestalEmbeddedItemsAcceptanceInputR1} from '../../../src/lib/estimate/v4/pedestalEmbeddedItemsR1';
import {BELT_EMBEDDED_ITEMS_TARGETS,beltEmbeddedItemsAcceptanceInputR1} from '../../../src/lib/estimate/v4/beltEmbeddedItemsR1';
import {buildEmbeddedProjectMaterialExpansionR1,type EmbeddedProjectMaterialParentR1} from './embeddedProjectMaterialExpansionR1';

export const embeddedMaterials18ContractR1='rik-expo-app.embedded18-individual-materials.r1';
export type EmbeddedMaterials18ParentR1=EmbeddedProjectMaterialParentR1;
export const EMBEDDED_MATERIALS18_TARGETS_R1=Object.freeze([
 ...COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.map(t=>({...t,family:'column_base' as const,resourcePrefix:'column-base-embedded-items'})),
 ...PEDESTAL_EMBEDDED_ITEMS_TARGETS.map(t=>({...t,family:'pedestal' as const,resourcePrefix:'pedestal-embedded-items'})),
 ...BELT_EMBEDDED_ITEMS_TARGETS.map(t=>({...t,family:'belt' as const,resourcePrefix:'belt-embedded-items'})),
]);
export function embeddedMaterials18AcceptanceInputR1(catalogId:string){
 const target=EMBEDDED_MATERIALS18_TARGETS_R1.find(t=>t.catalogId===catalogId);assert(target,'EMBEDDED18_EXACT_FIXTURE_TARGET_REQUIRED');
 switch(target.family){
  case 'column_base':return columnBaseEmbeddedItemsAcceptanceInputR1(target.contextKey);
  case 'pedestal':return pedestalEmbeddedItemsAcceptanceInputR1(target.contextKey);
  case 'belt':return beltEmbeddedItemsAcceptanceInputR1(target.contextKey);
 }
}
export function buildEmbeddedMaterials18R1(parent:EmbeddedMaterials18ParentR1){
 const target=EMBEDDED_MATERIALS18_TARGETS_R1.find(t=>t.catalogId===String(parent.definition.catalog_id));assert(target,'EMBEDDED18_EXACT_TARGET_REQUIRED');
 return buildEmbeddedProjectMaterialExpansionR1(parent,{contract:embeddedMaterials18ContractR1,target,
  changedOwnerRowIds:[`work:concrete:${target.resourcePrefix}-fixing`,`equipment:concrete:${target.resourcePrefix}-lifting`]});
}
