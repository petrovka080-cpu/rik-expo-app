import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_MIXED_ELBOWS_S2747 as pack, VALTEC_MIXED_ELBOWS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ELBOWS_S2747_FORMULAS as formulas, VALTEC_MIXED_ELBOWS_S2747_RESOURCES as resources, VALTEC_MIXED_ELBOWS_S2747_RUNTIME_INPUT as runtime } from '../../src/lib/estimate/v4/waterValtecPpr20MixedElbowsS2747';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
import { buildConsumerCanonicalPrecompileParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { buildConsumerRepairCanonicalSessionPreview } from '../../src/features/consumerRepair/consumerRepairCanonicalSessionPreview';
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterGuide } from '../../src/lib/estimate/backendPlatform/contracts';
const consumers = buildMasterParameterCalculationConsumers({ parameters, formulas, resources });
const catalog: CanonicalEstimateCatalogItem = { catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard',
    releaseId: 'owned-UI-projection-not-published', namespace: 'global', domain: 'plumbing', workKey: 'plumbing_interior_ppr_pipe_install_standard',
    titleRu: 'Водопровод', definitionVersion: 13, applicability: {}, professionalMetadata: {},
    parameterSchema: parameters.map(parameter => {
        const metadata = parameter as typeof parameter & { ordinal?: unknown; title_ru?: unknown };
        if (typeof metadata.ordinal !== 'number' || !Number.isInteger(metadata.ordinal)
            || typeof metadata.title_ru !== 'string') throw new Error('ACTUAL_PUBLISHER_LABEL_AND_ORDINAL_REQUIRED');
        const truth = parameter.truth_metadata ?? {};
        const guide = truth.guide as Record<string, unknown> | undefined;
        return { parameterId: parameter.parameter_id, ordinal: metadata.ordinal,
            valueType: parameter.value_type as CanonicalEstimateCatalogItem['parameterSchema'][number]['valueType'], unitId: parameter.unit_id ?? null,
            titleRu: metadata.title_ru, required: parameter.required, defaultValue: parameter.default_value, constraints: parameter.constraints_json ?? {},
            visibilityRole: truth.visibility_role as 'USER_INPUT',
            valueSourceRole: truth.value_source_role as CanonicalEstimateCatalogItem['parameterSchema'][number]['valueSourceRole'],
            preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
            visibleWhen: truth.visible_when as CanonicalEstimateCatalogItem['parameterSchema'][number]['visibleWhen'],
            requiredWhen: truth.required_when as CanonicalEstimateCatalogItem['parameterSchema'][number]['requiredWhen'],
            provenance: truth.provenance as Record<string, unknown>,
            formulaConsumers: consumers.formulaConsumers[parameter.parameter_id], resourceBranchConsumers: consumers.resourceConsumers[parameter.parameter_id],
            ...(guide ? { guide: { guideKind: guide.guide_kind as CanonicalEstimateParameterGuide['guideKind'], guideShortRu: String(guide.guide_short_ru),
                    guideValidationPolicy: guide.guide_validation_policy as CanonicalEstimateParameterGuide['guideValidationPolicy'],
                    sourceRole: guide.source_role as CanonicalEstimateParameterGuide['sourceRole'], sourceDocument: String(guide.source_document),
                    sourceLocator: String(guide.source_locator), guideVersion: String(guide.guide_version), sourceSnapshotHash: String(guide.source_snapshot_hash),
                    applicability: String(guide.applicability), verifiedAt: String(guide.verified_at) } } : {}),
        };
    }),
};
test('highlights every actual project quantity before Apply while keeping the short straight form small', () => {
    const original = buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: 'owned-mixed-elbow-required-test',
        parameters: { ...runtime, route_length_m: 100 }, missingParameterIds: ['route_geometry_mode', 'substrate_profile'],
        userExplicitParameterIds: ['route_length_m'], textExtractedParameterIds: [] });
    const draft = { route_geometry_mode: pack.geometryMode, substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
    const mixed = buildConsumerRepairCanonicalSessionPreview({ session: original, draftValues: draft });
    const counts = ['straight_coupling_count', 'tee_count', 'threaded_transition_count', 'terminal_cap_count', 'valtec_elbows45_count', 'valtec_elbows90_count'];
    expect(mixed?.blockingMissingParameterIds.slice().sort()).toEqual(counts.slice().sort());
    for (const id of counts)
        expect(mixed?.parameters.find(p => p.parameterId === id))
            .toMatchObject({ requiredLevel: 'BLOCKING_REQUIRED', state: 'BLOCKING_REQUIRED', valid: false });
    const angles = buildConsumerRepairCanonicalSessionPreview({ session: original, draftValues: { ...draft, valtec_elbows45_count: '3', valtec_elbows90_count: '5' } });
    expect(angles?.blockingMissingParameterIds.slice().sort()).toEqual(counts.filter(id => !id.startsWith('valtec_elbows')).sort());
    const straight = buildConsumerRepairCanonicalSessionPreview({ session: original, draftValues: { ...draft, route_geometry_mode: route.geometry.straight } });
    expect(straight?.blockingMissingParameterIds).toEqual(['route_end_connections']);
    expect(straight?.parameters.some(p => counts.includes(p.parameterId))).toBe(false);
    const homogeneous = buildConsumerRepairCanonicalSessionPreview({ session: original, draftValues: { ...draft, route_geometry_mode: route.geometry.project } });
    expect(homogeneous?.blockingMissingParameterIds.slice().sort()).toEqual([...counts.filter(id => !id.startsWith('valtec_elbows')), 'elbow_count'].sort());
    expect(original.blockingMissingParameterIds.slice().sort()).toEqual(['route_geometry_mode', 'substrate_profile']);
});
