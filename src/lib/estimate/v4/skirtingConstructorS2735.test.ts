import{createHash}from'node:crypto';
import{readFileSync}from'node:fs';
import{join}from'node:path';
import{buildSkirtingCurrentPhysicalCycleR1,skirtingCurrentPhysicalCompletenessR1,skirtingCurrentPhysicalPackR1 as p,
 skirtingCurrentPhysicalFactR1 as fact,skirtingCurrentPhysicalQuantityR1 as quantity}from'./skirtingConstructorS2735';
import type{AutomaticOwnerDefinition}from'./automaticConstructionOwnerR1';
import{compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}from'../backendPlatform/canonicalEstimateCompileCore';
import{estimateDeterministicHash,stringifyCanonicalEstimateJson}from'../estimateDeterministicHash';
import{canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1}from'../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import{canonicalEstimateResourceOperationSections}from'../backendPlatform/canonicalEstimateOperationComposition';
import{canonicalEstimateRevisionDetailFromStorage}from'../backendPlatform/canonicalEstimateRevisionReadMapper';
import{buildConsumerCanonicalParameterSession,buildConsumerCanonicalPrecompileParameterSession}from'../../../features/consumerRepair/consumerCanonicalParameterEditor';
import{buildCanonicalParameterCards}from'../../estimatePresentation/buildCanonicalParameterCards';
import type{CanonicalEstimateCatalogItem,CanonicalEstimateParameterInputValue}from'../backendPlatform/contracts';
import{canonicalScopeRequirementDecisionV1}from'../backendPlatform/canonicalScopeRequirementV1';
import{prepareSkirtingCurrentPhysicalCycleConfigR1,prepareSkirtingCurrentPhysicalCycleDraftR1}from'../../../../scripts/estimate/r4a13/prepareS2735SkirtingBatchSuccessor';
import{masterRetainParentBindingsOptInR1,prepareMasterRetainedBindingRepresentativeR1}from'../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import{validateIndependentCompletenessMapReferences,buildMasterScopeReadiness,assembleMasterSingleDefinitionManagedRegistryCandidateR1}from'../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import{resolveMasterScopedNormativeRegistryOptInR1}from'../../../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';

function record(value:unknown,label:string):Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('TEST_EXPECTED_RECORD:'+label);return value as Record<string,unknown>;
}
const trace=(value:unknown)=>record(record(value,'compiled_row').calculation_trace,'calculation_trace');
function sectionResource(value:unknown){const r=record(value,'compiled_row'),graph=record(trace(r).resourceGraph,'resourceGraph');
 if(typeof r.row_id!=='string'||typeof r.title_ru!=='string')throw Error('TEST_EXPECTED_ROW_ID_AND_TITLE');
 return{rowId:r.row_id,titleRu:r.title_ru,operation:graph.operationCompositionV1};}
function scopeDecision(value:unknown){const decision=canonicalScopeRequirementDecisionV1(record(trace(value).resourceGraph,'resourceGraph').scopeRequirementDecisionV1);
 if(!decision)throw Error('TEST_EXPECTED_EXISTING_SCOPE_DECISION');return decision;}
function primitiveInputs(values:Record<string,unknown>):Record<string,CanonicalEstimateParameterInputValue>{
 const result:Record<string,CanonicalEstimateParameterInputValue>={};for(const[id,value]of Object.entries(values)){
  if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')throw Error('TEST_EXPECTED_PRIMITIVE_PARAMETER:'+id);result[id]=value;
 }return result;
}

/** All measurements, documents, quotes and prices in this file are TEST_ONLY. */
describe('R858 whole current ready PVC skirting source continuation',()=>{
 const sha=(value:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex'),
  parent=():AutomaticOwnerDefinition=>({...JSON.parse(JSON.stringify(p.actualCurrent.retainedBody)),runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['length_m']}),
  definition=()=>buildSkirtingCurrentPhysicalCycleR1(parent(),'ACTUAL_CUT_PLAN_R1'),
  id=(key:string)=>p.prefix+':'+key,driver='skirting_cycle_cutplan_total_required_m',proof=()=>JSON.parse(readFileSync(p.actualCurrent.proofPath,'utf8')),
  submitted=(length=30,total=31.25):Record<string,unknown>=>{
   // Historical assumptions are explicitly selected controls here, never runtime defaults.
   const values={...proof().results[3].currentBody.baseline[0].input_values};delete values.cut_extra_m;
   return{...values,length_m:length,[driver]:total,applicability_mode:'CONFIRMED_PROJECT_FACTS',
    system_compatibility_confirmed:'YES',prepared_plane_dry_substrate_confirmed:'YES',corner_layout_confirmed:'YES',forbo_processing_ventilation_controls_confirmed:'YES',
    installation_productivity_m_man_h:10,preparation_productivity_m_man_h:20,qa_interval_m_check:5,
    separate_delivery_trip_count:0,delivery_payment_scope_reference:'TEST_ONLY delivery included in accepted supplier scope',
    cleaner_designation:'TEST_ONLY surface-compatible selected cleaner',cleaner_consumption_l:0.2,cleaner_package_l:1};
  },confirmed=():Record<string,unknown>=>Object.fromEntries(p.facts.map(f=>[fact(f.key),'values'in f&&Array.isArray(f.values)?f.values[0]:'TEST_ONLY_ACCEPTED_'+f.key])),
  run=(input:Record<string,unknown>=submitted(),readback:Record<string,unknown>=confirmed(),rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
   const d=definition();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:p.contract,catalogId:p.catalogId,primaryMeasureParameterId:'length_m',
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:readback,
    rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:sha});
  },row=(r:Awaited<ReturnType<typeof run>>,key:string)=>[...r.rows,...r.preliminaryNeeds].find(x=>x.row_id===key),provenance={kind:'manual' as const,reason:'TEST_ONLY not a current offer or quantity norm'};
 it('admits only exact R858 body/header/catalogue and rejects a changed actual source formula',()=>{
  const captured=proof().results[3],b=parent();expect(captured.target.catalogId).toBe(p.catalogId);expect(captured.current.header).toEqual(p.actualCurrent.header);
  expect(sha(p.actualCurrent.retainedBody)).toBe(p.actualCurrent.retainedBodySha256);expect(estimateDeterministicHash(p.actualCurrent.retainedBody)).toBe(p.actualCurrent.retainedBodyEstimateHash);
  expect(p.actualCurrent.header.definition_sha256).not.toBe(p.actualCurrent.retainedBodySha256);
  const d=buildSkirtingCurrentPhysicalCycleR1(b,'ACTUAL_CUT_PLAN_R1');expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([177,62,62]);
  expect(d.formulas.slice(0,37)).toEqual(b.formulas);expect(d.runtimeInput).toEqual({});expect(d.parameters.filter(x=>x.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(23);
  for(const original of b.resources){const current=d.resources.find(r=>r.row_id===original.row_id)!;for(const key of ['row_id','formula_id','unit_id','cost_owner_id','procurement_eligible']as const)expect(current[key]).toEqual(original[key]);expect(current.source_metadata).toEqual(original.source_metadata);}
  const changed={...b,formulas:b.formulas.map((formula,index)=>index===0?{...formula,expression_source:formula.expression_source+'+0'}:formula)};
  expect(()=>buildSkirtingCurrentPhysicalCycleR1(changed,'ACTUAL_CUT_PLAN_R1')).toThrow('SKIRTING_ACTUAL_R858_WHOLE_BODY_REQUIRED');
  const subtle={...b,parameters:b.parameters.map(q=>q.parameter_id==='length_m'?{...q,constraints_json:{...(q.constraints_json??{}),min:0.001000001}}:q)};
  expect(estimateDeterministicHash({parameters:subtle.parameters,formulas:subtle.formulas,resources:subtle.resources})).toBe(p.actualCurrent.retainedBodyEstimateHash);
  expect(()=>buildSkirtingCurrentPhysicalCycleR1(subtle,'ACTUAL_CUT_PLAN_R1')).toThrow('SKIRTING_ACTUAL_R858_WHOLE_BODY_REQUIRED');
 });
 it.each([[30,31.25,'36','1200','1240'],[0.5,0.55,'12','20','310']]as const)
 ('uses independent length and accepted cutplan for normal/small %sm without a corner percentage',async(length,total,board,consumption,adhesive)=>{
  const r=await run(submitted(length,total));expect(Number(r.parameters.cut_extra_m)).toBeCloseTo(total-length,9);
  expect(row(r,'material:skirting:board')?.quantity).toBe(board);expect(row(r,'scope:skirting:adhesive-consumption')?.quantity).toBe(consumption);
  expect(row(r,'material:skirting:adhesive')?.quantity).toBe(adhesive);expect(r.rows.filter(x=>x.row_id==='skirting:installation_labor')).toHaveLength(1);
  expect(r.rows.some(x=>/ceramic|03904|underlay|floor-covering/u.test(x.row_id))).toBe(false);
 });
 it.each([[2,2,'2'],[2.001,2.001,'4'],[0.001,0.001,'2']]as const)
 ('retains the source2m board quantum at exact/small boundary %s',async(length,total,expected)=>{
  const r=await run({...submitted(length,total),board_order_pieces:1});expect(row(r,'material:skirting:board')?.quantity).toBe(expected);
 });
 it('keeps missing cutplan numerical UNKNOWN after all16 readbacks and rejects a shorter plan, invalid length and forged cutdelta',async()=>{
  const input=submitted();delete input[driver];const r=await run(input);expect(row(r,'material:skirting:board')).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
  expect(trace(row(r,'material:skirting:board')).unresolvedConditionParameterIds??[]).toEqual([]);
  const unapproved=confirmed();delete unapproved[fact('cut_layout')];const measuredOnly=await run(submitted(),unapproved),board=row(measuredOnly,'material:skirting:board');
  expect(board).toMatchObject({quantity:'36',need_state:'CONDITION_REQUIRED'});expect(trace(board).unresolvedConditionParameterIds).toContain(fact('cut_layout'));
  await expect(run(submitted(30,29))).rejects.toThrow();for(const length of [0,-1])await expect(run(submitted(length,length))).rejects.toThrow();
  await expect(run({...submitted(),cut_extra_m:0})).rejects.toThrow();
  await expect(run({...input,cut_extra_m:0})).rejects.toThrow('source-managed parameter cannot be submitted cut_extra_m');
 });
 it('keeps manufacturer consumption separate from actual stock reserve rounding and price',async()=>{
  const r=await run({...submitted(),material_skirting_adhesive_stock:310,material_skirting_adhesive_reserve:30});
  expect(row(r,'scope:skirting:adhesive-consumption')?.quantity).toBe('1200');expect(row(r,'material:skirting:adhesive')?.quantity).toBe('930');
  expect(row(r,'material:skirting:adhesive')?.unit_price).toBeNull();
  const low=await run({...submitted(),adhesive_rate_ml_m:20});expect(row(low,'scope:skirting:adhesive-consumption')?.quantity).toBe('600');
  const stocked=await run({...submitted(),material_skirting_adhesive_stock:1240,material_skirting_adhesive_reserve:0});
  expect(row(stocked,'material:skirting:adhesive')?.quantity).toBe('0');expect(row(stocked,'scope:skirting:adhesive-consumption')?.quantity).toBe('1200');
  expect(scopeDecision(row(stocked,id('whole-required-scope'))).status).toBe('INCLUDED');
 });
 it('reuses one compatible sealant batch for inserts and junction without two roundings or a second paid owner',async()=>{
  const r=await run({...submitted(),end_cap_count:2,junction_sealing_mode:'REQUIRED',end_cap_sealant_consumption_ml:100,junction_sealant_consumption_l:0.3,
   junction_sealing_worker_h:0.25,sealant_supply_grouping:'SHARED_COMPATIBLE_BATCH',shared_sealant_designation:'TEST_ONLY exact compatible batch',
   shared_sealant_cartridge_ml:310,shared_sealant_compatibility_confirmed:'YES',material_skirting_shared_sealant_stock:80,material_skirting_shared_sealant_reserve:20});
  expect(row(r,'material:skirting:shared-sealant')?.quantity).toBe('620');expect(r.rows.filter(x=>x.row_id==='material:skirting:shared-sealant'&&x.included_in_procurement)).toHaveLength(1);
  for(const key of ['end-caps','junction'])expect(row(r,'allocation:skirting:sealant:'+key)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  expect(row(r,'material:skirting:end-cap-sealant')).toBeUndefined();expect(row(r,'material:skirting:junction-sealant')).toBeUndefined();
 });
 it('preserves one shared manual tool identity title price and owner through operations and saved JSON',async()=>{
  const key='material:skirting:tool:gloves',r=await run(submitted(),confirmed(),{[key]:{titleRu:'TEST_ONLY совместимые защитные перчатки',unitPrice:'77',provenance}}),actual=row(r,key)!;
  expect(actual).toMatchObject({quantity:'2',unit_price:'77',amount:'154',included_in_estimate:true});expect(r.rows.filter(x=>x.row_id===key)).toHaveLength(1);
  const cold=JSON.parse(JSON.stringify(r)),sections=canonicalEstimateResourceOperationSections(cold.rows.map(sectionResource));
  for(const operation of ['adhesive','cleanup'])expect(sections.find(s=>s.operation?.operationId===id('operation:'+operation))?.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({rowId:key,titleRu:actual.title_ru})]));
  expect(row(r,id(p.cleanupOwnership.markerSuffix))).toMatchObject({quantity:'1',included_in_estimate:false,included_in_procurement:false});
  expect(sections.find(s=>s.operation?.operationId===id('operation:cleanup'))?.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({rowId:p.cleanupOwnership.wholeLaborRowId})]));
  expect(row(r,id('resource:separate-cleanup-labour'))).toBeUndefined();
  const separate=await run(submitted(),{...confirmed(),[fact('cleanup_scope')]:p.cleanupOwnership.separateValue}),
   reopened=JSON.parse(JSON.stringify([...separate.rows,...separate.preliminaryNeeds])),separateSections=canonicalEstimateResourceOperationSections(reopened.map(sectionResource));
  expect(row(separate,id(p.cleanupOwnership.markerSuffix))).toBeUndefined();expect(row(separate,id('resource:separate-cleanup-labour'))).toMatchObject({quantity:null});
  expect(separateSections.find(s=>s.operation?.operationId===id('operation:cleanup'))?.sharedResources.some(x=>x.rowId===p.cleanupOwnership.wholeLaborRowId)).toBe(false);
  expect(row(separate,p.cleanupOwnership.wholeLaborRowId)?.quantity).toBe(row(r,p.cleanupOwnership.wholeLaborRowId)?.quantity);
 });
 it('does not let known cutplan hide missing receiver conditions and preserves the common saved PDF refusal',async()=>{
  const readback=confirmed();delete readback[fact('waste_receiver')];const r=await run(submitted(),readback),need=row(r,id('resource:chemical-waste-container'))!;
  expect(need).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:null});expect(trace(need).unresolvedConditionParameterIds).toContain(fact('waste_receiver'));
  const saved={revision:{id:'TEST_ONLY',release_id:'TEST_ONLY_R858',definition_version_id:'TEST_ONLY',checksum_sha256:'a'.repeat(64),input_parameters:r.parameters},resources:[...r.rows,...r.preliminaryNeeds]},
   cold=JSON.parse(JSON.stringify(saved)),before=JSON.stringify(cold),acceptance=canonicalEstimateSavedOperationAcceptanceV1(cold);
  expect(acceptance.pdfAllowed).toBe(false);expect(acceptance.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_CONDITION_UNRESOLVED'})]));
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(acceptance)).toThrow();expect(JSON.stringify(cold)).toBe(before);
 });
 it('uses the existing mandatory board adhesive and whole labour controls after source continuation',async()=>{
  for(const key of ['material:skirting:board','material:skirting:adhesive','skirting:installation_labor']){
   const r=await run(submitted(),confirmed(),{[key]:{includedInEstimate:false,includedInProcurement:false,provenance}});
   expect(scopeDecision(row(r,id('whole-required-scope'))).status).toBe('REQUIRED_RESOURCE_EXCLUDED');
  }
 });
 it('does not replace unknown new physical norms with source text user counts or a different technology',async()=>{
  await expect(run({...submitted(),[quantity('angle-gauge')]:1})).rejects.toThrow('unresolved application norm cannot be supplied');
  await expect(run({...submitted(),[fact('product_compatibility')]:'user approves'})).rejects.toThrow();
  await expect(run(submitted(),{...confirmed(),[fact('exact_system')]:'CERAMIC03904_OR_WOOD_FASTENERS'})).rejects.toThrow();
  const r=await run();expect(row(r,id('resource:sealed-goggles'))).toMatchObject({quantity:null});expect(row(r,id('resource:angle-gauge'))).toMatchObject({quantity:null});
  const manual=await run(submitted(),confirmed(),{[id('resource:angle-gauge')]:{quantity:'1',provenance}}),held=row(manual,id('resource:angle-gauge'));
  expect(held).toMatchObject({quantity:'1',procurement_eligible:false});expect(record(held,'source-held-need').missing_parameter_ids).toContain(quantity('angle-gauge'));
  expect(manual.rows.some(x=>x.row_id===id('resource:angle-gauge')&&x.included_in_estimate)).toBe(false);
 });
 it('keeps chemical eye protection separate from cutting controls and uses one shared owner per physical device',async()=>{
  const accepted=confirmed(),manual=await run({...submitted(),cutting_mode:'MANUAL_SAW'},accepted);
  for(const key of ['respiratory-device','respiratory-filter','hearing-protection','ventilation-equipment'])expect(row(manual,id('resource:'+key))).toBeUndefined();
  expect(row(manual,id('resource:sealed-goggles'))).toMatchObject({quantity:null,selected:false,procurement_eligible:false});
  expect(row(manual,'material:skirting:tool:eye-protection')).toBeDefined();
  const mechanical=await run({...submitted(),cutting_mode:'ELECTRIC_SAW'},{...accepted,
   [fact('preparation_method')]:'APPROVED_CONTROLLED_MECHANICAL_PREPARATION',[fact('respiratory_scope')]:'FILTERED_DEVICE_REQUIRED',
   [fact('ventilation')]:'ADDITIONAL_COMPATIBLE_VENTILATION_EQUIPMENT_REQUIRED'});
  for(const key of ['respiratory-device','respiratory-filter','hearing-protection','dust-extraction','ventilation-equipment']){
   const actual=row(mechanical,id('resource:'+key));expect(actual).toMatchObject({quantity:null,selected:false,procurement_eligible:false});
   expect([...mechanical.rows,...mechanical.preliminaryNeeds].filter(x=>x.row_id===id('resource:'+key))).toHaveLength(1);
  }
  expect(row(mechanical,id('resource:sealed-goggles'))?.quantity).toBeNull();
  // The two-pair historical profile is not an SDS resistance/breakthrough proof.
  expect(p.resources.find(x=>x.key==='sealed-goggles')!.returnWhen).toContain('паспорт');
  expect(mechanical.parameters[fact('chemical_eye_scope')]).toBe(accepted[fact('chemical_eye_scope')]);
  const unverified={...accepted};delete unverified[fact('ventilation')];const unknown=await run(submitted(),unverified),need=row(unknown,id('resource:ventilation-equipment'));
  expect(need).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:null});expect(trace(need).unresolvedConditionParameterIds).toContain(fact('ventilation'));
  const existing=await run(submitted(),{...accepted,[fact('ventilation')]:'ACCEPTED_EXISTING_MECHANICAL_VENTILATION_INCLUDED'});
  expect(row(existing,id('resource:ventilation-equipment'))).toBeUndefined();
 });
 it('independently binds all37 retained and23 new physical functions and detects a removed consumer resource',()=>{
  const d=definition(),map=skirtingCurrentPhysicalCompletenessR1(),validate=(resources:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources});
  expect(validate(d.resources)).toEqual([]);expect(map.generatedFromCurrentRows).toBe(false);expect(map.fullTechnicalAcceptance).toBe(false);
  expect(validate(d.resources.filter(x=>x.row_id!==id('resource:process-timer')))).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
  for(const resource of d.resources){const display=resource.resource_graph.publicResourcePresentationV1 as Record<string,unknown>;expect(display.nameRu).not.toMatch(/Gerflor|Forbo|6086|6087|232/u);}
 });
 const catalog=():CanonicalEstimateCatalogItem=>({catalogId:p.catalogId,releaseId:'TEST_ONLY_R858',namespace:'global',domain:'flooring',workKey:'flooring_interior_baseboard_install_standard',
  titleRu:'Монтаж готового плинтуса',definitionVersion:6,applicability:{},professionalMetadata:{},parameterSchema:definition().parameters.map(q=>{
   const t=q.truth_metadata,g=t.guide as Record<string,unknown>;return{parameterId:q.parameter_id,ordinal:q.ordinal,valueType:q.value_type,unitId:q.unit_id,titleRu:q.title_ru,
    required:q.required,defaultValue:q.default_value,constraints:q.constraints_json,semanticParameterKey:t.semantic_parameter_key,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,
    provenance:t.provenance,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,runtimeProfileClassification:t.runtime_profile_classification,
    requiredWhen:q.constraints_json?.requiredWhen??t.required_when,visibleWhen:t.visible_when,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
    guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,
     sourceSnapshotHash:g.source_snapshot_hash,guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}}as CanonicalEstimateCatalogItem['parameterSchema'][number];})});
 it('projects the real Core result into ordinary saved cards with one cutplan input and16 protected readbacks',async()=>{
  const input=submitted(),readback=confirmed(),r=await run(input,readback),cat=catalog(),stored={id:'11111111-1111-4111-8111-111111111111',release_id:cat.releaseId,catalog_id:cat.catalogId,
   definition_version_id:'TEST_ONLY_R858',definition_version:6,revision_number:1,status:'ready',currency_code:'KGS',price_snapshot_ids:[],input_parameters:r.parameters,
   user_input_snapshot:input,accepted_baseline_snapshot:readback,assumption_snapshot:{},compiler_version:p.contract,checksum_sha256:'a'.repeat(64),created_at:'2026-10-27T00:00:00Z',
   totals:r.totals,row_count:r.rows.length,amendment_contract:{parameterSources:{preliminaryNeeds:r.preliminaryNeeds}}},cold=JSON.parse(JSON.stringify(stored)),before=JSON.stringify(cold),
   revision=canonicalEstimateRevisionDetailFromStorage(cold),session=buildConsumerCanonicalParameterSession({catalog:cat,revision,draftId:'TEST_ONLY_COLD'}),cards=buildCanonicalParameterCards({session,revision:null});
  expect(cards.find(x=>x.key===driver)).toMatchObject({value:31.25,editable:true});expect(cards.some(x=>x.key==='cut_extra_m'&&x.editable)).toBe(false);
  for(const f of p.facts)expect(cards.some(x=>x.key===fact(f.key)&&x.editable)).toBe(false);expect(JSON.stringify(cold)).toBe(before);
  const unknown={...input};delete unknown[driver];const incomplete=await run(unknown,readback),unknownStored={...stored,input_parameters:incomplete.parameters,
   user_input_snapshot:unknown,amendment_contract:{parameterSources:{preliminaryNeeds:incomplete.preliminaryNeeds}}},unknownBytes=JSON.stringify(unknownStored),
   unknownRevision=canonicalEstimateRevisionDetailFromStorage(JSON.parse(unknownBytes)),unknownSession=buildConsumerCanonicalParameterSession({catalog:cat,revision:unknownRevision,draftId:'TEST_ONLY_UNKNOWN_COLD'});
  expect(buildCanonicalParameterCards({session:unknownSession,revision:null}).find(x=>x.key===driver)).toMatchObject({value:null,editable:true,missing:true});
  expect(JSON.stringify(unknownStored)).toBe(unknownBytes);
  const injected={...input,...readback},raw=buildConsumerCanonicalPrecompileParameterSession({catalog:cat,parameters:primitiveInputs(injected),draftId:'TEST_ONLY_UNTRUSTED',missingParameterIds:[],userExplicitParameterIds:Object.keys(injected),textExtractedParameterIds:[]});
  expect(buildCanonicalParameterCards({session:raw,revision:null}).some(x=>x.key===fact('product_compatibility')&&x.editable)).toBe(false);
  await expect(run(injected,{})).rejects.toThrow();
 });
 it('prepares only the same existing ordinary publisher over fresh R858 and refuses missing formal capture',async()=>{
  const root='C:/Users/User/Documents/Codex/2026-10-27/files-pasted-by-the-user-c-2/work/finishing/skirting-ready-current',
   pin=(path:string)=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}),context={
    releaseId:'01417cef-3091-5012-844d-1bbd9e75cee1',searchReleaseId:'485d16ea-60f5-5c6c-b43a-5ea604945208',outputRoot:'TEST_ONLY_NO_WRITER',
    actualBodyProof:pin(p.actualCurrent.proofPath),targetPreimage:pin(root+'/R858_NEW_SOURCE_TARGET_PREIMAGE.json'),master:pin('C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_24_2026-10-27.txt'),
    currentRelease:pin('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),physicalSourcePack:pin(join(__dirname,'../../../../data/estimate-benchmarks/source-packs/ready-pvc-skirting-current-physical-cycle-r1.json'))},
   config=prepareSkirtingCurrentPhysicalCycleDraftR1(context);
  expect(config.catalogAppend).toBeUndefined();expect(config.binding.ordinaryCompositeSourceV1).toBeUndefined();expect(config.binding.reuseExistingNormativeRegistry).toBeUndefined();
  expect(config.expectedParentShape).toEqual([137,37,37]);expect(config.runtimeProfileInput).toEqual({});
  expect([config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length]).toEqual([177,62,62]);
  expect(buildMasterScopeReadiness(config.passport.unresolvedApplicableResourceRowIds!,config.resourceDefinitions).technicalScopeStatus).toBe('NEEDS_SOURCE');
  const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate,
   retained=masterRetainParentBindingsOptInR1(candidate)!;
  expect(retained).not.toBeNull();expect(Buffer.byteLength(JSON.stringify(candidate.newLocators[0]))).toBeLessThanOrEqual(512*1024);
  const current=proof().results[3].currentBody,oldBinding=current.bindings[0],oldRow=current.resources.find((r:{id:string})=>r.id===oldBinding.resource_spec_id),
   locator=candidate.newLocators[0]!,newBindings=[{row_id:id('whole-required-scope'),locator_id:locator.id,applicability:config.binding.applicability!}],
   next={parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions,newBindings,
    successorProvenance:{contract:p.contract,sourceId:p.contract,normId:config.normId,parentDefinitionId:current.definition[0].id,
     parentBaselineId:current.baseline[0].id,capturedParentSha256:retained.capturedParentSha256}},
   representative=prepareMasterRetainedBindingRepresentativeR1(candidate,next);
  expect(oldRow.row_id).toBe('material:skirting:adhesive');expect(oldBinding.locator_id).toBe('2a97cf89-50b7-5395-885d-42d0ac6345d7');
  expect(current.sources[0].id).toBe('5aaecb6b-7af3-5262-924e-694d06ea67d3');expect(current.sources[0].metadata.contract).toBe('rik-expo-app.s27-35.skirting-glue-wet_zone.v1');
  expect(representative.expectedNormativeBindingCount).toBe(2);expect(representative.bindings).toContainEqual({row_id:oldRow.row_id,locator_id:oldBinding.locator_id,applicability:oldBinding.applicability});
  for(const parameter of current.parameters)expect(representative.normativeSourceIds[parameter.parameter_id]).toEqual(current.baseline[0].normative_source_ids[parameter.parameter_id]);
  expect(representative.normativeSourceIds[quantity('angle-gauge')]).toEqual([]);expect(representative.normativeSourceIds[driver]).toEqual([p.contract]);
  expect(config.binding.rowId).toBe(id('whole-required-scope'));expect(config.binding.additionalRowIds).toBeUndefined();
  expect(next.formulas.slice(0,37)).toEqual(current.formulas);
  for(const before of current.resources){const after=next.resources.find(r=>r.row_id===before.row_id)!;expect(after.source_metadata).toEqual(before.source_metadata);}
  const changed=next.resources.map(r=>r.row_id===oldRow.row_id?{...r,source_metadata:{...r.source_metadata,universal_productivity_claimed:true}}:r);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(candidate,{...next,resources:changed})).toThrow('OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT');
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(candidate,{...next,newBindings:[...newBindings,{row_id:oldRow.row_id,locator_id:locator.id,applicability:config.binding.applicability!}]})).toThrow('NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE');
  // Legacy retained mode may omit scoped capture; this actual subject entrypoint
  // and its verifyCore intentionally require it. No fabricated capture is used.
  expect(resolveMasterScopedNormativeRegistryOptInR1(candidate)).toBeNull();
  expect(()=>prepareSkirtingCurrentPhysicalCycleConfigR1(context)).toThrow('STOP_SKIRTING_CURRENT_WHOLE_PHYSICAL_R1_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
  await expect(config.verifyCore()).rejects.toThrow('STOP_SKIRTING_CURRENT_WHOLE_PHYSICAL_R1_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
 });
 it('retains the actual declared receiver fact on mixed source-held quantity and saved condition evidence',async()=>{
  const d=definition(),resource=d.resources.find(x=>x.row_id===id('resource:chemical-waste-container'))!,
   receiver=d.parameters.find(x=>x.parameter_id===fact('waste_receiver'))!;
  expect(resource.resource_graph?.inputParameterIds).toContain(fact('waste_receiver'));
  expect(receiver).toMatchObject({value_type:'text',required:false,truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',
   source_confirmation_required:true,provenance:{source_readback_only_v1:true,consumer_question_allowed:false}}});
  expect(receiver.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'length_m',value:0});
  const readback=confirmed();delete readback[fact('waste_receiver')];
  const mixed=await run(submitted(),readback),actual=row(mixed,id('resource:chemical-waste-container'))!;
  expect(record(actual,'actual-mixed-need').missing_parameter_ids).toContain(fact('waste_receiver'));
  expect(trace(actual).unresolvedConditionParameterIds).toContain(fact('waste_receiver'));
  expect(record(actual,'actual-mixed-need').missing_parameter_ids).toContain(quantity('chemical-waste-container'));
  expect(actual.quantity).toBeNull();
  const saved={revision:{id:'TEST_ONLY',release_id:'TEST_ONLY_R858',definition_version_id:'TEST_ONLY',checksum_sha256:'a'.repeat(64),input_parameters:mixed.parameters},
   resources:[...mixed.rows,...mixed.preliminaryNeeds]},cold=JSON.parse(JSON.stringify(saved)),before=JSON.stringify(cold),acceptance=canonicalEstimateSavedOperationAcceptanceV1(cold);
  expect(acceptance.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_CONDITION_UNRESOLVED'})]));
  expect(acceptance.pdfAllowed).toBe(false);expect(JSON.stringify(cold)).toBe(before);
  // Original failing test still requires CONDITION_REQUIRED; this independent
  // diagnostic proves whether evidence is lost or only common state priority differs.
 });
 it('restores only receiver applicability while keeping the physical quantity source-held and protected',async()=>{
  const restored=await run(),actual=row(restored,id('resource:chemical-waste-container'))!;
  expect(actual).toMatchObject({need_state:'QUANTITY_REQUIRED',quantity:null});
  expect(record(actual,'actual-mixed-need').missing_parameter_ids).toContain(quantity('chemical-waste-container'));
  expect(record(actual,'actual-mixed-need').missing_parameter_ids).not.toContain(fact('waste_receiver'));
  expect(trace(actual).unresolvedConditionParameterIds??[]).toEqual([]);
  const readback=confirmed();delete readback[fact('waste_receiver')];
  const manual=await run(submitted(),readback,{[id('resource:chemical-waste-container')]:{quantity:'2',provenance}}),held=row(manual,id('resource:chemical-waste-container'))!;
  expect(held).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:'2',procurement_eligible:false});
  expect(trace(held).unresolvedConditionParameterIds).toContain(fact('waste_receiver'));
  expect(record(held,'manual-source-held-need').missing_parameter_ids).toContain(quantity('chemical-waste-container'));
  await expect(run({...submitted(),[fact('waste_receiver')]:'user approves'})).rejects.toThrow();
 });
});
