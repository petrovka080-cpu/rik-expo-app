import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {assembleCuringControlTitles12ForwardR1 as assemble} from './curingControlTitles12ForwardAssemblerR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalStoredManualPricesCanMigrate as canMigrate,canonicalManualPriceMigrationBindings as bindings} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/u,'')),before=hash(context);
const options={...context,releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'TEST_ONLY',sourceTree:'TEST_ONLY',sourceFingerprint:'TEST_ONLY',sourceFreezeSha256:'TEST_ONLY',masterSha256:'TEST_ONLY',acceptanceEvidenceSha256:'TEST_ONLY'};
const result=assemble(options),cases:Json[]=[];
const resourceKeys=['row_id','ordinal','section','category','title_ru','row_type','unit_id','formula_id','inclusion_ast','resource_graph','semantic_owner','cost_owner_id','procurement_eligible','source_metadata'];
const parameterKeys=['parameter_id','ordinal','value_type','unit_id','title_ru','required','default_value','constraints_json','truth_metadata'];
const formulaKeys=['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'];
for(const model of result.models){
 const parent=context.parents.find((p:Json)=>p.definition.id===model.parentDefinitionId),plan=model.plan;assert(parent);assert.equal(plan.definition.definition_version,9);
 for(const row of plan.resources){const old=parent.resources.find((r:Json)=>r.row_id===row.row_id);assert(old);
  for(const k of resourceKeys)assert.deepEqual(row[k],k==='title_ru'&&row.row_id===model.changedRowId?model.newTitleRu:old[k],'RESOURCE_BUSINESS_FIELD_CHANGED:'+row.row_id+':'+k);
 }
 for(const p of plan.parameters){const old=parent.parameters.find((q:Json)=>q.parameter_id===p.parameter_id);assert(old);for(const k of parameterKeys)assert.deepEqual(p[k],old[k]);}
 for(const f of plan.formulas){const old=parent.formulas.find((q:Json)=>q.formula_id===f.formula_id);assert(old);for(const k of formulaKeys)assert.deepEqual(f[k],old[k]);}
 for(const b of plan.bindings){const resource=plan.resources.find((r:Json)=>r.id===b.resource_spec_id);assert(resource);const old=parent.bindings.find((q:Json)=>q.row_id===resource.row_id&&q.locator_id===b.locator_id);assert(old);assert.deepEqual(b.applicability,old.applicability);}
 assert.deepEqual(bindings(plan),bindings(parent));
 assert(canMigrate({rowOverrides:{[model.changedRowId]:{unitPrice:'77',provenance:{kind:'manual'}}},customRows:[],fromBindings:bindings(parent),toBindings:bindings(plan)}));
 for(const manualField of [{titleRu:'TEST user control caption'},{quantity:'2'}])assert(!canMigrate({rowOverrides:{[model.changedRowId]:{...manualField,unitPrice:'77',provenance:{kind:'manual'}}},customRows:[],fromBindings:bindings(parent),toBindings:bindings(plan)}),'CUSTOM_TITLE_OR_QUANTITY_MUST_KEEP_EXISTING_BINDING_REVIEW');
 cases.push({catalogId:plan.definition.catalog_id,parentVersion:8,successorVersion:9,changedRowId:model.changedRowId,newTitleRu:model.newTitleRu,
  preservedParameters:108,preservedFormulaAsts:46,preservedManualPriceBindings:46,normativeBindings:16});
}
let rejected=0;
for(const model of result.models)for(const mutation of ['missing','unit','type','semantic']){
 const parents=structuredClone(context.parents),parent=parents.find((p:Json)=>p.definition.id===model.parentDefinitionId),p=parent.parameters.find((q:Json)=>q.parameter_id==='cured_concrete_volume_m3');
 if(mutation==='missing')parent.parameters=parent.parameters.filter((q:Json)=>q!==p);
 if(mutation==='unit')p.unit_id='m2';if(mutation==='type')p.value_type='string';if(mutation==='semantic')p.truth_metadata.semantic_parameter_key='other:surface';
 let error:unknown;try{assemble({...options,parents});}catch(e){error=e;}
 assert.equal((error as {code?:string}|undefined)?.code,'RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED');rejected++;
}
assert.equal(hash(context),before);assert.equal(cases.length,12);assert.equal(rejected,48);
assert(result.preservedCatalogIds.every(c=>c.includes('_slab_foundation_cure_')));
const report={status:'PASS_TWELVE_CONTROL_TITLE_FORWARD_PLANS_PHYSICAL_PRICE_AND_MANUAL_HISTORY_UNCHANGED',cases,
 titleOnlyPlans:12,preservedSlabDefinitions:6,primaryBindingRejections:48,manualFieldReviewRejections:24,preservedParameters:1296,preservedFormulaAsts:552,preservedManualPriceBindings:552,
 publicationPerformed:false,sourceCheckoutEdited:false,nativeAccepted:false,confirmedOrders:0};
fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,titleOnlyPlans:12,primaryBindingRejections:48}));
