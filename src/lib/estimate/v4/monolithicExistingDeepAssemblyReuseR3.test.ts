import {createRequire} from 'node:module';
import {applyMonolithicExistingDeepAssemblyReuseR3 as apply,monolithicPreparedModelFingerprintR2 as fingerprint,
 compileMonolithicPhysicalR2 as compile,MONOLITHIC_DEEP_REUSE_NEED_R3 as need,
 MONOLITHIC_DEEP_REUSE_CONTROL_R3 as control,monolithicDeepEffectiveParameterR3 as effective} from './monolithicPhysicalProvisionMasterR2';
import {physicalR2Id as p,physicalR2Row as r,PHYSICAL_R2_MODE,PHYSICAL_R2_APPROVED,PHYSICAL_R2_LEGACY} from './monolithicPhysicalProvisionR2';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalEstimateCompileCoreInput as CoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';

// Exact immutable JSON captures, not TypeScript literal imports or new norms.
const raw=createRequire(__filename)('../../../../data/estimate-benchmarks/fixtures/monolithic-deep-reuse-current-parents-r3.json') as {captures:{model:Rep}[]};
const keys=['device','converter','protection','head','hose','cable'] as const;
const sources=()=>({[PHYSICAL_R2_MODE]:PHYSICAL_R2_APPROVED,
 [p('deep_state')]:'Принят глубинный узел 45 мм, 220–240 В, шланг 5 м, кабель 15 м',
 [p('deep_ref')]:'TEST_ONLY exact device/PPR source readback, not an actual project',
 [p('deep_fit')]:'Совместимость подтверждена ППР и схемой питания',
 [p('deep_count')]:2,[p('deep_voltage_v')]:230,[p('deep_frequency_hz')]:50});
const geometry={m212_foundation_cycle_profile:'Полный цикл фундамента с отдельной бетонной подготовкой по подтверждённому проекту',
 m212_concrete_net_volume_m3:'10',m212_preparation_net_volume_m3:'2'};
function upgrade(parent:Rep){return apply(parent,{contract:'root-approved-existing-deep-assembly-reuse/r3',
 parentDefinitionId:parent.definition.id,parentDefinitionSha256:parent.definition.definition_sha256,preparedModelFingerprint:fingerprint(parent)});}
const run=(model:Rep,source:Record<string,unknown>=sources(),overrides:CoreInput['rowOverrides']={},moreGeometry:Record<string,unknown>={},selection?:CoreInput['compositionSelectionV1'])=>
 compile(model,{...geometry,...moreGeometry},overrides,selection,{...model.baseline.input_values,...source});
const sourceRow=(key:typeof keys[number])=>r('deep:'+key);
const publicTitle=(value:unknown):string=>{if(typeof value!=='string')throw new TypeError('Concrete resource title must be a string');return value;};

describe.each(raw.captures.map(c=>[c.model.definition.catalog_id,c.model] as const))('reuse existing complete deep assembly in %s',(_catalog,parent)=>{
 test('reuses all six existing rows, closes only the selected hardware need and does not add payment',async()=>{
  const before=JSON.stringify(parent),model=upgrade(parent),result=await run(model);
  expect(JSON.stringify(parent)).toBe(before);
  expect(model.resources.length).toBe(parent.resources.length+1);
  expect(model.formulas.slice(0,parent.formulas.length)).toEqual(parent.formulas);
  for(const key of keys){const row=result.rows.find(x=>x.row_id===sourceRow(key));
   expect(row?.quantity).toBe('2');expect(row?.included_in_estimate).toBe(false);expect(row?.included_in_procurement).toBe(false);
   expect(result.parameters[effective(key)]).toBe('2');
   const resource=model.resources.find(x=>x.row_id===sourceRow(key))!;
   expect(resource.resource_graph.operationCompositionV1.additionalOperations.some((o:{operationId:string})=>o.operationId==='master212:concrete-cycle:r1:operation:compacting')).toBe(true);
  }
  expect(result.preliminaryNeeds.some(n=>n.row_id===need||n.row_id===control)).toBe(false);
  const sections=canonicalEstimateResourceOperationSections(result.rows.map(row=>({rowId:row.row_id,titleRu:publicTitle(row.title_ru),
   operation:model.resources.find(r=>r.row_id===row.row_id)!.resource_graph.operationCompositionV1})));
  expect(sections.find(s=>s.operation?.operationId==='master212:concrete-cycle:r1:operation:compacting')?.sharedResources.map(r=>r.rowId).sort())
   .toEqual(keys.map(sourceRow).sort());
  expect(result.rows.some(row=>row.row_id===need||row.row_id===control)).toBe(false);
  expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
  for(const old of parent.resources){const row=model.resources.find(x=>x.row_id===old.row_id)!;
   for(const property of ['formula_id','unit_id','cost_owner_id','procurement_eligible','source_metadata'])expect(row[property]).toEqual(old[property]);}
 });
 test('preserves the previous calculation exactly when existing physical profile stays selected',async()=>{
  const source={[PHYSICAL_R2_MODE]:PHYSICAL_R2_LEGACY};
  const a=await run(parent,source),b=await run(upgrade(parent),source);
  const view=(result:Awaited<ReturnType<typeof run>>)=>({rows:result.rows.map(row=>[row.row_id,row.quantity,row.unit_price,row.amount,row.included_in_estimate,row.included_in_procurement]),
   needs:result.preliminaryNeeds.map(n=>[n.row_id,n.quantity,n.need_state,n.missing_parameter_ids]),totals:result.totals});
  expect(view(b)).toEqual(view(a));
 });
 test('changes concrete geometry without inventing a new number of deployed devices',async()=>{
  const model=upgrade(parent),a=await run(model),b=await run(model,sources(),{},{m212_concrete_net_volume_m3:'30'});
  for(const key of keys)expect(b.rows.find(row=>row.row_id===sourceRow(key))?.quantity).toBe(a.rows.find(row=>row.row_id===sourceRow(key))?.quantity);
 });
 test.each(['deep_ref','deep_fit','deep_count','deep_voltage_v','deep_frequency_hz'])('retains an explicit need without source fact %s',async key=>{
  const source:Record<string,unknown>=sources();delete source[p(key)];const result=await run(upgrade(parent),source);
  expect(result.preliminaryNeeds.some(n=>n.row_id===control&&n.quantity===null)).toBe(true);
 });
 test.each(keys)('rejects manual zero on a required existing %s part',async key=>{
  await expect(run(upgrade(parent),sources(),{[sourceRow(key)]:{quantity:'0',provenance:{kind:'manual',reason:'TEST_ONLY explicit consumer quantity'}}}))
   .rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 });
 test('does not accept an excluded physical head or a manually excluded safety control',async()=>{
  const model=upgrade(parent);
  await expect(run(model,sources(),{}, {},{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[sourceRow('head')]}))
   .rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  await expect(run(model,sources(),{
   [sourceRow('head')]:{quantity:'0',provenance:{kind:'manual',reason:'TEST_ONLY missing physical part'}},
   [control]:{quantity:'0',includedInEstimate:false,provenance:{kind:'manual',reason:'TEST_ONLY try bypass source check'}}}))
   .rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 });
 test('ignores forged incoming effective counts and rejects a submitted technical programme',async()=>{
  const model=upgrade(parent),result=await run(model,{...sources(),[effective('head')]:999});
  expect(result.parameters[effective('head')]).toBe('2');
  await expect(run(model,sources(),{},{[p('deep_count')]:2})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('retains the existing mandatory source-check exclusion guard',async()=>{
  await expect(run(upgrade(parent),sources(),{[sourceRow('head')]:{quantity:'0',provenance:{kind:'manual',reason:'TEST_ONLY missing part'}}},{},
   {contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[control]}))
   .rejects.toMatchObject({code:'COMPOSITION_SELECTION_INVALID'});
 });
});

test('requires root approval of the exact current declarations before linking the existing source',()=>{
 const parent=raw.captures[0]!.model;
 expect(()=>apply(parent,{contract:'root-approved-existing-deep-assembly-reuse/r3',parentDefinitionId:parent.definition.id,
  parentDefinitionSha256:parent.definition.definition_sha256,preparedModelFingerprint:'stale'})).toThrow('DEEP_REUSE_APPROVED_CURRENT_PARENT');
});
