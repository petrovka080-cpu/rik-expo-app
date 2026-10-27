import screed15 from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import {ROOF_SCREED25_PACK_V1 as pack} from './canonicalRoofScreed25CompanionV1';
import {buildRoofScreed25StandaloneSuccessorV1 as build,ROOF_SCREED25_STANDALONE_BINDING_V1 as binding,
  ROOF_SCREED25_STANDALONE_BINDING_SHA_V1 as bindingSha,roofScreed25StandaloneInactiveParameterIdsV1 as inactive} from './canonicalRoofScreed25StandaloneV1';
import {buildRoofScreed25StandaloneMigrationProofV1 as proof,admitRoofScreed25StandaloneMigrationProofV1 as admit} from './canonicalRoofScreed25StandaloneMigrationV1';
import {ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1 as base15,ROOF_SCREED15_SUPPORTED_BASE_V1,ROOF_SCREED15_LOOSE_FILL_BASE_V1} from './canonicalRoofScreedDirectBaseV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,
  assertCanonicalStoredManualPriceReleaseMigration} from './canonicalManualPriceReleaseMigration';
import {assertCanonicalCompositionSelectionReleaseMigrationV1} from './canonicalEstimateCompositionSelectionV1';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalManualMachineHourPriceCoverageV1,canonicalMachineHourRowPriceDecisionV1} from './canonicalMachineHourPriceCoverageV1';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/roof-screed25-five-parents-s27-69.json') as {reps:any[]};
const targets=fixture.reps,p25=pack.prefix,p15=screed15.prefix,op=(prefix:string)=>JSON.stringify([prefix,`${prefix}:installation`]);
const select=(ops:string[]=[],rows:string[]=[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedOperationKeys:ops,excludedRowIds:rows});
const facts25={q:'20',[screed15.systemParameterId]:binding.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const facts15={q:'20',[screed15.systemParameterId]:screed15.systemYesRu,[screed15.conditionsParameterId]:screed15.conditionsYesRu,[screed15.areaParameterId]:screed15.areaYesRu};
const successor=(parent=targets[0])=>build(parent,{roof:'CONTROL_SOURCE',design:'CONTROL_DESIGN'}).representative;
const compile=(r:any,parameters:any,extra:any={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:r.definition.catalog_id,
  compilerVersion:binding.contract,parameterDefinitions:r.parameters,formulaDefinitions:r.formulas,resourceDefinitions:r.resources,
  submittedParameters:parameters,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:137,
  hashJson:async v=>estimateDeterministicHash(v),...extra});
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
function migration(index=0){const from=targets[index],to=successor(from),i={from,to,fromDefinition:identity(from),
  toDefinition:{id:`00000000-0000-5000-8000-00000000000${index}`,catalogId:from.definition.catalog_id,sha256:'a'.repeat(64)}};
  return {...i,proof:proof(i)};}
const oracle:Record<string,string>={workers:'7.444',included_machine_operators:'0.448',tower_crane_8t:'0.156',forklift_5t:'0.292',mortar_pump:'0.472',water:'0.77',roofing_felt:'0.88',ready_cement_mortar_m100:'0.51'};

test.each(targets.map((r,i)=>[r.definition.catalog_id,i]))('five existing own-q bindings reuse accepted quantities and preserve all owners: %s',async(_catalog,index)=>{
 const old=targets[index],before=JSON.stringify(old),r=successor(old),result=await compile(r,facts25);
 expect(JSON.stringify(old)).toBe(before);expect(r.resources).toHaveLength(137);expect(r.parameters).toHaveLength(67);expect(r.formulas).toHaveLength(135);
 expect(r.formulas.slice(0,127)).toEqual(old.formulas);expect(r.resources.slice(0,127).map((x:any)=>[x.id,x.row_id,x.cost_owner_id,x.formula_id,x.unit_id])).toEqual(old.resources.map((x:any)=>[x.id,x.row_id,x.cost_owner_id,x.formula_id,x.unit_id]));
 expect(r.parameters.find((p:any)=>p.parameter_id==='q')).toMatchObject({unit_id:'m2',default_value:null});
 expect(r.parameters.some((p:any)=>p.parameter_id===pack.measurementParameterId)).toBe(false);
 for(const [role,q]of Object.entries(oracle))expect(result.rows.find(x=>x.row_id===p25+':'+role)?.quantity).toBe(q);
 expect(result.rows.filter(x=>x.included_in_estimate)).toHaveLength(7);expect(result.rows.some(x=>x.row_id.startsWith(p15+':')&&x.included_in_estimate)).toBe(false);
 expect(result.preliminaryNeeds.some(x=>x.row_id.endsWith(':remaining:scope_pending'))).toBe(false);
 expect(result.preliminaryNeeds.filter(x=>x.row_id.includes(':remaining:'))).toHaveLength(59);
 expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
});

test('different real sections retain their separate q; known values and dormant fifteen facts do not select twenty-five',async()=>{
 const r=successor(),a=await compile(r,facts25),b=await compile(r,{...facts25,...facts15,[screed15.systemParameterId]:binding.systemYesRu,q:'40'});
 expect(a.rows.find(x=>x.row_id===p25+':ready_cement_mortar_m100')?.quantity).toBe('0.51');
 expect(b.rows.find(x=>x.row_id===p25+':ready_cement_mortar_m100')?.quantity).toBe('1.02');
 const unknown=await compile(r,{...facts25,[screed15.systemParameterId]:screed15.unknownChoiceRu});expect(unknown.rows.some(x=>x.included_in_estimate)).toBe(false);
});

test.each([pack.areaParameterId,pack.conditionsParameterId])('missing or unsupported %s cannot supply quantities or revive legacy',async key=>{
 const r=successor();for(const value of [undefined,'Нужен другой расчёт']){const facts:any={...facts25,[key]:value};if(value===undefined)delete facts[key];
  // An unsupported enum is rejected; a missing fact remains an explicit draft gap.
  if(value!==undefined&&key===pack.areaParameterId){await expect(compile(r,facts)).rejects.toThrow();continue;}
  const result=await compile(r,facts);expect(result.rows.some(x=>x.included_in_estimate)).toBe(false);expect(result.preliminaryNeeds.some(x=>x.row_id.startsWith(p25+':'))).toBe(true);
 }
});

test('fifteen on loose fill is blocked; supported own base preserves accepted fifteen rates',async()=>{
 const r=successor(),missing=await compile(r,facts15);expect(missing.rows.some(x=>x.included_in_estimate)).toBe(false);
 expect(missing.preliminaryNeeds.find(x=>x.row_id.endsWith('standalone-direct-base-check'))?.missing_parameter_ids).toEqual([base15]);
 const invalid=await compile(r,{...facts15,[base15]:ROOF_SCREED15_LOOSE_FILL_BASE_V1});expect(invalid.rows.some(x=>x.included_in_estimate)).toBe(false);
 const valid=await compile(r,{...facts15,[base15]:ROOF_SCREED15_SUPPORTED_BASE_V1});expect(valid.rows.find(x=>x.row_id===p15+':ready_cement_mortar_m100')?.quantity).toBe('0.306');
 expect(valid.rows.filter(x=>x.included_in_estimate)).toHaveLength(7);
});

test('operation exclude/restore is allowed without removing the non-excludable base check; partial resource or price exclusion keeps that check',async()=>{
 const r=successor(),excluded=await compile(r,facts15,{compositionSelectionV1:select([op(p15)])});
 expect(excluded.rows.filter(x=>x.included_in_estimate)).toHaveLength(0);
 const scope=[...excluded.rows,...excluded.preliminaryNeeds].find(x=>x.row_id.endsWith('standalone-direct-base-check'))!;
 const graph=(scope as any).resource_graph??(scope as any).calculation_trace?.resourceGraph;
 expect(graph.scopeRequirementDecisionV1.status).toBe('NOT_APPLICABLE');
 const restored=await compile(r,facts15,{compositionSelectionV1:select()});expect(restored.preliminaryNeeds.find(x=>x.row_id.endsWith('standalone-direct-base-check'))?.missing_parameter_ids).toEqual([base15]);
 const partial=await compile(r,facts15,{compositionSelectionV1:select([], [p15+':workers'])});expect(partial.preliminaryNeeds.find(x=>x.row_id.endsWith('standalone-direct-base-check'))?.missing_parameter_ids).toEqual([base15]);
 await expect(compile(r,facts15,{compositionSelectionV1:select([],[p15+':standalone-direct-base-check'])})).rejects.toMatchObject({code:'COMPOSITION_SELECTION_INVALID'});
});

test.each(targets.map((r,i)=>[r.definition.catalog_id,i]))('finite proof preserves all127 historic price/exclusion bindings and operation membership: %s',(_catalog,index)=>{
 const i=migration(index),a=admit(i)!;expect(a).not.toBeNull();const oldPrices=prices(i.from),oldExclusions=exclusions(i.from);
 expect(Object.keys(oldPrices)).toHaveLength(127);expect(Object.keys(oldExclusions)).toHaveLength(127);
 const nextPrices=prices(a.normalizedTo),nextExclusions=exclusions(a.normalizedTo);
 for(const id of Object.keys(oldPrices)){expect(nextPrices[id]).toBe(oldPrices[id]);expect(nextExclusions[id]).toBe(oldExclusions[id]);}
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:select([op(p15)],[p15+':water']),from:i.from,to:a.normalizedTo})).not.toThrow();
 const overrides={[p15+':water']:{unitPrice:'12',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'control'}}};
 expect(()=>assertCanonicalStoredManualPriceReleaseMigration({parentOverrides:overrides,requestedOverrides:overrides,parentCustomRows:[],requestedCustomRows:[],fromBindings:oldPrices,toBindings:prices(a.normalizedTo),fromExclusionBindings:oldExclusions,toExclusionBindings:exclusions(a.normalizedTo),parentCurrency:'KGS',requestedCurrency:'KGS'})).not.toThrow();
});

test.each(['formula','baseGuard','residualGuard','source','priceOwner','parameter','scopeOperation','duplicate'])('fresh proof digests cannot endorse unintended %s mutation',kind=>{
 const i=migration(),r:any=i.to;
 if(kind==='formula')r.formulas[0].ast={kind:'literal',value:'999'};
 if(kind==='baseGuard')r.resources.find((x:any)=>x.row_id===p15+':workers').inclusion_ast={kind:'literal',value:true};
 if(kind==='residualGuard')r.resources.find((x:any)=>x.row_id.includes(':remaining:')&&!x.row_id.endsWith('scope_pending')).inclusion_ast={kind:'literal',value:true};
 if(kind==='source')r.resources.find((x:any)=>x.row_id===p25+':workers').source_metadata.normativeRatePer100M2='99';
 if(kind==='priceOwner')r.resources[0].cost_owner_id='another-site';
 if(kind==='parameter')r.parameters.find((p:any)=>p.parameter_id==='q').unit_id='m3';
 if(kind==='scopeOperation')r.resources.find((x:any)=>x.row_id.endsWith('standalone-direct-base-check')).resource_graph.operationCompositionV1=r.resources.find((x:any)=>x.row_id===p15+':workers').resource_graph.operationCompositionV1;
 if(kind==='duplicate')r.resources[1].row_id=r.resources[0].row_id;
 i.proof=proof(i);expect(admit(i)).toBeNull();
});

test('verified projection hides only excluded operation facts; forged marker/older version and partial row exclusion do not hide facts',()=>{
 const input={catalogId:targets[0].definition.catalog_id,definitionVersion:5,metadata:{roofScreed25StandaloneBindingV1:bindingSha},selection:select([op(p25)])};
 expect(inactive(input)).toEqual([pack.conditionsParameterId,pack.areaParameterId]);
 expect(inactive({...input,selection:select([op(p15)])})).toEqual(expect.arrayContaining([base15,screed15.conditionsParameterId,screed15.areaParameterId]));
 expect(inactive({...input,metadata:{roofScreed25StandaloneBindingV1:'bad'}})).toEqual([]);expect(inactive({...input,definitionVersion:4})).toEqual([]);
 expect(inactive({...input,selection:select([],[p25+':workers'])})).toEqual([]);
});

test('new twenty-five machine price requires composition evidence; scalar values/currency persist and old standalone fifteen reads remain unchanged',async()=>{
 const r=successor(),id=p25+':tower_crane_8t',override={unitPrice:'100',provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}};
 const scalar=await compile(r,facts25,{rowOverrides:{[id]:override}}),row=scalar.rows.find(x=>x.row_id===id)!;
 expect(row).toMatchObject({unit_price:'100',currency_code:'KGS'});expect(canonicalMachineHourRowPriceDecisionV1(row,r.definition.catalog_id)?.status).toBe('UNCONFIRMED');
 const confirmed=await compile(r,facts25,{rowOverrides:{[id]:{...override,machineHourPriceCoverageV1:canonicalManualMachineHourPriceCoverageV1({rowId:id,unitPrice:'100',currencyCode:'KGS'})}}});
 expect(canonicalMachineHourRowPriceDecisionV1(confirmed.rows.find(x=>x.row_id===id)!,r.definition.catalog_id)?.status).toBe('CONFIRMED_MANUAL');
 expect(canonicalMachineHourRowPriceDecisionV1({row_id:p15+':tower_crane_8t',unit_id:'machine_hour',unit_price:'100',currency_code:'KGS'},r.definition.catalog_id)).toBeNull();
});
