import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {buildKerbObjectScopeDefinitionS2754} from '../../../src/lib/estimate/v4/concreteKerbOtherObjectScopeS2754';
import {concreteKerbSourcePackS2754,ownKerbMachinesS2754,hiredKerbMachinesS2754} from '../../../src/lib/estimate/v4/concreteKerbInstallationS2754';
import {kerbSupplyIdentityDefinitionS2758,compileKerbSupplyIdentityS2758,kerbSupplyMaterialKeysS2758} from '../../../src/lib/estimate/v4/concreteKerbSupplyIdentityS2758';
import {precastRcTrayPackS2758 as pack,precastRcTrayPrefixS2758 as prefix,precastRcTrayDefinitionS2758,precastRcTrayCompletenessMapS2758,
  compilePrecastRcTrayS2758,ownTrayMachinesS2758,hiredTrayMachinesS2758} from '../../../src/lib/estimate/v4/precastRcEmbankmentRunoffTrayS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

const physical=(r:Awaited<ReturnType<typeof compilePrecastRcTrayS2758>>)=>r.rows.map(x=>[x.row_id,x.quantity,x.unit_id,x.included_in_procurement,x.included_in_estimate,x.unit_price,x.amount]);
export function trayControlS2758():Record<string,unknown>{return {length_m:35.5,construction_scope_conditions:pack.scopeValue,
  tray_route_project_reference:'CONTROL_ONLY: проектная линия на откосе, ручная траншея, щебёночная подготовка и ЖБ элементы; не данные объекта',mechanism_fulfillment:ownTrayMachinesS2758};}
export function traySupplyControlS2758():Record<string,unknown>{const input=trayControlS2758();
  for(const [k,q] of Object.entries({crushed_stone:0.01,mortar:0.001,precast_rc:0.01}))Object.assign(input,{[k+'_stock']:0,[k+'_reserve']:0,[k+'_quantum']:q,
    [k+'_supply_specification']:'CONTROL_ONLY: '+pack.resources.find(r=>r.id===k)!.nameRu+' по проекту и фактической поставке; не данные объекта',[k+'_supply_unit']:pack.unitValue});return input;}
export function kerbSupplyControlS2758(index:0|1):Record<string,unknown>{const old=buildKerbObjectScopeDefinitionS2754(index);
  const input:Record<string,unknown>={kerb_length_m:35.5,covering_kind:concreteKerbSourcePackS2754.types[index].coveringValue,
    prepared_installation_line:concreteKerbSourcePackS2754.preparedLineValue,mechanism_fulfillment:ownKerbMachinesS2754,
    construction_scope_conditions:(old.parameters.find(p=>p.parameter_id==='construction_scope_conditions')!.constraints_json!.values as string[])[0],
    mortar_supply_specification:'CONTROL_ONLY: готовый цементный кладочный раствор М100 по фактической поставке; не данные объекта'};
  for(const id of ['kerb_stone_specification','concrete_mix_specification','formwork_timber_specification','formwork_nails_specification'])input[id]='CONTROL_ONLY: проектная и поставочная спецификация; не данные объекта';
  for(const [k,q] of Object.entries({concrete:0.1,mortar:0.001,timber:0.01,nails:1,stone:1}))Object.assign(input,{[k+'_stock']:0,[k+'_reserve']:0,[k+'_quantum']:q});return input;}

export async function verifyTrayS2758(){
  for(const s of [pack.source,pack.guidance])assert.equal(createHash('sha256').update(readFileSync(s.localArtifact)).digest('hex'),s.sha256);
  assert.equal(pack.resources.find(r=>r.id==='crushed_stone')!.nameRu,'Щебень из природного камня, фракция 20–40 мм, марка 400');
  assert.equal(pack.resources.find(r=>r.id==='crushed_stone')!.resourceCode,null);
  const d=precastRcTrayDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[31,28,28]);assert.deepEqual(d.runtimeInput,{});assert(d.parameters.every(p=>p.default_value==null));
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:precastRcTrayCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  const base=await compilePrecastRcTrayS2758(trayControlS2758());assert.equal(base.rows.length,13);assert.equal(base.preliminaryNeeds.length,9);
  // Independent printed table/arithmetic, not expectations derived from row formulas.
  for(const [id,quantity] of Object.entries({labor:'60.3145','operator-own':'15.3715','crane-own':'14.79285','forklift-own':'0.1775','compressor-own':'0.40115','pneumatic_tamper-own':'0.8023','truck-own':'0.2201','crushed_stone-consumed':'2.698','mortar-consumed':'0.01633','precast_rc-consumed':'1.6401'}))assert.equal(base.rows.find(r=>r.row_id===prefix+':'+id)?.quantity,quantity,id);
  const supply=traySupplyControlS2758(),own=await compilePrecastRcTrayS2758(supply),hired=await compilePrecastRcTrayS2758({...supply,mechanism_fulfillment:hiredTrayMachinesS2758});
  assert.equal(own.rows.length,16);assert.equal(own.preliminaryNeeds.length,6);assert.equal(own.rows.filter(r=>r.included_in_procurement).length,3);
  assert.equal(hired.rows.length,16);assert.equal(hired.preliminaryNeeds.length,6);assert.equal(hired.rows.filter(r=>r.included_in_procurement).length,8);assert(!hired.rows.some(r=>r.row_id.endsWith('-own')));
  for(const [k,q] of Object.entries({crushed_stone:'2.7',mortar:'0.017',precast_rc:'1.65'}))assert.equal(own.rows.find(r=>r.row_id===prefix+':'+k)?.quantity,q);
  for(const result of [own,hired]){assert.equal(result.rows.filter(r=>r.category==='equipment').length,5);assert(result.rows.filter(r=>r.row_id.includes(':operator-')||pack.operations.some(op=>r.row_id===prefix+':'+op.id)).every(r=>!r.included_in_estimate&&r.unit_price===null));assert(result.rows.every(r=>r.unit_price===null));}
  for(const r of d.resources.filter(r=>r.row_id.includes(':operator-'))){assert.equal(r.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(r.resource_graph.includedInResourceOwnerRowId,undefined);assert.equal(r.resource_graph.parentCostOwnerId,undefined);}
  for(const id of ['construction_scope_conditions','tray_route_project_reference'])assert.equal((await compilePrecastRcTrayS2758({...supply,[id]:undefined})).rows.length,0);
  for(const k of ['crushed_stone','mortar','precast_rc']){
    for(const suffix of ['supply_specification','supply_unit','quantum']){const result=await compilePrecastRcTrayS2758({...supply,[k+'_'+suffix]:undefined});assert(!result.rows.some(r=>r.row_id===prefix+':'+k));assert(result.rows.some(r=>r.row_id===prefix+':'+k+'-consumed'));}
    const positive={...supply,[k+'_stock']:0.001},missing=await compilePrecastRcTrayS2758(positive);assert(!missing.rows.some(r=>r.row_id===prefix+':'+k));
    const known=await compilePrecastRcTrayS2758({...positive,[k+'_stock_compatibility_reference']:'CONTROL_ONLY: пригодность и соответствие проверены по документу'});assert(known.rows.some(r=>r.row_id===prefix+':'+k));
  }
  for(const bad of [{construction_scope_conditions:'Реконструкция'},{precast_rc_supply_unit:'шт.'},{crushed_stone_quantum:0},{open_scope_qty_curing:1},{mortar_supply_specification:''}])await assert.rejects(()=>compilePrecastRcTrayS2758({...supply,...bad}));
  return {status:'GREEN_SOURCE_CORE_PARTIAL_004_TRAY',shape:[31,28,28],normative:[13,9,0],own:[16,6,3],hired:[16,6,8],printedRatesIndependentlyVerified:true,grade400:true,halfRoadTrafficCoefficientExcluded:true,
    starredRcProjectSpecificationRequired:true,rcPrintedQuantityPreserved:true,pieceConversionNotInvented:true,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}

export async function verifyKerbSupplyS2758(index:0|1){
  const d=kerbSupplyIdentityDefinitionS2758(index),old=buildKerbObjectScopeDefinitionS2754(index),input=kerbSupplyControlS2758(index),prefix='concrete-kerb:'+concreteKerbSourcePackS2754.types[index].key;
  assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[41,27,27]);assert.deepEqual(d.formulas,old.formulas);assert.deepEqual(d.parameters.slice(0,35),old.parameters);
  for(const r of old.resources.filter(r=>!kerbSupplyMaterialKeysS2758.some(k=>r.row_id===prefix+':'+k)))assert.deepEqual(d.resources.find(x=>x.row_id===r.row_id),r);
  const runOld=(input:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:concreteKerbSourcePackS2754.types[index].catalogId,compilerVersion:'PROTECTED_OLD_V3_CONTROL',primaryMeasureParameterId:'kerb_length_m',definition:old,submittedParameters:input});
  const {mortar_supply_specification:_supply,...oldInput}=input;
  const own=await compileKerbSupplyIdentityS2758(index,input);assert.deepEqual(physical(own),physical(await runOld(oldInput)));assert.equal(own.rows.length,18);assert.equal(own.preliminaryNeeds.length,6);
  const positive={...input,...Object.fromEntries(kerbSupplyMaterialKeysS2758.map(k=>[k+'_stock',0.001]))},blocked=await compileKerbSupplyIdentityS2758(index,positive);assert.equal(blocked.rows.length,13);assert.equal(blocked.rows.filter(r=>r.included_in_procurement).length,0);
  const refs=Object.fromEntries(kerbSupplyMaterialKeysS2758.map(k=>[k+'_stock_compatibility_reference','CONTROL_ONLY: остаток пригоден и соответствует спецификации']));
  const full=await compileKerbSupplyIdentityS2758(index,{...positive,...refs});assert.equal(full.rows.length,18);assert.equal(full.preliminaryNeeds.length,6);
  for(const k of kerbSupplyMaterialKeysS2758){const r=await compileKerbSupplyIdentityS2758(index,{...positive,...refs,[k+'_stock_compatibility_reference']:undefined});assert.equal(r.rows.length,17);assert(r.rows.some(x=>x.row_id===prefix+':'+k+'-consumed'));}
  const noMortar=await compileKerbSupplyIdentityS2758(index,oldInput);assert.equal(noMortar.rows.length,17);assert(noMortar.rows.some(r=>r.row_id===prefix+':mortar-consumed'));
  const hired=await compileKerbSupplyIdentityS2758(index,{...input,mechanism_fulfillment:hiredKerbMachinesS2754});assert.equal(hired.rows.filter(r=>r.included_in_procurement).length,7);
  assert.equal((await compileKerbSupplyIdentityS2758(index,{...input,construction_scope_conditions:undefined})).rows.length,0);
  for(const bad of [{mortar_supply_specification:''},{concrete_stock_compatibility_reference:''},{mortar_quantum:0},{open_scope_qty_concrete_curing:1}])await assert.rejects(()=>compileKerbSupplyIdentityS2758(index,{...positive,...refs,...bad}));
  return {status:'GREEN_TWO_OLD_KERB_PURCHASE_IDENTITY_SUCCESSOR',column:concreteKerbSourcePackS2754.types[index].column,shape:[41,27,27],own:[18,6,5],hiredBuyer:7,
    all27FormulasAnd22OtherResourcesUnchanged:true,positiveStockWithoutReferences:[13,11,0],sixCompletionQuantityGapsClosed:0,fullTechnicalAcceptance:false};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758TrayKerbSupplyWave.ts'))void Promise.all([verifyTrayS2758(),verifyKerbSupplyS2758(0),verifyKerbSupplyS2758(1)]).then(results=>process.stdout.write(JSON.stringify(results,null,2)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
