import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-single-straight-route-s27-47.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { VALTEC_FISCHER_SUPPORTS_S2747_PARAMETERS as previous, VALTEC_FISCHER_SUPPORTS_S2747_FORMULAS as formulas, VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES as resources, VALTEC_FISCHER_SUPPORTS_S2747_RUNTIME_INPUT as runtime } from './waterValtecPpr20FischerSupportsS2747';
export const VALTEC_SINGLE_ROUTE_S2747 = pack;
export const VALTEC_SINGLE_ROUTE_S2747_SOURCE_PACK_SHA256 = '9895d401f67bc30666aa026ce0f0ab8d09068161cf5a8ef2083d4a953157b447';
const geometryId = 'route_geometry_mode';
const endsId = 'route_end_connections';
const capOutput = 'route_derived_end_caps';
const straight = { kind: 'equals', parameterId: geometryId, value: pack.geometry.straight };
const project = { kind: 'equals', parameterId: geometryId, value: pack.geometry.project };
const countExpressions: Record<string, string> = {
    straight_coupling_count: 'max(0,ceil(route_length_m/pipe_section_length_m)-1)',
    elbow_count: '0', tee_count: '0', threaded_transition_count: `2-${capOutput}`, terminal_cap_count: capOutput,
};
const countLabels: Record<string, string> = {
    straight_coupling_count: 'Прямые муфты VTp.703.0.020', elbow_count: 'Угольники 20 мм', tee_count: 'Тройники 20 мм',
    threaded_transition_count: 'Резьбовые переходы 20 мм', terminal_cap_count: 'Концевые заглушки 20 мм',
};
const relevantRows = resources.filter(r => r.row_id.startsWith('water-ppr20:04:') || r.row_id.startsWith('water-ppr20:05:')).map(r => r.row_id);
const guide = {
    guide_kind: 'PROJECT_DEFINED', source_role: 'CONFIRMED_OBJECT_GEOMETRY_PLUS_PRIMARY_MANUFACTURER',
    source_document: pack.sourceId, source_locator: 'Declared single-segment topology and two actual endings; ' + pack.sources[0].exactLocator,
    source_snapshot_hash: VALTEC_SINGLE_ROUTE_S2747_SOURCE_PACK_SHA256,
    guide_version: 's2747-single-straight-route-v1', applicability: pack.scope, verified_at: '2026-10-09', guide_validation_policy: 'MANDATORY_BLOCK',
};
function choice(id: string, title: string, values: string[], ordinal: number): AutomaticOwnerDefinition['parameters'][number] {
    return { parameter_id: id, ordinal, title_ru: title, value_type: 'enum', unit_id: null, required: false, default_value: null,
        constraints_json: { values, ...(id === geometryId ? { forbiddenWhen: { kind: 'and', operands: [
                        straight, { kind: 'not_equals', parameterId: 'pipe_section_length_m', value: 4 },
                    ] } } : {}) }, truth_metadata: { contract: pack.contract, semantic_parameter_key: `valtec-straight:${id}`,
            visibility_role: 'USER_INPUT', value_source_role: 'CONDITIONAL_PROJECT_FACT', preliminary_compilation_allowed: true,
            hidden_default_forbidden: true, provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, resource_branch_consumers: relevantRows,
            guide: { ...guide, guide_short_ru: id === geometryId
                    ? 'Для одного прямого участка приложение предварительно подбирает соединения по длине. Для другой схемы задайте реальные количества по ведомости.'
                    : 'Выберите фактические два окончания. Для резьбовых подключений нужен также их одинаковый типоразмер.' },
            ...(id === endsId ? { visible_when: straight, required_when: straight } : {}),
        } };
}
export const VALTEC_SINGLE_ROUTE_S2747_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = [
    ...previous.map(p => !Object.hasOwn(countExpressions, p.parameter_id) ? p : {
        ...p, title_ru: countLabels[p.parameter_id], truth_metadata: { ...p.truth_metadata,
            value_source_role: 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE', runtime_profile_classification: 'PRELIMINARY_SOURCE_FORMULA',
            visible_when: project, derived_from: [geometryId, ...(p.parameter_id === 'straight_coupling_count'
                    ? ['route_length_m', 'pipe_section_length_m'] : ['threaded_transition_count', 'terminal_cap_count'].includes(p.parameter_id) ? [capOutput] : [])],
            preliminary_value_formula_v1: { version: 'canonical-preliminary-parameter-formula:v1',
                expression: countExpressions[p.parameter_id], when: straight, explicitValuePolicy: 'REQUIRE_MATCH' },
            guide: { ...guide, guide_short_ru: 'В прямом сценарии рассчитывает приложение. В проектной раскладке сохраняется фактическое количество по ведомости.' },
        },
    }),
    choice(geometryId, 'Схема участка трубопровода', Object.values(pack.geometry), previous.length),
    choice(endsId, 'Два окончания прямого участка', Object.values(pack.ends), previous.length + 1),
    { parameter_id: capOutput, ordinal: previous.length + 2, title_ru: 'Число заглушек выбранных окончаний — рассчитывает приложение', value_type: 'integer', unit_id: 'item', required: false, default_value: null,
        constraints_json: { min: 0, max: 2 }, truth_metadata: { visibility_role: 'USER_DERIVED_READONLY', value_source_role: 'BACKEND_DERIVED',
            provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, catalogue_owned_lookup_v1: true,
            runtime_profile_classification: 'CATALOGUE_SOURCE_SELECTION',
            derived_from: [geometryId, endsId], resource_branch_consumers: relevantRows,
            derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1', interpolation: 'FORBIDDEN',
                inputParameterIds: [geometryId, endsId], rows: [
                    { inputValues: [pack.geometry.straight, pack.ends.caps], outputValue: 2 },
                    { inputValues: [pack.geometry.straight, pack.ends.threaded], outputValue: 0 },
                ] }, guide: { ...guide, guide_kind: 'DERIVED_VALUE_RULE', guide_short_ru: 'Внутреннее количество из выбранных двух окончаний; пользователь его не вводит.' },
        } },
];
export const VALTEC_SINGLE_ROUTE_S2747_FORMULAS = formulas;
export const VALTEC_SINGLE_ROUTE_S2747_RESOURCES = resources;
export const VALTEC_SINGLE_ROUTE_S2747_RUNTIME_INPUT = runtime;
export async function compileWaterValtecPpr20SingleStraightRouteS2747(submittedParameters: Record<string, unknown>, options: {
    confirmedParameters?: Record<string, unknown>;
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.confirmedParameters || options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: 'canonical-estimate-compiler.water-valtec-single-straight-route.s2747.v1',
        catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard', primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: [...VALTEC_SINGLE_ROUTE_S2747_PARAMETERS], formulaDefinitions: [...formulas], resourceDefinitions: [...resources],
        confirmedParameters: { ...runtime, ...options.confirmedParameters }, submittedParameters, rowOverrides: options.rowOverrides,
        currencyCode: 'KGS', priceItems: [], maximumResourceRows: resources.length, hashJson: value => estimateDeterministicHash(value) });
}
