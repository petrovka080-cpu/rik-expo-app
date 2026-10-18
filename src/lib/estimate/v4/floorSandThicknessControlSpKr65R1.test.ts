// WORK-only, prepared NOT_RUN. Same real shared compiler; no writer or DB.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../../../data/estimate-benchmarks/fixtures/floor-sand-quality-control-open-need-r1.json';
import {appendFloorSandThicknessControlR1,compileFloorSandThicknessControlR1,floorSandThicknessControlSyntheticFactsR1,
 floorSandThicknessControlPackR1 as pack} from './floorSandThicknessControlSpKr65R1';
import {floorSandUnderlayerDefinitionR1,floorSandUnderlayerPackR1 as parentPack} from './floorSandUnderlayerKrer11Column01R1';
import {floorSandUnderlayerAcceptanceInputR1 as oldFacts} from '../../../../scripts/estimate/r4a13/prepareFloorSandUnderlayerColumn01AppendR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const base=floorSandUnderlayerDefinitionR1(),d=appendFloorSandThicknessControlR1(base),compile=compileFloorSandThicknessControlR1;
const facts=(area='250',thickness='100')=>({...oldFacts,...floorSandThicknessControlSyntheticFactsR1(area,thickness)});
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id);
const manual={kind:'manual',reason:'QA_SYNTHETIC_CONTROL_ONLY; not labour norm, inspection result or price quote'};
const amended=(p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:pack.parentPrimaryMeasureParameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],
 resourceDefinitions:[...d.resources],submittedParameters:p,confirmedParameters:{},currencyCode:'KGS',priceItems:[],rowOverrides,maximumResourceRows:28,hashJson:async v=>estimateDeterministicHash(v)});
it('pins official published PDF and accepted unresolved need without claiming fresh DB or runtime acceptance',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.needFixture.path))).digest('hex')).toBe(pack.needFixture.sha256);
 expect(fixture.rawNeed.row_id).toBe(pack.completionNeedRowId);expect(fixture.rawNeed.need_sha256).toBe('5fede139bd621d84a322fab2699f0374923a1f39a3d20214a546081c162ba21a');
 expect(fixture.rawNeed.quantity).toBeNull();expect(fixture.rawNeed.unit_price).toBeNull();expect(fixture.freshParentCapturePending).toBe(true);expect(pack.publicationAllowed).toBe(false);
});
it('adds7explicit facts and2informational formula rows, preserving all old22/26/26 exactly',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([29,28,28]);
 expect(d.parameters.slice(0,22)).toEqual(base.parameters);expect(d.formulas.slice(0,26)).toEqual(base.formulas);expect(d.resources.slice(0,26)).toEqual(base.resources);
 expect(base).toEqual(floorSandUnderlayerDefinitionR1());expect(d.parameters.every(p=>p.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});
 expect(d.parameters.slice(22).map(p=>p.ordinal)).toEqual([22,23,24,25,26,27,28]);
});
it('does not replace the umbrella quality-control need, source quantity or original5need definitions',()=>{
 const old=base.resources.filter(r=>r.row_id.startsWith(parentPack.prefix+':open:'));expect(old).toHaveLength(5);
 expect(d.resources.filter(r=>r.row_id.startsWith(parentPack.prefix+':open:'))).toEqual(old);
 expect(d.resources.find(r=>r.row_id===pack.completionNeedRowId)?.unit_id).toBe('item');expect(pack.completionNeedRemainsOpen).toBe(true);
});
it('no control branch is selected from floor volume alone',async()=>{
 const r=await compile({...oldFacts});expect(by(r,pack.rows.minimumCount)).toBeUndefined();expect(by(r,pack.rows.deviationLimit)).toBeUndefined();
 expect(r.preliminaryNeeds.some(x=>x.row_id===pack.completionNeedRowId)).toBe(true);
});
it('explicit other/unconfirmed scope keeps calculation absent and original need open',async()=>{
 const r=await compile({...oldFacts,[pack.selectionParameter]:pack.otherValue});expect(by(r,pack.rows.minimumCount)).toBeUndefined();expect(r.preliminaryNeeds.some(x=>x.row_id===pack.completionNeedRowId)).toBe(true);
});
it.each([['0.1','1'],['50','1'],['99.9','1'],['100','1'],['100.1','2'],['200','2'],['250','3']] as const)('one measured room%s m2 yields minimum%s checks; never a norm of labour',async(area,count)=>{
 const r=await compile(facts(area));expect(by(r,pack.rows.minimumCount)).toMatchObject({quantity:count,unit_id:'test',included_in_estimate:false,included_in_procurement:false});
 expect(r.preliminaryNeeds.some(x=>x.row_id===pack.completionNeedRowId)).toBe(true);
});
it.each([['80','8'],['100','10'],['150','15']] as const)('project thickness%s mm gives source deviation limit%s mm, not measured compliance',async(thickness,limit)=>{
 const r=await compile(facts('250',thickness));expect(by(r,pack.rows.deviationLimit)).toMatchObject({quantity:limit,unit_id:'mm',included_in_estimate:false});
 expect(d.resources.slice(26).every(x=>x.source_metadata?.sitePerformedOrPassed===false)).toBe(true);
});
it('changing primarym3 changes oldwork/machines only, not independently measured area minimum',async()=>{
 const r=await compile({...facts('250'),floor_sand_net_volume_m3:20});expect(by(r,pack.rows.minimumCount)?.quantity).toBe('3');
 expect(by(r,parentPack.prefix+':worker')?.quantity).toBe('46');expect(by(r,parentPack.prefix+':equipment:compressor')?.quantity).toBe('4.4');
});
it.each(pack.requiredFacts.map(f=>f.id))('missing explicit fact%s leaves the control row unresolved',async id=>{
 const p:Record<string,unknown>=facts();delete p[id];const r=await compile(p);
 expect(by(r,pack.rows.minimumCount)).toBeUndefined();expect(by(r,pack.rows.deviationLimit)).toBeUndefined();
 expect(r.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes(id))).toBe(true);expect(r.preliminaryNeeds.some(x=>x.row_id===pack.completionNeedRowId)).toBe(true);
});
it.each([
 {floor_sand_thickness_control_scope:'MULTIPLE_ROOMS_AGGREGATED'},
 {floor_sand_thickness_control_scope:'ROAD_FOUNDATION_OR_TRENCH_SAND'},
 {floor_sand_control_payment_scope:'SEPARATE_PAID_LABOUR_OR_LAB_TESTS_ASSUMED'},
 {floor_sand_control_room_area_m2:'0'},
 {floor_sand_control_room_area_m2:'-5'},
 {floor_sand_control_room_area_m2:'50+50'},
 {floor_sand_project_thickness_mm:'0'},
 {floor_sand_project_thickness_mm:'-1'},
])('rejects incompatible scope/facts%j rather than choosing another standard or method',async change=>{
 await expect(compile({...facts(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('keeps wholeworker2.3, compressor.22, loader.08 and rammer.44 pernetm3 unchanged; no new resource owner',async()=>{
 const r=await compile(facts());for(const[id,q]of [['worker','23'],['operators','3'],['equipment:forklift5t','0.8'],['equipment:compressor','2.2'],['equipment:pneumaticRammer','4.4']]as const)
  expect(by(r,parentPack.prefix+':'+id)?.quantity).toBe(q);
 expect(d.resources.slice(26).every(x=>x.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!x.procurement_eligible)).toBe(true);
 expect(d.resources.filter(x=>x.category==='labor'||x.category==='equipment')).toEqual(base.resources.filter(x=>x.category==='labor'||x.category==='equipment'));
});
it('sand/water purchase balances remain identical; no density, tool, water or time defaults appear',async()=>{
 const before=await compile({...oldFacts}),after=await compile(facts());for(const id of ['sand','water'])for(const suffix of ['',':consumed',':packages',':remaining',':free'])
  expect(by(after,parentPack.prefix+':material:'+id+suffix)?.quantity).toBe(by(before,parentPack.prefix+':material:'+id+suffix)?.quantity);
 expect(d.parameters.slice(22).some(x=>/density|water|hour|tool|pass|coefficient|frequency/.test(x.parameter_id))).toBe(false);
});
it('manual includedtrue +reference77 cannot turn INFO controls into paid/procurement; titles do not prove performance',async()=>{
 const plain=await amended(facts(),{}),r=await amended(facts(),{[pack.rows.minimumCount]:{includedInEstimate:true,includedInProcurement:true,unitPrice:'77',titleRu:'QA custom control title',provenance:manual}});
 expect(by(r,pack.rows.minimumCount)).toMatchObject({included_in_estimate:false,included_in_procurement:false,unit_price:'77'});expect(r.totals).toEqual(plain.totals);
 expect(r.preliminaryNeeds.some(x=>x.row_id===pack.completionNeedRowId)).toBe(true);
});
it.each([['minimumCount','77'],['minimumCount','3'],['deviationLimit','77'],['deviationLimit','10']] as const)('row override%s=%s cannot replace calculated source control even when equal',async(key,quantity)=>{
 await expect(amended(facts(),{[pack.rows[key]]:{quantity,provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(['0','1'])('manual%s on oldquality need cannot close it or import77price',async quantity=>{
 await expect(amended(facts(),{[pack.completionNeedRowId]:{quantity,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(['worker','equipment:compressor','equipment:pneumaticRammer'])('rejects a parent with changed%s arithmetic instead of treating new controls as compatible',id=>{
 const row=base.resources.find(x=>x.row_id===parentPack.prefix+':'+id)!;
 const bad={...base,formulas:base.formulas.map(f=>f.formula_id===row.formula_id?{...f,expression_source:'0'}:f)};
 expect(()=>appendFloorSandThicknessControlR1(bad)).toThrow('FLOOR_SAND_CONTROL_OLD_OPERATION_BOUNDARY_DRIFT');
});
it.each(['wrongSand','massUnit'])('rejects%s instead of reusing medium-natural-sand m3 scope for another material/unit',kind=>{
 const bad={...base,resources:base.resources.map(r=>r.row_id!==parentPack.prefix+':material:sand:consumed'?r:
  kind==='wrongSand'?{...r,source_metadata:{...r.source_metadata,normativeResourceCode:'OTHER_SAND_OR_AGGREGATE'}}:{...r,unit_id:'t'})};
 expect(()=>appendFloorSandThicknessControlR1(bad)).toThrow('FLOOR_SAND_CONTROL_SAND_WATER_SOURCE_BOUNDARY:sand');
});
it('original five needs/whole source scope never become complete from a thickness minimum',()=>{
 expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.newCatalogIds).toBe(0);expect(pack.freshCurrentParentRequired).toBe(true);
 expect(pack.paymentBoundary.newPaidOwners).toBe(0);expect(pack.paymentBoundary.newPriceBindings).toBe(0);expect(pack.paymentBoundary.newProcurementRows).toBe(0);
});
