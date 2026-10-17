import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {assembleFoundationSpecialWorkflowThreeForwardR1 as assemble} from './foundationSpecialWorkflowThreeForwardAssemblerR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalEstimateResourceOperationSections as sections} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildCanonicalProfessionalPdfProjection as pdf,canonicalProfessionalPdfCategory as category} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {escapeCanonicalArtifactHtml as html} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const targets=['slab_foundation_pour_standard','slab_foundation_pour_repair','strip_foundation_pour_large_area'];
const values=(rows:Json[])=>rows.map(({resource_spec_id:_physicalId,row_sha256:_physicalHash,calculation_trace:_changedOperationTrace,...r})=>r);

async function main(){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),fixtures=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const parents:Json[]=context.parents.filter((p:Json)=>targets.some(t=>p.definition.catalog_id.endsWith(t)));assert.equal(parents.length,3);
 const built=assemble({...context,parents,releaseId:'269ffabd-a84c-5b38-8ba0-b0b1352be6a4',sourceHead:'3d17778592a9d95960716d30cc82d9cdf8432c00',sourceTree:'1'.repeat(40),sourceFingerprint:'1'.repeat(64),sourceFreezeSha256:'2'.repeat(64),masterSha256:'e19c7b598656434d4c78cecc69a51099b15e842abd672fb60f6e854e23e790f7',acceptanceEvidenceSha256:'3'.repeat(64)});
 const models:Json[]=[];let compiledCases=0;
 for(const {plan,primaryMeasureParameterId} of built.models){
  const catalogId=plan.definition.catalog_id,parent=parents.find(p=>p.definition.catalog_id===catalogId)!,fixture=fixtures.cases.find((c:Json)=>c.catalogId===catalogId);assert(fixture);
  const slab=parent.resources.length===109;
  const variants:Json[]=slab?['PER_TRIP','PER_M3_KM','PER_MACHINE_HOUR'].flatMap(main=>['PER_TRIP','PER_MACHINE_HOUR'].map(soil=>({...fixture.input,slab_main_concrete_transport_pricing_basis:main,slab_soil_transport_pricing_basis:soil}))):[fixture.input];
  let baseRows:Json[]=[];
  for(const input of variants){
   const execute=(m:Json)=>compile({operation:'compile',compilerVersion:'foundation-special3-workflow-parity-r1',catalogId,primaryMeasureParameterId,parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:160,priceItems:[],hashJson:async v=>hash(v)});
   const before=await execute(parent),after=await execute(plan);assert.equal(after.preliminaryNeeds.length,0);assert.equal(after.rows.length,before.rows.length);
   assert.deepEqual(values(after.rows),values(before.rows),'WORKFLOW_CHANGED_QUANTITY_PAYMENT_INCLUSION_OR_PRICE_STATE');
   assert(after.rows.every(r=>r.unit_price==null));compiledCases++;
   if(!baseRows.length)baseRows=after.rows;
  }
  const grouped=sections(baseRows.map(r=>({rowId:String(r.row_id),titleRu:String(r.title_ru),operation:r.calculation_trace.resourceGraph.operationCompositionV1})));
  assert.equal(grouped.length,slab?20:10);assert(grouped.every(g=>g.operation&&g.resourceIds.length&&!g.sharedResources.length));
  assert.deepEqual(grouped.flatMap(g=>g.resourceIds).sort(),baseRows.map(r=>r.row_id).sort());
  if(!slab){
   const operator=baseRows.find(r=>r.row_id==='strip-pour:included:vibrator-operator')!;
   assert.equal(operator.included_in_estimate,false);assert.equal(operator.calculation_trace.resourceGraph.parentCostOwnerId,'strip-pour:work:consolidate');
   assert.match(String(operator.quantity),/^63[.]84(?:0*)$/u);
   assert.equal(operator.calculation_trace.resourceGraph.operationCompositionV1.operationId,'strip-pour:operation:consolidation');
  }
  const revision={id:'11111111-2222-3333-4444-555555555555',release_id:plan.definition.release_id,catalog_id:catalogId,checksum_sha256:'f'.repeat(64),row_count:baseRows.length,revision_number:1,currency_code:'KGS',totals:{amount:null},input_parameters:variants[0],primary_measure_value:fixture.primary,primary_measure_unit_id:plan.parameters.find(p=>p.parameter_id===primaryMeasureParameterId)!.unit_id,created_at:'2026-10-17T00:00:00Z'};
  const actual=pdf({revision,rows:baseRows as any,workTitleRu:fixture.titleRu??catalogId});assert.equal(actual.rowCount,baseRows.length);
  // Distinct sentinels test the actual renderer's order even where two saved
  // resources have the same title. This projection is never an app artifact.
  const marked=baseRows.map(r=>({...r,title_ru:'VERIFY_ROW_'+r.row_id,calculation_trace:{...r.calculation_trace,manualTitleOverride:true}}));
  const projected=pdf({revision,rows:marked as any,workTitleRu:catalogId});
  const expected=grouped.flatMap(g=>g.resourceIds.filter(id=>category(baseRows.find(r=>r.row_id===id)!)==='work').concat(g.resourceIds.filter(id=>category(baseRows.find(r=>r.row_id===id)!)!=='work')));
  let last=-1;
  for(const id of expected){
   const needle='<strong>'+html('VERIFY_ROW_'+id)+'</strong>',index=projected.html.indexOf(needle);assert(index>last,'PDF_WORK_BEFORE_OWN_RESOURCES_ORDER:'+id);assert.equal(projected.html.indexOf(needle,index+needle.length),-1);last=index;
  }
  for(const g of grouped)assert(projected.html.includes(html(g.operation!.operationTitleRu)));
  models.push({catalogId,definitionVersion:plan.definition.definition_version,parameterCount:plan.parameters.length,formulaCount:plan.formulas.length,resourceCount:plan.resources.length,calculatedRows:baseRows.length,subworks:grouped.length,transportVariantsVerified:variants.length,allCalculatedValuesAndPaymentStateUnchanged:true,manualPriceBindingsUnchanged:true,actualProfessionalPdfProjectionChecked:true,planSha256:hash(plan)});
 }
 const result={status:'PASS_SPECIAL3_DECLARED_SUBWORK_GROUPS_WITH_UNCHANGED_QUANTITIES_TARIFFS_OWNERS_AND_PRICES',models,compiledCases,databaseAccessed:false,actualAppPdfAcceptancePending:true,other25ModelsChanged:false};
 fs.writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,models:models.length,compiledCases}));
}
if(process.argv[1]?.endsWith('verifyFoundationSpecialWorkflowThreeR1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
