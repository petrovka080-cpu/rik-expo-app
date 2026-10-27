import {buildCt126SixDryWallSuccessorS2769,compileCt126SixDryWallS2769,ct126SixDryWallBindingS2769 as binding} from './ct126SixDryWallReuseS2769';
import {ct126ExplicitControlS2754} from '../../../../scripts/estimate/r4a13/prepareS2754Ct126DryWall';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../../data/estimate-benchmarks/fixtures/ct126-six-wall-v3-parents-s27-69.json') as {reps:PurchaseGroupRepresentative[]};
const profile=require('../../../../data/estimate-benchmarks/fixtures/ct126-ready-wall-v2-s27-69.json') as {representative:PurchaseGroupRepresentative};
const reps=parents.reps;
const control=(bag=1)=>Object.fromEntries(Object.entries(ct126ExplicitControlS2754(bag)).map(([key,value])=>[key==='putty_area_m2'?'q':'ct126_wall_'+key,value]));
const value=(r:Awaited<ReturnType<typeof compileCt126SixDryWallS2769>>,key:string)=>r.rows.find(row=>row.row_id==='putty:ct126-dry-wall:'+key)?.quantity;

test.each(reps.map((p,i)=>[String(p.definition.catalog_id),i] as const))('reuses the complete accepted CT126 calculation while preserving legacy owners: %s',async(_id,index)=>{
 const parent=reps[index]!,before=JSON.stringify(parent),next=buildCt126SixDryWallSuccessorS2769(parent);
 const result=await compileCt126SixDryWallS2769(parent,{...control(),wall_leveling_technology_choice:binding.exactChoiceRu});
 expect(JSON.stringify(parent)).toBe(before);expect(next.parameters).toHaveLength(33);expect(next.resources).toHaveLength(89);expect(next.formulas).toHaveLength(89);
 for(const row of parent.resources) {
  const replacement=next.resources.find(r=>r.row_id===row.row_id)!;
  expect(replacement.cost_owner_id).toBe(row.cost_owner_id);expect(replacement.semantic_owner).toBe(row.semantic_owner);
  expect(replacement.resource_graph).toEqual(row.resource_graph);expect(replacement.source_metadata).toEqual(row.source_metadata);
 }
 for(const formula of parent.formulas)expect(next.formulas.find(f=>f.formula_id===formula.formula_id)).toEqual(formula);
 expect(result.rows).toHaveLength(10);expect(result.preliminaryNeeds).toHaveLength(11);
 expect(result.rows.filter(r=>r.included_in_procurement)).toHaveLength(2);
 expect(value(result,'net-mixture')).toBe('213');expect(value(result,'20kg-minimum-batches')).toBe('11');
 expect(value(result,'20kg-prepared-mixture')).toBe('220');expect(value(result,'20kg-plan-excess')).toBe('7');
 expect(value(result,'20kg-order')).toBe('220');expect(value(result,'20kg-ordered-bags')).toBe('11');
 expect(value(result,'20kg-mix-water-consumed')).toBe('77');expect(value(result,'20kg-mix-water-order')).toBe('77');
 expect(result.rows.every(r=>r.row_id.startsWith('putty:ct126-dry-wall:'))).toBe(true);
 expect(next.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
});
test('keeps the separate five-kilogram recipe and distinguishes preparation from the order',async()=>{
 const facts={...control(0),wall_leveling_technology_choice:binding.exactChoiceRu,ct126_wall_ct126_5kg_stock_bags:2};
 const result=await compileCt126SixDryWallS2769(reps[0]!,facts);
 expect(value(result,'net-mixture')).toBe('213');expect(value(result,'5kg-prepared-mixture')).toBe('215');
 expect(value(result,'5kg-mix-water-consumed')).toBe('77.4');expect(value(result,'5kg-order')).toBe('205');
 expect(result.preliminaryNeeds).toHaveLength(11);
});
test('keeps the application source gaps internal and does not admit adjacent wet-zone parents',()=>{
 const next=buildCt126SixDryWallSuccessorS2769(reps[0]!);
 const gaps=next.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM');
 expect(gaps).toHaveLength(11);expect(gaps.every(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'
  &&p.truth_metadata.provenance.consumer_input_role_v1==='APPLICATION_TECHNICAL')).toBe(true);
 expect(()=>buildCt126SixDryWallSuccessorS2769({...reps[0]!,definition:{...reps[0]!.definition,catalog_id:'canonical-work:base:plaster_paint_interior_wall_putty_level_wet_zone'}})).toThrow('EXACT_SIX');
 expect(profile.representative.resources).toHaveLength(30);
});
test('does not calculate a selected CT126 area from the inherited default of 100',async()=>{
 const {q:_q,...facts}=control();
 const result=await compileCt126SixDryWallS2769(reps[0]!,{...facts,wall_leveling_technology_choice:binding.exactChoiceRu});
 expect(result.parameters.q).toBeUndefined();expect(value(result,'net-mixture')).toBeUndefined();
 expect(result.preliminaryNeeds.length).toBeGreaterThan(11);
});
