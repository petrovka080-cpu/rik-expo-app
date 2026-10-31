import fs from 'node:fs';
import path from 'node:path';
import {CanonicalEstimateApiError,type CanonicalEstimateCatalogItem,type CanonicalCatalogPromptExtractionV1} from '../../src/lib/estimate/backendPlatform/contracts';
import {parseCanonicalCatalogPromptRequestV1,assertCanonicalCatalogPromptBytesV1,readCanonicalCatalogPromptJsonV1,
  MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1,MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1} from '../../src/lib/estimate/backendPlatform/canonicalCatalogPromptExtractionV1';
import {deriveCanonicalCatalogPromptExtractionV1} from '../../src/lib/estimate/backendPlatform/canonicalConcretePlacementPromptServerR1';
import {buildCanonicalBaselinePlan,compileConsumerCanonicalBaseline} from '../../src/features/consumerRepair/consumerCanonicalBaselineCompile';
import {getCanonicalEstimateCatalogItemForPrompt,resetCanonicalEstimateRuntimeCompatibilityForTests} from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';
import {STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS} from '../../src/lib/estimate/v4/stripFoundationConcretePlacementR1';

const mockGetSession=jest.fn(),mockFetchWithRequestTimeout=jest.fn();
jest.mock('../../src/lib/supabaseClient',()=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon-key',
  supabase:{auth:{getSession:(...args:unknown[])=>mockGetSession(...args),refreshSession:jest.fn()}}}));
jest.mock('../../src/lib/requestTimeoutPolicy',()=>({fetchWithRequestTimeout:(...args:unknown[])=>mockFetchWithRequestTimeout(...args)}));
function catalog():CanonicalEstimateCatalogItem{return{
  catalogId:'canonical-work:test:prompt-extraction',releaseId:'11111111-1111-5111-8111-111111111111',namespace:'global',domain:'construction',
  workKey:'test-only-prompt-extraction',titleRu:'Монтаж изделий',definitionVersion:1,applicability:{primaryMeasureParameterId:'batch_order_quantity'},professionalMetadata:{},
  contentAdmission:{allowed:true,contractVersion:'estimate-admission-r3'} as never,
  parameterSchema:[{parameterId:'batch_order_quantity',ordinal:0,valueType:'integer',unitId:'piece',titleRu:'Количество изделий',required:false,
    defaultValue:null,constraints:{min:0},visibilityRole:'USER_INPUT',valueSourceRole:'USER_MEASURED',semanticParameterKey:'quantity',formulaConsumers:['test-only-count']},
    {parameterId:'auxiliary_length_m',ordinal:1,valueType:'decimal',unitId:'m',titleRu:'Дополнительная длина',required:false,
      defaultValue:null,constraints:{min:0},visibilityRole:'USER_INPUT',valueSourceRole:'USER_MEASURED',formulaConsumers:['test-only-length']}]};}
const prompt='Монтаж 7 шт';
function rawPlan(item:CanonicalEstimateCatalogItem,text:string,binding:unknown){
  return buildCanonicalBaselinePlan({catalog:item,prompt:text,promptExtraction:binding as CanonicalCatalogPromptExtractionV1});
}
function errorOf(fn:()=>unknown){try{fn();return null;}catch(error){return error;}}

describe('catalog prompt extraction exact contract',()=>{
  test('request text stays in the POST body, including its exact whitespace',()=>{
    const text='  Монтаж 7 шт\n';expect(parseCanonicalCatalogPromptRequestV1({prompt:text})).toEqual({prompt:text});
    for(const value of [undefined,null,{}, {prompt:''},{prompt:'  '},{prompt:9},{prompt,releaseId:'stale'},{prompt,parameters:{}}]){
      const error=errorOf(()=>parseCanonicalCatalogPromptRequestV1(value));
      expect(error).toBeInstanceOf(CanonicalEstimateApiError);
      expect(error).toMatchObject({code:'INVALID_ARGUMENT',httpStatus:400});
    }
  });
  test.each(['missing','missing-values','wrong-prompt','wrong-catalog','stale-release','stale-definition','label-change','order-change','unit-change','unknown-value','nonfinite'])
  ('fails closed before generic parsing: %s',kind=>{
    const item=catalog(),valid=deriveCanonicalCatalogPromptExtractionV1(item,prompt);let value:unknown=valid;
    if(kind==='missing')value=undefined;
    if(kind==='missing-values'){const{concretePlacement:_missing,...rest}=valid;value=rest;}
    if(kind==='wrong-prompt')value={...valid,prompt:prompt+' '};
    if(kind==='wrong-catalog')value={...valid,catalogId:'canonical-work:other'};
    if(kind==='stale-release')value={...valid,releaseId:'22222222-2222-5222-8222-222222222222'};
    if(kind==='stale-definition')value={...valid,definitionVersion:2};
    if(kind==='label-change')value={...valid,schema:valid.schema.map((p,i)=>i===0?{...p,titleRu:'Иной объём'}:p)};
    if(kind==='order-change')value={...valid,schema:[...valid.schema].reverse()};
    if(kind==='unit-change')value={...valid,schema:valid.schema.map((p,i)=>i===0?{...p,unitId:'m2'}:p)};
    if(kind==='unknown-value')value={...valid,concretePlacement:{unregistered:1}};
    if(kind==='nonfinite')value={...valid,concretePlacement:{batch_order_quantity:NaN}};
    expect(errorOf(()=>rawPlan(item,prompt,value))).toMatchObject({code:'CATALOG_PROMPT_BINDING_INVALID',httpStatus:409});
  });
  test.each(['stale-sha','wrong-definition-id','wrong-baseline-id','missing-identity','unexpected-identity'])
  ('preserves the exact optional immutable source identity: %s',kind=>{
    const item={...catalog(),immutableCalculationIdentityV1:{catalogId:catalog().catalogId,
      definitionVersionId:'33333333-3333-5333-8333-333333333333',definitionSha256:'a'.repeat(64),
      approvedTemplateBaselineId:'44444444-4444-5444-8444-444444444444'}};
    const valid=deriveCanonicalCatalogPromptExtractionV1(item,prompt);
    expect(valid.immutableCalculationIdentityV1).toEqual(item.immutableCalculationIdentityV1);
    let value:unknown=valid,target:CanonicalEstimateCatalogItem=item;
    if(kind==='stale-sha')value={...valid,immutableCalculationIdentityV1:{...valid.immutableCalculationIdentityV1,definitionSha256:'b'.repeat(64)}};
    if(kind==='wrong-definition-id')value={...valid,immutableCalculationIdentityV1:{...valid.immutableCalculationIdentityV1,definitionVersionId:'55555555-5555-5555-8555-555555555555'}};
    if(kind==='wrong-baseline-id')value={...valid,immutableCalculationIdentityV1:{...valid.immutableCalculationIdentityV1,approvedTemplateBaselineId:'66666666-6666-5666-8666-666666666666'}};
    if(kind==='missing-identity'){const{immutableCalculationIdentityV1:_missing,...rest}=valid;value=rest;}
    if(kind==='unexpected-identity')target=catalog();
    expect(errorOf(()=>rawPlan(target,prompt,value))).toMatchObject({code:'CATALOG_PROMPT_BINDING_INVALID',httpStatus:409});
    const offline=deriveCanonicalCatalogPromptExtractionV1(catalog(),prompt);
    expect(Object.hasOwn(offline,'immutableCalculationIdentityV1')).toBe(false);
  });
  test('keeps the pre-existing trimmed 4000-character prompt contract and raw whitespace',()=>{
    const exact='  '+'я'.repeat(4000)+'  ';
    expect(parseCanonicalCatalogPromptRequestV1({prompt:exact})).toEqual({prompt:exact});
    expect(errorOf(()=>parseCanonicalCatalogPromptRequestV1({prompt:'я'.repeat(4001)}))).toMatchObject({code:'INVALID_ARGUMENT',httpStatus:400});
  });
  test('counts UTF-8 byte caps and leaves exact boundaries valid',()=>{
    const requestText='я'.repeat(MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1/2);
    expect(()=>assertCanonicalCatalogPromptBytesV1(requestText,MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1,'request')).not.toThrow();
    expect(errorOf(()=>assertCanonicalCatalogPromptBytesV1(requestText+'я',MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1,'request')))
      .toMatchObject({code:'REQUEST_TOO_LARGE',httpStatus:413});
    const responseText='x'.repeat(MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1);
    expect(()=>assertCanonicalCatalogPromptBytesV1(responseText,MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1,'response')).not.toThrow();
    expect(errorOf(()=>assertCanonicalCatalogPromptBytesV1(responseText+'x',MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1,'response')))
      .toMatchObject({code:'CATALOG_PROMPT_RESPONSE_TOO_LARGE',httpStatus:502});
  });
  test('rejects streamed and declared oversized bodies before JSON or normative parsing',async()=>{
    const cancel=jest.fn(async()=>undefined),releaseLock=jest.fn(),read=jest.fn().mockResolvedValue({done:false,
      value:new Uint8Array(MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1+1)});
    const message={headers:new Headers(),body:{getReader:()=>({read,cancel,releaseLock})},text:jest.fn()} as unknown as Response;
    await expect(readCanonicalCatalogPromptJsonV1(message,'request')).rejects.toMatchObject({code:'REQUEST_TOO_LARGE',httpStatus:413});
    expect(read).toHaveBeenCalledTimes(1);expect(cancel).toHaveBeenCalledTimes(1);expect(releaseLock).toHaveBeenCalledTimes(1);expect(message.text).not.toHaveBeenCalled();
    const declared=new Response('{}',{headers:{'Content-Length':String(MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1+1)}});
    await expect(readCanonicalCatalogPromptJsonV1(declared,'request')).rejects.toMatchObject({code:'REQUEST_TOO_LARGE',httpStatus:413});
    await expect(readCanonicalCatalogPromptJsonV1(new Response('{'),'request')).rejects.toMatchObject({code:'INVALID_ARGUMENT',httpStatus:400});
  });
  test('preserves null versus an empty matched-and-filtered object and generic quantity precedence',()=>{
    const label=STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.find(p=>p.parameter_id==='plan_dimension_concrete_volume_m3')!.title_ru;
    const text=`Монтаж 7 шт; ${label}: 30`,unrelated=catalog(),member={...unrelated,catalogId:STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0].catalogId};
    const absent=deriveCanonicalCatalogPromptExtractionV1(unrelated,text),empty=deriveCanonicalCatalogPromptExtractionV1(member,text);
    expect(absent.concretePlacement).toBeNull();expect(empty.concretePlacement).toEqual({});
    expect(rawPlan(unrelated,text,absent).parameters.batch_order_quantity).toBe('7');
    expect(rawPlan(member,text,empty).parameters.batch_order_quantity).toBeUndefined();
  });
  test('keeps the typed concrete value ahead of a bare quantity and keeps explicit editor overrides last',()=>{
    const native=STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.find(p=>p.parameter_id==='plan_dimension_concrete_volume_m3')!;
    const item={...catalog(),catalogId:STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
      applicability:{primaryMeasureParameterId:native.parameter_id},parameterSchema:[{...catalog().parameterSchema[0],parameterId:native.parameter_id,
        semanticParameterKey:native.parameter_id,valueType:'decimal' as const,unitId:'m3',titleRu:native.title_ru}]};
    const text=`Монтаж 7 м3; ${native.title_ru}: 30`,binding=deriveCanonicalCatalogPromptExtractionV1(item,text);
    expect(binding.concretePlacement).toEqual({[native.parameter_id]:30});
    expect(rawPlan(item,text,binding).parameters[native.parameter_id]).toBe(30);
    expect(buildCanonicalBaselinePlan({catalog:item,prompt:text,promptExtraction:binding,
      parameterOverrides:{[native.parameter_id]:31}}).parameters[native.parameter_id]).toBe(31);
  });
  test('client source has no owned concrete parser import and backend calls the same owner',()=>{
    const consumer=fs.readFileSync(path.resolve('src/features/consumerRepair/consumerCanonicalBaselineCompile.ts'),'utf8');
    expect(consumer).not.toContain('ownedDomain/concretePlacementProductionBindingR1');
    expect(consumer).not.toContain('extractConcretePlacementCanonicalParametersR1');
    expect(consumer).toContain('getCanonicalEstimateCatalogItemForPrompt(input.catalogId,input.prompt)');
    const server=fs.readFileSync(path.resolve('src/lib/estimate/backendPlatform/canonicalConcretePlacementPromptServerR1.ts'),'utf8');
    expect(server).toContain('from "../ownedDomain/concretePlacementProductionBindingR1"');
    expect(server).toContain('extractConcretePlacementCanonicalParametersR1({catalogId:catalog.catalogId,text:prompt})');
  });
});

describe('catalog prompt extraction existing transport',()=>{
  beforeEach(()=>{
    mockGetSession.mockReset();mockFetchWithRequestTimeout.mockReset();resetCanonicalEstimateRuntimeCompatibilityForTests();
    for(const key of ['EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW','EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY',
      'EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID','EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID','EXPO_PUBLIC_BUILD_COMMIT',
      'EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH','EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH','EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT','EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID'])delete process.env[key];
    mockGetSession.mockResolvedValue({data:{session:{access_token:'test-only-token',expires_at:Math.floor(Date.now()/1000)+7200}},error:null});
  });
  const response=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}});
  test('uses one authenticated POST with the same admitted catalog and exact bound response',async()=>{
    const item=catalog(),binding=deriveCanonicalCatalogPromptExtractionV1(item,prompt);
    mockFetchWithRequestTimeout.mockResolvedValue(response({item,promptExtraction:binding}));
    const result=await getCanonicalEstimateCatalogItemForPrompt(item.catalogId,prompt,undefined,item.releaseId);
    expect(result).toEqual({item,promptExtraction:binding});expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    const[url,options]=mockFetchWithRequestTimeout.mock.calls[0];
    expect(new URL(url).search).toBe('');expect(new URL(url).pathname).toContain('/catalog/'+encodeURIComponent(item.catalogId));
    expect(options.method).toBe('POST');expect(JSON.parse(options.body)).toEqual({prompt,releaseId:item.releaseId});
    expect(options.headers.Authorization).toBe('Bearer test-only-token');
  });
  test.each(['missing','wrong-prompt','wrong-catalog','stale-release','not-admitted'])
  ('does not fall back to GET or local parsing: %s',async kind=>{
    const item=catalog(),valid=deriveCanonicalCatalogPromptExtractionV1(item,prompt);
    let payload:unknown={item,promptExtraction:valid};
    if(kind==='missing')payload={item};
    if(kind==='wrong-prompt')payload={item,promptExtraction:{...valid,prompt:'other'}};
    if(kind==='wrong-catalog')payload={item:{...item,catalogId:'other'},promptExtraction:valid};
    if(kind==='stale-release')payload={item,promptExtraction:{...valid,releaseId:'stale'}};
    if(kind==='not-admitted')payload={item:{...item,contentAdmission:{allowed:false,contractVersion:'estimate-admission-r3'}},promptExtraction:valid};
    mockFetchWithRequestTimeout.mockResolvedValue(response(payload));
    await expect(getCanonicalEstimateCatalogItemForPrompt(item.catalogId,prompt)).rejects.toMatchObject({
      code:kind==='not-admitted'?'ESTIMATE_ADMISSION_DENIED':'CATALOG_PROMPT_BINDING_INVALID'});
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0][1].method).toBe('POST');
  });
  test('the ordinary async consumer takes the same POST result and fails closed without its DTO',async()=>{
    const item=catalog();mockFetchWithRequestTimeout.mockResolvedValue(response({item}));
    await expect(compileConsumerCanonicalBaseline({catalogId:item.catalogId,prompt,draftId:'TEST_ONLY_PROMPT_TRANSPORT'}))
      .rejects.toMatchObject({code:'CATALOG_PROMPT_BINDING_INVALID'});
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0][1].method).toBe('POST');
  });
  test('bounds the new POST request before fetch and its response before admission',async()=>{
    await expect(getCanonicalEstimateCatalogItemForPrompt(catalog().catalogId,' '.repeat(MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1)+prompt))
      .rejects.toMatchObject({code:'REQUEST_TOO_LARGE',httpStatus:413});
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    mockFetchWithRequestTimeout.mockResolvedValue(new Response('{}',{headers:{'Content-Length':String(MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1+1)}}));
    await expect(getCanonicalEstimateCatalogItemForPrompt(catalog().catalogId,prompt)).rejects.toMatchObject({code:'CATALOG_PROMPT_RESPONSE_TOO_LARGE',httpStatus:502});
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
  });
  test('keeps a backend failure instead of issuing a fallback lookup',async()=>{
    mockFetchWithRequestTimeout.mockResolvedValue(response({error:{code:'NOT_READY',message:'test-only backend not ready'}},503));
    await expect(getCanonicalEstimateCatalogItemForPrompt(catalog().catalogId,prompt)).rejects.toMatchObject({code:'NOT_READY',httpStatus:503});
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
  });
});
