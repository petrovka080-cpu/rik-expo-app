import {ledWagoProjectDefinitionS2754 as original,ledWagoProjectPackS2754 as pack} from './ledWagoProjectConnectionS2754';
import {ledGridPanelSourcePackS2754 as panelPack} from './ledGridPanelDvo6560S2754';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';

export const ledWagoVisibleObjectFactsS2754=['installation_detail_reference','wago_joint_reference','wago_layout_reference','wago_panel_lead_mm2','wago_supply_lead_mm2'] as const;
export const ledWagoVisibleObjectDefinitionS2754:AutomaticOwnerDefinition={...original,parameters:original.parameters.map(p=>
 ledWagoVisibleObjectFactsS2754.includes(p.parameter_id as typeof ledWagoVisibleObjectFactsS2754[number])?{...p,truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'}}}:p)};
export function compileLedWagoVisibleObjectS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:panelPack.catalogId,compilerVersion:pack.contract+':visible-object-facts-v1',primaryMeasureParameterId:'panel_count',definition:ledWagoVisibleObjectDefinitionS2754,submittedParameters:input});}
