import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fixture from '../../../data/estimate-benchmarks/fixtures/parapet004-technical-finite-testonly-r294.json';
import one from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-native00402-r24.json';
import physical from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-existing-owner-map00402-r24.json';
import two from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-two-aprons-native00403-r24.json';
import type {prepareRoofParapet004TechnicalCaptureInputR294} from './prepareRoofParapet004TechnicalWholeR294';
import {roofParapet004TechnicalIdsR294 as ids} from './roofParapet004TechnicalWholeModelR294';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult as Result} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

type Json=Record<string,unknown>;
type Prepared=ReturnType<typeof prepareRoofParapet004TechnicalCaptureInputR294>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
function failure(e:unknown){return{name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e),code:object(e)?e.code:undefined};}

/** Called by the existing publisher's verifyCore slot. Runs the original core
 * and the exact accepted finite10 oracle body; never consumes a PASS receipt
 * as an executed result. TEST_ONLY applicability fixtures remain verification
 * inputs, not project/source/product/stock approval or a real takeoff.
 */
export async function verifyRoofParapet004TechnicalProductionCoreR1(input:Readonly<{
  prepared:Prepared;record:(name:string,value:unknown)=>void;
}>):Promise<Json>{
 assert.equal(typeof input.record,'function','ACTUAL_RAW_RECORDER_REQUIRED');
 const model=input.prepared.model,original=input.prepared.native;
 let entries=0,results=0,rejects=0,callbackCalls=0;const attempted:string[]=[];
 const evidence:Readonly<{name:string;serializedSha256:string}>[]=[];
 const out=(name:string,value:unknown)=>{const serializedSha256=hash(value);input.record(name,value);evidence.push({name,serializedSha256});};
 const verify=async()=>{
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
   assert.equal(c.resources.length,59,'ALL_OLD59_DECLARED');
   const legacyVisibility=c.resources.map(row=>{const inclusion:unknown=row.inclusion_ast;
    assert(typeof row.row_id==='string'&&object(inclusion)&&inclusion.kind==='literal'&&typeof inclusion.value==='boolean','EXACT_CAPTURED_NATIVE_LITERAL_VISIBILITY');
    return{rowId:row.row_id,visible:inclusion.value};});
   assert.deepEqual(legacyVisibility.filter(row=>!row.visible).map(row=>row.rowId),['roofing_interior_parapet_seal_technical_room_materials_37'],'EXACT_CAPTURED_INACTIVE_NATIVE_ROW');
   assert.deepEqual(new Set([...before.rows,...before.preliminaryNeeds].map(row=>row.row_id)),new Set(legacyVisibility.filter(row=>row.visible).map(row=>row.rowId)),'ALL_CAPTURED_ACTIVE_OLD_ROWS_VISIBLE');
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
 };
 const verification=await verify();
 assert.equal(entries,10);assert.equal(results,5);assert.equal(rejects,5);assert.equal(callbackCalls,1);
 assert.equal(evidence.filter(row=>row.name.startsWith('ENTRY-')).length,10);
 assert.equal(evidence.filter(row=>row.name.startsWith('RESULT-')).length,5);
 assert.equal(evidence.filter(row=>row.name.startsWith('REJECT-')).length,5);
 const serialization={contract:'roof-parapet004-actual-core-verification-evidence/r1',verification,evidence};
 const serializedSha256=hash(serialization);
 input.record('ACTUAL_PRODUCTION_CORE_SERIALIZATION_BEFORE_RETURN',{...serialization,serializedSha256});
 return{...verification,serializedSha256,serializationContract:serialization.contract,actualSerializationEvidence:evidence,
  consumedAcceptedReceiptInsteadOfCore:false,sourceProjectStockPriceAdmission:false,fullTechnicalAcceptance:false};
}
