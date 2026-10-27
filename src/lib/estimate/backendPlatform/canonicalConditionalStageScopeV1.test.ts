import {resolveCanonicalScopeRequirementV1,groupCanonicalScopeRequirementsV1} from './canonicalScopeRequirementV1';
const eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
const graph:any={costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:'valley',groupTitleRu:'Усиление ендов',titleRu:'Усиление ендов',reasonRu:'Узел и измеренная длина относятся к данным участка; норму получает приложение.',
 contextWhen:eq('field','ready'),exactScopeWhen:{kind:'and',operands:[eq('field','ready'),eq('node','planned')]},notApplicableWhen:eq('node','none'),satisfiedWhen:eq('node','completed'),objectFactParameterId:'node',unknownObjectValues:['unknown'],requiredFactParameterIds:['length'],coveringRowIds:['material','worker'],originalRowIds:[],sourceEvidence:[{sha256:'a'.repeat(64),locator:'005-03'}]}};
const resolve=(parameters:any,override:any={})=>resolveCanonicalScopeRequirementV1({graph,rowId:'scope',parameters,resourceIds:new Set(['scope','material','worker']),parameterIds:new Set(['field','node','length']),knownQuantityRowIds:new Set(['material','worker']),...override});
test.each([[undefined,'OBJECT_FACT_REQUIRED'],['unknown','OBJECT_FACT_REQUIRED'],['other','SCOPE_UNVERIFIED'],['none','NOT_APPLICABLE'],['completed','COMPLETED']])('distinguishes object node %s without assuming absence or repeating completed work', (node,status)=>expect(resolve({field:'ready',node})?.status).toBe(status));
test('requires a real measurement for the admitted node and separates it from an unavailable norm',()=>{
 expect(resolve({field:'ready',node:'planned'})).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['length']});
 expect(groupCanonicalScopeRequirementsV1([resolve({field:'ready',node:'planned'})!])[0]?.missingObjectFactParameterIds).toEqual(['length']);
 expect(resolve({field:'ready',node:'planned',length:'20'})?.status).toBe('INCLUDED');
});
test('applies absence and completion only inside the admitted field context',()=>{
 for(const node of ['none','completed'])expect(resolve({field:'other',node})?.status).toBe('SCOPE_UNVERIFIED');
});
test('retains a missing required-resource blocker and explicit limited operation exclusion',()=>{
 expect(resolve({field:'ready',node:'planned',length:'20'},{excludedQuantityRowIds:new Set(['material'])})?.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
 expect(resolve({field:'ready',node:'planned',length:'20'},{excludedOperationResourceRowIds:new Set(['material','worker'])})?.status).toBe('USER_EXCLUDED');
});
test('rejects contradicting completed/absent conditions and unbound absence',()=>{
 const bad=structuredClone(graph);bad.scopeRequirementV1.satisfiedWhen=eq('node','none');
 expect(()=>resolve({field:'ready',node:'none'},{graph:bad})).toThrow(expect.objectContaining({code:'DEFINITION_INTEGRITY_FAILED'}));
 delete bad.scopeRequirementV1.contextWhen;expect(()=>resolve({field:'ready',node:'other'},{graph:bad})).toThrow();
});
