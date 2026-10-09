import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-endpoints-s27-47.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition, type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { compileFormulaGraph } from '../backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from './waterValtecPpr20SingleStraightRouteS2747';
import { VALTEC_MIXED_ELBOWS_S2747_PARAMETERS as previous, VALTEC_MIXED_ELBOWS_S2747_FORMULAS as previousFormulas, VALTEC_MIXED_ELBOWS_S2747_RESOURCES as previousResources, VALTEC_MIXED_ELBOWS_S2747_RUNTIME_INPUT as runtime } from './waterValtecPpr20MixedElbowsS2747';

export const VALTEC_MIXED_ENDPOINTS_S2747 = pack;
export const VALTEC_MIXED_ENDPOINTS_S2747_SOURCE_PACK_SHA256 = 'bac17c1b4f0d9af5af57b5fd633a6b77710bed98fabdc0d996337e0840ac7a79';
const selected = { kind: 'and', operands: [
    { kind: 'selected', parameterId: 'route_geometry_mode', value: route.geometry.straight },
    { kind: 'selected', parameterId: 'route_end_connections', value: pack.endMode },
] };
const notSelected = { kind: 'not', operand: selected };
const inputs = ['route_geometry_mode', 'route_end_connections', ...pack.endpointQuestions.map(q => q.parameterId)];
const guide = { guide_kind: 'PROJECT_DEFINED', source_role: 'CONFIRMED_OBJECT_INTERFACE_PLUS_PRIMARY_PRODUCT',
    source_document: pack.sourceId, source_locator: pack.primarySource.exactLocator,
    source_snapshot_hash: VALTEC_MIXED_ENDPOINTS_S2747_SOURCE_PACK_SHA256, guide_version: 's2747-mixed-endpoints-v1',
    applicability: pack.scope, verified_at: '2026-10-09', guide_validation_policy: 'MANDATORY_BLOCK' };

export const VALTEC_MIXED_ENDPOINTS_S2747_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = [
    ...previous.map(p => {
        if (p.parameter_id === 'route_end_connections')
            return { ...p, constraints_json: { ...p.constraints_json, values: [...Object.values(route.ends), pack.endMode] },
                truth_metadata: { ...p.truth_metadata, guide: { ...guide, guide_short_ru: 'Выберите фактические два окончания. Разные резьбы можно задать отдельно для начала и конца участка.' } } };
        if (p.parameter_id === 'route_derived_end_caps') {
            const lookup = p.truth_metadata!.derived_exact_lookup_v1 as { rows: unknown[] };
            return { ...p, truth_metadata: { ...p.truth_metadata, derived_exact_lookup_v1: { ...lookup,
                rows: [...lookup.rows, { inputValues: [route.geometry.straight, pack.endMode], outputValue: 0 }] } } };
        }
        if (p.parameter_id === 'valtec_thread_selection') {
            const applicable = { kind: 'and', operands: [notSelected, p.constraints_json!.requiredWhen] };
            return { ...p, constraints_json: { ...p.constraints_json, requiredWhen: applicable },
                truth_metadata: { ...p.truth_metadata, visible_when: applicable, required_when: applicable } };
        }
        return p;
    }),
    ...pack.endpointQuestions.map((q, index) => ({ parameter_id: q.parameterId, ordinal: previous.length + index,
        title_ru: q.titleRu, value_type: 'enum', unit_id: null, required: false, default_value: null,
        constraints_json: { values: pack.variants.map(v => v.interfaceRu), requiredWhen: selected },
        truth_metadata: { visibility_role: 'USER_INPUT', value_source_role: 'CONDITIONAL_PROJECT_FACT',
            hidden_default_forbidden: true, preliminary_compilation_allowed: true,
            visible_when: selected, required_when: selected, provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
            resource_branch_consumers: pack.variants.map(v => v.rowId),
            guide: { ...guide, guide_short_ru: 'Укажите резьбу подключаемого узла, а не переходника: G 1/2″ или G 3/4″, наружная или внутренняя. Приложение выберет ответный переходник PP-R 20 мм. Неизвестное подключение требует проверки на объекте.' } } })),
    ...pack.variants.map((v, index) => ({ parameter_id: v.countParameterId, ordinal: previous.length + pack.endpointQuestions.length + index,
        title_ru: 'Количество ' + v.titleRu + ' — рассчитывает приложение', value_type: 'integer', unit_id: 'item', required: false, default_value: null,
        constraints_json: { min: 0, max: 2 }, truth_metadata: { visibility_role: 'USER_DERIVED_READONLY', value_source_role: 'BACKEND_DERIVED',
            provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, catalogue_owned_lookup_v1: true,
            runtime_profile_classification: 'CATALOGUE_SOURCE_SELECTION', derived_from: inputs, resource_branch_consumers: [v.rowId],
            derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1', interpolation: 'FORBIDDEN', inputParameterIds: inputs,
                rows: pack.variants.flatMap(start => pack.variants.map(finish => ({
                    inputValues: [route.geometry.straight, pack.endMode, start.interfaceRu, finish.interfaceRu],
                    outputValue: Number(start.interfaceRu === v.interfaceRu) + Number(finish.interfaceRu === v.interfaceRu),
                }))) },
            guide: { ...guide, guide_kind: 'DERIVED_VALUE_RULE', guide_short_ru: 'Приложение считает выбранные ответные переходники по двум фактическим подключениям. Нулевая модель не попадает в закупку и оплату.' } } })),
];
const variantFormulas: CanonicalEstimateFormulaDefinition[] = pack.variants.map(v => {
    const compiled = compileFormulaGraph(v.countParameterId);
    return { formula_id: `water_${v.countParameterId}_s2747`, output_unit_id: 'item', expression_source: v.countParameterId,
        ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: estimateDeterministicHash(compiled.ast) };
});
export const VALTEC_MIXED_ENDPOINTS_S2747_FORMULAS = [...previousFormulas, ...variantFormulas];
const genericId = 'water-ppr20:05:component:threaded-transitions';
const generic = previousResources.find(r => r.row_id === genericId)!;
const legacyResources = previousResources.map(r => {
    if (r.row_id !== genericId) return r;
    const inclusion = { kind: 'and', operands: [r.inclusion_ast, notSelected] };
    return { ...r, inclusion_ast: inclusion, row_sha256: estimateDeterministicHash({ parent: r.row_sha256, inclusion }) };
});
const variantResources: CanonicalEstimateResourceDefinition[] = pack.variants.map((v, index) => {
    const { row_sha256: _parentHash, ...genericDefinition } = generic;
    const { titleSpecificationParameterIds: _ids, titleSpecificationMode: _mode, effectiveQuantityOutputV1: _effective, ...graph } = generic.resource_graph;
    const balance = graph.purchaseBalanceV1 as Record<string, unknown>;
    const resource: Omit<CanonicalEstimateResourceDefinition, 'row_sha256'> = { ...genericDefinition,
        id: `resource-${v.rowId.replaceAll(':', '-')}`, row_id: v.rowId, ordinal: previousResources.length + index, title_ru: v.titleRu,
        formula_id: variantFormulas[index].formula_id, cost_owner_id: v.rowId,
        inclusion_ast: { kind: 'and', operands: [selected, { kind: 'greater_than', parameterId: v.countParameterId, value: 0 }] },
        resource_graph: { ...graph, formulaId: variantFormulas[index].formula_id, semanticOwnerId: `valtec-endpoint:${v.rowId}`,
            purchaseBalanceV1: { ...balance, consumedExpression: v.countParameterId, plannedConsumptionExpression: v.countParameterId } },
        source_metadata: { ...generic.source_metadata, mixedEndpointSourcePackSha256: VALTEC_MIXED_ENDPOINTS_S2747_SOURCE_PACK_SHA256,
            normativeTrace: [{ sourceId: pack.primarySource.sourceId, source_id: pack.primarySource.sourceId,
                source_url: pack.primarySource.officialUrl, source_definition_hash: pack.primarySource.artifactSha256,
                exact_locator: pack.primarySource.exactLocator, source_title: 'VALTEC: паспорт фитингов PP-R, редакция12.2024; фактические резьбы двух подключений' }] } };
    return { ...resource, row_sha256: estimateDeterministicHash(resource) };
});
export const VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES = [...legacyResources, ...variantResources];
export const VALTEC_MIXED_ENDPOINTS_S2747_RUNTIME_INPUT = runtime;
export async function compileWaterValtecPpr20MixedEndpointsS2747(submittedParameters: Record<string, unknown>, options: {
    confirmedParameters?: Record<string, unknown>;
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.confirmedParameters || options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: 'canonical-estimate-compiler.water-valtec-mixed-endpoints.s2747.v1', catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard',
        primaryMeasureParameterId: 'route_length_m', parameterDefinitions: [...VALTEC_MIXED_ENDPOINTS_S2747_PARAMETERS],
        formulaDefinitions: [...VALTEC_MIXED_ENDPOINTS_S2747_FORMULAS], resourceDefinitions: [...VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES],
        confirmedParameters: { ...runtime, ...options.confirmedParameters }, submittedParameters, rowOverrides: options.rowOverrides,
        currencyCode: 'KGS', priceItems: [], maximumResourceRows: VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES.length, hashJson: value => estimateDeterministicHash(value) });
}
