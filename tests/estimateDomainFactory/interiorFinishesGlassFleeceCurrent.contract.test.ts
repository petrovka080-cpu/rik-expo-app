import glassFleeceFixtureR1080 from '../../data/estimate-benchmarks/fixtures/glass-fleece-current-parent-r1080.json';
import {glassFleeceActualCurrentR1 as gfActual,buildGlassFleeceCurrentWholeR1 as gfWhole,
 compileGlassFleeceCurrentWholeR1 as gfCompile,glassFleeceCurrentWholePackR1 as gfPack,
 glassFleeceCurrentWholeExpectationsR1 as gfExpectations,glassFleeceCurrentWholeOrdinaryRequestR1 as gfOrdinary}
 from '../../src/lib/estimate/v4/domains/interiorFinishesWave1/productionBinding';
import {compileCanonicalEstimateCore as gfCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson as gfStable} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as gfSha} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash as gfHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateOperationReferences as gfOpRefs} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences as gfValidate} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {parseCanonicalPublicResourcePresentationV1 as gfPresentation} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {buildCanonicalRevisionCommitPayload as gfCommit} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds as gfSavedNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {canonicalOperationCompositionEvidenceFromPassportV1 as gfEvidence,canonicalEstimateSavedOperationAcceptanceV1 as gfSavedGate,assertCanonicalEstimateSavedArtifactStructureV1 as gfAssertSaved}
 from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {compileFormulaGraph as gfFormula,evaluateFormulaGraph as gfEvaluate} from '../../src/lib/estimate/backendPlatform/formulaGraph';
import {readFileSync as gfRead} from 'node:fs';
import {createHash as gfCreateHash} from 'node:crypto';
const gfPrefix=gfPack.parameterPrefix,gfId=(key:string)=>gfPack.namespace+key;
function gfMeasurements(extra:Record<string,unknown>={}):Record<string,unknown>{return{
 [gfPack.selector.parameterId]:gfPack.selector.exactValue,[gfPack.jointParameterId]:'BUTT',
 [gfPrefix+'net_area_m2']:20,[gfPrefix+'issued_cut_length_m']:21.1,[gfPrefix+'fleece_width_m']:1,[gfPrefix+'usable_return_area_m2']:0.1,
 [gfPrefix+'trial_area_m2']:2,[gfPrefix+'glue_start_kg']:1,[gfPrefix+'glue_end_kg']:0.59,[gfPrefix+'glue_discard_kg']:0.01,
 [gfPrefix+'primer_start_kg']:1,[gfPrefix+'primer_end_kg']:0.69,[gfPrefix+'primer_discard_kg']:0.01,[gfPrefix+'primer_trial_area_m2']:2,[gfPrefix+'primer_area_m2']:20,
 [gfPrefix+'wash_before_l']:100,[gfPrefix+'wash_after_l']:105,[gfPrefix+'waste_gross_kg']:15,[gfPrefix+'waste_tare_kg']:2,
 [gfPrefix+'protect_length_m']:10,[gfPrefix+'protect_width_m']:2,[gfPrefix+'tape_length_m']:12,[gfPrefix+'person_hours']:8,
 [gfPrefix+'cargo_mass_t']:0.25,[gfPrefix+'cargo_distance_km']:10,[gfPrefix+'planned_roll_count']:1,
 [gfPrefix+'glue_stock_kg']:1,[gfPrefix+'glue_reserve_kg']:0.5,[gfPrefix+'glue_supplier_multiple']:1,...extra};}
function gfConfirmed(extra:Record<string,unknown>={}):Record<string,unknown>{return{
 ...Object.fromEntries(gfPack.protectedFacts.map(f=>[f.id,f.value])),
 ...Object.fromEntries(gfPack.conditionalScopes.map(f=>[f.id,f.key==='access_scope'?'PLATFORM_REQUIRED':'REQUIRED'])),...extra};}
const gfRecord=(value:unknown):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('GLASS_FLEECE_TEST_RECORD_REQUIRED');return Object.fromEntries(Object.entries(value));};
const gfRow=(r:Awaited<ReturnType<typeof gfCompile>>,key:string)=>r.rows.find(row=>row.row_id===gfId(key));
async function gfOverride(input:Record<string,unknown>,confirmed:Record<string,unknown>,key:string){const d=gfWhole();return gfCore({operation:'recalculate',catalogId:gfPack.catalogId,compilerVersion:gfPack.contract,primaryMeasureParameterId:gfPrefix+'net_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:confirmed,rowOverrides:{[gfId(key)]:{quantity:'2',unitPrice:'42',provenance:{kind:'manual',reason:'TEST_ONLY_EXPLICIT_EDIT_NOT_SOURCE_APPROVAL'}}},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:gfHash});}
function gfSaved(compiled:Awaited<ReturnType<typeof gfCompile>>,input:Record<string,unknown>,withEvidence=false){
 const checksum=gfSha(gfStable(compiled.revisionProjection));const evidence=gfEvidence({releaseId:'TEST_ONLY_GF_RELEASE',definitionVersionId:'TEST_ONLY_GF_DEFINITION',passport:{definition_version_id:'TEST_ONLY_GF_DEFINITION',payload_sha256:'a'.repeat(64),decision:{independentCompletenessMap:gfExpectations()}}});if(withEvidence&&!evidence)throw Error('GLASS_FLEECE_TEST_EVIDENCE_REQUIRED');
 const commit=gfCommit({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:gfPack.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,...(withEvidence&&evidence?{operationCompositionEvidenceV1:evidence}:{})});
 return{id:'TEST_ONLY_GF_REVISION',release_id:'TEST_ONLY_GF_RELEASE',definition_version_id:'TEST_ONLY_GF_DEFINITION',catalog_id:gfPack.catalogId,row_count:compiled.rows.length,currency_code:'KGS',checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
}

describe('Glass fleece current R1080 whole source method',()=>{
 it('pins actual v3 native1/59/59 and zero registry without granting OEM authority',()=>{
  const bytes=gfRead(require.resolve('../../data/estimate-benchmarks/fixtures/glass-fleece-current-parent-r1080.json'));expect(gfCreateHash('sha256').update(bytes).digest('hex')).toBe('f216769da49115e1ff74ceb840b554122ab1d154413d6ff1733afdaca6387ae0');
  const d=gfActual();expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([1,59,59]);expect(d.parameters).toEqual(glassFleeceFixtureR1080.body.parameters);expect(d.formulas).toEqual(glassFleeceFixtureR1080.body.formulas);expect(d.resources).toEqual(glassFleeceFixtureR1080.body.resources);for(const k of ['bindings','locators','sources','newSource'] as const)expect(glassFleeceFixtureR1080.body[k]).toEqual([]);
 });
 it('refuses mutation of the real body header formula and source resource before building a continuation',()=>{
  const header=structuredClone(glassFleeceFixtureR1080);header.header.definition_sha256='0'.repeat(64);expect(()=>gfWhole(header)).toThrow('GLASS_FLEECE_R1_ACTUAL_R1080_BODY_REQUIRED');
  const formula=structuredClone(glassFleeceFixtureR1080);formula.body.formulas[0]!.expression_source='q*999';expect(()=>gfWhole(formula)).toThrow('GLASS_FLEECE_R1_ACTUAL_R1080_BODY_REQUIRED');
  const row=structuredClone(glassFleeceFixtureR1080);row.body.resources[0]!.title_ru='MUTATED';expect(()=>gfWhole(row)).toThrow('GLASS_FLEECE_R1_ACTUAL_R1080_BODY_REQUIRED');
 });
 it('retains native AST units owners source metadata and the untouched q assumption behind its legacy selector',()=>{
  const old=gfActual(),d=gfWhole();expect(d.parameters.slice(0,1)).toEqual(old.parameters);expect(d.formulas.slice(0,59)).toEqual(old.formulas);
  for(const r of old.resources){const next=d.resources.find(n=>n.row_id===r.row_id)!;expect(next.resource_graph).toEqual(r.resource_graph);expect(next.source_metadata).toEqual(r.source_metadata);expect(next.cost_owner_id).toBe(r.cost_owner_id);expect(next.unit_id).toBe(r.unit_id);expect(next.formula_id).toBe(r.formula_id);expect(next.inclusion_ast).toEqual({kind:'and',operands:[{kind:'equals',parameterId:gfPack.selector.parameterId,value:gfPack.selector.legacyValue},r.inclusion_ast]});}
  expect(d.runtimeInput).toEqual({});expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([87,113,113]);
 });
 it('preserves omitted and explicit legacy runtime58 while retaining the original59 definition and excluded material',async()=>{
  const omitted=await gfCompile({q:2}),explicit=await gfCompile({q:2,[gfPack.selector.parameterId]:gfPack.selector.legacyValue});expect(omitted.rows).toEqual(explicit.rows);expect(omitted.preliminaryNeeds).toEqual(explicit.preliminaryNeeds);expect(omitted.rows).toHaveLength(58);expect(omitted.rows.some(r=>r.row_id.startsWith(gfPack.namespace))).toBe(false);
  const excluded='plaster_paint_interior_glass_fiber_apply_standard_materials_37';expect(gfActual().resources.find(r=>r.row_id===excluded)?.inclusion_ast).toEqual({kind:'literal',value:false});expect(omitted.rows.some(r=>r.row_id===excluded)).toBe(false);expect(omitted.preliminaryNeeds.some(r=>r.row_id===excluded)).toBe(false);
 });
 it('binds12 independently reviewed operations and47 physical functions to actual sole resources',()=>{
  const d=gfWhole(),map=gfExpectations();expect(gfPack.operations).toHaveLength(12);expect(map.entries).toHaveLength(47);expect(gfValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  for(const item of gfPack.resources)expect(gfOpRefs(d.resources.find(r=>r.row_id===item.rowId)!.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(item.operations.map(o=>gfId('operation:'+o)));
 });
 it('detects a deleted real smoothing tool and a wash-water unit mutation independently of emitted rows',()=>{
  const d=gfWhole(),map=gfExpectations(),i=gfPack.resources.findIndex(r=>r.functionKey==='rounded-spatula'),j=gfPack.resources.findIndex(r=>r.functionKey==='wash-water');
  expect(gfValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>r.row_id!==gfId('rounded-spatula')),requireOperationBindings:true})).toContain(`ENTRY_${i}_ROW_REFERENCE`);
  expect(gfValidate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.map(r=>r.row_id===gfId('wash-water')?{...r,unit_id:'m3'}:r),requireOperationBindings:true})).toContain(`ENTRY_${j}_RESOURCE_UNIT`);
 });
 it('keeps functional public names one shared knife and one informational payment boundary per resource',()=>{
  const d=gfWhole();for(const item of gfPack.resources){const rows=d.resources.filter(r=>r.row_id===item.rowId);expect(rows).toHaveLength(1);expect(gfPresentation(rows[0]!.resource_graph.publicResourcePresentationV1)).not.toBeNull();expect(rows[0]!.title_ru).not.toMatch(/Oscar|Wellton|W45|GOs|Vitrulan/iu);expect(rows[0]!.procurement_eligible).toBe(false);}
  expect(gfOpRefs(d.resources.find(r=>r.row_id===gfId('cutting-knife'))!.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(['layout','joints'].map(o=>gfId('operation:'+o)));
 });
 it('calculates accepted cut mass wash labour transport and waste balances without area kits',async()=>{
  const r=await gfCompile(gfMeasurements(),gfConfirmed());for(const [key,qty] of [['fleece','21'],['glue','4'],['primer','3'],['cover','20'],['mask-tape','12'],['wash-water','5'],['labour','8'],['delivery','2.5'],['waste-haul','13'],['fleece-order','1'],['glue-order','10']])expect(gfRow(r,key)?.quantity).toBe(qty);
  expect(r.preliminaryNeeds.some(n=>n.row_id===gfId('rounded-spatula')&&n.quantity===null)).toBe(true);expect(r.rows.some(r=>r.row_id.startsWith('plaster_paint_interior_glass_fiber_apply_standard_'))).toBe(false);
 });
 it('uses measured cut width and usable-return allocation rather than a universal waste factor or roll coverage',()=>{
  expect(gfPack.resources.find(r=>r.functionKey==='fleece')?.expression).toBe(gfPrefix+'issued_cut_length_m*'+gfPrefix+'fleece_width_m-'+gfPrefix+'usable_return_area_m2');expect(gfPack.quantityRules.cutAllowanceMPerPiece).toBe(.05);expect(gfPack.quantityRules.rollOrderUnitId).toBe('roll');expect(gfPack.quantityRules.actualWidthNotNominalDefault).toBe(true);expect(gfPack.quantityRules.noKgLApproxDensityConversion).toBe(true);
  const uniform=gfFormula('ceil(ceil(width/1)/floor(50/(height+0.05)))');expect(gfEvaluate(uniform,{width:3,height:2.6})).toBe('1');expect(gfEvaluate(uniform,{width:19,height:2.6})).toBe('2');
 });
 it('accepts the exact upper glue rate and both primer-rate boundaries without choosing averages',async()=>{
  for(const [glueEnd,primerEnd,glueQty,primerQty] of [[.55,.79,'4.4','2'],[.59,.49,'4','5']] as const){const r=await gfCompile(gfMeasurements({[gfPrefix+'glue_end_kg']:glueEnd,[gfPrefix+'primer_end_kg']:primerEnd}),gfConfirmed());expect(gfRow(r,'glue')?.quantity).toBe(glueQty);expect(gfRow(r,'primer')?.quantity).toBe(primerQty);}
 });
 it('refuses out-of-source trial rates and a zero glue trial loss instead of inventing a norm',async()=>{
  for(const delta of [{[gfPrefix+'glue_end_kg']:.548},{[gfPrefix+'primer_end_kg']:.488},{[gfPrefix+'primer_end_kg']:.792},{[gfPrefix+'glue_end_kg']:.99}])await expect(gfCompile(gfMeasurements(delta),gfConfirmed())).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 });
 it('keeps a missing numeric wash endpoint quantity-required with every technical fact present',async()=>{
  const input=gfMeasurements();delete input[gfPrefix+'wash_after_l'];const r=await gfCompile(input,gfConfirmed()),need=r.preliminaryNeeds.find(n=>n.row_id===gfId('wash-water'));expect(need?.need_state).toBe('QUANTITY_REQUIRED');expect(need?.missing_parameter_ids).toContain(gfPrefix+'wash_after_l');
 });
 it('does not let19 protected declarations supply unknown measurements or a historical area to new formulas',async()=>{
  const r=await gfCompile({[gfPack.selector.parameterId]:gfPack.selector.exactValue,[gfPack.jointParameterId]:'BUTT'},gfConfirmed());expect(r.parameters[gfPrefix+'net_area_m2']).toBeUndefined();expect(gfRow(r,'glue')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(gfPrefix+'net_area_m2'))).toBe(true);
  const d=gfWhole();for(const number of gfPack.numericDrivers){expect(d.parameters.find(p=>p.parameter_id===number.id)?.default_value).toBeNull();expect(d.parameters.find(p=>p.parameter_id===number.id)?.constraints_json?.requiredWhen).toBeUndefined();}
 });
 it('refuses negative raw wash waste cut-return and external-trial balances rather than clamping',async()=>{
  for(const delta of [{[gfPrefix+'wash_after_l']:99},{[gfPrefix+'waste_tare_kg']:16},{[gfPrefix+'usable_return_area_m2']:2},{[gfPrefix+'trial_area_m2']:21}])await expect(gfCompile(gfMeasurements(delta),gfConfirmed())).rejects.toBeDefined();
 });
 it('calculates a small actual piece plan and refuses zero or negative wall scope',async()=>{
  const r=await gfCompile(gfMeasurements({[gfPrefix+'net_area_m2']:.5,[gfPrefix+'issued_cut_length_m']:.6,[gfPrefix+'usable_return_area_m2']:.05,[gfPrefix+'trial_area_m2']:.25,[gfPrefix+'glue_start_kg']:.2,[gfPrefix+'glue_end_kg']:.14,[gfPrefix+'glue_discard_kg']:.01,[gfPrefix+'primer_area_m2']:.5}),gfConfirmed());expect(gfRow(r,'fleece')?.quantity).toBe('0.55');expect(gfRow(r,'glue')?.quantity).toBe('0.1');
  for(const area of [0,-1])await expect(gfCompile(gfMeasurements({[gfPrefix+'net_area_m2']:area}),gfConfirmed())).rejects.toBeDefined();
 });
 it('keeps butt and accepted double-cut consumers without importing an overlap width from another system',async()=>{
  const butt=await gfCompile(gfMeasurements(),gfConfirmed()),double=await gfCompile(gfMeasurements({[gfPack.jointParameterId]:'DOUBLE_CUT'}),gfConfirmed());expect(gfRow(butt,'fleece')?.quantity).toBe('21');expect(gfRow(double,'fleece')?.quantity).toBe('21');expect(gfPack.numericDrivers.some(d=>d.id.includes('overlap'))).toBe(false);expect(gfOpRefs(gfWhole().resources.find(r=>r.row_id===gfId('cutting-knife'))!.resource_graph.operationCompositionV1)).toHaveLength(2);
 });
 it('distinguishes source-approved optional PPE and ground access from unknown applicability',async()=>{
  const facts=gfConfirmed();for(const scope of gfPack.conditionalScopes)facts[scope.id]=scope.key==='access_scope'?'ACCEPTED_GROUND_ACCESS':'NOT_REQUIRED_BY_ACCEPTED_RISK';const none=await gfCompile(gfMeasurements(),facts);for(const k of ['gloves','goggles','respirator','workwear','access-platform'])expect([...none.rows,...none.preliminaryNeeds].some(r=>r.row_id===gfId(k))).toBe(false);
  delete facts[gfPrefix+'respiratory_scope'];const unknown=await gfCompile(gfMeasurements(),facts);expect(unknown.preliminaryNeeds.find(n=>n.row_id===gfId('respirator'))?.need_state).toBe('CONDITION_REQUIRED');
 });
 it('keeps a missing substrate approval condition-required even with measured glue and cut quantities',async()=>{
  const facts=gfConfirmed();delete facts[gfPrefix+'base'];const r=await gfCompile(gfMeasurements(),facts);expect(r.preliminaryNeeds.find(n=>n.row_id===gfId('glue'))?.need_state).toBe('CONDITION_REQUIRED');expect(r.preliminaryNeeds.find(n=>n.row_id===gfId('fleece'))?.missing_parameter_ids).toContain(gfPrefix+'base');
 });
 it('refuses raw technical fact injection and incompatible woven wallpaper or mesh selectors',async()=>{
  await expect(gfCompile({...gfMeasurements(),...gfConfirmed()})).rejects.toBeDefined();for(const value of ['PAPER_WALLPAPER','WOVEN_GLASS_WALLPAPER','ROOF_FLEECE','FACADE_MESH'])await expect(gfCompile(gfMeasurements({[gfPack.selector.parameterId]:value}),gfConfirmed())).rejects.toBeDefined();
 });
 it('keeps manual PPE as a sole source-held need and preserves false money flags through commit and cold projection',async()=>{
  const input=gfMeasurements(),r=await gfOverride(input,gfConfirmed(),'gloves'),n=r.preliminaryNeeds.find(n=>n.row_id===gfId('gloves'));expect(n).toMatchObject({quantity:'2',unit_price:'42',need_state:'QUANTITY_REQUIRED',selected:false,procurement_eligible:false});expect(r.rows.some(n=>n.row_id===gfId('gloves'))).toBe(false);
  const saved=gfSaved(r,input),coldInput=gfRecord(JSON.parse(JSON.stringify(saved))),cold={...coldInput,id:coldInput.id,release_id:coldInput.release_id,catalog_id:coldInput.catalog_id,checksum_sha256:coldInput.checksum_sha256,row_count:coldInput.row_count};expect(gfSavedNeeds(cold).filter(n=>n.row_id===gfId('gloves'))).toEqual([expect.objectContaining({quantity:'2',unit_price:'42',included_in_estimate:false,included_in_procurement:false,amount:null,need_state:'QUANTITY_REQUIRED'})]);expect(gfStable(saved)).toBe(gfStable(cold));
 });
 it('preserves missing waste-receiver condition through a manual container edit and saved PDF409 refusal',async()=>{
  const facts=gfConfirmed();delete facts[gfPrefix+'waste_receiver'];const input=gfMeasurements(),r=await gfOverride(input,facts,'wet-waste-container');expect(r.preliminaryNeeds.find(n=>n.row_id===gfId('wet-waste-container'))?.need_state).toBe('CONDITION_REQUIRED');
  const saved=gfSaved(r,input,true),resources=[...r.rows,...gfSavedNeeds(saved)],before=gfStable({saved,resources}),gate=gfSavedGate({revision:saved,resources});expect(gate.pdfAllowed).toBe(false);expect(gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:gfId('wet-waste-container')});expect(()=>gfAssertSaved(gate)).toThrow(expect.objectContaining({httpStatus:409}));expect(gfStable({saved,resources})).toBe(before);
 });
 it('replays numerical and protected saved-shaped inputs with the same rows needs and source conditions',async()=>{
  const first=await gfCompile(gfMeasurements(),gfConfirmed()),cold=gfRecord(JSON.parse(JSON.stringify(first.revisionProjection.parameters))),submitted=gfMeasurements(),confirmed=gfConfirmed();for(const id of Object.keys(submitted))submitted[id]=cold[id];for(const id of Object.keys(confirmed))confirmed[id]=cold[id];const replay=await gfCompile(submitted,confirmed);expect(replay.rows).toEqual(first.rows);expect(replay.preliminaryNeeds).toEqual(first.preliminaryNeeds);expect(replay.parameters[gfPrefix+'net_area_m2']).toBe(20);expect(gfWhole().runtimeInput).toEqual({});
 });
 it('keeps consumption unknown stock planned supply and actual procurement as separate states',async()=>{
  const input=gfMeasurements();delete input[gfPrefix+'glue_stock_kg'];const r=await gfCompile(input,gfConfirmed());expect(gfRow(r,'glue')?.quantity).toBe('4');expect(r.preliminaryNeeds.find(n=>n.row_id===gfId('glue-order'))?.missing_parameter_ids).toContain(gfPrefix+'glue_stock_kg');expect(r.rows.every(n=>n.included_in_estimate===false&&n.included_in_procurement===false)).toBe(true);expect(gfPack.sourceApplicability.actualObjectClosures).toBe(0);
 });
 it('retains the ordinary existing-publisher capture hold and source-aware legacy disposition without a new pipeline',()=>{
  const request=gfOrdinary();expect(request).toMatchObject({status:'SOURCE_AWARE_ORDINARY_TARGET_CONFIG_HELD',nativeRegistryCounts:[0,0,0],newReader:false,newPublisher:false,admissionGranted:false});expect(request.candidateSourceObservation.selectedNewSource.rowCount).toBe(0);expect(request.candidateSourceObservation.notFormalSourceCapture).toBe(true);expect(request.legacyTemplateAssumptionSources.parameterSources.q).toEqual(['r555-source:plaster_paint_interior_glass_fiber_apply_standard_professional_expanded_v1']);expect(request.newBindingRowIds).toHaveLength(54);expect(gfExpectations().legacy59ReboundToOemAuthority).toBe(false);
 });

 it('refuses an invented selector baseline rather than bypassing the existing source-owned legacy wrapper',async()=>{
  const d=gfWhole(),parameters=d.parameters.map(p=>p.parameter_id===gfPack.selector.parameterId?{...p,default_value:gfPack.selector.legacyValue}:p);
  await expect(gfCore({operation:'compile',catalogId:gfPack.catalogId,compilerVersion:gfPack.contract,primaryMeasureParameterId:'q',parameterDefinitions:parameters,formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{q:2},confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:gfHash})).rejects.toThrow('invalid accepted baseline provenance '+gfPack.selector.parameterId);
  expect(d.parameters.find(p=>p.parameter_id===gfPack.selector.parameterId)?.default_value).toBeNull();expect(gfOrdinary().requiredBeforeRuntime).toContain('existing source-owned wrapper must materialize only omitted legacy selector; no unapproved new default/baseline and no quantity hydration');
 });

});
