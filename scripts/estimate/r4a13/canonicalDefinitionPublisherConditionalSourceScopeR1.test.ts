import {canonicalPublisherQuantityScopeIsConsistent as consistent} from './canonicalDefinitionPublisherR1';
import {buildMasterCapabilityMatrix,buildMasterScopeReadiness} from './prepareMasterSingleDefinitionSuccessorR1';
import {buildStairsDokaStandardSourceVariantR1 as build} from '../../../src/lib/estimate/v4/stairsDokaStandardSourceVariantR1';

function actual(){
 const d=build();
 return {parameters:d.parameters,formulas:d.formulas,resources:d.resources,baseline:{input_values:{}},
  passport:{decision:buildMasterScopeReadiness(d.unresolvedResourceRowIds,d.resources),
   capability_matrix:buildMasterCapabilityMatrix(d.unresolvedResourceRowIds,d.resources)}};
}
it('keeps all67 potential Doka obligations in the partial passport while legacy remains an available method',()=>{
 const input=actual();expect(consistent(input)).toBe(true);
 expect(input.passport.decision.unresolvedResourceRowIds).toHaveLength(67);
 expect(input.parameters.find(p=>p.parameter_id.startsWith('stair111_unresolved_'))).toMatchObject({required:false,default_value:null});
});
it.each(['missingCondition','literalFalse','unknownSelector','extraConditionKey','unlistedChoice','hiddenDefault','sourceOwnedSelector','hiddenSelector'])
('refuses to treat %s as an explicit conditional application norm',kind=>{
 const input=actual(),p=input.parameters.find(p=>p.parameter_id.startsWith('stair111_unresolved_'))!;
 const selector=input.parameters.find(p=>p.parameter_id==='stairs_quantity_source_variant')!;
 const condition=p.constraints_json?.requiredWhen;
 if(!p.constraints_json||!condition||typeof condition!=='object'||Array.isArray(condition)||!selector.truth_metadata)
  throw Error('ACTUAL_CONDITIONAL_DOKA_FIXTURE_REQUIRED');
 if(kind==='missingCondition')delete p.constraints_json.requiredWhen;
 if(kind==='literalFalse')p.constraints_json.requiredWhen={kind:'literal',value:false};
 if(kind==='unknownSelector')p.constraints_json.requiredWhen={kind:'selected',parameterId:'unknown',value:'KRER06_111_01_DOKA'};
 if(kind==='extraConditionKey')p.constraints_json.requiredWhen={...condition,clientAllow:true};
 if(kind==='unlistedChoice')p.constraints_json.requiredWhen={kind:'selected',parameterId:selector.parameter_id,value:'not-an-admitted-method'};
 if(kind==='hiddenDefault')selector.default_value='KRER06_111_01_DOKA';
 if(kind==='sourceOwnedSelector')selector.truth_metadata.value_source_role='SOURCE_NORM';
 if(kind==='hiddenSelector')selector.truth_metadata.visibility_role='INTERNAL_ONLY';
 expect(consistent(input)).toBe(false);
});
