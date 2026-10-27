import {ceramicFloorM150ResourceGroupDefinitionR2 as definition,ceramicFloorM150ResourceGroupCompletenessR2 as completeness,compileCeramicFloorM150ResourceGroupR2 as compile,ceramicFloorM150ResourceGroupPackR2 as pack} from './ceramicFloorCementMortarResourceGroupR2';
import {ceramicFloor02703DefinitionR1,ceramicFloor02703PackR1 as parentPack} from './ceramicFloorCementMortarKrer11Column03R1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
const prefix=parentPack.prefix;
const input=(area=100,length=50):Record<string,unknown>=>({[pack.primaryParameterId]:area,[pack.skirtingLengthParameterId]:length});
const by=(r:Awaited<ReturnType<typeof compile>>,key:string)=>r.rows.find(x=>x.row_id===prefix+':'+key);
it('preserves R1 and accepts only measured geometry as required user input',()=>{
 const before=estimateDeterministicHash(ceramicFloor02703DefinitionR1()),d=definition();expect(estimateDeterministicHash(ceramicFloor02703DefinitionR1())).toBe(before);
 expect(d.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id).sort()).toEqual([pack.primaryParameterId,pack.skirtingLengthParameterId].sort());
 expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.publicationPerformed).toBe(false);
 expect(pack.crew).toMatchObject({workers:6,links:3,workersPerLink:2,scaleWithArea:false,purchasePerStage:false});
 expect(pack.tools).toHaveLength(36);expect(pack.ppe).toHaveLength(8);
 expect(pack.notImported.map(x=>x.id)).toEqual(['compressor-and-mortar-pump','cell-template','tk-material-labor-rates']);
});
it('reuses independent floor/skirting columns with one M150 balance and truck owner',async()=>{
 const r=await compile(input());
 for(const [key,q]of [['whole-labor','119.78'],['ready-mortar-m150-consumed','1.38'],['ready-mortar-m150-order','1.38'],['truck5t-consumed','0.31'],['r2:skirting-labor','11.8'],['r2:skirting-tile-consumed','50.5'],['r2:skirting-tile-order','50.5']])expect(by(r,key)?.quantity).toBe(q);
 expect(r.rows.filter(x=>x.row_id.endsWith('ready-mortar-m150-order'))).toHaveLength(1);
 expect(r.rows.filter(x=>x.row_id.endsWith('truck5t-own')||x.row_id.endsWith('truck5t-hired'))).toHaveLength(1);
 const d=definition();expect(d.parameters.some(p=>p.parameter_id.endsWith('_stock')||p.parameter_id.endsWith('_quantum'))).toBe(false);
 expect(r.rows.every(row=>row.unit_price===null)).toBe(true);expect(by(r,'r2:provision-owner')?.quantity).toBe('100');
});
it.each([0.01,1,100,10000])('reuses one full brigade at area%s with no per-stage purchases',async area=>{
 const r=await compile(input(area,0));
 for(const item of [...pack.tools,...pack.ppe]){const row=by(r,'r2:'+item.id);expect(row?.quantity).toBe(String(item.count));expect(row?.included_in_estimate).toBe(false);expect(row?.included_in_procurement).toBe(false);}
 for(const [key,value]of [['lever-cutter','3'],['goggles','3'],['rubber-gloves','6'],['knee-pads','6']])expect(by(r,'r2:'+key)?.quantity).toBe(value);
 expect(r.rows.filter(x=>x.row_id.endsWith(':r2:bucket'))).toHaveLength(1);expect(r.rows.filter(x=>x.row_id.endsWith(':r2:water-hose'))).toHaveLength(1);
});
it('requires separately measured skirting and accepts explicit zero without deriving perimeter',async()=>{
 const p=definition().parameters.find(x=>x.parameter_id===pack.skirtingLengthParameterId)!;expect(p.default_value).toBe(null);expect(p.required).toBe(true);
 const r=await compile(input(100,0));expect(by(r,'r2:skirting-labor')).toBeUndefined();expect(by(r,'r2:skirting-tile-order')).toBeUndefined();
 expect(by(r,'ready-mortar-m150-consumed')?.quantity).toBe('1.3');expect(by(r,'truck5t-consumed')?.quantity).toBe('0.28');
});
it('preserves water, care, source controls and exactly three real physical needs',async()=>{
 const r=await compile(input());expect(by(r,'water-consumed')?.quantity).toBe('3.85');expect(by(r,'sawdust-consumed')?.quantity).toBe('3.06');
 expect(by(r,'r2:quality-bedding-thickness')?.quantity).toBe('100');expect(by(r,'r2:quality-flatness')?.quantity).toBe('100');
 expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.actualRemaining.map(n=>prefix+':'+n.rowSuffix).sort());
 expect(r.preliminaryNeeds).toHaveLength(3);expect(pack.skinProtectionSource.verifiedDoseMlPerApplication).toBe(1);expect(pack.skinProtectionSource.totalApplicationCount).toBe(null);
 await expect(compile({...input(),ceramic_m150_r2_paste_fire_access_qty:0})).rejects.toBeDefined();
 expect(pack.technologyConditions.length).toBeGreaterThan(0);
 expect(pack.quality).toHaveLength(6);expect(by(r,'r2:quality-curing-release')).toBeUndefined();
 expect(pack.technologyConditions.find(c=>c.id==='climate-and-curing')?.ruleRu).toContain('2,5МПа');
});
it('declares a separate resource/operation oracle and removes public explanatory notes',()=>{
 const d=definition(),map=completeness();expect(map.generatedFromCurrentRows).toBe(false);expect(map.fullTechnicalAcceptance).toBe(false);
 for(const entry of map.entries){const row=d.resources.find(r=>r.row_id===entry.resolution.rowId)!;expect(row).toBeDefined();for(const op of entry.requiredOperationIds)expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId)).toContain(op);}
 expect(map.sharedQuantitySources).toHaveLength(2);expect(map.openAuthorObligations).toHaveLength(3);
 expect(d.resources.every(r=>{const view=r.resource_graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;
  return !Array.isArray(view?.detailsRu)||view.detailsRu.length===0;})).toBe(true);
});
