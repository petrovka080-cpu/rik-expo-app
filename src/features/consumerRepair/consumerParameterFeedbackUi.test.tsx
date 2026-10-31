import React from 'react';
import {StyleSheet} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {ParameterDisclosurePanel, type ConsumerRepairParameterApplyResult} from './ConsumerRepairProgressiveEstimatePanel';
import {buildConsumerCanonicalPrecompileParameterSession} from './consumerCanonicalParameterEditor';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import {consumerParameterApplyFailure} from './consumerParameterApplyFeedback';
import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn()}));

type Schema=CanonicalEstimateCatalogItem['parameterSchema'][number];
const document='Ceresit CT 29 — техническое описание, январь 2020';
const locator='Стр.2: расход по площади и толщине; рецептура замеса';
const guide={guideKind:'MEASUREMENT_RULE',guideShortRu:'Укажите измеренное значение по проекту объекта.',guideValidationPolicy:'MANDATORY_BLOCK',
 sourceRole:'USER_SUPPLIED_OBJECT_FACT',sourceDocument:'Проект объекта П-12',sourceLocator:'Раздел 3, ведомость исходных данных',
 sourceSnapshotHash:'a'.repeat(64),guideVersion:'TEST_ONLY_UI_FEEDBACK',applicability:'Проверка представления',verifiedAt:'2026-10-20'};
const fact=(parameterId:string,titleRu:string,valueType='decimal',unitId='m',constraints:Record<string,unknown>={min:0}):Schema=>({
 parameterId,titleRu,valueType,unitId,ordinal:0,required:true,defaultValue:null,constraints,visibilityRole:'USER_INPUT',valueSourceRole:'PROJECT_SPECIFIC_INPUT',
 semanticParameterKey:'TEST_ONLY:'+parameterId,provenance:{consumer_input_role_v1:'OBJECT_FACT'},formulaConsumers:['TEST_ONLY:quantity'],resourceBranchConsumers:['TEST_ONLY:material'],guide,
} as Schema);
const rawSchema:Schema[]=[fact('batch_count','Подтверждённый план целых замесов','integer','pcs',{min:1,max:20}),
 fact('area','Измеренная площадь поверхности','decimal','m2'),fact('missing_depth','Проектное число слоёв','integer','pcs',{min:1,max:8}),fact('saved_length','Длина участка'),
 {...fact('actual_water','Фактическая вода на один замес','decimal','l',{min:1.1,max:1.3}),
  guide:{...guide,sourceDocument:document,sourceLocator:locator,guideMin:1.1,guideMax:1.3,displayUnit:'л'} as Schema['guide']},
 {...fact('application_rate','Приблизительный расход CT29 на м² и мм','decimal','kg/m2/mm'),required:false,visibilityRole:'USER_DERIVED_READONLY',
  valueSourceRole:'MANDATORY_NORM_VALUE',runtimeProfileClassification:'NORMATIVE',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  guide:{...guide,guideKind:'MANDATORY_NORM_VALUE',sourceRole:'MANDATORY_NORM_VALUE',sourceDocument:document,sourceLocator:locator,displayUnit:'кг/м²/мм'} as Schema['guide']},
 {...fact('application_unknown','Часы выполнения, источник пока отсутствует','decimal','man_hour'),required:false,visibilityRole:'USER_DERIVED_READONLY',
  valueSourceRole:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  guide:{...guide,guideKind:'PROJECT_DEFINED',sourceRole:'UNRESOLVED_APPLICATION_NORM',sourceDocument:'kg_backend_norm_key_v1',sourceLocator:'backend:norm_key'} as Schema['guide']},
 {...fact('preliminary_profile','Предварительный организационный профиль','decimal','h'),required:false,visibilityRole:'USER_DERIVED_READONLY',
  valueSourceRole:'BACKEND_DERIVED',runtimeProfileClassification:'ASSUMPTION',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  guide:{...guide,guideKind:'PROJECT_DEFINED',sourceRole:'BACKEND_DERIVED',sourceDocument:'Предварительный профиль организации работ',sourceLocator:'Версия 1; условия требуют проверки'} as Schema['guide']},
];
const schema=rawSchema.map((parameter,ordinal)=>({...parameter,ordinal}));
const catalog:CanonicalEstimateCatalogItem={catalogId:'canonical-work:test:parameter-feedback',releaseId:'TEST_ONLY',namespace:'global',workKey:'parameter-feedback',
 titleRu:'Проверка параметров',domain:'construction',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:schema};
const session=()=>buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_FEEDBACK',parameters:{batch_count:5,area:10,saved_length:8,actual_water:1.1,
 application_rate:1.8,preliminary_profile:5},missingParameterIds:['missing_depth'],userExplicitParameterIds:['batch_count','area','saved_length','actual_water'],textExtractedParameterIds:[]});
function render(apply:()=>ConsumerRepairParameterApplyResult|Promise<ConsumerRepairParameterApplyResult>=()=>false,source=session()){
 const before=JSON.stringify(source);let renderer!:TestRenderer.ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} latestDiff={null} paramEditorEnabled canonicalParameterSession={source} onApplyParamBatch={apply}/>);});
 const host=(id:string)=>{const node=renderer.root.findAll(n=>typeof n.type==='string'&&n.props.testID===id)[0];expect(node).toBeDefined();return node!;};
 const input=(id:string)=>host('editable-param-chip-'+id).findAll(n=>typeof n.type==='string'&&n.props.testID==='editable-param-popover-input')[0]!;
 const change=(id:string,value:string)=>act(()=>input(id).props.onChangeText(value));
 const press=()=>renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0]!.props.onPress();
 const color=(id:string)=>(StyleSheet.flatten(host('editable-param-chip-'+id).props.style) as {borderLeftColor:string}).borderLeftColor;
 const text=(id:string)=>JSON.stringify(host(id).props.children);
 return{renderer,source,before,host,input,change,press,color,text};
}

test('accepted geometry differs from its old profile reference without appearing as an unsaved edit',()=>{
 const base=session(),saved={...base,parameters:base.parameters.map(parameter=>parameter.parameterId==='area'
   ?{...parameter,referenceValue:150}:parameter)};
 const r=render(()=>false,saved);
 expect(r.input('area').props.value).toBe('10');
 expect(r.color('area')).toBe('#15803D');expect(r.text('editable-param-status-area')).toContain('значение сохранено');
 r.change('area','20');expect(r.color('area')).toBe('#2563EB');expect(r.text('editable-param-status-area')).toContain('ещё не применено');
 r.change('area','10');expect(r.color('area')).toBe('#15803D');
 expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test('invalid object geometry shows its range without normative links and never announces all fields correct',()=>{
 const invalid=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_INVALID_OBJECT_BOUND',
   parameters:{batch_count:5,area:10,saved_length:8,actual_water:1.4,missing_depth:2},missingParameterIds:['actual_water']});
 expect(invalid.parameters.find(parameter=>parameter.parameterId==='actual_water')!.normativeSource).toBeNull();
 const r=render(()=>false,invalid),text=JSON.stringify(r.renderer.toJSON());
 expect(r.color('actual_water')).toBe('#B91C1C');
 expect(text).toContain('Допустимый диапазон ввода:');expect(text).toContain('1,1');expect(text).toContain('1,3');
 expect(text).toContain('Исправьте ошибки в выделенных полях.');expect(text).not.toContain('Все обязательные параметры заполнены');
 expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test('one invalid value is red while other dirty, missing and saved values retain their own color and accessible text',()=>{
 const apply=jest.fn(()=>false),r=render(apply);r.change('batch_count','1.5');r.change('area','20');act(()=>r.press());
 expect(apply).not.toHaveBeenCalled();expect(r.color('batch_count')).toBe('#B91C1C');expect(r.text('editable-param-status-batch_count')).toContain('Ошибка в этом поле');
 expect(r.color('area')).toBe('#2563EB');expect(r.text('editable-param-status-area')).toContain('ещё не применено');
 expect(r.color('missing_depth')).toBe('#D97706');expect(r.text('editable-param-status-missing_depth')).toContain('Нужно заполнить');
 expect(r.color('saved_length')).toBe('#15803D');expect(r.text('editable-param-status-saved_length')).toContain('значение сохранено');
 expect(r.host('editable-param-status-area').props.accessibilityLabel).toContain('ещё не применено');
 expect(r.host('editable-param-status-batch_count').props.accessibilityRole).toBe('alert');
 expect(r.input('area').props.value).toBe('20');expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test('a focused required integer keeps its input instance and raw intermediate edits without replaying the previous cursor',()=>{
 const apply=jest.fn((..._args:unknown[])=>false),r=render(apply),input=r.input('missing_depth');
 act(()=>{input.props.onFocus();input.props.onSelectionChange({nativeEvent:{selection:{start:0,end:0}}});});
 expect(r.input('missing_depth').props.selection).toEqual({start:0,end:0});
 for(const raw of ['','-','1,','1','8']){
  r.change('missing_depth',raw);
  expect(r.input('missing_depth')).toBe(input);expect(r.input('missing_depth').props.value).toBe(raw);
  expect(r.input('missing_depth').props.selection).toBeUndefined();expect(apply).not.toHaveBeenCalled();
  expect(r.color('missing_depth')).not.toBe('#15803D');
  // A fresh native cursor event may be remembered, but must not be replayed
  // over the following text change before its new event arrives.
  act(()=>r.input('missing_depth').props.onSelectionChange({nativeEvent:{selection:{start:raw.length,end:raw.length}}}));
 }
 expect(r.text('editable-param-status-missing_depth')).toContain('ещё не применено');
 act(()=>r.press());expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]?.[0]).toEqual([
  expect.objectContaining({paramKey:'missing_depth',rawValue:'8'}),
 ]);
 expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test.each(['human','old-code-only'] as const)('global formula failure %s preserves edits as pending and never invents invalid parameter IDs',async route=>{
 const error=Object.assign(new Error(route==='human'?'Подтверждённого плана замесов недостаточно для выбранной площади и толщины. (technical:row-id: -2685 kg)':'Расчёт не завершён: FORMULA_OUTPUT_BOUNDS_FAILED'),{code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 const r=render(()=>Promise.reject(error));r.change('batch_count','6');r.change('area','20');await act(async()=>{r.press();await Promise.resolve();});
 expect(r.color('batch_count')).toBe('#2563EB');expect(r.color('area')).toBe('#2563EB');expect(r.color('missing_depth')).toBe('#D97706');expect(r.color('saved_length')).toBe('#15803D');
 const failure=r.text('request-estimate-parameter-apply-error');expect(failure).not.toMatch(/technical:row-id|FORMULA_OUTPUT_BOUNDS_FAILED/u);
 expect(failure).toContain(route==='human'?'Подтверждённого плана замесов недостаточно':'не прошли проверку расчёта');
 expect(r.input('batch_count').props.value).toBe('6');expect(r.input('area').props.value).toBe('20');
 expect(consumerParameterApplyFailure(error).parameterIds).toEqual([]);expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test('only explicit editable parameter IDs receive server validation feedback',async()=>{
 const r=render(()=>({status:'failed',code:'PARAMETER_VALIDATION_FAILED',messageRu:'Проверьте подтверждённое количество замесов.',parameterIds:['batch_count','application_rate','foreign']}));
 r.change('batch_count','6');r.change('area','20');await act(async()=>{r.press();await Promise.resolve();});
 expect(r.color('batch_count')).toBe('#B91C1C');expect(r.color('area')).toBe('#2563EB');
 expect(r.renderer.root.findAll(n=>n.props.testID==='editable-param-chip-application_rate')).toHaveLength(0);
 expect(r.input('area').props.value).toBe('20');expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});

test('application norms stay internal while actual object inputs and their validation remain editable',()=>{
 const r=render(),cards=buildCanonicalParameterCards({session:r.source,revision:null});
 expect(r.source.parameters.some(parameter=>parameter.parameterId==='application_rate')).toBe(false);
 expect(r.source.blockingMissingParameterIds).not.toContain('application_unknown');
 expect(r.source.applicationParameters?.find(parameter=>parameter.parameterId==='application_rate')?.sourceProvenance)
  .toMatchObject({document,locator,unitLabel:'кг/м²/мм',runtimeClassification:'NORMATIVE'});
 expect(r.source.applicationParameters?.find(parameter=>parameter.parameterId==='application_rate'))
  .toMatchObject({value:1.8,inputOwnership:'APPLICATION',consumerInputRole:'APPLICATION_TECHNICAL'});
 for(const key of ['application_rate','application_unknown','preliminary_profile']){
  expect(cards.some(card=>card.key===key)).toBe(false);
  expect(r.renderer.root.findAll(n=>n.props.testID==='editable-param-chip-'+key)).toHaveLength(0);
 }
 for(const id of ['request-estimate-application-norms','request-estimate-application-norms-toggle','request-estimate-source-gates-toggle'])
  expect(r.renderer.root.findAll(n=>n.props.testID===id)).toHaveLength(0);
 const measured=cards.find(card=>card.key==='actual_water')!;expect(measured.editable).toBe(true);
 expect(measured.sourceSummaryRu).toContain('Данные объекта');expect(measured.sourceSummaryRu).toContain('1.1–1.3 л');
 expect(measured.sourceSummaryRu).not.toContain('Норма приложения');expect(r.input('actual_water')).toBeDefined();
 expect(r.renderer.root.findAll(n=>n.props.testID==='editable-param-source-actual_water')).toHaveLength(0);
 act(()=>r.renderer.root.findAll(n=>n.props.testID==='editable-param-guide-details-actual_water'&&typeof n.props.onPress==='function')[0]!.props.onPress());
 expect(r.text('editable-param-source-actual_water')).toContain(document);
 expect(JSON.stringify(r.source)).toBe(r.before);act(()=>r.renderer.unmount());
});
