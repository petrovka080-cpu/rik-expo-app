import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-fischer-supports-s27-47.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition, type CanonicalEstimateResourceDefinition, type CanonicalEstimateFormulaDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { compileFormulaGraph } from '../backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { VALTEC_EXACT_FITTINGS_S2747_PARAMETERS, VALTEC_EXACT_FITTINGS_S2747_RESOURCES } from './waterValtecPpr20ExactFittingsS2747';
import { WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS, WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT, WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID } from './waterValtecPpr20StandardS2723';
export const VALTEC_FISCHER_SUPPORTS_S2747 = pack;
export const VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256 = '83588a4bc67575d6525d58f5bb46c459c45279a830464b8a74f64b50705945b7';
export const VALTEC_FISCHER_SUPPORT_ROW_IDS_S2747 = {
    clamps: 'water-ppr20:03:fastener:fks-clamps', sets: 'water-ppr20:03:fastener:sts-sets',
    stud: 'water-ppr20:03:component:sts-studs', plug: 'water-ppr20:03:component:sx-plus-plugs', nut: 'water-ppr20:03:component:mu-m8-nuts',
} as const;
const ids = VALTEC_FISCHER_SUPPORT_ROW_IDS_S2747;
const removedParameters = new Set(['support_package_item', 'valtec_effective_support_packages']);
const removedFormulas = new Set(['support_packages', 'support_order', 'support_remainder'].map(id => `water_valtec_ppr20_${id}_s2723`));
const runtime = Object.fromEntries(Object.entries(WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT)
    .filter(([id]) => !removedParameters.has(id) && id !== 'substrate_profile'));
export const VALTEC_FISCHER_SUPPORTS_S2747_RUNTIME_INPUT = runtime;
const sourceFor = (sourceId: string) => pack.sources.find(s => s.sourceId === sourceId)!;
const planningPoints = 'ceil(route_length_m/support_spacing_m)+1';
const supportedBase = { kind: 'or', operands: [pack.baseChoices.concrete, pack.baseChoices.solidMasonry]
        .map(value => ({ kind: 'equals', parameterId: 'substrate_profile', value })) };
const system = String(runtime.selected_system_reference);
function productQuantityParameter(id: string, title: string, value: number, sourceId: string, ordinal: number): AutomaticOwnerDefinition['parameters'][number] {
    const source = sourceFor(sourceId);
    return { parameter_id: id, ordinal, value_type: 'integer', unit_id: 'item', title_ru: title, required: true, default_value: null,
        constraints_json: { min: 1 }, truth_metadata: { semantic_parameter_key: `fischer-support:${id}`, visibility_role: 'USER_DERIVED_READONLY',
            value_source_role: 'BACKEND_DERIVED', preliminary_compilation_allowed: true, source_confirmation_required: false,
            hidden_default_forbidden: true, catalogue_owned_lookup_v1: true, synthetic: false,
            provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, derived_from: ['selected_system_reference'],
            derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1', inputParameterIds: ['selected_system_reference'],
                rows: [{ inputValues: [system], outputValue: value }], interpolation: 'FORBIDDEN' },
            guide: { guide_kind: 'DERIVED_VALUE_RULE', guide_short_ru: 'Количество в выбранной поставке подставляет приложение по паспорту изделия.',
                source_role: 'PRIMARY_MANUFACTURER_PRODUCT', source_document: source.sourceId, source_locator: source.exactLocator,
                source_snapshot_hash: source.artifactSha256, guide_version: 's2747-fischer-supports-v1', applicability: pack.scope,
                verified_at: '2026-10-09', guide_validation_policy: 'MANDATORY_BLOCK' } } };
}
const retained = VALTEC_EXACT_FITTINGS_S2747_PARAMETERS.filter(p => !removedParameters.has(p.parameter_id));
export const VALTEC_FISCHER_SUPPORTS_S2747_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = [
    ...retained.map((p, ordinal) => p.parameter_id !== 'substrate_profile' ? { ...p, ordinal } : { ...p, ordinal,
        title_ru: 'Основание креплений трубопровода', default_value: null,
        constraints_json: { values: Object.values(pack.baseChoices) }, truth_metadata: { ...p.truth_metadata,
            value_source_role: 'CONDITIONAL_PROJECT_FACT', runtime_profile_value: false, hidden_default_forbidden: true,
            unknown_enum_values: [pack.baseChoices.unknown], provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
            guide: { ...(p.truth_metadata?.guide as Record<string, unknown>), guide_kind: 'ENUM_DECISION_RULE',
                guide_short_ru: 'Выберите фактическое основание. Для отделки, пустотелой кладки, металла или влажной зоны нужен другой подтверждённый крепёж; приложение не подставляет его наугад.',
                applicability: pack.scope, source_document: pack.sourceId, source_locator: sourceFor('FISCHER_STS_567615').exactLocator,
                source_snapshot_hash: VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256 } } }),
    productQuantityParameter('fischer_fks_package_pcs', 'Хомутов FKS 20–24 в упаковке', pack.clamp.packagePcs, pack.clamp.sourceId, retained.length),
    productQuantityParameter('fischer_sts_points_per_package', 'Креплений STS M8×90 в наборе', pack.fastenerSet.supportPointsPerPackage, pack.fastenerSet.sourceId, retained.length + 1),
    ...[{ parameterId: 'fischer_effective_clamps', rowId: ids.clamps, unit: 'item' },
        { parameterId: 'fischer_effective_sets', rowId: ids.sets, unit: 'set' }].map((binding, index) => ({
        parameter_id: binding.parameterId, ordinal: retained.length + 2 + index, value_type: 'decimal', unit_id: binding.unit,
        title_ru: 'Действительное количество выбранной поставки', required: false, default_value: null, constraints_json: { min: 0 },
        truth_metadata: { visibility_role: 'INTERNAL_ONLY', value_source_role: 'BACKEND_DERIVED',
            effective_resource_quantity_v1: { sourceRowId: binding.rowId, unitId: binding.unit } },
    })),
];
function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
    const graph = compileFormulaGraph(expression);
    return { formula_id: id, output_unit_id: unit, expression_source: expression, ast: graph.ast, input_parameter_ids: graph.inputParameterIds,
        ast_sha256: estimateDeterministicHash(graph.ast) };
}
const clampOrder = `ceil((${planningPoints})/fischer_fks_package_pcs)*fischer_fks_package_pcs`;
const setOrder = `ceil((${planningPoints})/fischer_sts_points_per_package)`;
const delivered = 'fischer_effective_sets*fischer_sts_points_per_package';
const assembled = `min(fischer_effective_clamps,${delivered})`;
export const VALTEC_FISCHER_SUPPORTS_S2747_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = [
    ...WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS.filter(f => !removedFormulas.has(f.formula_id)),
    formula('fischer_clamp_order_s2747', 'item', clampOrder), formula('fischer_set_order_s2747', 'set', setOrder),
    formula('fischer_assembled_supports_s2747', 'item', assembled),
    formula('fischer_support_remainder_s2747', 'item', `max(0,(${assembled})-(${planningPoints}))`),
];
const template: CanonicalEstimateResourceDefinition = VALTEC_EXACT_FITTINGS_S2747_RESOURCES.find(r => r.row_id === 'water-ppr20:03:fastener:support-packages')!;
function supply(rowId: string, title: string, unit: string, formulaId: string, sourceId: string, graph: Record<string, unknown>, included = false): CanonicalEstimateResourceDefinition {
    const source = sourceFor(sourceId);
    const { purchaseBalanceV1: _oldBalance, effectiveQuantityOutputV1: _oldOutput, ...templateGraph } = template.resource_graph;
    const resource = { ...template, id: 'resource-' + rowId.replaceAll(':', '-'), row_id: rowId, title_ru: title, unit_id: unit, formula_id: formulaId,
        inclusion_ast: rowId === ids.clamps ? { kind: 'literal', value: true } : supportedBase, procurement_eligible: !included,
        cost_owner_id: included ? ids.sets : rowId,
        resource_graph: { ...templateGraph, normalizedUom: unit, formulaId, titleSpecificationParameterIds: [],
            semanticOwnerId: `water-valtec-fischer-supports:${rowId}`, costTreatment: included ? 'INCLUDED_IN_RESOURCE_ROWS' : 'OWN_COST',
            payable: !included,
            ...(included ? { includedInResourceOwnerRowId: ids.sets } : {}), ...graph },
        source_metadata: { ...template.source_metadata, sourceRole: 'PRIMARY_MANUFACTURER_PRODUCT_PLUS_VISIBLE_PLANNING_QUANTITY',
            sourcePackSha256: VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256,
            normativeTrace: [{ ...(Array.isArray(template.source_metadata?.normativeTrace) ? template.source_metadata.normativeTrace[0] : {}),
                    sourceId: source.sourceId, source_id: source.sourceId, source_title: source.sourceId,
                    source_url: source.officialUrl, exact_locator: source.exactLocator, source_definition_hash: source.artifactSha256 }],
            engineeringLimitations: pack.engineeringLimitations }, row_sha256: '' };
    return { ...resource, row_sha256: estimateDeterministicHash(resource) };
}
const supportRows = [
    supply(ids.clamps, 'Хомут fischer FKS 20–24, M8; упаковка 100 шт.', 'item', 'fischer_clamp_order_s2747', pack.clamp.sourceId, {
        effectiveQuantityOutputV1: { parameterId: 'fischer_effective_clamps', unitId: 'item' },
        purchaseBalanceV1: { quantityMode: 'supply_quantum', unitId: 'item', consumedExpression: planningPoints,
            stockExpression: '0', reserveExpression: '0', orderQuantumExpression: 'fischer_fks_package_pcs' }
    }),
    supply(ids.sets, 'Набор крепежа fischer STS Kit M8×90: по 4 шпильки, дюбеля и гайки', 'set', 'fischer_set_order_s2747', pack.fastenerSet.sourceId, {
        effectiveQuantityOutputV1: { parameterId: 'fischer_effective_sets', unitId: 'set' },
        purchaseBalanceV1: { quantityMode: 'supply_quantum', balanceScope: 'new_order_vs_required_consumption',
            requirementBasis: 'selected_order_including_contingency', unitId: 'set', consumedExpression: setOrder,
            plannedConsumptionExpression: `(${planningPoints})/fischer_sts_points_per_package`, stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1' }
    }),
    // The physical need is independent of package rounding or an unresolved base.
    // Supplied surplus remains with the single purchasing owner and its controls.
    ...pack.fastenerSet.contents.map(component => supply(ids[component.key as 'stud' | 'plug' | 'nut'], component.titleRu + ' — потребность в составе наборов STS', 'item', 'water_valtec_ppr20_support_points_s2723', pack.fastenerSet.sourceId, { suppliedPiecesExpression: delivered, piecesPerSupplyUnit: component.piecesPerPackage }, true)),
];
export const VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = VALTEC_EXACT_FITTINGS_S2747_RESOURCES
    .flatMap(r => r.row_id === template.row_id ? supportRows : [r]).map((r, ordinal) => {
    if (r.row_id === 'water-ppr20:03:control:support-order')
        r = { ...r, title_ru: 'Опоры, комплектуемые из заказанных хомутов и крепежа',
            formula_id: 'fischer_assembled_supports_s2747', inclusion_ast: supportedBase };
    if (r.row_id === 'water-ppr20:03:control:support-remainder')
        r = { ...r, title_ru: 'Превышение комплектуемых опор над расчётной потребностью',
            formula_id: 'fischer_support_remainder_s2747', inclusion_ast: supportedBase };
    const graph = { ...r.resource_graph, formulaId: r.formula_id };
    return { ...r, ordinal, resource_graph: graph, row_sha256: estimateDeterministicHash({ ...r, ordinal, resource_graph: graph }) };
});
export async function compileWaterValtecPpr20FischerSupportsS2747(submittedParameters: Record<string, unknown>, rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']) {
    return compileCanonicalEstimateCore({ operation: rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: 'canonical-estimate-compiler.water-valtec-fischer-supports.s2747.v1',
        catalogId: WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID, primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: [...VALTEC_FISCHER_SUPPORTS_S2747_PARAMETERS], formulaDefinitions: [...VALTEC_FISCHER_SUPPORTS_S2747_FORMULAS],
        resourceDefinitions: [...VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES], confirmedParameters: runtime,
        submittedParameters, rowOverrides, currencyCode: 'KGS', priceItems: [], maximumResourceRows: VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES.length,
        hashJson: async (value) => estimateDeterministicHash(value) });
}
