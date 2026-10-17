import {assemblePlacementMaterialModelsForwardR1 as assemble} from './placementMaterialModelsForwardAssemblerR1';
import {buildPlacementMaterials28R1 as build,placementMaterials28ContractR1 as contract} from './placementMaterials28R1';
export {placementMaterials28ContractR1} from './placementMaterials28R1';
export function assemblePlacementMaterials28ForwardR1(input:Parameters<typeof assemble>[0]){return assemble(input,{contract,build,count:28});}
