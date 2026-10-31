import { buildMonolithicInternationalStairFlightR54, internationalStairFlightsPackR54 as pack,
  FLIGHT_COLUMNS_R54, flightParameterR54 } from './monolithicInternationalStairFlightsR54';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { appendOptionalAutomaticOwnerR1 } from './optionalAutomaticOwnerCompositionR1';
import type { PrimaryMeasureSelectionV1 } from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { buildMasterParameterCalculationConsumers } from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

export const FLIGHT_SELECTOR_R54 = 'mono_family_source_method_r1';
const check = (value: unknown, code: string): void => { if (!value) throw Error('FLIGHTS_COMPOSITION_R54_' + code); };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Two real physical-method profiles in the existing card. The retained
 * optional owner and inclusion graph remain the only composition mechanism. */
export function appendMonolithicInternationalStairFlightsR54(input: Readonly<{
  catalogId: string; parent: AutomaticOwnerDefinition; primarySelection: PrimaryMeasureSelectionV1;
  expectedParentFingerprint: string;
}>): Readonly<{ definition: AutomaticOwnerDefinition; primarySelection: PrimaryMeasureSelectionV1 }> {
  check(input.catalogId === pack.catalogId, 'EXACT_CURRENT_CARD');
  check(hash(input.parent) === input.expectedParentFingerprint, 'EXACT_CURRENT_PREIMAGE');
  const selector = input.parent.parameters.find(p => p.parameter_id === FLIGHT_SELECTOR_R54);
  const domain = selector?.constraints_json?.values;
  if (!Array.isArray(domain) || !domain.every(v => typeof v === 'string')) throw Error('FLIGHTS_R54_RETAINED_ENUM_REQUIRED');
  const choices = pack.columns.map(c => c.choiceRu);
  check(selector?.value_type === 'enum' && selector.default_value === null && selector.truth_metadata.visibility_role === 'USER_INPUT'
    && !choices.some(v => domain.includes(v)), 'EXPLICIT_PHYSICAL_CHOICE');
  check(input.primarySelection.selectorParameterId === FLIGHT_SELECTOR_R54
    && input.primarySelection.selections.length === domain.length
    && domain.every(v => input.primarySelection.selections.some(s => s.selectorValue === v)), 'EXACT_OLD_SELECTIONS');
  const selected = { kind: 'or', operands: choices.map(value => ({ kind: 'equals', parameterId: FLIGHT_SELECTOR_R54, value })) };
  const notNew = { kind: 'not', operand: selected };
  const retainedGate = (previous: unknown) => ({ kind: 'and', operands: [previous ?? { kind: 'literal', value: true }, notNew] });
  const previousConsumers = buildMasterParameterCalculationConsumers(input.parent);
  const retiredUnused = new Set(input.parent.parameters.filter(p => p.required === false && p.default_value === null
    && p.truth_metadata.visibility_role === 'INTERNAL_ONLY' && p.truth_metadata.retiredAggregateKitParameter === true
    && previousConsumers.formulaConsumers[p.parameter_id]?.length === 0
    && previousConsumers.resourceConsumers[p.parameter_id]?.length === 0).map(p => p.parameter_id));
  let next: AutomaticOwnerDefinition = { ...input.parent,
    parameters: input.parent.parameters.map(p => {
      if (p.parameter_id === FLIGHT_SELECTOR_R54) return { ...p, title_ru: 'Часть лестницы и состав работ',
        constraints_json: { ...p.constraints_json, values: [...domain, ...choices] } };
      if (retiredUnused.has(p.parameter_id)) return p;
      const previous = p.constraints_json?.requiredWhen;
      return { ...p, required: false, constraints_json: { ...p.constraints_json,
        ...(p.required || previous !== undefined ? { requiredWhen: retainedGate(previous ?? { kind: 'literal', value: p.required }) } : {}) },
        truth_metadata: { ...p.truth_metadata, visible_when: retainedGate(p.truth_metadata.visible_when) } };
    }),
    resources: input.parent.resources.map(row => {
      const policy = row.resource_graph.conditionalEnumPositiveQuantityPolicyV1;
      let graph = row.resource_graph;
      if (record(policy) && policy.selectorParameterId === FLIGHT_SELECTOR_R54) {
        check(Array.isArray(policy.notApplicableValues) && Array.isArray(policy.applicableValues), 'OLD_ENUM_POLICY');
        graph = { ...graph, conditionalEnumPositiveQuantityPolicyV1: { ...policy,
          notApplicableValues: [...(Array.isArray(policy.notApplicableValues) ? policy.notApplicableValues : []), ...choices] } };
      }
      const body = { ...row, inclusion_ast: retainedGate(row.inclusion_ast), resource_graph: graph, row_sha256: '' };
      return { ...body, row_sha256: hash(body) };
    }),
  };
  const selections = [...structuredClone(input.primarySelection.selections)];
  const ordinary: string[] = [FLIGHT_SELECTOR_R54];
  for (const column of FLIGHT_COLUMNS_R54) {
    const physical = pack.columns.find(c => c.normId === column)!;
    const when = { kind: 'equals' as const, parameterId: FLIGHT_SELECTOR_R54, value: physical.choiceRu };
    const child = buildMonolithicInternationalStairFlightR54(column);
    next = appendOptionalAutomaticOwnerR1({ parent: next, child: { ...child,
      parameters: child.parameters.map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
        ...(p.truth_metadata.visibility_role === 'USER_INPUT' ? { visible_when: when } : {}) } })),
    }, when });
    ordinary.push(...child.ordinaryParameterIds);
    selections.push({ selectorValue: physical.choiceRu, primaryMeasureParameterId: flightParameterR54(column, 'volume_m3'), unitId: 'm3' });
  }
  const consumers = buildMasterParameterCalculationConsumers(next);
  return { definition: { ...next, ordinaryParameterIds: ordinary,
    parameters: next.parameters.map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
      formula_consumers: consumers.formulaConsumers[p.parameter_id], resource_branch_consumers: consumers.resourceConsumers[p.parameter_id] } })),
  }, primarySelection: { ...structuredClone(input.primarySelection), selections } };
}
