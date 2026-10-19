import {assemblePlacementMaterialModelsForwardR1 as assemble} from './placementMaterialModelsForwardAssemblerR1';
import {buildStairPlacementMaterialsSevenR1 as build,stairPlacementMaterialsSevenContractR1 as contract} from './stairPlacementMaterialsSevenR1';
export function assembleStairPlacementMaterialsSevenForwardR1(input:Parameters<typeof assemble>[0]){return assemble(input,{contract,build,count:7});}
