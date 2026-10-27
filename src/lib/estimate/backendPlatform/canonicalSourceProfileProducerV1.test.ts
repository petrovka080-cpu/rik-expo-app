import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from './canonicalEstimateCompileCore';
import {resolveCanonicalSourceProfileSelectionV1,type CanonicalSourceProfileSelectionV1} from './canonicalSourceProfileSelectionV1';
import {buildCanonicalRevisionCommitPayload} from './canonicalEstimateRevisionWriter';

// Contract fixture only: these branch thresholds are not construction norms.
function metadata():CanonicalSourceProfileSelectionV1 {
  return {contract:'canonical-source-profile-selection/v1',selectorParameterId:'method',geometryParameterIds:['height'],profiles:[
    {selectorValue:'lower',sources:[{sourceId:'TEST_ONLY_LOWER',artifactSha256:'a'.repeat(64),locator:'Contract fixture'}],
      when:{kind:'less_than_or_equal',parameterId:'height',value:4},geometryCopies:[{fromParameterId:'height',toParameterId:'lower_height'}]},
    {selectorValue:'upper',sources:[{sourceId:'TEST_ONLY_UPPER',artifactSha256:'b'.repeat(64),locator:'Contract fixture'}],
      when:{kind:'greater_than',parameterId:'height',value:4},geometryCopies:[{fromParameterId:'height',toParameterId:'upper_height'}]},
  ]};
}
function input():CanonicalEstimateCompileCoreInput {
  const parameters:CanonicalEstimateCompileCoreInput['parameterDefinitions']=[
    {parameter_id:'height',value_type:'decimal',unit_id:'m',required:true,default_value:null,constraints_json:{min:0},
      truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',provenance:{consumer_input_role_v1:'OBJECT_FACT'}}},
    {parameter_id:'method',value_type:'enum',unit_id:null,required:false,default_value:null,constraints_json:{values:['lower','upper']},
      truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}},
    ...['lower_height','upper_height'].map(parameter_id=>({parameter_id,value_type:'decimal',unit_id:'m',required:false,default_value:null,constraints_json:{min:0},
      truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'BACKEND_DERIVED',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',
        source_geometry_copy_v1:{contract:'canonical-source-geometry-copy/v1',fromParameterId:'height',unitId:'m'}}}})),
  ];
  return {operation:'compile',compilerVersion:'TEST_ONLY_SOURCE_PRODUCER',catalogId:'TEST_ONLY_SOURCE_PRODUCER',primaryMeasureParameterId:'height',
    parameterDefinitions:parameters,formulaDefinitions:[{formula_id:'fixture_height',ast:{kind:'parameter',id:'height'},
      input_parameter_ids:['height'],output_unit_id:'m',ast_sha256:'TEST_ONLY_IDENTITY'}],resourceDefinitions:[],
    submittedParameters:{height:'5'},confirmedParameters:{height:'5',method:'lower',lower_height:'3'},
    sourceProfileSelectionV1:{metadata:metadata(),effectiveUserParameters:{height:'5'}},currencyCode:'KGS',
    maximumResourceRows:2000,hashJson:value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}
function resolve(user:Record<string,unknown>,confirmed:Record<string,unknown>={}) {
  const source=input();
  return resolveCanonicalSourceProfileSelectionV1({sourceProfileSelectionMetadata:source.sourceProfileSelectionV1!.metadata,
    effectiveUserParameters:user,confirmedParameters:confirmed,parameterSchema:source.parameterDefinitions.map(p=>({
      parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,defaultValue:p.default_value,
      visibilityRole:String(p.truth_metadata?.visibility_role),valueSourceRole:String(p.truth_metadata?.value_source_role),
      provenance:p.truth_metadata?.provenance as Record<string,unknown>,constraints:p.constraints_json??{},
    }))});
}

describe('canonical source profile producer provenance',()=>{
  test('core records every selected output as derived even when a caller has already resolved it',async()=>{
    const source=input();source.confirmedParameters={height:'5',method:'upper',upper_height:'5'};
    const result=await compileCanonicalEstimateCore(source);
    expect(result.parameters).toEqual({height:'5',method:'upper',upper_height:'5'});
    expect(result.derivedParameters).toEqual({method:'upper',upper_height:'5'});
    expect(result.sourceProfileProducerV1?.outputs).toEqual(result.derivedParameters);
    expect(result.revisionProjection.sourceProfileProducerV1).toEqual(result.sourceProfileProducerV1);
  });
  test('branch change clears inactive selector copies instead of inheriting earlier geometry',async()=>{
    const source=input();const result=await compileCanonicalEstimateCore(source);
    expect(result.parameters).not.toHaveProperty('lower_height');
    expect(result.sourceProfileProducerV1?.geometry).toEqual({height:'5'});
    source.submittedParameters={height:'3'};source.confirmedParameters=result.parameters;
    source.sourceProfileSelectionV1={metadata:metadata(),effectiveUserParameters:{height:'3'}};
    const next=await compileCanonicalEstimateCore(source);
    expect(next.derivedParameters).toEqual({method:'lower',lower_height:'3'});
    expect(next.parameters).not.toHaveProperty('upper_height');
  });
  test('recalculation uses the complete saved user geometry when the raw patch is empty',async()=>{
    const source=input();source.submittedParameters={};
    const result=await compileCanonicalEstimateCore(source);
    expect(result.derivedParameters).toEqual({method:'upper',upper_height:'5'});
  });
  test('a raw patch cannot disagree with the complete saved user input',async()=>{
    const source=input();source.sourceProfileSelectionV1={metadata:metadata(),effectiveUserParameters:{height:'3'}};
    await expect(compileCanonicalEstimateCore(source)).rejects.toMatchObject({code:'SOURCE_PROFILE_SELECTION_INVALID'});
  });
  test.each(['method','lower_height','upper_height'])('raw output %s is rejected for equal, null and undefined values',id=>{
    for(const value of ['upper',null,undefined])expect(()=>resolve({height:'5',[id]:value}))
      .toThrow(expect.objectContaining({code:'SOURCE_PROFILE_TECHNICAL_INPUT_FORBIDDEN'}));
  });
  test.each([undefined,null,''])('cleared geometry %s cannot resurrect inherited outputs or a receipt',height=>{
    const result=resolve({height},{height:'5',method:'upper',upper_height:'5'});
    expect(result.applied).toBe(false);expect(result.confirmedParameters).not.toHaveProperty('method');
    expect(result.confirmedParameters).not.toHaveProperty('upper_height');expect(result).not.toHaveProperty('sourceProfileProducerV1');
  });
  test('the receipt detaches checked source metadata from later caller mutation',()=>{
    const source=input();const m=source.sourceProfileSelectionV1!.metadata as {profiles:{selectorValue:string}[]};
    const resolution=resolveCanonicalSourceProfileSelectionV1({sourceProfileSelectionMetadata:m,
      effectiveUserParameters:{height:'5'},confirmedParameters:{},parameterSchema:[
        {parameterId:'height',valueType:'decimal',unitId:'m',visibilityRole:'USER_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'}},
        {parameterId:'method',valueType:'enum',unitId:null,visibilityRole:'INTERNAL_ONLY',valueSourceRole:'SOURCE_BACKED_PRELIMINARY_PROFILE',
          provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},constraints:{values:['lower','upper']}},
        ...['lower_height','upper_height'].map(parameterId=>({parameterId,valueType:'decimal',unitId:'m',visibilityRole:'INTERNAL_ONLY',valueSourceRole:'BACKEND_DERIVED',
          provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_geometry_copy_v1:{contract:'canonical-source-geometry-copy/v1',fromParameterId:'height',unitId:'m'}}})),
      ]});
    m.profiles[1]!.selectorValue='changed';
    expect(resolution.sourceProfileProducerV1?.metadata.profiles[1]?.selectorValue).toBe('upper');
  });
  test('an owned selector default is rejected before it could restore a previous branch',async()=>{
    const source=input();source.parameterDefinitions[1]!.default_value='lower';
    await expect(compileCanonicalEstimateCore(source)).rejects.toThrow('SOURCE_OWNED_SELECTOR');
  });
  test('legacy core calls omit the new optional receipt entirely',async()=>{
    const source=input();delete source.sourceProfileSelectionV1;source.confirmedParameters={};
    const result=await compileCanonicalEstimateCore(source);
    expect(result).not.toHaveProperty('sourceProfileProducerV1');
    expect(result.revisionProjection).not.toHaveProperty('sourceProfileProducerV1');
  });
  test('the existing serializer keeps the exact producer binding separately from baseline and user values',async()=>{
    const source=input(),result=await compileCanonicalEstimateCore(source);
    const receipt={...result.sourceProfileProducerV1!,definitionVersionId:'TEST_ONLY_DEFINITION',definitionSha256:'c'.repeat(64)};
    const payload=buildCanonicalRevisionCommitPayload({rowCount:0,currencyCode:'KGS',totals:{},checksumSha256:'d'.repeat(64),compilerVersion:'TEST_ONLY',
      parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:{height:'5'},parentRevisionId:null,
      derivedParameters:result.derivedParameters,sourceProfileProducerV1:receipt,identityContract:{}});
    expect(payload.parameterSources).toMatchObject({sourceProfileProducerV1:receipt,baselineAssumptions:{},userParameters:{height:'5'},derivedParameters:{method:'upper',upper_height:'5'}});
  });
});
