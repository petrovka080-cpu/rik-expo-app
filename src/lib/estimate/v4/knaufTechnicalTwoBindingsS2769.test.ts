import fixture from '../../../../data/estimate-benchmarks/fixtures/knauf-technical-two-parents-s27-69.json';
import {createHash} from 'node:crypto';
import binding from '../../../../data/estimate-benchmarks/source-packs/knauf-technical-two-bindings-s27-69.json';
import pack from '../../../../data/estimate-benchmarks/source-packs/knauf-interior-plaster-materials-six-s27-63.json';
import {overlayS2763KnaufInteriorPlasterMaterials as overlay,bindKnaufTechnicalPlanningDefaultsS2769} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterMaterialsOverlay';
import {overlayS2763KnaufInteriorPlasterBaseLabour as labourOverlay} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterBaseLabourOverlay';
import {overlayS2763KnaufInteriorPlasterConditionalComposition as scopeOverlay} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterConditionalCompositionOverlay';
import {knaufInteriorPlasterBaseLabourPackS2763 as labourPack,knaufPlasterNormConditionsYesS2763 as conditions} from './knaufInteriorPlasterBaseLabourS2763';
import {knaufInteriorPlasterConditionalCompositionPackS2763 as scopePack} from './knaufInteriorPlasterConditionalCompositionS2763';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const compile=(r:PurchaseGroupRepresentative,parameters:Record<string,unknown>)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:r.definition.catalog_id,compilerVersion:binding.contract,parameterDefinitions:r.parameters,formulaDefinitions:r.formulas,resourceDefinitions:r.resources,submittedParameters:parameters,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:150,hashJson:async v=>estimateDeterministicHash(v)});
const build=(i=0)=>{
 const materials=overlay(fixture.reps[i] as unknown as PurchaseGroupRepresentative,{rotband:'ACCEPTED_ROTBAND_SOURCE',betogrund:'ACCEPTED_BETOGRUND_SOURCE',mp75:'ACCEPTED_MP75_SOURCE'}).representative;
 const labour=labourOverlay(materials,{wall:'ACCEPTED_WALL_SOURCE',ceiling:'ACCEPTED_CEILING_SOURCE',guidance:'ACCEPTED_KRER_GUIDANCE'}).representative;
 const r=scopeOverlay(labour,Object.fromEntries(scopePack.facts.map(f=>[f.key,'ACCEPTED_SCOPE_'+f.key]))).representative;
 bindKnaufTechnicalPlanningDefaultsS2769(r,{definitionId:'test-new-definition-'+i,baselineId:'test-new-baseline-'+i,releaseId:'test-new-release',evidenceSha256:createHash('sha256').update('generated-test-baseline-'+i).digest('hex')});
 return r;
};
const role=(result:Awaited<ReturnType<typeof compile>>,id:string)=>result.rows.find(r=>r.row_id==='plaster:knauf-materials:'+id);

test.each(binding.targets.map((t,i)=>[t.catalogId,i]))('ready material owner uses this technical section q and preserves every historical owner: %s',async(_id,i)=>{
 const parent=fixture.reps[i],snapshot=JSON.stringify(parent),r=build(i),result=await compile(r,{q:'20',betogrund_primer_state:pack.primerCompleteRu});
 expect(JSON.stringify(parent)).toBe(snapshot);expect(r.resources.slice(0,59).map(x=>[x.id,x.row_id,x.cost_owner_id,x.formula_id,x.unit_id])).toEqual(parent.resources.map(x=>[x.id,x.row_id,x.cost_owner_id,x.formula_id,x.unit_id]));
 expect(r.formulas.slice(0,59)).toEqual(parent.formulas);expect(r.parameters.find(p=>p.parameter_id==='q')?.default_value).toBeNull();
 expect(role(result,'rotband-consumed')?.quantity).toBe('170');expect(role(result,'rotband-30kg-order')?.quantity).toBe('180');expect(role(result,'rotband-30kg-bags')?.quantity).toBe('6');
 expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);expect(r.passport.decision.legacyQuantityNormsUnaccepted).toBe(true);
 const controls=r.parameters.filter(p=>Object.hasOwn(binding.planningDefaults,p.parameter_id));expect(controls).toHaveLength(Object.keys(binding.planningDefaults).length);
 expect(controls.every(p=>p.truth_metadata.provenance.initial_planning_default_v1.objectAbsenceAsserted===false)).toBe(true);
});

test('a separate real primer area is required; stock and reserve edits change purchase once without changing consumed norm',async()=>{
 const r=build(),missing=await compile(r,{q:'20',betogrund_primer_state:pack.primerNeededRu});
 expect(missing.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('betogrund_actual_area_m2'))).toBe(true);
 const result=await compile(r,{q:'20',betogrund_primer_state:pack.primerNeededRu,betogrund_actual_area_m2:'8',rotband_usable_stock_kg:'50',rotband_retained_reserve_kg:'0'});
 expect(role(result,'rotband-consumed')?.quantity).toBe('170');expect(role(result,'rotband-30kg-order')?.quantity).toBe('120');expect(role(result,'betogrund-consumed')?.quantity).toBe('2');
 expect(role(result,'betogrund-15kg-order')?.quantity).toBe('15');expect(role(result,'betogrund-5kg-order')).toBeUndefined();
});

test('unknown preparation and excluded/unsupported scenario cannot supply a primer norm or close the full technology',async()=>{
 const r=build(),unknown=await compile(r,{q:'20',betogrund_primer_state:pack.primerUnknownRu});
 expect(role(unknown,'betogrund-consumed')).toBeUndefined();expect(unknown.preliminaryNeeds.length).toBeGreaterThan(0);
 const legacy=await compile(r,{q:'20',interior_plaster_material_system:pack.legacyChoiceRu});expect(role(legacy,'rotband-consumed')).toBeUndefined();
 const a=await compile(r,{q:'10',betogrund_primer_state:pack.primerCompleteRu}),b=await compile(build(1),{q:'40',betogrund_primer_state:pack.primerCompleteRu});
 expect(role(a,'rotband-consumed')?.quantity).toBe('85');expect(role(b,'rotband-consumed')?.quantity).toBe('340');
});

test('arbitrary type, changed parent or missing historical owner fails before reuse',()=>{
 for(const change of ['id','hash','owner']){const parent=structuredClone(fixture.reps[0]) as unknown as PurchaseGroupRepresentative;
  if(change==='id')parent.definition.catalog_id='canonical-work:base:plaster_paint_interior_wall_plaster_apply_wet_zone';
  if(change==='hash')parent.definition.definition_sha256='b'.repeat(64);if(change==='owner')parent.resources[0].cost_owner_id='other-owner';
  expect(()=>overlay(parent,{rotband:'R',betogrund:'B',mp75:'M'})).toThrow();}
});

test.each([[0,'10.378','0.008','0.032','0.334'],[1,'12.62','0.01','0.036','0.39']])('base labour and operated machines reuse their own pinned norm and q: %s',async(i,workers,loader,lift,mixer)=>{
 const r=build(Number(i)),result=await compile(r,{q:'20',betogrund_primer_state:pack.primerCompleteRu,krer15_manual_conditions:conditions});
 const row=(id:string)=>result.rows.find(x=>x.row_id==='plaster:krer15-manual-base:'+id);
 expect([row('workers')?.quantity,row('loader')?.quantity,row('lift')?.quantity,row('mixer')?.quantity]).toEqual([workers,loader,lift,mixer]);
 expect(row('operators')?.included_in_estimate).toBe(false);expect(row('operators')?.unit_price).toBeNull();
 expect(r.parameters.some(p=>['krer15_manual_norm_basis','krer15_manual_area_scope'].includes(p.parameter_id))).toBe(false);
 expect(r.resources).toHaveLength(113);expect(r.passport.decision.labourHourNormClosureCount).toBe(1);expect(r.passport.decision.machineHourNormClosureCount).toBe(3);
 expect(r.resources.find(x=>x.row_id==='plaster:krer15-manual-base:workers')?.source_metadata.normativeTrace[0].sourceSnapshotHash).toBe(labourPack.sources[Number(i)].sha256);
});

test('unmeasured area and unverified or different site conditions remain facts; no application norm is asked from the user',async()=>{
 const r=build(),missing=await compile(r,{}),different=await compile(r,{q:'20',betogrund_primer_state:pack.primerCompleteRu,krer15_manual_conditions:'Есть отличия от условий ниже'});
 expect(missing.rows.filter(x=>x.row_id==='plaster:krer15-manual-base:workers')).toHaveLength(0);
 expect(different.rows.filter(x=>x.row_id==='plaster:krer15-manual-base:workers')).toHaveLength(0);
 expect(role(different,'rotband-consumed')?.quantity).toBe('170');expect(different.preliminaryNeeds.length).toBeGreaterThan(0);
 expect(r.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').every(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'&&p.default_value===null)).toBe(true);
});

test('a changed baseline binding is rejected, while explicit procurement edits override the accepted planning setting',async()=>{
 const r=build(),p=r.parameters.find(x=>x.parameter_id==='rotband_bag_multiple')!;
 p.truth_metadata.provenance.approvedTemplateBinding.value=99;
 await expect(compile(r,{q:'20',betogrund_primer_state:pack.primerCompleteRu})).rejects.toThrow('invalid approved template baseline binding');
 const edited=await compile(build(),{q:'20',betogrund_primer_state:pack.primerCompleteRu,rotband_bag_multiple:4});
 expect(role(edited,'rotband-30kg-order')?.quantity).toBe('240');expect(role(edited,'rotband-consumed')?.quantity).toBe('170');
});
