// Prepared candidate tests: real canonical compiler + root's six-owner coverage mapping.
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalMachineHourPriceRequirementV1,canonicalManualMachineHourPriceCoverageV1} from '../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {roadUpperGravel150DefinitionR1,roadUpperGravel150PackR1 as data,roadUpperGravel150CatalogIdR1 as catalogId} from '../../src/lib/estimate/v4/roadUpperGravel150Krer27Column02R1';
import {prepareRoadUpperGravel150Column02AppendR1,roadUpperGravel150AcceptanceInputR1 as facts} from '../../scripts/estimate/r4a13/prepareRoadUpperGravel150Column02AppendR1';
import proof from '../../data/estimate-benchmarks/fixtures/road-upper-gravel02-append-absence-r1.json';
const id=(role:string)=>data.prefix+':'+role;
const provenance={kind:'manual',reason:'consumer_estimate_row_batch_edit'};
function compile(parameters:Record<string,unknown>=facts,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={}){
 const d=roadUpperGravel150DefinitionR1();
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:data.contract,catalogId,primaryMeasureParameterId:'area_m2',
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,
  confirmedParameters:{},currencyCode:'KGS',priceItems:[],rowOverrides,maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
}
const row=(r:Awaited<ReturnType<typeof compile>>,role:string)=>r.rows.find(x=>x.row_id===id(role))!;
test('exact column02 has11 source components, no01 bulldozer/lower layer/asphalt, and no site defaults',async()=>{
 const d=roadUpperGravel150DefinitionR1(),r=await compile();
 expect(data.resources).toHaveLength(11);expect(d.resources).toHaveLength(37);expect(d.formulas).toHaveLength(37);expect(d.parameters).toHaveLength(27);
 expect(d.parameters.every(p=>p.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});
 expect(row(r,'worker').quantity).toBe('36.96');expect(row(r,'operators')).toMatchObject({quantity:'52.72',included_in_estimate:false});
 expect(d.resources.some(r=>/bulldozer|asphalt:|road-base:|gravel-base:/.test(r.row_id))).toBe(false);
 for(const [role,q] of [['coarseStone','189'],['chokeStone','15'],['water','30']])expect(row(r,'material:'+role+':consumed').quantity).toBe(q);
 expect(r.parameters.area_m2).toBe(1000);expect(r.preliminaryNeeds).toHaveLength(5);
});
test('100m2 scales physical norm once, with5–20mm choke and150mm upper layer only',async()=>{
 const r=await compile({...facts,area_m2:100});
 expect(row(r,'worker').quantity).toBe('3.696');expect(row(r,'material:coarseStone:consumed').quantity).toBe('18.9');
 expect(row(r,'material:chokeStone:consumed').quantity).toBe('1.5');expect(row(r,'material:water:consumed').quantity).toBe('3');
 expect(data.resources.find(r=>r.id==='chokeStone')!.titleRu).toContain('5–20');
});
test('six machine rates total52.72 hours; summed operator line is unpaid',async()=>{
 const r=await compile();
 const amounts=data.machineCoverageAdmissionRequired.resourceRows.map(m=>r.rows.find(r=>r.row_id===m.rowId)!);
 expect(amounts.map(r=>r.quantity)).toEqual(['7.96','1.82','12.08','27.25','2.96','0.65']);
 expect(amounts.reduce((s,r)=>s+Number(r.quantity),0)).toBeCloseTo(52.72,8);
 expect(row(r,'operators').included_in_estimate).toBe(false);expect(row(r,'operators').amount).toBeNull();
});
const balanceFacts={...facts,coarse_stone_stock:5,coarse_stone_stock_reference:'TESTconfirmed40–70M1200',coarse_stone_reserve:3,coarse_stone_quantum:8,
 choke_stone_stock:0,choke_stone_reserve:2,choke_stone_quantum:5,water_stock:10,water_stock_reference:'TESTcompatiblewater',water_reserve:2,water_quantum:6};
test('three independent balances keep source consumption, rounded order, remaining and free material',async()=>{
 const r=await compile(balanceFacts);
 for(const [role,order,remaining,free] of [['coarseStone','192','8','5'],['chokeStone','20','5','3'],['water','24','4','2']]){
  expect(row(r,'material:'+role).quantity).toBe(order);expect(row(r,'material:'+role+':remaining').quantity).toBe(remaining);expect(row(r,'material:'+role+':free').quantity).toBe(free);
 }
 expect(row(r,'material:coarseStone:consumed').quantity).toBe('189');
});
test('manual77m3/title/price retained withquantum1; shortage107 and reserve deficit3 block procurement',async()=>{
 const r=await compile({...balanceFacts,coarse_stone_quantum:1},{[id('material:coarseStone')]:{quantity:'77',unitPrice:'77',titleRu:'Моя подтверждённая партия40–70',provenance}});
 expect(row(r,'material:coarseStone')).toMatchObject({quantity:'77',unit_price:'77',amount:'5929',title_ru:'Моя подтверждённая партия40–70',included_in_procurement:false});
 expect(row(r,'material:coarseStone:shortage').quantity).toBe('107');expect(row(r,'material:coarseStone:reserve-deficit').quantity).toBe('3');
 expect(row(r,'material:coarseStone:consumed').quantity).toBe('189');
});
test('manual77 againstquantum8 fails exact existing quantum guard rather than rounding',async()=>{
 await expect(compile(balanceFacts,{[id('material:coarseStone')]:{quantity:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
test('unknown facts stay missing original needs with no automatic zero stock or supplier price',async()=>{
 const r=await compile({area_m2:1000});
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('road_upper_project_conditions'))).toBe(true);
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('coarse_stone_stock'))).toBe(true);
 for(const role of ['coarseStone','chokeStone','water'])expect(row(await compile(),'material:'+role).unit_price).toBeNull();
});
test('positive stock requires compatibility reference; zero stock does not require a fabricated reference',async()=>{
 const missing={...balanceFacts} as Record<string,unknown>;delete missing.coarse_stone_stock_reference;
 const r=await compile(missing);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('coarse_stone_stock_reference'))).toBe(true);
 expect(row(r,'material:coarseStone')).toBeUndefined(); expect(r.preliminaryNeeds.find(n=>n.row_id===id('material:coarseStone'))).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:'192',selected:true,missing_parameter_ids:['coarse_stone_stock_reference']});
 expect((await compile()).preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('coarse_stone_stock_reference'))).toBe(false);
});
test('new exact machine owners use existing coverage map; waterBowser is DRIVER',()=>{
 for(const m of data.machineCoverageAdmissionRequired.resourceRows)expect(canonicalMachineHourPriceRequirementV1(m.rowId,'machine_hour')).toEqual({resourceCode:m.resourceCode,operator:m.operator});
 expect(data.machineCoverageAdmissionRequired.resourceRows.find(m=>m.rowId.endsWith(':waterBowser'))!.operator).toBe('DRIVER');
});
test('factory scalar machine price remains unconfirmed without source scope evidence',async()=>{
 const m=data.machineCoverageAdmissionRequired.resourceRows[0],r=await compile(facts,{[m.rowId]:{unitPrice:'1000',provenance}});
 expect(r.rows.find(r=>r.row_id===m.rowId)).toMatchObject({quantity:'7.96',unit_price:'1000',amount:'7960',calculation_trace:{machineHourPriceCoverageV1:{status:'UNCONFIRMED'}}});
});
test('all six actual factory rows retain existing confirmed manual coverage without another operator payment',async()=>{
 const overrides=Object.fromEntries(data.machineCoverageAdmissionRequired.resourceRows.map(m=>[m.rowId,{unitPrice:'1000',provenance,
  machineHourPriceCoverageV1:canonicalManualMachineHourPriceCoverageV1({rowId:m.rowId,unitPrice:'1000',currencyCode:'KGS'})}]));
 const r=await compile(facts,overrides);
 for(const m of data.machineCoverageAdmissionRequired.resourceRows)expect(r.rows.find(r=>r.row_id===m.rowId)?.calculation_trace)
  .toMatchObject({machineHourPriceCoverageV1:{status:'CONFIRMED_MANUAL'}});
 expect(r.rows.filter(r=>data.machineCoverageAdmissionRequired.resourceRows.some(m=>m.rowId===r.row_id)).reduce((sum,r)=>sum+Number(r.amount),0)).toBe(52720);
 expect(row(r,'operators').amount).toBeNull();
});
test('included source operations and five unresolved application-owned needs cannot become duplicate paid norms',async()=>{
 const r=await compile(),d=roadUpperGravel150DefinitionR1();
 for(const included of d.resources.filter(r=>r.row_id.startsWith(data.prefix+':included:'))){
  expect(included.resource_graph.parentCostOwnerId).toBe(id('worker'));
  expect(r.rows.find(r=>r.row_id===included.row_id)?.included_in_estimate).toBe(false);
 }
 for(const gap of data.unresolvedNeeds)expect(r.preliminaryNeeds.some(n=>n.row_id===id('open:'+gap.id)&&n.quantity==null)).toBe(true);
 await expect(compile({...facts,unresolved_quality_control:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('unaccepted lower layer cannot be admitted under this upper layer source',async()=>{
 await expect(compile({...facts,accepted_lower_layer:'Нижний слой ещё не принят'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('interior/small inaccessible site or a120mm thickness cannot silently use road150mm norm',async()=>{
 await expect(compile({...facts,road_upper_project_conditions:'Внутренняя подушка здания, без автогрейдера и катков'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 await expect(compile({...facts,layer_thickness_mm:120})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('exact current absence proof produces distinct append config with no imported59rate/price/saved rows',()=>{
 const c=prepareRoadUpperGravel150Column02AppendR1();
 expect(c.catalogId).toBe(catalogId);expect(c.expectedParentShape).toEqual([0,0,0]);expect(c.search.primaryUom).toBe('m2');
 expect(c.catalogAppend?.requireUniqueWorkKey).toBe(true);expect(c.catalogAppend?.identity.workKey).toBe(data.expectedAppend.workKey);
 expect(c.resourceDefinitions.every(r=>r.row_id.startsWith(data.prefix+':'))).toBe(true);expect(c.runtimeProfileInput).toEqual({});
 expect(c.binding.additionalRowIds).toHaveLength(16);expect(c.passport.unresolvedApplicableResourceRowIds).toHaveLength(5);
 expect(c.parameterDefinitions.every(p=>p.default_value==null)).toBe(true);
});
test('changed absence proof or attempted retarget to generic existing consumer fails exact proof guard',()=>{
 const collision=structuredClone(proof);collision.absenceSets.proposedAppendCurrentMembership.rowCount=1;
 expect(()=>prepareRoadUpperGravel150Column02AppendR1(collision)).toThrow('EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
 const retarget=structuredClone(proof);retarget.proposedAppend.catalogId='canonical-work:base:paving_roads_landscape_interior_gravel_base_install_standard';
 expect(()=>prepareRoadUpperGravel150Column02AppendR1(retarget)).toThrow('EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
});
test('existing governed publisher core callback checks source pin and six machine admissions without DB',async()=>{
 const report=await prepareRoadUpperGravel150Column02AppendR1().verifyCore();
 expect(report).toMatchObject({status:'PASS_EXACT_COLUMN02_QUANTITY_CORE_ONLY',sourceRows:11,normativeBindingRows:17,unresolvedNeeds:5,coverageOwners:6,oldGenericRatesImported:false,acceptedNewCompleteTypes:0});
});
