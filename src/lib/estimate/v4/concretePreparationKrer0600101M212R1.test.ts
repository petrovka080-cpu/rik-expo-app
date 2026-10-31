/** Canonical Jest registration of the isolated source oracle; assertions preserved. */
import assert from 'node:assert/strict';
import {createHash}from'node:crypto';import{readFileSync}from'node:fs';
import {buildConcretePreparationKrer0600101M212R1 as build,compileConcretePreparationKrer0600101M212R1 as compile,
 CONCRETE_PREPARATION_M212_R1_SOURCE as p,assertPreparationPrimaryRosterM212R1 as roster} from './concretePreparationKrer0600101M212R1';
const facts=(v:unknown)=>({[p.measure.parameterId]:v,[p.method.id]:p.method.value,[p.fit.id]:p.fit.value});
test('primary official KG bytes, whole column01 and exact8 rows pinned',()=>{
 assert.equal(createHash('sha256').update(readFileSync(p.source.path)).digest('hex'),p.source.sha256);
 assert.equal(p.normId,'06-01-001-01');assert.equal(p.measure.denominator,'100');roster();
 assert.equal(build().parameters.every(p=>p.default_value===null),true);
});
const cases=[
 ['0.125',['0.2037875','0.012975','0.012975','0.0100375','0.0004375','0.0021875','0.3125','0.1275']],
 ['12.5',['20.37875','1.2975','1.2975','1.00375','0.04375','0.21875','31.25','12.75']],
 ['100',['163.03','10.38','10.38','8.03','0.35','1.75','250','102']],
]as const;
for(const[v,expected]of cases)test('independent entire column numerical oracle '+v,async()=>{
 const r=await compile(facts(v));assert.equal(r.rows.length,8);assert.equal(r.preliminaryNeeds.length,30);
 for(const[key,i]of ['workers','machinists','tower-crane','deep-vibrator','flatbed-truck','water','matting','concrete'].map((key,i)=>[key,i]as const))
  assert.equal(r.rows.find(r=>r.row_id===p.prefix+':'+key)?.quantity,expected[i]);
 assert.equal(r.rows.filter(r=>r.included_in_procurement).length,6);
 assert.equal(r.rows.find(r=>r.row_id===p.prefix+':machinists')?.included_in_estimate,false);
 assert.ok(r.rows.every(r=>r.unit_price===null));
});
test('zero makes no resources, implicit minimum or needs',async()=>{const r=await compile(facts(0));assert.deepEqual(r.rows,[]);assert.deepEqual(r.preliminaryNeeds,[]);});
for(const change of [{[p.measure.parameterId]:-1},{[p.method.id]:'06-01-001-09'},{[p.fit.id]:'Гусеничный кран вместо башенного'},{reinforcement_kg_per_m3:120}])
 test('negative/incompatible scope rejected '+JSON.stringify(change),async()=>{await assert.rejects(compile({...facts(100),...change}));});
for(const missing of [p.method.id,p.fit.id])test('missing '+missing+' does not apply source',async()=>{
 const input:Record<string,unknown>=facts(100);delete input[missing];const r=await compile(input);assert.equal(r.rows.length,0);assert.ok(r.preliminaryNeeds.length>=30);
});
test('whole roster, units and tower crane enforced independently',()=>{
 assert.throws(()=>roster(p.resources.slice(1)),/WHOLE_PRIMARY_ROSTER/);
 const wrong=structuredClone(p.resources);wrong.find(r=>r.key==='concrete')!.unitId='kg';assert.throws(()=>roster(wrong),/PRIMARY_ROW_MISMATCH/);
 const crane=structuredClone(p.resources);crane.find(r=>r.key==='tower-crane')!.resourceCode='02-0075';assert.throws(()=>roster(crane),/TOWER_CRANE/);
});
test('an internal missing norm cannot be closed with arbitrary scalar77',async()=>{
 const input:Record<string,unknown>=facts(100);for(const n of p.needs)input[n.parameterId]=77;
 await assert.rejects(compile(input),/unresolved application norm cannot be supplied/);
});
