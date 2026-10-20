import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {buildCanonicalBaselinePlan} from './consumerCanonicalBaselineCompile';
import {PRIMARY_MEASURE_SELECTION_V1,assertCanonicalPrimaryMeasureSelectionV1} from '../../lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';

const metadata={contract:PRIMARY_MEASURE_SELECTION_V1,selectorParameterId:'composition',selections:[
  {selectorValue:'Прежний состав',primaryMeasureParameterId:'q',unitId:'point'},
  {selectorValue:'Полный комплект',primaryMeasureParameterId:'install_count',unitId:'item'},
]};
const makeCatalog=():CanonicalEstimateCatalogItem=>({catalogId:'canonical-work:review-only:conditional-unit',releaseId:'00000000-0000-5000-8000-000000000001',
  namespace:'global',domain:'plumbing',workKey:'conditional_unit',titleRu:'Монтаж изделия',definitionVersion:1,professionalMetadata:{},
  applicability:{primaryMeasureSelectionV1:metadata},parameterSchema:[
    {parameterId:'q',ordinal:0,valueType:'decimal',unitId:'point',titleRu:'Прежний объём',required:false,defaultValue:100,
      constraints:{min:0,requiredWhen:{kind:'equals',parameterId:'composition',value:'Прежний состав'}},visibilityRole:'USER_INPUT',valueSourceRole:'USER_INPUT',
      provenance:{consumer_input_role_v1:'OBJECT_FACT'},formulaConsumers:['legacy:quantity']},
    {parameterId:'composition',ordinal:1,valueType:'enum',unitId:null,titleRu:'Состав работ',required:true,defaultValue:null,
      constraints:{values:['Прежний состав','Полный комплект']},visibilityRole:'USER_INPUT',valueSourceRole:'PROJECT_SPECIFIC_INPUT',
      provenance:{consumer_input_role_v1:'OBJECT_FACT'},formulaConsumers:['selected:quantity']},
    {parameterId:'install_count',ordinal:2,valueType:'integer',unitId:'item',titleRu:'Число монтажей',required:false,defaultValue:null,
      constraints:{min:0,requiredWhen:{kind:'equals',parameterId:'composition',value:'Полный комплект'}},visibilityRole:'USER_INPUT',valueSourceRole:'USER_INPUT',
      provenance:{consumer_input_role_v1:'OBJECT_FACT'},formulaConsumers:['product:quantity']},
  ]});
const plan=(parameters:Record<string,string>,prompt='Монтаж изделия')=>buildCanonicalBaselinePlan({catalog:makeCatalog(),prompt,parameterOverrides:parameters});
describe('ordinary client and server conditional measure contract',()=>{
  it('asks for composition before binding an ambiguous quantity to ordinal-zero q',()=>{
    expect(()=>plan({},'Монтаж 3 шт')).toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:['composition']}));
  });
  it('keeps the old branch in points',()=>{
    expect(plan({composition:'Прежний состав',q:'7'})).toMatchObject({primaryMeasureParameterId:'q',parameters:{q:'7',composition:'Прежний состав'}});
  });
  it('uses explicit product count while q has an old baseline value',()=>{
    const result=plan({composition:'Полный комплект',install_count:'3'});
    expect(result.primaryMeasureParameterId).toBe('install_count');expect(result.parameters.install_count).toBe('3');expect(result.parameters).not.toHaveProperty('q');
  });
  it('binds a stated item count only after composition has been selected',()=>{
    expect(plan({composition:'Полный комплект'},'Монтаж 3 шт')).toMatchObject({primaryMeasureParameterId:'install_count',parameters:{install_count:'3'}});
  });
  it('does not turn a point quantity into a product count',()=>{
    expect(()=>plan({composition:'Полный комплект',q:'100'})).toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:['install_count']}));
  });
  it('rejects malformed catalog metadata instead of choosing another numeric field',()=>{
    const c=makeCatalog();c.applicability.primaryMeasureSelectionV1=null;
    expect(()=>buildCanonicalBaselinePlan({catalog:c,prompt:'Монтаж 3 шт'})).toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_SELECTION_INVALID'}));
  });
  it('server rejects an explicit API identity which disagrees with the selected composition',()=>{
    expect(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:metadata,parameterSchema:makeCatalog().parameterSchema,
      submittedParameters:{composition:'Полный комплект',install_count:'3'},explicitPrimaryMeasureParameterId:'q'}))
      .toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_SELECTION_INVALID',httpStatus:422}));
  });
  it('requires a new root before switching the saved measure, with old manual facts intact',()=>{
    const facts=Object.freeze({composition:'Полный комплект',install_count:'3',q:'77'});
    expect(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:metadata,parameterSchema:makeCatalog().parameterSchema,
      submittedParameters:facts,parentPrimaryMeasure:{parameterId:'q',unitId:'point'}}))
      .toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED',httpStatus:422}));
    expect(facts).toEqual({composition:'Полный комплект',install_count:'3',q:'77'});
  });
});
