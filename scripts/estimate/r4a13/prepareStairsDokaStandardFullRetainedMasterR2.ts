// WORK R2: thin retained-parent declaration for the existing Master writer; no PG, CLI or second writer.
// Full capture9951 is authoritative; original projected A/V5/declaration fixtures are unchanged historical witnesses.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {prepareStairsDokaStandardSourceVariantFactoryDraftR1 as originalDraft,
 stairsDokaStandardSourceVariantControlR1 as control,verifyStairsDokaStandardSourceVariantCoreR1 as originalCore} from './prepareStairsDokaStandardSourceVariantFactoryDraftR1';
import {stairsDokaStandardCapturedDefinitionR1 as oldProjected,buildStairsDokaStandardSourceVariantR1 as build,
 stairsDokaStandardVariantSelectorR1 as selector,stairsDokaStandardVariantParentR1 as historicalParent} from '../../../src/lib/estimate/v4/stairsDokaStandardSourceVariantR1';
import {monolithicStair111PackR1 as source,monolithicStair111PrefixR1 as prefix} from '../../../src/lib/estimate/v4/monolithicStairDokaKrer06Column11101R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
type EvidencePaths=Readonly<{inputPath?:string;fullReadPath?:string;closedGuardPath?:string;historicalReadContextPath?:string}>;
const INPUT={"path": "data/estimate-benchmarks/fixtures/stairs-doka-standard-full-retained-config-inputs-r3.json", "sha256": "4df25cc0a05fa1c3ae60f31553593f528930ecbf7ff9e07c8f3a3941f966a82b", "bytes": 8106};
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const exact=(p:Pin):Json=>{const b=readFileSync(resolve(p.path));assert.equal(sha(b),p.sha256,'DOKA_R2_EXACT_PIN:'+p.path);return JSON.parse(b.toString('utf8'));};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
/** Reconstruct only from exact full raw-DDL sets; never pad projected source/header fields with null or a timestamp. */
export function stairsDokaStandardFullRetainedCaptureR2(paths:EvidencePaths={}){
 paths={fullReadPath:'data/estimate-benchmarks/fixtures/stairs-doka-standard-full-retention-read-r2.json',closedGuardPath:'data/estimate-benchmarks/fixtures/stairs-doka-standard-full-retention-closed-guard-r2.json',historicalReadContextPath:'data/estimate-benchmarks/fixtures/stairs-doka-standard-full-retention-historical-context-r2.json',...paths};
 const input=exact({path:paths.inputPath??INPUT.path,sha256:INPUT.sha256});
 const evidencePins={fullRead:{...input.fullRead,path:paths.fullReadPath??input.fullRead.path},
  closedGuard:{...input.closedGuard,path:paths.closedGuardPath??input.closedGuard.path},
  historicalReadContext:{...input.historicalReadContext,path:paths.historicalReadContextPath??input.historicalReadContext.path}};
 for(const pin of input.sourcePinsAtIntegration??input.sourcePinsAtPreparation)assert.equal(sha(readFileSync(resolve(pin.path))),pin.sha256,'DOKA_R2_PREPARATION_SOURCE_PIN:'+pin.path);
 const actual=exact(evidencePins.fullRead),guard=exact(evidencePins.closedGuard),rootContext=exact(evidencePins.historicalReadContext);
 assert.equal(actual.status,'PASS_EXACT_DOKA_OLD_PARENT_NINE_FULL_PREIMAGE_SETS');assert.equal(actual.completeReadSet,true);
 assert.equal(actual.transactionRolledBack,true);assert.equal(actual.connectionClosed,true);assert.equal(actual.error,null);
 assert.equal(actual.databaseWrites,false);assert.equal(actual.appJobs,false);
 assert.equal(guard.status,'PASS_BOUNDED_PAVING_CURRENT_SCOPE_READ_ONLY');assert.equal(guard.noOwnedProcessStillRunning,true);
 assert.deepEqual(guard.remainingOwnedProcesses,[]);assert.deepEqual(guard.cleanupErrors,[]);
 assert.deepEqual(rootContext.executionContext,actual.executionContext);assert.equal(actual.rootExecutionProofSha256,evidencePins.historicalReadContext.sha256);
 const counts:Record<string,number>={manifestFiveFieldAnchor:1,fullDefinitionRows:1,fullBaselineRows:1,fullParameterRows:188,
  fullFormulaRows:92,fullResourceRows:95,fullPhysicalBindingRows:8,fullNormativeSourceRows:2,fullNormativeLocatorRows:2};
 assert.deepEqual(Object.keys(actual.sets).sort(),Object.keys(counts).sort());
 const rows:Record<string,Json[]>={};for(const [key,count] of Object.entries(counts)){
  const set=actual.sets[key];assert.equal(set.rowCount,count);assert.equal(set.rawRows.length,count);
  assert.equal(sha(set.rawRows.join('\n')+'\n'),set.sha256,'DOKA_R2_RAW_SET:'+key);
  rows[key]=set.rawRows.map((raw:string)=>JSON.parse(raw));
 }
 const capturedParent:MasterRetainedParentCaptureR1={definition:rows.fullDefinitionRows![0]!,baseline:rows.fullBaselineRows![0]!,
  parameters:rows.fullParameterRows!,formulas:rows.fullFormulaRows!,resources:rows.fullResourceRows!,bindings:rows.fullPhysicalBindingRows!,
  normativeSources:rows.fullNormativeSourceRows!,normativeLocators:rows.fullNormativeLocatorRows!};
 assert.equal(capturedParent.definition.id,input.parentDefinitionVersionId);assert.equal(capturedParent.definition.definition_sha256,input.parentDefinitionSha256);
 assert.equal(capturedParent.baseline.id,input.parentBaselineId);assert.equal(capturedParent.baseline.definition_version_id,capturedParent.definition.id);
 const membership=rows.manifestFiveFieldAnchor![0]!;
 assert.deepEqual(Object.keys(membership).sort(),['release_id','catalog_id','definition_version_id','approved_template_baseline_id','definition_hash'].sort());
 assert.equal(membership.release_id,actual.executionContext.definitionReleaseId);assert.equal(membership.catalog_id,capturedParent.definition.catalog_id);
 assert.equal(membership.definition_version_id,capturedParent.definition.id);assert.equal(membership.approved_template_baseline_id,capturedParent.baseline.id);
 assert.equal(membership.definition_hash,capturedParent.definition.definition_sha256);
 // Source microseconds/effective_to/created_at and every DDL column are kept as raw JSON strings/values.
 assert.deepEqual(capturedParent.normativeSources.map(s=>s.source_key).sort(),['manufacturer_sika_antisol250w_us_202006_v0103','stairs_complete_installation_standard_s27_23']);
 for(const s of capturedParent.normativeSources)for(const key of ['effective_to','created_at'])assert(Object.hasOwn(s,key),'SOURCE_FULL_DDL_COLUMN:'+key);
 const old=oldProjected();
 const assertSubset=(before:readonly Json[],full:readonly Json[],key:string,joinedCatalog=false)=>{
  assert.equal(before.length,full.length);const by=new Map(full.map(r=>[r[key],r]));assert.equal(by.size,full.length);
  for(const row of before){const copied={...row};if(joinedCatalog)delete copied.catalog_id;assert.deepEqual(copied,by.get(row[key]),'EXACT_FULL_BUSINESS_PREIMAGE:'+row[key]);}
 };
 assertSubset(old.parameters,capturedParent.parameters,'parameter_id',true);assertSubset(old.formulas,capturedParent.formulas,'formula_id');
 assertSubset(old.resources,capturedParent.resources,'row_id');
 return {input,evidencePins,actual,capturedParent,membership,capturedParentSha256:masterRetainedParentCaptureSha256R1(capturedParent)};
}
/** Reuse the adopted95-row disposition/301-137-140 builder, but use actual full p/f/r preimages in the representative. */
export function stairsDokaStandardFullRetainedComputationR2(paths:EvidencePaths={}){
 const full=stairsDokaStandardFullRetainedCaptureR2(paths),d=build(),c=full.capturedParent;
 const oldParameterIds=new Set(c.parameters.map(p=>p.parameter_id)),oldFormulaIds=new Set(c.formulas.map(f=>f.formula_id));
 const variantRows=new Map(d.resources.map(r=>[r.row_id,r]));
 const resources:Json[]=[...c.resources.map(old=>{
  const variant=variantRows.get(old.row_id)!;assert(variant);assert.equal(variant.id,old.id);
  assert.deepEqual(variant.source_metadata,old.source_metadata,'OLD_PROVENANCE_RETAINED:'+old.row_id);
  // Only reviewed inclusion/context gates and their row hash change; metadata, physical owner, unit, formula and IDs are not remapped.
  return {...clone(old),inclusion_ast:clone(variant.inclusion_ast),resource_graph:clone(variant.resource_graph),row_sha256:variant.row_sha256};
 }),...d.resources.filter(r=>!c.resources.some(old=>old.row_id===r.row_id))];
 const parameters=[...clone(c.parameters),...d.parameters.filter(p=>!oldParameterIds.has(p.parameter_id))];
 const formulas=[...clone(c.formulas),...d.formulas.filter(f=>!oldFormulaIds.has(f.formula_id))];
 assert.deepEqual([parameters.length,formulas.length,resources.length],[301,137,140]);
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(parameters.filter(p=>!oldParameterIds.has(p.parameter_id)).map(p=>{
  const role=String(p.truth_metadata.value_source_role),unresolved=role==='UNRESOLVED_APPLICATION_NORM',derived=role.includes('DERIVED');
  const reciprocal=derived&&role==='COMPILER_DERIVED_RESOURCE_QUANTITY'&&p.truth_metadata.visibility_role==='INTERNAL_ONLY'
   &&p.truth_metadata.effective_resource_quantity_v1!=null;
  return [p.parameter_id,{kind:unresolved?'UNRESOLVED':derived?'DERIVED':'KNOWN',sourceIds:unresolved||reciprocal?[]:[source.sourceId]}];
 }));
 assert.equal(Object.keys(newParameterSources).length,113);
 const retainParentBindings:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:full.capturedParentSha256,newParameterSources};
 const ids=Object.keys(c.baseline.input_classification).filter(id=>c.baseline.input_classification[id]!=='VALIDATION_FIXTURE');assert.equal(ids.length,24);
 const runtimeProfileInput:Json={},runtimeProfileClassification:Record<string,'NORMATIVE'|'ASSUMPTION'|'DERIVED'|'RUNTIME_STRUCTURAL_DEFAULT'>={},runtimeProfileSourceIds:Record<string,readonly string[]>={};
 for(const id of ids){const kind=c.baseline.input_classification[id];assert(['NORMATIVE','ASSUMPTION','DERIVED','RUNTIME_STRUCTURAL_DEFAULT'].includes(kind));
  assert(Object.hasOwn(c.baseline.input_values,id));runtimeProfileInput[id]=clone(c.baseline.input_values[id]);runtimeProfileClassification[id]=kind;
  runtimeProfileSourceIds[id]=clone(c.baseline.normative_source_ids[id]);}
 assert(!Object.hasOwn(runtimeProfileInput,selector),'NO_INVENTED_DOKA_RUNTIME_DEFAULT');
 return {...full,definition:{...d,parameters,formulas,resources},retainParentBindings,runtimeProfileInput,runtimeProfileClassification,runtimeProfileSourceIds};
}
type DeferredFields=Omit<MasterSingleDefinitionSuccessorConfig,'parentReleaseId'|'parentSearchReleaseId'>;
/** Parent IDs are intentionally absent until ROOT supplies reviewed actual ELECOR close/readback + fresh execution pin.
 * The returned object cannot be passed directly to runMasterSingleDefinitionSuccessorR1. */
export function prepareStairsDokaStandardFullRetainedMasterDraftR2(paths:EvidencePaths={}){
 const prepared=stairsDokaStandardFullRetainedComputationR2(paths),old=originalDraft(),d=prepared.definition,c=prepared.capturedParent;
 const fields:DeferredFields={...old.knownConfigFields,
  contract:'gox-build.stairs-doka-standard-source-variant-retained/r2',stopCode:'STAIRS_DOKA_STANDARD_RETAINED',applicationName:'stairs-doka-standard-retained',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:prepared.input.master.path,masterSha256:prepared.input.master.sha256,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve('.release-runtime/r568/next-wave/stairs-doka-standard/publication'),
  sourcePaths:['scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR2.ts','scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR2.test.ts',
   'scripts/estimate/r4a13/prepareStairsDokaStandardSourceVariantFactoryDraftR1.ts','src/lib/estimate/v4/stairsDokaStandardSourceVariantR1.ts',
   'src/lib/estimate/v4/stairsDokaStandardSourceVariantR1.test.ts','src/lib/estimate/v4/monolithicStairDokaKrer06Column11101R1.ts',
   'data/estimate-benchmarks/source-packs/monolithic-stair-doka-krer06-111-01-r1.json','data/estimate-benchmarks/source-packs/stairs-doka-standard-source-variant-dispositions-r1.json',
   'data/estimate-benchmarks/fixtures/stairs-doka-standard-current-parent-r1.json','data/estimate-benchmarks/fixtures/stairs-doka-standard-retention-declaration-r1.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalStairsSourceVariantSavedParentR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',source.source.path,
   paths.inputPath??INPUT.path,...Object.values(prepared.evidencePins).map((p:any)=>p.path)],
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  runtimeProfileInput:prepared.runtimeProfileInput,runtimeProfileClassification:prepared.runtimeProfileClassification,runtimeProfileSourceIds:prepared.runtimeProfileSourceIds,
  acceptanceInput:{...control(),...prepared.runtimeProfileInput},binding:{...old.knownConfigFields.binding,retainParentBindings:prepared.retainParentBindings},
  applicability:{...old.knownConfigFields.applicability,retainedFullParentCaptureSha256:prepared.capturedParentSha256,
   retainedFullReadByteSha256:prepared.evidencePins.fullRead.sha256,retainedBindings:8,newSourceBindings:20,finalBindings:28,
   retainedSourceClosure:['manufacturer_sika_antisol250w_us_202006_v0103','stairs_complete_installation_standard_s27_23',source.sourceId],
   capturedReadContext:prepared.actual.executionContext,actualPublicationParentDeferred:true,fullTechnicalAcceptance:false},
  benchmarkOrdinal:0,forbiddenAdjacentMatchers:[/legrand|elecor|granite-kerb|masonry:brick-partition|paving-cut:/iu],
  owner:'ROOT_SINGLE_INTEGRATOR_EXISTING_DOKA_VARIANT',receiptFileStem:'stairs_doka_standard_retained',
  verifyCore:async()=>{
   const proof=await originalCore();
   const compile=(definition:Readonly<{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]}>,submitted:Json)=>compileCanonicalEstimateCore({
    operation:'compile',catalogId:d.catalogId,compilerVersion:'doka-retained-r2-pure-check',primaryMeasureParameterId:'stairs_concrete_volume_m3',
    parameterDefinitions:[...definition.parameters] as unknown as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
    formulaDefinitions:[...definition.formulas] as unknown as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
    resourceDefinitions:[...definition.resources] as unknown as CanonicalEstimateCompileCoreInput['resourceDefinitions'],submittedParameters:submitted,
    confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:140,hashJson:async x=>estimateDeterministicHash(x)});
   const sourceResult=await compile(d,{...control(),...prepared.runtimeProfileInput});
   assert.equal(sourceResult.rows.find(r=>r.row_id===prefix+':whole-labor')?.quantity,'301.575');
   assert.equal(sourceResult.rows.find(r=>r.row_id===prefix+':concrete-consumed')?.quantity,'12.6875');
   assert(sourceResult.rows.filter(r=>r.category==='labor'&&r.included_in_estimate).every(r=>r.row_id===prefix+':whole-labor'));
   for(const id of d.unresolvedResourceRowIds)assert(sourceResult.preliminaryNeeds.some(n=>n.row_id===id));
   const oldResult=await compile(c,c.baseline.input_values),legacyResult=await compile(d,c.baseline.input_values);
   const paidProjection=(r:typeof oldResult)=>r.rows.map(x=>({row_id:x.row_id,title_ru:x.title_ru,unit_id:x.unit_id,quantity:x.quantity,unit_price:x.unit_price,
    included_in_estimate:x.included_in_estimate,included_in_procurement:x.included_in_procurement}));
   assert.deepEqual(paidProjection(legacyResult),paidProjection(oldResult),'MISSING_SELECTOR_OLD_COMPOSITION_PRESERVED');
   assert.deepEqual(legacyResult.preliminaryNeeds.map(n=>({row:n.row_id,missing:n.missing_parameter_ids})),oldResult.preliminaryNeeds.map(n=>({row:n.row_id,missing:n.missing_parameter_ids})));
   return {...proof,fullCaptureByteSha256:prepared.evidencePins.fullRead.sha256,retainedParentCaptureSha256:prepared.capturedParentSha256,
    fullPreimages:{parameters:188,formulas:92,resources:95,bindings:8,sources:2,locators:2},oldRuntimeProfileSlotsRetained:24,
    oldBaselineSourceArraysRetained:188,newParameterSourceMap:113,expectedFinalBindings:28,normalAndLockedRetentionRequired:true,
    actualNextElecorParentAccepted:false,publicationPerformed:false};
  },
 };
 assert.equal(fields.binding.retainParentBindings?.capturedParent.bindings.length,8);assert.equal(fields.binding.additionalRowIds!.length+1,20);
 return {status:'THIN_RETAINED_MASTER_FIELDS_READY_PARENT_AND_ROOT_ADMISSION_DEFERRED' as const,publicationAllowed:false as const,
  knownConfigFields:fields,parentReleaseId:null,parentSearchReleaseId:null,rootDecisionPin:null,nextElecorPublicationPin:null,nextElecorReadbackPin:null,freshRootExecutionPin:null,
  rootPrerequisites:['Pin formal existing-standard Doka source-variant/new-estimate-only ROOT decision and current saved-switch guard proof',
   'Use actual next ELECOR apply+independent closed readback to bind real current parent, proving unchanged exact stair definition/baseline; no UUID guess or automatic rebase',
   'Pin fresh actual sourceHEAD/recorded-release/pointer context separately; historical full9951/A/V5 query contexts stay unchanged',
   'Use existing Master normal+locked retainParentBindings full DDL reread/source closure and8+20 plan guard beforeDML; all actual checks ROOT only'],
  historicalFullCaptureContext:prepared.actual.executionContext,historicalOriginalAContext:historicalParent.executionContextAtRead,
  fullCapturePin:prepared.evidencePins.fullRead,capturedParentSha256:prepared.capturedParentSha256,
  newCatalogIds:0,catalogAppend:null,automaticParentRebase:false as const,oldProjectedDeclarationsUsedAsFullCapture:false as const};
}
