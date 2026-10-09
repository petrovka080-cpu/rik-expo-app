import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waterValtecMixedEndpointsS2747Config } from './prepareS2747WaterValtecMixedEndpoints';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_KNOWN_ZERO_S2748 as pack, VALTEC_KNOWN_ZERO_S2748_SOURCE_PACK_SHA256 as packHash,
    VALTEC_KNOWN_ZERO_S2748_RESOURCES as resources, compileWaterValtecPpr20KnownZeroS2748 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20KnownZeroS2748';

export function waterValtecKnownZeroS2748Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecMixedEndpointsS2747Config(parent);
    const oldMap = previous.passport.independentCompletenessMap!;
    const entries = oldMap.entries as { expectedResourceId: string; condition?: string; [key: string]: unknown }[];
    return { ...previous, contract: pack.contract, stopCode: 'S2748_WATER_VALTEC_KNOWN_ZERO',
        applicationName: 's2748-water-valtec-known-zero', receiptFileStem: 'water_valtec_known_zero',
        masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (88).md',
        masterSha256: 'aa25a065b9a2ccdbdbbd21b3e820f42e40e3b53323f54dda00306a7ad04f15c0',
        outputRoot: resolve('.release-runtime/r568/s27-48/g7-valtec-known-zero'), expectedParentShape: [53, 45, 62],
        sourcePaths: [...previous.sourcePaths, 'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
            'data/estimate-benchmarks/source-packs/water-valtec-ppr20-known-zero-s27-48.json',
            'src/lib/estimate/v4/waterValtecPpr20KnownZeroS2748.ts',
            'tests/estimateNorms/waterValtecPpr20KnownZeroS2748.contract.test.ts',
            'scripts/estimate/r4a13/prepareS2748WaterValtecKnownZero.ts'],
        resourceDefinitions: resources,
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash,
            use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        passport: { ...previous.passport, excludedScopeRu: [...previous.passport.excludedScopeRu, ...pack.limitations],
            independentCompletenessMap: { ...oldMap, evidenceSha256: packHash,
                entries: entries.map(entry => pack.rowIds.includes(entry.expectedResourceId) ? { ...entry,
                    condition: entry.condition + '; payment and purchase excluded only for known zero consumption and zero order; positive manual spare order retained with exact specification' } : entry) } },
        locator: { key: previous.locator.key + '-known-zero-s2748', payload: { ...previous.locator.payload,
            knownZeroSourcePackSha256: packHash, knownZeroPolicyRowIds: pack.rowIds, retainKnownPhysicalRows: true,
            preservePositiveManualSpareOrders: true, unknownCountNeverDefaultsToZero: true } },
        search: { ...previous.search, sourceProvenance: { ...previous.search.sourceProvenance, knownZeroSourcePackSha256: packHash } },
        verifyCore: async () => {
            const inherited = await previous.verifyCore();
            const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-known-zero-s27-48.json'), packHash);
            assert.equal(hash(pack.previousSourcePack), pack.previousSourcePackSha256);
            const result = await compile(previous.acceptanceInput);
            assert.equal(result.preliminaryNeeds.length, 0);
            assert.equal(result.rows.length, 57);
            const zeroRows = result.rows.filter(r => pack.rowIds.includes(r.row_id) && r.quantity === '0');
            assert.equal(zeroRows.length, 3);
            assert(zeroRows.every(r => !r.included_in_estimate && !r.included_in_procurement));
            assert.equal(result.rows.find(r => r.row_id === pack.rowIds[0])?.quantity, '24');
            assert.equal(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity, '50');
            return { ...inherited, knownZeroOwnersExcluded: zeroRows.map(r => r.row_id), physicalRowsRetained: true,
                ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
        } };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2748WaterValtecKnownZero.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecKnownZeroS2748Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
