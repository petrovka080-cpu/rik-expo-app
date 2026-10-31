import {readFileSync as readPvc15History} from 'node:fs';
import {createHash as pvc15HistoryHash} from 'node:crypto';
import pvc15HistoricalBindings from '../../data/estimate-benchmarks/source-packs/pvc15-existing-area-bindings-s27-43.json';
import {pvc15MeasuredControlInputS2743} from '../fixtures/pvc15AreaVariantBindingsS2743';
import {assertCanonicalNewWorkCatalogIdV1 as assertPvc15NewCatalog} from '../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743 as definition,PVC15_JOINT_CHOICE,PVC15_JOINT_LAYER,PVC15_JOINT_CONFIRM} from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import {G6_COMPOSITE_LABOR_MODE_S2741} from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import {canonicalArtifactSpecificationParts} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {PVC15_BASE,PVC15_MACHINE} from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import {pvc15FieldTransitionControlInputS2743} from '../fixtures/pvc15FieldTransitionCompositionS2743';
import {pvc15ControlInputS2743} from '../fixtures/pvc15FullCompositionS2743';
import {canonicalEstimateWorkProcess} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildMasterParameterCalculationConsumers} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReportOriginalAuditV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalProfessionalPdfProjection} from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {pvc15FieldTransitionPublishConfigS2743} from '../../scripts/estimate/r4a13/prepareS2743Pvc15FieldTransitionSuccessor';
const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,submittedParameters,
 catalogId:'canonical-work:base:roofing_interior_flat_roof_install_standard',compilerVersion:'PVC15_JOINT_CONTROL',primaryMeasureParameterId:'area_m2'});
type Result=Awaited<ReturnType<typeof compile>>;
const row=(result:Result,id:string)=>result.rows.find(r=>r.row_id===id);
const balance=(result:Result,id:string)=>(row(result,id)?.calculation_trace as {purchaseBalance?:Record<string,unknown>}|undefined)?.purchaseBalance;
describe('PVC15 field and accepted reinforced bitumen transition through one core',()=>{
 test('the governed successor changes only the existing field and seals both accepted source packs',async()=>{
  const config=pvc15FieldTransitionPublishConfigS2743({definition:'073ddefa-9271-5f26-8ae7-29eb9cf8ff58',search:'3fc0f0d3-64be-5880-a852-7418ad0d1fa3'});
  expect(config.catalogAppend).toBeUndefined();expect(config.expectedParentShape).toEqual([154,54,54]);
  expect(config.runtimeProfileInput).toEqual({});expect(await config.verifyCore()).toMatchObject({status:'GREEN_EXISTING_FIELD_TRANSITION_COMPOSITION_CORE_CONTROL',fieldKnownRows:26,jointKnownRows:41,acceptedNewTypeDelta:0,seriesAccepted:false});
 });
 test('all facts have resource consumers and no project or source-confirmation defaults',()=>{
  expect(definition.runtimeInput).toEqual({});expect(definition.parameters.every(p=>p.default_value===null)).toBe(true);
  expect(new Set(definition.resources.map(r=>r.ordinal)).size).toBe(definition.resources.length);
  const {resourceConsumers}=buildMasterParameterCalculationConsumers({parameters:definition.parameters,formulas:definition.formulas,resources:definition.resources});
  expect(definition.parameters.filter(p=>!resourceConsumers[p.parameter_id]?.length).map(p=>p.parameter_id)).toEqual([]);
 });
 test('excluded transition keeps the accepted field quantities, procurement and cost boundary',async()=>{
  const r=await compile({...pvc15ControlInputS2743(),pvc15_joint_transition_scope:PVC15_JOINT_CHOICE.no});
  expect(r.preliminaryNeeds).toEqual([]);expect(r.rows).toHaveLength(26);
  expect(row(r,'rc09:reinforced_pvc_roof_membrane_1_5mm')?.quantity).toBe('535');
  expect(row(r,'pvc15:equipment:own-use')?.quantity).toBe('9');expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(5);
 });
 test('one apparatus and shared tools, with summed usage and distinct labor rather than a second included machine charge',async()=>{
  const r=await compile(pvc15FieldTransitionControlInputS2743());expect(r.preliminaryNeeds).toEqual([]);
  expect(row(r,'pvc15:joint:machine-usage')?.quantity).toBe('9.25');expect(row(r,'pvc15:joint:machine-own')?.quantity).toBe('9.25');
  expect(row(r,'pvc15:equipment:own-use')).toBeUndefined();expect(row(r,'pvc15_transition_transition:machine:welder_included')).toBeUndefined();
  expect(row(r,'pvc15:joint:tool-cutting')?.quantity).toBe('1');expect(row(r,'pvc15:tools:cutting')).toBeUndefined();
  expect(row(r,'pvc15_transition_transition:tool:cutting')).toBeUndefined();
  expect(row(r,'pvc15_transition_transition:labor:worker')).toMatchObject({quantity:'1.2',included_in_estimate:true});
  expect(r.rows.some(x=>x.included_in_procurement&&x.unit_id==='machine_hour')).toBe(false);
  const process=canonicalEstimateWorkProcess(r.rows.map(x=>({rowId:x.row_id,titleRu:typeof x.title_ru==='string'?x.title_ru:undefined,
   operation:(x.calculation_trace as {resourceGraph?:{operationCompositionV1?:unknown}})?.resourceGraph?.operationCompositionV1})));
  expect(process).toHaveLength(1);expect(process[0]?.operations.some(o=>o.operationId==='transition:welding')).toBe(true);
  expect(process[0]?.operations.flatMap(o=>o.sharedResources??[]).some(s=>s.rowId==='pvc15:joint:machine-usage')).toBe(true);
  const tape=row(r,'pvc15_transition_transition:material:tape')!;
  expect(canonicalArtifactSpecificationParts({...tape,ownership_status:'OWNED'},r.parameters).flatMap(s=>s.parts))
   .toEqual(expect.arrayContaining(['Ширина (мм): 300','Толщина (мм): 1.5','Длина рулона (м): 19']));
 });
 test('accepted per-measure labor coverage and completion survive composition; unknown choice retains technical needs rather than a guessed payment',async()=>{
  const input=pvc15FieldTransitionControlInputS2743();
  const complex=await compile({...input,pvc15_transition_commercial_labor_price_mode:G6_COMPOSITE_LABOR_MODE_S2741});
  expect(complex.preliminaryNeeds).toEqual([]);expect(row(complex,'pvc15_transition_transition:work:labor-rate'))
   .toMatchObject({quantity:'10',unit_id:'linear_m',included_in_estimate:true});
  expect(row(complex,'pvc15_transition_transition:labor:worker')).toMatchObject({quantity:'1.2',included_in_estimate:false});
  expect(row(complex,'pvc15_transition_transition:tool:adhesive')).toMatchObject({included_in_estimate:false});
  expect(complex.rows.some(r=>r.row_id.startsWith('pvc15_transition_g6:'))).toBe(true);
  delete input.pvc15_transition_commercial_labor_price_mode;
  const missing=await compile(input);expect(row(missing,'pvc15_transition_transition:labor:worker')).toBeUndefined();
  expect(missing.preliminaryNeeds.find(n=>n.row_id==='pvc15_transition_transition:labor:worker')?.missing_parameter_ids).toContain('pvc15_transition_commercial_labor_price_mode');
  expect(row(missing,'rc09:reinforced_pvc_roof_membrane_1_5mm')?.quantity).toBe('535');
 });
 test('a standalone transition quote cannot pay the changed composed scope with shared apparatus excluded',async()=>{
  const owner=definition.resources.find(r=>r.row_id==='pvc15_transition_transition:work:labor-rate')!;
  const coverage=owner.resource_graph.commercialCostCoverageV1 as {scopeId:string};
  const oldScope='labor-with-included-contractor-resources:canonical-work:master:roof_pvc_bitumen_transition_reinforced_tape_guide2024_single_strip';
  expect(coverage.scopeId).not.toBe(oldScope);expect(owner.cost_owner_id).toContain('pvc15_transition_');
  const input={operation:'compile' as const,compilerVersion:'PVC15_SCOPED_PRICE_CONTROL',
   catalogId:'canonical-work:base:roofing_interior_flat_roof_install_standard',primaryMeasureParameterId:'area_m2',
   parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
   submittedParameters:{...pvc15FieldTransitionControlInputS2743(),pvc15_transition_commercial_labor_price_mode:G6_COMPOSITE_LABOR_MODE_S2741},
   confirmedParameters:{},currencyCode:'KGS',priceItems:[{price_key:owner.cost_owner_id!.replace(/^pvc15_transition_/u,''),unit_id:'linear_m',currency_code:'KGS',
    unit_price:'99',snapshot_id:'QA_STANDALONE_QUOTE',cost_scope_id:oldScope}],maximumResourceRows:definition.resources.length,hashJson:async (value:unknown)=>estimateDeterministicHash(value)};
  const result=await compileCanonicalEstimateCore(input);
  expect(row(result,owner.row_id)?.unit_price).toBeNull();expect(result.priceSnapshotIds).not.toContain('QA_STANDALONE_QUOTE');
  await expect(compileCanonicalEstimateCore({...input,priceItems:[{...input.priceItems[0]!,price_key:owner.cost_owner_id!}]})).rejects.toMatchObject({code:'PRICE_SCOPE_MISMATCH'});
  const matched=await compileCanonicalEstimateCore({...input,priceItems:[{...input.priceItems[0]!,price_key:owner.cost_owner_id!,cost_scope_id:coverage.scopeId,snapshot_id:'QA_COMPOSED_QUOTE'}]});
  expect(row(matched,owner.row_id)).toMatchObject({unit_price:'99',amount:'990'});
 });
 test('different compatible consumptions are summed before one supply rounding and one stock allocation',async()=>{
  const r=await compile({...pvc15FieldTransitionControlInputS2743(),pvc15_joint_liquid_stock:1,pvc15_joint_liquid_reserve:1});
  expect(balance(r,'pvc15:joint:liquid-pvc')).toMatchObject({consumed:'7',stock:'1',reserve:'1',effectiveOrder:'7',remaining:'1'});
  expect(row(r,'rc09:liquid_pvc_joint_sealant')).toBeUndefined();expect(row(r,'pvc15_transition_transition:material:liquid_pvc')).toBeUndefined();
  expect(r.rows.filter(x=>x.included_in_procurement&&x.unit_id==='l')).toHaveLength(1);
 });
 test('different separation products stay different; a common bitumen layer subtracts only the confirmed bounded physical overlap',async()=>{
  const separate=await compile(pvc15FieldTransitionControlInputS2743());
  expect(row(separate,'pvc15:separation:mineral')).toBeDefined();expect(row(separate,'pvc15_transition_transition:material:separation')).toBeDefined();
  const input={...pvc15FieldTransitionControlInputS2743(),pvc15_base:PVC15_BASE.bitumen,pvc15_joint_layer_relation:PVC15_JOINT_LAYER.common,
   pvc15_joint_layer_confirmed:PVC15_JOINT_CONFIRM,pvc15_joint_layer_product:'VALIDATION_FIXTURE: одно термообработанное изделие300г/м² по битуму для обеих зон',
   pvc15_joint_layer_overlap_m2:2,pvc15_joint_layer_stock:0,pvc15_joint_layer_reserve:0,pvc15_joint_layer_quantum:10};
  const r=await compile(input);expect(r.preliminaryNeeds).toEqual([]);
  expect(balance(r,'pvc15:joint:separation')).toMatchObject({consumed:'513.5',effectiveOrder:'520',remaining:'6.5'});
  expect(row(r,'pvc15:separation:bitumen')).toBeUndefined();expect(row(r,'pvc15_transition_transition:material:separation')).toBeUndefined();
  await expect(compile({...input,pvc15_joint_layer_overlap_m2:5.6})).rejects.toThrow();
  await expect(compile({...input,pvc15_base:PVC15_BASE.eps})).rejects.toThrow();
  const fullOverlap=await compile({...input,pvc15_joint_layer_overlap_m2:5.5});
  expect(balance(fullOverlap,'pvc15:joint:separation')).toMatchObject({consumed:'510',effectiveOrder:'510'});
  await expect(compile({...input,pvc15_separation_area_m2:3,pvc15_joint_layer_overlap_m2:3.1})).rejects.toThrow();
 });
 test('renting hours/days, included provision and purchase preserve a single shared owner and their actual units',async()=>{
  const common=pvc15FieldTransitionControlInputS2743();
  const rented=await compile({...common,pvc15_machine_provision:PVC15_MACHINE.rent,pvc15_rental_basis:'За сутки',
   pvc15_joint_rental_days:2,pvc15_machine_delivery_mode:'Не требуется по подтверждённой границе'});
  expect(rented.preliminaryNeeds).toEqual([]);expect(row(rented,'pvc15:joint:machine-rental-days')).toMatchObject({quantity:'2',unit_id:'day'});
  expect(row(rented,'pvc15:joint:machine-usage')?.quantity).toBe('9.25');expect(row(rented,'pvc15:equipment:rental-days')).toBeUndefined();
  const hours=await compile({...common,pvc15_machine_provision:PVC15_MACHINE.rent,pvc15_rental_basis:'За машино-час',
   pvc15_joint_rental_hours:12,pvc15_machine_delivery_mode:'Требуется по подтверждённой границе',pvc15_joint_delivery_trips:1});
  expect(hours.preliminaryNeeds).toEqual([]);expect(row(hours,'pvc15:joint:machine-rental-hours')?.quantity).toBe('12');
  expect(row(hours,'pvc15:joint:machine-delivery')?.quantity).toBe('1');
  const provided=await compile({...common,pvc15_machine_provision:PVC15_MACHINE.provided});
  expect(provided.preliminaryNeeds).toEqual([]);expect(row(provided,'pvc15:joint:machine-provided')).toMatchObject({quantity:'9.25',included_in_estimate:false});
  const bought=await compile({...common,pvc15_machine_provision:PVC15_MACHINE.purchase,pvc15_joint_machine_count:1,pvc15_machine_delivery_mode:'Не требуется по подтверждённой границе'});
  expect(bought.preliminaryNeeds).toEqual([]);expect(row(bought,'pvc15:joint:machine-purchase')).toMatchObject({quantity:'1',unit_id:'piece',included_in_procurement:true});
  await expect(compile({...common,pvc15_machine_provision:PVC15_MACHINE.purchase,pvc15_joint_machine_count:1.5})).rejects.toThrow();
 });
 test('an unselected transition sealant leaves the known field requirement without an extra package',async()=>{
  const r=await compile({...pvc15FieldTransitionControlInputS2743(),pvc15_transition_liquid_pvc_selection:'Не выбрано'});
  expect(r.preliminaryNeeds).toEqual([]);expect(row(r,'pvc15:joint:liquid-pvc')).toBeUndefined();
  expect(balance(r,'rc09:liquid_pvc_joint_sealant')).toMatchObject({consumed:'6.4',effectiveOrder:'7'});
 });
 test('main labor, separate preparation, shared apparatus, layer labor and transition labor have their own prices without paying included tools twice',async()=>{
  const savedHash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
  const result=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'PVC15_JOINT_PRICED_CONTROL',
   catalogId:'canonical-work:base:roofing_interior_flat_roof_install_standard',primaryMeasureParameterId:'area_m2',
   parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
   submittedParameters:pvc15FieldTransitionControlInputS2743(),confirmedParameters:{},currencyCode:'KGS',priceItems:[],
   maximumResourceRows:definition.resources.length,hashJson:savedHash,
   rowOverrides:Object.fromEntries([['rc09:pvc_membrane_hot_air_install','10'],['pvc15:labor:preparation','100'],
    ['pvc15:joint:machine-own','20'],['pvc15:labor:separation','75'],['pvc15_transition_transition:labor:worker','100']]
    .map(([id,unitPrice])=>[id,{unitPrice,provenance:{kind:'manual'}}]))});
  expect(result.rows.reduce((total,r)=>total+Number(r.amount??0),0)).toBe(5705);
  expect(row(result,'pvc15:joint:tool-cutting')).toMatchObject({included_in_estimate:false,unit_price:null,amount:null});
  expect(result.preliminaryNeeds).toEqual([]);
  const revision={id:'TEST_ONLY_joint_saved_revision',release_id:'TEST_ONLY_joint_saved_release',definition_version_id:'TEST_ONLY_joint_definition',
   catalog_id:'canonical-work:base:roofing_interior_flat_roof_install_standard',checksum_sha256:savedHash(result.revisionProjection),
   row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,totals:result.totals,
   amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
  const resources=result.rows,before=JSON.stringify({revision,result}),input={revision,rows:result.rows,workTitleRu:'VALIDATION_FIXTURE: поле ПВХ1,5 и армированный переход'};
  const originalAudit=canonicalProfessionalPdfReportOriginalAuditV1({revision,resources});
  expect(originalAudit).toMatchObject({status:'STRUCTURE_INVALID',pdfAllowed:false,definitionAdmissionAllowed:false,completeClaimAllowed:false});
  expect(originalAudit.issues).toEqual(expect.arrayContaining([{code:'RESOURCE_OPERATION_MISSING',rowId:'rc09:pvc_membrane_hot_air_install'},
   {code:'INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'}]));
  expect(()=>buildCanonicalProfessionalPdfProjection(input)).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID'}));
  const review={...input,issuancePurpose:'PRELIMINARY_REVIEW' as const};
  expect(()=>buildCanonicalProfessionalPdfProjection(review)).toThrow(expect.objectContaining({code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'}));
  const ack=canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources,
   request:{revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true},
   actorUserId:'TEST_ONLY-saved-reader',acknowledgedAt:'2026-10-30T00:00:00Z'});
  expect(()=>buildCanonicalProfessionalPdfProjection({...review,reviewAcknowledgmentV1:{...ack,checksumSha256:'0'.repeat(64)}}))
   .toThrow(expect.objectContaining({code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'}));
  const pdf=buildCanonicalProfessionalPdfProjection({...review,reviewAcknowledgmentV1:ack});
  expect(pdf.html).toContain('Предварительная для проверки');expect(pdf.grandTotalStatus).not.toBe('COMPLETE');
  expect(canonicalProfessionalPdfReportOriginalAuditV1({revision,resources})).toEqual(originalAudit);expect(JSON.stringify({revision,result})).toBe(before);
   expect(pdf.html).toContain('кВт·ч');expect(pdf.html).toContain('9,25');expect(pdf.html).not.toContain('Не суммируется');
   expect(Object.values(pdf.categoryTotals).reduce((total,value)=>total+value,0)).toBe(5705);
  expect(pdf.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
 });
 test('unknown compatibility or shared provision retains known consumption and asks for exact evidence, with no procurement from guesses',async()=>{
  const input=pvc15FieldTransitionControlInputS2743();delete input.pvc15_joint_source_confirmed;
  const r=await compile(input);expect(row(r,'rc09:reinforced_pvc_roof_membrane_1_5mm')?.quantity).toBe('535');
  expect(row(r,'pvc15:joint:liquid-pvc')).toBeUndefined();expect(r.preliminaryNeeds.find(x=>x.row_id==='pvc15:joint:liquid-pvc')?.missing_parameter_ids).toContain('pvc15_joint_source_confirmed');
  delete input.pvc15_joint_machine_reference;input.pvc15_machine_provision=PVC15_MACHINE.unknown;
  const unknown=await compile(input);expect(unknown.preliminaryNeeds.some(x=>x.row_id==='pvc15:joint:machine-need')).toBe(true);
 });
});


// Measured control cases use the surviving standard owner. The archived pack
// remains an immutable evidence descriptor and is never a publication target list.
const pvc15MeasuredParent={definition:'3444a36d-584c-5bc3-bdaa-872a3345e6ea',search:'71b2296d-25fc-53fc-9341-85db8bc7c217'};
const pvc15MeasuredStandardCatalog='canonical-work:base:roofing_interior_flat_roof_install_standard';
const pvc15MeasuredCompile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,
 catalogId:pvc15MeasuredStandardCatalog,primaryMeasureParameterId:'area_m2',compilerVersion:'pvc15-standard-measured-control',submittedParameters});
describe('one standard PVC15 owner with independent measured control quantities',()=>{
 test('preserves historical source identities and uses the surviving standard publication configuration',()=>{
  expect(pvc15HistoricalBindings.members.map(m=>m.variant)).toEqual(['small_area','large_area']);
  expect(pvc15HistoricalBindings.newTypeDelta).toBe(0);
  for(const source of pvc15HistoricalBindings.components)expect(pvc15HistoryHash('sha256').update(readPvc15History(source.path)).digest('hex')).toBe(source.sha256);
  const config=pvc15FieldTransitionPublishConfigS2743(pvc15MeasuredParent);
  expect(config.catalogAppend).toBeUndefined();expect(config.catalogId).toBe(pvc15MeasuredStandardCatalog);
  expect(config.parameterDefinitions).toBe(definition.parameters);expect(config.formulaDefinitions).toBe(definition.formulas);expect(config.resourceDefinitions).toBe(definition.resources);
  expect(config.runtimeProfileInput).toEqual({});expect(config.parameterDefinitions.every(p=>p.default_value===null)).toBe(true);
 });
 test.each([75,5000] as const)('%s m² short measured input retains the primary area and project needs',async area=>{
  const result=await pvc15MeasuredCompile({area_m2:area});
  expect(result.rows.map(r=>[r.row_id,r.quantity])).toEqual([['rc09:pvc_membrane_hot_air_install',String(area)]]);
  expect(result.preliminaryNeeds.length).toBeGreaterThan(0);expect(result.rows.some(r=>r.included_in_procurement)).toBe(false);
  await expect(pvc15MeasuredCompile({q:100})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unknown estimate parameters: q'});
 });
 test.each([75,5000] as const)('%s m² honors independent consumption, order and control counts in 26 physical rows',async area=>{
  const measured75=area===75,result=await pvc15MeasuredCompile(pvc15MeasuredControlInputS2743(area));
  const row=(id:string)=>result.rows.find(r=>r.row_id===id)!;
  expect(result.preliminaryNeeds).toEqual([]);expect(result.rows.length).toBe(26);
  expect(row('rc09:reinforced_pvc_roof_membrane_1_5mm').quantity).toBe(measured75?'85':'5160');
  expect((row('rc09:reinforced_pvc_roof_membrane_1_5mm').calculation_trace as {purchaseBalance:{consumed:string;remaining:string}}).purchaseBalance).toMatchObject({consumed:measured75?'80.5':'5150',remaining:measured75?'4.5':'10'});
  expect(row('rc09:pvc_membrane_telescopic_fastener').quantity).toBe(measured75?'400':'10100');
  expect(row('rc09:pvc_membrane_weld_probe_test').quantity).toBe(measured75?'7':'38');
  expect(row('pvc15:separation:mineral').quantity).toBe(measured75?'80':'5110');
  expect(row('pvc15:equipment:own-use').quantity).toBe('9');expect(row('pvc15:labor:preparation').quantity).toBe('2.5');
  expect(result.rows.some(r=>r.included_in_procurement&&r.unit_id==='machine_hour')).toBe(false);
 });
 test.each([75,5000] as const)('%s m² rejects fractional fastener/control counts while retaining fractional material demand',async area=>{
  for(const id of ['telescopic_fastener_quantity_piece','weld_probe_control_count_test'])await expect(pvc15MeasuredCompile({...pvc15MeasuredControlInputS2743(area),[id]:'7.5'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'invalid integer '+id});
  const result=await pvc15MeasuredCompile({...pvc15MeasuredControlInputS2743(area),pvc15_membrane_consumption_m2:area===75?'80.5':'5150.5'});
  expect(result.preliminaryNeeds).toEqual([]);
 });
 test.each(pvc15HistoricalBindings.members)('retired $variant identity cannot be published again',member=>{
  expect(()=>assertPvc15NewCatalog(member.catalogId)).toThrow('CANONICAL_AREA_CATALOG_VARIANT_RETIRED');
 });
});
