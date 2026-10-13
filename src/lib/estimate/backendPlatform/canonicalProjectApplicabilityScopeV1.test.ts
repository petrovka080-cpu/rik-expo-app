import {resolveCanonicalScopeRequirementV1} from './canonicalScopeRequirementV1';
const newPlan='Согласованный предстоящий пирог',oldStates=['Верхнее основание уже принято и огрунтовано','Верхнее основание уже принято; грунтование предстоит','Прежний прогноз стяжки без нижних слоёв'];
const graph={costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:'lower-chain',groupTitleRu:'Проектная применимость нижних слоёв',titleRu:'Согласованная будущая конструкция',reasonRu:'Проектная применимость не подтверждает фактическое выполнение.',objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:'condition',unknownObjectValues:oldStates,exactScopeWhen:{kind:'equals',parameterId:'condition',value:newPlan},coveringRowIds:[],originalRowIds:[],sourceEvidence:[{sha256:'1'.repeat(64),locator:'Source control'}]}};
function resolve(value:unknown,g:Record<string,unknown>=graph){return resolveCanonicalScopeRequirementV1({graph:g,rowId:'chain',parameters:{condition:value},parameterIds:new Set(['condition']),resourceIds:new Set(['chain']),knownQuantityRowIds:new Set()});}
test.each([...oldStates,null])('new planned layers require the coherent project state, not already accepted upper conditions: %s',value=>{
 expect(resolve(value)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['condition']});
});
test('the opt-in project check confirms applicability only and does not invent a legacy classification',()=>{
 expect(resolve(newPlan)).toMatchObject({status:'COMPLETED',separatePaymentAccepted:false,numericNormAccepted:false});
 expect(resolve('Нужен другой расчёт')).toMatchObject({status:'SCOPE_UNVERIFIED'});
});
test('historical OBJECT_SCOPE still requires and preserves an explicit legacy value',()=>{
 const old=structuredClone(graph) as any;delete old.scopeRequirementV1.objectFactMode;
 expect(()=>resolve(newPlan,old)).toThrow('scope requirement identity invalid');
 old.scopeRequirementV1.legacyObjectValue='Реальный прежний состав';expect(resolve('Реальный прежний состав',old)).toMatchObject({status:'LEGACY_SOURCE_REQUIRED'});
});
test.each(['contradictoryLegacy','unknownMode'])('rejects a contradictory project-only contract: %s',kind=>{
 const bad=structuredClone(graph) as any;if(kind==='contradictoryLegacy')bad.scopeRequirementV1.legacyObjectValue=oldStates[0];else bad.scopeRequirementV1.objectFactMode='IGNORE_VALIDATION';
 expect(()=>resolve(newPlan,bad)).toThrow('scope requirement identity invalid');
});
test('an unused or wholly excluded planned operation does not reopen the upper-base project state',()=>{
 const g=structuredClone(graph) as any;g.scopeRequirementV1.projectOperationContextsV1=[{when:{kind:'equals',parameterId:'lower',value:'planned'},resourceRowIds:['lower-material']}];
 const input={graph:g,rowId:'chain',parameters:{condition:oldStates[0],lower:'planned'},parameterIds:new Set(['condition','lower']),resourceIds:new Set(['chain','lower-material']),knownQuantityRowIds:new Set<string>(),excludedOperationResourceRowIds:new Set<string>()};
 expect(resolveCanonicalScopeRequirementV1(input)).toMatchObject({status:'OBJECT_FACT_REQUIRED'});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,lower:'none'}})).toMatchObject({status:'NOT_APPLICABLE'});
 expect(resolveCanonicalScopeRequirementV1({...input,excludedOperationResourceRowIds:new Set(['lower-material'])})).toMatchObject({status:'NOT_APPLICABLE'});
 const old=structuredClone(g);delete old.scopeRequirementV1.objectFactMode;old.scopeRequirementV1.legacyObjectValue='legacy';expect(()=>resolveCanonicalScopeRequirementV1({...input,graph:old})).toThrow('scope requirement identity invalid');
});
test('conditional project applicability identifies its unknown fact and ignores only the excluded operation',()=>{
 const g=structuredClone(graph) as any;g.scopeRequirementV1.projectOperationContextsV1=[{when:{kind:'equals',parameterId:'lower',value:'planned'},resourceRowIds:['lower-material'],
   applicabilityWhen:{kind:'equals',parameterId:'base',value:'supported'},requiredFactParameterIds:['base'],unknownFactValues:{base:['unknown']}}];
 const input={graph:g,rowId:'chain',parameters:{condition:newPlan,lower:'planned',base:'unknown'},parameterIds:new Set(['condition','lower','base']),resourceIds:new Set(['chain','lower-material']),knownQuantityRowIds:new Set<string>()};
 expect(resolveCanonicalScopeRequirementV1(input)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['base']});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,base:'unsupported'}})).toMatchObject({status:'SCOPE_UNVERIFIED',missingObjectFactParameterIds:[]});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,base:'supported'}})).toMatchObject({status:'COMPLETED'});
 expect(resolveCanonicalScopeRequirementV1({...input,excludedOperationDefinitionRowIds:new Set(['lower-material'])})).toMatchObject({status:'NOT_APPLICABLE'});
 for(const key of ['badRequiredFact','unknownWithoutRequirement']){
   const bad=structuredClone(g);if(key==='badRequiredFact')bad.scopeRequirementV1.projectOperationContextsV1[0].requiredFactParameterIds=['absent'];
   else bad.scopeRequirementV1.projectOperationContextsV1[0].unknownFactValues={absent:['unknown']};
   expect(()=>resolveCanonicalScopeRequirementV1({...input,graph:bad})).toThrow('scope requirement identity invalid');
 }
});
