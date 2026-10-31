import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateRevisionView,type CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../../features/consumerRepair/requestEstimateViewModel';
import {consumerRepairRowIsTechnicalDetail,consumerRepairRowPublicResourcePresentation} from '../../../features/consumerRepair/consumerRepairRowMetadata';
import type {ConsumerRepairDraftBundle} from '../../consumerRequests/consumerRequestTypes';
import {buildCt126PreparedWallBranchesR2 as build,ct126PreparedWallBranchesPackR2 as pack,ct126PreparedWallParameterMapR2 as parameterMap,
 ct126PreparedWallCompletenessMapR2 as completeness,overlayCt126PreparedWallBranchesR2 as overlay} from './ct126PreparedWallBranchesR2';
import {ct126PreparedSeriesSourceS2754 as prepared} from './ct126PreparedSeriesS2754';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency,buildMasterPublicationResourceRowsR1} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {buildCt126SixDryWallMigrationProofS2769 as proof,admitCt126SixDryWallMigrationProofS2769 as admit} from '../backendPlatform/canonicalCt126SixDryWallMigrationS2769';
import {canonicalPublicResourceDisplayPresentationV1 as presentation} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../../data/estimate-benchmarks/fixtures/ct126-current-four-v4-parents-r2.json') as {reps:Rep[]};
const oldProfiles=require('../../../../data/estimate-benchmarks/fixtures/ct126-ready-wall-v2-s27-69.json') as {representative:Rep};
const choiceId='wall_leveling_technology_choice';
const compile=(r:Rep,input:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:r.definition.catalog_id,compilerVersion:pack.contract,primaryMeasureParameterId:'q',
 definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],
 runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']},submittedParameters:input});
function facts(index:number,bag=20){
 const profile=pack.profiles.find(p=>p.preparedIndex===index)!,source=prepared.variants[index]!.pack,m=parameterMap(index),key='ct126_'+bag+'kg';
 const input:Record<string,unknown>={putty_area_m2:'17.75',layer_thickness_mm:10,base_confirmed:source.baseValue,conditions_confirmed:source.conditionsValue,
  product_variant_confirmed:source.productValue,base_acceptance_reference:'CONTROL_ONLY: принятый участок и выполненный грунт; не реальный акт',selected_ct126_bag:bag+' кг',
  [key+'_planned_whole_batches']:bag===20?11:43,[key+'_stock_bags']:0,[key+'_reserve_bags']:0,[key+'_supplier_bag_multiple']:1,
  water_stock_l:0,water_reserve_l:0,water_quantum_l:1};
 return{...Object.fromEntries(Object.entries(input).map(([id,value])=>[m[id]!,value])),[choiceId]:profile.choiceValue};
}
function oldFacts(){const source={...oldProfiles.representative.baseline.input_values,putty_area_m2:'17.75',layer_thickness_mm:10,ct126_20kg_planned_whole_batches:11,ct126_20kg_stock_bags:0,ct126_20kg_reserve_bags:0,ct126_20kg_supplier_bag_multiple:1,water_stock_l:0,water_reserve_l:0,water_quantum_l:1};return{...Object.fromEntries(Object.entries(source).map(([id,value])=>[id==='putty_area_m2'?'q':'ct126_wall_'+id,value])),[choiceId]:pack.exactChoiceRu};}
const ledger=(result:Awaited<ReturnType<typeof compile>>)=>result.rows.map(r=>({id:r.row_id,quantity:r.quantity,unit:r.unit_id,category:r.category,included:r.included_in_procurement}));
for(const parent of parents.reps){
 test('current v4 plus two whole profiles, owners, reciprocal consumers and 33 potential needs: '+parent.definition.catalog_id,()=>{
  const before=JSON.stringify(parent),r=build(parent),d=overlay(parent);expect(JSON.stringify(parent)).toBe(before);
  expect([r.parameters.length,r.formulas.length,r.resources.length]).toEqual([97,149,149]);expect(d.addedRowIds).toHaveLength(60);expect(d.addedParameterIds).toHaveLength(64);
  for(const row of r.resources.filter(row=>d.addedRowIds.includes(row.row_id)))expect(row.row_type).toBe(row.category);
  expect(r.resources.filter(row=>d.addedRowIds.includes(row.row_id)&&row.row_type==='labor')).toHaveLength(2);
  expect(r.parameters.find(p=>p.parameter_id===choiceId)!.constraints_json.values).toEqual([pack.exactChoiceRu,...pack.profiles.map(p=>p.choiceValue)]);
  expect(r.parameters.find(p=>p.parameter_id==='q')!.default_value).toBeNull();expect(r.parameters.every(p=>p.default_value==null)).toBe(true);
  for(const row of parent.resources){const next=r.resources.find(n=>n.row_id===row.row_id)!;expect(next.cost_owner_id).toBe(row.cost_owner_id);expect(next.resource_graph).toEqual(row.resource_graph);expect(next.source_metadata).toEqual(row.source_metadata);expect(next.row_type).toBe(row.row_type);}
  for(const f of parent.formulas)expect(r.formulas.find(n=>n.formula_id===f.formula_id)).toEqual(f);
  expect(r.passport.decision.unresolvedResourceRowIds).toHaveLength(33);expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
  expect(r.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(33);
  expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);expect(validateMasterFormulaGraphConsistency(r.formulas)).toEqual([]);
  const consumers=buildMasterParameterCalculationConsumers(r);
  for(const p of r.parameters){expect(p.truth_metadata.formula_consumers).toEqual(consumers.formulaConsumers[p.parameter_id]);expect(p.truth_metadata.resource_branch_consumers).toEqual(consumers.resourceConsumers[p.parameter_id]);}
  expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:r.formulas,resourceDefinitions:r.resources})).toEqual([]);
 });
 test('saved original exact choice needs no new profile input and retains original ledger: '+parent.definition.catalog_id,async()=>{
  const input=oldFacts();expect(ledger(await compile(build(parent),input))).toEqual(ledger(await compile(parent,input)));
  const result=await compile(build(parent),input);expect(result.preliminaryNeeds).toHaveLength(11);expect(result.rows.every(r=>r.row_id.startsWith('putty:ct126-dry-wall:'))).toBe(true);
 });
 for(const profile of pack.profiles)for(const bag of [5,20])test('exclusive complete profile '+profile.key+' '+bag+'kg '+parent.definition.catalog_id,async()=>{
  const r=build(parent),input=facts(profile.preparedIndex,bag),result=await compile(r,input),value=(suffix:string)=>result.rows.find(row=>row.row_id===profile.sourcePrefix+':'+suffix)?.quantity;
  expect(result.rows).toHaveLength(10);expect(result.preliminaryNeeds).toHaveLength(11);expect(result.rows.every(row=>row.row_id.startsWith(profile.sourcePrefix+':'))).toBe(true);
  expect(result.rows.filter(row=>row.included_in_procurement)).toHaveLength(2);expect(value('net-mixture')).toBe('213');
  expect(value(bag+'kg-mix-water-consumed')).toBe(bag===20?'77':'77.4');expect(value(bag+'kg-order')).toBe(bag===20?'220':'215');
  expect(result.preliminaryNeeds.every(n=>n.row_id.startsWith(profile.sourcePrefix+':'))).toBe(true);
  const other=pack.profiles.find(p=>p.key!==profile.key)!;expect(r.parameters.filter(p=>p.parameter_id.startsWith(other.parameterPrefix)).every(p=>p.required===false)).toBe(true);
  for(const row of r.resources.filter(row=>row.row_id.startsWith(profile.sourcePrefix+':'))){const d=presentation({rowId:row.row_id,titleRu:row.title_ru,descriptor:row.resource_graph.publicResourcePresentationV1});expect(d).not.toBeNull();expect(d!.nameRu).not.toMatch(/Ceresit|CT126|CT7|CT19/iu);}
 });
}
test.each(pack.profiles.map(p=>[p.key,p.preparedIndex] as const))('preserves exact substrate/primer acceptance and 2–10mm guards: %s',async(_key,index)=>{
 const parent=parents.reps[0]!,r=build(parent),m=parameterMap(index),input=facts(index);
 for(const missing of ['base_confirmed','product_variant_confirmed','base_acceptance_reference'])expect((await compile(r,{...input,[m[missing]!]:undefined})).rows).toHaveLength(0);
 const other=prepared.variants[index===0?1:0]!.pack;
 await expect(compile(r,{...input,[m.base_confirmed!]:other.baseValue})).rejects.toThrow(/invalid enum/);
 for(const layer of [1.99,10.01])await expect(compile(r,{...input,[m.layer_thickness_mm!]:layer})).rejects.toThrow();
 await expect(compile(r,{...input,[m.ct126_20kg_planned_whole_batches!]:10})).rejects.toThrow();
 await expect(compile(r,{...input,[m.open_qty_labor!]:1})).rejects.toThrow();
 const stock=await compile(r,{...input,[m.ct126_20kg_stock_bags!]:4,[m.ct126_20kg_reserve_bags!]:1,[m.ct126_20kg_supplier_bag_multiple!]:2});
 const prefix=pack.profiles.find(p=>p.preparedIndex===index)!.sourcePrefix;
 expect(stock.rows.find(row=>row.row_id===prefix+':20kg-order')?.quantity).toBe('160');expect(stock.rows.find(row=>row.row_id===prefix+':20kg-mix-water-consumed')?.quantity).toBe('77');
});
test('independent physical units/category reject corrupted prepared water; current/retired preimage rejects unrelated parents',()=>{
 const r=build(parents.reps[0]!),map=completeness(),water=pack.profiles[0]!.sourcePrefix+':5kg-mix-water-consumed';
 for(const mutation of [{unit_id:'m3'},{category:'equipment'}])expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:r.formulas,resourceDefinitions:r.resources.map(row=>row.row_id===water?{...row,...mutation}:row)}).length).toBeGreaterThan(0);
 expect(()=>build({...parents.reps[0]!,definition:{...parents.reps[0]!.definition,definition_version:3}})).toThrow('EXACT_CURRENT');
 for(const blocked of pack.blockedHistoricalAreaIds)expect(()=>build({...parents.reps[0]!,definition:{...parents.reps[0]!.definition,catalog_id:blocked.catalogId}})).toThrow('EXACT_CURRENT');
});
test('same admission entry point binds R2 exact semantic models and preserves previous migration owners',()=>{
 const parent=parents.reps[0]!,to=build(parent),fromDefinition={id:parent.definition.id,catalogId:parent.definition.catalog_id,sha256:parent.definition.definition_sha256},toDefinition={id:'12345678-1234-5678-8abc-123456789abc',catalogId:parent.definition.catalog_id,sha256:'a'.repeat(64)};
 const input={fromDefinition,toDefinition,from:parent,to},p=proof(input);expect(p.contractVersion).toBe('canonical-ct126-six-dry-wall-migration/r2');
 expect(admit({...input,proof:p})?.normalizedTo).toBe(parent);
 const changed=structuredClone(to);changed.resources.find(row=>row.row_id===pack.profiles[0]!.sourcePrefix+':net-mixture')!.unit_id='l';
 expect(admit({...input,to:changed,proof:proof({...input,to:changed})})).toBeNull();
});


// Pure retained-writer rehearsal only: no DB, publisher run, apply or child process.
const nodeFs=require('node:fs') as typeof import('node:fs');
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {ct126PreparedWallMasterConfigR2,ct126PreparedWallMasterRecipeRegistryR2} from '../../../../scripts/estimate/r4a13/prepareCt126PreparedWallBranchesR2';
import {prepareMasterRetainedBindingRepresentativeR1,assertMasterRetainedBindingPlanR1,assertMasterRetainedBindingSnapshotR1,masterRetainedParentCaptureSha256R1,type MasterRetainedBindingGuardInputR1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {createCanonicalDefinitionClonePlan} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/ct126-current-four-v4-parents-r2.json');
function sourceOnlyConfig(catalogId:string){
 const real=nodeFs.readFileSync;
 const mock=jest.spyOn(nodeFs,'readFileSync').mockImplementation(((file:any,...args:any[])=>{
  if(typeof file==='string'){
   const rel=relative(process.cwd(),resolve(file));
   if(!rel.startsWith('..')&&!isAbsolute(rel)){
    const candidate=resolve(__dirname,'../../../..',rel);
    if(nodeFs.existsSync(candidate))return(real as any)(candidate,...args);
   }
  }
  return(real as any)(file,...args);
 }) as typeof nodeFs.readFileSync);
 try{return ct126PreparedWallMasterConfigR2({releaseId:fixture.current.definitionReleaseId,searchReleaseId:fixture.current.searchReleaseId},catalogId);}
 finally{mock.mockRestore();}
}
const uuid=(s:string)=>{const h=createHash('sha256').update(s).digest('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
for(const target of pack.targets)test('existing Master retained clone, 7 exact bindings and 64 explicit parameter sources: '+target.catalogId,async()=>{
 const config=sourceOnlyConfig(target.catalogId),opt=config.binding.retainParentBindings!,c=opt.capturedParent,sourceId=uuid(target.sourceId),locatorId=uuid(target.sourceId+':locator'),metadata=config.sourceMetadata;
 expect(ct126PreparedWallMasterRecipeRegistryR2).toHaveLength(4);expect(opt.capturedParentSha256).toBe(masterRetainedParentCaptureSha256R1(c));
 expect(config.expectedParentShape).toEqual([33,89,89]);expect(config.binding.ct126PreparedWallMigrationR2).toBe(true);
 expect(config.passport.canonicalRuName).toBe(c.definition.passport.titleRu);expect(config.passport.canonicalRuName).not.toMatch(/CT126|VGT|Ceresit/iu);
 const declared=Object.values(opt.newParameterSources);expect(declared).toHaveLength(64);
 expect(declared.filter(p=>p.kind==='UNRESOLVED'&&p.sourceIds.length===0)).toHaveLength(22);
 expect(declared.filter(p=>p.kind==='KNOWN'&&p.sourceIds.join('|')===target.sourceId)).toHaveLength(34);
 expect(declared.filter(p=>p.kind==='DERIVED'&&p.sourceIds.join('|')===target.sourceId)).toHaveLength(8);
 const input:MasterRetainedBindingGuardInputR1={config,newSource:{id:sourceId,source_key:target.sourceId,title_ru:metadata.source_title,authority:metadata.source_authority,
  official_url:metadata.official_url,artifact_sha256:metadata.artifact_sha256,effective_from:null,effective_to:null,metadata:{sourceKind:metadata.source_kind,useRestriction:metadata.use_restriction}},
  newLocators:[{id:locatorId,source_id:sourceId,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:'b'.repeat(64)}]};
 const captured={membership:[{release_id:config.parentReleaseId,catalog_id:target.catalogId,definition_version_id:c.definition.id,approved_template_baseline_id:c.baseline.id,definition_hash:c.definition.definition_sha256}],capture:c,newSources:[],newLocators:[]};
 expect(()=>assertMasterRetainedBindingSnapshotR1(input,captured)).not.toThrow();
 const fromDefinition={id:c.definition.id,catalogId:target.catalogId,sha256:c.definition.definition_sha256},toDefinition={id:uuid(target.catalogId+':successor'),catalogId:target.catalogId,sha256:'c'.repeat(64)};
 const rows=[config.binding.rowId,...(config.binding.additionalRowIds??[])],newBindings=rows.map(row_id=>({row_id,locator_id:locatorId,applicability:config.binding.applicabilityByRowId![row_id]}));
 // Same order as the real writer: core verification precedes publication row preparation.
 const evidence=await config.verifyCore();
 const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions);
 expect(resources.map(r=>r.row_type)).toEqual(config.resourceDefinitions.map(r=>r.row_type));
 const model={parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources};
 const {formulaConsumers,resourceConsumers}=buildMasterParameterCalculationConsumers(model);
 const publicationTruth=(parameter:any)=>({...parameter.truth_metadata,contract:config.contract,semantic_parameter_key:`${target.catalogId}:${parameter.parameter_id}`,formula_consumers:formulaConsumers[parameter.parameter_id],resource_branch_consumers:resourceConsumers[parameter.parameter_id]});
 const publicationModel={...model,parameters:model.parameters.map(p=>({...p,truth_metadata:publicationTruth(p)}))};
 const truthDiff=model.parameters.flatMap(p=>Object.keys({...p.truth_metadata,...publicationTruth(p)}).filter(k=>JSON.stringify(p.truth_metadata[k])!==JSON.stringify(publicationTruth(p)[k])).map(k=>({parameter:p.parameter_id,key:k,before:p.truth_metadata[k],after:publicationTruth(p)[k]})));
 expect(truthDiff).toEqual([]);
 const migration=proof({fromDefinition,toDefinition,from:c,to:publicationModel});
 const assembled=prepareMasterRetainedBindingRepresentativeR1(input,{...model,newBindings,successorProvenance:{contract:config.contract,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:opt.capturedParentSha256,ct126PreparedWallMigrationR2:migration}});
 expect(assembled.bindings).toHaveLength(7);
 for(const [id,oldSources] of Object.entries(c.baseline.normative_source_ids))expect(assembled.normativeSourceIds[id]).toEqual(oldSources);
 expect(assembled.sourceMetadata.ct126SixDryWallMigrationS2769).toEqual(c.definition.source_metadata.ct126SixDryWallMigrationS2769);
 const original=fixture.reps.find((r:Rep)=>r.definition.catalog_id===target.catalogId)!;
 const plan=createCanonicalDefinitionClonePlan({contract:config.contract,definition:{id:toDefinition.id,releaseId:uuid('release'),catalogId:target.catalogId,definitionVersion:5,passport:{canonicalRuName:config.passport.canonicalRuName},applicability:config.applicability,definitionSha256:toDefinition.sha256,sourceMetadata:assembled.sourceMetadata},
  representative:{parameters:[...model.parameters],formulas:[...model.formulas],resources:[...model.resources],bindings:[...assembled.bindings],baseline:{...build(original).baseline,normative_source_ids:assembled.normativeSourceIds},passport:build(original).passport},
  parameterTruthMetadata:publicationTruth,resourceId:r=>uuid(target.catalogId+':'+r.row_id),resourceSemanticOwner:r=>c.resources.find(old=>old.row_id===r.row_id)?.semantic_owner??target.catalogId+':'+r.row_id,resourceSha256:()=>'d'.repeat(64),
  baseline:{id:uuid('baseline'),key:'CONTROL_ONLY_R2',sourceDefinitionVersionId:c.definition.id,validationScenarioRefs:[],acceptanceEvidenceSha256:'e'.repeat(64),acceptedReleaseId:uuid('release'),supersedesBaselineId:c.baseline.id},
  passport:{physicalResultRu:config.passport.physicalResultRu,excludedScopeRu:config.passport.excludedScopeRu,decision:build(original).passport.decision,payloadSha256:'f'.repeat(64),sourceHead:'0'.repeat(40),sourceTree:'1'.repeat(40)},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:7});
 expect(()=>assertMasterRetainedBindingPlanR1(input,plan,assembled)).not.toThrow();expect(canonicalPublisherQuantityScopeIsConsistent(plan)).toBe(true);
 expect(admit({fromDefinition,toDefinition,from:c,to:plan,proof:migration})).not.toBeNull();
 expect(evidence.activeNeeds).toBe(11);expect(evidence.newFullTechnologies).toBe(0);
 const changed=structuredClone(captured);changed.capture.formulas[0]!.created_at+=' changed';
 expect(()=>assertMasterRetainedBindingSnapshotR1(input,changed)).toThrow('PARENT_FULL_CAPTURE_DRIFT');
});

// A recomputed proof cannot bless a row/guard/owner/source/consumer mutation.
test('R2 rejects missing or corrupted publication type and changed source semantics',()=>{
 const parent=parents.reps[0]!,fromDefinition={id:parent.definition.id,catalogId:parent.definition.catalog_id,sha256:parent.definition.definition_sha256},toDefinition={id:'12345678-1234-5678-8abc-123456789abc',catalogId:parent.definition.catalog_id,sha256:'a'.repeat(64)},original=build(parent),prefix=pack.profiles[0]!.sourcePrefix;
 const changes:Array<[string,(r:Rep)=>void]>=[
  ['absent SQL row type',r=>{delete r.resources.find(x=>x.row_id===prefix+':net-mixture')!.row_type;}],
  ['labour misclassified by fallback',r=>{r.resources.find(x=>x.row_id===prefix+':labor')!.row_type='other';}],
  ['wrong physical unit',r=>{r.resources.find(x=>x.row_id===prefix+':net-mixture')!.unit_id='l';}],
  ['second cost owner',r=>{r.resources.find(x=>x.row_id===prefix+':20kg-order')!.cost_owner_id='another-owner';}],
  ['removed source need',r=>{r.resources=r.resources.filter(x=>x.row_id!==prefix+':labor');}],
  ['missing exact branch guard',r=>{r.resources.find(x=>x.row_id===prefix+':net-mixture')!.inclusion_ast={kind:'literal',value:true};}],
  ['changed provenance',r=>{r.resources.find(x=>x.row_id===prefix+':net-mixture')!.source_metadata.normativeTrace=[];}],
  ['missing reciprocal consumers',r=>{r.parameters.find(p=>p.parameter_id===parameterMap(0).layer_thickness_mm)!.truth_metadata.resource_branch_consumers=[];}],
 ];
 for(const[label,change] of changes){const to=structuredClone(original);change(to);const input={fromDefinition,toDefinition,from:parent,to};expect({label,admission:admit({...input,proof:proof(input)})}).toEqual({label,admission:null});}
});


test('a whole cryptographically bound CT126 profile folds counters and retains14 physical resources and11 unknowns',async()=>{
 const model=build(parents.reps[0]!),catalogId=model.definition.catalog_id;
 const result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId,primaryMeasureParameterId:'q',
  parameterDefinitions:model.parameters as unknown as AutomaticOwnerDefinition['parameters'][number][],formulaDefinitions:model.formulas as unknown as AutomaticOwnerDefinition['formulas'][number][],
  resourceDefinitions:model.resources as unknown as AutomaticOwnerDefinition['resources'][number][],submittedParameters:facts(0),confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:model.resources.length,
  hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',catalog_id:catalogId,
  definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
  input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
 const catalog:CanonicalEstimateCatalogItem={catalogId,releaseId:stored.release_id,namespace:'global',workKey:'ct126-admission-fixture',titleRu:'Выравнивание стен',domain:'plaster_paint',definitionVersion:5,applicability:{},professionalMetadata:{},parameterSchema:[]};
 const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,releaseId:stored.release_id,catalogId,
  revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,rowCount:result.rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:pack.contract,createdAt:'2026-10-21T00:00:00Z',
  amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
 const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
 const draft=buildStructuredEstimateRequestDraft(payload),items=draft.items.map((item,index)=>({...item,id:'ct-role-'+index,requestDraftId:'ct-role'}));
 const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'ct-role'},items,structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
 const before=JSON.stringify(bundle),visible=buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items),physical=visible.filter(item=>!consumerRepairRowIsTechnicalDetail(item));
 expect(bundle.items).toHaveLength(21);expect(physical).toHaveLength(14);expect(physical.filter(item=>item.sourceParameters?.canonicalPreliminaryNeed===true)).toHaveLength(11);
 const counter=visible.find(item=>String(item.sourceParameters?.rowCode).endsWith(':20kg-planned-batches'))!;
 expect(consumerRepairRowPublicResourcePresentation(counter)).toMatchObject({rowKind:'CALCULATION_DETAIL'});expect(consumerRepairRowIsTechnicalDetail(counter)).toBe(true);
 // A hidden balance row is still part of admission, so tampering it cannot
 // authorize another row's view-only role or source presentation.
 const balance=bundle.items.find(item=>String(item.sourceParameters?.rowCode).endsWith(':20kg-prepared-mixture'))!;
 const tampered={...bundle,items:bundle.items.map(item=>item===balance?{...item,sourceParameters:{...item.sourceParameters,rowSha256:'f'.repeat(64)}}:item)};
 const rejected=buildRequestEstimateViewModel(tampered)!.sections.flatMap(section=>section.items).find(item=>item.id===counter.id)!;
 expect(consumerRepairRowPublicResourcePresentation(rejected)).toBeNull();
 expect(buildRequestEstimateViewModel(tampered)!.sections.flatMap(section=>section.items).filter(item=>item.sourceParameters?.canonicalPreliminaryNeed===true)).toHaveLength(11);
 expect(JSON.stringify(bundle)).toBe(before);
});
