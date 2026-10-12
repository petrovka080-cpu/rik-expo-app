import {canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
import publishedParents from '../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json';
import valleyPack from '../../../../data/estimate-benchmarks/source-packs/roof-valley-torch-two-companion-s27-67.json';
const primer='roof:prime-ready-emulsion:krer12-016-02',field='roof:torch-two:krer12-002-09',valley='roof:valley-torch-two:krer12-005-03';
const resource=(groupId:string,ordinal:number,rowId=groupId)=>({rowId,titleRu:rowId,operation:{contractVersion:'canonical-operation-resource/v1',groupId,groupTitleRu:groupId,operationId:groupId+':installation',operationTitleRu:groupId,completionCriterionRu:'Control',processOrdinal:ordinal}});
test('Web/PDF sections show source-owned planned preparation before field and additional valleys without changing row ownership',()=>{
 const resources=[resource(field,30,'field-roll'),resource(valley,25,'valley-roll'),resource(primer,10,'emulsion'),resource(valley,25,'valley-worker')],before=JSON.stringify(resources);
 const sections=canonicalEstimateResourceOperationSections(resources);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([primer,valley,field]);
 expect(sections.map(s=>s.resourceIds)).toEqual([['emulsion'],['valley-roll','valley-worker'],['field-roll']]);
 expect(new Set(sections.flatMap(s=>s.resourceIds)).size).toBe(4);expect(JSON.stringify(resources)).toBe(before);
});
test('keeps an unrelated group in its original slot and never interprets unrelated ordinals globally',()=>{
 const sections=canonicalEstimateResourceOperationSections([resource(field,20),resource('other',0),resource(primer,10)]);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([primer,'other',field]);
 expect(canonicalEstimateResourceOperationSections([resource('first',50),resource('second',0)]).map(s=>s.operation?.groupId)).toEqual(['first','second']);
});
test('does not assign the admitted order to another operation or inconsistent ordinals in one group',()=>{
 const different=resource(primer,10);different.operation.operationId='different';
 expect(canonicalEstimateResourceOperationSections([resource(field,20),different]).map(s=>s.operation?.groupId)).toEqual([field,primer]);
 expect(canonicalEstimateResourceOperationSections([resource(field,30),resource(primer,10,'first-primer'),resource(primer,40,'second-primer')]).map(s=>s.operation?.groupId)).toEqual([field,primer]);
});
test('uses the actual published field30/primer10 and admitted valley25 metadata, preserving every saved row',()=>{
 const oldRows=publishedParents.reps[0]!.resources as Record<string,any>[];
 const existing=[field,primer].map(prefix=>oldRows.find(row=>row.row_id===prefix+':workers')!);
 const resources=[...existing.map(row=>({rowId:String(row.row_id),titleRu:String(row.title_ru),operation:row.resource_graph.operationCompositionV1})),resource(valleyPack.prefix,valleyPack.operationProcessOrdinal)];
 const snapshot=JSON.stringify(resources),sections=canonicalEstimateResourceOperationSections(resources);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([primer,valley,field]);
 expect(sections.flatMap(s=>s.resourceIds).sort()).toEqual(resources.map(r=>r.rowId).sort());expect(JSON.stringify(resources)).toBe(snapshot);
});
test('puts independently measured planned screed5 before primer10, valley25 and field30',()=>{
 const screed='roof:cement-screed15:krer12-017-01';
 const sections=canonicalEstimateResourceOperationSections([resource(field,30),resource(valley,25),resource(primer,10),resource(screed,5)]);
 expect(sections.map(s=>s.operation?.groupId)).toEqual([screed,primer,valley,field]);
});
