import linoleumActualFixtureR1065 from '../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1065.json';
import {linoleumActualCurrentR1 as linoleumActual,buildLinoleumCurrentWholeR1 as linoleumWhole,
 compileLinoleumCurrentWholeR1 as linoleumCompile,linoleumCurrentWholePackR1 as linoleumPack,
 linoleumCurrentWholeExpectationsR1 as linoleumExpectations,linoleumCurrentWholeOrdinaryRequestR1 as linoleumOrdinaryRequest}
 from '../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding';
import {compileCanonicalEstimateCore as linoleumCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson as linoleumStable} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as linoleumSha} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash as linoleumHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateOperationReferences as linoleumOpRefs} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences as linoleumValidate} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {parseCanonicalPublicResourcePresentationV1 as linoleumPresentation} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {buildCanonicalRevisionCommitPayload as linoleumCommit} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds as linoleumSavedNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {canonicalOperationCompositionEvidenceFromPassportV1 as linoleumEvidence,canonicalEstimateSavedOperationAcceptanceV1 as linoleumSavedGate,assertCanonicalEstimateSavedArtifactStructureV1 as linoleumAssertSaved}
 from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {readFileSync as linoleumRead} from 'node:fs';
import {createHash as linoleumCreateHash} from 'node:crypto';

const linoleumPrefix=linoleumPack.parameterPrefix,linoleumId=(key:string)=>linoleumPack.namespace+key;
function linoleumDemoMeasurementsR1(extra:Record<string,unknown>={}):Record<string,unknown>{return{
 [linoleumPack.selector.parameterId]:linoleumPack.selector.exactValue,[linoleumPack.seamParameterId]:'NET_FIT',[linoleumPack.edgeParameterId]:'ROLLER',
 [linoleumPrefix+'net_area_m2']:20,[linoleumPrefix+'cutplan_width_m']:2,[linoleumPrefix+'cutplan_issued_length_m']:11,[linoleumPrefix+'usable_return_area_m2']:1,[linoleumPrefix+'purchased_cut_length_m']:10,
 [linoleumPrefix+'trial_bucket_start_kg']:5,[linoleumPrefix+'trial_bucket_end_kg']:4.3,[linoleumPrefix+'trial_discard_kg']:0.1,[linoleumPrefix+'trial_bonded_area_m2']:2,
 [linoleumPrefix+'adhesive_stock_kg']:1,[linoleumPrefix+'adhesive_reserve_kg']:0.5,[linoleumPrefix+'adhesive_supplier_bucket_multiple']:1,
 [linoleumPrefix+'wash_start_l']:100,[linoleumPrefix+'wash_end_l']:105,[linoleumPrefix+'cargo_gross_kg']:350,[linoleumPrefix+'route_km']:12,
 [linoleumPrefix+'waste_gross_kg']:15,[linoleumPrefix+'waste_tare_kg']:2,[linoleumPrefix+'protect_cut_count']:2,[linoleumPrefix+'protect_cut_length_m']:5,[linoleumPrefix+'protect_cut_width_m']:2,
 [linoleumPrefix+'provided_weld_kits']:2,[linoleumPrefix+'weld_seam_length_m']:8,[linoleumPrefix+'weld_trial_length_m']:0.5,[linoleumPrefix+'weld_join_end_length_m']:1,[linoleumPrefix+'accepted_person_minutes']:1200,...extra};}
const linoleumDemoConfirmedR1=():Record<string,unknown>=>Object.fromEntries(linoleumPack.protectedFacts.map(f=>[f.id,f.value]));
const linoleumRecordR1=(value:unknown):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('LINOLEUM_TEST_RECORD_REQUIRED');return Object.fromEntries(Object.entries(value));};
const linoleumRowR1=(result:Awaited<ReturnType<typeof linoleumCompile>>,key:string)=>result.rows.find(row=>row.row_id===linoleumId(key));
async function linoleumOverrideR1(submitted:Record<string,unknown>,confirmed:Record<string,unknown>,rowId:string){const d=linoleumWhole();return linoleumCore({operation:'recalculate',catalogId:linoleumPack.catalogId,compilerVersion:linoleumPack.contract,primaryMeasureParameterId:linoleumPrefix+'net_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:submitted,confirmedParameters:confirmed,rowOverrides:{[rowId]:{quantity:'2',unitPrice:'42',provenance:{kind:'manual',reason:'TEST_ONLY_EXPLICIT_SAVED_EDIT_NOT_SOURCE_AUTHORITY'}}},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:linoleumHash});}

describe('Linoleum current R1065 whole source method',()=>{
 it('pins the actual v3 body with1/59/59 and keeps zero native registry tuples distinct from OEM authority',()=>{
  const bytes=linoleumRead(require.resolve('../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1065.json'));
  expect(linoleumCreateHash('sha256').update(bytes).digest('hex')).toBe('8504904d0c6cd7b68fa3828e5acd72e367a3610ac774ebc51e73effa30b5e160');
  const d=linoleumActual();expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([1,59,59]);
  expect(d.parameters).toEqual(linoleumActualFixtureR1065.body.parameters);expect(d.formulas).toEqual(linoleumActualFixtureR1065.body.formulas);expect(d.resources).toEqual(linoleumActualFixtureR1065.body.resources);
  expect(linoleumActualFixtureR1065.body.bindings).toEqual([]);expect(linoleumActualFixtureR1065.body.sources).toEqual([]);expect(linoleumActualFixtureR1065.body.locators).toEqual([]);
 });
 it('refuses changed real header formula and raw resource provenance before the selected method is built',()=>{
  const h=structuredClone(linoleumActualFixtureR1065);h.header.definition_sha256='0'.repeat(64);expect(()=>linoleumWhole(h)).toThrow('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
  const f=structuredClone(linoleumActualFixtureR1065);f.body.formulas[0]!.expression_source='q*999';expect(()=>linoleumWhole(f)).toThrow('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
  const r=structuredClone(linoleumActualFixtureR1065);r.body.resources[0]!.cost_owner_id='OTHER';expect(()=>linoleumWhole(r)).toThrow('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
 });
 it('preserves every native formula unit owner and source metadata behind the exact legacy selector',()=>{
  const before=linoleumActual(),after=linoleumWhole();expect(after.parameters.slice(0,1)).toEqual(before.parameters);expect(after.formulas.slice(0,59)).toEqual(before.formulas);
  for(const row of before.resources){const next=after.resources.find(r=>r.row_id===row.row_id)!;
   expect(next.formula_id).toBe(row.formula_id);expect(next.unit_id).toBe(row.unit_id);expect(next.cost_owner_id).toBe(row.cost_owner_id);expect(next.procurement_eligible).toBe(row.procurement_eligible);expect(next.source_metadata).toEqual(row.source_metadata);expect(next.resource_graph).toEqual(row.resource_graph);
   expect(next.inclusion_ast).toEqual({kind:'and',operands:[{kind:'equals',parameterId:linoleumPack.selector.parameterId,value:linoleumPack.selector.legacyValue},row.inclusion_ast]});
  }expect(after.runtimeInput).toEqual({});expect(after.runtimeClassification).toEqual({});
 });
 it('retains omitted and explicit legacy runtime identities with the original excluded material and no OEM defaults',async()=>{
  const omitted=await linoleumCompile({q:2}),explicit=await linoleumCompile({q:2,[linoleumPack.selector.parameterId]:linoleumPack.selector.legacyValue});
  expect(omitted.rows).toEqual(explicit.rows);expect(omitted.preliminaryNeeds).toEqual(explicit.preliminaryNeeds);
  expect(omitted.rows.some(row=>row.row_id.startsWith(linoleumPack.namespace))).toBe(false);expect(omitted.rows.some(row=>row.row_id==='flooring_interior_linoleum_lay_standard_materials_37')).toBe(false);
  const d=linoleumActual();expect(new Set(d.resources.map(r=>r.row_id)).size).toBe(59);expect(omitted.rows).toHaveLength(58);
 });
 it('declares12 real operations and58 physical functions independently with their actual consumers',()=>{
  const d=linoleumWhole(),map=linoleumExpectations();expect(linoleumPack.operations).toHaveLength(12);expect(map.entries).toHaveLength(58);
  expect(linoleumValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  const rollerIndex=linoleumPack.resources.findIndex(r=>r.functionKey==='floor-roller');
  expect(linoleumValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>r.row_id!==linoleumId('floor-roller')),requireOperationBindings:true})).toContain(`ENTRY_${rollerIndex}_ROW_REFERENCE`);
  const waterIndex=linoleumPack.resources.findIndex(r=>r.functionKey==='clean-water');
  expect(linoleumValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.map(r=>r.row_id===linoleumId('clean-water')?{...r,unit_id:'m3'}:r),requireOperationBindings:true})).toContain(`ENTRY_${waterIndex}_RESOURCE_UNIT`);
  const knife=d.resources.find(r=>r.row_id===linoleumId('knife'))!;expect(linoleumOpRefs(knife.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(['layout','net-seam','junctions'].map(o=>linoleumId('operation:'+o)));
 });
 it('keeps every physical title functional and every actual shared resource as one ID without a second price or order',()=>{
  const d=linoleumWhole();for(const r of linoleumPack.resources){const rows=d.resources.filter(row=>row.row_id===r.rowId);expect(rows).toHaveLength(1);expect(linoleumPresentation(rows[0]!.resource_graph.publicResourcePresentationV1)).not.toBeNull();expect(rows[0]!.title_ru).not.toMatch(/Forbo|Eurocol|Marmoleum|Leister|TRIAC/iu);expect(rows[0]!.procurement_eligible).toBe(false);}
  expect(d.resources.find(row=>row.row_id===linoleumId('weld-speed'))!.resource_graph.suppliedWithKitResourceRowId).toBe(linoleumId('hotair-tool'));
 });
 it('calculates accepted cut return adhesive water transport waste and person-time balances without generic area kits',async()=>{
  const r=await linoleumCompile(linoleumDemoMeasurementsR1(),linoleumDemoConfirmedR1());
  for(const [key,expected] of [['covering','21'],['covering-order','20'],['adhesive','6'],['adhesive-order','11'],['clean-water','5'],['vehicle','4.2'],['waste-haul','13'],['protection-cover','20'],['labour','20']])expect(linoleumRowR1(r,key)?.quantity).toBe(expected);
  expect(r.rows.some(row=>row.row_id.startsWith('flooring_interior_linoleum_lay_standard_'))).toBe(false);expect(r.preliminaryNeeds.some(row=>row.row_id===linoleumId('floor-roller')&&row.quantity===null)).toBe(true);
 });
 it('does not turn the cut schedule into a universal area waste percentage or subtract existing rolls twice',()=>{
  const p=linoleumPack.quantityRules;expect(p.coveringOrderNotAreaRounding).toBe(true);expect(p.linearPurchasePlanAlreadyAccountsStock).toBe(true);
  expect(p.coveringOrder).toBe(linoleumPrefix+'cutplan_width_m*'+linoleumPrefix+'purchased_cut_length_m');expect(p.coveringOrder).not.toMatch(/ceil|max|1\.05|1\.1/u);
  const source=linoleumPack.resources.find(r=>r.functionKey==='covering')!;expect(source.expression).toBe(linoleumPrefix+'cutplan_width_m*'+linoleumPrefix+'cutplan_issued_length_m-'+linoleumPrefix+'usable_return_area_m2');
 });
 it('accepts both exact EN611 trial-rate boundaries without importing old230to290 or a selected average',async()=>{
  for(const [end,expected] of [[4.34,'5.6'],[4.13,'7.7']] as const){const r=await linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPrefix+'trial_bucket_end_kg']:end}),linoleumDemoConfirmedR1());expect(linoleumRowR1(r,'adhesive')?.quantity).toBe(expected);}
  expect(linoleumPack.quantityRules.rateBoundsKgM2).toEqual([0.280,0.385]);expect(linoleumPack.numericDrivers.every(d=>d.default===null)).toBe(true);
 });
 it('refuses outside-version trial consumption instead of silently adopting another611 region or waste allowance',async()=>{
  await expect(linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPrefix+'trial_bucket_end_kg']:4.12}),linoleumDemoConfirmedR1())).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 });
 it('keeps a single missing numeric water endpoint as QUANTITY_REQUIRED with all actual method conditions present',async()=>{
  const input=linoleumDemoMeasurementsR1();delete input[linoleumPrefix+'wash_end_l'];const r=await linoleumCompile(input,linoleumDemoConfirmedR1()),n=r.preliminaryNeeds.find(row=>row.row_id===linoleumId('clean-water'));
  expect(n?.need_state).toBe('QUANTITY_REQUIRED');expect(n?.missing_parameter_ids).toContain(linoleumPrefix+'wash_end_l');
 });
 it('does not let16 source-readback facts invent unknown numerical quantities or the historical100m2',async()=>{
  const input={[linoleumPack.selector.parameterId]:linoleumPack.selector.exactValue,[linoleumPack.seamParameterId]:'NET_FIT',[linoleumPack.edgeParameterId]:'ROLLER'},r=await linoleumCompile(input,linoleumDemoConfirmedR1());
  expect(r.parameters[linoleumPrefix+'net_area_m2']).toBeUndefined();expect(linoleumRowR1(r,'adhesive')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(linoleumPrefix+'net_area_m2'))).toBe(true);
  const model=linoleumWhole();for(const d of linoleumPack.numericDrivers)expect(model.parameters.find(p=>p.parameter_id===d.id)?.constraints_json?.requiredWhen).toBeUndefined();
 });
 it('rejects negative wash waste and cut-return balances and a trial outside the final bonded area',async()=>{
  for(const delta of [{[linoleumPrefix+'wash_end_l']:99},{[linoleumPrefix+'waste_tare_kg']:16},{[linoleumPrefix+'usable_return_area_m2']:3},{[linoleumPrefix+'trial_bonded_area_m2']:21}])await expect(linoleumCompile(linoleumDemoMeasurementsR1(delta),linoleumDemoConfirmedR1())).rejects.toBeDefined();
 });
 it('calculates a meaningful small cut plan with its own trial and refuses zero or negative floor scope',async()=>{
  const small=linoleumDemoMeasurementsR1({[linoleumPrefix+'net_area_m2']:1,[linoleumPrefix+'cutplan_issued_length_m']:0.6,[linoleumPrefix+'usable_return_area_m2']:0.1,[linoleumPrefix+'purchased_cut_length_m']:0.6,[linoleumPrefix+'trial_bucket_start_kg']:1,[linoleumPrefix+'trial_bucket_end_kg']:0.84,[linoleumPrefix+'trial_discard_kg']:0.01,[linoleumPrefix+'trial_bonded_area_m2']:0.5});
  const r=await linoleumCompile(small,linoleumDemoConfirmedR1());expect(linoleumRowR1(r,'covering')?.quantity).toBe('1.1');expect(linoleumRowR1(r,'adhesive')?.quantity).toBe('0.3');
  for(const area of [0,-1])await expect(linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPrefix+'net_area_m2']:area}),linoleumDemoConfirmedR1())).rejects.toBeDefined();
 });
 it('selects net-fit without a phantom welding kit and requires its own permission from the actual specification',async()=>{
  const facts=linoleumDemoConfirmedR1();delete facts[linoleumPrefix+'weld_method'];const r=await linoleumCompile(linoleumDemoMeasurementsR1(),facts);
  for(const key of ['hotair-tool','weld-speed','weld-cable','weld-case'])expect([...r.rows,...r.preliminaryNeeds].some(row=>row.row_id===linoleumId(key))).toBe(false);
  delete facts[linoleumPrefix+'netfit_permission'];const denied=await linoleumCompile(linoleumDemoMeasurementsR1(),facts);expect(denied.preliminaryNeeds.find(n=>n.row_id===linoleumId('netfit-scope'))?.need_state).toBe('CONDITION_REQUIRED');
 });
 it('expands actual original welding kits once and distinguishes supplied spare heaters from installed operating power',async()=>{
  const r=await linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPack.seamParameterId]:'HOT_WELD'}),linoleumDemoConfirmedR1());
  for(const key of ['hotair-tool','weld-tube','weld-speed','spare-heater','weld-case'])expect(linoleumRowR1(r,key)?.quantity).toBe('2');expect(linoleumRowR1(r,'weld-cable')?.quantity).toBe('9.5');
  expect(r.preliminaryNeeds.some(n=>n.row_id===linoleumId('manual-groover')&&n.quantity===null)).toBe(true);expect(linoleumPack.sourceHolds).toContain('Leister official PDF429bytepin; BOM provenance held');
 });
 it('keeps missing welding kit count numeric and missing actual welding approval technological',async()=>{
  const input=linoleumDemoMeasurementsR1({[linoleumPack.seamParameterId]:'HOT_WELD'});delete input[linoleumPrefix+'provided_weld_kits'];const numerical=await linoleumCompile(input,linoleumDemoConfirmedR1());expect(numerical.preliminaryNeeds.find(n=>n.row_id===linoleumId('hotair-tool'))?.need_state).toBe('QUANTITY_REQUIRED');
  const facts=linoleumDemoConfirmedR1();delete facts[linoleumPrefix+'weld_method'];const conditional=await linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPack.seamParameterId]:'HOT_WELD'}),facts);expect(conditional.preliminaryNeeds.find(n=>n.row_id===linoleumId('hotair-tool'))?.need_state).toBe('CONDITION_REQUIRED');
 });
 it('keeps the mandatory seam roller when edge pressing uses the alternative rubbing hammer',async()=>{
  const r=await linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPack.edgeParameterId]:'HAMMER'}),linoleumDemoConfirmedR1());expect(r.preliminaryNeeds.some(n=>n.row_id===linoleumId('hand-roller'))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===linoleumId('rubbing-hammer'))).toBe(true);expect([...r.rows,...r.preliminaryNeeds].some(n=>n.row_id===linoleumId('edge-roller-scope'))).toBe(false);
 });
 it('keeps confirmed no-seal junctions distinct from an unknown node or specified sealant quantity',async()=>{
  const confirmed=linoleumDemoConfirmedR1(),none=await linoleumCompile(linoleumDemoMeasurementsR1(),confirmed);expect([...none.rows,...none.preliminaryNeeds].some(n=>n.row_id===linoleumId('perimeter-seal'))).toBe(false);
  confirmed[linoleumPrefix+'perimeter_scope']='SEAL_REQUIRED';const required=await linoleumCompile(linoleumDemoMeasurementsR1(),confirmed);expect(required.preliminaryNeeds.find(n=>n.row_id===linoleumId('perimeter-seal'))?.need_state).toBe('QUANTITY_REQUIRED');
 });
 it('refuses raw injected technical facts and unsupported sheet methods without turning them into a source approval',async()=>{
  await expect(linoleumCompile({...linoleumDemoMeasurementsR1(),...linoleumDemoConfirmedR1()})).rejects.toBeDefined();
  await expect(linoleumCompile(linoleumDemoMeasurementsR1({[linoleumPack.selector.parameterId]:'PVC_DEClBEL_OR_CLICK'}),linoleumDemoConfirmedR1())).rejects.toBeDefined();
  expect(linoleumPack.formalIntake.familyProducerExists).toBe(false);expect(linoleumWhole().parameters.filter(p=>p.parameter_id.startsWith(linoleumPrefix)).every(p=>p.default_value===null)).toBe(true);
 });
 it('retains manual physical PPE quantities as a source-held sole need with saved cold money flags false',async()=>{
  const r=await linoleumOverrideR1(linoleumDemoMeasurementsR1(),linoleumDemoConfirmedR1(),linoleumId('chemical-glove')),n=r.preliminaryNeeds.find(n=>n.row_id===linoleumId('chemical-glove'));
  expect(n).toMatchObject({quantity:'2',unit_price:'42',need_state:'QUANTITY_REQUIRED',selected:false,procurement_eligible:false});expect(r.rows.some(row=>row.row_id===linoleumId('chemical-glove'))).toBe(false);
  const checksum=linoleumSha(linoleumStable(r.revisionProjection)),commit=linoleumCommit({rowCount:r.rows.length,currencyCode:'KGS',totals:r.totals,checksumSha256:checksum,compilerVersion:linoleumPack.contract,parameters:r.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:linoleumDemoMeasurementsR1(),parentRevisionId:null,identityContract:{},preliminaryNeeds:r.preliminaryNeeds}),saved={id:'TEST_ONLY_LINOLEUM_PPE_REV',release_id:'TEST_ONLY_RELEASE',catalog_id:linoleumPack.catalogId,row_count:r.rows.length,currency_code:'KGS',checksum_sha256:checksum,input_parameters:r.parameters,amendment_contract:{parameterSources:commit.parameterSources}},coldInput=linoleumRecordR1(JSON.parse(JSON.stringify(saved))),cold={...coldInput,id:coldInput.id,release_id:coldInput.release_id,catalog_id:coldInput.catalog_id,checksum_sha256:coldInput.checksum_sha256,row_count:coldInput.row_count};
  expect(linoleumSavedNeeds(cold).filter(row=>row.row_id===linoleumId('chemical-glove'))).toEqual([expect.objectContaining({quantity:'2',unit_price:'42',included_in_estimate:false,included_in_procurement:false,amount:null,need_state:'QUANTITY_REQUIRED'})]);expect(linoleumStable(cold)).toBe(linoleumStable(saved));
 });
 it('preserves its own missing receiver refusal through Core commit and the existing saved PDF409 gate',async()=>{
  const facts=linoleumDemoConfirmedR1();delete facts[linoleumPrefix+'waste_receiver'];const input=linoleumDemoMeasurementsR1(),compiled=await linoleumOverrideR1(input,facts,linoleumId('wet-waste-vessel'));
  expect(compiled.preliminaryNeeds.find(n=>n.row_id===linoleumId('wet-waste-vessel'))?.need_state).toBe('CONDITION_REQUIRED');
  const evidence=linoleumEvidence({releaseId:'TEST_ONLY_LINOLEUM_RELEASE',definitionVersionId:'TEST_ONLY_LINOLEUM_DEFINITION',passport:{definition_version_id:'TEST_ONLY_LINOLEUM_DEFINITION',payload_sha256:'a'.repeat(64),decision:{independentCompletenessMap:linoleumExpectations()}}});if(!evidence)throw Error('LINOLEUM_TEST_EVIDENCE_REQUIRED');
  const checksum=linoleumSha(linoleumStable(compiled.revisionProjection)),commit=linoleumCommit({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:linoleumPack.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence}),saved={id:'TEST_ONLY_LINOLEUM_REVISION',release_id:'TEST_ONLY_LINOLEUM_RELEASE',definition_version_id:'TEST_ONLY_LINOLEUM_DEFINITION',catalog_id:linoleumPack.catalogId,row_count:compiled.rows.length,currency_code:'KGS',checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources=[...compiled.rows,...linoleumSavedNeeds(saved)],before=linoleumStable({saved,resources}),gate=linoleumSavedGate({revision:saved,resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:linoleumId('wet-waste-vessel')});expect(()=>linoleumAssertSaved(gate)).toThrow(expect.objectContaining({httpStatus:409}));expect(linoleumStable({saved,resources})).toBe(before);
 });
 it('replays numeric measurements and16 protected source values from a saved-shaped cold input without hydration',async()=>{
  const first=await linoleumCompile(linoleumDemoMeasurementsR1(),linoleumDemoConfirmedR1()),cold=linoleumRecordR1(JSON.parse(JSON.stringify(first.revisionProjection.parameters))),submitted=linoleumDemoMeasurementsR1(),confirmed:Record<string,unknown>={};
  for(const id of Object.keys(submitted))submitted[id]=cold[id];for(const f of linoleumPack.protectedFacts)confirmed[f.id]=cold[f.id];
  const replay=await linoleumCompile(submitted,confirmed);expect(replay.rows).toEqual(first.rows);expect(replay.preliminaryNeeds).toEqual(first.preliminaryNeeds);expect(replay.parameters[linoleumPrefix+'net_area_m2']).toBe(20);expect(linoleumWhole().runtimeInput).toEqual({});
 });
 it('keeps source consumption planned supply unknown stock and actual procurement as four different states',async()=>{
  const input=linoleumDemoMeasurementsR1();delete input[linoleumPrefix+'adhesive_stock_kg'];const r=await linoleumCompile(input,linoleumDemoConfirmedR1());expect(linoleumRowR1(r,'adhesive')?.quantity).toBe('6');expect(r.preliminaryNeeds.find(n=>n.row_id===linoleumId('adhesive-order'))?.missing_parameter_ids).toContain(linoleumPrefix+'adhesive_stock_kg');expect(r.rows.every(row=>row.included_in_estimate===false&&row.included_in_procurement===false)).toBe(true);
  expect(linoleumPack.objectClosures).toBe(0);expect(linoleumPack.publicationAdmitted).toBe(false);
 });
 it('keeps the ordinary existing-publisher request held rather than fake-capturing or reauthorizing legacy59 quantities',()=>{
  const request=linoleumOrdinaryRequest();expect(request).toMatchObject({status:'SOURCE_AWARE_ORDINARY_TARGET_CONFIG_HELD',nativeRegistryCounts:[0,0,0],newReader:false,newPublisher:false,admissionGranted:false});expect(request.candidateSourceObservation.selectedNewSource.rowCount).toBe(0);expect(request.candidateSourceObservation.notFormalSourceCapture).toBe(true);expect(request.requiredBeforeRuntime).toContain('explicit legacy59 historical source disposition without OEM normative rebinding');expect(linoleumExpectations().legacy59ReboundToOemAuthority).toBe(false);
 });
});
