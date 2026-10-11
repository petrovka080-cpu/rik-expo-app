import pack from '../../../../data/estimate-benchmarks/source-packs/clay-tile-pitched-roof-six-s27-63.json';
import {sourcePinnedRoofNormOwnerR1,sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1}from'./sourcePinnedRoofNormOwnerR1';
export const clayTilePitchedRoofPackS2763=pack;
const config=pack as unknown as SourcePinnedRoofNormPackR1;
export const clayTilePitchedRoofGuardsS2763=sourcePinnedRoofNormGuardsR1(config);
export function clayTilePitchedRoofDefinitionS2763(){return sourcePinnedRoofNormOwnerR1(config);}
