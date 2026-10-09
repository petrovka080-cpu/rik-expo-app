import { compileWaterValtecPpr20KnownZeroS2748 as compile, VALTEC_KNOWN_ZERO_S2748_PARAMETERS as parameters, VALTEC_KNOWN_ZERO_S2748_RESOURCES as resources } from '../../src/lib/estimate/v4/waterValtecPpr20KnownZeroS2748';
import { canonicalOrderedSpecificationBindings, canonicalOrderedSpecificationParameterIds } from '../../src/lib/estimate/backendPlatform/canonicalOrderedSpecificationBindings';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateCatalogItem, type CanonicalEstimateRevisionView } from '../../src/lib/estimate/backendPlatform/contracts';
import { projectCanonicalEstimatePreliminaryNeedTransport } from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import { projectCanonicalEstimateParameterSessionSnapshot } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import { buildConsumerCanonicalParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { buildConsumerRepairCanonicalSessionPreview } from '../../src/features/consumerRepair/consumerRepairCanonicalSessionPreview';
import { canonicalEstimateSha256HexText } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import { canonicalEstimateStableJson } from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

const id = 'valtec_elbow_selection';
const raw = parameters.find(p => p.parameter_id === id)!;
const schema: CanonicalEstimateCatalogItem['parameterSchema'][number] = {
    parameterId: id, ordinal: 0, valueType: 'enum', unitId: null, titleRu: 'Исполнение угольника VALTEC', required: raw.required,
    defaultValue: raw.default_value, constraints: raw.constraints_json!, visibilityRole: 'USER_INPUT', valueSourceRole: 'CONDITIONAL_PROJECT_FACT',
    visibleWhen: raw.truth_metadata!.visible_when as CanonicalEstimateCatalogItem['parameterSchema'][number]['visibleWhen'],
    requiredWhen: raw.truth_metadata!.required_when as CanonicalEstimateCatalogItem['parameterSchema'][number]['requiredWhen'],
    formulaConsumers: [], resourceBranchConsumers: ['water-ppr20:05:component:elbows'], provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
};
const catalog: CanonicalEstimateCatalogItem = { catalogId: 'catalog', releaseId: 'release', namespace: 'global', domain: 'plumbing',
    workKey: 'test', titleRu: 'Водопровод', definitionVersion: 15, applicability: {}, professionalMetadata: {}, parameterSchema: [schema] };
const input = { route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: route.ends.caps,
    substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
const rowId = 'water-ppr20:05:component:elbows';
const rowOverrides = { [rowId]: { quantity: '5', provenance: { kind: 'manual' as const, reason: 'DEMO / VALIDATION_FIXTURE spare fitting' } } };
const transport = (needs: unknown[]) => projectCanonicalEstimatePreliminaryNeedTransport({ id: 'revision', release_id: 'release',
    definition_version_id: 'definition', checksum_sha256: 'a'.repeat(64), amendment_contract: { parameterSources: { preliminaryNeeds: needs.map(need => {
        const { need_sha256: _helperHash, ...basis } = need as Record<string, unknown>;
        return { ...basis, need_sha256: canonicalEstimateSha256HexText(canonicalEstimateStableJson(basis)) };
    }) } } });

test('compact saved need opens the exact spare specification despite zero installed count and remains editable in preview', async () => {
    const compiled = await compile(input, { rowOverrides });
    const projected = transport(compiled.preliminaryNeeds);
    const need = projected.preliminaryNeeds.find(n => n.rowId === rowId)!;
    expect(need.orderedSpecificationParameterIds).toEqual([id]);
    expect(need).not.toHaveProperty('calculationTrace');
    const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: 'revision', parentRevisionId: null,
        releaseId: 'release', catalogId: 'catalog', definitionVersionId: 'definition', definitionVersion: 15, revisionNumber: 1,
        status: 'ready', currencyCode: 'KGS', parameters: compiled.parameters, userInputSnapshot: input,
        amendmentContract: { rowOverrides, customRows: [], releaseMigration: null }, preliminaryNeeds: projected.preliminaryNeeds,
        totals: compiled.totals, rowCount: compiled.rows.length, checksumSha256: 'a'.repeat(64), compilerVersion: 'TEST', createdAt: '2026-10-09' };
    const snapshot = projectCanonicalEstimateParameterSessionSnapshot({ requestedRevisionId: 'revision', definitionVersionId: 'definition', revision, parent: null, catalog });
    expect(snapshot.revision.preliminaryNeeds?.find(n => n.rowId === rowId)?.orderedSpecificationParameterIds).toEqual([id]);
    const session = buildConsumerCanonicalParameterSession({ ...snapshot, draftId: 'TEST' });
    expect(session.blockingMissingParameterIds).toEqual([id]);
    expect(session.parameters.find(p => p.parameterId === id)).toMatchObject({ requiredLevel: 'BLOCKING_REQUIRED', valid: false });
    const value = (raw.constraints_json!.values as string[])[0];
    const preview = buildConsumerRepairCanonicalSessionPreview({ session, draftValues: { [id]: value } });
    expect(preview?.blockingMissingParameterIds).toEqual([]);
    const result = await compile({ ...input, [id]: value }, { rowOverrides });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === rowId)).toMatchObject({ title_ru: value, quantity: '5', included_in_procurement: true });
});
test('excluded, zero, nonmanual and undeclared questions cannot revive a disabled branch', async () => {
    const result = await compile(input, { rowOverrides });
    const need = result.preliminaryNeeds.find(n => n.row_id === rowId)!;
    const trace = need.calculation_trace as Record<string, unknown>;
    for (const changed of [{ ...need, selected: false }, { ...need, quantity: '0' },
        { ...need, calculation_trace: { ...trace, manualQuantityOverride: false } },
        { ...need, missing_parameter_ids: ['unrelated_question'] }]) {
        expect(transport([changed]).preliminaryNeeds[0]).not.toHaveProperty('orderedSpecificationParameterIds');
    }
});

test('resolved spare specification remains editable after compact reload and a second unrelated revision', async () => {
    const choices = raw.constraints_json!.values as string[];
    const bindings = canonicalOrderedSpecificationBindings(resources);
    const resolved = await compile({ ...input, [id]: choices[0] }, { rowOverrides });
    expect(resolved.preliminaryNeeds).toEqual([]);
    const boundCatalog = { ...catalog, orderedSpecificationBindings: bindings };
    const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: 'resolved', parentRevisionId: null,
        releaseId: 'release', catalogId: 'catalog', definitionVersionId: 'definition', definitionVersion: 15, revisionNumber: 1,
        status: 'ready', currencyCode: 'KGS', parameters: resolved.parameters, userInputSnapshot: { ...input, [id]: choices[0] },
        amendmentContract: { rowOverrides, customRows: [], releaseMigration: null }, preliminaryNeeds: [],
        totals: resolved.totals, rowCount: resolved.rows.length, checksumSha256: 'b'.repeat(64), compilerVersion: 'TEST', createdAt: '2026-10-09' };
    for (const current of [revision, { ...revision, revisionId: 'another-revision', parameters: { ...revision.parameters, working_pressure_bar: 5 } }]) {
        const snapshot = projectCanonicalEstimateParameterSessionSnapshot({ requestedRevisionId: current.revisionId,
            definitionVersionId: 'definition', revision: current, parent: null, catalog: boundCatalog });
        expect(snapshot.revision.orderedSpecificationParameterIds).toEqual([id]);
        expect(snapshot.revision).not.toHaveProperty('amendmentContract');
        const compact = buildConsumerCanonicalParameterSession({ ...snapshot, draftId: 'TEST' });
        const fallback = buildConsumerCanonicalParameterSession({ catalog: boundCatalog, revision: current, draftId: 'TEST' });
        for (const session of [compact, fallback]) {
            expect(session.parameters.find(p => p.parameterId === id)).toMatchObject({ valid: true });
            const preview = buildConsumerRepairCanonicalSessionPreview({ session, draftValues: { [id]: choices[1] } });
            expect(preview?.blockingMissingParameterIds).toEqual([]);
        }
    }
    const changed = await compile({ ...input, [id]: choices[1] }, { rowOverrides });
    expect(changed.rows.find(r => r.row_id === rowId)).toMatchObject({ title_ru: choices[1], quantity: '5', included_in_procurement: true });
    const sockets = 'water-ppr20:05:control:total-fusion-sockets';
    expect(changed.rows.find(r => r.row_id === sockets)?.quantity).toEqual(resolved.rows.find(r => r.row_id === sockets)?.quantity);
    expect(changed.parameters.elbow_count).toBe(resolved.parameters.elbow_count);
});

test('persistent specification bindings reject inactive, excluded, zero, invalid and unbound manual rows', async () => {
    const compiled = await compile(input);
    const bindings = canonicalOrderedSpecificationBindings(resources);
    expect(bindings.find(b => b.rowId === rowId)?.parameterIds).toEqual([id]);
    const order = rowOverrides[rowId];
    for (const override of [{ ...order, quantity: '0' }, { ...order, quantity: '-1' }, { ...order, quantity: 'NaN' },
        { ...order, quantity: null }, { ...order, includedInEstimate: false }]) {
        expect(canonicalOrderedSpecificationParameterIds(bindings, { [rowId]: override }, compiled.parameters)).toEqual([]);
    }
    expect(canonicalOrderedSpecificationParameterIds(bindings, {}, compiled.parameters)).toEqual([]);
    expect(canonicalOrderedSpecificationParameterIds(bindings, { unrelated: order }, compiled.parameters)).toEqual([]);
    for (const inclusionAst of [{ kind: 'literal', value: false }, { kind: 'parameter', id: 'unknown_applicability' }, { kind: 'invalid' }]) {
        expect(canonicalOrderedSpecificationParameterIds([{ rowId, parameterIds: [id], inclusionAst }], rowOverrides, compiled.parameters)).toEqual([]);
    }
    const resource = resources.find(r => r.row_id === rowId)!;
    for (const resource_graph of [{ ...resource.resource_graph, excludeKnownZeroQuantityV1: false },
        { ...resource.resource_graph, titleSpecificationParameterIds: [''] },
        { ...resource.resource_graph, costTreatment: 'CONTROL_OR_DOCUMENT' }]) {
        expect(canonicalOrderedSpecificationBindings([{ ...resource, resource_graph }])).toEqual([]);
    }
});
