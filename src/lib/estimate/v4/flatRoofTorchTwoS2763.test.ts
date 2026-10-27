import{overlayS2763FlatRoofTorchTwo as overlay}from'../../../../scripts/estimate/r4a13/s2763FlatRoofTorchTwoOverlay';
import type{PurchaseGroupRepresentative}from'../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import{compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition}from'../backendPlatform/canonicalEstimateCompileCore';
import{canonicalApprovedBaselineRuntimeParameters}from'../backendPlatform/canonicalEstimateApprovedBaseline';
import{canonicalPublisherQuantityScopeIsConsistent}from'../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import{estimateDeterministicHash}from'../estimateDeterministicHash';
import{flatRoofTorchTwoPackS2763 as pack}from'./flatRoofTorchTwoS2763';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/flat-roof-torch-two-parents-s27-63.json')as{sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const prefix=pack.prefix,locators={roof:'CONTROL_ROOF',guidance:'CONTROL_GUIDANCE'},facts={q:'37.5',[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});
// Primary table12-01-002-09, PDF10–11, at37.5m²; no roll or rental-shift rounding.
const oracle:Record<string,string>={workers:'5.385',included_machine_operators:'0.075',tower_crane_8t:'0.05625',truck_crane_10t:'0.01875',gas_flame_burner:'1.725',flatbed_truck_to_5t:'0.03375',propane_butane:'2.5875',upper_isoplast_ekp_4_5:'42.75',lower_isoplast_epp_4:'43.5'};

test('both actual parents and118 owners are preserved; neither baseline nor metadata supplies template100 to a new source branch',()=>{
 expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);let owners=0;
 for(const parent of fixture.reps){const before=JSON.stringify(parent),r=overlay(parent,locators).representative;expect(JSON.stringify(parent)).toBe(before);
  expect(r.formulas.slice(0,59)).toEqual(parent.formulas);expect(r.resources.slice(0,59).map(row=>[row.id,row.row_id,row.cost_owner_id,row.unit_id,row.formula_id])).toEqual(parent.resources.map(row=>[row.id,row.row_id,row.cost_owner_id,row.unit_id,row.formula_id]));owners+=59;
  const q=r.parameters.find(p=>p.parameter_id==='q')!;expect(q.default_value).toBeNull();expect(q.truth_metadata.value_source_role).toBe('USER_MEASURED');expect(q.truth_metadata.provenance).not.toHaveProperty('approvedTemplateBinding');
  expect(r.baseline.input_values).not.toHaveProperty('q');expect(r.baseline.input_values).toEqual({[pack.systemParameterId]:pack.unknownChoiceRu});expect(r.baseline.input_classification).toEqual({[pack.systemParameterId]:'VALIDATION_FIXTURE'});expect(canonicalApprovedBaselineRuntimeParameters(r.baseline)).toEqual({});
  expect(r.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)).toEqual(['q',pack.systemParameterId,pack.conditionsParameterId,pack.areaParameterId]);
  expect(r.parameters.filter(p=>p.parameter_id.startsWith('roof_open_')).every(p=>p.default_value===null&&p.truth_metadata.visibility_role==='INTERNAL_ONLY'&&p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
  expect(r.passport.capability_matrix).toHaveLength(4);expect(r.passport.decision.quantityScope).toBe('PARTIAL');expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);
  expect(r.definition.passport.legacyAlternativePassport).toEqual(parent.definition.passport);expect(r.definition.applicability.legacyAlternativeApplicability).toEqual(parent.definition.applicability);
  for(const d of r.passport.decision.legacyOwnerDisposition){if(d.residualRowId){const original=parent.resources.find(row=>row.row_id===d.oldRowId)!;expect(r.resources.find(row=>row.row_id===d.residualRowId)?.row_type).toBe(original.row_type);}}
 }expect(owners).toBe(118);
});

test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r]as const))('exact source Decimal quantities use one complex labour owner and no second operator payment: %s',async(_id,parent)=>{
 const r=overlay(parent,locators).representative,result=await compile(r,facts);
 for(const[role,q]of Object.entries(oracle))expect(result.rows.find(row=>row.row_id===prefix+':'+role)?.quantity).toBe(q);
 expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(8);expect(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
 expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(result.preliminaryNeeds.length).toBe(59);
 const operators=result.rows.find(row=>row.row_id===prefix+':included_machine_operators')!;expect(operators.included_in_estimate).toBe(false);expect(operators.included_in_procurement).toBe(false);
 const norms=r.resources.filter(row=>pack.rates.some(rate=>prefix+':'+rate.role===row.row_id));expect(norms).toHaveLength(9);
 for(const norm of norms)expect(norm.resource_graph.derivedQuantityEditPolicyV1).toMatchObject({mode:'PARAMETERS_ONLY',unitId:norm.unit_id,parameterIds:['q']});
});

test.each([pack.conditionsParameterId,pack.areaParameterId])('unconfirmed or missing %s cannot revive legacy quantities',async key=>{
 const parent=fixture.reps[0]!,r=overlay(parent,locators).representative;
 for(const value of [undefined,key===pack.conditionsParameterId?'Условия ещё не проверены':'Площадь ещё нужно проверить']){const input:Record<string,unknown>={...facts,[key]:value};if(value===undefined)delete input[key];const result=await compile(r,input);
  expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(result.rows.some(row=>pack.rates.some(rate=>prefix+':'+rate.role===row.row_id))).toBe(false);
 }
});

test('explicit unknown is an unresolved scope; historical quotes stay in explicit legacy only',async()=>{
 const parent=fixture.reps[0]!,r=overlay(parent,locators).representative,old=parent.resources[0]!,override={rowOverrides:{[old.row_id]:{titleRu:'Историческое название',unitPrice:'17.25',quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}};
 const unknown=await compile(r,{q:'37.5',[pack.systemParameterId]:pack.unknownChoiceRu},override);expect(unknown.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(unknown.preliminaryNeeds.some(n=>n.row_id===prefix+':remaining:scope_pending')).toBe(true);
 const legacy=await compile(r,{q:'37.5',[pack.systemParameterId]:pack.legacyChoiceRu},override);expect(legacy.rows.find(row=>row.row_id===old.row_id)).toMatchObject({title_ru:'Историческое название',quantity:'7',unit_price:'17.25'});
 const exact=await compile(r,facts,override);expect(exact.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
});

test('known and missing area reject manual replacements for all9 norm rows; names and real unit quotes remain editable',async()=>{
 const r=overlay(fixture.reps[0]!,locators).representative;
 for(const rate of pack.rates)for(const input of[facts,{[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu}])
  await expect(compile(r,input,{rowOverrides:{[prefix+':'+rate.role]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 const rowId=prefix+':upper_isoplast_ekp_4_5',result=await compile(r,facts,{rowOverrides:{[rowId]:{titleRu:'Название поставщика',unitPrice:'17.25',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}});expect(result.rows.find(row=>row.row_id===rowId)).toMatchObject({title_ru:'Название поставщика',quantity:'42.75',unit_price:'17.25'});
 const included=await compile(r,facts,{rowOverrides:{[prefix+':included_machine_operators']:{unitPrice:'99',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}});expect(included.rows.find(row=>row.row_id===prefix+':included_machine_operators')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 const residualId=prefix+':remaining:components_08';await expect(compile(r,facts,{rowOverrides:{[residualId]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toThrow('source-owned norm quantity cannot be replaced');
});

test('zero measured area never creates a min-one roof kit or shift',async()=>{
 const result=await compile(overlay(fixture.reps[0]!,locators).representative,{...facts,q:'0'});for(const rate of pack.rates)expect(result.rows.find(row=>row.row_id===prefix+':'+rate.role)?.quantity).toBe('0');
});



test('the exact branch covers two field layers once and retains separate primer, joints and project scope',async()=>{
 expect(pack.targets.map(t=>t.catalogId)).toEqual([
  'canonical-work:base:roofing_interior_flat_roof_install_technical_room',
  'canonical-work:base:roofing_interior_flat_roof_install_wet_zone']);
 for(const parent of fixture.reps){const r=overlay(parent,locators).representative,result=await compile(r,facts);
  expect(r.resources).toHaveLength(128);expect(r.formulas).toHaveLength(128);expect(r.parameters).toHaveLength(64);expect(r.bindings).toHaveLength(69);
  const dispositions=r.passport.decision.legacyOwnerDisposition as {disposition:string;oldRowId:string;residualRowId:string|null}[];
  expect(dispositions).toHaveLength(59);expect(dispositions.filter(d=>d.residualRowId===null).map(d=>d.oldRowId.split('_').slice(-2).join('_')).sort()).toEqual(['labor_19','labor_21','materials_01','materials_02']);
  expect(result.rows.filter(row=>row.included_in_estimate&&row.category==='labor')).toHaveLength(1);
  expect(result.rows.filter(row=>row.included_in_estimate&&row.unit_id==='m2').map(row=>row.quantity).sort()).toEqual(['42.75','43.5']);
  for(const need of pack.protectedAdditionalNeeds){expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':source-gap:'+need.key)).toBe(true);expect(r.parameters.find(p=>p.parameter_id==='roof_source_gap_'+need.key)?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');}
  expect(result.rows.every(row=>!row.included_in_procurement)).toBe(true);
 }
 expect(pack.rates.some(r=>['01-0202-0003','12-0340','03-0020'].includes(r.resourceCode??''))).toBe(false);
 expect(pack.rates.find(r=>r.role==='included_machine_operators')?.per100m2).toBe('0.20');
 expect(pack.rates.find(r=>r.role==='gas_flame_burner')?.per100m2).toBe('4.60');
});

test('unrelated PVC and high-load parents cannot acquire the torch-applied branch',()=>{
 const parent=fixture.reps[0]!;
 for(const suffix of ['standard','small_area','large_area','high_load'])expect(()=>overlay({...parent,definition:{...parent.definition,catalog_id:'canonical-work:base:roofing_interior_flat_roof_install_'+suffix}},locators)).toThrow('ROOF_NORM_EXACT_PARENT_DRIFT');
});
