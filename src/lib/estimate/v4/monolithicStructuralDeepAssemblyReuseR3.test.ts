import {createRequire} from 'node:module';
import {applyMonolithicExistingDeepAssemblyReuseR3 as apply,compileMonolithicPhysicalR2 as compile,
 monolithicPreparedModelFingerprintR2 as fingerprint,MONOLITHIC_DEEP_REUSE_CONTROL_R3 as control} from './monolithicPhysicalProvisionMasterR2';
import {PHYSICAL_R2_MODE,PHYSICAL_R2_APPROVED,PHYSICAL_R2_LEGACY,physicalR2Id as p,physicalR2Row as row} from './monolithicPhysicalProvisionR2';
import {monolithicRemainingControlR1} from './monolithicRemainingKrer06R1';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const fixture=createRequire(__filename)('../../../../data/estimate-benchmarks/fixtures/monolithic-deep-reuse-structural-parents-r3.json') as
 {captures:{kind:string;model:Rep;approvedConsumerNeedIds:string[]}[]};
const parts=['device','converter','protection','head','hose','cable'] as const;
const publicTitle=(value:unknown):string=>{if(typeof value!=='string')throw new TypeError('Concrete resource title must be a string');return value;};
const source=()=>({[PHYSICAL_R2_MODE]:PHYSICAL_R2_APPROVED,
 [p('deep_state')]:'Принят глубинный узел 45 мм, 220–240 В, шланг 5 м, кабель 15 м',
 [p('deep_ref')]:'TEST_ONLY source readback for integration; not a real project',
 [p('deep_fit')]:'Совместимость подтверждена ППР и схемой питания',
 [p('deep_count')]:2,[p('deep_voltage_v')]:230,[p('deep_frequency_hz')]:50});
const upgrade=(record:typeof fixture.captures[number])=>apply(record.model,{contract:'root-approved-existing-deep-assembly-reuse/r3',
 parentDefinitionId:record.model.definition.id,parentDefinitionSha256:record.model.definition.definition_sha256,
 preparedModelFingerprint:fingerprint(record.model),consumerNeedRowIds:record.approvedConsumerNeedIds});
const view=(r:Awaited<ReturnType<typeof compile>>)=>({rows:r.rows.map(r=>[r.row_id,r.quantity,r.unit_price,r.amount,r.included_in_estimate,r.included_in_procurement]),
 needs:r.preliminaryNeeds.map(n=>[n.row_id,n.quantity,n.need_state,n.missing_parameter_ids]),totals:r.totals});

describe.each(fixture.captures.map(record=>[record.kind,record] as const))('%s uses the retained whole deep device',(_kind,record)=>{
 test('preserves the current baseline and all original payment, source, formula and binding identities',async()=>{
  const original=JSON.stringify(record.model),model=upgrade(record),input=record.model.baseline.input_values;
  expect(JSON.stringify(record.model)).toBe(original);expect(model.bindings).toEqual(record.model.bindings);
  expect(model.resources).toHaveLength(record.model.resources.length+1);
  expect(model.formulas.slice(0,record.model.formulas.length)).toEqual(record.model.formulas);
  for(const old of record.model.resources){const retained=model.resources.find(r=>r.row_id===old.row_id)!;
   for(const key of ['id','row_id','formula_id','unit_id','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'])expect(retained[key]).toEqual(old[key]);}
  expect(view(await compile(model,{}, {},undefined,input))).toEqual(view(await compile(record.model,{}, {},undefined,input)));
 });
 test('closes the selected hardware need with the same six original resources and one cost owner',async()=>{
  const model=upgrade(record),result=await compile(model,{}, {},undefined,{...model.baseline.input_values,...source()});
  expect(result.preliminaryNeeds.some(n=>record.approvedConsumerNeedIds.includes(n.row_id)||n.row_id===control)).toBe(false);
  const operation=record.model.resources.find(r=>r.row_id===record.approvedConsumerNeedIds[0])!.resource_graph.operationCompositionV1.operationId;
  for(const part of parts){const original=record.model.resources.find(r=>r.row_id===row('deep:'+part))!,current=model.resources.find(r=>r.row_id===original.row_id)!;
   expect(result.rows.find(r=>r.row_id===current.row_id)?.quantity).toBe('2');
   expect(result.rows.find(r=>r.row_id===current.row_id)?.included_in_estimate).toBe(false);
   expect(canonicalEstimateOperationReferences(current.resource_graph.operationCompositionV1).some(o=>o.operationId===operation)).toBe(true);}
  if(record.kind==='wall')expect(result.preliminaryNeeds.some(n=>n.row_id.endsWith(':need:leaf-deep-vibrator-head'))).toBe(true);
  expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
 });
 test('does not close hardware through missing counts, inactive method, a manual zero or an excluded head',async()=>{
  const model=upgrade(record),facts:Record<string,unknown>={...model.baseline.input_values,...source()};delete facts[p('deep_count')];
  const missing=await compile(model,{}, {},undefined,facts);expect(missing.preliminaryNeeds.some(n=>n.row_id===control&&n.quantity===null)).toBe(true);
  expect(missing.preliminaryNeeds.some(n=>record.approvedConsumerNeedIds.includes(n.row_id))).toBe(true);
  const inactive=await compile(model,{}, {},undefined,{...facts,[PHYSICAL_R2_MODE]:PHYSICAL_R2_LEGACY});
  expect(inactive.preliminaryNeeds.some(n=>record.approvedConsumerNeedIds.includes(n.row_id))).toBe(true);
  const complete={...model.baseline.input_values,...source()};
  await expect(compile(model,{}, {[row('deep:head')]:{quantity:'0',provenance:{kind:'manual',reason:'TEST_ONLY missing required part'}}},undefined,complete))
   .rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  await expect(compile(model,{}, {},{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[row('deep:head')]},complete))
   .rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 });
 if(record.kind!=='wall')test('reuses the same complete device in the additional compatible source profile without moving its quantity norm',async()=>{
  const key=record.kind==='beam'?'beam-109-02':'column-107-01',model=upgrade(record);
  // Switching an existing source profile starts its own inputs; old project
  // steel/quantities must not be carried into a different norm profile.
  const facts={...monolithicRemainingControlR1(key),...source()};
  const result=await compile(model,{}, {},undefined,facts);
  expect(result.preliminaryNeeds.some(n=>record.approvedConsumerNeedIds.includes(n.row_id)||n.row_id===control)).toBe(false);
  for(const part of parts)expect(result.rows.find(r=>r.row_id===row('deep:'+part))?.quantity).toBe('2');
  expect(result.rows.some(r=>r.row_id.startsWith('monolithic-remaining:krer06:r1:'+key+':'))).toBe(true);
  const sections=canonicalEstimateResourceOperationSections(result.rows.map(r=>({rowId:r.row_id,titleRu:publicTitle(r.title_ru),
   operation:model.resources.find(d=>d.row_id===r.row_id)!.resource_graph.operationCompositionV1})));
  const activeOperation='monolithic-remaining:krer06:r1:'+key+':operation:placement';
  expect(sections.find(s=>s.operation?.operationId===activeOperation)?.sharedResources.map(r=>r.rowId).sort()).toEqual(parts.map(p=>row('deep:'+p)).sort());
  const inactiveOperation=record.model.resources.find(r=>r.row_id===record.approvedConsumerNeedIds[0])!.resource_graph.operationCompositionV1.operationId;
  expect(sections.find(s=>s.operation?.operationId===inactiveOperation)).toBeUndefined();
 });
});

test('does not admit a missing, duplicated or foreign consumer declaration',()=>{
 const record=fixture.captures[0]!,parent=record.model,approval={contract:'root-approved-existing-deep-assembly-reuse/r3' as const,
  parentDefinitionId:parent.definition.id,parentDefinitionSha256:parent.definition.definition_sha256,preparedModelFingerprint:fingerprint(parent)};
 for(const consumerNeedRowIds of [[],['foreign'],[record.approvedConsumerNeedIds[0]!,record.approvedConsumerNeedIds[0]!]])
  expect(()=>apply(parent,{...approval,consumerNeedRowIds})).toThrow(/DEEP_REUSE_(CONSUMER_DECLARATION|EXACT_ORIGINAL_NEED)/);
});
