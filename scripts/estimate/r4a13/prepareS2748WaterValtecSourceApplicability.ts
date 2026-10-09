import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waterValtecKnownZeroS2748Config } from './prepareS2748WaterValtecKnownZero';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_SOURCE_APPLICABILITY_S2748 as pack, VALTEC_SOURCE_APPLICABILITY_S2748_SHA256 as hash,
    VALTEC_SOURCE_APPLICABILITY_S2748_PARAMETERS as parameters, VALTEC_SOURCE_APPLICABILITY_S2748_FORMULAS as formulas,
    VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES as resources, VALTEC_SOURCE_APPLICABILITY_S2748_RUNTIME_INPUT as runtime,
    withoutUnconfirmedValtecNormsS2748 as without, compileWaterValtecSourceApplicabilityS2748 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20SourceApplicabilityS2748';

export function waterValtecSourceApplicabilityS2748Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecKnownZeroS2748Config(parent);
    const acceptanceInput = without(previous.acceptanceInput);
    return { ...previous, contract: pack.contract, stopCode: 'S2748_WATER_VALTEC_SOURCE_APPLICABILITY',
        applicationName: 's2748-water-valtec-source-applicability', receiptFileStem: 'water_valtec_source_applicability',
        outputRoot: resolve('.release-runtime/r568/s27-48/g7-source-norms/publication'), expectedParentShape: [53, 45, 62],
        sourcePaths: [...previous.sourcePaths, 'data/estimate-benchmarks/source-packs/water-valtec-ppr20-source-applicability-s27-48.json',
            'src/lib/estimate/v4/waterValtecPpr20SourceApplicabilityS2748.ts', 'scripts/estimate/r4a13/prepareS2748WaterValtecSourceApplicability.ts',
            'tests/estimateNorms/waterValtecPpr20SourceApplicabilityS2748.contract.test.ts', ...pack.sources.map(s => s.localArtifact)],
        parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources, acceptanceInput,
        runtimeProfileInput: runtime,
        runtimeProfileClassification: Object.fromEntries(Object.entries(previous.runtimeProfileClassification ?? {}).filter(([id]) => Object.hasOwn(runtime, id))),
        runtimeProfileSourceIds: Object.fromEntries(Object.entries(previous.runtimeProfileSourceIds ?? {}).filter(([id]) => Object.hasOwn(runtime, id))),
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: hash, use_restriction: pack.scope + ' ' + pack.limitations.join(' ') },
        passport: { ...previous.passport, includedScopeRu: [...previous.passport.includedScopeRu,
            'Неподтверждённые расходники, труд, машино-часы, испытания, промывка и рейсы сохранены как потребности приложения без числовых норм'],
            excludedScopeRu: [...previous.passport.excludedScopeRu, ...pack.limitations],
            unresolvedApplicableResourceRowIds: pack.unresolvedResourceRowIds,
            independentCompletenessMap: { ...previous.passport.independentCompletenessMap!, evidenceSha256: hash } },
        locator: { key: previous.locator.key + '-source-applicability-s2748', payload: { ...previous.locator.payload,
            sourceApplicabilitySha256: hash, unresolvedApplicationParameters: Object.keys(pack.unresolvedApplicationParameters),
            unconfirmedNormsNotCustomerQuestions: true, oldRevisionsUnchanged: true, fullTechnicalAcceptance: false } },
        search: { ...previous.search,
            shortScopeRu: 'Точные выбранные изделия и схема соединений. Труд, расходники, испытания и завершительные услуги остаются потребностями до подтверждения применимых источников; полная технология не принята.',
            sourceProvenance: { ...previous.search.sourceProvenance, sourceApplicabilitySha256: hash, quantityScope: 'PARTIAL', fullTechnicalAcceptance: false } },
        verifyCore: async () => {
            const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(digest('data/estimate-benchmarks/source-packs/water-valtec-ppr20-source-applicability-s27-48.json'), hash);
            assert.equal(digest(pack.previousSourcePack), pack.previousSourcePackSha256);
            for (const source of pack.sources) assert.equal(digest(source.localArtifact), source.artifactSha256);
            const result = await compile(acceptanceInput);
            assert.equal(result.rows.length, 39); assert.equal(result.preliminaryNeeds.length, 18);
            assert.deepEqual(result.preliminaryNeeds.map(r => r.row_id).sort(), [...pack.unresolvedResourceRowIds].sort());
            assert.equal(result.rows.find(r => r.row_id === 'water-ppr20:04:component:straight-couplings')?.quantity, '24');
            assert.equal(result.rows.find(r => r.row_id === 'water-ppr20:05:control:total-fusion-sockets')?.quantity, '50');
            for (const id of Object.keys(pack.unresolvedApplicationParameters)) {
                assert(!Object.hasOwn(runtime, id)); assert(!Object.hasOwn(acceptanceInput, id));
                await assert.rejects(() => compile({ ...acceptanceInput, [id]: 0 }), /unresolved application norm cannot be supplied/);
            }
            return { status: 'GREEN_LIMITED_SOURCE_APPLICABILITY', knownRows: 39, unresolvedRows: 18,
                unknownsNotZero: true, numerical2022RateImported: false, oldRevisionsChanged: false,
                ordinaryUiAccepted: false, wholeG7Accepted: false, fullTechnicalAcceptance: false, acceptedNewTypes: 0 };
        } };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2748WaterValtecSourceApplicability.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecSourceApplicabilityS2748Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
