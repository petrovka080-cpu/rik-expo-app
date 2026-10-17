import {assemblePlacementMaterialModelsForwardR1 as assemble} from './placementMaterialModelsForwardAssemblerR1';
import {buildFoundationPlacementMaterials18R1 as build,foundationPlacementMaterials18ContractR1 as contract} from './foundationPlacementMaterials18R1';
export {foundationPlacementMaterials18ContractR1} from './foundationPlacementMaterials18R1';
export function assembleFoundationPlacementMaterials18ForwardR1(input:Parameters<typeof assemble>[0]){return assemble(input,{contract,build,count:18});}
