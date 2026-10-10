import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {fluorescentVlPackS2758 as pack,fluorescentVlPrefixS2758 as prefix,fluorescentVlDefinitionS2758,compileFluorescentVlS2758,ownLuminaireLiftS2758,hiredLuminaireLiftS2758,fluorescentVlCompletenessMapS2758} from '../../../src/lib/estimate/v4/fluorescentVlLuminaireS2758';
import {ownLuminaireTruckS2758,hiredLuminaireTruckS2758} from '../../../src/lib/estimate/v4/incandescentVlLuminaireS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

export function fluorescentVlControlS2758(n=11,withProject=true):Record<string,unknown>{
  const input:Record<string,unknown>={luminaire_count:n,construction_scope_conditions:pack.scopeValueRu,
    ready_support_connection_reference:'CONTROL_ONLY: проект пригодной готовой опоры ВЛ и люминесцентного светильника; не данные объекта',pole_attachment_height_m:4,
    access_method_reference:'CONTROL_ONLY: технологическая карта работы с автогидроподъёмником 12 м; не данные объекта',
    lift_access_compatibility_reference:'CONTROL_ONLY: проект/карта подтверждает исполнение подъёмника 12 м, высоту 4 м, досягаемость, рабочую позицию и площадку; не данные объекта',
    hydraulic_lift_fulfillment:ownLuminaireLiftS2758,truck_fulfillment:ownLuminaireTruckS2758,
    ...(withProject?{project_material_supply_scope:pack.projectSupplyScopeRu}:{})};
  const totals:Record<string,number>={construction_bolts:0.0073,brackets:27,steel_clamps:8.5,fluorescent_luminaires:n,rubber_insulated_wire:0.0024};
  const quanta:Record<string,number>={solvent_gasoline:1,zes_grease:0.25,construction_bolts:0.001,brackets:1,steel_clamps:1,fluorescent_luminaires:1,rubber_insulated_wire:0.001};
  for(const m of pack.materials){
    if(m.projectDefined&&!withProject)continue;
    if(m.projectDefined){input[m.id+'_project_total']=totals[m.id];input[m.id+'_project_specification']='CONTROL_ONLY: проектная ведомость, точная позиция '+m.nameRu+', итог на выбранный объём; не данные объекта';}
    input[m.id+'_supply_specification']='CONTROL_ONLY: точная совместимая отдельная поставка '+m.nameRu+' в '+m.orderUnitId+', состав и упаковка по документу; лампы и пускорегулирующая аппаратура входят в светильник; не данные объекта';
    input[m.id+'_stock']=0;input[m.id+'_reserve']=0;input[m.id+'_quantum']=quanta[m.id];
  }return input;
}
export async function verifyFluorescentVlS2758(){
  const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(sha(pack.source.path),pack.source.sha256);assert.equal(sha(pack.guidance.path),pack.guidance.sha256);
  assert.equal(sha('.release-runtime/r568/s27-58/lighting-wave/review/next-ready-source-plan.json'),pack.sourceAdmission.sourcePlanSha256);
  assert.equal(sha('.release-runtime/r568/s27-58/review/outdoor-lighting/project-bom-contract-admission.json'),pack.sourceAdmission.projectBomContractAdmissionSha256);
  const d=fluorescentVlDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[76,33,33]);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:fluorescentVlCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  // Frozen primary-column oracles, independent of factory configuration and rows.
  for(const [n,labor,operators,lift,truck,gas,grease] of [[1,'2.29','0.8','0.8','0.11','0.00006','0.01'],[3,'6.87','2.4','2.4','0.33','0.00018','0.03'],[11,'25.19','8.8','8.8','1.21','0.00066','0.11']] as const){
    const r=await compileFluorescentVlS2758(fluorescentVlControlS2758(n)),byId=new Map(r.rows.map(row=>[row.row_id,row]));
    for(const [id,q] of [['whole-labor',labor],['machine-operators-included',operators],['hydraulic-lift-consumed',lift],['truck-consumed',truck],['solvent_gasoline-consumed',gas],['zes_grease-consumed',grease],['construction_bolts-consumed','0.0073'],['brackets-consumed','27'],['steel_clamps-consumed','8.5'],['rubber_insulated_wire-consumed','0.0024']])assert.equal(byId.get(prefix+':'+id)?.quantity,q,id);
    assert.equal(byId.get(prefix+':fluorescent_luminaires-consumed')?.quantity,String(n));
    assert.deepEqual([r.rows.length,r.preliminaryNeeds.length,r.rows.filter(row=>row.included_in_procurement).length],[25,6,7]);
    const aggregate=byId.get(prefix+':machine-operators-included')!;assert.equal(aggregate.included_in_estimate,false);assert.equal(aggregate.included_in_procurement,false);
    assert(r.rows.every(row=>row.unit_price===null));assert.equal(r.rows.filter(row=>row.included_in_estimate&&row.category==='labor').length,1);
    assert(!r.rows.some(row=>/lamp-order|starter|ballast|driver-pay/.test(row.row_id)));
  }
  const held=await compileFluorescentVlS2758(fluorescentVlControlS2758(11,false));assert.equal(held.preliminaryNeeds.length,16);
  assert(!held.rows.some(row=>pack.materials.some(m=>m.projectDefined&&row.row_id===prefix+':'+m.id+'-consumed')));
  for(const [lift,truck,buy] of [[ownLuminaireLiftS2758,ownLuminaireTruckS2758,7],[hiredLuminaireLiftS2758,ownLuminaireTruckS2758,8],[ownLuminaireLiftS2758,hiredLuminaireTruckS2758,8],[hiredLuminaireLiftS2758,hiredLuminaireTruckS2758,9]] as const){
    const r=await compileFluorescentVlS2758({...fluorescentVlControlS2758(),hydraulic_lift_fulfillment:lift,truck_fulfillment:truck});assert.equal(r.rows.filter(row=>row.included_in_procurement).length,buy);
  }
  for(const bad of [{luminaire_count:0},{luminaire_count:1.5},{construction_scope_conditions:'LED'},{fluorescent_luminaires_project_total:10},{open_scope_qty_additional_access:0},{open_scope_qty_additional_access:1},{labour_per_luminaire:2},{project_material_supply_scope:'COMPONENTS_INCLUDED_IN_OTHER_PRICE'}])await assert.rejects(()=>compileFluorescentVlS2758({...fluorescentVlControlS2758(),...bad}));
  return {status:'GREEN_EXACT_KRER33_04_014_02_PARTIAL',shape:[76,33,33],own:[25,6,7],bothHired:[25,6,9],projectCellsWithoutInventedNorms:5,aggregateOperatorsNonpayable:true,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758FluorescentVl.ts'))void verifyFluorescentVlS2758().then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
