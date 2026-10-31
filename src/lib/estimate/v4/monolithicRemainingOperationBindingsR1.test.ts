/** Independent source-operation bindings and exact retained legacy boundaries. */
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {resolveProfessionalUnitDefinition} from '../professionalUnitRegistry';
import {resolveEngineeringUnitV4} from './engineeringUnitRegistryV4';
import {buildMonolithicRemainingDefinitionR1 as part,monolithicRemainingParameterIdR1 as pid} from './monolithicRemainingKrer06R1';
import {monolithicPhysicalRepresentativeR2 as originalParent} from './monolithicPhysicalProvisionMasterR2';
import {monolithicRemainingRepresentativeR1 as parent,buildMonolithicRemainingSuccessorR1 as successor,
  monolithicRemainingCompletenessR1 as completeness} from './monolithicRemainingMasterBuilderR1';
import {monolithicReturnWaveConfigR1 as config,monolithicReturnWaveTargetsR1 as targets}
  from '../../../../scripts/estimate/r4a13/prepareMonolithicReturnWaveR1';
import {validateIndependentCompletenessMapReferences as validate}
  from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

type J=Record<string,any>;
const sourceMap=require('../../../../data/estimate-benchmarks/source-packs/monolithic-remaining-operation-provision-r1.json') as J;
// Source-owned six/five/five process references, authored before model reading.
const literalCases=[
  {key:'column-107-01',catalog:'canonical-work:master:monolithic_reinforced_concrete_column_standard',suffixes:['source-0','source-1','source-2','source-3','source-4','source-5']},
  {key:'beam-109-02',catalog:'canonical-work:master:monolithic_reinforced_concrete_beam_standard',suffixes:['source-0','source-1','source-2','source-3','source-4']},
  {key:'stair-111-02',catalog:'canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard',suffixes:['source-0','source-1','source-2','source-3','source-4']},
];

test.each(literalCases)('$key registers every independently required source operation',c=>{
  const prefix='monolithic-remaining:krer06:r1:'+c.key;
  const expected=[prefix+':operation:whole-cycle',...c.suffixes.map(s=>prefix+':operation:'+s)];
  const authored=sourceMap.profiles.find((p:J)=>p.key===c.key).expectedBindings.find((e:J)=>e.sourceKey==='workers');
  expect(authored.requiredOperationIds).toEqual(expected);
  const d=part(c.key),worker=d.resources.find(r=>r.row_id===prefix+':workers')!;
  expect(canonicalEstimateOperationReferences(worker.resource_graph.operationCompositionV1).map(r=>r.operationId)).toEqual(expected);
  const related=(worker.resource_graph.operationCompositionV1 as J).additionalOperations;
  expect(related).toHaveLength(c.suffixes.length);
  expect(related.every((r:J)=>typeof r.completionCriterionRu==='string'&&r.completionCriterionRu.trim().length>0)).toBe(true);
  expect(validate({completenessMap:completeness(c.catalog),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
});

test.each(literalCases)('$key malformed, moved or removed source operation fails unchanged independent map',c=>{
  const d=part(c.key),map=completeness(c.catalog),rowId='monolithic-remaining:krer06:r1:'+c.key+':workers';
  for(const mutation of ['missing-criterion','moved-operation','missing-reference'] as const){
    const rows=structuredClone(d.resources),worker=rows.find(r=>r.row_id===rowId)!;
    const op=worker.resource_graph.operationCompositionV1 as J;
    if(mutation==='missing-criterion')delete op.additionalOperations[0].completionCriterionRu;
    if(mutation==='moved-operation')op.additionalOperations[0].operationId='FOREIGN_OPERATION_NOT_IN_SOURCE';
    if(mutation==='missing-reference')op.additionalOperations.shift();
    expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:rows})).toContain('ENTRY_0_OPERATION_BINDING');
  }
  expect(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>r.row_id!==rowId)}).length).toBeGreaterThan(0);
});

test.each(literalCases)('$key retains old operations and leaves every new row inactive on the exact old baseline',c=>{
  const old=parent(c.catalog),next=successor(old),oldIds=new Set(old.resources.map(r=>r.row_id));
  expect(next.baseline.input_values).toEqual(old.baseline.input_values);
  for(const row of old.resources){
    const retained=next.resources.find(r=>r.row_id===row.row_id)!;
    expect(retained.resource_graph.operationCompositionV1).toEqual(row.resource_graph.operationCompositionV1);
    expect(resolveInclusionGraph(retained.inclusion_ast,old.baseline.input_values).value)
      .toBe(resolveInclusionGraph(row.inclusion_ast,old.baseline.input_values).value);
  }
  for(const row of next.resources.filter(r=>!oldIds.has(r.row_id)))
    expect(resolveInclusionGraph(row.inclusion_ast,old.baseline.input_values).value).toBe(false);
  const prefix='mono_remaining_r1_'+c.key.replaceAll('-','_');
  for(const q of next.parameters.filter(p=>p.parameter_id.startsWith(prefix)
    &&!['UNRESOLVED_APPLICATION_NORM','COMPILER_DERIVED_RESOURCE_QUANTITY'].includes(String(p.truth_metadata.value_source_role))))
    expect(resolveInclusionGraph(q.truth_metadata.visible_when,old.baseline.input_values).value).toBe(false);
});

test('omitted legacy selector remains omitted and cannot request newly added source quantities',()=>{
  const c=literalCases[2]!,old=parent(c.catalog),next=successor(old);
  expect(Object.hasOwn(old.baseline.input_values,'mono_family_source_method_r1')).toBe(false);
  expect(Object.hasOwn(next.baseline.input_values,'mono_family_source_method_r1')).toBe(false);
  const gate=(next.resources.find(r=>r.row_id===old.resources[0]!.row_id)!.inclusion_ast as J).operands.at(-1);
  expect(gate.kind).toBe('not');expect(gate.operand.kind).toBe('or');
  expect(gate.operand.operands.every((r:J)=>r.kind==='selected'&&r.parameterId==='mono_family_source_method_r1')).toBe(true);
});

test.each(targets.map(t=>({catalogId:t.catalogId})))('$catalogId keeps final compound operation map and old declared operations',({catalogId})=>{
  const cfg=config({releaseId:'TEST_ONLY_RELEASE_NO_PUBLISH',searchReleaseId:'TEST_ONLY_SEARCH_NO_PUBLISH'},catalogId);
  expect(validate({completenessMap:cfg.passport.independentCompletenessMap,
    formulaDefinitions:cfg.formulaDefinitions,resourceDefinitions:cfg.resourceDefinitions})).toEqual([]);
  for(const row of originalParent(catalogId).resources){
    const retained=cfg.resourceDefinitions.find(r=>r.row_id===row.row_id)!;
    expect(retained.resource_graph.operationCompositionV1).toEqual(row.resource_graph.operationCompositionV1);
  }
});

test.each(literalCases)('$key new parameter and resource units pass both real registries',c=>{
  const d=part(c.key);
  for(const q of d.parameters)if(q.unit_id!=null){
    expect(resolveProfessionalUnitDefinition(q.unit_id)).not.toBeNull();
    expect(resolveEngineeringUnitV4(q.unit_id)).not.toBeNull();
  }
  for(const row of d.resources){
    if(row.unit_id===''){
      expect(row.source_metadata?.sourceRole).toBe('UNRESOLVED_APPLICATION_NORM');
      expect(row.source_metadata?.normativeTrace).toEqual([]);
      expect(row.procurement_eligible).toBe(false);
      expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
      const formula=d.formulas.find(f=>f.formula_id===row.formula_id)!;
      expect(formula.input_parameter_ids).toHaveLength(1);
      const parameter=d.parameters.find(p=>p.parameter_id===formula.input_parameter_ids[0])!;
      expect(parameter.default_value).toBeNull();
      expect((parameter.truth_metadata as J).value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
      expect((parameter.truth_metadata as J).visibility_role).toBe('INTERNAL_ONLY');
      continue;
    }
    expect(resolveProfessionalUnitDefinition(row.unit_id)).not.toBeNull();
    expect(resolveEngineeringUnitV4(row.unit_id)).not.toBeNull();
  }
});

test('beam depth stays a scalar millimetre measurement with the exact 500..800 boundary',()=>{
  const q=part('beam-109-02').parameters.find(q=>q.parameter_id===pid('beam-109-02','depth_mm'))!;
  expect(q.unit_id).toBeNull();expect(q.title_ru).toContain(', мм');
  expect(q.value_type).toBe('decimal');expect((q.constraints_json as J).min).toBe(500);
  expect((q.constraints_json as J).exclusiveMin).toBe(500);expect((q.constraints_json as J).max).toBe(800);
});
