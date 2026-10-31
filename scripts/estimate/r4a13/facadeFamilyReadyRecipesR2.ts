import {facadeCurrentWetFamilyMasterConfigR3} from './prepareFacadeCurrentWetFamilyR3';
import {facadeFaceBrickMasterConfigR3,facadeLimestoneMasterConfigR3,facadeCeramicTileMortarMasterConfigR3,facadePlainRenderMasterConfigR3} from './prepareFacadeFacedMaterialsKrerR3';
import paint from '../../../data/estimate-benchmarks/source-packs/ct54-ready-facade-six-s27-63.json';
/** Extension of the SAME finite config-factory registry; it executes nothing.
 * Replaces the pending MW-only recipe before its first publication with one
 * retained composite publication. Steel and porcelain stay on explicit owner HOLD. The whole family
 * remains ACTIVE: brick/stone/tile branches are tracked separately, not counted
 * as finished because these three registry entries exist. */
export const facadeFamilyReadyRecipesR2=[
 {familyKey:'facade',technologyKey:'insulated_thin_render_whole_profiles',materialKind:'mineral_wool_and_thin_render',catalogId:'canonical-work:base:insulation_interior_facade_install_standard',route:'RETAINED_PARENT_SUCCESSOR',configFactory:facadeCurrentWetFamilyMasterConfigR3,sourceScope:'ORIGINAL_CAPTURED_PARENT_PLUS_EXACT_MW120_AND_CURRENT_WHOLE_WET_PROFILE',physicalFull:false},
 {familyKey:'facade',technologyKey:'face_brick_cladding',materialKind:'face_ceramic_brick',catalogId:'canonical-work:master:facade_face_brick_cladding',route:'NORMAL_CATALOG_APPEND',configFactory:facadeFaceBrickMasterConfigR3,sourceScope:'EXACT_KG08_02_017_01_AAC_HALFBRICK_FLOORUPTO4M',physicalFull:false},
 {familyKey:'facade',technologyKey:'natural_stone_mortar_cladding',materialKind:'natural_limestone',catalogId:'canonical-work:master:facade_natural_stone_mortar_cladding',route:'NORMAL_CATALOG_APPEND',configFactory:facadeLimestoneMasterConfigR3,sourceScope:'EXACT_KG15_01_002_01_LIMESTONE60MM_READY1_3',physicalFull:false},
 {familyKey:'facade',technologyKey:'ceramic_tile_mortar_cladding',materialKind:'facade_ceramic_tile',catalogId:'canonical-work:master:facade_ceramic_tile_mortar_install',route:'NORMAL_CATALOG_APPEND',configFactory:facadeCeramicTileMortarMasterConfigR3,sourceScope:'EXACT_KG15_01_017_01_FACADECERAMIC9MM_READY1_3',physicalFull:false},
 {familyKey:'facade',technologyKey:'improved_cement_lime_render',materialKind:'cement_lime_plaster',catalogId:'canonical-work:master:facade_improved_cement_lime_render',route:'NORMAL_CATALOG_APPEND',configFactory:facadePlainRenderMasterConfigR3,sourceScope:'EXACT_KG15_02_001_01_READY1_1_6',physicalFull:false},
] as const;
/** Existing whole norm builders remain available to the existing NVF owner.
 * Neither candidate's absent proposed key grants a second public work. ROOT
 * must reconcile the current parent/owner before selecting a retained route. */
export const facadeFamilyHeldRecipesR3=[
 {familyKey:'facade',technologyKey:'insulated_steel_siding_historical',materialKind:'steel_sheet_cladding',catalogId:'canonical-work:master:facade_steel_siding_insulated_krer15_01_065_01',route:'HOLD',existingPublicOwner:'canonical-work:expanded:ventilated_facade',sourceScope:'EXACT_KG15_06501_HISTORICAL_WHOLE_METHOD',reason:'EXISTING_PUBLIC_OWNER_CURRENT_PARENT_REVIEW_REQUIRED',physicalFull:false},
 {familyKey:'facade',technologyKey:'insulated_ventilated_porcelain',materialKind:'porcelain_cladding',catalogId:'canonical-work:master:facade_ventilated_porcelain_install',route:'HOLD',existingPublicOwner:'canonical-work:expanded:ventilated_facade',sourceScope:'EXACT_ST_KG_V_T_VISIBLE_CLAMPS_PORCELAIN10_CURRENT_SYSTEM',reason:'EXISTING_PUBLIC_OWNER_CURRENT_PARENT_REVIEW_REQUIRED',physicalFull:false},
] as const;
/** One pure policy owner for the finite publication table. These helpers do
 * not construct a Config or resolve another physical work by a similar name. */
export function assertFacadeReadyRecipeIdentitiesR3(rows:readonly Readonly<{technologyKey:string;catalogId:string}>[]):void{
 const keys=new Set<string>(),catalogs=new Set<string>();
 for(const row of rows){
  if(typeof row.technologyKey!=='string'||!row.technologyKey||row.technologyKey!==row.technologyKey.trim()
   ||typeof row.catalogId!=='string'||!row.catalogId||row.catalogId!==row.catalogId.trim())
   throw Object.assign(new Error('GOX_FACADE_READY_IDENTITY_INVALID'),{code:'GOX_FACADE_READY_IDENTITY_INVALID'});
  if(keys.has(row.technologyKey)||catalogs.has(row.catalogId))
   throw Object.assign(new Error('GOX_FACADE_READY_SELECTION_AMBIGUOUS'),{code:'GOX_FACADE_READY_SELECTION_AMBIGUOUS'});
  keys.add(row.technologyKey);catalogs.add(row.catalogId);
 }
}
export function assertFacadeReadyPublicationRouteR3(route:unknown):asserts route is 'NORMAL_CATALOG_APPEND'|'RETAINED_PARENT_SUCCESSOR'{
 if(route!=='NORMAL_CATALOG_APPEND'&&route!=='RETAINED_PARENT_SUCCESSOR')
  throw Object.assign(new Error('GOX_FACADE_READY_ROUTE_NOT_SUPPORTED'),{code:'GOX_FACADE_READY_ROUTE_NOT_SUPPORTED'});
}
/** Eighth physical work is already published. Its seven historic IDs are one
 * technology and receive read/cold/save/PDF replay, no new card/publication.
 * Exact current definition identities must come from ROOT's frozen candidate. */
export const facadeExistingPublishedReplaysR3=[{familyKey:'facade',technologyKey:'two_coat_silicate_facade_paint',materialKind:'silicate_paint',route:'REUSE_EXISTING_PUBLISHED_CURRENT_DEFINITIONS',referenceCatalogId:paint.referenceCatalogId,legacyCatalogIds:paint.targets.map(t=>t.catalogId),sourcePack:'data/estimate-benchmarks/source-packs/ct54-ready-facade-six-s27-63.json',owner:'src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763.ts',physicalFull:false}] as const;
