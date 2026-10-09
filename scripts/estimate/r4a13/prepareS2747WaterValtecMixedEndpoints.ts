import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waterValtecMixedElbowsS2747Config } from './prepareS2747WaterValtecMixedElbows';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_MIXED_ENDPOINTS_S2747 as pack, VALTEC_MIXED_ENDPOINTS_S2747_SOURCE_PACK_SHA256 as packHash,
    VALTEC_MIXED_ENDPOINTS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ENDPOINTS_S2747_FORMULAS as formulas,
    VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES as resources, VALTEC_MIXED_ENDPOINTS_S2747_RUNTIME_INPUT as runtime,
    compileWaterValtecPpr20MixedEndpointsS2747 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20MixedEndpointsS2747';
import { VALTEC_SINGLE_ROUTE_S2747 as route } from '../../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';

export function waterValtecMixedEndpointsS2747Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecMixedElbowsS2747Config(parent);
    const genericId = 'water-ppr20:05:component:threaded-transitions';
    const oldMap = previous.passport.independentCompletenessMap!;
    const entries = oldMap.entries as { expectedResourceId: string; [key: string]: unknown }[];
    const acceptanceInput = { ...runtime, route_length_m: 100, route_geometry_mode: route.geometry.straight, route_end_connections: pack.endMode,
        substrate_profile: 'Сухой бетон, крепление напрямую без отделки',
        route_start_thread_interface: pack.variants[0].interfaceRu, route_finish_thread_interface: pack.variants[3].interfaceRu };
    return { ...previous, contract: pack.contract, stopCode: 'S2747_WATER_VALTEC_MIXED_ENDPOINTS',
        applicationName: 's2747-water-valtec-mixed-endpoints', receiptFileStem: 'water_valtec_mixed_endpoints',
        outputRoot: resolve('.release-runtime/r568/s27-47/g7-valtec-mixed-endpoints'), expectedParentShape: [47, 41, 58],
        sourcePaths: [...previous.sourcePaths,
            'data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-endpoints-s27-47.json',
            'src/lib/estimate/v4/waterValtecPpr20MixedEndpointsS2747.ts',
            'tests/estimateNorms/waterValtecPpr20MixedEndpointsS2747.contract.test.ts',
            'tests/requestEstimate/canonicalMixedEndpointRequiredProjection.contract.test.ts',
            'scripts/estimate/r4a13/prepareS2747WaterValtecMixedEndpoints.ts',
            'src/features/consumerRepair/consumerCanonicalParameterEditor.ts'],
        parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources, runtimeProfileInput: runtime,
        acceptanceInput, sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash,
            exact_locator: previous.sourceMetadata.exact_locator + ' | ' + pack.primarySource.exactLocator,
            use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        passport: { ...previous.passport,
            includedScopeRu: [...previous.passport.includedScopeRu, 'Два отдельных резьбовых подключения: ответные модели VALTEC VTp.701/702 по фактической резьбе начала и конца; количества и сварка рассчитываются приложением'],
            excludedScopeRu: [...previous.passport.excludedScopeRu, ...pack.limitations],
            independentCompletenessMap: { ...oldMap, evidenceSha256: packHash,
                entries: [...entries.map(entry => entry.expectedResourceId === genericId ? { ...entry,
                    condition: 'Existing homogeneous fitting owner outside the explicitly selected separate endpoint scope' } : entry),
                    ...pack.variants.map((variant, index) => ({ operationId: 'fittings-and-fusion', expectedResourceId: variant.rowId,
                        formulaId: formulas[formulas.length - pack.variants.length + index].formula_id,
                        condition: 'Selected separate threaded endpoints of straight4m route and positive derived count for ' + variant.titleRu,
                        sourceId: pack.primarySource.sourceId, resolution: { kind: 'ROW', rowId: variant.rowId },
                        independentSourceComponent: variant.titleRu, primarySourceLocator: pack.primarySource.exactLocator }))] } },
        locator: { key: previous.locator.key + '-mixed-endpoints-s2747', payload: { ...previous.locator.payload,
            mixedEndpointsSourcePackSha256: packHash, expectedResourceIds: resources.map(r => r.row_id), expectedFormulaIds: formulas.map(f => f.formula_id),
            selectedSupplyOwnerIds: [...previous.locator.payload.selectedSupplyOwnerIds, ...pack.variants.map(v => v.rowId)],
            genericEndpointOwnerReplacedOnlyInSelectedScope: true, zeroEndpointModelCreatesNoOwner: true,
            actualEndpointParameterIds: pack.endpointQuestions.map(q => q.parameterId), aggregateEndpointCountParameterId: 'threaded_transition_count' } },
        search: { ...previous.search, aliases: [...previous.search.aliases, 'Водопровод PP-R20 с разными резьбовыми подключениями'],
            sourceProvenance: { ...previous.search.sourceProvenance, mixedEndpointsSourcePackSha256: packHash,
                noEndpointInterfaceDefault: true, complementaryThreadGenderSelection: true, separateEndpointModelPriceOwnership: true } },
        verifyCore: async () => {
            const inherited = await previous.verifyCore();
            const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-endpoints-s27-47.json'), packHash);
            assert.equal(hash(pack.primarySource.localArtifact), pack.primarySource.artifactSha256);
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json'), pack.previousFittingsPackSha256);
            const result = await compile(acceptanceInput);
            assert.equal(result.preliminaryNeeds.length, 0);
            assert.equal(result.rows.length, 57);
            assert.equal(result.parameters.threaded_transition_count, '2');
            assert.equal(result.rows.some(r => r.row_id === genericId), false);
            for (const index of [0, 3]) assert.equal(result.rows.find(r => r.row_id === pack.variants[index].rowId)?.quantity, '1');
            assert.equal(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity, '50');
            const same = await compile({ ...acceptanceInput, route_finish_thread_interface: acceptanceInput.route_start_thread_interface });
            assert.equal(same.rows.find(r => r.row_id === pack.variants[0].rowId)?.quantity, '2');
            assert.equal(same.rows.some(r => r.row_id === pack.variants[3].rowId), false);
            return { ...inherited, endpointModels: 4, differentEndpointRows: 57, sameEndpointRows: 56,
                exactComplementaryModelCountsDerived: true, endpointGenericOwnerNotDoubleBilled: true,
                zeroEndpointModelNotPurchasedOrBilled: true, oldRoutesPreserved: true,
                ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
        },
    };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747WaterValtecMixedEndpoints.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecMixedEndpointsS2747Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
