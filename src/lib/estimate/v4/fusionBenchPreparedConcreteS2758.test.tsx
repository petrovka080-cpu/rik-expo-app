import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {fusionBenchPackS2758 as pack,fusionBenchPrefixS2758 as prefix,fusionBenchDefinitionS2758,compileFusionBenchS2758,
  includedBenchFixingsS2758,separateBenchFixingsS2758} from './fusionBenchPreparedConcreteS2758';
import {fusionBenchControlS2758,verifyFusionBenchS2758} from '../../../../scripts/estimate/r4a13/preflightS2758FusionBench';
import {buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalBaselinePlan} from '../../../features/consumerRepair/consumerCanonicalBaselineCompile';
import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {ParameterDisclosurePanel} from '../../../features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
function catalog():CanonicalEstimateCatalogItem{
  const d=fusionBenchDefinitionS2758(),c=buildMasterParameterCalculationConsumers(d);
  return {catalogId:pack.catalogId,titleRu:pack.titleRu,releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'landscape',
    workKey:pack.workKey,definitionVersion:1,applicability:{primaryMeasureParameterId:'bench_count'},professionalMetadata:{},
    parameterSchema:d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,unknown>;return {
      parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,
      constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,
      semanticParameterKey:t.semantic_parameter_key,provenance:t.provenance,requiredWhen:t.required_when,
      formulaConsumers:c.formulaConsumers[p.parameter_id],resourceBranchConsumers:c.resourceConsumers[p.parameter_id],
      guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
        sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,
        applicability:g.applicability,verifiedAt:g.verified_at}} as CanonicalEstimateCatalogItem['parameterSchema'][number];})};
}
function session(parameters:Record<string,unknown>){return buildConsumerCanonicalPrecompileParameterSession({catalog:catalog(),draftId:'bench-prepublication',
  parameters:parameters as Record<string,string|number>,userExplicitParameterIds:Object.keys(parameters),missingParameterIds:[]});}

it('admits only exact manufacturer physical composition, never unknown labour/tool quantities',async()=>{
  expect(await verifyFusionBenchS2758()).toMatchObject({shape:[25,13,13],included:[3,8,1],separate:[4,8,2],acceptedCompleteTypes:0});
});

// Independent N3/N11 arithmetic controls frozen before generating the definition.
it.each([
  [3,false,false,0,0,1,3,0,0,1,0], [3,false,true,1,1,2,4,0,0,1,0],
  [3,true,false,0,0,1,3,0,0,4,12], [3,true,true,1,1,2,4,5,2,4,12],
  [11,false,false,0,0,1,11,0,0,1,0], [11,false,true,2,1,3,12,0,0,1,0],
  [11,true,false,0,0,1,11,0,0,4,44], [11,true,true,2,1,3,12,10,2,8,40],
] as const)('keeps installed N%s / separate%s / compatible stock%s distinct from rounded orders',async(n,separate,positive,stock,reserve,q,ordered,fixStock,fixReserve,fixQ,fixOrder)=>{
  const input={...fusionBenchControlS2758(n,separate),bench_stock:stock,bench_reserve:reserve,bench_quantum:q,
    ...(positive?{bench_stock_compatibility_reference:'CONTROL_ONLY: точные пригодные полные комплекты; включённый крепёж подтверждён'}:{}),
    ...(separate?{fixing_stock:fixStock,fixing_reserve:fixReserve,fixing_quantum:fixQ,
      ...(positive?{fixing_stock_compatibility_reference:'CONTROL_ONLY: штатные пригодные совместимые узлы'}:{})}:{})};
  const result=await compileFusionBenchS2758(input),byId=new Map(result.rows.map(r=>[r.row_id,r]));
  expect(byId.get(prefix+':bench-consumed')?.quantity).toBe(String(n));
  expect(byId.get(prefix+':bench-order')?.quantity).toBe(String(ordered));
  expect(byId.get(prefix+':'+(separate?'fixing-consumed-separate':'fixing-included'))?.quantity).toBe(String(n*4));
  expect(byId.get(prefix+':fixing-order')?.quantity).toBe(separate?String(fixOrder):undefined);
  expect(result.preliminaryNeeds).toHaveLength(8);
  expect(result.rows.filter(r=>r.included_in_procurement)).toHaveLength(separate?2:1);
  if(!separate){const included=byId.get(prefix+':fixing-included')!;expect(included.included_in_estimate).toBe(false);
    expect(included.included_in_procurement).toBe(false);expect(included.unit_price).toBeNull();}
});

it.each(['3 шт','3шт.','3 штуки'])('binds ordinary short input %s solely to the installed bench count',tail=>{
  const plan=buildCanonicalBaselinePlan({catalog:catalog(),prompt:pack.titleRu+' '+tail});
  expect(plan.parameters.bench_count).toBe('3');
  expect(plan.parameters).not.toHaveProperty('bench_stock');expect(plan.parameters).not.toHaveProperty('fixing_stock');
  expect(plan.parameters).not.toHaveProperty('anchor_supply_scope');
  expect(buildCanonicalBaselinePlan({catalog:catalog(),prompt:pack.titleRu+' '+tail,parameterOverrides:{bench_count:4}}).parameters.bench_count).toBe(4);
});

it.each([false,true])('exposes every applicable ordinary field, supply choice and stock reference before publication (separate=%s)',separate=>{
  const input=fusionBenchControlS2758(3,separate),s=session(input);
  const ids=buildCanonicalParameterCards({session:s,revision:null}).filter(c=>c.editable).map(c=>c.key);
  expect(ids).toHaveLength(separate?13:9);
  expect(ids).toContain('bench_count');expect(ids).toContain('available_concrete_depth_mm');expect(ids).toContain('minimum_anchor_edge_distance_mm');
  expect(ids).toContain('actual_bench_supply_specification');expect(ids).toContain('anchor_supply_scope');
  expect(ids.some(id=>id.startsWith('open_scope_qty_')||id.startsWith('effective_resource_quantity_'))).toBe(false);
  const positive={...input,bench_stock:1,...(separate?{fixing_stock:1}:{})};
  const active=session(positive),cards=buildCanonicalParameterCards({session:active,revision:null});
  expect(cards.filter(c=>c.editable)).toHaveLength(separate?15:10);
  expect(cards.find(c=>c.key==='bench_stock_compatibility_reference')?.editable).toBe(true);
  expect(cards.some(c=>c.key==='fixing_stock_compatibility_reference')).toBe(separate);
  const patched=consumerCanonicalPrecompileParameterOverrides({session:active,patches:[
    {operation:'set_param',paramKey:'bench_stock_compatibility_reference',rawValue:'CONTROL_ONLY: точные полные комплекты'},
    ...(separate?[{operation:'set_param',paramKey:'fixing_stock_compatibility_reference',rawValue:'CONTROL_ONLY: совместимые узлы'}]:[]),
  ] as never});
  expect(session(patched).parameters.find(p=>p.parameterId==='bench_stock_compatibility_reference')?.value).toContain('полные комплекты');
  const onApply=jest.fn();let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={active}
    latestDiff={null} paramEditorEnabled onApplyParamBatch={onApply}/>);});
  expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-bench_stock_compatibility_reference'}).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-open_scope_qty_drill_and_bit'})).toHaveLength(0);
  act(()=>renderer.unmount());
  const flipped=consumerCanonicalPrecompileParameterOverrides({session:s,patches:[{operation:'set_param',paramKey:'anchor_supply_scope',
    rawValue:separate?includedBenchFixingsS2758:separateBenchFixingsS2758}] as never});
  expect(buildCanonicalParameterCards({session:session(flipped),revision:null}).some(c=>c.key==='fixing_supply_specification')).toBe(!separate);
});

it('blocks positive incompatible stock while retaining source consumption and never assigns arbitrary units to open needs',async()=>{
  const input={...fusionBenchControlS2758(3,true),bench_stock:1,fixing_stock:5};
  const result=await compileFusionBenchS2758(input);
  expect(result.rows.filter(r=>r.included_in_procurement)).toHaveLength(0);
  expect(result.rows.find(r=>r.row_id===prefix+':bench-consumed')?.quantity).toBe('3');
  expect(result.rows.find(r=>r.row_id===prefix+':fixing-consumed-separate')?.quantity).toBe('12');
  const unknown=fusionBenchDefinitionS2758().resources.filter(r=>r.source_metadata?.quantityUnitUnconfirmed);
  expect(unknown).toHaveLength(5);expect(unknown.every(r=>r.unit_id==='')).toBe(true);
});

it.each(['position-mark-reposition','drill-and-bit','setting-and-tightening-tools'])('rejects manual row quantity for unknown source-owned %s',async key=>{
  const d=fusionBenchDefinitionS2758();
  await expect(compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
    primaryMeasureParameterId:'bench_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:fusionBenchControlS2758(),confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,
    hashJson:async v=>estimateDeterministicHash(v),rowOverrides:{[prefix+':'+key]:{quantity:1,provenance:{kind:'manual',reason:'CONTROL_ONLY negative'}}}}))
    .rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});

it.each(['bench_stock_compatibility_reference','actual_bench_supply_specification'])('retains the physical included 4N while only its order waits for %s',async missing=>{
  const input={...fusionBenchControlS2758(),bench_stock:1,bench_reserve:1,bench_quantum:2,
    bench_stock_compatibility_reference:'CONTROL_ONLY: exact complete compatible bench assemblies',[missing]:undefined};
  const r=await compileFusionBenchS2758(input);
  expect(r.rows.find(row=>row.row_id===prefix+':bench-consumed')?.quantity).toBe('3');
  const physical=r.rows.find(row=>row.row_id===prefix+':fixing-included')!;
  expect(physical.quantity).toBe('12');expect(physical.included_in_estimate).toBe(false);
  expect(physical.included_in_procurement).toBe(false);expect(physical.unit_price).toBeNull();
  expect(r.rows.some(row=>row.row_id===prefix+':bench-order')).toBe(false);
  expect(r.preliminaryNeeds.find(row=>row.row_id===prefix+':bench-order')?.quantity).toBe('4');
});
