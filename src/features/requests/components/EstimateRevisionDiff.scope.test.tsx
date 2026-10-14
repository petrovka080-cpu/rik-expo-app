import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {EstimateRevisionDiff} from './EstimateRevisionDiff';
import type {EstimateDraftRevisionDiff} from '../../../lib/estimate/estimateDraftRevisionContract';
const diff:EstimateDraftRevisionDiff={fromRevisionId:'before',toRevisionId:'after',changedParams:[],changedRows:[
 {rowId:'gutter-stage',titleRu:'Подвесные желоба',beforeQuantity:null,afterQuantity:null,unit:'m2',beforeState:'ABSENT',afterState:'NEEDS_CLARIFICATION'},
 {rowId:'gutter-steel',titleRu:'Сталь желобов',beforeQuantity:0,afterQuantity:0.066,unit:'t',beforeState:'CALCULATED',afterState:'CALCULATED',beforeUnitPrice:null,afterUnitPrice:1200,currency:'KGS'},
],changedRowsCount:2,staleArtifactsAfterEdit:{snapshotInvalidated:false,pdfInvalidated:false,buyerHandoffInvalidated:false}};
const content=(node:renderer.ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(content).join('');
const line=(r:renderer.ReactTestRenderer,id:string)=>content(r.root.findByProps({testID:id}));
test('verified stage change has no invented area or quantity; physical quantities and prices still appear',()=>{
 let r!:renderer.ReactTestRenderer;act(()=>{r=renderer.create(<EstimateRevisionDiff diff={diff} scopeRowIds={['gutter-stage']} />);});
 const stage=line(r,'estimate-revision-diff-row-gutter-stage');expect(stage).toContain('этап добавлен в состав сметы');expect(stage).not.toContain('m²');expect(stage).not.toContain('м²');expect(stage).not.toContain('не рассчитано');
 const material=line(r,'estimate-revision-diff-row-gutter-steel');expect(material).toContain('0.066');expect(material).toContain('т');expect(line(r,'estimate-revision-diff-price-gutter-steel')).toContain('1200');act(()=>r.unmount());
});
test('absence of verified scope metadata preserves ordinary quantity comparison',()=>{
 let r!:renderer.ReactTestRenderer;act(()=>{r=renderer.create(<EstimateRevisionDiff diff={diff} />);});
 const stage=line(r,'estimate-revision-diff-row-gutter-stage');expect(stage).toContain('не рассчитано');expect(stage).toContain('м²');expect(stage).not.toContain('этап добавлен');act(()=>r.unmount());
});

test.each([
 {before:null,after:true,label:'нет -> Да'},
 {before:false,after:true,label:'Нет -> Да'},
 {before:true,after:false,label:'Да -> Нет'},
 {before:'false',after:'true',label:'Нет -> Да'},
])('saved Boolean material fact is readable in revision history: $label',({before,after,label})=>{
 const key='existing_polyvinyl_chloride_sheet_roll_floor_aggressive_environment_confirmed';
 const materialDiff:EstimateDraftRevisionDiff={...diff,changedParams:[{key,before,after}],changedRows:[],changedRowsCount:0};
 let r!:renderer.ReactTestRenderer;
 act(()=>{r=renderer.create(<EstimateRevisionDiff diff={materialDiff} parameters={[{
  parameterId:key,label:'Снимается листовое или рулонное покрытие из ПВХ',unit:null,valueType:'boolean',
 }]} />);});
 const material=line(r,'estimate-revision-diff-param-'+key);
 expect(material).toContain(label);
 expect(material).not.toContain('Вариант по проектной документации');
 act(()=>r.unmount());
});
