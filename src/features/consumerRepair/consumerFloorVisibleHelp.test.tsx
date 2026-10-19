import React from 'react';
import TestRenderer,{act,type ReactTestRenderer} from 'react-test-renderer';
import {ParameterDisclosurePanel} from './ConsumerRepairProgressiveEstimatePanel';
import {canonicalPublicEstimateParameterGuideRu} from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn()}));

test('numeric guidance is visible text and unanswered scope questions precede filled fields',()=>{
 const common={description:'',referenceValue:null,referenceSource:undefined,unit:null,
  requiredLevel:'OPTIONAL',visibilityCondition:{kind:'ALWAYS'},validation:{},affectsFormula:[],affectsRows:['control'],
  normativeSource:null,confidence:0,assumption:null,sourceText:null,displayOrder:0,consumerInputRole:'OBJECT_FACT',
  resourceSelectionInput:true,source:'MISSING',valid:true,validationIssues:[],state:'NOT_APPLICABLE',value:null};
 const area={...common,parameterId:'floor_sand_net_volume_m3',label:'Какой объём песка нужно уложить?',
  valueType:'number',value:12.5,source:'USER_EXPLICIT',state:'PROVIDED',unit:'m3',allowedValues:[],affectsFormula:['volume']};
 const choice={...common,parameterId:'floor_sand_straightedge_option',label:'Есть ли данные проверки ровности?',valueType:'string',
  allowedValues:[{value:'OTHER_OR_UNCONFIRMED_STRAIGHTEDGE_SCOPE',label:'Данных пока нет или условия другие'}]};
 let renderer!:ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} latestDiff={null} paramEditorEnabled
  canonicalParameterSession={{revisionId:'precompile:help',workPassportId:'canonical-work:master:floor_sand_underlayer_krer11_01_002_01',
   status:'COMPLETE',parameters:[area,choice],blockingMissingParameterIds:[],contractMissingParameterIds:[],assumptionParameterIds:[],invalidParameterIds:[]} as never}
  onApplyParamBatch={()=>{}}/>);});
 const help=canonicalPublicEstimateParameterGuideRu(area.parameterId,area.label)!;
 const visible=renderer.root.findAll(n=>typeof n.type==='string'&&n.props.testID==='editable-param-explanation-'+area.parameterId);
 expect(visible).toHaveLength(1);expect(visible[0]!.props.children).toBe(help);
 expect(help).toContain('например 10');expect(help).toContain('оставьте поле пустым');
 const questions=renderer.root.findAll(n=>typeof n.type==='string'&&String(n.props.testID??'').startsWith('editable-param-chip-'));
 expect(questions.map(n=>n.props.testID)).toEqual(['editable-param-chip-'+choice.parameterId,'editable-param-chip-'+area.parameterId]);
 const text=JSON.stringify(renderer.toJSON());expect(text).toContain('Данных пока нет или условия другие');
 expect(text).not.toContain('1 обязательных');act(()=>renderer.unmount());
});
