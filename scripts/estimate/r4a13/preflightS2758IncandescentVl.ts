import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {incandescentVlPackS2758 as pack,incandescentVlPrefixS2758 as prefix,incandescentVlDefinitionS2758,compileIncandescentVlS2758,ownLuminaireTruckS2758,hiredLuminaireTruckS2758,incandescentVlCompletenessMapS2758} from '../../../src/lib/estimate/v4/incandescentVlLuminaireS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

export function incandescentVlControlS2758(n=11,withProject=true):Record<string,unknown>{
  const input:Record<string,unknown>={luminaire_count:n,construction_scope_conditions:pack.scopeValueRu,
    ready_support_connection_reference:'CONTROL_ONLY: проект пригодной готовой опоры ВЛ и светильника накаливания; не данные объекта',pole_attachment_height_m:4,
    access_method_reference:'CONTROL_ONLY: технологическая карта безопасного доступа; дополнительное оснащение и его количество пока не определены',truck_fulfillment:ownLuminaireTruckS2758,
    ...(withProject?{project_material_supply_scope:pack.projectSupplyScopeRu}:{})};
  const totals:Record<string,number>={construction_bolts:0.0073,brackets:27,steel_clamps:8.5,incandescent_luminaires:n,rubber_insulated_wire:0.0024};
  const quanta:Record<string,number>={solvent_gasoline:1,zes_grease:0.25,construction_bolts:0.001,brackets:1,steel_clamps:1,incandescent_luminaires:1,rubber_insulated_wire:0.001};
  for(const m of pack.materials){
    if(m.projectDefined&&!withProject)continue;
    if(m.projectDefined){input[m.id+'_project_total']=totals[m.id];input[m.id+'_project_specification']='CONTROL_ONLY: проектная ведомость, точная позиция '+m.nameRu+', итог на выбранный объём; не данные объекта';}
    input[m.id+'_supply_specification']='CONTROL_ONLY: точная совместимая отдельная поставка '+m.nameRu+' в '+m.orderUnitId+', состав и упаковка по документу; не данные объекта';
    input[m.id+'_stock']=0;input[m.id+'_reserve']=0;input[m.id+'_quantum']=quanta[m.id];
  }return input;
}
export async function verifyIncandescentVlS2758(){
  assert.equal(createHash('sha256').update(readFileSync(pack.source.path)).digest('hex'),pack.source.sha256);
  assert.equal(createHash('sha256').update(readFileSync(pack.guidance.path)).digest('hex'),pack.guidance.sha256);
  for(const [path,sha] of [['source-plan.json',pack.sourceAdmission.sourcePlanSha256],['primary-cell-clarification.json',pack.sourceAdmission.primaryCellClarificationSha256],['project-bom-contract-admission.json',pack.sourceAdmission.projectBomContractAdmissionSha256]])
    assert.equal(createHash('sha256').update(readFileSync('.release-runtime/r568/s27-58/review/outdoor-lighting/'+path)).digest('hex'),sha);
  const d=incandescentVlDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[73,29,29]);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:incandescentVlCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  for(const [n,labor,truck,gas,grease] of [[1,'1.29','0.06','0.00006','0.01'],[11,'14.19','0.66','0.00066','0.11']] as const){
    const r=await compileIncandescentVlS2758(incandescentVlControlS2758(n)),byId=new Map(r.rows.map(row=>[row.row_id,row]));
    assert.equal(byId.get(prefix+':whole-labor')?.quantity,labor);assert.equal(byId.get(prefix+':truck-consumed')?.quantity,truck);
    assert.equal(byId.get(prefix+':solvent_gasoline-consumed')?.quantity,gas);assert.equal(byId.get(prefix+':zes_grease-consumed')?.quantity,grease);
    assert.equal(byId.get(prefix+':construction_bolts-consumed')?.quantity,'0.0073');assert.equal(byId.get(prefix+':rubber_insulated_wire-consumed')?.quantity,'0.0024');
    assert.deepEqual([r.rows.length,r.preliminaryNeeds.length,r.rows.filter(row=>row.included_in_procurement).length],[22,6,7]);
    assert(r.rows.every(row=>row.unit_price===null));assert(!r.rows.some(row=>/driver|aerial|lift|lamp-order/.test(row.row_id)));
  }
  const held=await compileIncandescentVlS2758(incandescentVlControlS2758(11,false));assert.equal(held.preliminaryNeeds.length,16);
  assert(!held.rows.some(row=>pack.materials.some(m=>m.projectDefined&&row.row_id===prefix+':'+m.id+'-consumed')));
  const hired=await compileIncandescentVlS2758({...incandescentVlControlS2758(),truck_fulfillment:hiredLuminaireTruckS2758});assert.equal(hired.rows.filter(row=>row.included_in_procurement).length,8);
  for(const bad of [{luminaire_count:0},{luminaire_count:1.5},{construction_scope_conditions:'LED'},{incandescent_luminaires_project_total:10},{open_scope_qty_additional_access:1},{labour_per_luminaire:2},{project_material_supply_scope:'COMPONENTS_INCLUDED_IN_OTHER_PRICE'}])await assert.rejects(()=>compileIncandescentVlS2758({...incandescentVlControlS2758(),...bad}));
  return {status:'GREEN_EXACT_KRER33_04_014_01_PARTIAL',shape:[73,29,29],own:[22,6,7],hired:[22,6,8],projectCellsWithoutInventedNorms:5,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758IncandescentVl.ts'))void verifyIncandescentVlS2758().then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
