import {manufacturerDoorFanFactoryKitsPackR1 as pack,manufacturerFactoryParentR1 as parent,manufacturerDoorFanFactoryDefinitionR1 as definition,
 manufacturerFactoryProfilesR1 as profiles,manufacturerDoorFanFactoryCompletenessR1 as completeness,manufacturerFactoryPrimarySelectionR1 as primary} from './manufacturerDoorFanFactoryKitsR1';
import {compileManufacturerFactoryCaseR1 as compile} from '../../../../scripts/estimate/r4a13/prepareManufacturerDoorFanFactoryKitsR1';
import {validateIndependentCompletenessMapReferences as validate,buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {resolvePrimaryMeasureSelectionV1 as choose} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
const selector=pack.selectorId,count=pack.countParameterId;
const cases=pack.targets.flatMap(t=>profiles(t.catalogId).map(p=>({target:t,profile:p})));
const exact=(choice:string,n:number)=>({[selector]:choice,[count]:n});
it.each(pack.targets)('connects every source parameter to actual Master consumers and closes formula inputs: $key',t=>{
 const d=definition(t.catalogId),ids=new Set(d.parameters.map(p=>p.parameter_id)),consumers=buildMasterParameterCalculationConsumers(d);
 expect(d.parameters.filter(p=>!consumers.resourceConsumers[p.parameter_id]?.length).map(p=>p.parameter_id)).toEqual([]);
 for(const formula of d.formulas)expect(formula.input_parameter_ids.filter(id=>!ids.has(id))).toEqual([]);
});
it('rejects a malformed source identifier before building an arithmetic expression',()=>{
 const need=pack.needs.hvac![0]!,original=need.parameterId;
 try{need.parameterId='factory-fan_invalid_quantity';expect(()=>definition(pack.targets.find(t=>t.family==='hvac')!.catalogId)).toThrow('FORMULA_PARAMETER_IDENTIFIER_REQUIRED');}
 finally{need.parameterId=original;}
});
function schema(catalogId:string){const d=definition(catalogId);return d.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,
 visibilityRole:String(p.truth_metadata.visibility_role),valueSourceRole:String(p.truth_metadata.value_source_role),constraints:p.constraints_json!,
 formulaConsumers:d.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)}));}

it.each(pack.targets)('preserves the entire captured explicit legacy branch: $key',async t=>{
 const c=parent(t.catalogId),before=JSON.stringify(c),d=definition(t.catalogId);
 expect(c.definition.id).toBe(t.definitionVersionId);expect(c.definition.definition_sha256).toBe(t.definitionSha256);
 expect([c.parameters.length,c.formulas.length,c.resources.length]).toEqual(t.shape);
 expect(d.formulas.slice(0,c.formulas.length)).toEqual(c.formulas);
 for(const old of c.resources){const r=d.resources.find(r=>r.row_id===old.row_id)!;expect(r.formula_id).toBe(old.formula_id);expect(r.unit_id).toBe(old.unit_id);
  expect(r.cost_owner_id).toBe(old.cost_owner_id);expect(r.resource_graph).toEqual(old.resource_graph);expect(r.source_metadata).toEqual(old.source_metadata);
  expect(r.inclusion_ast).toEqual({kind:'and',operands:[{kind:'equals',parameterId:selector,value:pack.legacyChoice},old.inclusion_ast]});}
 for(const q of [1,100]){const a=await compile(t.catalogId,{q},{},true),b=await compile(t.catalogId,{q,[selector]:pack.legacyChoice});
  expect(b.rows).toEqual(a.rows);expect(b.preliminaryNeeds).toEqual(a.preliminaryNeeds);expect(b.totals).toEqual(a.totals);}
 expect(JSON.stringify(c)).toBe(before);
});
it.each(pack.targets)('requires finite technology selection and exact count without baseline fallback: $key',async t=>{
 const d=definition(t.catalogId),s=d.parameters.find(p=>p.parameter_id===selector)!;
 expect(s.required).toBe(true);expect(s.default_value).toBeNull();expect(d.runtimeInput).toEqual({});
 expect(choose({selectionMetadata:primary(t.catalogId),parameterSchema:schema(t.catalogId),submittedParameters:{q:100}})).toMatchObject({kind:'CLARIFICATION_REQUIRED',reason:'SELECTION_REQUIRED'});
 const missing=await compile(t.catalogId,{q:100}).then(result=>result,()=>null);
 if(missing){expect(missing.rows).toHaveLength(0);expect(missing.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(selector))).toBe(true);}
 await expect(compile(t.catalogId,{q:100,[selector]:'несуществующий заводской профиль'})).rejects.toBeDefined();
 const chosen=profiles(t.catalogId)[0]!,withoutCount=await compile(t.catalogId,{[selector]:chosen.choiceValue}).then(result=>result,()=>null);
 if(withoutCount){expect(withoutCount.rows).toHaveLength(0);expect(withoutCount.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(count))).toBe(true);}
});
it.each(cases)('provides the independently checked factory result at count3: $target.key/$profile.key',async({target:t,profile:p})=>{
 const d=definition(t.catalogId),r=await compile(t.catalogId,{...exact(p.choiceValue,3),q:999}),owner=r.rows.find(r=>r.row_id===p.ownerRowId)!;
 expect(owner.quantity).toBe('3');expect(owner.unit_id).toBe(t.family==='hvac'?'set':'piece');expect(owner.category).toBe('material');expect(owner.included_in_procurement).toBe(true);
 expect(r.rows.filter(r=>r.included_in_procurement)).toHaveLength(1);expect(r.rows.filter(r=>r.included_in_estimate)).toHaveLength(1);
 expect(r.rows.every(r=>r.row_id.startsWith(p.prefix+':'))).toBe(true);
 for(const b of p.bom){const row=r.rows.find(r=>r.row_id===b.rowId)!;expect(row.quantity).toBe(String(3*Number(b.countPerFactoryUnit)));expect(row.unit_id).toBe(b.unitId);
  expect(row.category).toBe(b.category);expect(row.included_in_estimate).toBe(false);expect(row.included_in_procurement).toBe(false);
  expect(d.resources.find(r=>r.row_id===b.rowId)!.cost_owner_id).toBe(p.ownerRowId);
  expect((row.calculation_trace as {resourceGraph:{parentCostOwnerId:string}}).resourceGraph.parentCostOwnerId).toBe(p.ownerRowId);
  expect((row.price_resolution_trace as {priceKey:string}).priceKey).toBe(p.ownerRowId);}
 const needs=pack.needs[t.family]!;expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(needs.map(n=>n.rowId).sort());
 for(const g of needs){const need=r.preliminaryNeeds.find(n=>n.row_id===g.rowId)!;expect(need.quantity).toBeNull();expect(need.category).toBe(g.category);expect(need.unit_id).toBe(g.unitId);}
 expect(validate({completenessMap:completeness(t.catalogId),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 // Independent literal source facts, not generated-row counts.
 if(t.family==='windows_doors'){
  const q=(key:string)=>r.rows.find(r=>r.row_id===p.prefix+':'+key)!.quantity;
  expect(q('leaf')).toBe('3');expect(q('frame')).toBe('3');expect(q('hinges')).toBe('6');expect(q('cylinder-lock')).toBe('3');expect(q('lever-lock')).toBe('3');
  expect(q('cylinder-keys')).toBe('15');expect(q('lever-keys')).toBe('15');expect(q('anti-removal-pins')).toBe('6');expect(p.deliveryBomComplete).toBe(false);
 }else{
  expect(r.rows.find(r=>r.row_id===p.prefix+':seal')!.quantity).toBe('3');expect(r.rows.find(r=>r.row_id===p.prefix+':box')!.quantity).toBe('3');
  expect(r.rows.find(r=>r.row_id===p.prefix+':fixings')!.quantity).toBe('3');expect(r.rows.find(r=>r.row_id===p.prefix+':fixings')!.unit_id).toBe('set');
  const screwdriver=r.rows.find(r=>r.row_id===p.prefix+':setting-screwdriver');expect(screwdriver?.quantity??null).toBe(p.timer?'3':null);expect(screwdriver?.category??null).toBe(p.timer?'equipment':null);
 }
});
it.each(pack.targets)('retains manual legacy edits, prices, totals and ownership: $key',async t=>{
 const id=parent(t.catalogId).resources[0]!.row_id,edit={[id]:{quantity:'7',unitPrice:'120.5',titleRu:'Моё сохранённое изделие',provenance:{kind:'manual',reason:'Saved parent revision'}}},
  a=await compile(t.catalogId,{q:100},edit,true),b=await compile(t.catalogId,{q:100,[selector]:pack.legacyChoice},edit);
 expect(b.rows).toEqual(a.rows);expect(b.totals).toEqual(a.totals);expect(b.rows.find(r=>r.row_id===id)!.quantity).toBe('7');expect(Number(b.rows.find(r=>r.row_id===id)!.amount)).toBe(843.5);
});
it.each(pack.targets)('uses existing NEW_ROOT contract and rejects zero/fractional factory count: $key',async t=>{
 const p=profiles(t.catalogId)[0]!,selected=exact(p.choiceValue,3),parameterSchema=schema(t.catalogId);
 expect(choose({selectionMetadata:primary(t.catalogId),parameterSchema,submittedParameters:selected})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:count,unitId:t.legacyPrimaryUnit}});
 expect(choose({selectionMetadata:primary(t.catalogId),parameterSchema,submittedParameters:selected,parentPrimaryMeasure:{parameterId:'q',unitId:t.legacyPrimaryUnit}})).toMatchObject({kind:'NEW_ROOT_REQUIRED',carryForward:{parameters:false,rowOverrides:false,prices:false}});
 for(const n of [0,-1,1.5])await expect(compile(t.catalogId,exact(p.choiceValue,n))).rejects.toBeDefined();
 const small=await compile(t.catalogId,exact(p.choiceValue,1)),boundary=await compile(t.catalogId,exact(p.choiceValue,1000000));
 expect(small.rows.find(r=>r.row_id===p.ownerRowId)!.quantity).toBe('1');expect(boundary.rows.find(r=>r.row_id===p.ownerRowId)!.quantity).toBe('1000000');
 await expect(compile(t.catalogId,exact(p.choiceValue,1000001))).rejects.toBeDefined();
});
it.each(pack.targets)('rejects category/unit/completeness mutations and prevents another factory payment owner: $key',async t=>{
 const d=definition(t.catalogId),p=profiles(t.catalogId)[0]!,map=completeness(t.catalogId),part=p.bom[0]!;
 for(const field of ['category','unit_id']){const resources=d.resources.map(r=>r.row_id===part.rowId?{...r,[field]:field==='category'?'service':'kg'}:r);
  expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources}).length).toBeGreaterThan(0);}
 expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>r.row_id!==pack.needs[t.family]![0]!.rowId)}).length).toBeGreaterThan(0);
 const resources=d.resources.map(r=>r.row_id===part.rowId?{...r,resource_graph:{...r.resource_graph,costTreatment:'OWN_COST'}}:r);
 expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources}).length).toBeGreaterThan(0);
 const unshared=d.resources.map(r=>r.row_id===part.rowId?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...(r.resource_graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:[]}}}:r);
 expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:unshared}).length).toBeGreaterThan(0);
 const provenance={kind:'manual',reason:'consumer_estimate_row_batch_edit'};
 const priced=await compile(t.catalogId,exact(p.choiceValue,3),{[p.ownerRowId]:{unitPrice:'100',provenance},[part.rowId]:{unitPrice:'999',provenance}});
 expect(Number(priced.totals.amount)).toBe(300);expect(priced.rows.find(r=>r.row_id===part.rowId)!.included_in_estimate).toBe(false);
 await expect(compile(t.catalogId,{...exact(p.choiceValue,3),[pack.needs[t.family]![0]!.parameterId]:1})).rejects.toBeDefined();
});
it('keeps all new public names generic, valid physical descriptors, exact source boundaries and three admitted consumers',()=>{
 expect(pack.targets).toHaveLength(3);expect(pack.profiles).toHaveLength(5);expect(pack.targets.reduce((n,t)=>n+t.profileKeys.length,0)).toBe(9);
 expect(()=>definition('canonical-work:base:doors_windows_interior_entry_door_install_technical_room')).toThrow(/EXACT_CURRENT_TARGET/);
 for(const t of pack.targets){const old=new Set(parent(t.catalogId).resources.map(r=>r.row_id));for(const r of definition(t.catalogId).resources.filter(r=>!old.has(r.row_id))){
  expect(r.title_ru).not.toMatch(/TOREX|DELTA|VENTS|Quiet|2477479|V233/iu);expect(parseCanonicalPublicResourcePresentationV1(r.resource_graph.publicResourcePresentationV1)).toBeTruthy();
  expect((r.resource_graph.publicResourcePresentationV1 as {detailsRu:unknown[]}).detailsRu).toEqual([]);}
  for(const p of profiles(t.catalogId)){expect(p.choiceValue).not.toMatch(/TOREX|DELTA|VENTS|Quiet|2477479/iu);expect(p.factoryResultComplete).toBe(true);}
  expect(completeness(t.catalogId).fullTechnicalAcceptance).toBe(false);}
});

it.each(cases)('binds unresolved resources to real authored stages without closing needs or duplicating BOM owners: $target.key/$profile.key',async({target:t,profile:p})=>{
 const d=definition(t.catalogId),r=await compile(t.catalogId,exact(p.choiceValue,3)),separate=new Set(['opening-preparation','reveals-trims','duct-interface','delivery-handling','cleanup-waste','packaging-protection']);
 for(const need of pack.needs[t.family]!){
  const row=d.resources.find(row=>row.row_id===need.rowId)!,actual=r.preliminaryNeeds.find(n=>n.row_id===need.rowId)!,op=row.resource_graph.operationCompositionV1 as {operationId:string;operationTitleRu:string};
  expect(op.operationId).toBe(separate.has(need.key)?need.operationId:p.useOperationId);
  if(!separate.has(need.key))expect(op.operationTitleRu).toBe(t.family==='hvac'?'Установка и подключение вытяжного вентилятора':'Установка и регулировка дверного блока');
  expect(actual.quantity).toBeNull();expect(actual.category).toBe(need.category);expect(actual.unit_id).toBe(need.unitId);
  const kind=(row.resource_graph.publicResourcePresentationV1 as {resourceKind:string}).resourceKind;
  expect(['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','LABOR','SERVICE','TRANSPORT','PPE']).toContain(kind);
  if(['drill','perforator','screwdriver','powered-screwdriver','screwdrivers','marking-pencil','electrical-tools','hammer','level','nail-puller','measuring-tape','knife','sprayer'].includes(need.key))expect(kind).toBe('TOOL');
  if(need.key==='drill-bit')expect(kind).toBe('ACCESSORY');
  if(need.key==='ppe')expect(kind).toBe('PPE');
  if(need.key==='delivery-handling')expect(kind).toBe('TRANSPORT');
  if(need.key==='cleanup-waste')expect(kind).toBe('SERVICE');
  if(['opening-preparation','installation-labour'].includes(need.key))expect(kind).toBe('LABOR');
  expect(row.formula_id).toBe(need.formulaId);expect(row.unit_id).toBe(need.unitId);expect(row.category).toBe(need.category);
  if(!separate.has(need.key)&&need.operationId!==p.useOperationId){
   const resources=d.resources.map(candidate=>candidate.row_id===need.rowId?{...candidate,resource_graph:{...candidate.resource_graph,operationCompositionV1:{...op,operationId:need.operationId}}}:candidate);
   expect(validate({completenessMap:completeness(t.catalogId),formulaDefinitions:d.formulas,resourceDefinitions:resources}).length).toBeGreaterThan(0);
  }
 }
 expect(r.rows.filter(row=>row.included_in_estimate).map(row=>row.row_id)).toEqual([p.ownerRowId]);
 expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id)).toEqual([p.ownerRowId]);
 for(const b of p.bom){expect(d.resources.find(row=>row.row_id===b.rowId)!.cost_owner_id).toBe(p.ownerRowId);expect(r.rows.find(row=>row.row_id===b.rowId)!.quantity).toBe(String(3*Number(b.countPerFactoryUnit)));}
 expect(validate({completenessMap:completeness(t.catalogId),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
});