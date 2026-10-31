import React from 'react';
import TestRenderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {RequestEstimateSummaryCard} from './RequestEstimateSummaryCard';

const vm = {title:'Устройство плоской кровли — 62,5 м²',summary:'',visibleLines:[],
  rawItemCount:97,preliminaryNeedCount:97,calculatedItemCount:63,consumerQuestionCount:25,
  sourceGates:[{parameterId:'norm_one'},{parameterId:'norm_two'},{parameterId:'norm_three'}],
  trustLevelLabel:'Готовность: нужны уточнения'} as unknown as React.ComponentProps<typeof RequestEstimateSummaryCard>['viewModel'];
function text(count?:number){let r!:ReactTestRenderer;act(()=>{r=TestRenderer.create(<RequestEstimateSummaryCard viewModel={vm} missingParameterCount={count}/>);});const value=JSON.stringify(r.toJSON());act(()=>r.unmount());return value;}

test('the actual editor zero takes precedence over stale inferred row questions without hiding97 pending needs',()=>{
  const output=text(0);expect(output).toContain('Данные объекта заполнены');
  expect(output).toContain('Пока не рассчитано: 97');expect(output).toContain('приложение ещё не завершило расчёт');
  expect(output).not.toContain('Нужно указать данные объекта: 25');
  expect(output).not.toContain('Нужно указать недостающие данные объекта (25)');
});
test('two genuine editable object inputs are neither inflated to25 nor subtracted twice',()=>{
  const output=text(2);expect(output).toContain('Нужно указать данные объекта: 2');
  expect(output).toContain('недостающие данные объекта (2)');expect(output).not.toContain('Данные объекта заполнены');
  expect(output).toContain('Пока не рассчитано: 97');
});
test('a caller without an authoritative editor retains its existing row fallback',()=>{
  expect(text()).toContain('Нужно указать данные объекта: 25');
});
