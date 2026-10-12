import pack from '../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import{overlaySourcePinnedRoofNormR1,type SourcePinnedRoofNormSeriesR1}from'./sourcePinnedRoofNormOverlayR1';
import type{PurchaseGroupRepresentative}from'./s2732PurchaseGroupOverlay';
export const S2763_ROOF_CEMENT_SCREED15_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(r=>r.rowId)]));
export function overlayS2763RoofCementScreed15(parent:PurchaseGroupRepresentative,locators:{roof:string;guidance:string}){
 return overlaySourcePinnedRoofNormR1(parent,pack as unknown as SourcePinnedRoofNormSeriesR1,locators);
}
