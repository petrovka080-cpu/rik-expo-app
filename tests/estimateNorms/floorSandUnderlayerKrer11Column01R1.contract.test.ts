// Candidate-only tests: real shared compiler; exact current readset proof pins distinct floor source append.
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalMachineHourPriceRequirementV1,canonicalManualMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1,parseCanonicalMachineHourPriceCoverageV1,canonicalMachineHourRowPriceDecisionV1,canonicalMachineHourPriceNeedsConfirmationV1,assertCanonicalMachineHourDefinitionV1} from '../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {canonicalManualPriceMigrationBindings,canonicalStoredManualPricesCanMigrate} from '../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {floorSandUnderlayerDefinitionR1,floorSandUnderlayerPackR1 as data,floorSandUnderlayerCatalogIdR1 as catalogId} from '../../src/lib/estimate/v4/floorSandUnderlayerKrer11Column01R1';
import {prepareFloorSandUnderlayerColumn01AppendR1} from '../../scripts/estimate/r4a13/prepareFloorSandUnderlayerColumn01AppendR1';
import proof from '../../data/estimate-benchmarks/fixtures/floor-sand-underlayer11-append-absence-r1.json';
const id=(role:string)=>data.prefix+':'+role;
const provenance={kind:'manual',reason:'consumer_estimate_row_batch_edit'};
export const facts={floor_sand_net_volume_m3:10,floor_sand_project_conditions:data.projectConditionsValueRu,
  floor_sand_accepted_base:data.acceptedBaseValueRu,floor_sand_net_volume_basis:data.netVolumeValueRu,
  floor_sand_machine_fulfillment:data.machineFulfillmentValues[0],
  floor_sand_material_stock:0,floor_sand_material_reserve:0,floor_sand_material_quantum:1,
  floor_sand_material_specification:'TEST: средний природный строительный песок01-6208-0005; фактическая совместимость подтверждена',
  floor_sand_water_stock:0,floor_sand_water_reserve:0,floor_sand_water_quantum:0.1,
  floor_sand_water_specification:'TEST: вода01-0601-0001 по проектной спецификации'};
function compile(parameters:Record<string,unknown>=facts,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=floorSandUnderlayerDefinitionR1();
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:data.contract,catalogId,
  primaryMeasureParameterId:data.primaryMeasureParameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:parameters,confirmedParameters:{},currencyCode:'KGS',priceItems,rowOverrides,maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
}
const row=(r:Awaited<ReturnType<typeof compile>>,role:string)=>r.rows.find(x=>x.row_id===id(role))!;
const balanced={...facts,floor_sand_material_stock:2,floor_sand_material_stock_reference:'TEST: пригодный средний песок подтверждён по фактической спецификации',
 floor_sand_material_reserve:1,floor_sand_material_quantum:3,floor_sand_water_stock:0.5,
 floor_sand_water_stock_reference:'TEST: пригодная вода подтверждена',floor_sand_water_reserve:0.2,floor_sand_water_quantum:0.5};

test('exact floor sand column01 uses net m3, seven source components and no runtime project defaults',async()=>{
 const d=floorSandUnderlayerDefinitionR1(),r=await compile();
 expect(data.resources).toHaveLength(7);expect(d.resources).toHaveLength(26);expect(d.formulas).toHaveLength(26);
 expect(d.parameters.every(p=>p.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});
 expect(r.parameters.floor_sand_net_volume_m3).toBe(10);expect(row(r,'worker').quantity).toBe('23');
 expect(row(r,'operators')).toMatchObject({quantity:'3',included_in_estimate:false,amount:null});
 expect(row(r,'material:sand:consumed').quantity).toBe('12');expect(row(r,'material:water:consumed').quantity).toBe('1.5');
 expect(r.preliminaryNeeds).toHaveLength(5);
});
test('fractional net volume scales source quantities once, independent of delivery rounding',async()=>{
 const r=await compile({...facts,floor_sand_net_volume_m3:0.125});
 for(const [role,q] of [['worker','0.2875'],['operators','0.0375'],['equipment:forklift5t','0.01'],['equipment:compressor','0.0275'],['equipment:pneumaticRammer','0.055'],
 ['material:sand:consumed','0.15'],['material:water:consumed','0.01875']])expect(row(r,role).quantity).toBe(q);
 expect(row(r,'material:sand').quantity).toBe('1');expect(row(r,'material:water').quantity).toBe('0.1');
});
test('source operator component belongs to forklift and compressor; pneumatic rammer has no extra operator norm',async()=>{
 const r=await compile(),d=floorSandUnderlayerDefinitionR1();
 expect(row(r,'equipment:forklift5t').quantity).toBe('0.8');expect(row(r,'equipment:compressor').quantity).toBe('2.2');
 expect(row(r,'equipment:pneumaticRammer').quantity).toBe('4.4');
 expect(d.resources.find(r=>r.row_id===id('operators'))?.source_metadata?.machineRateOwnerRowIds).toEqual([id('equipment:forklift5t'),id('equipment:compressor')]);
 expect(d.resources.filter(r=>r.row_id.startsWith(id('equipment:')))).toHaveLength(3);expect(row(r,'operators').included_in_estimate).toBe(false);
});
test('two independent source balances retain rounded order, remaining and free quantities',async()=>{
 const r=await compile(balanced);
 for(const [role,order,remaining,free] of [['sand','12','2','1'],['water','1.5','0.5','0.3']]){
  expect(row(r,'material:'+role).quantity).toBe(order);expect(row(r,'material:'+role+':remaining').quantity).toBe(remaining);expect(row(r,'material:'+role+':free').quantity).toBe(free);
 }
 expect(row(r,'material:sand:consumed').quantity).toBe('12');expect(row(r,'material:water:consumed').quantity).toBe('1.5');
});
test('manual7/title/price77 changes only actual order, with shortage3 and reserve deficit1',async()=>{
 const r=await compile({...balanced,floor_sand_material_quantum:1},{[id('material:sand')]:{quantity:'7',unitPrice:'77',titleRu:'Подтверждённый средний песок',provenance}});
 expect(row(r,'material:sand')).toMatchObject({quantity:'7',unit_price:'77',amount:'539',title_ru:'Подтверждённый средний песок',included_in_procurement:false});
 expect(row(r,'material:sand:shortage').quantity).toBe('3');expect(row(r,'material:sand:reserve-deficit').quantity).toBe('1');
 expect(row(r,'material:sand:consumed').quantity).toBe('12');
});
test('manual7 cannot bypass actual quantum3 and is not silently rounded',async()=>{
 await expect(compile(balanced,{[id('material:sand')]:{quantity:'7',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
test('only known volume does not invent source applicability, stocks, reserve, quantum or price',async()=>{
 const r=await compile({floor_sand_net_volume_m3:10});
 for(const key of ['floor_sand_project_conditions','floor_sand_accepted_base','floor_sand_net_volume_basis','floor_sand_material_stock','floor_sand_water_quantum'])
  expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(key))).toBe(true);
 for(const role of ['sand','water'])expect(row(await compile(),'material:'+role).unit_price).toBeNull();
 expect(r.parameters.floor_sand_net_volume_m3).toBe(10);
});
test('positive stock needs exact compatibility reference while zero stock needs no fabricated reference',async()=>{
 const p={...balanced} as Record<string,unknown>;delete p.floor_sand_material_stock_reference;
 const r=await compile(p);expect(row(r,'material:sand')).toBeUndefined();
 expect(r.preliminaryNeeds.find(n=>n.row_id===id('material:sand'))).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:'12',missing_parameter_ids:['floor_sand_material_stock_reference']});
 expect((await compile()).preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('floor_sand_material_stock_reference'))).toBe(false);
});
test('net volume under floor rule and initial accepted base are explicit facts consumed by source rows',async()=>{
 const p={...facts} as Record<string,unknown>;delete p.floor_sand_net_volume_basis;
 const r=await compile(p);expect(row(r,'worker')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.row_id===id('worker')&&n.missing_parameter_ids.includes('floor_sand_net_volume_basis'))).toBe(true);
 await expect(compile({...facts,floor_sand_accepted_base:'Основание не принято; требуется разработка'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('road, pipe bedding, changed machine scheme or arbitrary geometry cannot borrow this floor sand norm',async()=>{
 for(const value of ['Дорожный верхний слой150мм','Песчаная постель трубы','Заменить на виброплиту без отдельного допуска','Помещение недоступно автопогрузчику5т'])
  await expect(compile({...facts,floor_sand_project_conditions:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 await expect(compile({...facts,layer_thickness_mm:150})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('two included source operations and five concrete application needs remain unpaid or unresolved',async()=>{
 const r=await compile(),d=floorSandUnderlayerDefinitionR1();
 for(const item of d.resources.filter(r=>r.row_id.startsWith(id('included:')))){
  expect(item.resource_graph.parentCostOwnerId).toBe(id('worker'));
  expect(r.rows.find(r=>r.row_id===item.row_id)?.included_in_estimate).toBe(false);
 }
 for(const gap of data.unresolvedNeeds){
  expect(r.preliminaryNeeds.some(n=>n.row_id===id('open:'+gap.id)&&n.quantity==null)).toBe(true);
  expect(gap.taskRu.length).toBeGreaterThan(60);expect(gap.missingFactOwner.length).toBeGreaterThan(5);
 }
 await expect(compile({...facts,unresolved_quality_control:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('source1.2 supply factor is used once without20% waste, road fleet, excavation or second paid operator',async()=>{
 const d=floorSandUnderlayerDefinitionR1(),r=await compile();
 expect(row(r,'material:sand:consumed').quantity).toBe('12');
 expect(d.resources.some(r=>/road-upper|roller|grader|excavat|geotextile|screed|waste-percent/.test(r.row_id))).toBe(false);
 expect(d.resources.filter(r=>r.source_metadata?.sourceRole==='OFFICIAL_NORM'&&r.resource_graph?.costTreatment==='OWN_COST')).toHaveLength(6);
});
test('exact three machine owner mappings reuse existing contract with no extra rammer operator norm',()=>{
 for(const m of data.machineCoverageAdmissionRequired.resourceRows)
  expect(canonicalMachineHourPriceRequirementV1(m.rowId,'machine_hour')).toMatchObject({resourceCode:m.resourceCode,operator:m.operator});
 expect(data.machineCoverageAdmissionRequired.resourceRows.find(m=>m.rowId===id('equipment:pneumaticRammer'))?.operator).toBe('NO_ADDITIONAL_OPERATOR_NORM');
 for(const m of data.machineCoverageAdmissionRequired.resourceRows)expect(canonicalManualMachineHourPriceCoverageV1({rowId:m.rowId,unitPrice:'77',currencyCode:'KGS'}).operationScope).toBe(m.operationScope);
});
test('scalar machine price remains unconfirmed; exact existing manual scope evidence confirms each machine row',async()=>{
 const first=data.machineCoverageAdmissionRequired.resourceRows[0];
 const missing=await compile(facts,{[first.rowId]:{unitPrice:'77',provenance}});
 expect(missing.rows.find(r=>r.row_id===first.rowId)?.calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'UNCONFIRMED'}});
 const overrides=Object.fromEntries(data.machineCoverageAdmissionRequired.resourceRows.map(m=>[m.rowId,{unitPrice:'77',provenance,
  machineHourPriceCoverageV1:canonicalManualMachineHourPriceCoverageV1({rowId:m.rowId,unitPrice:'77',currencyCode:'KGS'})}]));
 const confirmed=await compile(facts,overrides);
 for(const m of data.machineCoverageAdmissionRequired.resourceRows)expect(confirmed.rows.find(r=>r.row_id===m.rowId)?.calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'CONFIRMED_MANUAL'}});
 expect(row(confirmed,'operators').amount).toBeNull();
});

test('exact current full-readset proof yields one distinct floor append, never edits existing generic sand owners',()=>{
 const c=prepareFloorSandUnderlayerColumn01AppendR1();
 expect(c.catalogId).toBe(catalogId);expect(c.expectedParentShape).toEqual([0,0,0]);expect(c.catalogAppend?.requireUniqueWorkKey).toBe(true);
 expect(c.catalogAppend?.identity.workKey).toBe(data.expectedAppend.workKey);expect(c.search.primaryUom).toBe('m3');
 expect(c.resourceDefinitions.every(r=>r.row_id.startsWith(data.prefix+':'))).toBe(true);expect(c.runtimeProfileInput).toEqual({});
 expect(c.binding.additionalRowIds).toHaveLength(10);expect(c.passport.unresolvedApplicableResourceRowIds).toHaveLength(5);
 expect(proof.genericTargetPreimagePreserved.targetSavedRows.rowCount).toBe(59);expect(proof.genericTargetPreimagePreserved.targetPriceItems.rowCount).toBe(59);
});
test('collision, source retarget or changed historical saved readset fails immutable proof before config emission',()=>{
 const collision=structuredClone(proof);collision.absenceSets.proposedAppendCurrentMembership.rowCount=1;
 expect(()=>prepareFloorSandUnderlayerColumn01AppendR1(collision)).toThrow('EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
 const retarget=structuredClone(proof);retarget.proposedAppend.catalogId='canonical-work:base:earthworks_interior_sand_base_prepare_standard';
 expect(()=>prepareFloorSandUnderlayerColumn01AppendR1(retarget)).toThrow('EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
 const historic=structuredClone(proof);historic.allCurrentReadSets.targetSavedPrices.rawRowsSha256='0'.repeat(64);
 expect(()=>prepareFloorSandUnderlayerColumn01AppendR1(historic)).toThrow('EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
});
test('governed publisher callback checks primary source pin, exact machine admissions and real quantity core without DB',async()=>{
 const report=await prepareFloorSandUnderlayerColumn01AppendR1().verifyCore();
 expect(report).toMatchObject({status:'PASS_EXACT_FLOOR_SAND_COLUMN01_QUANTITY_CORE_ONLY',sourceRows:7,normativeBindingRows:11,unresolvedNeeds:5,coverageOwners:3,
  publicationPerformed:false,oldGenericRatesImported:false,acceptedNewCompleteTypes:0,rammerOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'});
});

const RAMMER_SCOPE='MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE';
const rammerId=id('equipment:pneumaticRammer');
const snapshotId='11111111-1111-4111-8111-111111111111',otherSnapshotId='22222222-2222-4222-8222-222222222222';
function manualEvidence(){return canonicalManualMachineHourPriceCoverageV1({rowId:rammerId,unitPrice:'77',currencyCode:'KGS'});}
function snapshotEvidence(){return {...manualEvidence(),source:{kind:'SNAPSHOT',snapshotId,priceKey:rammerId}};}
function manualDecision(evidence:unknown,input:Partial<Parameters<typeof resolveCanonicalMachineHourPriceCoverageV1>[0]>={}){
 return resolveCanonicalMachineHourPriceCoverageV1({catalogId,rowId:rammerId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',evidence,
  manual:true,manualProvenanceReason:provenance.reason,...input});
}
function snapshotDecision(evidence:unknown,input:Partial<Parameters<typeof resolveCanonicalMachineHourPriceCoverageV1>[0]>={}){
 return resolveCanonicalMachineHourPriceCoverageV1({catalogId,rowId:rammerId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',evidence,
  manual:false,snapshotId,priceKey:rammerId,...input});
}

test('rammer metadata and visible declaration reference separate worker and compressor owners without splitting their norms',()=>{
 const d=floorSandUnderlayerDefinitionR1(),rammer=d.resources.find(r=>r.row_id===rammerId)!;
 expect(rammer.source_metadata).toMatchObject({normativeResourceCode:'33-0741',machinePriceCoverageRequired:'EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED',
  machinePriceOperationScope:RAMMER_SCOPE,machinePriceSeparatePaidOwnerRowIds:[id('worker'),id('equipment:compressor')],
  machinePriceSeparatePaidOwners:[{rowId:id('worker'),resourceCode:'000-1002-5',unitId:'man_hour',sourceQuantityPerNetM3:'2.3'},
   {rowId:id('equipment:compressor'),resourceCode:'05-0005',unitId:'machine_hour',sourceQuantityPerNetM3:'0.22'}]});
 expect(rammer.resource_graph.publicResourcePresentationV1).toMatchObject({detailsRu:expect.arrayContaining([data.rammerPriceConfirmationRu])});
 expect(data.rammerPriceConfirmationRu).toContain('Рабочий уже учтён');expect(data.rammerPriceConfirmationRu).toContain('сжатый воздух');
 expect(data.rammerPriceConfirmationRu).toContain('не входят');expect(d.resources).toHaveLength(26);expect(data.resources).toHaveLength(7);
 for(const name of ['forklift5t','compressor'])expect(d.resources.find(r=>r.row_id===id('equipment:'+name))?.source_metadata?.machinePriceOperationScope).toBe('FULL_SOURCE_OPERATION');
});

test('exact rammer manual and immutable snapshot scope confirm while generic all-in scope never confirms',async()=>{
 expect(manualEvidence().operationScope).toBe(RAMMER_SCOPE);
 expect(manualDecision(manualEvidence())?.status).toBe('CONFIRMED_MANUAL');
 expect(snapshotDecision(snapshotEvidence())?.status).toBe('CONFIRMED_SOURCE');
 const allIn={...manualEvidence(),operationScope:'FULL_SOURCE_OPERATION'};
 expect(manualDecision(allIn)?.status).toBe('UNCONFIRMED');
 expect(snapshotDecision({...snapshotEvidence(),operationScope:'FULL_SOURCE_OPERATION'})?.status).toBe('UNCONFIRMED');
 for(const evidence of [undefined,allIn]){
  const r=await compile(facts,{[rammerId]:{unitPrice:'77',titleRu:'Моя ставка пневмотрамбовки',provenance,...(evidence?{machineHourPriceCoverageV1:evidence}:{})}});
  expect(r.rows.find(r=>r.row_id===rammerId)).toMatchObject({quantity:'4.4',unit_price:'77',amount:'338.8',title_ru:'Моя ставка пневмотрамбовки',calculation_trace:{machineHourPriceCoverageV1:{status:'UNCONFIRMED'}}});
  expect(row(r,'worker').quantity).toBe('23');expect(row(r,'equipment:compressor').quantity).toBe('2.2');
 }
 const priced=await compile(facts,{},[{price_key:rammerId,unit_id:'machine_hour',currency_code:'KGS',unit_price:'77',snapshot_id:snapshotId,machine_hour_price_coverage_v1:snapshotEvidence()}]);
 expect(priced.rows.find(r=>r.row_id===rammerId)).toMatchObject({quantity:'4.4',amount:'338.8',calculation_trace:{machineHourPriceCoverageV1:{status:'CONFIRMED_SOURCE'}}});
});

test('manual confirmation rejects wrong scope, bare rental, identity, currency, price, provenance and non-hourly fees',()=>{
 const valid=manualEvidence();
 const invalid:[string,unknown,Partial<Parameters<typeof manualDecision>[1]>][]=[
  ['all-in staff+air package',{...valid,operationScope:'FULL_SOURCE_OPERATION'},{}],
  ['bare rental maintenance unknown',{...valid,operationScope:'BARE_RENTAL_MAINTENANCE_UNCONFIRMED'},{}],
  ['wrong resource',{...valid,resourceCode:'05-0005'},{}],
  ['wrong manual owner',{...valid,source:{kind:'MANUAL',rowId:id('equipment:compressor'),priceProvenanceReason:provenance.reason}},{}],
  ['currency changed',valid,{currencyCode:'USD'}],['price changed',valid,{unitPrice:'78'}],
  ['manual reason changed',valid,{manualProvenanceReason:'different_saved_reason'}],
  ['8h minimum',{...valid,minimumBillableHours:'8'},{}],['callout100',{...valid,fixedFees:'100'},{}],
  ['shift billing',{...valid,billingBasis:'SHIFT'},{}],['day billing',{...valid,billingBasis:'DAY'},{}],
  ['separate normed inputs included',{...valid,separateNormedInputs:'INCLUDED_IN_RATE'},{}],
 ];
 for(const [label,evidence,input] of invalid)expect({label,status:manualDecision(evidence,input)?.status}).toEqual({label,status:'UNCONFIRMED'});
 expect(manualDecision(valid,{unitId:'man_hour'})).toBeNull();
 expect(manualDecision(valid,{catalogId:'canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02'})).toBeNull();
 // A supplier may conceal a fee or falsely declare scope; this API cannot independently inspect the quote.
 // The row declaration and open mobilization/source-reconciliation task remain necessary evidence gates.
});

test('snapshot confirmation rejects all-in or unspecified scope and every immutable identity/price mismatch',()=>{
 const valid=snapshotEvidence();const noScope:Record<string,unknown>={...valid};delete noScope.operationScope;
 const invalid:[string,unknown,Partial<Parameters<typeof snapshotDecision>[1]>][]=[
  ['all-in snapshot',{...valid,operationScope:'FULL_SOURCE_OPERATION'},{}],['unspecified snapshot',noScope,{}],
  ['wrong snapshot ID',valid,{snapshotId:otherSnapshotId}],['wrong price key',valid,{priceKey:'foreign-key'}],
  ['currency mismatch',valid,{currencyCode:'USD'}],['price mismatch',valid,{unitPrice:'78'}],
  ['wrong snapshot source key',{...valid,source:{kind:'SNAPSHOT',snapshotId,priceKey:'foreign-source-key'}},{}],
  ['wrong resource',{...valid,resourceCode:'03-0020'},{}],
 ];
 for(const [label,evidence,input] of invalid)expect({label,status:snapshotDecision(evidence,input)?.status}).toEqual({label,status:'UNCONFIRMED'});
 expect(snapshotDecision(valid,{rowId:id('equipment:compressor')})?.status).toBe('UNCONFIRMED');
 expect(snapshotDecision(valid,{catalogId:'canonical-work:base:earthworks_interior_sand_base_prepare_standard'})).toBeNull();
});

test('legacy road and roof rates retain full source scope; no role-wide equipment-only reinterpretation',()=>{
 const old=[
  {catalogId:'canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02',rowId:'road-upper-base:krer27-04-005-02:equipment:loader',resourceCode:'03-0020',operator:'OPERATOR'},
  {catalogId:'canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02',rowId:'road-upper-base:krer27-04-005-02:equipment:waterBowser',resourceCode:'12-0400',operator:'DRIVER'},
  {catalogId:'canonical-work:base:roofing_interior_flat_roof_install_technical_room',rowId:'roof:torch-two:krer12-002-09:gas_flame_burner',resourceCode:'15-0060',operator:'NO_ADDITIONAL_OPERATOR_NORM'},
 ];
 for(const v of old){
  const evidence=canonicalManualMachineHourPriceCoverageV1({rowId:v.rowId,unitPrice:'77',currencyCode:'KGS'});
  expect(evidence.operationScope).toBe('FULL_SOURCE_OPERATION');expect(canonicalMachineHourPriceRequirementV1(v.rowId,'machine_hour')).toMatchObject({resourceCode:v.resourceCode,operator:v.operator});
  const input={catalogId:v.catalogId,rowId:v.rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',manual:true,manualProvenanceReason:provenance.reason};
  expect(resolveCanonicalMachineHourPriceCoverageV1({...input,evidence})?.status).toBe('CONFIRMED_MANUAL');
  expect(resolveCanonicalMachineHourPriceCoverageV1({...input,evidence:{...evidence,operationScope:RAMMER_SCOPE}})?.status).toBe('UNCONFIRMED');
 }
});

test('manual migration keeps exact new scope but refuses generic all-in confirmation and changed source scope bindings',()=>{
 const d=floorSandUnderlayerDefinitionR1(),bindings=canonicalManualPriceMigrationBindings(d);
 const overrides={[rammerId]:{unitPrice:'77',machineHourPriceCoverageV1:manualEvidence(),provenance}};
 const migration={rowOverrides:overrides,customRows:[],fromBindings:bindings,toBindings:bindings,currency:'KGS'};
 expect(canonicalStoredManualPricesCanMigrate(migration)).toBe(true);
 expect(canonicalStoredManualPricesCanMigrate({...migration,rowOverrides:{[rammerId]:{...overrides[rammerId],machineHourPriceCoverageV1:{...manualEvidence(),operationScope:'FULL_SOURCE_OPERATION'}}}})).toBe(false);
 const oldResources=d.resources.map(r=>r.row_id===rammerId?{...r,source_metadata:{...r.source_metadata,machinePriceOperationScope:'FULL_SOURCE_OPERATION',machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST'}}:r);
 const oldBindings=canonicalManualPriceMigrationBindings({...d,resources:oldResources});
 expect(oldBindings[rammerId]).not.toBe(bindings[rammerId]);
 expect(canonicalStoredManualPricesCanMigrate({...migration,fromBindings:oldBindings})).toBe(false);
 // A scalar may remain stored without acquiring evidence or readiness.
 expect(canonicalStoredManualPricesCanMigrate({...migration,rowOverrides:{[rammerId]:{unitPrice:'77',provenance}}})).toBe(true);
});

test('saved row confirmation reads expected rammer scope and never retroactively confirms a legacy scalar/all-in row',()=>{
 const base={row_id:rammerId,unit_id:'machine_hour',unit_price:'77',currency_code:'KGS',price_source_kind:'MANUAL',
  price_resolution_trace:{kind:'manual_override',provenance}};
 expect(canonicalMachineHourPriceNeedsConfirmationV1(base,catalogId)).toBe(true);
 const confirmed={...base,calculation_trace:{machineHourPriceCoverageV1:{evidence:manualEvidence()}}};
 expect(canonicalMachineHourRowPriceDecisionV1(confirmed,catalogId)?.status).toBe('CONFIRMED_MANUAL');
 expect(canonicalMachineHourPriceNeedsConfirmationV1(confirmed,catalogId)).toBe(false);
 const old={...base,calculation_trace:{machineHourPriceCoverageV1:{evidence:{...manualEvidence(),operationScope:'FULL_SOURCE_OPERATION'}}}};
 expect(canonicalMachineHourRowPriceDecisionV1(old,catalogId)?.status).toBe('UNCONFIRMED');
 expect(canonicalMachineHourPriceNeedsConfirmationV1(old,catalogId)).toBe(true);
});

test('excluding worker/compressor preserves user choices but cannot convert an all-in rammer package into admitted source payment',async()=>{
 const allIn={...manualEvidence(),operationScope:'FULL_SOURCE_OPERATION'};
 const r=await compile(facts,{[id('worker')]:{includedInEstimate:false,includedInProcurement:false,provenance},
  [id('equipment:compressor')]:{includedInEstimate:false,includedInProcurement:false,provenance},
  [rammerId]:{unitPrice:'77',machineHourPriceCoverageV1:allIn,provenance}});
 expect(row(r,'worker')).toMatchObject({quantity:'23',included_in_estimate:false});
 expect(row(r,'equipment:compressor')).toMatchObject({quantity:'2.2',included_in_estimate:false});
 expect(row(r,'equipment:pneumaticRammer')).toMatchObject({quantity:'4.4',calculation_trace:{machineHourPriceCoverageV1:{status:'UNCONFIRMED'}}});
 expect(row(r,'operators')).toMatchObject({quantity:'3',included_in_estimate:false});
 expect(floorSandUnderlayerDefinitionR1().resources).toHaveLength(26);
});

test('definition integrity rejects generic or absent rammer scope instead of inferring it from the no-additional-operator role',()=>{
 const d=floorSandUnderlayerDefinitionR1(),rammer=d.resources.find(r=>r.row_id===rammerId)!;
 const verify=(metadata:Record<string,unknown>|null)=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:rammerId,unitId:'machine_hour',sourceMetadata:metadata});
 expect(verify(rammer.source_metadata)).toMatchObject({resourceCode:'33-0741',operator:'NO_ADDITIONAL_OPERATOR_NORM'});
 const wrong={...rammer.source_metadata,machinePriceOperationScope:'FULL_SOURCE_OPERATION'};
 expect(()=>verify(wrong)).toThrow(expect.objectContaining({code:'DEFINITION_INTEGRITY_FAILED'}));
 const missing={...rammer.source_metadata};delete missing.machinePriceOperationScope;
 expect(()=>verify(missing)).toThrow(expect.objectContaining({code:'DEFINITION_INTEGRITY_FAILED'}));
 expect(parseCanonicalMachineHourPriceCoverageV1({...manualEvidence(),resourceCode:'15-0060'})).toBeNull();
});


// Prospective WORK-only isolation regression: three expanded cases,18 exact foreign-pair assertions.
// This is a test-copy overlay; the frozen floor5/core3 files remain unchanged and unadopted.
const foreignLegacyRoofCatalogsForFloor=[
 'canonical-work:base:roofing_interior_flat_roof_install_technical_room',
 'canonical-work:base:roofing_interior_flat_roof_install_wet_zone',
] as const;
test.each(['definition','manual','snapshot'] as const)(
 'exact floor owners are not admitted under either legacy roof catalog: %s',mode=>{
  const d=floorSandUnderlayerDefinitionR1();
  expect(data.machineCoverageAdmissionRequired.resourceRows).toHaveLength(3);
  for(const expected of data.machineCoverageAdmissionRequired.resourceRows){
   const resource=d.resources.find(r=>r.row_id===expected.rowId)!;
   const manual=canonicalManualMachineHourPriceCoverageV1({rowId:expected.rowId,unitPrice:'77',currencyCode:'KGS'});
   for(const foreignCatalog of foreignLegacyRoofCatalogsForFloor){
    if(mode==='definition'){
     expect(assertCanonicalMachineHourDefinitionV1({catalogId:foreignCatalog,rowId:expected.rowId,
      unitId:resource.unit_id,sourceMetadata:resource.source_metadata})).toBeNull();
    }else{
     const evidence=mode==='manual'?manual:{...manual,source:{kind:'SNAPSHOT' as const,snapshotId,priceKey:expected.rowId}};
     expect(resolveCanonicalMachineHourPriceCoverageV1({catalogId:foreignCatalog,rowId:expected.rowId,
      unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',evidence,manual:mode==='manual',
      manualProvenanceReason:provenance.reason,snapshotId,priceKey:expected.rowId})).toBeNull();
    }
   }
  }
 });
