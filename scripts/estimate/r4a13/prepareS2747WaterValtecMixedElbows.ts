import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waterValtecSingleStraightRouteS2747Config } from './prepareS2747WaterValtecSingleStraightRoute';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_MIXED_ELBOWS_S2747 as pack, VALTEC_MIXED_ELBOWS_S2747_SOURCE_PACK_SHA256 as packHash, VALTEC_MIXED_ELBOWS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ELBOWS_S2747_FORMULAS as formulas, VALTEC_MIXED_ELBOWS_S2747_RESOURCES as resources, VALTEC_MIXED_ELBOWS_S2747_RUNTIME_INPUT as runtime, compileWaterValtecPpr20MixedElbowsS2747 as compile, } from '../../../src/lib/estimate/v4/waterValtecPpr20MixedElbowsS2747';
export function waterValtecMixedElbowsS2747Config(parent: {
    releaseId: string;
    searchReleaseId: string;
}): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecSingleStraightRouteS2747Config(parent);
    const genericId = 'water-ppr20:05:component:elbows';
    const oldMap = previous.passport.independentCompletenessMap!;
    const entries = oldMap.entries as {
        expectedResourceId: string;
        [key: string]: unknown;
    }[];
    return {
        ...previous,
        contract: pack.contract,
        stopCode: 'S2747_WATER_VALTEC_MIXED_ELBOWS',
        applicationName: 's2747-water-valtec-mixed-elbows',
        receiptFileStem: 'water_valtec_mixed_elbows',
        outputRoot: resolve('.release-runtime/r568/s27-47/g7-valtec-mixed-elbows'),
        expectedParentShape: [47, 41, 58],
        sourcePaths: [...previous.sourcePaths,
            'data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-elbows-s27-47.json',
            'src/lib/estimate/v4/waterValtecPpr20MixedElbowsS2747.ts',
            'tests/estimateNorms/waterValtecPpr20MixedElbowsS2747.contract.test.ts',
            'tests/requestEstimate/canonicalMixedElbowRequiredProjection.contract.test.ts',
            'scripts/estimate/r4a13/prepareS2747WaterValtecMixedElbows.ts',
            'src/lib/estimate/backendPlatform/canonicalPreliminaryParameterFormulaV1.ts',
            'src/lib/estimate/backendPlatform/inclusionGraph.ts',
        ],
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        runtimeProfileInput: runtime,
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash,
            exact_locator: previous.sourceMetadata.exact_locator + ' | ' + pack.variants.map(v => v.exactLocator).join(' | '),
            use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        passport: { ...previous.passport,
            includedScopeRu: [...previous.passport.includedScopeRu, 'Повороты 45° и 90°: отдельные изделия по фактическим количествам; общий счёт и сварные гнёзда рассчитывает приложение'],
            excludedScopeRu: [...previous.passport.excludedScopeRu, ...pack.limitations],
            independentCompletenessMap: { ...oldMap, evidenceSha256: packHash,
                entries: [...entries.map(entry => entry.expectedResourceId === genericId ? { ...entry,
                        condition: 'Existing homogeneous project schedule outside the explicitly selected mixed45/90scope' } : entry),
                    ...pack.variants.map((variant, index) => ({ operationId: 'fittings-and-fusion', expectedResourceId: variant.rowId,
                        formulaId: formulas[formulas.length - pack.variants.length + index].formula_id,
                        condition: 'Explicit mixed45/90scope and positive actual count for ' + variant.angleDegrees + 'degree turns',
                        sourceId: pack.primarySource.sourceId, resolution: { kind: 'ROW', rowId: variant.rowId },
                        independentSourceComponent: variant.titleRu, primarySourceLocator: variant.exactLocator }))] } },
        locator: { key: previous.locator.key + '-mixed-elbows-s2747', payload: { ...previous.locator.payload,
                mixedElbowsSourcePackSha256: packHash, expectedResourceIds: resources.map(r => r.row_id),
                expectedFormulaIds: formulas.map(f => f.formula_id),
                selectedSupplyOwnerIds: [...previous.locator.payload.selectedSupplyOwnerIds, ...pack.variants.map(v => v.rowId)],
                genericOwnerReplacedOnlyInSelectedMixedScope: true, zeroVariantCreatesNoOwner: true,
                actualCountParameterIds: pack.variants.map(v => v.parameterId), aggregateCountParameterId: 'elbow_count' } },
        search: { ...previous.search, aliases: [...previous.search.aliases, 'Водопровод PP-R20 с поворотами45и90'],
            sourceProvenance: { ...previous.search.sourceProvenance, mixedElbowsSourcePackSha256: packHash,
                noAngleDistributionDefault: true, separateModelPriceOwnership: true } },
        verifyCore: async () => {
            const inherited = await previous.verifyCore();
            const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-mixed-elbows-s27-47.json'), packHash);
            assert.equal(hash(pack.primarySource.localArtifact), pack.primarySource.artifactSha256);
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json'), pack.previousFittingsPackSha256);
            const preserved = await compile(previous.acceptanceInput);
            assert.equal(preserved.preliminaryNeeds.length, 0);
            assert.equal(preserved.rows.length, 56);
            const input = { ...previous.acceptanceInput, route_geometry_mode: pack.geometryMode,
                elbow_count: undefined, valtec_elbow_selection: undefined, valtec_elbows45_count: 3, valtec_elbows90_count: 5 };
            const mixed = await compile(input);
            assert.equal(mixed.preliminaryNeeds.length, 0);
            assert.equal(mixed.parameters.elbow_count, '8');
            assert.equal(mixed.rows.length, 57);
            assert.equal(mixed.rows.some(r => r.row_id === genericId), false);
            for (const [index, quantity] of ['3', '5'].entries())
                assert.equal(mixed.rows.find(r => r.row_id === pack.variants[index].rowId)?.quantity, quantity);
            const zero = await compile({ ...input, valtec_elbows45_count: 0 });
            assert.equal(zero.rows.some(r => r.row_id === pack.variants[0].rowId), false);
            await assert.rejects(() => compile({ ...input, elbow_count: 9 }), { code: 'PROJECT_GEOMETRY_PARAMETER_CONFLICT' });
            return { ...inherited, mixedElbowModels: 2, aggregateCountDerived: true, mixedResourceRows: 57,
                genericOwnerNotDoubleBilled: true, zeroVariantNotPurchasedOrBilled: true, homogeneousRecordsPreserved: true,
                ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
        },
    };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747WaterValtecMixedElbows.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecMixedElbowsS2747Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
