import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waterValtecSourceApplicabilityS2748Config } from './prepareS2748WaterValtecSourceApplicability';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_UNKNOWN_WASTE_BALANCE_S2748 as pack, VALTEC_UNKNOWN_WASTE_BALANCE_S2748_SHA256 as hash,
    VALTEC_UNKNOWN_WASTE_BALANCE_S2748_RESOURCES as resources, compileWaterValtecUnknownWasteBalanceS2748 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20UnknownWasteBalanceS2748';

export function waterValtecUnknownWasteBalanceS2748Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecSourceApplicabilityS2748Config(parent);
    return { ...previous, contract: pack.contract, stopCode: 'S2748_WATER_VALTEC_UNKNOWN_WASTE_BALANCE',
        applicationName: 's2748-water-valtec-unknown-waste-balance', receiptFileStem: 'water_valtec_unknown_waste_balance',
        outputRoot: resolve('.release-runtime/r568/s27-48/g7-unknown-waste-balance/publication'), expectedParentShape: [54, 45, 62],
        sourcePaths: [...previous.sourcePaths, 'data/estimate-benchmarks/source-packs/water-valtec-ppr20-unknown-waste-balance-s27-48.json',
            'src/lib/estimate/v4/waterValtecPpr20UnknownWasteBalanceS2748.ts', 'scripts/estimate/r4a13/prepareS2748WaterValtecUnknownWasteBalance.ts',
            'tests/estimateNorms/waterValtecPpr20UnknownWasteBalanceS2748.contract.test.ts'],
        resourceDefinitions: resources,
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: hash, use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        locator: { key: previous.locator.key + '-unknown-waste-balance', payload: { ...previous.locator.payload, unknownWasteBalanceSha256: hash } },
        passport: { ...previous.passport, independentCompletenessMap: { ...previous.passport.independentCompletenessMap!, evidenceSha256: hash } },
        search: { ...previous.search, sourceProvenance: { ...previous.search.sourceProvenance, unknownWasteBalanceSha256: hash } },
        verifyCore: async () => {
            const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(digest('data/estimate-benchmarks/source-packs/water-valtec-ppr20-unknown-waste-balance-s27-48.json'), hash);
            assert.equal(digest(pack.previousSourcePack), pack.previousSourcePackSha256);
            await previous.verifyCore();
            const result = await compile(previous.acceptanceInput);
            assert.equal(result.rows.length, 39); assert.equal(result.preliminaryNeeds.length, 18);
            const bags = result.preliminaryNeeds.find(row => row.row_id === pack.affectedRowId)!;
            assert(bags); assert.equal(bags.quantity, null); assert.equal(bags.calculation_trace.purchaseRequirementV1, undefined);
            return { status: 'GREEN_LIMITED_UNKNOWN_WASTE_BALANCE', knownRows: 39, unresolvedRows: 18,
                unknownBagConsumptionPreserved: true, ordinaryUiAccepted: false, fullTechnicalAcceptance: false, acceptedNewTypes: 0 };
        } };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2748WaterValtecUnknownWasteBalance.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecUnknownWasteBalanceS2748Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
