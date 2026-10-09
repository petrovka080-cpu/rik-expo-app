import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-source-applicability-s27-48.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { compileFormulaGraph } from '../backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { VALTEC_KNOWN_ZERO_S2748_PARAMETERS as previousParameters, VALTEC_KNOWN_ZERO_S2748_FORMULAS as previousFormulas,
    VALTEC_KNOWN_ZERO_S2748_RESOURCES as previousResources, VALTEC_KNOWN_ZERO_S2748_RUNTIME_INPUT as previousRuntime } from './waterValtecPpr20KnownZeroS2748';

export const VALTEC_SOURCE_APPLICABILITY_S2748 = pack;
export const VALTEC_SOURCE_APPLICABILITY_S2748_SHA256 = '9c280300aa30505e39c74608c40c20a2c681a27ca52bc2944af2dc088c9288b2';
const unresolved = new Set(Object.keys(pack.unresolvedApplicationParameters));
const unresolvedRows = new Set(pack.unresolvedResourceRowIds);
export function withoutUnconfirmedValtecNormsS2748(input: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(input).filter(([id]) => !unresolved.has(id)));
}
function applicationRequirement(parameter: CanonicalEstimateParameterDefinition): CanonicalEstimateParameterDefinition {
    if (!unresolved.has(parameter.parameter_id)) return parameter;
    const reason = pack.unresolvedApplicationParameters[parameter.parameter_id as keyof typeof pack.unresolvedApplicationParameters];
    return { ...parameter, required: false, default_value: null,
        truth_metadata: { ...parameter.truth_metadata, visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM',
            runtime_profile_value: false, source_confirmation_required: true,
            provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, unresolved_norm_reason: reason,
            guide: { guide_kind: 'PROJECT_DEFINED', source_role: 'UNRESOLVED_APPLICATION_REQUIREMENT',
                source_document: pack.sourceId, source_locator: pack.sources.map(s => s.exactLocator).join(' | '),
                source_snapshot_hash: VALTEC_SOURCE_APPLICABILITY_S2748_SHA256, verified_at: '2026-10-09T06:33:13Z',
                guide_short_ru: 'Потребность сохранена. ' + reason + ' Применимый источник или программу работ уточняет приложение.' } } };
}
const wasteBagRequirement: CanonicalEstimateParameterDefinition = {
    parameter_id: 'waste_bag_count', ordinal: previousParameters.length, value_type: 'integer', unit_id: 'item',
    title_ru: 'Мешки для обрезков и упаковки', required: false, default_value: null, constraints_json: { min: 0 }, truth_metadata: {},
};
export const VALTEC_SOURCE_APPLICABILITY_S2748_PARAMETERS = [...previousParameters, wasteBagRequirement].map(applicationRequirement);
export const VALTEC_SOURCE_APPLICABILITY_S2748_RUNTIME_INPUT = withoutUnconfirmedValtecNormsS2748(previousRuntime);
export const VALTEC_SOURCE_APPLICABILITY_S2748_FORMULAS = previousFormulas.map(formula => {
    if (formula.formula_id !== 'water_valtec_ppr20_waste_bags_s2723') return formula;
    const compiled = compileFormulaGraph('waste_bag_count');
    return { ...formula, expression_source: 'waste_bag_count', ast: compiled.ast,
        input_parameter_ids: compiled.inputParameterIds, ast_sha256: estimateDeterministicHash(compiled.ast) };
});
export const VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES = previousResources.map(resource => {
    if (!unresolvedRows.has(resource.row_id)) return resource;
    const { row_sha256: _priorHash, ...definition } = resource;
    const updated = { ...definition, source_metadata: { ...definition.source_metadata, normativeTrace: [],
        sourceRole: 'UNRESOLVED_APPLICATION_REQUIREMENT', technical_acceptance: 'NOT_ACCEPTED',
        sourceApplicabilitySha256: VALTEC_SOURCE_APPLICABILITY_S2748_SHA256 } };
    return { ...updated, row_sha256: estimateDeterministicHash(updated) };
});
export async function compileWaterValtecSourceApplicabilityS2748(submittedParameters: Record<string, unknown>, options: {
    confirmedParameters?: Record<string, unknown>;
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.confirmedParameters || options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: pack.contract, catalogId: pack.catalogId, primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: VALTEC_SOURCE_APPLICABILITY_S2748_PARAMETERS, formulaDefinitions: VALTEC_SOURCE_APPLICABILITY_S2748_FORMULAS,
        resourceDefinitions: VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES,
        // Filter only the obsolete application profile. Explicit caller values
        // still reach the common validation guard and must be rejected.
        confirmedParameters: { ...VALTEC_SOURCE_APPLICABILITY_S2748_RUNTIME_INPUT, ...options.confirmedParameters },
        submittedParameters, rowOverrides: options.rowOverrides, currencyCode: 'KGS', priceItems: [],
        maximumResourceRows: VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES.length, hashJson: value => estimateDeterministicHash(value) });
}
