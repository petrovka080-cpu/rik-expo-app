import {createHash}from'node:crypto';
import {readFileSync}from'node:fs';
import {floorCementScreed20mmDefinitionR1 as definition,floorCementScreed20mmPackR1 as pack,
 floorCementScreed20mmScenarioFactsR1 as facts,floorCementScreed20mmCompletenessMapR1 as completeness,
 floorCementScreed20mmNeedParameterIdsR1 as needIds}from'./floorCementScreed20mmKrer11Column01R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}from'../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections}from'../backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences}from'../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {estimateDeterministicHash}from'../estimateDeterministicHash';
const d=definition(),area=pack.measurement.parameterId,id=(s:string)=>pack.prefix+':'+s;
const provenance={kind:'manual',reason:'TEST_ONLY explicit edit, no quote or project approval'};
const compile=(submittedParameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({
 operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.proposedIdentity.catalogId,primaryMeasureParameterId:area,
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,
 confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
const row=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>r.rows.find(r=>r.row_id===id(suffix));
it('pins the visually checked official column01,100m2 basis and no publication or current-price claim',()=>{
 expect(createHash('sha256').update(readFileSync(pack.source.path)).digest('hex')).toBe('e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223');
 expect(pack.normId).toBe('11-01-011-01');expect(pack.measurement.denominator).toBe('100');
 expect([pack.catalogId,pack.identityAdmitted,pack.publicationAllowed,pack.fullTechnicalAcceptance,pack.source.historicalPricesUsed]).toEqual([null,false,false,false,false]);
});
it('uses one builder,21 parameters,36 resource/formula rows and no invented defaults',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([21,36,36]);
 expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(d.runtimeInput).toEqual({});
 expect(d.ordinaryParameterIds).toEqual([area]);
 expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id).sort())
  .toEqual(['whole-labor','water-order','ready-mortar-m150-order'].map(id).sort());
});
it.each([
 ['100','39.51','1.27','9.07','3.5','2.04'],
 ['125','49.3875','1.5875','11.3375','4.375','2.55'],
 ['0.5','0.19755','0.00635','0.04535','0.0175','0.0102']
]as const)('calculates independently transcribed quantities for%s m2',async(a,labor,hoist,vibrator,water,mortar)=>{
 const r=await compile(facts(a));
 for(const[suffix,q]of[['whole-labor',labor],['operator-information',hoist],['hoist500kg45m-consumed',hoist],
  ['surface-vibrator-consumed',vibrator],['water-consumed',water],['ready-mortar-m150-consumed',mortar]])expect(row(r,suffix)?.quantity).toBe(q);
 expect(r.preliminaryNeeds).toHaveLength(5);expect(r.rows.every(r=>r.unit_price===null)).toBe(true);
 expect(r.totals.amount).toBe('0');expect(r.rows.filter(r=>r.included_in_procurement)).toHaveLength(2);
});
it('zero area creates no resources, minimum shift, order or needs',async()=>{
 const r=await compile(facts('0'));expect(r.rows).toEqual([]);expect(r.preliminaryNeeds).toEqual([]);expect(r.totals.amount).toBe('0');
});
it.each([area,pack.scopeFact.id])('missing%s never assumes an example,20mm approval or nonaggressive project fact',async key=>{
 const f=facts();delete f[key];const r=await compile(f);expect(row(r,'whole-labor')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(key))).toBe(true);
});
it.each([{[area]:'-1'},{[area]:'NaN'},{[pack.scopeFact.id]:'CN87 50 мм на разделительном слое'},
 {[pack.scopeFact.id]:'Цементная 20 мм с агрессией грунта'},{layer_thickness_mm:'25'},{screed_volume_m3:'2.5'}])
 ('rejects incompatible scope and proxy or extra geometry%j',async change=>{
  await expect(compile({...facts(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
it.each(pack.materials.flatMap(m=>['stock','reserve','quantum','specification'].map(s=>({m,s}))))
 ('keeps known consumption while withholding order with missing$m.id/$s,even at77',async({m,s})=>{
  const f=facts();delete f[m.parameterPrefix+'_'+s];const r=await compile(f,{[id(m.id+'-order')]:{unitPrice:'77',provenance}});
  expect(row(r,m.id+'-consumed')).toBeDefined();expect(row(r,m.id+'-order')).toBeUndefined();expect(r.totals.amount).toBe('0');
 });
it.each(pack.materials)('requires compatibility evidence for positive stock of$id',async m=>{
 const f={...facts(),[m.parameterPrefix+'_stock']:'0.001'},r=await compile(f);
 expect(row(r,m.id+'-consumed')).toBeDefined();expect(row(r,m.id+'-order')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(m.parameterPrefix+'_stock_reference'))).toBe(true);
});
it('uses exact mortar consumption2.55 and independent stock/reserve/quantum balance with one purchase owner',async()=>{
 const key='floor_cement_screed20mm_mortar';const r=await compile({...facts(),[key+'_stock']:'1',[key+'_stock_reference']:'TEST_ONLY compatible stock',
  [key+'_reserve']:'0.2',[key+'_quantum']:'0.5'});
 expect(row(r,'ready-mortar-m150-consumed')?.quantity).toBe('2.55');expect(row(r,'ready-mortar-m150-order')?.quantity).toBe('2');
 expect(row(r,'ready-mortar-m150-remaining')?.quantity).toBe('0.45');expect(row(r,'ready-mortar-m150-free')?.quantity).toBe('0.25');
});
it('pays49.3875 whole labor hours once at77,retains title and honors exclusion',async()=>{
 const override={unitPrice:'77',titleRu:'TEST_ONLY whole labor',provenance};const r=await compile(facts(),{[id('whole-labor')]:override});
 // Independent raw product is3802.8375; the existing money contract rounds KGS to2decimals.
 expect(row(r,'whole-labor')).toMatchObject({quantity:'49.3875',unit_price:'77',amount:'3802.84',title_ru:override.titleRu});
 expect(r.totals.amount).toBe('3802.84');
 expect((await compile(facts(),{[id('whole-labor')]:{...override,includedInEstimate:false,includedInProcurement:false}})).totals.amount).toBe('0');
});
it.each(['operator-information','hoist500kg45m-consumed','surface-vibrator-own','included-preparation','included-placing','included-curing'])
 ('manual77 cannot create separate payment/procurement for%s',async suffix=>{
  const r=await compile(facts(),{[id(suffix)]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(row(r,suffix)).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
 });
it('selects one fulfillment per machine while both remain informational and operator payment is not additive',async()=>{
 const r=await compile({...facts(),[pack.machines[1]!.fulfillmentParameterId]:'Арендованный механизм'});
 const selected=r.rows.filter(r=>[id('hoist500kg45m-own'),id('hoist500kg45m-hired'),id('surface-vibrator-own'),id('surface-vibrator-hired')].includes(r.row_id));
 expect(selected).toHaveLength(2);expect(selected.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
 expect(d.resources.find(r=>r.row_id===id('operator-information'))?.source_metadata?.additionalOperatorPaymentAllowed).toBe(false);
});
it.each(pack.needs)('unresolved$id never becomes a norm from user0/1/77 or a manual price',async n=>{
 const parameter='floor_cement_screed20mm_application_need_'+n.id.replaceAll('-','_');
 for(const value of['0','1','77'])await expect(compile({...facts(),[parameter]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 const r=await compile(facts(),{[id('open-'+n.id)]:{unitPrice:'77',provenance}});
 expect(row(r,'open-'+n.id)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.row_id===id('open-'+n.id)&&v.quantity===null)).toBe(true);
});
it('keeps technical needs internal and public inputs have units/examples and project/supplier questions',()=>{
 for(const q of d.parameters){
  if(needIds.includes(q.parameter_id)){expect(q.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});continue;}
  if(q.truth_metadata.visibility_role==='INTERNAL_ONLY')continue;
  expect(q.title_ru.endsWith('?')).toBe(true);expect((q.truth_metadata.guide as Record<string,unknown>).guide_short_ru).toEqual(expect.any(String));
 }
});
it('links every resource to subworks,shares one labor and one water owner through three stages',()=>{
 for(const r of d.resources)expect(canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1).length).toBeGreaterThan(0);
 expect(canonicalEstimateOperationReferences(d.resources.find(r=>r.row_id===id('whole-labor'))!.resource_graph.operationCompositionV1)).toHaveLength(3);
 expect(canonicalEstimateOperationReferences(d.resources.find(r=>r.row_id===id('water-order'))!.resource_graph.operationCompositionV1)).toHaveLength(3);
 const sections=canonicalEstimateResourceOperationSections(d.resources.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
 expect(sections.length).toBe(3);
});
it('validates the independent36-entry map with the existing publisher contract helper',()=>{
 const map=completeness();expect(map.generatedFromCurrentRows).toBe(false);expect(map.entries).toHaveLength(36);
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
});
