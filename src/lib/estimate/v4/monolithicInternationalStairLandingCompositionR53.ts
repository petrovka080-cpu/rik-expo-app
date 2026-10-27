import { buildMonolithicInternationalStairLandingR53, internationalStairLandingPackR53 as pack,
  landingParameterR53 } from './monolithicInternationalStairLandingR53';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { appendOptionalAutomaticOwnerR1 } from './optionalAutomaticOwnerCompositionR1';
import type { PrimaryMeasureSelectionV1 } from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { buildMasterParameterCalculationConsumers } from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

// Reuse the exact current stairs selector. The consumer chooses the physical
// part, never a normative edition or a machine/steel quantity.
export const LANDING_SELECTOR_R53 = 'mono_family_source_method_r1';
export const LANDING_CHOICE_R53 = 'Прямоугольная монолитная лестничная площадка';
type Input = Readonly<{
  catalogId: string;
  parent: AutomaticOwnerDefinition;
  primarySelection: PrimaryMeasureSelectionV1;
  expectedParentFingerprint: string;
}>;
function check(value: unknown, code: string): asserts value {
  if (!value) throw Error('STAIR_LANDING_COMPOSITION_R53_' + code);
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Finite same-card source composition. Existing resolvers, formula compiler,
 * optional owner factory and retained publisher remain the sole owners. */
export function appendMonolithicInternationalStairLandingR53(input: Input): Readonly<{
  definition: AutomaticOwnerDefinition;
  primarySelection: PrimaryMeasureSelectionV1;
}> {
  check(input.catalogId === pack.catalogId, 'EXACT_CURRENT_CARD');
  check(hash(input.parent) === input.expectedParentFingerprint, 'EXACT_CURRENT_PREIMAGE');
  const selector = input.parent.parameters.find(p => p.parameter_id === LANDING_SELECTOR_R53);
  const domain = selector?.constraints_json?.values;
  check(selector?.value_type === 'enum' && selector.default_value === null
    && selector.truth_metadata.visibility_role === 'USER_INPUT'
    && Array.isArray(domain) && domain.every(v => typeof v === 'string')
    && !domain.includes(LANDING_CHOICE_R53), 'RETAINED_EXPLICIT_PHYSICAL_CHOICE');
  check(input.primarySelection.selectorParameterId === LANDING_SELECTOR_R53
    && input.primarySelection.selections.length === domain.length
    && domain.every(v => input.primarySelection.selections.some(s => s.selectorValue === v)), 'EXACT_OLD_SELECTIONS');
  const selected = { kind: 'equals' as const, parameterId: LANDING_SELECTOR_R53, value: LANDING_CHOICE_R53 };
  const notNew = { kind: 'not', operand: selected };
  const retainedGate = (previous: unknown) => ({ kind: 'and', operands: [previous ?? { kind: 'literal', value: true }, notNew] });
  const previousConsumers = buildMasterParameterCalculationConsumers(input.parent);
  const retiredUnused = new Set(input.parent.parameters.filter(p => p.required === false && p.default_value === null
    && p.truth_metadata.visibility_role === 'INTERNAL_ONLY' && p.truth_metadata.retiredAggregateKitParameter === true
    && previousConsumers.formulaConsumers[p.parameter_id]?.length === 0
    && previousConsumers.resourceConsumers[p.parameter_id]?.length === 0).map(p => p.parameter_id));
  const retained: AutomaticOwnerDefinition = { ...input.parent,
    parameters: input.parent.parameters.map(p => {
      if (p.parameter_id === LANDING_SELECTOR_R53) return { ...p, title_ru: 'Часть лестницы и состав работ',
        constraints_json: { ...p.constraints_json, values: [...domain, LANDING_CHOICE_R53] } };
      if (retiredUnused.has(p.parameter_id)) return p;
      const oldRequired = p.constraints_json?.requiredWhen;
      return { ...p, required: false,
        constraints_json: { ...p.constraints_json, ...(p.required || oldRequired !== undefined
          ? { requiredWhen: retainedGate(oldRequired ?? { kind: 'literal', value: p.required }) } : {}) },
        truth_metadata: { ...p.truth_metadata, visible_when: retainedGate(p.truth_metadata.visible_when) } };
    }),
    resources: input.parent.resources.map(row => {
      const policy = row.resource_graph.conditionalEnumPositiveQuantityPolicyV1;
      let graph = row.resource_graph;
      if (record(policy) && policy.selectorParameterId === LANDING_SELECTOR_R53) {
        check(Array.isArray(policy.notApplicableValues) && Array.isArray(policy.applicableValues), 'OLD_ENUM_POLICY');
        graph = { ...graph, conditionalEnumPositiveQuantityPolicyV1: { ...policy,
          notApplicableValues: [...policy.notApplicableValues, LANDING_CHOICE_R53] } };
      }
      const next = { ...row, inclusion_ast: retainedGate(row.inclusion_ast), resource_graph: graph, row_sha256: '' };
      return { ...next, row_sha256: hash(next) };
    }),
  };
  const child = buildMonolithicInternationalStairLandingR53();
  const next = appendOptionalAutomaticOwnerR1({ parent: retained, child: { ...child,
    parameters: child.parameters.map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
      ...(p.truth_metadata.visibility_role === 'USER_INPUT' ? { visible_when: selected } : {}) } })),
  }, when: selected });
  const consumers = buildMasterParameterCalculationConsumers(next);
  const definition: AutomaticOwnerDefinition = { ...next,
    ordinaryParameterIds: [LANDING_SELECTOR_R53, ...child.ordinaryParameterIds],
    parameters: next.parameters.map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
      formula_consumers: consumers.formulaConsumers[p.parameter_id],
      resource_branch_consumers: consumers.resourceConsumers[p.parameter_id] } })),
  };
  return { definition, primarySelection: { ...structuredClone(input.primarySelection),
    selections: [...structuredClone(input.primarySelection.selections), { selectorValue: LANDING_CHOICE_R53,
      primaryMeasureParameterId: landingParameterR53('volume_m3'), unitId: 'm3' }] } };
}
