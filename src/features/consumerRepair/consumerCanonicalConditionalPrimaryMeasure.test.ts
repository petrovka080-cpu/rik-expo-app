import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {buildCanonicalBaselinePlan} from '../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';
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

describe('conditional readonly area identity from ordinary measured geometry',()=>{
  const areaCatalog=():CanonicalEstimateCatalogItem=>{
    const c=makeCatalog();
    c.applicability.primaryMeasureSelectionV1={...metadata,selections:[metadata.selections[0],
      {selectorValue:'Полный комплект',primaryMeasureParameterId:'area_m2',unitId:'m2'}]};
    const measured=(parameterId:string,titleRu:string,ordinal:number):CanonicalEstimateCatalogItem['parameterSchema'][number]=>({
      parameterId,titleRu,ordinal,valueType:'decimal',unitId:'linear_m',required:false,defaultValue:null,
      constraints:{min:0.001,requiredWhen:{kind:'equals',parameterId:'composition',value:'Полный комплект'}},
      visibilityRole:'USER_INPUT',valueSourceRole:'USER_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'},formulaConsumers:['geometry:area'],
    });
    c.parameterSchema=[...c.parameterSchema.slice(0,2),measured('length_m','Длина пола',2),measured('width_m','Ширина пола',3),{
      parameterId:'area_m2',ordinal:4,titleRu:'Площадь по измеренной геометрии',valueType:'decimal',unitId:'m2',
      required:false,defaultValue:null,constraints:{},visibilityRole:'INTERNAL_ONLY',
      valueSourceRole:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtimeProfileClassification:'PRELIMINARY_SOURCE_FORMULA',
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},formulaConsumers:['work:area'],
      normativeLinks:[{sourceId:'reviewed-geometry',documentTitleRu:'Правило измерения прямоугольника',editionStatus:'reviewed/v1',
        locator:'Длина × ширина',applicabilityRu:'Измеренный прямоугольный участок',verifiedAt:'2026-10-21T00:00:00Z',verifiedSource:'reviewed-geometry'}],
      guide:{guideKind:'DERIVED_VALUE_RULE',guideShortRu:'Площадь вычисляется из длины и ширины.',
        guideValidationPolicy:'MANDATORY_BLOCK',sourceRole:'ENGINEERING_DESIGN',sourceDocument:'reviewed-geometry',
        sourceLocator:'Прямоугольник: длина × ширина',guideVersion:'reviewed/v1',sourceSnapshotHash:'a'.repeat(64),
        applicability:'Измеренный прямоугольный участок',verifiedAt:'2026-10-21T00:00:00Z'},
    }];
    return c;
  };
  const run=(parameters:Record<string,string>,prompt='Расчёт прямоугольного участка')=>
    buildCanonicalBaselinePlan({catalog:areaCatalog(),prompt,parameterOverrides:parameters});
  it('submits length and width, selects m2, and excludes supplied internal area and an unsubmitted legacy default',()=>{
    const result=run({composition:'Полный комплект',length_m:'10',width_m:'10',area_m2:'999'});
    expect(result.primaryMeasureParameterId).toBe('area_m2');
    expect(result.parameters).toEqual({composition:'Полный комплект',length_m:'10',width_m:'10'});
  });
  it('preserves an explicitly submitted legacy fact without treating it as the selected physical measure',()=>{
    const result=run({composition:'Полный комплект',length_m:'10',width_m:'10',q:'777'});
    expect(result.primaryMeasureParameterId).toBe('area_m2');
    expect(result.parameters).toEqual({composition:'Полный комплект',length_m:'10',width_m:'10',q:'777'});
  });
  it('asks for actual dimensions instead of using a stated area as either length',()=>{
    expect(()=>run({composition:'Полный комплект'},'Пол площадью 100 м²'))
      .toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:['length_m','width_m']}));
  });
  it('keeps invalid measured dimensions blocking',()=>{
    expect(()=>run({composition:'Полный комплект',length_m:'-1',width_m:'10'})).toThrow('CANONICAL_BASELINE_CONTRACT_MISSING:MIN');
  });
  it('retains the legacy primary and rejects a raw length identity at the worker boundary',()=>{
    expect(run({composition:'Прежний состав',q:'7'})).toMatchObject({primaryMeasureParameterId:'q',parameters:{q:'7',composition:'Прежний состав'}});
    const c=areaCatalog();
    expect(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:c.applicability.primaryMeasureSelectionV1,
      parameterSchema:c.parameterSchema,submittedParameters:{composition:'Полный комплект',length_m:'10',width_m:'10'},
      explicitPrimaryMeasureParameterId:'length_m'})).toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_SELECTION_INVALID'}));
  });
});
