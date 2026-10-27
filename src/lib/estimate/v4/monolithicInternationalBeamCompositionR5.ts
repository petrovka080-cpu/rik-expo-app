import { buildMonolithicInternationalBeamR5, internationalBeamPackR5,
  internationalBeamGeometryR5, internationalBeamSourceSelectionR5,
  INTERNATIONAL_BEAM_SELECTOR_R5 } from './monolithicInternationalBeamR5';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { appendOptionalAutomaticOwnerR1 } from './optionalAutomaticOwnerCompositionR1';
import type { CanonicalSourceProfileSelectionV1 } from '../backendPlatform/canonicalSourceProfileSelectionV1';
import type { PrimaryMeasureSelectionV1 } from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { buildMasterParameterCalculationConsumers } from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Input = Readonly<{
  catalogId: string; parent: AutomaticOwnerDefinition;
  sourceProfiles: CanonicalSourceProfileSelectionV1; primarySelection: PrimaryMeasureSelectionV1;
  approval: Readonly<{ contract: 'root-current-beam-whole-international-profile/r5'; expectedParentFingerprint: string }>;
}>;
function assert(value: unknown, code: string): asserts value { if (!value) throw Error('INTERNATIONAL_BEAM_COMPOSITION_' + code); }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** The canonical publisher supplies its exact current typed capture. This is a
 * finite source-profile data adapter; all selection and maths stay in the same
 * resolver/compiler. Historical row/source/payment identities remain intact. */
export function appendMonolithicInternationalBeamR5(input: Input): Readonly<{
  definition: AutomaticOwnerDefinition; sourceProfiles: CanonicalSourceProfileSelectionV1; primarySelection: PrimaryMeasureSelectionV1;
}> {
  assert(input.catalogId === internationalBeamPackR5.catalogId, 'EXACT_EXISTING_BEAM_CARD');
  assert(input.approval.contract === 'root-current-beam-whole-international-profile/r5'
    && estimateDeterministicHash(input.parent) === input.approval.expectedParentFingerprint, 'EXACT_CURRENT_PREIMAGE');
  const selector = INTERNATIONAL_BEAM_SELECTOR_R5, child = buildMonolithicInternationalBeamR5();
  const shared = new Set([selector, ...child.ordinaryParameterIds]);
  assert(input.sourceProfiles.selectorParameterId === selector && input.primarySelection.selectorParameterId === selector, 'SAME_RETAINED_SELECTOR');
  assert(estimateDeterministicHash([...input.sourceProfiles.geometryParameterIds].sort()) === estimateDeterministicHash([...child.ordinaryParameterIds].sort()), 'SAME_FOUR_GEOMETRY_FIELDS');
  const oldSelector = input.parent.parameters.find(parameter => parameter.parameter_id === selector);
  const domain = oldSelector?.constraints_json?.values;
  assert(oldSelector?.value_type === 'enum' && oldSelector.default_value === null
    && oldSelector.truth_metadata.visibility_role === 'INTERNAL_ONLY' && Array.isArray(domain)
    && domain.every(value => typeof value === 'string') && !domain.includes(internationalBeamPackR5.choiceRu), 'RETAINED_FINITE_SELECTOR');
  for (const id of child.ordinaryParameterIds) {
    const old = input.parent.parameters.find(parameter => parameter.parameter_id === id);
    const next = child.parameters.find(parameter => parameter.parameter_id === id);
    assert(old && next && old.value_type === next.value_type && old.unit_id === next.unit_id
      && old.truth_metadata.visibility_role === 'USER_INPUT' && old.default_value === null, 'SHARED_MEASURED_GEOMETRY:' + id);
  }
  const notNew = { kind: 'not', operand: { kind: 'equals', parameterId: selector, value: internationalBeamPackR5.choiceRu } };
  const retainGate = (old: unknown) => ({ kind: 'and', operands: [old ?? { kind: 'literal', value: true }, notNew] });
  const retained: AutomaticOwnerDefinition = { ...input.parent,
    parameters: input.parent.parameters.map(parameter => {
      if (parameter.parameter_id === selector) return { ...parameter, constraints_json: { ...parameter.constraints_json, values: [...domain, internationalBeamPackR5.choiceRu] } };
      if (shared.has(parameter.parameter_id)) return parameter;
      const oldRequired = parameter.constraints_json?.requiredWhen;
      const shouldGateRequired = parameter.required || oldRequired !== undefined;
      return { ...parameter, required: false,
        constraints_json: { ...parameter.constraints_json, ...(shouldGateRequired ? { requiredWhen: retainGate(oldRequired ?? { kind: 'literal', value: parameter.required }) } : {}) },
        truth_metadata: { ...parameter.truth_metadata, visible_when: retainGate(parameter.truth_metadata.visible_when) },
      };
    }),
    resources: input.parent.resources.map(resource => {
      const policy = resource.resource_graph.conditionalEnumPositiveQuantityPolicyV1;
      let graph = resource.resource_graph;
      if (record(policy) && policy.selectorParameterId === selector) {
        assert(Array.isArray(policy.notApplicableValues) && Array.isArray(policy.applicableValues), 'RETAINED_ENUM_POLICY');
        graph = { ...graph, conditionalEnumPositiveQuantityPolicyV1: { ...policy,
          notApplicableValues: [...policy.notApplicableValues, internationalBeamPackR5.choiceRu] } };
      }
      const next = { ...resource, inclusion_ast: retainGate(resource.inclusion_ast), resource_graph: graph, row_sha256: '' };
      return { ...next, row_sha256: estimateDeterministicHash(next) };
    }),
  };
  const result = appendOptionalAutomaticOwnerR1({ parent: retained,
    child: { ...child, parameters: child.parameters.filter(parameter => !shared.has(parameter.parameter_id)) },
    when: { kind: 'equals', parameterId: selector, value: internationalBeamPackR5.choiceRu },
  });
  const consumers = buildMasterParameterCalculationConsumers(result);
  const definition = { ...result, parameters: result.parameters.map(parameter => ({ ...parameter,
    truth_metadata: { ...parameter.truth_metadata, formula_consumers: consumers.formulaConsumers[parameter.parameter_id],
      resource_branch_consumers: consumers.resourceConsumers[parameter.parameter_id] },
  })) };
  return { definition, sourceProfiles: { ...structuredClone(input.sourceProfiles),
    profiles: [...structuredClone(input.sourceProfiles.profiles), ...internationalBeamSourceSelectionR5().profiles] },
    primarySelection: { ...structuredClone(input.primarySelection), selections: [...structuredClone(input.primarySelection.selections),
      { selectorValue: internationalBeamPackR5.choiceRu, primaryMeasureParameterId: internationalBeamGeometryR5('volume_m3'), unitId: 'm3' }] },
  };
}
