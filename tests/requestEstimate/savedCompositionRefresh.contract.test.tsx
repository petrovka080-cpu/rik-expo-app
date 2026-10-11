import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { InlineParamEditor, ParameterDisclosurePanel } from '../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision } from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';
import { CANONICAL_PARAMETER_CORE_SCHEMA_VERSION, type CanonicalParameterSession } from '../../src/lib/estimate/canonicalParameters';
import type { EstimateDraftRevision } from '../../src/lib/estimate/estimateDraftRevisionContract';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../src/lib/estimate/backendPlatform/canonicalEstimateClient',()=>({
  getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn(),
}));
const A='00000000-0000-5000-8000-000000000001',B='00000000-0000-5000-8000-000000000002';
const catalogId='canonical-work:master:bench';
const revision=(id:string)=>({revisionId:id,previousRevisionId:null,params:{},boq:{rows:[],sections:[]},missingInputs:[],assumptions:[],artifacts:{},trace:{params:[],rows:[]},status:'draft_ready'} as unknown as EstimateDraftRevision);
const session=(id:string):CanonicalParameterSession=>({coreSchemaVersion:CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  sessionId:id,draftId:'draft',revisionId:id,schemaId:'schema',schemaVersion:'1',workPassportId:catalogId,canonicalWorkKey:'bench',calculationVersion:'1',status:'COMPLETE',parameters:[],blockingMissingParameterIds:[],contractMissingParameterIds:[],assumptionParameterIds:[],invalidParameterIds:[],fingerprint:id,createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z'});
const readCatalog=getCanonicalEstimateCatalogItem as jest.Mock;
const readRevision=getCanonicalEstimateRevision as jest.Mock;
let renderer:TestRenderer.ReactTestRenderer;
let apply:jest.Mock;
const props=(id=A)=>({revision:revision(id),canonicalParameterSession:session(id),viewModel:null,latestDiff:null,paramEditorEnabled:true,onApplyParamBatch:apply});
const button=()=>renderer.root.findAll(n=>n.props.testID==='saved-estimate-composition-refresh'&&typeof n.props.onPress==='function');
async function mount(id=A){await act(async()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel {...props(id)}/>);});}
beforeEach(()=>{jest.clearAllMocks();apply=jest.fn(async()=>true);readRevision.mockImplementation(async(id:string)=>({revisionId:id,catalogId,releaseId:'saved'}));readCatalog.mockResolvedValue({catalogId,releaseId:'next'});});
afterEach(()=>{if(renderer)act(()=>renderer.unmount());});

test('same release offers no refresh after a cold saved-revision open',async()=>{
  readCatalog.mockResolvedValue({catalogId,releaseId:'saved'});await mount();expect(button()).toHaveLength(0);expect(apply).not.toHaveBeenCalled();
});
test('the next release offers refresh, and reaching it removes the action',async()=>{
  await mount();expect(button()).toHaveLength(1);
  await act(async()=>{await button()[0].props.onPress();});expect(apply).toHaveBeenCalledTimes(1);expect(apply).toHaveBeenCalledWith([]);
  readRevision.mockResolvedValue({revisionId:B,catalogId,releaseId:'next'});
  await act(async()=>renderer.update(<ParameterDisclosurePanel {...props(B)}/>));expect(button()).toHaveLength(0);
});
test('a stale refresh rechecks the current release and never calls recalculate',async()=>{
  await mount();const refresh=button()[0].props.onPress;readCatalog.mockResolvedValue({catalogId,releaseId:'saved'});
  await act(async()=>refresh());expect(apply).not.toHaveBeenCalled();expect(button()).toHaveLength(0);
});
test('late availability for a previous revision cannot expose its action',async()=>{
  let finish!:(value:unknown)=>void;
  readCatalog.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({catalogId,releaseId:'saved'});
  await mount();await act(async()=>renderer.update(<ParameterDisclosurePanel {...props(B)}/>));
  await act(async()=>finish({catalogId,releaseId:'next'}));expect(button()).toHaveLength(0);expect(apply).not.toHaveBeenCalled();
});
test('switching revisions while the refresh read is pending prevents its callback',async()=>{
  await mount();let finish!:(value:unknown)=>void;readCatalog.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  let pending!:Promise<void>;act(()=>{pending=button()[0].props.onPress();});
  await act(async()=>renderer.update(<ParameterDisclosurePanel {...props(B)}/>));
  expect(button()[0].props.disabled).toBe(false);
  await act(async()=>{finish({catalogId,releaseId:'next'});await pending;});expect(apply).not.toHaveBeenCalled();
  expect(button()[0].props.disabled).toBe(false);
});
test('a completed refresh cannot write an error into a different saved revision',async()=>{
  await mount();let finish!:(value:boolean)=>void;apply.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  let pending!:Promise<void>;await act(async()=>{pending=button()[0].props.onPress();});
  await act(async()=>renderer.update(<ParameterDisclosurePanel {...props(B)}/>));
  expect(button()[0].props.disabled).toBe(false);
  await act(async()=>{finish(false);await pending;});
  expect(renderer.root.findAllByProps({testID:'request-estimate-parameter-apply-error'})).toHaveLength(0);
  expect(button()[0].props.disabled).toBe(false);
});

test('a late previous refresh cannot unlock or cancel a newer refresh',async()=>{
  await mount();let finishA!:(value:boolean)=>void,finishB!:(value:boolean)=>void;
  apply.mockImplementationOnce(()=>new Promise(resolve=>{finishA=resolve;}))
    .mockImplementationOnce(()=>new Promise(resolve=>{finishB=resolve;}));
  let pendingA!:Promise<void>,pendingB!:Promise<void>;
  await act(async()=>{pendingA=button()[0].props.onPress();});
  await act(async()=>renderer.update(<ParameterDisclosurePanel {...props(B)}/>));
  await act(async()=>{pendingB=button()[0].props.onPress();});
  await act(async()=>{finishA(false);await pendingA;});
  expect(button()[0].props.disabled).toBe(true);
  await act(async()=>button()[0].props.onPress());expect(apply).toHaveBeenCalledTimes(2);
  await act(async()=>{finishB(true);await pendingB;});
  expect(button()[0].props.disabled).toBe(false);
  expect(renderer.root.findAllByProps({testID:'request-estimate-parameter-apply-error'})).toHaveLength(0);
});
test('unmount during the read prevents a late recalculation',async()=>{
  await mount();let finish!:(value:unknown)=>void;readCatalog.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  let pending!:Promise<void>;act(()=>{pending=button()[0].props.onPress();});act(()=>renderer.unmount());
  await act(async()=>{finish({catalogId,releaseId:'next'});await pending;});expect(apply).not.toHaveBeenCalled();
});

test('editing and applying parameters invalidates a pending refresh read without unlocking Apply',async()=>{
  const value:CanonicalParameterSession={...session(A),parameters:[{parameterId:'bench_count',label:'Количество скамеек',description:'',value:3,valueType:'number',unit:'шт.',requiredLevel:'BLOCKING_REQUIRED',visibilityCondition:{kind:'ALWAYS'},validation:{min:1,integer:true},allowedValues:[],source:'USER_EXPLICIT',state:'PROVIDED',confidence:1,assumption:null,affectsRows:['bench'],affectsFormula:['bench'],normativeSource:null,displayOrder:1,sourceText:null,valid:true,validationIssues:[]}]};
  const saved={...revision(A),params:{bench_count:{value:3,source:'user_input' as const,lastChangedAt:value.updatedAt}}};
  await act(async()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel {...props()} revision={saved} canonicalParameterSession={value}/>);});
  const filled=renderer.root.findAll(n=>n.props.testID==='request-estimate-filled-parameters-toggle'&&typeof n.props.onPress==='function')[0];
  if(filled)act(()=>filled.props.onPress());
  let finishRead!:(value:unknown)=>void,finishApply!:(value:boolean)=>void;
  readCatalog.mockImplementationOnce(()=>new Promise(resolve=>{finishRead=resolve;}));
  apply.mockImplementationOnce(()=>new Promise(resolve=>{finishApply=resolve;}));
  let pending!:Promise<void>;act(()=>{pending=button()[0].props.onPress();});
  const editor=renderer.root.findByType(InlineParamEditor);
  const input=editor.findAll(n=>n.props.testID==='editable-param-popover-input'&&typeof n.props.onChangeText==='function')[0];
  act(()=>input.props.onChangeText('4'));
  const applyButton=()=>renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0];
  act(()=>applyButton().props.onPress());expect(apply).toHaveBeenCalledTimes(1);
  expect(applyButton().props.disabled).toBe(true);
  await act(async()=>{finishRead({catalogId,releaseId:'next'});await pending;});
  expect(applyButton().props.disabled).toBe(true);expect(apply).toHaveBeenCalledTimes(1);
  await act(async()=>finishApply(true));expect(applyButton().props.disabled).toBe(false);
});
