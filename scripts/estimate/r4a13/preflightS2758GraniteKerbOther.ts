import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {graniteKerbPackS2758 as pack,graniteKerbPrefixS2758 as prefix,graniteKerbOtherDefinitionS2758,graniteKerbOtherCompletenessMapS2758,compileGraniteKerbOtherS2758} from '../../../src/lib/estimate/v4/graniteKerbOtherS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
export function graniteKerbControlS2758(n=35.5):Record<string,unknown>{
  const input:Record<string,unknown>={kerb_length_m:n};for(const f of pack.scopeFacts)input[f.id]=f.value;for(const m of pack.machines)input[m.parameterId]=m.ownValue;
  const quantum:Record<string,number>={nails:1,timber:0.01,concrete:0.1,mortar:0.001,stone:1};
  for(const m of pack.materials){input[m.specificationId]='CONTROL_ONLY: '+m.nameRu+'; точная проектная спецификация/размеры и отдельная поставка в '+m.orderUnitId+'; не данные объекта';input[m.id+'_stock']=0;input[m.id+'_reserve']=0;input[m.id+'_quantum']=quantum[m.id];}return input;
}
export async function verifyGraniteKerbOtherS2758(){
  const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(sha(pack.source.path),pack.source.sha256);assert.equal(sha(pack.guidance.path),pack.guidance.sha256);assert.equal(sha(pack.sourceAdmission.sourcePlanPath),pack.sourceAdmission.sourcePlanSha256);assert.equal(sha(pack.sourceAdmission.exactCellImagePath),pack.sourceAdmission.exactCellImageSha256);
  const d=graniteKerbOtherDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[50,27,27]);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:graniteKerbOtherCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  // Fixed independently transcribed column04 quantities, not factory-derived expected values.
  for(const [n,labor,operator,crane,truck,nails,timber,concrete,mortar,stone] of [[100,'109','0.68','0.68','0.04','0.001','0.17','5.9','0.06','100'],[35.5,'38.695','0.2414','0.2414','0.0142','0.000355','0.06035','2.0945','0.0213','35.5']] as const){
    const r=await compileGraniteKerbOtherS2758(graniteKerbControlS2758(n)),rows=new Map(r.rows.map(row=>[row.row_id,row]));
    for(const [id,q] of [['whole-labor',labor],['machine-operators-included',operator],['crane-consumed',crane],['truck-consumed',truck],['nails-consumed',nails],['timber-consumed',timber],['concrete-consumed',concrete],['mortar-consumed',mortar],['stone-consumed',stone]])assert.equal(rows.get(prefix+':'+id)?.quantity,q,id);
    assert.deepEqual([r.rows.length,r.preliminaryNeeds.length,r.rows.filter(x=>x.included_in_procurement).length],[19,6,5]);assert(r.rows.every(x=>x.unit_price===null));assert.equal(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor').length,1);
    const aggregate=rows.get(prefix+':machine-operators-included')!;assert.equal(aggregate.included_in_estimate,false);assert.equal(aggregate.included_in_procurement,false);
  }
  const control=await compileGraniteKerbOtherS2758(graniteKerbControlS2758());for(const [id,q] of [['concrete','2.1'],['mortar','0.022'],['timber','0.07'],['nails','1'],['stone','36']])assert.equal(control.rows.find(x=>x.row_id===prefix+':'+id)?.quantity,q,id);
  for(const bad of [{kerb_length_m:0},{covering_kind:'Цементобетонное покрытие'},{granite_product_scope:'3ГП'},{open_scope_qty_concrete_curing:0},{open_scope_qty_tools_ppe:1},{labor_per_100m:109}])await assert.rejects(()=>compileGraniteKerbOtherS2758({...graniteKerbControlS2758(),...bad}));
  return {status:'GREEN_EXACT_GRANITE_1GP_KRER27_02_010_04_PARTIAL',shape:[50,27,27],own:[19,6,5],bothHired:[19,6,7],physicalResources:9,includedOperations:3,operatorAggregateNonpayable:true,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758GraniteKerbOther.ts'))void verifyGraniteKerbOtherS2758().then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
