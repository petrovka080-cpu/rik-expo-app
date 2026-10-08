import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { waterValtecExactFittingsS2747Config } from './prepareS2747WaterValtecExactFittings';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { VALTEC_FISCHER_SUPPORTS_S2747 as pack, VALTEC_FISCHER_SUPPORT_ROW_IDS_S2747 as ids, VALTEC_FISCHER_SUPPORTS_S2747_PARAMETERS as parameters, VALTEC_FISCHER_SUPPORTS_S2747_FORMULAS as formulas, VALTEC_FISCHER_SUPPORTS_S2747_RESOURCES as resources, VALTEC_FISCHER_SUPPORTS_S2747_RUNTIME_INPUT as runtime, VALTEC_FISCHER_SUPPORTS_S2747_SOURCE_PACK_SHA256 as packHash, compileWaterValtecPpr20FischerSupportsS2747 as compile } from '../../../src/lib/estimate/v4/waterValtecPpr20FischerSupportsS2747';
import { canonicalEstimateConsumerInputRole } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import { assertCanonicalPurchaseReadinessV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1';
export function waterValtecFischerSupportsS2747Config(parent: {
    releaseId: string;
    searchReleaseId: string;
}): MasterSingleDefinitionSuccessorConfig {
    const previous = waterValtecExactFittingsS2747Config(parent);
    const parameterIds = new Set(parameters.map(p => p.parameter_id));
    const acceptanceInput: Record<string, unknown> = { ...Object.fromEntries(Object.entries(previous.acceptanceInput).filter(([id]) => parameterIds.has(id))),
        substrate_profile: pack.baseChoices.concrete };
    const byId = new Map(resources.map(r => [r.row_id, r]));
    const oldMap = previous.passport.independentCompletenessMap!;
    const oldEntries = oldMap.entries as {
        expectedResourceId: string;
        formulaId: string;
        [key: string]: unknown;
    }[];
    const componentRows: Record<string, string> = { fks_clamps: ids.clamps, sts_fastener_sets: ids.sets, sts_studs_in_set: ids.stud,
        sx_plus_plugs_in_set: ids.plug, mu_m8_nuts_in_set: ids.nut };
    const supportKeys = pack.independentRequiredSupportComponents.map(key => {
        const rowId = componentRows[key];
        assert(rowId && byId.has(rowId), 'INDEPENDENT_SUPPORT_COMPONENT_ROW_REQUIRED:' + key);
        return { key, rowId };
    });
    const newEntries = [...oldEntries.filter(e => e.expectedResourceId !== 'water-ppr20:03:fastener:support-packages').map(e => ({
            ...e, formulaId: byId.get(e.expectedResourceId)!.formula_id
        })), ...supportKeys.map(({ key, rowId }) => ({
            operationId: 'supports-and-fastening', expectedResourceId: rowId, formulaId: byId.get(rowId)!.formula_id,
            condition: rowId === ids.clamps ? 'selected PP-R20 dry interior route' : 'confirmed compatible solid substrate; unknown base remains an unresolved need',
            sourceId: rowId === ids.clamps ? pack.clamp.sourceId : pack.fastenerSet.sourceId, resolution: { kind: 'ROW', rowId }, independentSourceComponent: key,
        }))];
    return { ...previous, contract: pack.contract, stopCode: 'S2747_WATER_VALTEC_FISCHER_SUPPORTS',
        applicationName: 's2747-water-valtec-fischer-supports', owner: 'S2747_WATER_VALTEC_SINGLE_WRITER', receiptFileStem: 'water_valtec_fischer_supports',
        outputRoot: resolve('.release-runtime/r568/s27-47/g7-valtec-fischer-supports'), expectedParentShape: [40, 38, 52],
        sourcePaths: [...previous.sourcePaths, 'data/estimate-benchmarks/source-packs/water-valtec-ppr20-fischer-supports-s27-47.json',
            'src/lib/estimate/v4/waterValtecPpr20FischerSupportsS2747.ts', 'tests/estimateNorms/waterValtecPpr20FischerSupportsS2747.contract.test.ts',
            'scripts/estimate/r4a13/prepareS2747WaterValtecFischerSupports.ts'],
        parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources, acceptanceInput,
        runtimeProfileInput: runtime,
        runtimeProfileClassification: Object.fromEntries(Object.entries(previous.runtimeProfileClassification ?? {}).filter(([id]) => Object.hasOwn(runtime, id))),
        runtimeProfileSourceIds: Object.fromEntries(Object.entries(previous.runtimeProfileSourceIds ?? {}).filter(([id]) => Object.hasOwn(runtime, id))),
        sourceMetadata: { ...previous.sourceMetadata, artifact_sha256: packHash, exact_locator: previous.sourceMetadata.exact_locator + ' | ' + pack.sources.map(s => s.exactLocator).join(' | '),
            use_restriction: pack.scope + ' ' + pack.engineeringLimitations.join(' ') },
        passport: { ...previous.passport, includedScopeRu: [...previous.passport.includedScopeRu,
                'Опоры раскрыты: хомуты FKS20–24, наборы STS M8×90 и включённые шпильки, дюбели SX Plus10×50 и гайки MU M8'],
            excludedScopeRu: [...previous.passport.excludedScopeRu, 'Неподтверждённое основание, крепление через отделку, проектные нагрузки и размещение подвижных/неподвижных точек'],
            independentCompletenessMap: { ...oldMap, evidenceSha256: packHash, entries: newEntries } },
        locator: { key: previous.locator.key + '-fischer-supports-s2747', payload: { ...previous.locator.payload,
                supportSourcePackSha256: packHash, legacyGenericSupportPackagesRemoved: true, expectedResourceIds: resources.map(r => r.row_id),
                expectedFormulaIds: formulas.map(f => f.formula_id), selectedSupplyOwnerIds: [...(previous.locator.payload.selectedSupplyOwnerIds as string[])
                        .filter(id => id !== 'water-ppr20:03:fastener:support-packages'), ids.clamps, ids.sets],
                effectiveOutputBindings: parameters.flatMap(p => {
                    const binding = p.truth_metadata?.effective_resource_quantity_v1 as {
                        sourceRowId: string;
                        unitId: string;
                    } | undefined;
                    return binding ? [{ ownerRowId: binding.sourceRowId, parameterId: p.parameter_id, unitId: binding.unitId }] : [];
                }) } },
        search: { ...previous.search, clarificationFields: [...previous.search.clarificationFields, 'substrate_profile'],
            sourceProvenance: { ...previous.search.sourceProvenance, fischerSupportSourcePackSha256: packHash, packageIsNotUniversalKit: true } },
        verifyCore: async () => {
            const previousProof = await previous.verifyCore();
            const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
            assert.equal(hash('data/estimate-benchmarks/source-packs/water-valtec-ppr20-fischer-supports-s27-47.json'), packHash);
            for (const source of pack.sources)
                assert.equal(hash(source.localArtifact), source.artifactSha256);
            const complete = await compile(acceptanceInput);
            assert.equal(complete.preliminaryNeeds.length, 0);
            assert.equal(complete.rows.length, 56);
            const q = (id: string) => complete.rows.find(r => r.row_id === id)?.quantity;
            assert.equal(q(ids.clamps), '300');
            assert.equal(q(ids.sets), '51');
            for (const id of [ids.stud, ids.plug, ids.nut])
                assert.equal(q(id), '201');
            assert.equal(q('water-ppr20:03:control:support-order'), '204');
            assert.equal(q('water-ppr20:03:control:support-remainder'), '3');
            const withoutBase: Record<string, unknown> = { ...acceptanceInput };
            delete withoutBase.substrate_profile;
            const pending = await compile(withoutBase);
            for (const id of [ids.stud, ids.plug, ids.nut])
                assert.equal(pending.preliminaryNeeds.find(n => n.row_id === id)?.quantity, '201');
            assert.deepEqual([...new Set(pending.preliminaryNeeds.flatMap(n => n.missing_parameter_ids))], ['substrate_profile']);
            assert.equal(parameters.filter(p => canonicalEstimateConsumerInputRole({ provenance: p.truth_metadata?.provenance as Record<string, unknown> }) === 'OBJECT_FACT').length, 10);
            const shortage = await compile(acceptanceInput, { [ids.clamps]: { quantity: '100', includedInProcurement: true, provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } } });
            assert.throws(() => assertCanonicalPurchaseReadinessV1(shortage.rows));
            const price = await compile(acceptanceInput, { [ids.clamps]: { unitPrice: '2', provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } },
                [ids.sets]: { unitPrice: '4', provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } }, [ids.stud]: { unitPrice: '1', provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } } });
            assert.equal(price.totals.amount, '804');
            assert.equal(price.totals.pricedRowCount, 2);
            return { ...previousProof, separateSupplierOwners: 2, includedPhysicalComponents: 3, addedCustomerFacts: 1, technicalProductFieldsAsked: false,
                unknownBaseNotDefaulted: true, knownPhysicalConsumptionPreserved: true, sharedCompilerAndPurchaseBalance: true,
                legacyGenericOrdersReinterpreted: false, ordinaryUiAccepted: false, wholeG7Accepted: false, acceptedNewTypes: 0 };
        },
    };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747WaterValtecFischerSupports.ts')) {
    const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
    void runMasterSingleDefinitionSuccessorR1(waterValtecFischerSupportsS2747Config({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
        .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
