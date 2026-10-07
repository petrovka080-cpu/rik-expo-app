import {pvc15ControlInputS2743} from './pvc15FullCompositionS2743';
import {PVC_TRANSITION_GUIDE2024_CONTROL_INPUT} from '../../scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743, PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743, PVC15_JOINT_CHOICE, PVC15_JOINT_CONFIRM, PVC15_JOINT_LAYER, PVC15_JOINT_PREFIX} from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import {G6_COMPLETION_NOT_REQUIRED_S2741} from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
// Explicit arithmetic/project QA facts; never included in runtime definitions.
export function pvc15FieldTransitionControlInputS2743():Record<string,unknown>{
 const declared=new Set(PVC15_FIELD_TRANSITION_DEFINITION_S2743.parameters.map(p=>p.parameter_id));
 const child=Object.fromEntries(Object.entries({...PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743.runtimeInput,...PVC_TRANSITION_GUIDE2024_CONTROL_INPUT,
  liquid_pvc_selection:'Выбрано по проекту',liquid_pvc_volume_l:0.6,g6_cleanup_applicability:G6_COMPLETION_NOT_REQUIRED_S2741,
  g6_waste_applicability:G6_COMPLETION_NOT_REQUIRED_S2741,g6_cleanup_boundary_reference:'VALIDATION_FIXTURE: уборка переходного участка обеспечена отдельным пакетом',
  g6_waste_boundary_reference:'VALIDATION_FIXTURE: по инвентаризации переходного участка отдельной партии отходов нет'}).map(([id,value])=>[PVC15_JOINT_PREFIX+id,value]).filter(([id])=>declared.has(String(id))));
 const input:Record<string,unknown>={...pvc15ControlInputS2743(),...child,pvc15_joint_transition_scope:PVC15_JOINT_CHOICE.yes,
  pvc15_joint_source_confirmed:PVC15_JOINT_CONFIRM,pvc15_joint_source_reference:'VALIDATION_FIXTURE: согласованы выбранные редакции V-RP1,5 и армированной ленты02.2024, один прямой участок',
  pvc15_joint_machine_confirmed:PVC15_JOINT_CONFIRM,pvc15_joint_machine_reference:'VALIDATION_FIXTURE: один общий собственный аппарат; труд обеих зон исключает его стоимость, 9+0,25 маш.-ч использования',
  pvc15_joint_maintenance_hours:1.25,pvc15_joint_energy_kwh:14.5,pvc15_joint_energy_reference:'VALIDATION_FIXTURE: фактический общий учёт14,5 кВт·ч двух участков, отдельная цена',
  pvc15_joint_tools_confirmed:PVC15_JOINT_CONFIRM,pvc15_joint_tools_reference:'VALIDATION_FIXTURE: одна совместимая оснастка и СИЗ клеевой технологии и горячих работ, предоставленная исполнителем',
  pvc15_joint_liquid_confirmed:PVC15_JOINT_CONFIRM,pvc15_joint_liquid_stock:0,pvc15_joint_liquid_reserve:0,pvc15_joint_liquid_quantum:1,
  pvc15_joint_layer_relation:PVC15_JOINT_LAYER.separate};
 for(const key of ['preparation','cutting','fastening','welding','safety','probe'])input['pvc15_joint_tool_'+key+'_sets']=1;
 return input;
}
