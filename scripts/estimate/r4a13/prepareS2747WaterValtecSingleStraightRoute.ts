import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { waterValtecFischerSupportsS2747Config } from './prepareS2747WaterValtecFischerSupports';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_SINGLE_ROUTE_S2747 as pack, VALTEC_SINGLE_ROUTE_S2747_PARAMETERS as parameters, VALTEC_SINGLE_ROUTE_S2747_FORMULAS as formulas, VALTEC_SINGLE_ROUTE_S2747_RESOURCES as resources, VALTEC_SINGLE_ROUTE_S2747_RUNTIME_INPUT as runtime, VALTEC_SINGLE_ROUTE_S2747_SOURCE_PACK_SHA256 as packHash, compileWaterValtecPpr20SingleStraightRouteS2747 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747';
export function waterValtecSingleStraightRouteS2747Config(parent: {
    releaseId: string;
    searchReleaseId: string;
}): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecFischerSupportsS2747Config(parent);
    const acceptanceInput = { ...previous.acceptanceInput, route_geometry_mode: pack.geometry.project };
    return { ...previous, contract: pack.contract, stopCode: 'S2747_WATER_VALTEC_SINGLE_ROUTE', applicationName: 's2747-water-valtec-single-straight-route',
        owner: 'S2747_WATER_VALTEC_SINGLE_WRITER', receiptFileStem: 'water_valtec_single_route', outputRoot: resolve('.release-runtime/r568/s27-47/g7-valtec-single-straight-route'), expectedParentShape: [42, 39, 56],
        sourcePaths: [...previous.sourcePaths, 'data/estimate-benchmarks/source-packs/water-valtec-ppr20-single-straight-route-s27-47.json',
            'src/lib/estimate/v4/waterValtecPpr20SingleStraightRouteS2747.ts', 'tests/estimateNorms/waterValtecPpr20SingleStraightRouteS2747.contract.test.ts',
            'scripts/estimate/r4a13/prepareS2747WaterValtecSingleStraightRoute.ts'], parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
        acceptanceInput, runtimeProfileInput: runtime,
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash, exact_locator: previous.sourceMetadata.exact_locator + ' | Explicit single straight route; two selected end connections; net sections exclude reserve', use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        passport: { ...previous.passport, includedScopeRu: [...previous.passport.includedScopeRu, 'Предварительный подбор соединений одного подтверждённого прямого участка из отрезков4м и двух выбранных окончаний'],
            excludedScopeRu: [...previous.passport.excludedScopeRu, ...pack.limitations], independentCompletenessMap: { ...previous.passport.independentCompletenessMap!, evidenceSha256: packHash } },
        locator: { key: previous.locator.key + '-single-straight-s2747', payload: { ...previous.locator.payload, singleRouteSourcePackSha256: packHash,
                geometryAutoCountParameterIds: ['straight_coupling_count', 'elbow_count', 'tee_count', 'threaded_transition_count', 'terminal_cap_count'], explicitProjectCountsPreserved: true } },
        search: { ...previous.search, clarificationFields: ['route_length_m', 'route_geometry_mode', 'route_end_connections', 'substrate_profile'], sourceProvenance: { ...previous.search.sourceProvenance, singleRouteSourcePackSha256: packHash, noTopologyDefault: true } },
        verifyCore: async () => {
            const inheritedProof = await previous.verifyCore();
            assert.equal(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-single-straight-route-s27-47.json')).digest('hex'), packHash);
            for (const s of pack.sources)
                assert.equal(createHash('sha256').update(readFileSync(s.localArtifact)).digest('hex'), s.artifactSha256);
            const preserved = await compile(acceptanceInput);
            assert.equal(preserved.preliminaryNeeds.length, 0);
            assert.equal(preserved.rows.length, 56);
            const simple = { route_length_m: 100, route_geometry_mode: pack.geometry.straight, route_end_connections: pack.ends.caps, substrate_profile: 'Сухой бетон, крепление напрямую без отделки' };
            const result = await compile(simple);
            assert.equal(result.preliminaryNeeds.length, 0);
            assert.equal(result.rows.length, 56);
            assert.equal(result.parameters.straight_coupling_count, '24');
            assert.equal(result.parameters.terminal_cap_count, '2');
            assert.equal(result.rows.find(r => r.row_id === 'water-ppr20:02:material:pipe-sections')?.quantity, '27');
            const short = await compile({ route_length_m: 100 });
            assert.deepEqual([...new Set(short.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))].sort(), ['route_geometry_mode', 'substrate_profile']);
            await assert.rejects(() => compile({ ...simple, elbow_count: 8 }), { code: 'PROJECT_GEOMETRY_PARAMETER_CONFLICT' });
            return { ...inheritedProof, shortRouteObjectFacts: 4, topologyDefault: false, netJoinsExcludeSupplyReserve: true, existingProjectCountsPreserved: true, conflictingCountsRejected: true, ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
        } };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747WaterValtecSingleStraightRoute.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecSingleStraightRouteS2747Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
