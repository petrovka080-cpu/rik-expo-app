import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import fixture from '../../../data/estimate-benchmarks/fixtures/parapet004-technical-finite-testonly-r294.json';
import one from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-native00402-r24.json';
import physical from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-existing-owner-map00402-r24.json';
import two from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-two-aprons-native00403-r24.json';
import {prepareRoofParapet004TechnicalCaptureInputR294,prepareRoofParapet004TechnicalWholeR294,
 type RoofParapet004TechnicalPreparationR294 as Preparation} from './prepareRoofParapet004TechnicalWholeR294';
import {roofParapet004TechnicalIdsR294 as ids} from './roofParapet004TechnicalWholeModelR294';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1 as Formal} from './masterScopedNormativeRegistryPreimageR1';
import {masterRetainParentBindingsOptInR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult as Result} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

type Json=Record<string,unknown>;type Pin=Readonly<{path:string;sha256:string}>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function pin(v:unknown):v is Pin{return object(v)&&typeof v.path==='string'&&path.isAbsolute(v.path)&&typeof v.sha256==='string'&&/^[a-f0-9]{64}$/u.test(v.sha256);}
function bytes(p:Pin){assert(fs.statSync(p.path).size<=4*1024*1024,'BOUNDED_INPUT');const b=fs.readFileSync(p.path);assert.equal(sha(b),p.sha256,'PIN_DRIFT:'+p.path);return b;}
function read(p:Pin):unknown{return JSON.parse(bytes(p).toString('utf8'));}
type Bound=Readonly<{
 contract:'roof-parapet004-real-bound-finite-inputs/r296';currentFullParent:Pin;host:Preparation['host'];source:Preparation['source'];sourcePaths:readonly string[];
 actual:Readonly<{first:Pin;second:Pin;semanticReceipt:Pin;closedGovernorReceipt:Pin;proposedInput:Pin}>;
}>;
function bound(v:unknown):v is Bound{
 if(!object(v)||v.contract!=='roof-parapet004-real-bound-finite-inputs/r296'||!pin(v.currentFullParent)||!object(v.host)||!object(v.source)||!strings(v.sourcePaths)||!object(v.actual))return false;
 const host=v.host,actual=v.actual;
 if(!['expectedBranch','masterPath','masterSha256','parentReleaseId','parentSearchReleaseId','currentReleasePath','outputRoot'].every(k=>typeof host[k]==='string')||typeof host.benchmarkOrdinal!=='number')return false;
 const s=v.source,m=s.sourceMetadata,l=s.locator;
 return typeof s.sourceKey==='string'&&!!s.sourceKey.trim()&&object(m)&&['source_title','source_authority','exact_locator','use_restriction'].every(k=>typeof m[k]==='string'&&String(m[k]).trim().length>0)
  &&(m.source_kind===undefined||typeof m.source_kind==='string')&&['official_url','artifact_sha256','effective_from'].every(k=>m[k]===undefined||m[k]===null||typeof m[k]==='string')
  &&object(l)&&typeof l.key==='string'&&!!l.key.trim()&&object(l.payload)&&(l.excerptSha256===undefined||typeof l.excerptSha256==='string')
  &&['first','second','semanticReceipt','closedGovernorReceipt','proposedInput'].every(k=>pin(actual[k]));
}
function formal(v:unknown):v is Formal{
 if(!object(v)||v.contract!=='master-scoped-normative-registry-preimage/r1'||v.projection!=='pg-jsonb-text-utc-microseconds/r1'||!object(v.scope)||typeof v.captureSha256!=='string')return false;
 const s=v.scope;return ['artifactSha256','normId','sourceKey','generatedSourceId'].every(k=>typeof s[k]==='string')&&strings(s.generatedLocatorIds)&&strings(s.generatedLocatorKeys)
  &&Array.isArray(v.sourceRows)&&v.sourceRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceKey==='string'&&typeof r.raw==='string'&&(r.managedMatches===null||typeof r.managedMatches==='boolean'))
  &&Array.isArray(v.locatorRows)&&v.locatorRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceId==='string'&&typeof r.locatorKey==='string'&&typeof r.raw==='string'
   &&Array.isArray(r.normIds)&&r.normIds.every(n=>n===null||typeof n==='string')&&(r.managedMatches===null||typeof r.managedMatches==='boolean'));
}
function failure(e:unknown){return{name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e),code:object(e)?e.code:undefined};}
function output(){const dir=process.env.PARAPET004_FINITE_RAW_R296;assert(dir&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_RAW_DIRECTORY');fs.mkdirSync(dir,{recursive:true});let n=0;
 return(name:string,value:unknown)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');assert(b.length<=4*1024*1024,'BOUNDED_RAW');const p=path.join(dir,String(++n).padStart(3,'0')+'-'+name+'.json');fs.writeFileSync(p,b,{flag:'wx'});return{path:p,sha256:sha(b),bytes:b.length};};}

jest.setTimeout(110000);
it('uses actual technical004 ordinary Config and original core with own length, whole two methods, exact legacy and strict rejects; TEST_ONLY facts are not admission',async()=>{
 const sourceRoot=path.resolve(__dirname,'../../..'),out=output(),manifest=process.env.PARAPET004_BOUND_INPUT_R296,manifestSha=process.env.PARAPET004_BOUND_INPUT_SHA_R296;
 assert(manifest&&manifestSha,'ROOT_BOUND_INPUT_AND_SHA_REQUIRED_NO_FAKE_FORMAL');const input:unknown=read({path:manifest,sha256:manifestSha});assert(bound(input),'ROOT_INPUT_SHAPE');
 const firstBytes=bytes(input.actual.first),secondBytes=bytes(input.actual.second);assert(firstBytes.equals(secondBytes),'TWO_ACTUAL_FORMAL_CAPTURES_BYTE_EQUAL');
 const actual:unknown=JSON.parse(firstBytes.toString('utf8'));assert(formal(actual),'GENUINE_FORMAL_CAPTURE_SHAPE');
 const receipt=read(input.actual.semanticReceipt),gov=read(input.actual.closedGovernorReceipt);assert(object(receipt)&&object(gov));
 assert.equal(gov.status,'EXPECTED_OUTCOME_AND_CLEAN_CLOSURE');assert.equal(gov.exitCode,0);assert.equal(gov.error,null);assert.deepEqual(gov.remainingOwnedProcesses,[]);assert.deepEqual(gov.sourceDrift,[]);
 assert.equal(receipt.status,'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION');assert.equal(receipt.failure,null);assert.equal(receipt.rollback,true);assert.equal(receipt.databaseWrites,0);assert.equal(receipt.capturedRawTwice,true);
 assert(object(receipt.actor));assert.equal(receipt.actor.isolation,'repeatable read');assert.equal(receipt.actor.read_only,'on');assert.equal(receipt.actor.timezone,'UTC');assert(typeof receipt.actor.rr_snapshot==='string'&&receipt.actor.rr_snapshot.length>0);
 assert.equal(receipt.sourceKey,input.source.sourceKey);assert.equal(receipt.scopeArtifact,'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');
 assert.equal(receipt.sourceRows,actual.sourceRows.length);assert.equal(receipt.locatorRows,actual.locatorRows.length);
 assert.equal(receipt.generatedSourceId,actual.scope.generatedSourceId);assert.equal(receipt.generatedIdentityStatus,'GENERATED_CANDIDATE_NOT_DB_ID');
 assert.equal(receipt.firstCaptureSha256,actual.captureSha256);assert.deepEqual(receipt.officialColumns,['12-01-004-02','12-01-004-03']);
 assert(Array.isArray(receipt.queryEvidence)&&receipt.queryEvidence.length>0&&receipt.queryEvidence.every(pin));for(const p of receipt.queryEvidence)bytes(p);
 const stage=path.dirname(input.actual.closedGovernorReceipt.path);
 for(const p of [input.actual.first,input.actual.second,input.actual.semanticReceipt,...receipt.queryEvidence]){assert(pin(p));const rel=path.relative(stage,p.path);assert(rel&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep),'ACTUAL_READ_ARTIFACT_OUTSIDE_CLOSED_GOVERNOR_STAGE');}
 let entries=0,results=0,rejects=0,callbackCalls=0;const attempted:string[]=[];
 let model:ReturnType<typeof prepareRoofParapet004TechnicalCaptureInputR294>['model']|undefined;
 let original:ReturnType<typeof prepareRoofParapet004TechnicalCaptureInputR294>['native']|undefined;
 const preparation:Preparation={...input,sourceRoot,sourcePaths:[...input.sourcePaths,manifest,...Object.values(input.actual).map(p=>p.path)],
  verifyTargetPrecondition:async()=>{throw Error('FINITE_CORE_ENTRY_IS_NOT_NORMAL_LOCKED_OR_PUBLICATION');},verifyCore:async()=>{
   callbackCalls++;assert.equal(callbackCalls,1);assert(model&&original,'CONSTRUCTOR_AND_GENUINE_FORMAL_BINDING_BEFORE_CALLBACK');const m=model,c=m.capture,native=original;
   assert.equal(native.parameters[0]?.parameter_id,'q');assert.equal(native.parameters[0]?.unit_id,'m2');assert.equal(stable(native.formulas),stable(c.formulas));assert.equal(stable(native.resources),stable(c.resources));
   const baseline=canonicalApprovedBaselineRuntimeParameters({input_values:c.baseline.input_values,input_classification:c.baseline.input_classification});
   // These two source/PPR labels are explicit TEST_ONLY fixtures. The actual
   // formal source preimage never supplies project or compatibility approval.
   const facts=(p:typeof one|typeof two):Json=>({[p.conditionsParameterId]:p.conditionsYesRu,[p.areaParameterId]:p.areaYesRu});
   const schema=m.parameters.map(p=>{const t=p.truth_metadata;assert(typeof t.visibility_role==='string'&&typeof t.value_source_role==='string');
    return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,constraints:p.constraints_json??undefined,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,
     provenance:object(t.provenance)?t.provenance:undefined,formulaConsumers:m.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)};});
   async function run(name:string,user:Json,confirmed:Json,old=false,expectedReject?:string):Promise<Result|undefined>{
    const selection=old?{kind:'RESOLVED' as const,primaryMeasure:{parameterId:'q',unitId:'m2'}}:assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:m.primary,parameterSchema:schema,submittedParameters:user,confirmedParameters:confirmed});
    assert.equal(selection.kind,'RESOLVED');assert(selection.kind==='RESOLVED');entries++;attempted.push(name);out('ENTRY-'+name,{actualCoreEntry:entries,user,confirmed,TEST_ONLY:true,primary:selection.primaryMeasure,old});
    let r:Result;try{r=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:m.contract,catalogId:c.definition.catalog_id,primaryMeasureParameterId:selection.primaryMeasure.parameterId,
     parameterDefinitions:[...(old?native.parameters:m.parameters)],formulaDefinitions:[...(old?native.formulas:m.formulas)],resourceDefinitions:[...(old?native.resources:m.resources)],
     submittedParameters:user,confirmedParameters:confirmed,currencyCode:'KGS',priceItems:[],maximumResourceRows:1024,hashJson:hash});}
    catch(e:unknown){rejects++;out('REJECT-'+name,{...failure(e),actualCoreEntry:entries,TEST_ONLY:true});if(!expectedReject)throw e;
     assert(object(e));assert.equal(e.code,'PARAMETER_VALIDATION_FAILED');assert.equal(e.message,expectedReject);return;}
    results++;out('RESULT-'+name,r);assert.equal(expectedReject,undefined,'EXPECTED_REJECT_DID_NOT_OCCUR');return r;
   }
   const before=await run('legacy-v3-before',{},baseline,true);assert(before);
   const after=await run('legacy-successor-explicit-old',{[ids.method]:ids.legacy},baseline);assert(after);
   // No trace, metadata, row-hash or needs normalization: the output bodies
   // must remain exact while only the new successor input/schema is extended.
   out('LEGACY_BEFORE_AFTER_STRICT_RAW',{beforeRows:before.rows,afterRows:after.rows,beforeNeeds:before.preliminaryNeeds,afterNeeds:after.preliminaryNeeds});
   assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.preliminaryNeeds,before.preliminaryNeeds);assert.deepEqual(after.totals,before.totals);assert.deepEqual(after.priceSnapshotIds,before.priceSnapshotIds);assert.deepEqual(after.purchaseSupplyIndexV1,before.purchaseSupplyIndexV1);
   assert.deepEqual(new Set([...before.rows,...before.preliminaryNeeds].map(r=>r.row_id)),new Set(c.resources.map(r=>r.row_id)),'ALL_OLD59_VISIBLE');
   const oldIds=new Set(c.resources.map(r=>r.row_id));assert.equal(native.formulas.filter(f=>f.input_parameter_ids.includes('q')).length,57);assert.equal(native.formulas.filter(f=>!f.input_parameter_ids.includes('q')).length,2);
   for(const [key,p]of [['one',one],['two',two]]as const){const f=fixture.illustrativeInputs[key],u={[ids.method]:p.systemYesRu,[ids.length]:f.lengthLinearM,[ids.height]:f.heightMm};
    const r=await run(key+'-whole-own-length',u,{...baseline,...facts(p)});assert(r);const all=[...r.rows,...r.preliminaryNeeds];
    assert.equal(all.length,new Set(all.map(x=>x.row_id)).size);assert(!all.some(x=>oldIds.has(x.row_id)));assert.equal(all.length,15+22);
    assert.deepEqual(new Set(all.map(x=>x.row_id)),new Set([...fixture.independentExactNativeQuantities[key].map(x=>x.rowId),...fixture.sharedPhysicalRequirementIds]));
    for(const expected of fixture.independentExactNativeQuantities[key]){const row=all.find(x=>x.row_id===expected.rowId);assert(row);assert.equal(row.unit_id,expected.unitId);assert.equal(row.quantity,expected.quantity);assert.equal(row.procurement_eligible,false);
     if(expected.costTreatment==='INFORMATIONAL_SCOPE'){assert.equal('included_in_estimate'in row?row.included_in_estimate:row.selected,false);}}
    for(const id of fixture.sharedPhysicalRequirementIds){const row:Result['preliminaryNeeds'][number]|undefined=r.preliminaryNeeds.find(x=>x.row_id===id);assert(row);assert.equal(row.quantity,null);assert.equal(row.procurement_eligible,false);assert(row.missing_parameter_ids.some((x:string)=>x.startsWith('roof_parapet004_post_need_')));
     const declared=[...physical.physicalOwners,...physical.newPhysicalOwners].find(p=>p.rowId===id);assert(declared);
     const sourceCost='costTreatment'in declared?declared.costTreatment:undefined;assert(sourceCost===undefined||sourceCost==='OWN_COST'||sourceCost==='INFORMATIONAL_SCOPE');
     // Omission keeps the existing AutomaticRowSpec default, not a new rate.
     const expectedCost=sourceCost??'OWN_COST';assert(object(row.calculation_trace)&&object(row.calculation_trace.resourceGraph));
     assert.equal(row.calculation_trace.resourceGraph.costTreatment,expectedCost);assert.equal(row.selected,expectedCost==='OWN_COST');
     if(expectedCost==='INFORMATIONAL_SCOPE')assert.equal(row.unit_price,null,'NO_SECOND_STOCK_OPERATING_PRICE');}
    assert.equal(r.totals.pricedRowCount,0,'NO_PRICE_APPROVAL_FROM_QUANTITIES');
   }
   const absent=await run('missing-own-linear-length-oldq100-not-producer',{[ids.method]:ids.one,[ids.height]:'900'},{...baseline,...facts(one)});assert(absent);
   const absentAll=[...absent.rows,...absent.preliminaryNeeds];for(const expected of fixture.independentExactNativeQuantities.one){const row=absentAll.find(x=>x.row_id===expected.rowId);assert(row);assert.equal(row.quantity,null);}
   assert(!absentAll.some(x=>oldIds.has(x.row_id)));assert(absent.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes(ids.length)));
   for(const height of ['600','599'])await run('height-'+height+'-reject',{[ids.method]:ids.one,[ids.length]:'125',[ids.height]:height},{...baseline,...facts(one)},false,'parameter '+ids.method+' is forbidden by cross-field rule');
   await run('negative-length-reject',{[ids.method]:ids.one,[ids.length]:'-1',[ids.height]:'900'},{...baseline,...facts(one)},false,'parameter below minimum '+ids.length);
   // A kit label cannot become source/PPR authority. This strict rejection
   // does NOT claim a real product compatibility resolver exists for the post.
   await run('unverified-incompatible-kit-source-override',{[ids.method]:ids.one,[ids.length]:'125',[ids.height]:'900',[one.conditionsParameterId]:'Нужен другой расчёт'},baseline,false,'source-managed parameter cannot be submitted '+one.conditionsParameterId);
   await run('unknown-stock-quantity-cannot-be-supplied',{[ids.method]:ids.one,[ids.length]:'125',[ids.height]:'900',roof_parapet004_post_need_01_r294:'1'},baseline,false,'unresolved application norm cannot be supplied roof_parapet004_post_need_01_r294');
   const missing=resolvePrimaryMeasureSelectionV1({selectionMetadata:m.primary,parameterSchema:schema,submittedParameters:{},confirmedParameters:baseline});out('BEFORE_CORE_MISSING_METHOD',missing);
   assert.equal(missing.kind,'CLARIFICATION_REQUIRED');assert(missing.kind==='CLARIFICATION_REQUIRED');assert.equal(missing.reason,'SELECTION_REQUIRED');
   assert.throws(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:m.primary,parameterSchema:schema,submittedParameters:{},confirmedParameters:baseline}),e=>object(e)&&e.code==='PRIMARY_MEASURE_SELECTION_INVALID');
   const final={status:'FINITE_TEST_ONLY_CORE_NOT_SOURCE_STOCK_PRICE_OR_PROJECT_ADMISSION',actualEntries:entries,actualResults:results,actualRejects:rejects,attempted,callbackCalls,
    legacyStrictEquality:true,old59:true,old57qPlus2:true,nativeMethods:2,nativeRowsPerMethod:15,unknownPhysical:22,sourceColumns:m.sourceColumns,
    incompatibleProductKitActualResolution:'HOLD_NO_CONFIRMED_PRODUCT_STOCK_KIT_CONTRACT',newPriceAdmissions:'UNRUN_EXACT8_SOURCE_ONLY',DML:0,publication:0,FULL:false};
   out('FINAL_CALLBACK_BEFORE_ASSERT',final);assert.equal(entries,10);assert.equal(results,5);assert.equal(rejects,5);return final;
  }};
 const prepared=prepareRoofParapet004TechnicalCaptureInputR294(preparation);model=prepared.model;original=prepared.native;const proposed=read(input.actual.proposedInput);assert(object(proposed));
 out('PROPOSED_INPUT_COMPARISON_BEFORE_ASSERT',{proposedInput:prepared.captureInput,actualPinnedProposed:proposed,candidateIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID'});
 assert.deepEqual(prepared.captureInput,proposed,'EXACT_FINAL_CAPTURE_INPUT_NOT_A_DIFFERENT_LOCATOR_OR_CONFIG');
 const cfg=prepareRoofParapet004TechnicalWholeR294(preparation,actual),formalBinding=resolveMasterScopedNormativeRegistryOptInR1({...prepared.captureInput,config:cfg});assert(formalBinding);
 assert.deepEqual(formalBinding.declaration,actual);const retained=masterRetainParentBindingsOptInR1({...prepared.captureInput,config:cfg});assert(retained);
 assert.equal(retained.capturedParent.definition.id,'f1b74df3-b99f-5ebb-a9e7-68fcfb51ab36');assert.deepEqual(retained.capturedParent.baseline.normative_source_ids,prepared.model.capture.baseline.normative_source_ids);
 out('ORDINARY_CONFIG_CONSTRUCTED_BEFORE_CALLBACK',{catalogId:cfg.catalogId,parentShape:[1,59,59],oldBindings:retained.capturedParent.bindings,oldSourceArrays:retained.capturedParent.baseline.normative_source_ids,
  fullParameterDefinitions:cfg.parameterDefinitions,fullFormulaDefinitions:cfg.formulaDefinitions,fullResourceDefinitions:cfg.resourceDefinitions,formalCaptureSha256:actual.captureSha256,proposedOnly:true,sourceAdmission:false,FULL:false});
 await cfg.verifyCore();assert.equal(callbackCalls,1);
});
