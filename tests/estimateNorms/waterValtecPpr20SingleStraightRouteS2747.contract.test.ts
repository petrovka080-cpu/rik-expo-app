import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VALTEC_SINGLE_ROUTE_S2747 as pack, VALTEC_SINGLE_ROUTE_S2747_SOURCE_PACK_SHA256 as packHash, VALTEC_SINGLE_ROUTE_S2747_PARAMETERS as definitions, VALTEC_SINGLE_ROUTE_S2747_FORMULAS as formulas, VALTEC_SINGLE_ROUTE_S2747_RESOURCES as resources, VALTEC_SINGLE_ROUTE_S2747_RUNTIME_INPUT as runtime, compileWaterValtecPpr20SingleStraightRouteS2747 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { compileWaterValtecPpr20FischerSupportsS2747 as previous } from '../../src/lib/estimate/v4/waterValtecPpr20FischerSupportsS2747';
import { VALTEC_EXACT_FITTINGS_S2747 as fittings } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { canonicalInheritedConfirmedParameters } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import { buildConsumerCanonicalPrecompileParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { buildConsumerRepairCanonicalSessionPreview } from '../../src/features/consumerRepair/consumerRepairCanonicalSessionPreview';
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterInputValue } from '../../src/lib/estimate/backendPlatform/contracts';
import type { AutomaticOwnerDefinition } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { validateCanonicalEstimateParameterInputs } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation';
import { canonicalEstimateBlockingParameterIssues } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import { consumerCanonicalExplicitAutomaticParameters } from '../../src/features/consumerRepair/consumerCanonicalReleaseMigration';
import { waterValtecSingleStraightRouteS2747Config } from '../../scripts/estimate/r4a13/prepareS2747WaterValtecSingleStraightRoute';
const simple = { route_length_m: 100, route_geometry_mode: pack.geometry.straight, route_end_connections: pack.ends.caps, substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const facts = { route_length_m: 100, straight_coupling_count: 24, elbow_count: 8, tee_count: 2, threaded_transition_count: 4, terminal_cap_count: 2,
    ...Object.fromEntries(fittings.projectSelections.map(s => [s.parameterId, s.values[0]])), substrate_profile: simple.substrate_profile };
const catalog: CanonicalEstimateCatalogItem = { catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard', releaseId: 'local-v11', namespace: 'global', domain: 'PLUMBING', workKey: 'plumbing_interior_ppr_pipe_install_standard', titleRu: 'Монтаж водопровода', definitionVersion: 11, applicability: {}, professionalMetadata: {},
    parameterSchema: definitions.map(parameter => {
        const p = parameter as AutomaticOwnerDefinition['parameters'][number];
        const truth = p.truth_metadata;
        return {
            parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type as CanonicalEstimateCatalogItem['parameterSchema'][number]['valueType'], unitId: p.unit_id ?? null, titleRu: p.title_ru ?? p.parameter_id, required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {},
            visibilityRole: truth.visibility_role as CanonicalEstimateCatalogItem['parameterSchema'][number]['visibilityRole'], valueSourceRole: truth.value_source_role as CanonicalEstimateCatalogItem['parameterSchema'][number]['valueSourceRole'],
            preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
            runtimeProfileClassification: truth.runtime_profile_classification as string | undefined, visibleWhen: truth.visible_when as Record<string, unknown> | undefined, requiredWhen: truth.required_when as Record<string, unknown> | undefined,
            derivedFrom: truth.derived_from as string[] | undefined, provenance: truth.provenance as Record<string, unknown>,
            formulaConsumers: formulas.filter(f => f.input_parameter_ids.includes(p.parameter_id)).map(f => f.formula_id), resourceBranchConsumers: (truth.resource_branch_consumers as string[] | undefined) ?? resources.filter(r => formulas.find(f => f.formula_id === r.formula_id)?.input_parameter_ids.includes(p.parameter_id)).map(r => r.row_id),
        };
    }) };
test('pins the geometry method and manufacturer section length without inventing a route from size alone', async () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-single-straight-route-s27-47.json')).digest('hex')).toBe(packHash);
    expect(definitions).toHaveLength(45);
    expect(formulas).toHaveLength(39);
    expect(resources).toHaveLength(56);
    const r = await compile({ route_length_m: 100 });
    expect(r.parameters.straight_coupling_count).toBeUndefined();
    expect(r.parameters.route_geometry_mode).toBeUndefined();
    expect([...new Set(r.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))].sort()).toEqual(['route_geometry_mode', 'substrate_profile']);
});
test('four actual facts produce the full preliminary composition without copied technical inputs', async () => {
    const r = await compile(simple);
    expect(Object.keys(simple)).toHaveLength(4);
    expect(r.rows).toHaveLength(56);
    expect(r.preliminaryNeeds).toEqual([]);
    expect(r.derivedParameters).toMatchObject({ straight_coupling_count: '24', elbow_count: '0', tee_count: '0', threaded_transition_count: '0', terminal_cap_count: '2' });
    expect(r.rows.find(row => row.row_id === 'water-ppr20:02:material:pipe-sections')?.quantity).toBe('27');
    expect(r.rows.find(row => row.row_id === 'water-ppr20:03:fastener:sts-sets')?.quantity).toBe('51');
    expect(r.rows.every(row => row.unit_price === null)).toBe(true);
});

test('normal client validation accepts four facts without sending technical defaults and still rejects2m in the4m method', () => {
    const publication = waterValtecSingleStraightRouteS2747Config({ releaseId: catalog.releaseId, searchReleaseId: 'local-search-v11' });
    const clientCatalog = { ...catalog, parameterSchema: catalog.parameterSchema.map(p => ({ ...p,
        defaultValue: p.defaultValue ?? Object.entries(runtime).find(([id]) => id === p.parameterId)?.[1] ?? null,
        runtimeProfileClassification: p.runtimeProfileClassification ?? publication.runtimeProfileClassification?.[p.parameterId],
    })) };
    const validated = validateCanonicalEstimateParameterInputs({ schema: clientCatalog.parameterSchema, rawInputs: simple });
    expect(validated.parameters.pipe_section_length_m).toBe('4');
    expect(canonicalEstimateBlockingParameterIssues(clientCatalog.parameterSchema, validated.issues)).toEqual([]);
    const submitted = consumerCanonicalExplicitAutomaticParameters(clientCatalog, validated.parameters, simple);
    expect(Object.keys(submitted).sort()).toEqual(Object.keys(simple).sort());
    const wrong = validateCanonicalEstimateParameterInputs({ schema: clientCatalog.parameterSchema, rawInputs: { ...simple, pipe_section_length_m: '2' } });
    expect(canonicalEstimateBlockingParameterIssues(clientCatalog.parameterSchema, wrong.issues)).toContainEqual({ code: 'FORBIDDEN_WHEN', parameterId: 'route_geometry_mode', relatedParameterId: '' });
});
test('the declared4m planning method cannot silently use a different pipe section length', async () => {
    await expect(compile({ ...simple, pipe_section_length_m: 2 })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    const project = await compile({ ...facts, route_geometry_mode: pack.geometry.project, pipe_section_length_m: 2 });
    expect(project.parameters.pipe_section_length_m).toBe(2);
    expect(project.parameters.straight_coupling_count).toBe(24);
});
test.each([[0.1, '0'], [4, '0'], [4.001, '1'], [8, '1'], [100, '24'], [5000, '1249']])('net joints at length%s exclude purchased reserve', async (length, joins) => {
    const r = await compile({ ...simple, route_length_m: length });
    expect(r.parameters.straight_coupling_count).toBe(joins);
});
test('two actual threaded endings derive count2 but retain the necessary interface question', async () => {
    const r = await compile({ ...simple, route_end_connections: pack.ends.threaded });
    const model = fittings.projectSelections.find(s => s.countParameterId === 'threaded_transition_count')!;
    expect(r.parameters.threaded_transition_count).toBe('2');
    expect(r.parameters.terminal_cap_count).toBe('0');
    expect([...new Set(r.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))]).toEqual([model.parameterId]);
    const exact = await compile({ ...simple, route_end_connections: pack.ends.threaded, [model.parameterId]: model.values[0] });
    expect(exact.preliminaryNeeds).toEqual([]);
});
test('preserves project-mode quantities and rejects conflicting inherited facts in straight mode', async () => {
    const old = await previous(facts);
    const now = await compile({ ...facts, route_geometry_mode: pack.geometry.project });
    expect(now.rows.map(r => [r.row_id, r.quantity])).toEqual(old.rows.map(r => [r.row_id, r.quantity]));
    await expect(compile(simple, { confirmedParameters: facts })).rejects.toMatchObject({ code: 'PROJECT_GEOMETRY_PARAMETER_CONFLICT', parameterId: 'elbow_count' });
    expect(facts.elbow_count).toBe(8);
});
test('recomputes old derived counts on length change and does not turn them into a project schedule', async () => {
    const parent = await compile(simple);
    const inherited = canonicalInheritedConfirmedParameters(parent.parameters, parent.derivedParameters);
    const changed = await compile({ route_length_m: 108 }, { confirmedParameters: inherited });
    expect(changed.parameters.straight_coupling_count).toBe('26');
    const manual = await compile({ route_geometry_mode: pack.geometry.project }, { confirmedParameters: inherited });
    expect(manual.parameters.straight_coupling_count).toBeUndefined();
    expect(manual.preliminaryNeeds.some(n => n.missing_parameter_ids.includes('straight_coupling_count'))).toBe(true);
    await expect(compile({ ...simple, route_derived_end_caps: 0 })).rejects.toMatchObject({ code: 'SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED' });
});
test('asks only object facts and reveals endings immediately when the user chooses a straight layout', async () => {
    const result = await compile({ route_length_m: 100 });
    const session = buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: 'fixture', parameters: result.parameters as Record<string, CanonicalEstimateParameterInputValue>,
        missingParameterIds: result.preliminaryNeeds.flatMap(n => n.missing_parameter_ids), userExplicitParameterIds: ['route_length_m'], textExtractedParameterIds: ['route_length_m'], createdAt: '2026-10-09T00:00:00Z' });
    expect([...session.blockingMissingParameterIds].sort()).toEqual(['route_geometry_mode', 'substrate_profile']);
    const preview = buildConsumerRepairCanonicalSessionPreview({ session, draftValues: { route_geometry_mode: pack.geometry.straight } })!;
    expect(preview.parameters.some(p => p.parameterId === 'route_end_connections')).toBe(true);
    expect(preview.blockingMissingParameterIds).toEqual(['substrate_profile', 'route_end_connections']);
    expect(preview.parameters.find(p => p.parameterId === 'route_end_connections')).toMatchObject({ requiredLevel: 'BLOCKING_REQUIRED', state: 'BLOCKING_REQUIRED', valid: false });
    expect(preview.parameters.some(p => p.parameterId === 'straight_coupling_count')).toBe(false);
    const manual = buildConsumerRepairCanonicalSessionPreview({ session, draftValues: { route_geometry_mode: pack.geometry.project } })!;
    expect(manual.parameters.some(p => p.parameterId === 'straight_coupling_count')).toBe(true);
    expect(manual.parameters.some(p => p.parameterId === 'route_end_connections')).toBe(false);
    expect(manual.blockingMissingParameterIds).not.toContain('route_end_connections');
});
