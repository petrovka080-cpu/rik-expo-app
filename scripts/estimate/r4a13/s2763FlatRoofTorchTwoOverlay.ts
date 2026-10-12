import pack from '../../../data/estimate-benchmarks/source-packs/flat-roof-torch-two-s27-63.json';
import{overlaySourcePinnedRoofNormR1,type SourcePinnedRoofNormSeriesR1}from'./sourcePinnedRoofNormOverlayR1';
import type{PurchaseGroupRepresentative}from'./s2732PurchaseGroupOverlay';
export const S2763_FLAT_ROOF_TORCH_TWO_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(r=>r.rowId)]));
export function overlayS2763FlatRoofTorchTwo(parent:PurchaseGroupRepresentative,locators:{roof:string;guidance:string}){
 return overlaySourcePinnedRoofNormR1(parent,pack as unknown as SourcePinnedRoofNormSeriesR1,locators);
}
