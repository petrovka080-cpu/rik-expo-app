import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-elbows-s27-47.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition, type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { compileFormulaGraph } from '../backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { VALTEC_SINGLE_ROUTE_S2747 as route, VALTEC_SINGLE_ROUTE_S2747_PARAMETERS as previous, VALTEC_SINGLE_ROUTE_S2747_FORMULAS as previousFormulas, VALTEC_SINGLE_ROUTE_S2747_RESOURCES as previousResources, VALTEC_SINGLE_ROUTE_S2747_RUNTIME_INPUT as runtime } from './waterValtecPpr20SingleStraightRouteS2747';
export const VALTEC_MIXED_ELBOWS_S2747 = pack;
export const VALTEC_MIXED_ELBOWS_S2747_SOURCE_PACK_SHA256 = 'db51b569f8a7860fac86f5832d585894ae8b8a7e83511a32550227a957cfe9d8';
const geometryId = 'route_geometry_mode';
const mixed = { kind: 'equals', parameterId: geometryId, value: pack.geometryMode };
const selectedMixed = { kind: 'selected', parameterId: geometryId, value: pack.geometryMode };
const notMixed = { kind: 'not', operand: selectedMixed };
const project = { kind: 'or', operands: [{ kind: 'equals', parameterId: geometryId, value: route.geometry.project }, mixed] };
const aggregateId = 'elbow_count';
const guide = { guide_kind: 'PROJECT_DEFINED', source_role: 'CONFIRMED_PROJECT_QUANTITIES_PLUS_PRIMARY_PRODUCT',
    source_document: pack.sourceId, source_locator: 'Actual counts of45/90degree turns; ' + pack.variants.map(v => v.exactLocator).join('; '),
    source_snapshot_hash: VALTEC_MIXED_ELBOWS_S2747_SOURCE_PACK_SHA256, guide_version: 's2747-mixed-elbows-v1',
    applicability: pack.scope, verified_at: '2026-10-09', guide_validation_policy: 'MANDATORY_BLOCK' };
export const VALTEC_MIXED_ELBOWS_S2747_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = [
    ...previous.map(p => {
        if (p.parameter_id === geometryId)
            return { ...p, constraints_json: { ...p.constraints_json,
                    values: [...Object.values(route.geometry), pack.geometryMode] } };
        if (p.parameter_id === aggregateId) {
            const old = p.truth_metadata!.preliminary_value_formula_v1 as Record<string, unknown>;
            return { ...p, truth_metadata: { ...p.truth_metadata,
                    derived_from: [geometryId, ...pack.variants.map(v => v.parameterId)],
                    preliminary_value_formula_v1: { version: 'canonical-preliminary-parameter-formula:v1', branches: [
                            { expression: old.expression, when: old.when, explicitValuePolicy: old.explicitValuePolicy },
                            { expression: pack.applicationDerivation.aggregateCount, when: mixed, explicitValuePolicy: 'REQUIRE_MATCH' },
                        ] }, guide: { ...guide, guide_short_ru: 'Для смешанных поворотов приложение складывает реальные количества45° и90°. В однородной ведомости сохраняется введённый общий счёт.' },
                } };
        }
        if (['straight_coupling_count', 'tee_count', 'threaded_transition_count', 'terminal_cap_count'].includes(p.parameter_id))
            return { ...p, truth_metadata: { ...p.truth_metadata, visible_when: project } };
        if (p.parameter_id === 'valtec_elbow_selection') {
            const applicable = { kind: 'and', operands: [notMixed, p.constraints_json!.requiredWhen] };
            return { ...p, constraints_json: { ...p.constraints_json, requiredWhen: applicable },
                truth_metadata: { ...p.truth_metadata, visible_when: applicable, required_when: applicable } };
        }
        return p;
    }),
    ...pack.variants.map((v, index) => ({ parameter_id: v.parameterId, ordinal: previous.length + index, value_type: 'integer', unit_id: 'item',
        title_ru: v.questionRu, required: false, default_value: null, constraints_json: { min: 0, requiredWhen: mixed },
        truth_metadata: { visibility_role: 'USER_INPUT', value_source_role: 'CONDITIONAL_PROJECT_FACT',
            provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, preliminary_compilation_allowed: true,
            visible_when: mixed, required_when: mixed, resource_branch_consumers: [v.rowId],
            guide: { ...guide, guide_short_ru: 'Укажите реальное количество поворотов этого угла по трассе или ведомости; 0, если их нет. Норму сварки и модель изделия приложение подставит само.' },
        } })),
];
const variantFormulas: CanonicalEstimateFormulaDefinition[] = pack.variants.map(v => {
    const compiled = compileFormulaGraph(v.parameterId);
    return { formula_id: `water_valtec_ppr20_elbows${v.angleDegrees}_s2747`, output_unit_id: 'item', expression_source: v.parameterId,
        ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: estimateDeterministicHash(compiled.ast) };
});
export const VALTEC_MIXED_ELBOWS_S2747_FORMULAS = [...previousFormulas, ...variantFormulas];
const genericId = 'water-ppr20:05:component:elbows';
const generic = previousResources.find(r => r.row_id === genericId)!;
const legacyResources = previousResources.map(r => {
    if (r.row_id !== genericId)
        return r;
    const inclusion = { kind: 'and', operands: [r.inclusion_ast, notMixed] };
    return { ...r, inclusion_ast: inclusion, row_sha256: estimateDeterministicHash({ parent: r.row_sha256, inclusion }) };
});
const variantResources: CanonicalEstimateResourceDefinition[] = pack.variants.map((v, index) => {
    const { row_sha256: _parentHash, ...genericDefinition } = generic;
    const { titleSpecificationParameterIds: _ids, titleSpecificationMode: _mode, effectiveQuantityOutputV1: _effective, ...graph } = generic.resource_graph;
    const balance = graph.purchaseBalanceV1 as Record<string, unknown>;
    const resource: Omit<CanonicalEstimateResourceDefinition, 'row_sha256'> = { ...genericDefinition,
        id: `resource-${v.rowId.replaceAll(':', '-')}`, row_id: v.rowId, ordinal: previousResources.length + index, title_ru: v.titleRu,
        formula_id: variantFormulas[index].formula_id, cost_owner_id: v.rowId,
        inclusion_ast: { kind: 'and', operands: [selectedMixed, { kind: 'greater_than', parameterId: v.parameterId, value: 0 }] },
        resource_graph: { ...graph, formulaId: variantFormulas[index].formula_id, semanticOwnerId: `valtec-mixed-elbows:${v.rowId}`,
            purchaseBalanceV1: { ...balance, consumedExpression: v.parameterId, plannedConsumptionExpression: v.parameterId },
        },
        source_metadata: { ...generic.source_metadata, mixedElbowSourcePackSha256: VALTEC_MIXED_ELBOWS_S2747_SOURCE_PACK_SHA256,
            normativeTrace: [{ sourceId: pack.primarySource.sourceId, source_id: pack.primarySource.sourceId,
                    source_url: pack.primarySource.officialUrl, source_definition_hash: pack.primarySource.artifactSha256,
                    exact_locator: v.exactLocator, source_title: 'VALTEC: паспорт фитингов PP-R, редакция12.2024; подтверждённые проектные количества' }],
        },
    };
    return { ...resource, row_sha256: estimateDeterministicHash(resource) };
});
export const VALTEC_MIXED_ELBOWS_S2747_RESOURCES = [...legacyResources, ...variantResources];
export const VALTEC_MIXED_ELBOWS_S2747_RUNTIME_INPUT = runtime;
export async function compileWaterValtecPpr20MixedElbowsS2747(submittedParameters: Record<string, unknown>, options: {
    confirmedParameters?: Record<string, unknown>;
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.confirmedParameters || options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: 'canonical-estimate-compiler.water-valtec-mixed-elbows.s2747.v1', catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard',
        primaryMeasureParameterId: 'route_length_m', parameterDefinitions: [...VALTEC_MIXED_ELBOWS_S2747_PARAMETERS],
        formulaDefinitions: [...VALTEC_MIXED_ELBOWS_S2747_FORMULAS], resourceDefinitions: [...VALTEC_MIXED_ELBOWS_S2747_RESOURCES],
        confirmedParameters: { ...runtime, ...options.confirmedParameters }, submittedParameters, rowOverrides: options.rowOverrides, currencyCode: 'KGS',
        priceItems: [], maximumResourceRows: VALTEC_MIXED_ELBOWS_S2747_RESOURCES.length, hashJson: value => estimateDeterministicHash(value) });
}
