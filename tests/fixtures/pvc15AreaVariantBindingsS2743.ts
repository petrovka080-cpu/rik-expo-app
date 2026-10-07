import {pvc15ControlInputS2743} from './pvc15FullCompositionS2743';
import {PVC15_JOINT_CHOICE} from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';

// Explicit arithmetic/project QA facts only; no size-derived norm or runtime default.
export function pvc15AreaVariantControlInputS2743(variant:'small_area'|'large_area'):Record<string,unknown>{
 const small=variant==='small_area';
 return {...pvc15ControlInputS2743(),pvc15_joint_transition_scope:PVC15_JOINT_CHOICE.no,
  area_m2:small?75:5000,reinforced_membrane_quantity_m2:small?85:5160,pvc15_membrane_consumption_m2:small?80.5:5150,
  telescopic_fastener_quantity_piece:small?324:10001,weld_probe_control_count_test:small?7:38,
  pvc15_separation_area_m2:small?78.5:5105,
  pvc15_system_reference:'VALIDATION_FIXTURE: выбранное поле ПВХ1,5 '+(small?'75':'5000')+' м²; раскладка и ветровые зоны подтверждаются отдельными исходными фактами, коэффициента размера нет',
  pvc15_handover_reference:'VALIDATION_FIXTURE: приёмка только выбранного поля '+(small?'75':'5000')+' м²; переход и соседние слои вне границы',
 };
}
