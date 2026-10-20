import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {CANONICAL_PARAMETER_CORE_SCHEMA_VERSION, type CanonicalParameter, type CanonicalParameterSession} from '../../lib/estimate/canonicalParameters/canonicalParameterCore';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import {ParameterDisclosurePanel, canonicalConsumerParameterInlineGuide} from './ConsumerRepairProgressiveEstimatePanel';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn()}));

const fixture='CONTROL_ONLY QA exact source-compatible supply, not supplier offer';
const publicExample='Проверочный пример; поставка не подтверждена';
function parameter(id:string,label:string,value:string|number):CanonicalParameter {
  return {parameterId:id,label,description:label,value,valueType:typeof value==='number'?'number':'string',unit:typeof value==='number'?'m2':null,
    requiredLevel:'CONTRACT_REQUIRED',visibilityCondition:{kind:'ALWAYS'},validation:{},allowedValues:[],source:'USER_EXPLICIT',state:'PROVIDED',confidence:1,
    assumption:null,affectsRows:['material:brick'],affectsFormula:['brick-order'],normativeSource:null,displayOrder:id==='brick_supply_specification'?1:2,
    sourceText:'Подтверждено пользователем.',valid:true,validationIssues:[]};
}
function session(value=fixture):CanonicalParameterSession {
  return {coreSchemaVersion:CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,sessionId:'public-value-regression',draftId:'public-value-regression',revisionId:'public-value-regression',
    schemaId:'public-value-regression',schemaVersion:'1',workPassportId:'canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05',
    canonicalWorkKey:'brick_partition_half_unreinforced_upto4m_krer08_02_002_05',calculationVersion:'immutable-source-values',status:'COMPLETE',
    parameters:[parameter('brick_supply_specification','Описание поставки кирпича',value),parameter('net_partition_area_m2','Площадь перегородки',10)],
    blockingMissingParameterIds:[],contractMissingParameterIds:[],assumptionParameterIds:[],invalidParameterIds:[],fingerprint:'public-value-regression',
    createdAt:'2026-10-19T00:00:00Z',updatedAt:'2026-10-19T00:00:00Z'};
}
function render(s:CanonicalParameterSession,onApply=jest.fn()) {
  let result!:TestRenderer.ReactTestRenderer;
  act(()=>{result=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} latestDiff={null} paramEditorEnabled canonicalParameterSession={s} onApplyParamBatch={onApply}/>);});
  const host=(id:string)=>result.root.findAll(n=>typeof n.type==='string'&&n.props.testID===id);
  const input=(id:string)=>host('editable-param-chip-'+id)[0]!.findAll(n=>typeof n.type==='string'&&n.props.testID==='editable-param-popover-input')[0]!;
  const press=(id:string)=>result.root.findAll(n=>n.props.testID===id&&typeof n.props.onPress==='function')[0]!.props.onPress();
  return {result,host,input,press,onApply};
}

test('the presenter changes visible example text while retaining raw session values',()=>{
  const s=session(),before=JSON.stringify(s),cards=buildCanonicalParameterCards({session:s,revision:null});
  expect(cards[0]!.displayValueRu).toBe(publicExample);expect(cards[0]!.value).toBe(fixture);
  expect(JSON.stringify(s)).toBe(before);
});
test('opening and focusing an old example does not rewrite or submit the saved value',()=>{
  const s=session(),before=JSON.stringify(s),r=render(s);
  expect(r.input('brick_supply_specification').props.value).toBe(publicExample);
  act(()=>r.input('brick_supply_specification').props.onFocus());
  expect(r.host('editable-param-batch-apply')).toHaveLength(0);expect(r.onApply).not.toHaveBeenCalled();
  expect(JSON.stringify(s)).toBe(before);act(()=>r.result.unmount());
});
test('applying another field does not submit the projected example as a new source fact',()=>{
  const s=session(),r=render(s);
  act(()=>r.input('net_partition_area_m2').props.onChangeText('12'));
  act(()=>r.press('editable-param-batch-apply'));
  expect(r.onApply).toHaveBeenCalledTimes(1);
  expect(r.onApply.mock.calls[0]![0]).toEqual([{operation:'update_param',paramKey:'net_partition_area_m2',rawValue:'12'}]);
  expect(s.parameters[0]!.value).toBe(fixture);act(()=>r.result.unmount());
});
test('a deliberate edit submits exactly the new user text',()=>{
  const s=session(),r=render(s),edited='Поставка кирпича: счёт 42';
  act(()=>r.input('brick_supply_specification').props.onChangeText(edited));
  act(()=>r.press('editable-param-batch-apply'));
  expect(r.onApply.mock.calls[0]![0]).toEqual([{operation:'update_param',paramKey:'brick_supply_specification',rawValue:edited}]);
  expect(s.parameters[0]!.value).toBe(fixture);act(()=>r.result.unmount());
});
test('ordinary QA product codes remain unchanged and are not marked dirty',()=>{
  const value='Кирпич QA-100, партия 42',s=session(value),r=render(s);
  expect(buildCanonicalParameterCards({session:s,revision:null})[0]!.displayValueRu).toBe(value);
  expect(r.input('brick_supply_specification').props.value).toBe(value);
  expect(r.host('editable-param-batch-apply')).toHaveLength(0);act(()=>r.result.unmount());
});
test('choice labels are projected while their immutable selection values remain raw',()=>{
  const s=session();s.parameters=[{...s.parameters[0]!,value:'APPROVED',allowedValues:[{value:'APPROVED',label:fixture}]}];
  const card=buildCanonicalParameterCards({session:s,revision:null})[0]!;
  expect(card.value).toBe('APPROVED');expect(card.choices).toEqual([{value:'APPROVED',labelRu:publicExample}]);expect(card.displayValueRu).toBe(publicExample);
  expect(s.parameters[0]!.allowedValues[0]!.label).toBe(fixture);
});
test('an assumed text reference is readable without changing its stored provenance',()=>{
  const p={...parameter('brick_supply_specification','Описание поставки кирпича',fixture),source:'ASSUMED' as const};
  expect(canonicalConsumerParameterInlineGuide({parameter:p,baselineValue:fixture})).toBe('принято '+publicExample);
  expect(p.value).toBe(fixture);
});
