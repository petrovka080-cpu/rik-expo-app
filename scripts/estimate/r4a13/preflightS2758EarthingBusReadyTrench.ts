import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {earthingBusPackS2758 as pack,earthingBusPrefixS2758 as prefix,earthingBusReadyTrenchDefinitionS2758,earthingBusCompletenessMapS2758,compileEarthingBusReadyTrenchS2758} from '../../../src/lib/estimate/v4/earthingBusReadyTrenchS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
export function earthingBusControlS2758(n=35.5):Record<string,unknown>{
  const input:Record<string,unknown>={earthing_bus_length_m:n,project_bom_length_m:n,project_earthing_steel_mass_t:0.023,project_earthing_steel_specification:'CONTROL_ONLY: сталь для шин, проектное исполнение диаметром до10мм; не данные объекта',project_earthing_steel_document_reference:'CONTROL_ONLY: документ/редакция/позиция ведомости ровно выбранного участка; не данные объекта'};
  for(const f of pack.scopeFacts)input[f.id]=f.valueType==='enum'?f.value:'CONTROL_ONLY: '+f.guideRu+' Не данные объекта.';
  for(const m of pack.machines)input[m.parameterId]=m.ownValue;
  for(const m of pack.materials){input[m.id+'_supply_specification']='CONTROL_ONLY: '+m.nameRu+'; отдельно поставляемая позиция в '+m.orderUnitId+'; не данные объекта';input[m.id+'_stock']=0;input[m.id+'_reserve']=0;input[m.id+'_quantum']=m.id==='electrodes'?0.1:0.005;}
  return input;
}
export async function verifyEarthingBusReadyTrenchS2758(){
  const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(sha(pack.source.path),pack.source.sha256);assert.equal(sha(pack.guidance.path),pack.guidance.sha256);assert.equal(sha(pack.sourceAdmission.sourcePlanPath),pack.sourceAdmission.sourcePlanSha256);assert.equal(sha(pack.sourceAdmission.exactCellImagePath),pack.sourceAdmission.exactCellImageSha256);
  const d=earthingBusReadyTrenchDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[33,20,20]);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:earthingBusCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  // Fixed source-cell transcription and independently calculated 10m oracles.
  for(const [n,labor,welder,truck,electrodes] of [[1,'0.18','0.05','0.01','0.000012'],[10,'1.8','0.5','0.1','0.00012'],[35.5,'6.39','1.775','0.355','0.000426'],[100,'18','5','1','0.0012']] as const){
    const r=await compileEarthingBusReadyTrenchS2758(earthingBusControlS2758(n)),rows=new Map(r.rows.map(row=>[row.row_id,row]));
    for(const [id,q] of [['whole-labor',labor],['welder-consumed',welder],['truck-consumed',truck],['electrodes-consumed',electrodes],['steel-consumed','0.023']])assert.equal(rows.get(prefix+':'+id)?.quantity,q,id);
    assert.deepEqual([r.rows.length,r.preliminaryNeeds.length,r.rows.filter(x=>x.included_in_procurement).length],[12,6,2]);assert(r.rows.every(x=>x.unit_price===null));assert.equal(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor').length,1);
  }
  const control=await compileEarthingBusReadyTrenchS2758(earthingBusControlS2758());assert.equal(control.rows.find(x=>x.row_id===prefix+':electrodes')?.quantity,'0.5');assert.equal(control.rows.find(x=>x.row_id===prefix+':steel')?.quantity,'0.025');
  const short=await compileEarthingBusReadyTrenchS2758({earthing_bus_length_m:35.5});assert.equal(short.rows.length,0);assert.equal(short.preliminaryNeeds.length,20);
  for(const bad of [{earthing_bus_length_m:0},{project_bom_length_m:35},{construction_scope_conditions:'Работа под напряжением'},{open_scope_qty_tools_and_protection:0},{open_scope_qty_electrical_checks:1},{steel_per_m:0.001}])await assert.rejects(()=>compileEarthingBusReadyTrenchS2758({...earthingBusControlS2758(),...bad}));
  return {status:'GREEN_EXACT_EARTHING_BUS_KRER33_04_015_01_PARTIAL',shape:[33,20,20],own:[12,6,2],bothHired:[12,6,4],physicalResources:5,includedOperations:3,noOperatorAggregate:true,projectSteelTotalDirect:true,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758EarthingBusReadyTrench.ts'))void verifyEarthingBusReadyTrenchS2758().then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
