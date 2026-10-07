import {namespaceAutomaticOwnerDefinitionR1,appendOptionalAutomaticOwnerR1} from '../../src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1';
import {PVC15_FULL_DEFINITION_S2743 as field} from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import {PVC_BITUMEN_TRANSITION_DEFINITION_S2737 as transition} from '../../src/lib/estimate/v4/pvcBitumenTransitionReinforcedGuide2024S2737';
import {pvc15ControlInputS2743} from '../fixtures/pvc15FullCompositionS2743';
import {PVC_TRANSITION_GUIDE2024_CONTROL_INPUT} from '../../scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
const prefix='joint_';
const child=namespaceAutomaticOwnerDefinitionR1({definition:transition,prefix,titlePrefixRu:'Переход ПВХ–битум: '});
const gate={...field.parameters.find(p=>p.parameter_id==='pvc15_defects_mode')!,parameter_id:'include_transition',
 title_ru:'Переход ПВХ–битум входит в выбранный участок',ordinal:field.parameters.length,required:true,
 constraints_json:{values:['Требуется','Не требуется']},truth_metadata:{...field.parameters[0]!.truth_metadata,
 semantic_parameter_key:'composition:include_transition',preliminary_compilation_allowed:true}};
const parent={...field,parameters:[...field.parameters,gate]};
const definition=appendOptionalAutomaticOwnerR1({parent,child,when:{kind:'equals',parameterId:'include_transition',value:'Требуется'}});
const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,submittedParameters,
 catalogId:'canonical-work:base:roofing_interior_flat_roof_install_standard',compilerVersion:'COMPOSITION_CONTROL_ONLY',primaryMeasureParameterId:'area_m2'});
describe('optional authored scopes use the same canonical core',()=>{
 test('namespaces ASTs, inclusion, peers, internal quantity owners and purchase metadata without changing the accepted source',()=>{
  const before=JSON.stringify(transition);
  const bound=namespaceAutomaticOwnerDefinitionR1({definition:transition,prefix,titlePrefixRu:'Переход ПВХ–битум: '});
  expect(JSON.stringify(transition)).toBe(before);expect(bound.runtimeInput).toEqual({});
  const tape=bound.resources.find(r=>r.row_id==='joint_transition:material:tape')!;
  expect(tape.resource_graph.effectiveQuantityOutputV1).toMatchObject({parameterId:'joint_effective_resource_quantity_transition_material_tape'});
  const internal=bound.parameters.find(p=>p.parameter_id==='joint_effective_resource_quantity_transition_material_tape')!;
  expect(internal.truth_metadata.effective_resource_quantity_v1).toMatchObject({sourceRowId:tape.row_id});
  expect(bound.parameters.find(p=>p.parameter_id==='joint_tape_required_length_m')!.constraints_json)
    .toMatchObject({greaterThanOrEqualParameter:'joint_transition_length_m',lessThanOrEqualParameter:'joint_tape_roll_length_m'});
  expect(tape.source_metadata?.normativeTrace).toEqual(transition.resources.find(r=>r.row_id==='transition:material:tape')!.source_metadata?.normativeTrace);
 });
 test('an explicitly excluded child leaves all original field rows and no child needs',async()=>{
  const input={...pvc15ControlInputS2743(),include_transition:'Не требуется'};
  const result=await compile(input),original=await compileAutomaticConstructionOwnerR1({definition:field,submittedParameters:pvc15ControlInputS2743(),
    catalogId:'canonical-work:base:roofing_interior_flat_roof_install_standard',compilerVersion:'COMPOSITION_CONTROL_ONLY',primaryMeasureParameterId:'area_m2'});
  expect(result.preliminaryNeeds).toEqual([]);expect(result.rows).toEqual(original.rows);
 });
 test('a selected child reuses accepted source rates and exact balances, with no default machine or stock values',async()=>{
  const facts={...transition.runtimeInput,...PVC_TRANSITION_GUIDE2024_CONTROL_INPUT};
  const selected=Object.fromEntries(Object.entries(facts).map(([id,value])=>[prefix+id,value]));
  const result=await compile({...pvc15ControlInputS2743(),include_transition:'Требуется',...selected});
  expect(result.preliminaryNeeds).toEqual([]);
  expect(result.rows.find(r=>r.row_id==='joint_transition:allocation:adhesive22:lower')?.quantity).toBe('2.4');
  expect(result.rows.find(r=>r.row_id==='joint_transition:material:adhesive22')?.quantity).toBe('5');
  expect(result.rows.find(r=>r.row_id==='joint_transition:machine:welder_included')?.quantity).toBe('0.25');
  await expect(compile({...pvc15ControlInputS2743(),include_transition:'Требуется',...selected,joint_fixing_count_piece:43.5})).rejects.toThrow();
 });
 test('unknown child facts keep known field quantities and precise child needs; supplied incompatible source facts are rejected',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),include_transition:'Требуется',joint_transition_length_m:10});
  expect(result.rows.find(r=>r.row_id==='rc09:reinforced_pvc_roof_membrane_1_5mm')?.quantity).toBe('535');
  expect(result.preliminaryNeeds.find(r=>r.row_id==='joint_transition:material:tape')?.missing_parameter_ids)
    .toEqual(expect.arrayContaining(['joint_tape_roll_length_m','joint_reinforced_guide2024_profile_confirmed']));
  await expect(compile({...pvc15ControlInputS2743(),include_transition:'Требуется',joint_reinforced_guide2024_profile_confirmed:'Неподтверждённая редакция'})).rejects.toThrow();
 });
 test('duplicate components cannot silently replace a source, formula or owner',()=>{
  expect(()=>appendOptionalAutomaticOwnerR1({parent,child:transition,when:{kind:'equals',parameterId:'include_transition',value:'Требуется'}})).toThrow('COMPOSITION_DUPLICATE_PARAMETER');
 });
 test('one authored product input may be shared, while numeric and protected aliases cannot weaken units or constraints',()=>{
  const bound=namespaceAutomaticOwnerDefinitionR1({definition:transition,prefix,titlePrefixRu:'Переход: ',
   parameterAliases:{liquid_pvc_designation:'liquid_pvc_designation'}});
  expect(bound.parameters.some(p=>p.parameter_id==='joint_liquid_pvc_designation')).toBe(false);
  expect(bound.resources.find(r=>r.row_id==='joint_transition:material:liquid_pvc')!.resource_graph.titleSpecificationParameterIds)
   .toEqual(['liquid_pvc_designation']);
  expect(()=>appendOptionalAutomaticOwnerR1({parent,child:bound,when:{kind:'equals',parameterId:'include_transition',value:'Требуется'}})).not.toThrow();
  expect(()=>namespaceAutomaticOwnerDefinitionR1({definition:transition,prefix,titlePrefixRu:'Переход: ',parameterAliases:{hot_air_welder_machine_h:'area_m2'}})).toThrow('COMPOSITION_PARAMETER_ALIAS_INVALID');
  const invalid=namespaceAutomaticOwnerDefinitionR1({definition:transition,prefix,titlePrefixRu:'Переход: ',parameterAliases:{liquid_pvc_designation:'area_m2'}});
  expect(()=>appendOptionalAutomaticOwnerR1({parent,child:invalid,when:{kind:'equals',parameterId:'include_transition',value:'Требуется'}})).toThrow('COMPOSITION_PRODUCT_ALIAS_TARGET_INVALID');
 });
});
