// Actual canonical full affected TypeScript program. No virtual .after source host.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = 'C:/dev/rik-expo-app-r4a5-dc4f0ce7';
const WORK = 'C:/Users/User/Documents/Codex/2026-10-19/new-chat/work';
const MANIFEST = ROOT + '/.release-runtime/delivery16-integration/virtual-files.json';
const EXTRA_SEEDS = [
  "scripts/estimate/backendMigration/canonicalImmutableCalculationContinuityR1.test.ts",
  "scripts/estimate/backendMigration/canonicalImmutableCalculationContinuityR1.ts",
  "scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryAdmissionR1.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "scripts/estimate/r4a13/brickPartition005ParentRebaseR1.test.ts",
  "scripts/estimate/r4a13/brickPartitionSelectedMaterialDeliveryR1.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherConditionalSourceScopeR1.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherParameterOrdinalsR1.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherPriceInheritanceR1.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/floorSandStraightedgeRetainedMasterR3.test.ts",
  "scripts/estimate/r4a13/masterExistingNormativeRegistryReuseR1.test.ts",
  "scripts/estimate/r4a13/masterRetainedCapturedSourcePreimageR1.test.ts",
  "scripts/estimate/r4a13/masterRetainedSuccessorProvenanceContinuationR1.test.ts",
  "scripts/estimate/r4a13/masterRuntimeAdmissionMetadataR1.test.ts",
  "scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.test.ts",
  "scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionAppendParentBridgeR1.test.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionAppendParentBridgeR1.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionBoundedJoinGroupCaptureR1.test.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionCapturedJoinGroupMembersR1.test.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionExplicitAppendSourcesR1.test.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.test.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionRetainedFormulaExpressionRepairsR1.test.ts",
  "scripts/estimate/r4a13/prepareBrickPartitionHalfKrer08Column05AppendR1.ts",
  "scripts/estimate/r4a13/prepareCastironRadiatorInstallPrepKrer18AppendR1.test.ts",
  "scripts/estimate/r4a13/prepareCastironRadiatorInstallPrepKrer18AppendR1.ts",
  "scripts/estimate/r4a13/prepareCeramicFloorCementMortarKrer11Column03AppendR1.test.ts",
  "scripts/estimate/r4a13/prepareCeramicFloorCementMortarKrer11Column03AppendR1.ts",
  "scripts/estimate/r4a13/prepareCurbBaseCuringAntisolMasterRetainedR2.test.ts",
  "scripts/estimate/r4a13/prepareCurbBaseCuringAntisolMasterRetainedR2.ts",
  "scripts/estimate/r4a13/prepareElecor60x40SingleRouteMaterialsR1.ts",
  "scripts/estimate/r4a13/prepareElecorMechanicalFixingsCurrentPublicationR2.test.ts",
  "scripts/estimate/r4a13/prepareElecorMechanicalFixingsCurrentPublicationR2.ts",
  "scripts/estimate/r4a13/prepareElecorMechanicalFixingsMasterSuccessorR3.test.ts",
  "scripts/estimate/r4a13/prepareElecorMechanicalFixingsMasterSuccessorR3.ts",
  "scripts/estimate/r4a13/prepareEuroflexFactoryHalfCurrentPublicationR3.ts",
  "scripts/estimate/r4a13/prepareEuroflexFactoryHalfLayoutCurrentR3.ts",
  "scripts/estimate/r4a13/prepareFlatMetalOil03002CreateAppendR1.test.ts",
  "scripts/estimate/r4a13/prepareFlatMetalOil03002CreateAppendR1.ts",
  "scripts/estimate/r4a13/prepareFloorSandStraightedgeRetainedMasterR3.ts",
  "scripts/estimate/r4a13/prepareFloorSandThicknessControlMasterRetainedR1.test.ts",
  "scripts/estimate/r4a13/prepareFloorSandThicknessControlMasterRetainedR1.ts",
  "scripts/estimate/r4a13/prepareFloorSandUnderlayerColumn01AppendR1.ts",
  "scripts/estimate/r4a13/prepareGraniteKerbCementColumn03AppendR1.ts",
  "scripts/estimate/r4a13/prepareHydrotestInternalSteelDn50Column01AppendR1.test.ts",
  "scripts/estimate/r4a13/prepareHydrotestInternalSteelDn50Column01AppendR1.ts",
  "scripts/estimate/r4a13/prepareLegrandP31BlindEpJointFastenersR1.ts",
  "scripts/estimate/r4a13/prepareManualTrench05701AdmittedMasterAppendR1.test.ts",
  "scripts/estimate/r4a13/prepareManualTrench05701AdmittedMasterAppendR1.ts",
  "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
  "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
  "scripts/estimate/r4a13/preparePavingCut70AdmittedMasterAppendR2.ts",
  "scripts/estimate/r4a13/preparePavingCutStationary70ConditionalMasterAppendR1.ts",
  "scripts/estimate/r4a13/prepareRoadMarking01601AdmittedMasterAppendR1.test.ts",
  "scripts/estimate/r4a13/prepareRoadMarking01601AdmittedMasterAppendR1.ts",
  "scripts/estimate/r4a13/prepareRoadUpperGravel150Column02AppendR1.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR2.test.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR2.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR3.test.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR3.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardSourceVariantFactoryDraftR1.test.ts",
  "scripts/estimate/r4a13/prepareStairsDokaStandardSourceVariantFactoryDraftR1.ts",
  "scripts/estimate/r4a13/projectSourcePackageBindingR1.test.ts",
  "scripts/estimate/r4a13/s2775EuroflexMaterialIntegration.test.ts",
  "scripts/estimate/r4a13/s2775SharedPublisherGuards.test.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/features/consumerRepair/requestEstimateViewModel.r4.test.ts",
  "src/lib/estimate/backendPlatform/canonicalConstructionPublicLanguageS2783.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
  "src/lib/estimate/backendPlatform/canonicalImmutableCalculationContinuityV1.test.ts",
  "src/lib/estimate/backendPlatform/canonicalImmutableCalculationContinuityV1.ts",
  "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageCurbConditionalV1.test.ts",
  "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.roadUpper.test.ts",
  "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts",
  "src/lib/estimate/backendPlatform/canonicalProcurementOperationAllocation.test.ts",
  "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts",
  "src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.test.ts",
  "src/lib/estimate/backendPlatform/canonicalStairsSourceVariantSavedParentR1.test.ts",
  "src/lib/estimate/backendPlatform/canonicalStairsSourceVariantSavedParentR1.ts",
  "src/lib/estimate/ownedDomain/formworkRicsNrm2ProductionBindingV1.ts",
  "src/lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1.ts",
  "src/lib/estimate/ownedDomain/reinforcementBarScheduleProductionBindingV1.ts",
  "src/lib/estimate/v4/anchorGroupReinforcementR1.ts",
  "src/lib/estimate/v4/beltConcretePlacementR1.ts",
  "src/lib/estimate/v4/beltReinforcementR1.ts",
  "src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1.test.ts",
  "src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1.ts",
  "src/lib/estimate/v4/brickRectangularColumn00303QuantityR1.test.ts",
  "src/lib/estimate/v4/brickRectangularColumn00303QuantityR1.ts",
  "src/lib/estimate/v4/castironRadiatorKrer18R1.test.ts",
  "src/lib/estimate/v4/castironRadiatorKrer18R1.ts",
  "src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1.test.ts",
  "src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1.ts",
  "src/lib/estimate/v4/ceramicSkirting03904CompletionR1.test.ts",
  "src/lib/estimate/v4/ceramicSkirting03904CompletionR1.ts",
  "src/lib/estimate/v4/columnBaseConcretePlacementR1.ts",
  "src/lib/estimate/v4/columnBaseReinforcementR1.ts",
  "src/lib/estimate/v4/concreteCuringAntisolMaterialS2763.test.ts",
  "src/lib/estimate/v4/concreteSlabConcretePlacementR1.ts",
  "src/lib/estimate/v4/concreteSlabReinforcementR1.ts",
  "src/lib/estimate/v4/curbBaseCuringAntisol250wCompletionR1.test.ts",
  "src/lib/estimate/v4/curbBaseCuringAntisol250wCompletionR1.ts",
  "src/lib/estimate/v4/domainFactory/clientRuntimeV1.ts",
  "src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1.test.ts",
  "src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1.ts",
  "src/lib/estimate/v4/elecorMechanicalProjectFixingsPublicPresentationR1.test.ts",
  "src/lib/estimate/v4/elecorSingleRouteMaterialR1.test.ts",
  "src/lib/estimate/v4/elecorSingleRouteMaterialR1.ts",
  "src/lib/estimate/v4/facadeFlashingsWithDownpipes00801QuantityR1.test.ts",
  "src/lib/estimate/v4/facadeFlashingsWithDownpipes00801QuantityR1.ts",
  "src/lib/estimate/v4/flatMetalOil03002AdmittedR1.test.ts",
  "src/lib/estimate/v4/flatMetalOil03002AdmittedR1.ts",
  "src/lib/estimate/v4/flatMetalOil03002QuantityR1.test.ts",
  "src/lib/estimate/v4/flatMetalOil03002QuantityR1.ts",
  "src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1.test.ts",
  "src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1.ts",
  "src/lib/estimate/v4/floorSandThicknessControlSpKr65R1.test.ts",
  "src/lib/estimate/v4/floorSandThicknessControlSpKr65R1.ts",
  "src/lib/estimate/v4/floorSandUnderlayerKrer11Column01R1.ts",
  "src/lib/estimate/v4/formworkReinforcementR1.ts",
  "src/lib/estimate/v4/foundationRubbleSidePreparation00308CompletionR1.test.ts",
  "src/lib/estimate/v4/foundationRubbleSidePreparation00308CompletionR1.ts",
  "src/lib/estimate/v4/foundationSideHotBitumenTwoCoatsKrer08R1.test.ts",
  "src/lib/estimate/v4/foundationSideHotBitumenTwoCoatsKrer08R1.ts",
  "src/lib/estimate/v4/galvanizedRoundDuct200Normal00101QuantityR1.test.ts",
  "src/lib/estimate/v4/galvanizedRoundDuct200Normal00101QuantityR1.ts",
  "src/lib/estimate/v4/graniteKerbCementKrer27Column03R1.test.ts",
  "src/lib/estimate/v4/graniteKerbCementKrer27Column03R1.ts",
  "src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.test.ts",
  "src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.ts",
  "src/lib/estimate/v4/jointReinforcementR1.ts",
  "src/lib/estimate/v4/legrandP31BlindEpJointFastenersR1.test.ts",
  "src/lib/estimate/v4/legrandP31BlindEpJointFastenersR1.ts",
  "src/lib/estimate/v4/manualBackfillSoil106101QuantityR1.test.ts",
  "src/lib/estimate/v4/manualBackfillSoil106101QuantityR1.ts",
  "src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1.test.ts",
  "src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1.ts",
  "src/lib/estimate/v4/manualTrench05701AdmittedR1.test.ts",
  "src/lib/estimate/v4/manualTrench05701AdmittedR1.ts",
  "src/lib/estimate/v4/masonryBrickWallBiaTn10R1.ts",
  "src/lib/estimate/v4/monolithicStairDokaKrer06Column11101R1.ts",
  "src/lib/estimate/v4/p31Ep341213PhysicalReferenceR1.test.ts",
  "src/lib/estimate/v4/p31Ep341213PhysicalReferenceR1.ts",
  "src/lib/estimate/v4/pavingCut70AdmittedR2.test.ts",
  "src/lib/estimate/v4/pavingCut70AdmittedR2.ts",
  "src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1.test.ts",
  "src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1.ts",
  "src/lib/estimate/v4/pavingCutStationary70QuantityR1.test.ts",
  "src/lib/estimate/v4/pavingCutStationary70QuantityR1.ts",
  "src/lib/estimate/v4/pedestalConcretePlacementR1.ts",
  "src/lib/estimate/v4/pedestalReinforcementR1.ts",
  "src/lib/estimate/v4/pileCapConcretePlacementR1.ts",
  "src/lib/estimate/v4/pileCapReinforcementR1.ts",
  "src/lib/estimate/v4/reinforcementFrameConcretePlacementR1.ts",
  "src/lib/estimate/v4/reinforcementFrameReinforcementR1.ts",
  "src/lib/estimate/v4/roadMarking01601AdmittedR1.test.ts",
  "src/lib/estimate/v4/roadMarking01601AdmittedR1.ts",
  "src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1.test.ts",
  "src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1.ts",
  "src/lib/estimate/v4/roadUpperGravel150Krer27Column02R1.ts",
  "src/lib/estimate/v4/selectedMaterialDeliveryReuseR1.ts",
  "src/lib/estimate/v4/simpleCementLimeStoneWall01601QuantityR1.test.ts",
  "src/lib/estimate/v4/simpleCementLimeStoneWall01601QuantityR1.ts",
  "src/lib/estimate/v4/slabFoundationConcretePlacementR1.ts",
  "src/lib/estimate/v4/slabFoundationReinforcementR1.ts",
  "src/lib/estimate/v4/stairsCompleteInstallationR1.ts",
  "src/lib/estimate/v4/stairsConcretePlacementR1.ts",
  "src/lib/estimate/v4/stairsDokaStandardSourceVariantR1.test.ts",
  "src/lib/estimate/v4/stairsDokaStandardSourceVariantR1.ts",
  "src/lib/estimate/v4/stairsReinforcementR1.ts",
  "src/lib/estimate/v4/steelWaterDn15InstallationQuantityR1.test.ts",
  "src/lib/estimate/v4/steelWaterDn15InstallationQuantityR1.ts",
  "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
  "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
  "src/lib/estimate/v4/ventPitotPortCapsProjectPReferenceR1.test.ts",
  "src/lib/estimate/v4/ventPitotPortCapsProjectPReferenceR1.ts",
  "tests/aiEstimateV4/canonicalEstimateParameterSessionSnapshot.contract.test.ts",
  "tests/estimateNorms/euroflexFactoryHalfCurrentR3.contract.test.ts",
  "tests/estimateNorms/floorSandUnderlayerKrer11Column01R1.contract.test.ts",
  "tests/estimateNorms/roadUpperGravel150Column02R1.contract.test.ts",
  "tests/requestEstimate/brickPartitionSelectedMaterialDeliveryR1.contract.test.ts",
  "tests/requestEstimate/canonicalManualPriceReleaseMigration.contract.test.ts",
  "tests/requestEstimate/consumerCanonicalReleaseMigration.contract.test.ts",
  "tests/requestEstimate/selectedMaterialDeliveryAdmissionR1.contract.test.ts",
  "tests/requestEstimate/selectedMaterialDeliveryReuseR1.contract.test.ts",
  "tests/requestEstimate/selectedMaterialDeliveryServerR1.contract.test.ts"
];
const norm = value => path.resolve(value).replaceAll('\\', '/');
const key = value => norm(value).toLowerCase();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(key(process.cwd()) === key(ROOT), 'CANONICAL_CWD_REQUIRED');
assert(process.argv.length === 9, 'EXPECTED_OUTPUT_AND_THREE_NAMED_ARGUMENTS');
const output = norm(process.argv[2]);
const args = new Map();
for (let i = 3; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const expectedHead = args.get('--expected-head');
const expectedManifestSha = args.get('--seed-manifest-sha256');
const runId = args.get('--guard-run-id');
assert(/^[a-f0-9]{40}$/.test(expectedHead ?? ''), 'EXACT_EXPECTED_HEAD_REQUIRED');
assert(/^[a-f0-9]{64}$/.test(expectedManifestSha ?? ''), 'EXACT_MANIFEST_SHA_REQUIRED');
assert(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(runId ?? ''), 'RUN_ID_REQUIRED');
assert(process.env.DELIVERY16_CURRENT_TSC_GUARD_RUN_ID === runId, 'BOUNDED_OWNED_GUARD_REQUIRED');
assert(key(path.dirname(output)) === key(WORK) && output.endsWith('.json'), 'TASK_WORK_OUTPUT_REQUIRED');
assert(!fs.existsSync(output), 'EXCLUSIVE_RESULT_OUTPUT_REQUIRED');
const configPath = output + '.tsconfig.json';
const phasesPath = output + '.phases.jsonl';
assert(!fs.existsSync(configPath) && !fs.existsSync(phasesPath), 'EXCLUSIVE_CONFIG_AND_PHASES_REQUIRED');
const phaseFd = fs.openSync(phasesPath, 'wx');
const started = Date.now();
function phase(name, extra = {}) {
  const m = process.memoryUsage();
  const item = { phase: name, elapsedMs: Date.now() - started, rss: m.rss,
    heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external, ...extra };
  fs.writeSync(phaseFd, JSON.stringify(item) + '\n');
  console.log(JSON.stringify(item));
}
const buffer = Buffer.allocUnsafe(64 * 1024);
function diskPin(file) {
  const fd = fs.openSync(file, 'r');
  const raw = createHash('sha256');
  const utf8 = createHash('sha256');
  let size = 0;
  let first = true;
  try {
    for (;;) {
      const n = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!n) break;
      const bytes = buffer.subarray(0, n);
      raw.update(bytes);
      const skip = first && n >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
      utf8.update(bytes.subarray(skip));
      size += n;
      first = false;
    }
  } finally { fs.closeSync(fd); }
  return { path: norm(file), sha256: raw.digest('hex'), utf8TextSha256: utf8.digest('hex'), bytes: size };
}
const textSha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const hashRecords = records => textSha(JSON.stringify(records));
const git = (...argv) => execFileSync('git', argv, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
const require = createRequire(ROOT + '/package.json');
const ts = require('typescript');
const report = {
  contract: 'construction-wave-current-canonical-full-affected-typescript/masonry005-r1',
  floorActualCanonicalAdoptionChecked: true, p31ActualCanonicalAdoptionChecked: true, overlaySources: 0,
  status: 'FAIL_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM',
  runId, sourceHeadExpected: expectedHead, typescriptVersion: ts.version,
  seedManifestPath: MANIFEST, seedManifestExpectedSha256: expectedManifestSha,
  virtualCandidateFiles: 0, virtualMappingValuesUsed: false, stagedAfterContentUsed: false,
  filteredDiagnostics: false, transpileOnly: false, noEmit: true,
  activeCheckoutEdited: false, priorAll15Relabelled: false,
  diagnostics: [], harnessErrors: [],
};
try {
  phase('inputs');
  report.sourceHeadBefore = git('rev-parse', 'HEAD');
  assert(report.sourceHeadBefore === expectedHead, 'EXPECTED_HEAD_MISMATCH');
  assert(key(git('rev-parse', '--show-toplevel')) === key(ROOT), 'CANONICAL_GIT_ROOT_REQUIRED');
  const manifestBefore = diskPin(MANIFEST);
  assert(manifestBefore.sha256 === expectedManifestSha, 'SEED_MANIFEST_CHANGED');
  // Keys only: legacy mapping values are deliberately never opened or resolved.
  const originalKeys = Object.keys(JSON.parse(fs.readFileSync(MANIFEST, 'utf8').replace(/^\uFEFF/, '')));
  const originalSeeds = originalKeys.filter(file => /\.tsx?$/i.test(file)).map(norm);
  assert(originalSeeds.length > 0, 'ORIGINAL_TYPESCRIPT_SEEDS_MISSING');
  const extras = EXTRA_SEEDS.map(rel => norm(ROOT + '/' + rel));
  const seeds = [...new Set([...originalSeeds, ...extras])].sort();
  for (const seed of seeds) {
    const relative = path.relative(ROOT, seed).replaceAll('\\', '/');
    assert(relative && !relative.startsWith('../') && !path.isAbsolute(relative), 'NONCANONICAL_SEED:' + seed);
    assert(!relative.startsWith('.release-runtime/'), 'STAGED_SEED_FORBIDDEN:' + seed);
    assert(fs.statSync(seed).isFile(), 'ACTUAL_CANONICAL_SEED_MISSING:' + seed);
  }
  report.originalManifestKeyCount = originalKeys.length;
  report.originalTypescriptSeedCount = originalSeeds.length;
  report.seedFiles = seeds;
  report.additionalSeedPaths = extras;
  report.addedSeedsNotAlreadyInManifest = extras.filter(file => !originalSeeds.includes(file));
  const seedPinsBefore = seeds.map(diskPin);
  const config = { extends: ROOT + '/tsconfig.json', compilerOptions: { incremental: false, noEmit: true, typeRoots: [ROOT + '/node_modules/@types'] },
    files: seeds, include: [ROOT + '/types/**/*.ts', ROOT + '/.expo/types/**/*.ts', ROOT + '/expo-env.d.ts'] };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  report.generatedConfigPath = configPath;
  const configReadPins = new Map();
  const parseHost = { ...ts.sys, readFile(file) {
    const text = ts.sys.readFile(file);
    if (text !== undefined && fs.existsSync(file)) {
      const pin = diskPin(file);
      const previous = configReadPins.get(key(file));
      assert(!previous || previous.sha256 === pin.sha256, 'CONFIG_CHANGED_WHILE_READING:' + file);
      configReadPins.set(key(file), pin);
    }
    return text;
  } };
  const loadedConfig = ts.readConfigFile(configPath, parseHost.readFile);
  const parsed = ts.parseJsonConfigFileContent(loadedConfig.config ?? {}, parseHost, path.dirname(configPath), undefined, configPath);
  const configDiagnostics = [...(loadedConfig.error ? [loadedConfig.error] : []), ...parsed.errors];
  report.rootFiles = parsed.fileNames.map(norm);
  report.ambientRootFiles = report.rootFiles.filter(file => !seeds.some(seed => key(seed) === key(file)));
  report.compilerOptions = parsed.options;
  assert(parsed.options.noEmit === true && parsed.options.incremental === false, 'NO_EMIT_NONINCREMENTAL_REQUIRED');
  assert(parsed.options.typeRoots?.length === 1 && key(parsed.options.typeRoots[0]) === key(ROOT + '/node_modules/@types'), 'CANONICAL_LOCKED_AMBIENT_TYPES_REQUIRED');
  phase('config_parsed', { seedCount: seeds.length, rootFileCount: parsed.fileNames.length });
  phase('create_program_started');
  // Standard compiler host and actual canonical filesystem. No readFile/fileExists/source/realpath overlay.
  const host = ts.createCompilerHost(parsed.options);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host });
  phase('program_created', { programFileCount: program.getSourceFiles().length });
  const compiledSeeds = new Map(program.getSourceFiles().map(source => [key(source.fileName), source]));
  report.missingCompiledSeedFiles = seeds.filter(seed => !compiledSeeds.has(key(seed)));
  report.allSeedFilesActuallyCompiled = report.missingCompiledSeedFiles.length === 0;
  assert(report.allSeedFilesActuallyCompiled, 'CANONICAL_SEED_NOT_COMPILED:' + report.missingCompiledSeedFiles.join(','));
  function snapshotGraph() {
    return program.getSourceFiles().map(source => {
      const file = norm(source.fileName);
      assert(!file.toLowerCase().includes('/.release-runtime/delivery16-integration/after/'), 'VIRTUAL_AFTER_IN_PROGRAM:' + file);
      assert(!file.toLowerCase().includes('/.release-runtime/delivery16-integration/before/'), 'VIRTUAL_BEFORE_IN_PROGRAM:' + file);
      const pin = diskPin(file);
      const compiledTextSha256 = textSha(source.getFullText());
      let diskTextSha256 = pin.utf8TextSha256;
      // Keep the raw byte pin while respecting TypeScript decoding for BOM/UTF16/invalid UTF8 sources.
      if (diskTextSha256 !== compiledTextSha256) {
        const currentText = ts.sys.readFile(file);
        assert(currentText !== undefined, 'COMPILER_SOURCE_NO_LONGER_READABLE:' + file);
        diskTextSha256 = textSha(currentText);
      }
      return { ...pin, compiledTextSha256, diskTextSha256, compiledTextMatchesDisk: compiledTextSha256 === diskTextSha256 };
    }).sort((a, b) => a.path.localeCompare(b.path));
  }
  phase('full_graph_snapshot_before_started');
  const before = snapshotGraph();
  report.compilerFilesBefore = before;
  report.compilerGraphSha256Before = hashRecords(before);
  for (const item of before) if (!item.compiledTextMatchesDisk) report.harnessErrors.push('COMPILED_CONTENT_DIFFERS_FROM_DISK_BEFORE:' + item.path);
  for (const seedPin of seedPinsBefore) {
    const current = before.find(file => key(file.path) === key(seedPin.path));
    if (!current || current.sha256 !== seedPin.sha256) report.harnessErrors.push('SEED_CHANGED_DURING_PROGRAM_CREATION:' + seedPin.path);
  }
  phase('full_graph_snapshot_before_finished', { fullProgramFileCount: before.length });
  phase('unfiltered_preemit_diagnostics_started');
  const diagnostics = [...configDiagnostics, ...ts.getPreEmitDiagnostics(program)];
  report.diagnostics = diagnostics.map(d => ({ code: d.code, category: ts.DiagnosticCategory[d.category],
    ...(d.file ? { file: norm(d.file.fileName) } : {}),
    ...(d.file && d.start != null ? { line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
      character: d.file.getLineAndCharacterOfPosition(d.start).character + 1 } : {}),
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n') }));
  phase('unfiltered_preemit_diagnostics_finished', { diagnosticCount: report.diagnostics.length });
  phase('full_graph_snapshot_after_started');
  const after = snapshotGraph();
  report.compilerFilesAfter = after;
  report.compilerGraphSha256After = hashRecords(after);
  report.fullProgramFileCount = after.length;
  report.fullGraphMembershipUnchanged = before.length === after.length && before.every((file, i) => file.path === after[i].path);
  report.fullGraphSourcesUnchanged = report.compilerGraphSha256Before === report.compilerGraphSha256After;
  if (!report.fullGraphMembershipUnchanged) report.harnessErrors.push('COMPILER_GRAPH_MEMBERSHIP_CHANGED');
  if (!report.fullGraphSourcesUnchanged) report.harnessErrors.push('COMPILER_GRAPH_SOURCE_CHANGED');
  for (const item of after) if (!item.compiledTextMatchesDisk) report.harnessErrors.push('COMPILED_CONTENT_DIFFERS_FROM_DISK_AFTER:' + item.path);
  report.configFilesBefore = [...configReadPins.values()].sort((a, b) => a.path.localeCompare(b.path));
  report.configFilesAfter = report.configFilesBefore.map(pin => diskPin(pin.path));
  report.configSourcesUnchanged = report.configFilesBefore.every((pin, i) => pin.sha256 === report.configFilesAfter[i].sha256);
  if (!report.configSourcesUnchanged) report.harnessErrors.push('CONFIG_SOURCE_CHANGED');
  report.seedManifestSha256After = diskPin(MANIFEST).sha256;
  if (report.seedManifestSha256After !== expectedManifestSha) report.harnessErrors.push('SEED_MANIFEST_CHANGED_DURING_CHECK');
  report.sourceHeadAfter = git('rev-parse', 'HEAD');
  if (report.sourceHeadAfter !== expectedHead) report.harnessErrors.push('SOURCE_HEAD_CHANGED');
  report.canonicalImportResolutionVerified = true;
  report.status = report.diagnostics.length === 0 && report.harnessErrors.length === 0
    ? 'PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM' : 'FAIL_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM';
  phase('full_graph_snapshot_after_finished', { fullProgramFileCount: after.length, unchanged: report.fullGraphSourcesUnchanged });
} catch (error) {
  report.harnessErrors.push(error instanceof Error ? error.stack ?? error.message : String(error));
  phase('harness_error', { message: String(error) });
} finally {
  report.elapsedMs = Date.now() - started;
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  phase('report_written', { status: report.status, diagnostics: report.diagnostics.length, harnessErrors: report.harnessErrors.length });
  fs.closeSync(phaseFd);
}
console.log(JSON.stringify({ status: report.status, fullProgramFileCount: report.fullProgramFileCount ?? null,
  diagnosticCount: report.diagnostics.length, harnessErrors: report.harnessErrors.length,
  allSeedFilesActuallyCompiled: report.allSeedFilesActuallyCompiled ?? false, virtualCandidateFiles: 0 }));
if (report.status !== 'PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM') process.exitCode = 1;