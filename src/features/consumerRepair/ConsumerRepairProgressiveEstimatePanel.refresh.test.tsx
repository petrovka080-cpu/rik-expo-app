import React from 'react';
import TestRenderer,{act,type ReactTestRenderer} from 'react-test-renderer';
import {ParameterDisclosurePanel} from './ConsumerRepairProgressiveEstimatePanel';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));

test('saved composition refresh uses the guarded recalculation without inventing parameter edits',async()=>{
  let finish!:(value:boolean)=>void;
  const apply=jest.fn(()=>new Promise<boolean>(resolve=>{finish=resolve;}));
  let renderer!:ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel viewModel={null}
    revision={{revisionId:'saved-parent',params:{},boq:{rows:[]},trace:{params:[]},missingInputs:[]} as never} latestDiff={null} paramEditorEnabled
    canonicalParameterSession={{revisionId:'saved-parent',status:'READY',parameters:[],blockingMissingParameterIds:[],
      contractMissingParameterIds:[],assumptionParameterIds:[],invalidParameterIds:[]} as never}
    onApplyParamBatch={apply}/>);});
  expect(apply).not.toHaveBeenCalled();
  const button=renderer.root.findByProps({testID:'saved-estimate-composition-refresh'});
  await act(async()=>{void button.props.onPress();void button.props.onPress();});
  expect(apply.mock.calls).toEqual([[[]]]);
  expect(renderer.root.findByProps({testID:'saved-estimate-composition-refresh'}).props.disabled).toBe(true);
  await act(async()=>{finish(true);});
  expect(renderer.root.findByProps({testID:'saved-estimate-composition-refresh'}).props.disabled).toBe(false);
  expect(renderer.root.findByProps({testID:'request-estimate-parameter-apply-success'})).toBeTruthy();
  act(()=>renderer.unmount());
});
