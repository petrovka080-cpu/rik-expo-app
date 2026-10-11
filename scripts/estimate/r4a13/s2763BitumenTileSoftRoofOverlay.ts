import pack from '../../../data/estimate-benchmarks/source-packs/bitumen-tile-soft-roof-six-s27-63.json';
import{overlaySourcePinnedRoofNormR1,type SourcePinnedRoofNormSeriesR1}from'./sourcePinnedRoofNormOverlayR1';
import type{PurchaseGroupRepresentative}from'./s2732PurchaseGroupOverlay';
export const S2763_BITUMEN_TILE_SOFT_ROOF_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(r=>r.rowId)]));
export function overlayS2763BitumenTileSoftRoof(parent:PurchaseGroupRepresentative,locators:{roof:string;guidance:string}){
 return overlaySourcePinnedRoofNormR1(parent,pack as unknown as SourcePinnedRoofNormSeriesR1,locators);
}
