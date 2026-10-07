import { PVC15_BASE, PVC15_MACHINE, PVC15_SYSTEM, PVC15_NOT_REQUIRED } from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import { PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT } from '../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1';
import { G6_COMPLETION_NOT_REQUIRED_S2741 } from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';

// Control facts only. This module is imported by tests and local publisher
// verification. It is never part of definition.runtimeInput or product UI.
export function pvc15ControlInputS2743(): Record<string,unknown> {
  const input: Record<string,unknown> = { ...PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
    pvc15_base:PVC15_BASE.mineral,pvc15_system_profile:PVC15_SYSTEM.verified,pvc15_system_reference:'VALIDATION_FIXTURE: поле V-RP1,5 по согласованному проекту; соседние слои вне границы',
    pvc15_membrane_consumption_m2:525,pvc15_machine_provision:PVC15_MACHINE.own,
    pvc15_machine_reference:'VALIDATION_FIXTURE: собственный аппарат; ставка использования без обслуживания, энергии и труда',
    pvc15_machine_maintenance_hours:1.25,pvc15_welding_energy_kwh:13.75,
    pvc15_energy_reference:'VALIDATION_FIXTURE: 13,75 кВт·ч по учёту, отдельная оплата без включения в другие ставки',pvc15_energy_cost_scope:'Отдельная оплата энергии',
    pvc15_separation_area_m2:510,pvc15_separation_product:'VALIDATION_FIXTURE: термообработанный геотекстиль100 г/м² по минеральной вате, нахлёсты100 мм',
    pvc15_preparation_worker_hours:2.5,pvc15_protection_mode:PVC15_NOT_REQUIRED,
    pvc15_layout_worker_hours:4,pvc15_fastening_worker_hours:5,pvc15_welding_worker_hours:6,
    pvc15_cleaner_mode:PVC15_NOT_REQUIRED,pvc15_defects_mode:PVC15_NOT_REQUIRED,
    pvc15_handover_documents:1,pvc15_handover_reference:'VALIDATION_FIXTURE: принимается только выбранное поле и план контроля, соседние узлы отдельно',
    g6_cleanup_applicability:G6_COMPLETION_NOT_REQUIRED_S2741,g6_waste_applicability:G6_COMPLETION_NOT_REQUIRED_S2741,
    g6_cleanup_boundary_reference:'VALIDATION_FIXTURE: финальная уборка обеспечена отдельным пакетом',
    g6_waste_boundary_reference:'VALIDATION_FIXTURE: отдельная партия отходов отсутствует по инвентаризации' };
  for(const id of ['preparation','cutting','fastening','welding','safety','probe']) {
    input['pvc15_tool_'+id+'_sets']=1; input['pvc15_tool_'+id+'_reference']='VALIDATION_FIXTURE: один выделенный комплект исполнителя, включён в соответствующую работу';
  }
  for(const [rowId,quantum] of [['rc09:reinforced_pvc_roof_membrane_1_5mm',5],['rc09:pvc_membrane_telescopic_fastener',100],['rc09:pvc_membrane_edge_rail',2],['rc09:liquid_pvc_joint_sealant',1],['pvc15:separation:mineral',10]] as const) {
    const prefix='pvc15_supply_'+rowId.replace(/[^a-zA-Z0-9]/g,'_');input[prefix+'_stock']=0;input[prefix+'_reserve']=0;input[prefix+'_quantum']=quantum;
  }
  return input;
}
