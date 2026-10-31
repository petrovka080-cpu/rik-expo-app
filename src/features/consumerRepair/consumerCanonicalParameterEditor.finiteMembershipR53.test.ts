import type { CanonicalEstimateCatalogItem } from '../../lib/estimate/backendPlatform/contracts';
import { buildConsumerCanonicalPrecompileParameterSession, buildConsumerCanonicalParameterSession, consumerCanonicalPrecompileParameterOverrides } from './consumerCanonicalParameterEditor';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import {buildConsumerRepairCanonicalSessionPreview} from './consumerRepairCanonicalSessionPreview';

type Schema = CanonicalEstimateCatalogItem['parameterSchema'][number];
const choice: Schema = { parameterId: 'physical_part', semanticParameterKey: 'TEST_ONLY:physical_part', titleRu: 'Часть конструкции',
  ordinal: 0, valueType: 'enum', unitId: null, required: false, defaultValue: null,
  constraints: { values: ['LEGACY', 'LANDING'] }, visibilityRole: 'USER_INPUT', valueSourceRole: 'PROJECT_SPECIFIC_INPUT',
  provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, formulaConsumers: [], resourceBranchConsumers: ['TEST_ONLY:cycle'],
  guide: { guideKind: 'PROJECT_DEFINED', sourceRole: 'PROJECT_DOCUMENTATION', guideShortRu: 'Выберите часть конструкции.',
    guideVersion: 'TEST_ONLY', guideValidationPolicy: 'MANDATORY_BLOCK', sourceDocument: 'TEST_ONLY',
    sourceLocator: 'TEST_ONLY_FINITE_SCOPE', sourceSnapshotHash: 'a'.repeat(64),
    applicability: 'TEST_ONLY: конечный выбор части конструкции.', verifiedAt: '2026-10-24T00:00:00Z' } };
const oldFact = (visibleWhen: Schema['visibleWhen']): Schema => ({ ...choice, parameterId: 'legacy_length',
  semanticParameterKey: 'TEST_ONLY:legacy_length', titleRu: 'Длина прежней конструкции', ordinal: 1,
  valueType: 'decimal', unitId: 'm', constraints: { min: 0.01 }, formulaConsumers: ['TEST_ONLY:legacy'], visibleWhen });
const session = (visibleWhen: Schema['visibleWhen'], values: Record<string, string | number>) => {
  const catalog: CanonicalEstimateCatalogItem = { catalogId: 'TEST_ONLY_FINITE_MEMBERSHIP', releaseId: 'TEST_ONLY', namespace: 'global',
    workKey: 'finite-membership', titleRu: 'Конструкция', domain: 'concrete', definitionVersion: 1, professionalMetadata: {},
    parameterSchema: [choice, oldFact(visibleWhen)], applicability: {} };
  return buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: 'TEST_ONLY', parameters: values,
    missingParameterIds: [], userExplicitParameterIds: Object.keys(values), textExtractedParameterIds: [] });
};

it('keeps nested finite membership in the canonical visibility graph instead of reviving a disabled old quantity question', () => {
  const when = { kind: 'and', operands: [
    { kind: 'in', parameterId: 'physical_part', values: ['LEGACY'] },
    { kind: 'not', operand: { kind: 'equals', parameterId: 'physical_part', value: 'LANDING' } },
  ] };
  const landing = session(when, { physical_part: 'LANDING' });
  expect(landing.parameters.map(q => q.parameterId)).toEqual(['physical_part']);
  expect(consumerCanonicalPrecompileParameterOverrides({ session: landing, patches: [] })).toEqual({ physical_part: 'LANDING' });
  expect(session(when, { physical_part: 'LEGACY', legacy_length: 3 }).parameters.map(q => q.parameterId)).toEqual(['physical_part','legacy_length']);
  expect(session(when, {}).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
});

it('preserves the core not-equals result for known and missing choices without interpreting the condition as always visible', () => {
  const when = { kind: 'not_equals', parameterId: 'physical_part', value: 'LANDING' };
  expect(session(when, { physical_part: 'LANDING' }).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
  expect(session(when, { physical_part: 'LEGACY', legacy_length: 3 }).parameters.map(q => q.parameterId)).toEqual(['physical_part','legacy_length']);
  expect(session(when, {}).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
});


describe('R857 protected source readback conditions',()=>{
 const area:Schema={...choice,parameterId:'actual_area',semanticParameterKey:'TEST_ONLY:actual_area',titleRu:'Площадь',
  valueType:'decimal',unitId:'m2',required:true,constraints:{min:0},formulaConsumers:['TEST_ONLY:area']};
 const readback:Schema={...choice,parameterId:'protected_water_scope',semanticParameterKey:'TEST_ONLY:scope',titleRu:'Защищённое условие воды',
  visibilityRole:'INTERNAL_ONLY',valueSourceRole:'PROJECT_DOCUMENTATION',defaultValue:'SEPARATE',
  constraints:{values:['SEPARATE','INCLUDED']},provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}};
 const meter:Schema={...area,parameterId:'water_meter',semanticParameterKey:'TEST_ONLY:meter',titleRu:'Показание счётчика',required:false,unitId:'l',
  constraints:{min:0,requiredWhen:{kind:'and',operands:[{kind:'greater_than',parameterId:'actual_area',value:0},{kind:'equals',parameterId:readback.parameterId,value:'SEPARATE'}]}},
  resourceBranchConsumers:['TEST_ONLY:water'],formulaConsumers:['TEST_ONLY:water']};
 const c:CanonicalEstimateCatalogItem={catalogId:'TEST_ONLY_READBACK',releaseId:'TEST_ONLY_RELEASE',namespace:'global',workKey:'readback',
  titleRu:'Физическая операция',domain:'finishing',definitionVersion:1,professionalMetadata:{},applicability:{},parameterSchema:[area,readback,meter]};
 const revision=(parameters:Record<string,unknown>):Parameters<typeof buildConsumerCanonicalParameterSession>[0]['revision']=>({
  revisionId:'TEST_ONLY_SAVED',parentRevisionId:null,releaseId:c.releaseId,catalogId:c.catalogId,definitionVersionId:'TEST_ONLY_DEF',definitionVersion:1,status:'ready',
  parameters,userInputSnapshot:{actual_area:parameters.actual_area,water_meter:parameters.water_meter},acceptedBaselineSnapshot:{protected_water_scope:'SEPARATE'},
  assumptionSnapshot:null,parameterSchemaHash:'TEST_ONLY_SCHEMA',compilerVersion:'TEST_ONLY_COMPILER',checksumSha256:'a'.repeat(64),createdAt:'2026-10-28T00:00:00Z',preliminaryNeeds:[]});
 const build=(parameters:Record<string,unknown>,catalog=c)=>buildConsumerCanonicalParameterSession({catalog,revision:revision(parameters),draftId:'TEST_ONLY_DRAFT'});
 const cards=(s:ReturnType<typeof build>)=>buildCanonicalParameterCards({session:s,revision:null});
 const value={actual_area:10,protected_water_scope:'SEPARATE'};
 test('saved separate scope exposes unknown editable measurement without exposing or submitting the protected fact',()=>{
  const s=build(value);expect(cards(s)).toEqual(expect.arrayContaining([expect.objectContaining({key:'water_meter',editable:true,value:null,missing:true})]));
  expect(s.parameters.some(p=>p.parameterId===readback.parameterId)).toBe(false);
  expect(s.applicationParameters?.some(p=>p.parameterId===readback.parameterId)??false).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({session:s,patches:[]})).not.toHaveProperty(readback.parameterId);
 });
 test('included scope hides the separate measurement despite an old saved value',()=>{
  const s=build({...value,protected_water_scope:'INCLUDED',water_meter:100});
  expect(cards(s).some(p=>p.key==='water_meter')).toBe(false);expect(s.blockingMissingParameterIds).not.toContain('water_meter');
 });
 test('missing readback never falls back to the baseline or source default',()=>{
  const s=build({actual_area:10});expect(s.sourceReadbackConditionValuesV1).toBeUndefined();expect(cards(s).some(p=>p.key==='water_meter')).toBe(false);
 });
 test('cold reconstruction retains the exact actual readback and numeric measurement without editing saved bytes',()=>{
  const r=revision({...value,water_meter:100}),before=JSON.stringify(r);
  const s=buildConsumerCanonicalParameterSession({catalog:c,revision:JSON.parse(before),draftId:'TEST_ONLY_COLD'});
  expect(cards(s)).toEqual(expect.arrayContaining([expect.objectContaining({key:'water_meter',value:100,editable:true})]));expect(JSON.stringify(r)).toBe(before);
 });
 test('live geometry zero hides the branch and restoring geometry reopens the same retained measurement',()=>{
  const s=build({...value,water_meter:100}),zero=buildConsumerRepairCanonicalSessionPreview({session:s,draftValues:{actual_area:'0'}})!;
  expect(cards(zero).some(p=>p.key==='water_meter')).toBe(false);
  const restored=buildConsumerRepairCanonicalSessionPreview({session:zero,draftValues:{actual_area:'5'}})!;
  expect(cards(restored)).toEqual(expect.arrayContaining([expect.objectContaining({key:'water_meter',value:100})]));
 });
 test('a technical draft patch cannot turn included supply into a separate measurement branch',()=>{
  const s=build({...value,protected_water_scope:'INCLUDED'}),next=buildConsumerRepairCanonicalSessionPreview({session:s,draftValues:{actual_area:'11',protected_water_scope:'SEPARATE'}})!;
  expect(cards(next).some(p=>p.key==='water_meter')).toBe(false);expect(next.sourceReadbackConditionValuesV1).toEqual({protected_water_scope:'INCLUDED'});
 });
 test('raw precompile text cannot seed a protected source readback',()=>{
  const s=buildConsumerCanonicalPrecompileParameterSession({catalog:c,draftId:'TEST_ONLY_RAW',parameters:value,missingParameterIds:[],userExplicitParameterIds:Object.keys(value)});
  expect(s.sourceReadbackConditionValuesV1).toBeUndefined();expect(cards(s).some(p=>p.key==='water_meter')).toBe(false);
 });
 test('an unsupported readback or an untagged internal source value cannot authorize visibility',()=>{
  expect(cards(build({...value,protected_water_scope:'UNSUPPORTED'})).some(p=>p.key==='water_meter')).toBe(false);
  const untagged={...c,parameterSchema:[area,{...readback,provenance:{}},meter]};
  expect(build(value,untagged).sourceReadbackConditionValuesV1).toBeUndefined();expect(cards(build(value,untagged)).some(p=>p.key==='water_meter')).toBe(false);
 });
});
