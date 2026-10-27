/** Canonical Jest registration of the isolated source oracle; assertions preserved. */

import assert from 'node:assert/strict';
import {buildConcreteMonolithicCycleM212R1, compileConcreteMonolithicCycleM212R1, concreteCycleComponentsM212R1,
 concreteCycleParameterIdM212R1, CONCRETE_CYCLE_M212_R1_PRIMARY as V, CONCRETE_CYCLE_M212_R1_TARGETS as targets} from './concreteMonolithicCycleM212R1';
import {stripFoundationConcretePlacementAcceptanceInputR1} from './stripFoundationConcretePlacementR1';
import {slabFoundationConcretePlacementAcceptanceInputR1} from './slabFoundationConcretePlacementR1';
import {concreteSlabConcretePlacementAcceptanceInputR1} from './concreteSlabConcretePlacementR1';
import {stripFoundationReinforcementAcceptanceInputR1} from './stripFoundationReinforcementR1';
import {slabFoundationReinforcementAcceptanceInputR1} from './slabFoundationReinforcementR1';
import {concreteSlabReinforcementAcceptanceInputR1} from './concreteSlabReinforcementR1';
import {formworkFramiXlifeStripFoundationAcceptanceInputR1,formworkFramiXlifeSlabFoundationAcceptanceInputR1} from './formworkFramiXlifeProjectKitR1';
import {formworkDokaflexConcreteSlabAcceptanceInputR1} from './formworkDokaflexConcreteSlabR1';
import {concreteSlabEmbeddedItemsAcceptanceInputR1} from './concreteSlabEmbeddedItemsR1';
import {compileFormulaGraph,evaluateFormulaGraph} from '../backendPlatform/formulaGraph';

const standard = (kind: string) => targets.find(t=>t.kind===kind&&t.context==='standard')!;
const row = (result: any, suffix: string) => result.rows.find((r:any)=>r.row_id.endsWith(suffix));
const numeric = (result: any, suffix: string) => Number(row(result,suffix)?.quantity);

/** Existing accepted synthetic fixtures exercise components; they are never a
 * site approval, a normative default or a source of new hours/material rates. */
function fixture(kind: 'strip_foundation'|'slab_foundation'|'suspended_slab', volume=10) {
 const placement = kind==='strip_foundation'?stripFoundationConcretePlacementAcceptanceInputR1('standard'):
  kind==='slab_foundation'?slabFoundationConcretePlacementAcceptanceInputR1('standard'):concreteSlabConcretePlacementAcceptanceInputR1('standard');
 const reinforcement = kind==='strip_foundation'?stripFoundationReinforcementAcceptanceInputR1('standard'):
  kind==='slab_foundation'?slabFoundationReinforcementAcceptanceInputR1('standard'):concreteSlabReinforcementAcceptanceInputR1('standard');
 const formwork = kind==='strip_foundation'?formworkFramiXlifeStripFoundationAcceptanceInputR1('standard'):
  kind==='slab_foundation'?formworkFramiXlifeSlabFoundationAcceptanceInputR1('standard'):formworkDokaflexConcreteSlabAcceptanceInputR1('standard');
 const embedded = concreteSlabEmbeddedItemsAcceptanceInputR1('standard');
 const result: Record<string, unknown> = {m212_project_structural_package_ref:'VALIDATION_FIXTURE_ONLY_NOT_PROJECT_APPROVAL',
  m212_project_normative_basis:'VALIDATION_FIXTURE_ONLY_EXPLICIT_NORM_BASIS_NOT_INFERRED'};
 for(const [stage, values] of Object.entries({placement,reinforcement,formwork,embedded})) for(const [id,value] of Object.entries(values))
  result[concreteCycleParameterIdM212R1(stage as any,id)] = value;
 result[V]=volume;
 result.m212_placement_selected_contingency_percent=4;
 return result;
}

for(const kind of ['strip_foundation','slab_foundation','suspended_slab'] as const) {
 test(kind+': full accepted component arrays and independent residual present',()=>{
  const target=standard(kind), model=buildConcreteMonolithicCycleM212R1(target.catalogId), source=concreteCycleComponentsM212R1(target);
  assert.equal(model.resources.length,Object.values(source).reduce((n,c)=>n+c.resources.length,0)+51);
  assert.equal(model.residualNeedIds.length,51);
  assert.equal(model.fullTechnicalAcceptance,false);
  assert.ok(model.parameters.every(p=>p.default_value===null));
  assert.ok(model.resources.every(r=>r.source_metadata?.automaticGenericPriceInheritanceAllowed!==true));
 });
 for(const [volume,expected] of [[0.125,0.13],[10,10.4],[1000,1040]])test(kind+': concrete order independent oracle '+volume,async()=>{
  const result=await compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,fixture(kind,volume));
  assert.equal(numeric(result,'placement:material:concrete:ready-mix'),expected);
  assert.equal(result.preliminaryNeeds.filter((n:any)=>n.row_id.includes(':need:')).length,51);
 });
 test(kind+': geometry does not manufacture steel or panel counts',async()=>{
  const a=await compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,fixture(kind,10));
  const b=await compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,fixture(kind,20));
  assert.equal(numeric(a,'reinforcement:material:reinforcement:steel-approved-schedule'),numeric(b,'reinforcement:material:reinforcement:steel-approved-schedule'));
  const suffix=kind==='suspended_slab'?'formwork:equipment:formwork:dokaflex-floor-props-rental':'formwork:equipment:formwork:frami-xlife-panels-rental';
  assert.equal(numeric(a,suffix),numeric(b,suffix));
  assert.equal(numeric(b,'placement:material:concrete:ready-mix'),20.8);
 });
 test(kind+': zero creates no physical resources, paid work or needs',async()=>{
  for(const value of [0,'0.0']){const result=await compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,{[V]:value});
   assert.equal(result.rows.length,0);assert.equal(result.preliminaryNeeds.length,0);}
 });
 test(kind+': negative net volume is rejected',async()=>{
  await assert.rejects(compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,{[V]:-1}));
 });
 test(kind+': missing project quantities remain explicit and unpaid',async()=>{
  const result=await compileConcreteMonolithicCycleM212R1(standard(kind).catalogId,{[V]:10});
  assert.ok(result.preliminaryNeeds.length>=51);
  assert.equal(result.rows.some((r:any)=>r.row_id.endsWith('steel-approved-schedule')),false);
 });
}

test('all twelve exact existing targets; no repair-profile admission',()=>{
 assert.equal(targets.length,12);
 for(const target of targets)assert.equal(buildConcreteMonolithicCycleM212R1(target.catalogId).target.catalogId,target.catalogId);
 assert.throws(()=>buildConcreteMonolithicCycleM212R1('canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair'),/EXACT_EXISTING_TARGET/);
});
for(const stage of ['placement','reinforcement','formwork','embedded'] as const)test('removing required '+stage+' component is rejected',()=>{
 const target=standard('suspended_slab'), parts=structuredClone(concreteCycleComponentsM212R1(target));
 (parts[stage] as any).resources=parts[stage].resources.slice(1);
 assert.throws(()=>buildConcreteMonolithicCycleM212R1(target.catalogId,parts),/REQUIRED_COMPONENT_MISSING/);
});
test('wrong concrete unit/category and incomplete source rejected',()=>{
 const target=standard('strip_foundation');
 for(const change of [{unit_id:'kg'},{category:'equipment'},{source_metadata:{}}]) {
  const parts=structuredClone(concreteCycleComponentsM212R1(target));
  Object.assign(parts.placement.resources.find(r=>r.row_id==='material:concrete:ready-mix')!,change);
  assert.throws(()=>buildConcreteMonolithicCycleM212R1(target.catalogId,parts),/UNIT_OR_CATEGORY_MISMATCH|SOURCE_MISSING/);
 }
});
test('same component cannot create a second paid/resource owner',()=>{
 const target=standard('strip_foundation'),parts=structuredClone(concreteCycleComponentsM212R1(target));
 (parts.placement.resources as any[]).push(structuredClone(parts.placement.resources[0]));
 assert.throws(()=>buildConcreteMonolithicCycleM212R1(target.catalogId,parts),/DUPLICATE/);
});
test('budget kg/m3 cannot be accepted as a structural schedule',async()=>{
 await assert.rejects(compileConcreteMonolithicCycleM212R1(standard('slab_foundation').catalogId,{[V]:10,reinforcement_kg_per_m3:120}),/BUDGET_REINFORCEMENT_NORM_FORBIDDEN/);
});
test('zero,one,77 do not close an unresolved application norm',async()=>{
 const target=standard('strip_foundation'), model=buildConcreteMonolithicCycleM212R1(target.catalogId);
 for(const value of [0,1,77]) {
  const input=fixture('strip_foundation');
  for(const p of model.parameters.filter(p=>p.parameter_id.startsWith('m212_concrete_application_need_')))input[p.parameter_id]=value;
  await assert.rejects(compileConcreteMonolithicCycleM212R1(target.catalogId,input),/unresolved application norm cannot be supplied/);
 }
});
test('existing formula engine independently handles openings and slab thickness',()=>{
 const formula=compileFormulaGraph('(length_m*width_m-opening_m2)*thickness_m');
 assert.equal(Number(evaluateFormulaGraph(formula.ast,{length_m:10,width_m:8,opening_m2:4,thickness_m:0.2})),15.2);
 assert.equal(Number(evaluateFormulaGraph(formula.ast,{length_m:10,width_m:8,opening_m2:4,thickness_m:0.3})),22.8);
});
test('namespace rewrites nested expression fields in constraints and conditions',()=>{
 const t=standard('strip_foundation'),parts=structuredClone(concreteCycleComponentsM212R1(t)),source=parts.reinforcement.parameters[0]!.parameter_id;
 (parts.reinforcement.parameters[0]as any).constraints_json={...(parts.reinforcement.parameters[0]as any).constraints_json,customNested:{expression:source+'+1',expression_source:source+'*2'}};
 const m=buildConcreteMonolithicCycleM212R1(t.catalogId,parts),p=m.parameters.find(p=>p.parameter_id===concreteCycleParameterIdM212R1('reinforcement',source))!;
 const nested=(p.constraints_json as any).customNested;assert.equal(nested.expression,concreteCycleParameterIdM212R1('reinforcement',source)+'+1');assert.equal(nested.expression_source,concreteCycleParameterIdM212R1('reinforcement',source)+'*2');
});
