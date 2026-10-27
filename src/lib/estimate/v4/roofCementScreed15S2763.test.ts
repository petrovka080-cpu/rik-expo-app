import{overlayS2763RoofCementScreed15 as overlay}from'../../../../scripts/estimate/r4a13/s2763RoofCementScreed15Overlay';
import type{PurchaseGroupRepresentative}from'../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import{compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition}from'../backendPlatform/canonicalEstimateCompileCore';
import{canonicalApprovedBaselineRuntimeParameters}from'../backendPlatform/canonicalEstimateApprovedBaseline';
import{canonicalPublisherQuantityScopeIsConsistent}from'../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import{estimateDeterministicHash}from'../estimateDeterministicHash';
import{roofCementScreed15PackS2763 as pack}from'./roofCementScreed15S2763';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/roof-cement-screed15-five-parents-s27-63.json')as{sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const prefix=pack.prefix,locators={roof:'CONTROL_ROOF',guidance:'CONTROL_GUIDANCE'},facts={q:'37.5',[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});
// Independently transcribed from KRER12 p.28 column017-01, at37.5m².
// Literal m3/m2/h quantities use no density or thickness conversion; no purchase or shift rounding.
const oracle:Record<string,string>={workers:'10.2075',included_machine_operators:'0.7275',tower_crane_8t:'0.255',forklift_5t:'0.4725',mortar_pump:'0.885',water:'1.44375',roofing_felt:'1.65',ready_cement_mortar_m100:'0.57375'};

test('all five actual parents and295 owners are preserved; neither baseline nor metadata supplies template100 to a new source branch',()=>{
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
 }expect(owners).toBe(295);
});

test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r]as const))('exact source Decimal quantities use one complex labour owner and no second operator payment: %s',async(_id,parent)=>{
 const r=overlay(parent,locators).representative,result=await compile(r,facts);
 for(const[role,q]of Object.entries(oracle))expect(result.rows.find(row=>row.row_id===prefix+':'+role)?.quantity).toBe(q);
 expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(7);expect(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
 expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(result.preliminaryNeeds.length).toBe(59);
 const operators=result.rows.find(row=>row.row_id===prefix+':included_machine_operators')!;expect(operators.included_in_estimate).toBe(false);expect(operators.included_in_procurement).toBe(false);
 const norms=r.resources.filter(row=>pack.rates.some(rate=>prefix+':'+rate.role===row.row_id));expect(norms).toHaveLength(8);
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

test('known and missing area reject manual replacements for all8 norm rows; names and real unit quotes remain editable',async()=>{
 const r=overlay(fixture.reps[0]!,locators).representative;
 for(const rate of pack.rates)for(const input of[facts,{[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu}])
  await expect(compile(r,input,{rowOverrides:{[prefix+':'+rate.role]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 const rowId=prefix+':ready_cement_mortar_m100',result=await compile(r,facts,{rowOverrides:{[rowId]:{titleRu:'Название поставщика',unitPrice:'17.25',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}});expect(result.rows.find(row=>row.row_id===rowId)).toMatchObject({title_ru:'Название поставщика',quantity:'0.57375',unit_price:'17.25'});
 const included=await compile(r,facts,{rowOverrides:{[prefix+':included_machine_operators']:{unitPrice:'99',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}});expect(included.rows.find(row=>row.row_id===prefix+':included_machine_operators')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 const residualId=prefix+':remaining:materials_02';await expect(compile(r,facts,{rowOverrides:{[residualId]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toThrow('source-owned norm quantity cannot be replaced');
});

test('zero measured area never creates a min-one roof kit or shift',async()=>{
 const result=await compile(overlay(fixture.reps[0]!,locators).representative,{...facts,q:'0'});for(const rate of pack.rates)expect(result.rows.find(row=>row.row_id===prefix+':'+rate.role)?.quantity).toBe('0');
});


test('screed uses its own area and fixed15mm source; geometric volume and other roof stages do not replace it',()=>{
 for(const parent of fixture.reps){const r=overlay(parent,locators).representative;expect(r.parameters.find(p=>p.parameter_id==='q')?.title_ru).toBe(pack.measurementTitleRu);expect(r.parameters.find(p=>p.parameter_id==='q')?.truth_metadata.guide).toMatchObject({guide_short_ru:pack.measurementGuideRu});
 const disposition=r.passport.decision.legacyOwnerDisposition as {disposition:string;oldRowId:string;residualRowId:string|null}[];expect(disposition).toHaveLength(59);expect(disposition.every(d=>d.residualRowId!==null&&d.disposition!=='REPLACED_BY_EXACT_NORM')).toBe(true);
 expect(r.resources).toHaveLength(127);expect(r.formulas).toHaveLength(127);expect(r.parameters).toHaveLength(64);expect(r.bindings).toHaveLength(68);expect(pack.rates).toHaveLength(8);expect(pack.rates.filter(rate=>rate.costTreatment==='OWN_COST')).toHaveLength(7);
 expect(pack.rates.find(rate=>rate.role==='ready_cement_mortar_m100')?.per100m2).toBe('1.53');expect(pack.rates.some(rate=>rate.resourceCode==='01-0206-0021'||rate.resourceCode==='03-0502-0020')).toBe(false);expect(pack.measurementGuideRu).toContain('стяж');expect(pack.measurementGuideRu).toContain('толщину второй раз');
 }
});
