import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {buildFoundationSpecialPaymentThreeR1 as build,FOUNDATION_SPECIAL_PAYMENT3_CATALOG_IDS_R1 as ids,SLAB_TRANSPORT_PAYMENT_ROWS_R1 as transport} from './foundationSpecialPaymentThreeR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalManualPriceMigrationBindings as bindings,canonicalStoredManualPricesCanMigrate as migrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildCanonicalProfessionalPdfProjection as pdf} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export function foundationSpecialPaymentTestInputR1(parent:Json){
 const input={...parent.baseline.input_values};
 if(parent.definition.catalog_id.includes('_slab_foundation_'))Object.assign(input,{
  slab_main_concrete_transport_pricing_basis:'PER_TRIP',slab_main_concrete_transport_price_scope_reference:'TEST exact separately billed concrete haul tariff; alternative rates excluded',
  slab_soil_transport_pricing_basis:'PER_TRIP',slab_soil_transport_price_scope_reference:'TEST exact separately billed soil haul tariff; alternative rates excluded'});
 return input;
}
async function main(){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),parents=context.parents.filter((p:Json)=>ids.includes(p.definition.catalog_id));assert.equal(parents.length,3);
 const models:Json[]=[],cases:Json[]=[];
 for(const parent of parents){
  const before=hash(parent),model=build(parent);assert.equal(hash(parent),before);const slab=model.newParameterIds.length>0;
  assert.deepEqual(model.formulas,parent.formulas);assert.deepEqual(model.parameters.slice(0,parent.parameters.length),parent.parameters);
  assert.deepEqual(model.resources.map(r=>r.row_id),parent.resources.map((r:Json)=>r.row_id));
  const old=bindings(parent),next=bindings(model);for(const id of model.unchangedResourceIds)assert.equal(next[id],old[id]);
  for(const id of model.changedPriceRowIds)assert(!migrate({rowOverrides:{[id]:{unitPrice:'100',provenance:{kind:'manual'}}},customRows:[],fromBindings:old,toBindings:next}),'STALE_PAYMENT_RATE_MIGRATED:'+id);
  const input=foundationSpecialPaymentTestInputR1(parent);
  const execute=(submittedParameters:Json,extra:Json={})=>compile({operation:'compile',compilerVersion:'special3-offline-test-r1',catalogId:model.catalogId,primaryMeasureParameterId:model.primaryMeasureParameterId,
   parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,submittedParameters,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:160,priceItems:[],hashJson:async v=>hash(v),...extra});
  const result=await execute(input);assert.equal(result.preliminaryNeeds.length,0,'COMPLETE_TEST_NEEDS:'+JSON.stringify(result.preliminaryNeeds));
  if(slab){
   assert.equal(model.unchangedResourceIds.length,104);
   for(const concrete of ['PER_TRIP','PER_M3_KM','PER_MACHINE_HOUR'])for(const soil of ['PER_TRIP','PER_MACHINE_HOUR']){
    const branch=await execute({...input,slab_main_concrete_transport_pricing_basis:concrete,slab_soil_transport_pricing_basis:soil});assert.equal(branch.preliminaryNeeds.length,0);
    for(const group of ['main_concrete','soil']){
     const paid=branch.rows.filter(r=>transport.some(t=>t.group===group&&t.rowId===r.row_id)&&r.included_in_estimate);assert.equal(paid.length,1);assert(Number(paid[0]!.quantity)>0);
     assert.equal(paid[0]!.row_id,transport.find(t=>t.group===group&&t.basis===(group==='soil'?soil:concrete))!.rowId);
    }
   }
   for(const id of model.newParameterIds){
    assert.equal(model.parameters.find(p=>p.parameter_id===id)!.default_value,null);
    const unknown={...input};delete unknown[id];let rejected=false;try{const r=await execute(unknown);rejected=r.preliminaryNeeds.length>0;}catch(error:any){assert.equal(error.code,'PARAMETER_VALIDATION_FAILED');rejected=true;}assert(rejected,'MISSING_TARIFF_SILENT_DEFAULT:'+id);
   }
   await assert.rejects(()=>execute({...input,slab_main_concrete_transport_pricing_basis:'HYBRID'}),(e:any)=>e.code==='PARAMETER_VALIDATION_FAILED');
   const legacy=await compile({operation:'compile',compilerVersion:'special3-parent-parity',catalogId:model.catalogId,primaryMeasureParameterId:model.primaryMeasureParameterId,
    parameterDefinitions:parent.parameters,formulaDefinitions:parent.formulas,resourceDefinitions:parent.resources,submittedParameters:parent.baseline.input_values,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:160,priceItems:[],hashJson:async v=>hash(v)});
   for(const row of result.rows){const oldRow=legacy.rows.find(r=>r.row_id===row.row_id);assert(oldRow);assert.equal(row.quantity,oldRow.quantity,'GEOMETRY_QUANTITY_CHANGED:'+row.row_id);assert.equal(row.unit_id,oldRow.unit_id);}
   if(model.catalogId.endsWith('_repair')){
    assert.equal(result.rows.find(r=>r.row_id==='slab-full:12:control:repair-net')?.quantity,'228');
    assert.equal(result.rows.find(r=>r.row_id==='slab-full:12:material:repair-mortar-bags')?.quantity,'10');
    assert.equal(result.rows.find(r=>r.row_id==='slab-full:12:control:repair-remainder')?.quantity,'22');
   }
  }else{
   const child=model.resources.find(r=>r.row_id==='strip-pour:included:vibrator-operator')!;assert.equal(child.resource_graph.parentCostOwnerId,'strip-pour:work:consolidate');assert.equal(child.resource_graph.includedInResourceOwnerRowId,'strip-pour:work:consolidate');
   const operator=result.rows.find(r=>r.row_id===child.row_id)!;assert.equal(operator.unit_price,null);assert.equal(operator.included_in_procurement,false);
   assert.equal(operator.quantity,'63.84');
   for(const row of model.resources.filter(r=>r.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'))assert.equal(row.resource_graph.includedInResourceOwnerRowId,row.resource_graph.parentCostOwnerId);
   const excluded=await execute(input,{operation:'recalculate',rowOverrides:{'strip-pour:work:consolidate':{includedInEstimate:false,provenance:{kind:'manual',reason:'TEST excluded paid work owner'}}}});
   const projection=pdf({revision:{id:'TEST',revision_no:1,currency_code:'KGS',parameters:input,row_count:2} as any,rows:excluded.rows.filter(r=>[child.row_id,'strip-pour:work:consolidate'].includes(r.row_id)),workTitleRu:'TEST owner exclusion'});
   assert(!projection.html.includes('стоимость включена в позицию'),'EXCLUDED_OWNER_CLAIMED');
   const ordered=await execute(input,{operation:'recalculate',rowOverrides:{'strip-pour:material:ready-mix':{quantity:'272',provenance:{kind:'manual',reason:'TEST accepted supply order'}}}});
   assert.equal(ordered.rows.find(r=>r.row_id==='strip-pour:delivery:mixer-trips')?.quantity,'34');
   assert.equal(ordered.rows.find(r=>r.row_id==='strip-pour:work:consolidate')?.quantity,'240');
  }
  cases.push({catalogId:model.catalogId,fixtureKind:'EXPLICIT_TEST_PRELIMINARY_PROFILE_NOT_REAL_PROJECT',input,rows:result.rows.length,openNeeds:0,realProject:false,confirmedOrder:false});
  models.push({catalogId:model.catalogId,parentSha256:before,modelSha256:hash(model),parameters:model.parameters.length,formulas:model.formulas.length,resources:model.resources.length,changedPriceRowIds:model.changedPriceRowIds,unchangedResources:model.unchangedResourceIds.length});
 }
 const report={status:'PASS_SPECIAL3_TRANSPORT_EXCLUSIVITY_OWNER_PAYMENT_MIGRATION_AND_QUANTITY_PARITY',models,cases,realProjectEstimatesAccepted:0,publicationPerformed:false};
 fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,models:3}));
}
if(process.argv[1]?.endsWith('verifyFoundationSpecialPaymentThreeR1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
