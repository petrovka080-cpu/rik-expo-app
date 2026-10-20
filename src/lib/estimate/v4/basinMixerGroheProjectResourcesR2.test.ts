import fixture from '../../../../data/estimate-benchmarks/fixtures/basin-mixer-grohe33265002-kit-r1.json';
import {basinMixerGroheProjectResourcesR2,basinMixerGroheProjectPositionsR2 as positions} from './basinMixerGroheProjectResourcesR2';
import {basinMixerGrohe33265002PackR1 as pack} from './basinMixerGrohe33265002KitR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {projectResourceIncludedR1,projectResourceSeparateR1,projectResourceParameterPrefixR1 as parameterPrefix} from './projectSubworkResourceScheduleR1';
const d=basinMixerGroheProjectResourcesR2();
const id=(key:string)=>pack.prefix+':'+key;
const facts=()=>({...fixture.facts,grohe33265002_work_scope:pack.laborValueRu,grohe33265002_work_reference:'TEST_ONLY confirmed complete installation agreement'});
const compile=(facts:Record<string,unknown>,overrides:Record<string,Record<string,unknown>>={})=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId:pack.catalogId,compilerVersion:'grohe-project-resources-r2',primaryMeasureParameterId:pack.primaryParameterId,
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:facts,confirmedParameters:{},
 rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:128,hashJson:async value=>estimateDeterministicHash(value)});
describe('complete mixer subwork resource provision',()=>{
 it('links the real tools, protection, water and applicable services without inventing quantity norms',()=>{
  expect(positions).toHaveLength(10);expect(d.resources.length).toBeLessThan(65);expect(d.parameters.length).toBeLessThan(128);
  for(const position of positions){
   const rows=d.resources.filter(row=>row.row_id.startsWith('subwork-resource:grohe_r2:'+position.key+':'));
   expect(rows.length).toBeGreaterThan(0);expect(rows.every(row=>row.resource_graph.operationCompositionV1!=null)).toBe(true);
   const q=d.parameters.find(p=>p.parameter_id===parameterPrefix('grohe_r2',position.key)+'_quantity')!;
   expect(q.default_value).toBeNull();expect(q.truth_metadata.value_source_role).not.toBe('SOURCE_NORM');
  }
 });
 it('ordinary hand tools have only an included payment path',()=>{
  for(const position of positions.filter(p=>p.includedOnly)){
   const prefix=parameterPrefix('grohe_r2',position.key);
   expect(d.parameters.find(p=>p.parameter_id===prefix+'_payment')?.constraints_json?.values).toEqual([projectResourceIncludedR1]);
   const rows=d.resources.filter(row=>row.row_id.startsWith('subwork-resource:grohe_r2:'+position.key+':'));
   expect(rows).toHaveLength(1);expect(rows[0].resource_graph.costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');
   expect(rows[0].resource_graph.includedInResourceOwnerRowId).toBe(id('complete-installation-work'));
   expect(rows[0].procurement_eligible).toBe(false);
  }
 });
 it('keeps the complete installation and kit as the original two owners; absent project provision creates no phantom purchase',async()=>{
  const result=await compile(facts());
  expect(result.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id)).toEqual([id('kit-order')]);
  expect(result.rows.filter(row=>row.included_in_estimate).map(row=>row.row_id)).toEqual([id('kit-order'),id('complete-installation-work')]);
  expect(result.totals.amount).toBe('0');
 });
 it('included tool quantities do not create an extra payment or order',async()=>{
  const inputs:Record<string,unknown>=facts();
  for(const position of positions.filter(p=>p.includedOnly&&!p.optional)){
   const key=parameterPrefix('grohe_r2',position.key);
   Object.assign(inputs,{[key+'_payment']:projectResourceIncludedR1,[key+'_quantity']:'2',[key+'_specification']:'TEST_ONLY supplied tool',[key+'_reference']:'TEST_ONLY exact included work agreement'});
  }
  const result=await compile(inputs,{[id('kit-order')]:{unitPrice:'11',provenance:{kind:'manual',reason:'TEST_ONLY exact kit price'}},
   [id('complete-installation-work')]:{unitPrice:'77',provenance:{kind:'manual',reason:'TEST_ONLY exact whole installation price'}}});
  expect(result.totals.amount).toBe('264');
  for(const row of result.rows.filter(row=>row.row_id.startsWith('subwork-resource:grohe_r2:'))){
   expect(row.included_in_estimate).toBe(false);expect(row.included_in_procurement).toBe(false);expect(row.amount).toBeNull();
  }
 });
 it('a request for an extra charge for included ordinary tools cannot produce a paid row',async()=>{
  const key=parameterPrefix('grohe_r2','mounting-key');
  await expect(compile({...facts(),[key+'_payment']:projectResourceSeparateR1,[key+'_quantity']:'1',[key+'_specification']:'TEST_ONLY',[key+'_reference']:'TEST_ONLY'}))
   .rejects.toThrow('invalid enum');
 });
 it('hides balance counters and unresolved application requirements in their appropriate detail views',()=>{
  for(const row of d.resources.filter(row=>row.row_id.startsWith(pack.prefix+':kit-')&&!row.row_id.endsWith(':kit-order')))
   expect(row.resource_graph.publicResourcePresentationV1).toMatchObject({rowKind:'CALCULATION_DETAIL'});
  for(const row of d.resources.filter(row=>row.row_id.startsWith(pack.prefix+':open-')))
   expect(row.resource_graph.publicResourcePresentationV1).toMatchObject({rowKind:'PROCESS_NOTE'});
 });
});
