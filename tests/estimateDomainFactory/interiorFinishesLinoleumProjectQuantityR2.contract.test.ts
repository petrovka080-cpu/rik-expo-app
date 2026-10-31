import fixture from '../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1115.json';
import {buildLinoleumCurrentProjectQuantityR2 as model,compileLinoleumCurrentProjectQuantityR2 as compile,
 assertLinoleumCurrentProjectQuantityScopeR2 as assertScope,linoleumCurrentProjectQuantityPackR2 as pack,
 linoleumCurrentProjectQuantityExpectationsR2 as expectations,linoleumCurrentWholePackR1 as oldPack,
 buildLinoleumCurrentWholeR1 as legacyModel} from '../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding';
import {prepareLinoleumCurrentProjectQuantityR2 as recipe,observedLinoleumParentR1115R2 as observed,
 type LinoleumCurrentProjectQuantityContextR2} from '../../scripts/estimate/r4a13/prepareLinoleumCurrentProjectQuantityR2';
import {masterRetainedParentCaptureSha256R1 as captureHash,assembleMasterExplicitParameterSourcesR1} from '../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {validateMasterTypedPartialQuantityPreparationR1 as preparation,buildMasterCapabilityMatrix,buildMasterScopeReadiness,
 validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {validateMasterTypedPartialQuantityBasisR1 as basisErrors,masterTypedPartialQuantityDependentRowsR1 as dependencies}
 from '../../scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1';
import {compileCanonicalEstimateCore as core} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson as stable} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as sha} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash as rowHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {buildCanonicalRevisionCommitPayload as commitPayload} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds as coldNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {canonicalOperationCompositionEvidenceFromPassportV1 as evidenceFrom,canonicalEstimateSavedOperationAcceptanceV1 as savedGate,
 assertCanonicalEstimateSavedArtifactStructureV1 as assertSaved} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const p=oldPack.parameterPrefix,id=(key:string)=>oldPack.namespace+key;
function record(x:unknown):Record<string,unknown>{if(x===null||typeof x!=='object'||Array.isArray(x))throw Error('TEST_LINOLEUM_R2_RECORD');return Object.fromEntries(Object.entries(x));}
const facts=():Record<string,unknown>=>Object.fromEntries(oldPack.protectedFacts.filter(f=>f.key!=='weld_method').map(f=>[f.id,f.value]));
function demo(extra:Record<string,unknown>={}):Record<string,unknown>{return{
 [p+'net_area_m2']:20,[p+'cutplan_width_m']:2,[p+'cutplan_issued_length_m']:11,[p+'usable_return_area_m2']:1,[p+'purchased_cut_length_m']:10,
 [p+'trial_bucket_start_kg']:5,[p+'trial_bucket_end_kg']:4.3,[p+'trial_discard_kg']:0.1,[p+'trial_bonded_area_m2']:2,
 [p+'adhesive_stock_kg']:1,[p+'adhesive_reserve_kg']:0.5,[p+'adhesive_supplier_bucket_multiple']:1,[p+'wash_start_l']:100,[p+'wash_end_l']:105,
 [p+'cargo_gross_kg']:350,[p+'route_km']:12,[p+'waste_gross_kg']:15,[p+'waste_tare_kg']:2,[p+'protect_cut_count']:2,[p+'protect_cut_length_m']:5,[p+'protect_cut_width_m']:2,
 [p+'accepted_person_minutes']:1200,[pack.cleaner.waterParameterId]:4,...extra};}
const row=(r:Awaited<ReturnType<typeof compile>>,key:string)=>r.rows.find(x=>x.row_id===id(key));
function context():LinoleumCurrentProjectQuantityContextR2{const actualParent=observed();return{
 expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'TEST_ONLY_NOT_A_PUBLICATION_LEASE',masterSha256:'92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f',
 parentReleaseId:actualParent.definition.release_id,parentSearchReleaseId:'TEST_ONLY_NO_FAKE_FRESH_SOURCE_CAPTURE',currentReleasePath:'TEST_ONLY_NOT_EXECUTED',outputRoot:'TEST_ONLY_NOT_EXECUTED',
 actualParent,actualParentCaptureSha256:captureHash(actualParent),verifyCore:async()=>({testOnlyNotAdmission:true}),verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_ROOT_NORMAL_LOCKED_CONTEXT_NOT_SUPPLIED');}};}
async function overridden(submitted:Record<string,unknown>,confirmed:Record<string,unknown>,key:string){const d=model();return core({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:p+'net_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:submitted,
 confirmedParameters:{...d.runtimeInput,...confirmed},rowOverrides:{[id(key)]:{quantity:'2',unitPrice:'42',provenance:{kind:'manual',reason:'EXPLICIT_DEMO_NOT_FACT_OR_SOURCE_AUTHORITY'}}},
 currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:rowHash});}
function saved(r:Awaited<ReturnType<typeof compile>>,submitted:Record<string,unknown>){
 const evidence=evidenceFrom({releaseId:'TEST_R2_RELEASE',definitionVersionId:'TEST_R2_DEFINITION',passport:{definition_version_id:'TEST_R2_DEFINITION',payload_sha256:'a'.repeat(64),decision:{independentCompletenessMap:expectations()}}});
 if(!evidence)throw Error('TEST_R2_EVIDENCE_REQUIRED');
 const checksum=sha(stable(r.revisionProjection)),commit=commitPayload({rowCount:r.rows.length,currencyCode:'KGS',totals:r.totals,checksumSha256:checksum,compilerVersion:pack.contract,
 parameters:r.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:submitted,parentRevisionId:null,identityContract:{},preliminaryNeeds:r.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
 return{id:'TEST_R2_REVISION',release_id:'TEST_R2_RELEASE',definition_version_id:'TEST_R2_DEFINITION',catalog_id:pack.catalogId,row_count:r.rows.length,currency_code:'KGS',checksum_sha256:checksum,
 input_parameters:r.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
}

describe('Linoleum R2 actual project quantities and pure retained ordinary recipe',()=>{
 it('pins fresh R1115 bytes and all ten current raw sets without promoting source0 to registry authority',()=>{
  const bytes=readFileSync(require.resolve('../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1115.json'));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('b979c1ff1fa502b4085c4b5942a80c87423b3a1257c510cf0ebd401d9b318d41');
  for(const key of Object.keys(fixture.rawSets)){
   const raw=record(fixture.rawSets)[key],set=record(record(fixture.sets)[key]);if(!Array.isArray(raw)||!raw.every((x):x is string=>typeof x==='string'))throw Error('TEST_RAW_REQUIRED');
   expect(raw.length).toBe(set.rowCount);expect(createHash('sha256').update([...raw].sort().join('\n')).digest('hex')).toBe(set.sha256);
   expect(raw.map((x:string)=>JSON.parse(x))).toEqual(record(fixture.body)[key]);
  }expect(fixture.body.newSource).toEqual([]);expect(fixture.notFormalScopedRegistryCapture).toBe(true);
 });
 it('refuses an altered actual body or native formula before any R2 projection',()=>{
  const changed=structuredClone(fixture);changed.body.formulas[0]!.expression_source='q*999';expect(()=>model(changed)).toThrow('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
  const header=structuredClone(fixture);header.header.definition_sha256='0'.repeat(64);expect(()=>model(header)).toThrow('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
 });
 it('accounts for all45 old holds with43 actual record quantities one source dose and one genuine archived seal norm',()=>{
  expect(pack.quantityReclassification).toHaveLength(45);expect(new Set(pack.quantityReclassification.map(r=>r.needId)).size).toBe(45);
  expect(pack.classificationCounts).toEqual({DISTINCT_ACCEPTED_EVENT_RECORDS:3,DISTINCT_ACTUALLY_PROVIDED_PHYSICAL_UNITS:30,GENUINE_SOURCE_HELD:1,SIGNED_ISSUED_MINUS_USABLE_UNUSED_RETURN:10,SOURCE_DOSE_TIMES_DEDICATED_MEASURED_VOLUME:1});
  for(const q of pack.quantityReclassification){expect(q.quantityNormClaimed).toBe(false);expect(q.actualObjectFactClaimed).toBe(false);expect(q.soleOwnerRowId).toBe(q.needId);expect(q.consumerOperationIds.length).toBeGreaterThan(0);}
  expect(pack.objectClosures).toBe(0);expect(pack.quantityNormClosures).toBe(0);
 });
 it('keeps actual inventory events and issue return rules separate from a productivity or service life norm',()=>{
  const issued=pack.quantityReclassification.find(r=>r.functionKey==='straight-blade')!,provided=pack.quantityReclassification.find(r=>r.functionKey==='floor-roller')!,event=pack.quantityReclassification.find(r=>r.functionKey==='quality-service')!;
  expect(issued.recordColumns).toContain('usableUnusedReturnQuantity');expect(provided.recordColumns).toContain('physicalUnitOrEventId');expect(event.after).toBe('DISTINCT_ACCEPTED_EVENT_RECORDS');
  expect(provided.guideRu).toContain('68кг');expect(event.guideRu).toContain('не отдельный платный пост');
 });
 it('retains native59 IDs formulas units owners original source metadata and q ASSUMPTION without OEM rebinding',()=>{
  const before=observed(),d=model();expect(d.parameters[0]).toEqual(before.parameters[0]);expect(d.formulas.slice(0,59)).toEqual(before.formulas);
  for(const r of before.resources){const next=d.resources.find(x=>x.row_id===r.row_id)!;for(const key of ['id','formula_id','unit_id','cost_owner_id','procurement_eligible','source_metadata','resource_graph'])expect(record(next)[key]).toEqual(r[key]);}
  expect(before.baseline.input_values.q).toBe(100);expect(before.baseline.input_classification.q).toBe('ASSUMPTION');expect(d.runtimeInput.q).toBeUndefined();
 });
 it('exposes a pure single internal NET_FIT ROLLER method without changing frozen legacy R1',()=>{
  const d=model(),old=legacyModel(),effectiveId='effective_resource_quantity_linoleum_current_whole_r1_adhesive_order';
  const expectedIds=['q',oldPack.selector.parameterId,oldPack.seamParameterId,oldPack.edgeParameterId,...oldPack.numericDrivers.map(p=>p.id),...oldPack.protectedFacts.map(p=>p.id),
   ...oldPack.resources.filter(r=>r.heldQuantity&&!['perimeter-seal','neutral-cleaner'].includes(r.functionKey)).map(r=>r.expression),pack.cleaner.waterParameterId,effectiveId];
  expect(expectedIds).toHaveLength(91);expect(new Set(d.parameters.map(p=>p.parameter_id))).toEqual(new Set(expectedIds));expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([91,124,124]);
  const effective=d.parameters.find(p=>p.parameter_id===effectiveId)!;expect(effective.default_value).toBeNull();expect(effective.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',effective_resource_quantity_v1:{sourceRowId:id('adhesive-order'),unitId:'kg'}});
  expect(d.resources.find(r=>r.row_id===id('adhesive-order'))?.resource_graph.effectiveQuantityOutputV1).toEqual({parameterId:effectiveId,unitId:'kg'});
  expect(d.ordinaryParameterIds).not.toContain(effectiveId);
  for(const [parameterId,value]of Object.entries(d.runtimeInput)){const p=d.parameters.find(p=>p.parameter_id===parameterId)!;expect(p.constraints_json?.values).toEqual([value]);expect(p.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');}
  expect(old.parameters.find(p=>p.parameter_id===oldPack.selector.parameterId)?.constraints_json?.values).toEqual([oldPack.selector.legacyValue,oldPack.selector.exactValue]);
  expect(old.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(45);
 });
 it('keeps every actual consumer operation and one physical inventory or payment owner',()=>{
  const d=model();expect(validateIndependentCompletenessMapReferences({completenessMap:expectations(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  for(const q of pack.quantityReclassification){expect(d.resources.filter(r=>r.row_id===q.needId)).toHaveLength(1);const r=d.resources.find(r=>r.row_id===q.needId)!;expect(r.procurement_eligible).toBe(false);expect(r.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');}
 });
 it('archives the unresolved seal need while its R2 false row has no physical zero consumption or input default',()=>{
  const d=model(),old=legacyModel(),seal=d.resources.find(r=>r.row_id===id('perimeter-seal'))!;
  expect(seal.inclusion_ast).toEqual({kind:'literal',value:false});expect(record(seal.resource_graph.notApplicablePureMethodR2)).toMatchObject({sourceNormStillHeld:true,notAnObjectClosure:true});
  expect(d.formulas.find(f=>f.formula_id===seal.formula_id)?.expression_source).toBe('0');expect(d.parameters.some(p=>p.parameter_id==='linoleum_r1_held_perimeter_seal')).toBe(false);
  expect(old.formulas.find(f=>f.formula_id===seal.formula_id)?.expression_source).toBe('linoleum_r1_held_perimeter_seal');
 });
 it('refuses a source mutation that activates the permanently excluded seal row',()=>{
  const d=model();const resources=d.resources.map(r=>r.row_id===id('perimeter-seal')?{...r,inclusion_ast:{kind:'literal',value:true}}:r);
  expect(()=>assertScope({...d,resources})).toThrow('LINOLEUM_R2_NONE_SCOPE_BOUNDARY_REQUIRED');
 });
 it('refuses attempts to select HOT_WELD HAMMER or SEAL_REQUIRED in the narrow pure recipe',async()=>{
  for(const change of [{[oldPack.seamParameterId]:'HOT_WELD'},{[oldPack.edgeParameterId]:'HAMMER'},{[p+'perimeter_scope']:'SEAL_REQUIRED'},{[p+'perimeter_scope']:false}])await expect(compile(demo(),{...facts(),...change})).rejects.toBeDefined();
 });
 it('preserves known manual seal edits as excluded with no fake physical row payment or order',async()=>{
  const r=await overridden(demo(),facts(),'perimeter-seal');expect([...r.rows,...r.preliminaryNeeds].some(r=>r.row_id===id('perimeter-seal'))).toBe(false);
 });
 it('uses the exact initial cleaning dose and its own dedicated water quantity while whole water remains one owner',async()=>{
  const r=await compile(demo(),facts());expect(row(r,'neutral-cleaner')?.quantity).toBe('0.05');expect(row(r,'clean-water')?.quantity).toBe('5');
  expect(r.rows.filter(r=>r.row_id===id('clean-water'))).toHaveLength(1);expect(pack.cleaner.regular40mlRejectedForThisMethod).toBe(true);expect(pack.cleaner.wholeMeterNotDoseBasis).toBe(true);
 });
 it('leaves the cleaning dose QUANTITY_REQUIRED when only whole wash meter readings are known',async()=>{
  const input=demo();delete input[pack.cleaner.waterParameterId];const r=await compile(input,facts()),n=r.preliminaryNeeds.find(n=>n.row_id===id('neutral-cleaner'));
  expect(n?.need_state).toBe('QUANTITY_REQUIRED');expect(n?.missing_parameter_ids).toContain(pack.cleaner.waterParameterId);expect(row(r,'clean-water')?.quantity).toBe('5');
 });
 it('does not turn trusted technology facts into43 provided quantities or historical100m2',async()=>{
  const r=await compile({},facts()),d=model(),q=d.parameters.find(p=>p.parameter_id==='q')!;
  expect(r.parameters[p+'net_area_m2']).toBeUndefined();expect(r.parameters.q).toBe(100);expect(q).toEqual(fixture.body.parameters[0]);
  expect(q.truth_metadata).toMatchObject({value_source_role:'VISIBLE_BASELINE_ASSUMPTION',provenance:{approvedTemplateBinding:{value:100,inputClassification:'ASSUMPTION'}}});
  expect(fixture.body.baseline[0]!.input_classification.q).toBe('ASSUMPTION');expect(d.runtimeInput.q).toBeUndefined();
  expect(d.formulas.slice(59).every(f=>!f.input_parameter_ids.includes('q'))).toBe(true);
  expect([...r.rows,...r.preliminaryNeeds].some(row=>row.row_id.startsWith('flooring_interior_linoleum_lay_standard_'))).toBe(false);
  expect(pack.quantityReclassification.filter(q=>!['perimeter-seal','neutral-cleaner'].includes(q.functionKey)).every(q=>r.parameters[q.quantityParameterId]===undefined)).toBe(true);
  expect(r.preliminaryNeeds.find(n=>n.row_id===id('floor-roller'))?.need_state).toBe('QUANTITY_REQUIRED');expect(r.preliminaryNeeds.find(n=>n.row_id===id('floor-roller'))?.missing_parameter_ids).toContain('linoleum_r1_held_floor_roller');
 });
 it('accepts an actual provided count but refuses fractional physical units instead of rounding a kit',async()=>{
  const key='linoleum_r1_held_floor_roller',r=await compile(demo({[key]:2}),facts());expect(row(r,'floor-roller')?.quantity).toBe('2');
  await expect(compile(demo({[key]:1.5}),facts())).rejects.toBeDefined();
 });
 it('keeps all70 project quantity fields optional null with an exact mandatory measurement guide and no norm role',()=>{
  const d=model(),project=d.parameters.filter(p=>p.truth_metadata.value_source_role==='CONDITIONAL_PROJECT_FACT');expect(project).toHaveLength(70);
  const documentCounts=pack.quantityReclassification.filter(q=>!['perimeter-seal','neutral-cleaner'].includes(q.functionKey));expect(documentCounts).toHaveLength(43);
  for(const q of documentCounts){const parameter=d.parameters.find(p=>p.parameter_id===q.quantityParameterId),resource=oldPack.resources.find(r=>r.rowId===q.needId)!;
   expect(parameter?.truth_metadata.visibility_role).toBe('USER_INPUT');expect(parameter?.title_ru).toContain(resource.nameRu);
   expect(parameter?.title_ru).toMatch(/[А-Яа-яЁё]/u);expect(parameter?.title_ru).not.toMatch(/SOURCE_HELD|PROVISION_HELD|ACTUAL_|Forbo|Eurocol|Marmoleum|Leister/iu);}
  for(const p of project){expect(p.default_value).toBeNull();expect(p.required).toBe(false);expect(p.constraints_json?.requiredWhen).toBeUndefined();expect(p.truth_metadata).toMatchObject({visibility_role:'USER_INPUT',guide:{guide_validation_policy:'MANDATORY_BLOCK',source_role:'USER_SUPPLIED_OBJECT_FACT',source_snapshot_hash:pack.quantityEvidence.sha256}});}
 });
 it('uses a meaningful small cutplan and independent cleaning batch without a minimum post or area waste percentage',async()=>{
  const input=demo({[p+'net_area_m2']:1,[p+'cutplan_issued_length_m']:0.6,[p+'usable_return_area_m2']:0.1,[p+'purchased_cut_length_m']:0.6,[p+'trial_bucket_start_kg']:1,[p+'trial_bucket_end_kg']:0.84,[p+'trial_discard_kg']:0.01,[p+'trial_bonded_area_m2']:0.5,[pack.cleaner.waterParameterId]:1});
  const r=await compile(input,facts());expect(row(r,'covering')?.quantity).toBe('1.1');expect(row(r,'adhesive')?.quantity).toBe('0.3');expect(row(r,'neutral-cleaner')?.quantity).toBe('0.0125');
 });
 it('keeps source consumption supplier quantum planned supply and actual procurement separate in R2',async()=>{
  const r=await compile(demo(),facts());expect(row(r,'adhesive')?.quantity).toBe('6');expect(row(r,'adhesive-order')?.quantity).toBe('11');expect(r.rows.every(r=>r.included_in_estimate===false&&r.included_in_procurement===false)).toBe(true);
 });
 it('preserves numeric project quantities and trusted scope on a saved-shaped cold replay without baseline hydration',async()=>{
  const input=demo({'linoleum_r1_held_knife':2}),first=await compile(input,facts()),cold=record(JSON.parse(JSON.stringify(first.revisionProjection.parameters))),submitted:Record<string,unknown>={},confirmed:Record<string,unknown>={};
  for(const key of Object.keys(input))submitted[key]=cold[key];for(const key of Object.keys(facts()))confirmed[key]=cold[key];const replay=await compile(submitted,confirmed);
  expect(replay.rows).toEqual(first.rows);expect(replay.preliminaryNeeds).toEqual(first.preliminaryNeeds);expect(replay.parameters['linoleum_r1_held_knife']).toBe(2);expect(replay.parameters[p+'net_area_m2']).toBe(20);
 });
 it('does not allow raw injected protected NONE or cleaner safety facts to become source readback',async()=>{
  await expect(compile({...demo(),...facts()})).rejects.toBeDefined();expect(model().parameters.find(p=>p.parameter_id==='linoleum_r1_perimeter_scope')?.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',provenance:{source_readback_only_v1:true,consumer_question_allowed:false}});
 });
 it('keeps missing protected NONE as a real consumer condition through manual edits Core commit and saved PDF409',async()=>{
  const f=facts();delete f[p+'perimeter_scope'];const input=demo(),r=await overridden(input,f,'wet-waste-vessel');
  const need=r.preliminaryNeeds.find(n=>n.row_id===id('wet-waste-vessel'));expect(need?.need_state).toBe('CONDITION_REQUIRED');expect(need?.missing_parameter_ids).toContain(p+'perimeter_scope');
  const revision=saved(r,input),resources=[...r.rows,...coldNeeds(revision)],gate=savedGate({revision,resources});expect(gate.pdfAllowed).toBe(false);expect(gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:id('wet-waste-vessel')});expect(()=>assertSaved(gate)).toThrow(expect.objectContaining({httpStatus:409}));
 });
 it('does not let a manual seal quantity and price bypass unknown protected NONE',async()=>{
  const f=facts();delete f[p+'perimeter_scope'];const input=demo(),r=await overridden(input,f,'perimeter-seal');expect([...r.rows,...r.preliminaryNeeds].some(n=>n.row_id===id('perimeter-seal'))).toBe(false);
  const n=r.preliminaryNeeds.find(n=>n.row_id===id('netfit-scope'));expect(n?.need_state).toBe('CONDITION_REQUIRED');expect(n?.missing_parameter_ids).toContain(p+'perimeter_scope');
  const revision=saved(r,input),gate=savedGate({revision,resources:[...r.rows,...coldNeeds(revision)]});expect(gate.pdfAllowed).toBe(false);expect(()=>assertSaved(gate)).toThrow(expect.objectContaining({httpStatus:409}));
 });
 it('keeps receiver safety mandatory after the other43 project quantities are known',async()=>{
  const input=demo(Object.fromEntries(pack.quantityReclassification.filter(q=>!['perimeter-seal','neutral-cleaner'].includes(q.functionKey)).map(q=>[q.quantityParameterId,2]))),f=facts();delete f[p+'waste_receiver'];
  const r=await overridden(input,f,'wet-waste-vessel');expect(r.preliminaryNeeds.find(n=>n.row_id===id('wet-waste-vessel'))?.need_state).toBe('CONDITION_REQUIRED');const revision=saved(r,input),gate=savedGate({revision,resources:[...r.rows,...coldNeeds(revision)]});expect(gate.pdfAllowed).toBe(false);
 });
 it('builds one concrete existing Master recipe with65 new bindings and no native59 source transfer or fake registry tuple',()=>{
  const c=recipe(context());expect(c.catalogId).toBe(pack.catalogId);expect([c.binding.rowId,...c.binding.additionalRowIds??[]]).toEqual(pack.newBindingRowIds);expect(c.binding.reuseExistingNormativeRegistry).toBeUndefined();expect(c.binding.ordinaryCompositeSourceV1).toBeUndefined();
  expect(c.binding.retainParentBindings?.capturedSourcePreimage).toEqual({sourceKey:pack.sourceId,expected:null});expect(c.runtimeProfileInput?.q).toBe(100);expect(c.runtimeProfileClassification?.q).toBe('ASSUMPTION');expect(c.acceptanceInput).toEqual(c.runtimeProfileInput);expect(c.capturedScopedNormativeRegistry).toBeUndefined();
  expect(new Set(Object.keys(c.acceptanceInput))).toEqual(new Set(['q',oldPack.selector.parameterId,oldPack.seamParameterId,oldPack.edgeParameterId]));
  for(const [parameterId,value]of Object.entries(c.runtimeProfileInput??{})){
   expect(c.parameterDefinitions.some(p=>p.parameter_id===parameterId)).toBe(true);expect(c.acceptanceInput[parameterId]).toEqual(value);
   expect(c.runtimeProfileClassification?.[parameterId]).toBe(parameterId==='q'?'ASSUMPTION':'RUNTIME_STRUCTURAL_DEFAULT');expect(c.runtimeProfileSourceIds?.[parameterId]?.length).toBeGreaterThan(0);
  }
  const b=c.passport.partialQuantityBasis;if(!b||b.kind!=='DEFERRED_PROJECT_QUANTITIES')throw Error('TEST_R2_PROJECT_BASIS');
  for(const p of b.parameters)expect(Object.hasOwn(c.acceptanceInput,p.parameterId)).toBe(false);
  const retained=c.binding.retainParentBindings!;
  const currentOnly=c.parameterDefinitions.filter(p=>!retained.capturedParent.parameters.some(old=>old.parameter_id===p.parameter_id));
  const expectedDerived=[oldPack.selector.parameterId,oldPack.seamParameterId,oldPack.edgeParameterId,'effective_resource_quantity_linoleum_current_whole_r1_adhesive_order'];
  expect(new Set(Object.entries(retained.newParameterSources).filter(([,spec])=>spec.kind==='DERIVED').map(([id])=>id))).toEqual(new Set(expectedDerived));
  expect(Object.values(retained.newParameterSources).filter(spec=>spec.kind==='KNOWN')).toHaveLength(86);
  expect(assembleMasterExplicitParameterSourcesR1({errorPrefix:'TEST_LINOLEUM_EXISTING_RETAINED_',parameters:currentOnly,
   newParameterSources:retained.newParameterSources,sourceClosure:[pack.sourceId],oldResourceRowIds:retained.capturedParent.resources.map(r=>r.row_id),
   next:{parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions}}))
   .toEqual(Object.fromEntries(currentOnly.map(p=>[p.parameter_id,[pack.sourceId]])));

 });
 it('constructs a helper derived exact typed project witness without masking a missing application norm',()=>{
  const c=recipe(context()),b=c.passport.partialQuantityBasis;if(!b||b.kind!=='DEFERRED_PROJECT_QUANTITIES')throw Error('TEST_R2_PROJECT_BASIS');expect(b.parameters).toHaveLength(70);
  expect(b.resourceRowIds).toEqual(dependencies({parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions},b.parameters.map(p=>p.parameterId)));
  expect(b.resourceRowIds).not.toContain(id('perimeter-seal'));expect(b.resourceRowIds.some(id=>id.startsWith('flooring_interior_linoleum_lay_standard_'))).toBe(false);
  const retained=c.binding.retainParentBindings!,baseline={input_values:{...c.acceptanceInput,...c.runtimeProfileInput},input_classification:c.runtimeProfileClassification,
   normative_source_ids:Object.fromEntries(c.parameterDefinitions.map(p=>[p.parameter_id,retained.newParameterSources[p.parameter_id]?.sourceIds??retained.capturedParent.baseline.normative_source_ids[p.parameter_id]]))};
  expect(basisErrors({parameters:c.parameterDefinitions,formulas:c.formulaDefinitions,resources:c.resourceDefinitions,baseline,
   passport:{decision:buildMasterScopeReadiness(undefined,c.resourceDefinitions,b),capability_matrix:buildMasterCapabilityMatrix(undefined,c.resourceDefinitions,b)}})).toEqual([]);
 });
 it('requires a fresh real scoped capture after retained plus absent-source routing is admitted',()=>{
  const c=recipe(context());expect(preparation(c)).toEqual(['TYPED_QUANTITY_RETAINED_MANAGED_FRESH_SCOPED_PREIMAGE_REQUIRED']);
  expect(c.capturedScopedNormativeRegistry).toBeUndefined();expect(pack.freshProof.proposedSourceCount).toBe(0);expect(pack.freshProof.formalCapture).toBe(false);
 });
 it('requires an actual pinned ROOT context and rejects parent drift before any existing publisher request',()=>{
  expect(()=>recipe(null)).toThrow('STOP_LINOLEUM_R2_ACTUAL_ROOT_CONTEXT_REQUIRED');const c=context(),actualParent={...c.actualParent,definition:{...c.actualParent.definition,id:'FORGED_PARENT'}};
  expect(()=>recipe({...c,actualParent,actualParentCaptureSha256:captureHash(actualParent)})).toThrow('STOP_LINOLEUM_R2_ACTUAL_PARENT_DRIFT');
 });
});
