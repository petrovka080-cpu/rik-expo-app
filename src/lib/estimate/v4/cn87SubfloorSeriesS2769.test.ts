import parents from '../../../../data/estimate-benchmarks/fixtures/cn87-four-subfloor-v4-parents-s27-69.json';
import {buildCn87SubfloorSuccessorS2769,compileCn87SubfloorS2769,cn87SubfloorBindingS2769 as binding} from './cn87SubfloorSeriesS2769';
import {cn87SeparationSourcePackS2754 as source} from './cn87SeparationScreedS2754';
import {cn69SubfloorBindingS2769 as cn69} from './cn69SubfloorSeriesS2769';
import {cn69ExplicitControlS2754} from '../../../../scripts/estimate/r4a13/prepareS2754Cn69DryFloor';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

const controls={q:35.51,subfloor_technology_choice:binding.exactChoiceRu,
 cn87_subfloor_ready_layer_confirmed:source.readyLayerValue,cn87_subfloor_construction_confirmed:source.constructionValue,
 cn87_subfloor_conditions_confirmed:source.conditionsValue,cn87_subfloor_joints_confirmed:source.jointsValue,
 cn87_subfloor_project_detail_reference:'Контрольный узел, не реальный проект',cn87_subfloor_mix_water_l_per_25kg:1.9,
 cn87_subfloor_cn87_stock_kg:0,cn87_subfloor_cn87_reserve_kg:0,cn87_subfloor_cn87_supplier_bag_multiple:1,
 cn87_subfloor_water_stock_l:0,cn87_subfloor_water_reserve_l:0,cn87_subfloor_water_supply_quantum_l:1};
const value=(r:Awaited<ReturnType<typeof compileCn87SubfloorS2769>>,key:string)=>r.rows.find(row=>row.row_id==='cn87:separation-50mm:'+key)?.quantity;
const reps=parents.reps as unknown as PurchaseGroupRepresentative[];

test.each(reps.map((p,index)=>[String(p.definition.catalog_id),index] as const))('reuses the admitted CN87 owner and preserves all historical owners: %s',async(_id,index)=>{
 const parent=reps[index]!,before=JSON.stringify(parent),next=buildCn87SubfloorSuccessorS2769(parent),result=await compileCn87SubfloorS2769(parent,controls);
 expect(JSON.stringify(parent)).toBe(before);expect(next.resources).toHaveLength(126);
 for(const row of parent.resources)expect(next.resources.find(r=>r.row_id===row.row_id)).toEqual(row);
 for(const formula of parent.formulas)expect(next.formulas.find(f=>f.formula_id===formula.formula_id)).toEqual(formula);
 expect(value(result,'cn87-consumed')).toBe('3551');expect(value(result,'cn87-order')).toBe('3575');expect(value(result,'cn87-bags')).toBe('143');
 expect(value(result,'water-consumed')).toBe('269.876');expect(value(result,'water-order')).toBe('270');
 expect(result.preliminaryNeeds).toHaveLength(21);expect(result.rows.filter(r=>r.included_in_estimate)).toHaveLength(2);
 expect(result.rows.every(r=>!r.row_id.startsWith('floor:cn69-global-25kg:'))).toBe(true);
 const oldOwners=new Set(parent.resources.map(row=>row.cost_owner_id));
 expect(next.resources.filter(row=>row.row_id.startsWith('cn87:separation-50mm:')).every(row=>!oldOwners.has(row.cost_owner_id))).toBe(true);
});

test('CN69 remains a distinct technology with its former quantities and needs',async()=>{
 const {floor_area_m2:q,...facts}=cn69ExplicitControlS2754();const result=await compileCn87SubfloorS2769(reps[0]!,{...facts,q,subfloor_technology_choice:cn69.exactChoiceRu});
 expect(result.rows.find(r=>r.row_id==='floor:cn69-global-25kg:cn69-consumed')?.quantity).toBe('184.6');
 expect(result.rows.find(r=>r.row_id==='floor:cn69-global-25kg:cn69-order')?.quantity).toBe('200');
 expect(result.preliminaryNeeds).toHaveLength(22);expect(result.rows.some(r=>r.row_id.startsWith('cn87:separation-50mm:'))).toBe(false);
});

test('missing supply facts retain physical consumption without assuming stock, reserve, quantum or dosage',async()=>{
 const {cn87_subfloor_cn87_stock_kg:_s,cn87_subfloor_cn87_reserve_kg:_r,cn87_subfloor_cn87_supplier_bag_multiple:_m,
 cn87_subfloor_water_stock_l:_ws,cn87_subfloor_water_reserve_l:_wr,cn87_subfloor_water_supply_quantum_l:_wq,...facts}=controls;
 const result=await compileCn87SubfloorS2769(reps[0]!,facts);
 expect(value(result,'cn87-consumed')).toBe('3551');expect(value(result,'water-consumed')).toBe('269.876');
 expect(value(result,'cn87-order')).toBeUndefined();expect(value(result,'water-order')).toBeUndefined();
 const {cn87_subfloor_mix_water_l_per_25kg:_dose,...noDose}=facts,resultWithoutDose=await compileCn87SubfloorS2769(reps[0]!,noDose);
 expect(value(resultWithoutDose,'cn87-consumed')).toBe('3551');expect(value(resultWithoutDose,'water-consumed')).toBeUndefined();
 expect(value(resultWithoutDose,'water-min')).toBe('248.57');expect(value(resultWithoutDose,'water-max')).toBe('284.08');
});

test.each([1.74,2.01])('rejects water dosage outside the admitted CN87 range: %s',async dosage=>{
 await expect(compileCn87SubfloorS2769(reps[0]!,{...controls,cn87_subfloor_mix_water_l_per_25kg:dosage})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
