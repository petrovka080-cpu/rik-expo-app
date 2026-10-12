import {canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
const primer='roof:prime-ready-emulsion:krer12-016-02',field='roof:torch-two:krer12-002-09',valley='roof:valley-torch-two:krer12-005-03';
const resource=(groupId:string,ordinal:number,rowId=groupId)=>({rowId,titleRu:rowId,operation:{contractVersion:'canonical-operation-resource/v1',groupId,groupTitleRu:groupId,operationId:groupId+':installation',operationTitleRu:groupId,completionCriterionRu:'Control',processOrdinal:ordinal}});
test('Web/PDF sections show source-owned planned preparation before field and additional valleys without changing row ownership',()=>{
 const resources=[resource(field,20,'field-roll'),resource(valley,25,'valley-roll'),resource(primer,10,'emulsion'),resource(valley,25,'valley-worker')],before=JSON.stringify(resources);
 const sections=canonicalEstimateResourceOperationSections(resources);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([primer,field,valley]);
 expect(sections.map(s=>s.resourceIds)).toEqual([['emulsion'],['field-roll'],['valley-roll','valley-worker']]);
 expect(new Set(sections.flatMap(s=>s.resourceIds)).size).toBe(4);expect(JSON.stringify(resources)).toBe(before);
});
test('keeps an unrelated group in its original slot and never interprets unrelated ordinals globally',()=>{
 const sections=canonicalEstimateResourceOperationSections([resource(field,20),resource('other',0),resource(primer,10)]);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([primer,'other',field]);
 expect(canonicalEstimateResourceOperationSections([resource('first',50),resource('second',0)]).map(s=>s.operation?.groupId)).toEqual(['first','second']);
});
test('does not assign the admitted order to another operation or contradictory ordinal in a known group',()=>{
 const different=resource(primer,10);different.operation.operationId='different';
 expect(canonicalEstimateResourceOperationSections([resource(field,20),different]).map(s=>s.operation?.groupId)).toEqual([field,primer]);
 expect(canonicalEstimateResourceOperationSections([resource(field,20),resource(primer,30)]).map(s=>s.operation?.groupId)).toEqual([field,primer]);
});
