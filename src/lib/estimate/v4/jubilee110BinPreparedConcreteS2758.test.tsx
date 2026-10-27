import React from 'react';import TestRenderer,{act} from 'react-test-renderer';
import {jubilee110BinPackS2758 as pack,jubilee110BinPrefixS2758 as prefix,jubilee110BinDefinitionS2758,compileJubilee110BinS2758,includedBinFixingsS2758,separateBinFixingsS2758} from './jubilee110BinPreparedConcreteS2758';
import {jubilee110BinControlS2758,verifyJubilee110BinS2758} from '../../../../scripts/estimate/r4a13/preflightS2758Jubilee110Bin';
import {buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalBaselinePlan} from '../backendPlatform/canonicalConsumerPromptPlanServerR1';import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {InlineParamEditor,ParameterDisclosurePanel} from '../../../features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {ConsumerRepairItemRow} from '../../../features/consumerRepair/ConsumerRepairItemRow';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import type {CanonicalEstimateRevisionView,CanonicalEstimateRevisionRowView} from '../backendPlatform/contracts';
import {ESTIMATE_PLATFORM_API_VERSION} from '../backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
function catalog():CanonicalEstimateCatalogItem{const d=jubilee110BinDefinitionS2758(),c=buildMasterParameterCalculationConsumers(d);return {catalogId:pack.catalogId,titleRu:pack.titleRu,releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'landscape',workKey:pack.workKey,definitionVersion:1,applicability:{primaryMeasureParameterId:'bin_count'},professionalMetadata:{},parameterSchema:d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,unknown>;return {parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,semanticParameterKey:t.semantic_parameter_key,provenance:t.provenance,requiredWhen:t.required_when,formulaConsumers:c.formulaConsumers[p.parameter_id],resourceBranchConsumers:c.resourceConsumers[p.parameter_id],guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}} as CanonicalEstimateCatalogItem['parameterSchema'][number];})};}
function session(parameters:Record<string,unknown>,item=catalog()){return buildConsumerCanonicalPrecompileParameterSession({catalog:item,draftId:'jubilee-prepublication',parameters:parameters as Record<string,string|number>,userExplicitParameterIds:Object.keys(parameters),missingParameterIds:[]});}
const quantity=(r:Awaited<ReturnType<typeof compileJubilee110BinS2758>>,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id)?.quantity;
it('starts a short urn request with three questions and keeps unknown foundation and purchase facts unknown',()=>{
  const current=session({bin_count:15}),before=JSON.stringify(current),apply=jest.fn();let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={current} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});
  expect(renderer.root.findAllByType(InlineParamEditor).map(n=>n.props.paramKey)).toEqual(['bin_count','project_bin_configuration_reference','anchor_supply_scope']);
  expect(apply).not.toHaveBeenCalled();expect(JSON.stringify(current)).toBe(before);
  expandAll(renderer);
  const inputs=renderer.root.findAllByType(InlineParamEditor);
  for(const id of ['bin_stock','bin_reserve','bin_quantum','actual_concrete_strength_n_mm2'])expect(inputs.find(n=>n.props.paramKey===id)?.props.value).toBe('');
  expect(inputs.some(n=>n.props.paramKey==='fixing_stock')).toBe(false);
  expect(inputs.some(n=>n.props.paramKey.startsWith('open_scope_qty_'))).toBe(false);
  expect(apply).not.toHaveBeenCalled();act(()=>renderer.unmount());
});
it('keeps foundation edits in place, retains them when folded, and applies only the entered fact',async()=>{
  const apply=jest.fn((_patches:unknown[])=>true);let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session({bin_count:3})} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});
  const toggle=()=>renderer.root.findAll(n=>n.props.testID==='request-estimate-foundation-parameters-toggle'&&typeof n.props.onPress==='function')[0];
  act(()=>toggle().props.onPress());
  const editor=renderer.root.findAllByType(InlineParamEditor).find(n=>n.props.paramKey==='actual_concrete_strength_n_mm2')!;
  act(()=>editor.props.onChange('actual_concrete_strength_n_mm2','21.5'));
  expect(renderer.root.findAllByType(InlineParamEditor).find(n=>n.props.paramKey==='actual_concrete_strength_n_mm2')).toBe(editor);
  expect(JSON.stringify(renderer.toJSON())).toContain('осталось уточнить 4');
  act(()=>toggle().props.onPress());act(()=>toggle().props.onPress());
  expect(renderer.root.findAllByType(InlineParamEditor).find(n=>n.props.paramKey==='actual_concrete_strength_n_mm2')?.props.value).toBe('21.5');
  await act(async()=>{await renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0].props.onPress();});
  expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]).toEqual([[{operation:'add_param',paramKey:'actual_concrete_strength_n_mm2',rawValue:'21.5'}]]);
  act(()=>renderer.unmount());
});
it('does not call newly entered foundation facts saved or accepted before Apply, including an invalid strength',()=>{
  const apply=jest.fn();let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session({bin_count:3})} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});
  expandAll(renderer);
  for(const [id,value] of [['prepared_foundation_acceptance_reference','CONTROL_ONLY: actual check'],['actual_concrete_strength_n_mm2','19.9'],['safe_drilling_foundation_reference','CONTROL_ONLY: drilling check'],['minimum_safe_drilling_depth_mm','130'],['minimum_anchor_edge_distance_mm','110']]){
    const editor=renderer.root.findAllByType(InlineParamEditor).find(n=>n.props.paramKey===id)!;
    act(()=>editor.props.onChange(id,value));
  }
  const text=JSON.stringify(renderer.toJSON());expect(text).toContain('Поля основания заполнены');expect(text).toContain('новые правки будут учтены после');expect(text).not.toContain('Сохранённые данные основания учтены');expect(apply).not.toHaveBeenCalled();
  act(()=>renderer.unmount());
});
it('keeps the complete manufacturer assembly and eight honest unresolved needs',async()=>{expect(await verifyJubilee110BinS2758()).toMatchObject({shape:[28,13,13],included:[4,8,1],separate:[4,8,2],acceptedCompleteTypes:0});expect(pack.components.names).toEqual(['БолтM10×120мм','ГайкаM10','ШайбаM10/Ø20мм','ШайбаM10/Ø50мм']);expect(pack.scope).toMatchObject({foundationThicknessMm:null,minimumCleanHoleDepthMm:130,drillDiameterMm:10,fixingsPerInstalledBin:4});});
it.each([[3,false,0,0,1,3,0,0,1,0],[3,false,1,1,2,4,0,0,1,0],[3,true,0,0,1,3,0,0,4,12],[3,true,1,1,2,4,5,2,4,12],[11,false,0,0,1,11,0,0,1,0],[11,true,4,1,4,8,10,2,8,40]] as const)('preserves N%s/4N physical quantities and rounded separate=%s orders',async(n,separate,stock,reserve,q,order,fixStock,fixReserve,fixQ,fixOrder)=>{const r=await compileJubilee110BinS2758({...jubilee110BinControlS2758(n,separate),bin_stock:stock,bin_reserve:reserve,bin_quantum:q,...(stock?{bin_stock_compatibility_reference:'CONTROL_ONLY: exact full compatible bins'}:{}),...(separate?{fixing_stock:fixStock,fixing_reserve:fixReserve,fixing_quantum:fixQ,...(fixStock?{fixing_stock_compatibility_reference:'CONTROL_ONLY: exact whole compatible fixings'}:{})}:{})});expect(quantity(r,'bin-consumed')).toBe(String(n));expect(quantity(r,'bin-order')).toBe(String(order));expect(quantity(r,'fixing-consumed')).toBe(String(4*n));expect(quantity(r,'fixing-order')).toBe(separate?String(fixOrder):undefined);expect(r.preliminaryNeeds).toHaveLength(8);expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(separate?2:1);});
it.each(['3 шт','3шт.','3 штуки'])('binds ordinary short input %s only to installed bins',tail=>{const p=buildCanonicalBaselinePlan({catalog:catalog(),prompt:pack.titleRu+' '+tail});expect(p.parameters.bin_count).toBe('3');for(const id of ['anchor_supply_scope','bin_stock','fixing_stock','prepared_foundation_acceptance_reference'])expect(p.parameters).not.toHaveProperty(id);});
it.each([false,true])('exposes all actual project/supplier facts before publication (separate=%s)',separate=>{const input=jubilee110BinControlS2758(3,separate),s=session(input),cards=buildCanonicalParameterCards({session:s,revision:null});expect(cards.filter(x=>x.editable)).toHaveLength(separate?16:12);for(const id of ['bin_count','project_bin_configuration_reference','prepared_foundation_acceptance_reference','safe_drilling_foundation_reference','minimum_anchor_edge_distance_mm','actual_concrete_strength_n_mm2','minimum_safe_drilling_depth_mm','actual_bin_supply_specification','anchor_supply_scope'])expect(cards.some(x=>x.key===id&&x.editable)).toBe(true);expect(cards.some(x=>x.editable&&(x.key.startsWith('open_scope_qty_')||x.key.startsWith('effective_resource_quantity_')))).toBe(false);const active=session({...input,bin_stock:1,...(separate?{fixing_stock:1}:{})}),positive=buildCanonicalParameterCards({session:active,revision:null});expect(positive.filter(x=>x.editable)).toHaveLength(separate?18:13);expect(positive.find(x=>x.key==='bin_stock_compatibility_reference')?.editable).toBe(true);expect(positive.some(x=>x.key==='fixing_stock_compatibility_reference')).toBe(separate);let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={active} latestDiff={null} paramEditorEnabled onApplyParamBatch={jest.fn()}/>);});expandAll(renderer);expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-bin_stock_compatibility_reference'}).length).toBeGreaterThan(0);expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-open_scope_qty_whole_installation_labor'})).toHaveLength(0);act(()=>renderer.unmount());const switched=consumerCanonicalPrecompileParameterOverrides({session:s,patches:[{operation:'set_param',paramKey:'anchor_supply_scope',rawValue:separate?includedBinFixingsS2758:separateBinFixingsS2758}] as never});expect(buildCanonicalParameterCards({session:session(switched),revision:null}).some(x=>x.key==='fixing_supply_specification')).toBe(!separate);});
it('uses schema ownership when a Russian project title resembles a professional norm',()=>{const c=catalog(),field=c.parameterSchema.find(p=>p.parameterId==='project_bin_configuration_reference')!;field.titleRu='Количество: норма расхода материала';expect(buildCanonicalParameterCards({session:session(jubilee110BinControlS2758(),c),revision:null}).find(x=>x.key===field.parameterId)?.editable).toBe(true);});
it.each(['actual_bin_supply_specification','bin_stock_compatibility_reference'])('does not erase physical N/4N for missing purchase %s',async missing=>{const r=await compileJubilee110BinS2758({...jubilee110BinControlS2758(),bin_stock:1,bin_reserve:1,bin_quantum:2,bin_stock_compatibility_reference:'CONTROL_ONLY: full compatible included assemblies',[missing]:undefined});expect(quantity(r,'bin-consumed')).toBe('3');expect(quantity(r,'fixing-consumed')).toBe('12');expect(quantity(r,'fixing-included')).toBe('12');expect(quantity(r,'bin-order')).toBeUndefined();for(const id of ['fixing-consumed','fixing-included']){const row=r.rows.find(x=>x.row_id===prefix+':'+id)!;expect(row.included_in_estimate).toBe(false);expect(row.included_in_procurement).toBe(false);expect(row.unit_price).toBeNull();}});
it('retains physical4N without a default included/separate mode',async()=>{const r=await compileJubilee110BinS2758({...jubilee110BinControlS2758(),anchor_supply_scope:undefined});expect(quantity(r,'bin-consumed')).toBe('3');expect(quantity(r,'fixing-consumed')).toBe('12');expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(0);expect(quantity(r,'fixing-included')).toBeUndefined();});
it('keeps covered complete assemblies at physical12 and order0',async()=>{const r=await compileJubilee110BinS2758({...jubilee110BinControlS2758(3,true),fixing_stock:16,fixing_quantum:4,fixing_stock_compatibility_reference:'CONTROL_ONLY: compatible whole assemblies'});expect(quantity(r,'fixing-consumed')).toBe('12');expect(quantity(r,'fixing-order')).toBe('0');expect(r.rows.filter(x=>x.included_in_procurement&&Number(x.quantity)>0)).toHaveLength(1);});
it.each(pack.gaps.map(g=>g.id))('blocks manual0/1 from inventing source-owned %s',async id=>{const d=jubilee110BinDefinitionS2758();for(const q of [0,1])await expect(compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:'bin_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:jubilee110BinControlS2758(),confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,hashJson:async v=>estimateDeterministicHash(v),rowOverrides:{[prefix+':'+id]:{quantity:q,provenance:{kind:'manual',reason:'CONTROL_ONLY negative'}}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});});
it.each(['project_bin_configuration_reference','prepared_foundation_acceptance_reference','safe_drilling_foundation_reference','actual_concrete_strength_n_mm2','minimum_safe_drilling_depth_mm'])('requires actual project installation applicability %s independently of supply',async id=>{const r=await compileJubilee110BinS2758({...jubilee110BinControlS2758(),[id]:undefined});expect(quantity(r,'bin-consumed')).toBeUndefined();expect(quantity(r,'fixing-consumed')).toBeUndefined();});

it.each([{minimum_anchor_edge_distance_mm:109},{minimum_safe_drilling_depth_mm:129},{actual_concrete_strength_n_mm2:19.9},{actual_concrete_strength_n_mm2:30.1}])('rejects numeric foundation geometry outside exact manufacturer limits %j',async bad=>{await expect(compileJubilee110BinS2758({...jubilee110BinControlS2758(),...bad})).rejects.toThrow();});

function expandAll(renderer:TestRenderer.ReactTestRenderer){for(const id of ['request-estimate-show-more-parameters','request-estimate-filled-parameters-toggle','request-estimate-advanced-parameters-toggle','request-estimate-foundation-parameters-toggle','request-estimate-procurement-parameters-toggle']){const node=renderer.root.findAll(n=>n.props.testID===id&&typeof n.props.onPress==='function')[0];if(node)act(()=>node.props.onPress());}}
async function physicalAmend(id:string,q:number|null,separate:boolean,input:Record<string,unknown>=jubilee110BinControlS2758(3,separate)){
  const d=jubilee110BinDefinitionS2758();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
    primaryMeasureParameterId:'bin_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,hashJson:async v=>estimateDeterministicHash(v),
    rowOverrides:{[prefix+':'+id]:{quantity:q,provenance:{kind:'manual',reason:'CONTROL_ONLY derived quantity regression'}}}});
}
it.each([['bin-consumed',7],['fixing-consumed',20],['fixing-included',20]] as const)('rejects independent physical %s without changing demand or orders',async(id,q)=>{
  for(const separate of [false,true])await expect(physicalAmend(id,q,separate)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each([['bin-consumed',3],['fixing-consumed',12],['fixing-included',12]] as const)('prevents equal %s pins, then allows bin_count edits and null clear',async(id,q)=>{
  for(const separate of [false,true]){
    await expect(physicalAmend(id,q,separate)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
    const cleared=await physicalAmend(id,null,separate);expect(quantity(cleared,'bin-consumed')).toBe('3');expect(quantity(cleared,'fixing-consumed')).toBe('12');
    const changed=await physicalAmend(id,null,separate,{...jubilee110BinControlS2758(4,separate)});
    expect(quantity(changed,'bin-consumed')).toBe('4');expect(quantity(changed,'bin-order')).toBe('4');expect(quantity(changed,'fixing-consumed')).toBe('16');
    expect(quantity(changed,'fixing-included')).toBe(separate?undefined:'16');expect(quantity(changed,'fixing-order')).toBe(separate?'16':undefined);
  }
});
it('keeps physical edits held when source installation facts are absent',async()=>{
  const input={...jubilee110BinControlS2758(),prepared_foundation_acceptance_reference:undefined};
  await expect(physicalAmend('bin-consumed',3,false,input)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const cleared=await physicalAmend('bin-consumed',null,false,input);expect(quantity(cleared,'bin-consumed')).toBeUndefined();
  expect(quantity(cleared,'fixing-consumed')).toBeUndefined();
});
it.each([false,true])('locks only source-derived quantities in the actual projected normal rows (separate=%s)',async separate=>{
  const compiled=await compileJubilee110BinS2758(jubilee110BinControlS2758(3,separate)),c=catalog();
  const rows:CanonicalEstimateRevisionRowView[]=compiled.rows.map(r=>{const trace=r.calculation_trace;
    if(!trace||typeof trace!=='object'||Array.isArray(trace)||!Array.isArray(r.normative_trace))throw Error('actual compiler row trace required');
    return {rowId:r.row_id,ordinal:r.ordinal,section:String(r.section),category:String(r.category),
    titleRu:String(r.title_ru),unitId:String(r.unit_id),quantity:r.quantity,unitPrice:r.unit_price,amount:r.amount,currencyCode:'KGS',
    procurementEligible:r.procurement_eligible,includedInEstimate:r.included_in_estimate,includedInProcurement:r.included_in_procurement,
    ownershipStatus:'OWNED',calculationTrace:trace as Record<string,unknown>,normativeTrace:r.normative_trace,rowSha256:r.row_sha256};});
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:'11111111-1111-4111-8111-111111111111',
    parentRevisionId:null,releaseId:c.releaseId,catalogId:c.catalogId,revisionNumber:1,status:'ready',sourceRequestText:'CONTROL_ONLY: урны3шт',
    displayTitleRu:pack.titleRu,currencyCode:'KGS',amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},
    totals:{amount:'0'},rowCount:rows.length,checksumSha256:'a'.repeat(64),compilerVersion:pack.contract,
    parameters:compiled.parameters,createdAt:'2026-10-11T00:00:00.000Z'};
  const draft=buildStructuredEstimateRequestDraft(adaptCanonicalRevisionToStructuredEstimate({catalog:c,revision,rows}));
  for(const draftItem of draft.items){const id=String(draftItem.sourceParameters?.rowCode),locked=['bin-consumed','fixing-consumed','fixing-included'].some(s=>id===prefix+':'+s),change=jest.fn();
    const item={...draftItem,id,requestDraftId:'CONTROL_ONLY',currency:'KGS' as const,source:'ai_suggested' as const,editableByConsumer:true,createdAt:revision.createdAt};
    let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={item} onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={change} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);});
    const input=renderer.root.findAll(n=>n.props.testID==='consumer-repair-item-quantity-input-'+id&&typeof n.props.onChangeText==='function')[0];
    expect(input.props.editable).toBe(!locked);
    for(const step of ['minus','plus']){const button=renderer.root.findAll(n=>n.props.testID==='consumer-repair-item-'+step+'-'+id&&typeof n.props.onPress==='function')[0];
      expect(button.props.disabled).toBe(locked);if(locked)act(()=>button.props.onPress());}
    if(locked){act(()=>input.props.onChangeText('99'));act(()=>input.props.onBlur());expect(change).not.toHaveBeenCalled();
      const rendered=JSON.stringify(renderer.toJSON());expect(rendered).toContain('Количество устанавливаемых урн');
      expect(rendered).not.toContain('Сохранённое количество ожидает подтверждения технического источника.');
      expect(rendered).not.toContain('Поле можно изменить.');}
    act(()=>renderer.unmount());
  }
});
it.each(['bin_count','prepared_foundation_acceptance_reference'])('retains the derived lock through compact needs when %s is missing',async missing=>{
  const d=jubilee110BinDefinitionS2758(),c=catalog();
  // The real immutable transport admits SHA256 identities. The local owner
  // preview's eh_ hash is intentionally unsuitable for this contract test.
  const compiled=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:pack.catalogId,
    primaryMeasureParameterId:'bin_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:{...jubilee110BinControlS2758(),[missing]:undefined},confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,
    hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});
  const storage={id:'11111111-1111-4111-8111-111111111111',release_id:c.releaseId,definition_version_id:'33333333-3333-4333-8333-333333333333',
    checksum_sha256:'a'.repeat(64),amendment_contract:{rowOverrides:{},customRows:[],releaseMigration:null,parameterSources:{preliminaryNeeds:compiled.preliminaryNeeds}}};
  const before=JSON.stringify(storage),transport=projectCanonicalEstimatePreliminaryNeedTransport(storage);expect(JSON.stringify(storage)).toBe(before);
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:storage.id,parentRevisionId:null,releaseId:c.releaseId,
    catalogId:c.catalogId,revisionNumber:1,status:'ready',sourceRequestText:'CONTROL_ONLY: incomplete actual project',displayTitleRu:pack.titleRu,currencyCode:'KGS',
    amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},preliminaryNeeds:transport.preliminaryNeeds,totals:{amount:'0'},rowCount:0,
    checksumSha256:storage.checksum_sha256,compilerVersion:pack.contract,parameters:compiled.parameters,createdAt:'2026-10-11T00:00:00.000Z'};
  const draft=buildStructuredEstimateRequestDraft(adaptCanonicalRevisionToStructuredEstimate({catalog:c,revision,rows:[]}));
  for(const suffix of ['bin-consumed','fixing-consumed','fixing-included']){const id=prefix+':'+suffix,compact=transport.preliminaryNeeds.find(n=>n.rowId===id)!;
    expect(compact).toBeDefined();expect(compact).not.toHaveProperty('calculationTrace');expect(compact.derivedQuantityEditPolicy?.mode).toBe('PARAMETERS_ONLY');
    const draftItem=draft.items.find(i=>i.sourceParameters?.rowCode===id)!;expect(draftItem).toBeDefined();const change=jest.fn();
    const item={...draftItem,id,requestDraftId:'CONTROL_ONLY',currency:'KGS' as const,source:'ai_suggested' as const,editableByConsumer:true,createdAt:revision.createdAt};
    let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={item} onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={change} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);});
    const input=renderer.root.findAll(n=>n.props.testID==='consumer-repair-item-quantity-input-'+id&&typeof n.props.onChangeText==='function')[0];expect(input.props.editable).toBe(false);
    for(const step of ['minus','plus']){const button=renderer.root.findAll(n=>n.props.testID==='consumer-repair-item-'+step+'-'+id&&typeof n.props.onPress==='function')[0];
      expect(button.props.disabled).toBe(true);act(()=>button.props.onPress());}
    act(()=>input.props.onChangeText('99'));act(()=>input.props.onBlur());expect(change).not.toHaveBeenCalled();
    const text=JSON.stringify(renderer.toJSON());expect(text).toContain('Количество устанавливаемых урн');
    expect(text).not.toContain('Количество определит расчёт после подтверждения технического источника.');
    act(()=>renderer.unmount());
  }
});
it.each([['bin-order',7,'3'],['fixing-order',20,'12']] as const)('preserves manual known order %s and restores its calculated quantity',async(id,edited,calculated)=>{const d=jubilee110BinDefinitionS2758(),input=jubilee110BinControlS2758(3,true);async function amend(q:number|null){return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:'bin_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,hashJson:async v=>estimateDeterministicHash(v),rowOverrides:{[prefix+':'+id]:{quantity:q,provenance:{kind:'manual',reason:'CONTROL_ONLY known order edit'}}}});}const modified=await amend(edited);expect(quantity(modified,id)).toBe(String(edited));expect(quantity(modified,'bin-consumed')).toBe('3');expect(quantity(modified,'fixing-consumed')).toBe('12');expect(quantity(await amend(null),id)).toBe(calculated);});
it.each([includedBinFixingsS2758,separateBinFixingsS2758])('applies the actual mounted supply option once: %s',async value=>{const apply=jest.fn((_patches:unknown[])=>true);let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session({...jubilee110BinControlS2758(),anchor_supply_scope:undefined})} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});expandAll(renderer);const choice=renderer.root.findAll(n=>n.props.testID==='editable-param-option-anchor_supply_scope-'+value&&typeof n.props.onPress==='function')[0];expect(choice).toBeDefined();act(()=>choice.props.onPress());await act(async()=>{const button=renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0];expect(button.props.disabled).not.toBe(true);await button.props.onPress();});expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]?.[0]).toEqual([{operation:'add_param',paramKey:'anchor_supply_scope',rawValue:value}]);act(()=>renderer.unmount());});
it('saves actual decimal strength and geometry controls together through the mounted normal editor',async()=>{const apply=jest.fn((_patches:unknown[])=>true);let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session(jubilee110BinControlS2758())} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});expandAll(renderer);for(const [id,value] of [['actual_concrete_strength_n_mm2','21.5'],['minimum_safe_drilling_depth_mm','140'],['minimum_anchor_edge_distance_mm','120']]){const editor=renderer.root.findAll(n=>n.props.testID==='editable-param-inline-editor-'+id)[0];expect(editor).toBeDefined();const input=editor.findAll(n=>n.props.testID==='editable-param-popover-input'&&typeof n.props.onChangeText==='function')[0];expect(input).toBeDefined();expect(input.props.keyboardType).toBe('decimal-pad');act(()=>input.props.onChangeText(value));if(input.props.onBlur)act(()=>input.props.onBlur());}await act(async()=>{const button=renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0];expect(button.props.disabled).not.toBe(true);await button.props.onPress();});expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]?.[0]).toHaveLength(3);expect(apply.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([{operation:'update_param',paramKey:'actual_concrete_strength_n_mm2',rawValue:'21.5'},{operation:'update_param',paramKey:'minimum_safe_drilling_depth_mm',rawValue:'140'},{operation:'update_param',paramKey:'minimum_anchor_edge_distance_mm',rawValue:'120'}]));act(()=>renderer.unmount());});
