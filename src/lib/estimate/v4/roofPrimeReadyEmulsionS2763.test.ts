import{overlayS2763RoofPrimeReadyEmulsion as overlay}from'../../../../scripts/estimate/r4a13/s2763RoofPrimeReadyEmulsionOverlay';
import type{PurchaseGroupRepresentative}from'../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import{compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition}from'../backendPlatform/canonicalEstimateCompileCore';
import{canonicalApprovedBaselineRuntimeParameters}from'../backendPlatform/canonicalEstimateApprovedBaseline';
import{canonicalPublisherQuantityScopeIsConsistent}from'../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import{estimateDeterministicHash}from'../estimateDeterministicHash';
import{roofPrimeReadyEmulsionPackS2763 as pack}from'./roofPrimeReadyEmulsionS2763';
import{sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1}from'./sourcePinnedRoofNormOwnerR1';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/roof-prime-ready-emulsion-five-parents-s27-63.json')as{sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const prefix=pack.prefix,locators={roof:'CONTROL_ROOF',guidance:'CONTROL_GUIDANCE'},facts={q:'37.5',[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});
// Independently transcribed from KRER12 p.27 column016-02, at37.5m².
// Tonnes convert exactly to kg; no purchase or shift rounding.
const oracle:Record<string,string>={workers:'1.05',flatbed_truck:'0.015',ready_bitumen_emulsion:'16.875'};

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
 expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(3);expect(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
 expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(result.preliminaryNeeds.length).toBe(56);
 const norms=r.resources.filter(row=>pack.rates.some(rate=>prefix+':'+rate.role===row.row_id));expect(norms).toHaveLength(3);
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

test('known and missing area reject manual replacements for all3 norm rows; names and real unit quotes remain editable',async()=>{
 const r=overlay(fixture.reps[0]!,locators).representative;
 for(const rate of pack.rates)for(const input of[facts,{[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu}])
  await expect(compile(r,input,{rowOverrides:{[prefix+':'+rate.role]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 const rowId=prefix+':ready_bitumen_emulsion',result=await compile(r,facts,{rowOverrides:{[rowId]:{titleRu:'Название поставщика',unitPrice:'17.25',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}});expect(result.rows.find(row=>row.row_id===rowId)).toMatchObject({title_ru:'Название поставщика',quantity:'16.875',unit_price:'17.25'});
 const residualId=prefix+':remaining:materials_01';expect(r.resources.some(row=>row.row_id===residualId)).toBe(true);await expect(compile(r,facts,{rowOverrides:{[residualId]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toThrow('source-owned norm quantity cannot be replaced');
});

test('zero measured area never creates a min-one roof kit or shift',async()=>{
 const result=await compile(overlay(fixture.reps[0]!,locators).representative,{...facts,q:'0'});for(const rate of pack.rates)expect(result.rows.find(row=>row.row_id===prefix+':'+rate.role)?.quantity).toBe('0');
});


test('primer binds the actual substrate area, one preparation operation and one kg material without CL51 or duplicate primer labour',()=>{
 for(const parent of fixture.reps){const r=overlay(parent,locators).representative;expect(r.parameters.find(p=>p.parameter_id==='q')?.title_ru).toBe(pack.measurementTitleRu);
 expect(r.parameters.find(p=>p.parameter_id==='q')?.truth_metadata.guide).toMatchObject({guide_short_ru:pack.measurementGuideRu});
 expect(r.resources.filter(row=>row.source_metadata.sourceNormQuantityAccepted===true)).toHaveLength(3);expect(r.resources.filter(row=>row.row_id.startsWith(prefix+':')&&!row.row_id.includes(':remaining:')).every(row=>row.resource_graph.operationCompositionV1.processOrdinal===10)).toBe(true);
 const disposition=r.passport.decision.legacyOwnerDisposition as {disposition:string;oldRowId:string}[];
 expect(disposition.filter(d=>d.disposition==='REPLACED_BY_EXACT_NORM').map(d=>d.oldRowId.slice(String(parent.resources[0]!.row_id).slice(0,-'materials_01'.length).length))).toEqual(['materials_02','preparation_17','labor_18']);
 expect(pack.rates.some(rate=>rate.resourceCode==='01-0305-0005'||rate.resourceCode==='01-1504-0001'||rate.role==='included_machine_operators')).toBe(false);
 }
});

test('historical primer priced per m2 is preserved in legacy and never converted into the new kg emulsion quote',async()=>{
 const parent=fixture.reps[0]!,r=overlay(parent,locators).representative,old=parent.resources.find(row=>row.row_id.endsWith('_materials_02'))!;expect(old.unit_id).toBe('m2');
 const override={rowOverrides:{[old.row_id]:{quantity:'7',unitPrice:'17.25',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}};
 const legacy=await compile(r,{q:'37.5',[pack.systemParameterId]:pack.legacyChoiceRu},override);expect(legacy.rows.find(row=>row.row_id===old.row_id)).toMatchObject({unit_id:'m2',quantity:'7',unit_price:'17.25'});
 const exact=await compile(r,facts,override);expect(exact.rows.some(row=>row.row_id===old.row_id)).toBe(false);expect(exact.rows.find(row=>row.row_id===prefix+':ready_bitumen_emulsion')).toMatchObject({unit_id:'kg',quantity:'16.875',unit_price:null});
});

test.each(['measurementTitleRu','measurementGuideRu','systemChoiceTitleRu','measurementChoiceTitleRu']as const)('empty optional %s cannot erase the user-facing fact caption or guide',key=>{
 const invalid={...pack,[key]:'  '};expect(()=>sourcePinnedRoofNormOwnerR1(invalid as unknown as SourcePinnedRoofNormPackR1)).toThrow('ROOF_PARAMETER_CAPTION_INVALID:'+key);
});
