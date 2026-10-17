import fs from 'node:fs';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {assemblePileCapCuringNames6ForwardR1 as assemble} from './pileCapCuringNames6ForwardAssemblerR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {PILE_CAP_CURING_TARGETS} from '../../../src/lib/estimate/v4/pileCapCuringR1';
import {PEDESTAL_CURING_TARGETS} from '../../../src/lib/estimate/v4/pedestalCuringR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/u,''));
const context=read(process.argv[2]),fixtures=read(process.argv[3]).cases,before=hash(context);
const options={...context,releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'TEST_ONLY',sourceTree:'TEST_ONLY',sourceFingerprint:'TEST_ONLY',sourceFreezeSha256:'TEST_ONLY',masterSha256:'TEST_ONLY',acceptanceEvidenceSha256:'TEST_ONLY'};
const pick=(o:Json,keys:readonly string[])=>Object.fromEntries(keys.map(k=>[k,o[k]]));
const parameterKeys=['parameter_id','ordinal','value_type','unit_id','title_ru','required','default_value','constraints_json','truth_metadata'];
const formulaKeys=['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'];
const resourceKeys=['row_id','ordinal','section','category','title_ru','row_type','unit_id','formula_id','inclusion_ast','semantic_owner','cost_owner_id','procurement_eligible','source_metadata'];
// Only successor identity/hash fields and the observed display caption differ
// in compiler output. No numeric, payment, quantity or inclusion field is masked.
function comparable(v:any):any{
 if(Array.isArray(v))return v.map(comparable);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['resource_spec_id','row_sha256','rowSha256'].includes(k)).map(([k,x])=>[k,k==='groupTitleRu'?'TEST_DISPLAY_CAPTION':comparable(x)]));
 return v;
}
async function main(){
 const result=assemble(options),cases:Json[]=[];let rejected=0,compiledPairs=0,manualDenied=0;
 for(const model of result.models){const plan=model.plan,parent=context.parents.find((p:Json)=>p.definition.id===model.parentDefinitionId);assert(parent);
  assert.equal(plan.definition.definition_version,11);assert.equal(plan.contract,'rik-expo-app.curing36-individual-materials.r1');assert.deepEqual(plan.passport.decision,parent.passport.decision);assert.deepEqual(plan.definition.applicability,parent.definition.applicability);
  const passport={...parent.definition.passport,canonicalRuName:model.newTitleRu,physicalResultRu:model.newTitleRu};assert.deepEqual(plan.definition.passport,passport);assert.equal(plan.passport.physical_result_ru,model.newTitleRu);
  for(const p of plan.parameters)assert.deepEqual(pick(p,parameterKeys),pick(parent.parameters.find((v:Json)=>v.parameter_id===p.parameter_id),parameterKeys));
  for(const f of plan.formulas)assert.deepEqual(pick(f,formulaKeys),pick(parent.formulas.find((v:Json)=>v.formula_id===f.formula_id),formulaKeys));
  for(const r of plan.resources){const old=parent.resources.find((v:Json)=>v.row_id===r.row_id);assert.deepEqual(pick(r,resourceKeys),pick(old,resourceKeys));assert.deepEqual(r.resource_graph,{...old.resource_graph,operationCompositionV1:{...old.resource_graph.operationCompositionV1,groupTitleRu:model.newTitleRu}});}
  for(const b of plan.bindings){const row=plan.resources.find((r:Json)=>r.id===b.resource_spec_id);assert.deepEqual(b.applicability,parent.bindings.find((v:Json)=>v.row_id===row.row_id&&v.locator_id===b.locator_id).applicability);}
  const serialized=JSON.parse(JSON.stringify(plan));assert.deepEqual(prices(serialized),prices(parent));assert.deepEqual(exclusions(serialized),exclusions(parent));assert.equal(Object.keys(prices(serialized)).length,46);assert.equal(Object.keys(exclusions(serialized)).length,46);
  for(const k of ['parameter_schema_sha256','input_values','input_classification','uom_by_parameter','formula_consumer_ids','resource_consumer_row_ids','normative_source_ids','guide_provenance_ru','proposal_source_refs','validation_scenario_refs','contract_version'])assert.deepEqual(plan.baseline[k],parent.baseline[k]);
  const search=context.searchDocuments.find((s:Json)=>s.catalog_id===plan.definition.catalog_id);assert.deepEqual(Object.keys(model.searchPatch).sort(),['canonical_name_ru','short_scope_ru','normalized_canonical_name','normalized_search_terms','normalized_search_blob'].sort());
  assert(!JSON.stringify(model.searchPatch).includes('пьедестал'));assert(model.searchPatch.short_scope_ru.includes('ростверка'));assert.equal(model.searchPatch.normalized_search_blob,model.searchPatch.normalized_search_terms.join('\u001f'));assert.equal(search.aliases.length,3);
  const sourceTarget=PILE_CAP_CURING_TARGETS.find(t=>t.catalogId===plan.definition.catalog_id);assert.equal(sourceTarget?.titleRu,model.newTitleRu);assert(PEDESTAL_CURING_TARGETS.some(t=>t.titleRu===parent.definition.passport.canonicalRuName));
  const rowId=plan.resources[0].row_id,migration={customRows:[],fromBindings:prices(parent),toBindings:prices(plan),fromExclusionBindings:exclusions(parent),toExclusionBindings:exclusions(plan)};
  assert(canMigrate({...migration,rowOverrides:{[rowId]:{unitPrice:'77',provenance:{kind:'manual'}}}}));assert(canMigrate({...migration,rowOverrides:{[rowId]:{includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}}}));
  for(const extra of [{quantity:'2'},{titleRu:'TEST custom title'}]){assert(!canMigrate({...migration,rowOverrides:{[rowId]:{unitPrice:'77',provenance:{kind:'manual'},...extra}}}));manualDenied++;}
  assert(!canMigrate({...migration,rowOverrides:{},customRows:[{row_id:'manual:TEST'}]}));manualDenied++;
  for(const mutation of ['version','hash','primary_unit','publisher_contract','group_title','search_title']){
   const c=structuredClone(context),p=c.parents.find((v:Json)=>v.definition.id===parent.definition.id),s=c.searchDocuments.find((v:Json)=>v.catalog_id===plan.definition.catalog_id);
   if(mutation==='version')p.definition.definition_version++;if(mutation==='hash')p.definition.definition_sha256='0'.repeat(64);
   if(mutation==='primary_unit')p.parameters.find((v:Json)=>v.parameter_id==='cured_concrete_volume_m3').unit_id='m2';
   if(mutation==='publisher_contract')p.parameters[0].truth_metadata.contract='OTHER';if(mutation==='group_title')p.resources[0].resource_graph.operationCompositionV1.groupTitleRu='Unrelated';if(mutation==='search_title')s.canonical_name_ru='Unrelated';
   assert.throws(()=>assemble({...options,...c}));rejected++;
  }
  const fixture=fixtures.find((f:Json)=>f.model.catalogId===plan.definition.catalog_id);assert(fixture);
  const run=(p:Json)=>compile({operation:'compile',compilerVersion:'TEST_SAME_NUMERICS',catalogId:plan.definition.catalog_id,primaryMeasureParameterId:'cured_concrete_volume_m3',parameterDefinitions:p.parameters,formulaDefinitions:p.formulas,resourceDefinitions:p.resources,submittedParameters:fixture.parameters,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:128,hashJson:hash});
  const old=await run(parent),next=await run(plan);assert.equal(next.preliminaryNeeds.length,0);assert.deepEqual(comparable(next),comparable(old));compiledPairs++;
  cases.push({catalogId:plan.definition.catalog_id,parentVersion:10,successorVersion:11,newTitleRu:model.newTitleRu,preservedParameters:108,preservedFormulaAsts:46,preservedResources:46,preservedNormativeBindings:16,preservedManualPriceBindings:46,preservedManualExclusionBindings:46,compiledFixture:fixture.context});
 }
 assert.equal(hash(context),before);assert.equal(rejected,36);assert.equal(compiledPairs,6);assert.equal(manualDenied,18);assert.equal(result.preservedCatalogIds.length,48);assert.equal(PEDESTAL_CURING_TARGETS.length,6);
 const report={status:'PASS_SIX_PILE_CAP_NAMING_ONLY_SUCCESSORS_NUMERICS_AND_PRICE_HISTORY_PRESERVED',cases,namingOnlyPlans:6,preservedOtherDefinitions:48,preservedManualPriceBindings:276,preservedManualExclusionBindings:276,negativeFences:rejected,manualCustomFieldRejections:manualDenied,identicalCompilerResultPairs:compiledPairs,pedestalSourceTitlesPreserved:6,publicationPerformed:false,nativeAccepted:false,completeRealProjectEstimates:0};
 fs.writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,plans:6,priceBindings:276,exclusionBindings:276,negativeFences:rejected}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
