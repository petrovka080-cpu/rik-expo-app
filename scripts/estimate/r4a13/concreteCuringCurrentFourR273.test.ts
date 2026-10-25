import assert from 'node:assert/strict';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {concreteCuringRollerWholeMasterConfigR108, concreteCuringRollerCurrentCaptureR108, verifyConcreteCuringRollerRetainedConfigR108}
  from './prepareConcreteCuringRollerWholePostR108';
import {validateIndependentCompletenessMapReferences}
  from './prepareMasterSingleDefinitionSuccessorR1';
import {concreteCuringRollerWholePostDefinitionR108, curingRollerPostRowR108 as row}
  from '../../../src/lib/estimate/v4/concreteCuringRollerWholePostR108';
import source from '../../../data/estimate-benchmarks/source-packs/concrete-curing-roller-whole-post-r108.json';
import witness from '../../../data/estimate-benchmarks/fixtures/concrete-curing-roller-independent-r108.json';
import consumers from '../../../data/estimate-benchmarks/source-packs/concrete-curing-five-consumers-route-r124.json';
import {canonicalEstimateOperationReference, canonicalEstimateOperationReferences}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {parseCanonicalPublicResourcePresentationV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';

test('one current exact curing consumer retains its native scope through the ordinary Config and current shared owners', async () => {
  const sourceRoot = resolve(__dirname, '../../..');
  const rawRoot = process.env.CONCRETE_CURING_ROLLER_RAW_DIR;
  assert(rawRoot, 'ROOT_GOVERNED_RAW_EVIDENCE_PATH_REQUIRED');
  mkdirSync(rawRoot, {recursive: true});
  let totalEntries = 0;
  const accepted: unknown[] = [];
  assert.equal(consumers.entries.length, 5);
  const requested=process.env.CONCRETE_CURING_R273_CONSUMER;
  assert(requested && ['foundation-slab','strip-foundation','beam','column'].includes(requested),'CURRENT_FOUR_ONLY_WALL_SIZE_HOLD');
  const mode=process.env.CONCRETE_CURING_R273_MODE;assert(mode==='CONFIG_ONLY'||mode==='FINITE_CORE');
  const selected=consumers.entries.filter(target=>target.key===requested);assert.equal(selected.length,1);
  for (const target of selected) {
  const save = (name: string, value: unknown) => {
    const path = join(rawRoot, target.key + '-' + name + '.json'); assert(!existsSync(path), 'PRESERVE_PREVIOUS_ACTUAL_RESULT');
    writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
  };
  const packet = concreteCuringRollerCurrentCaptureR108(sourceRoot, target.catalogId);
  let entries = 0, results = 0, rejects = 0;
  const config = concreteCuringRollerWholeMasterConfigR108({sourceRoot,
    releaseId: packet.membership.release_id, searchReleaseId: '9b042edf-ca06-50f6-969a-556e6d14547a',
    outputRoot: rawRoot,
    onCoreEntry: phase => {entries++; totalEntries++; save(String(entries).padStart(2, '0') + '-begin-' + phase, {entries, totalEntries, phase, catalogId: target.catalogId});},
    onCoreResult: (phase, result) => {
      save(String(entries).padStart(2, '0') + '-result-' + phase, result);
      if (phase.startsWith('reject-')) rejects++; else results++;
    }}, target.catalogId);
  assert.equal(config.catalogId, target.catalogId);
  assert.equal(config.binding.retainParentBindings?.capturedParentSha256, target.capturedParentSha256);
  assert.deepEqual(config.acceptanceInput, packet.capture.baseline.input_values);
  assert.deepEqual(config.runtimeProfileInput, {});
  assert.equal(config.projectSourcePackagePath, undefined, 'OBJECT_READBACK_CANNOT_REPLACE_COMPOSITE_NORM_BINDING');
  const child = concreteCuringRollerWholePostDefinitionR108();
  assert.equal(child.resources.length, 21);
  assert.equal(child.resources.filter(r => r.row_id.startsWith(row('stock:'))).length, 5);
  assert.equal(source.components.reduce((n, c) => n + c.quantityPerOriginalCase, 0), 6);
  assert(child.parameters.every(p => p.default_value == null));
  const brush = child.resources.find(r => r.row_id === row('stock:trim-brush')); assert(brush && brush.source_metadata);
  assert.equal(brush.source_metadata.brushApplicationNotAdmitted, true);
  for (const resource of child.resources) {
    const operations = canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1);
    for (const operation of operations) {
      const index = source.operations.findIndex(item => operation.operationId === row('operation:' + item.key));
      assert(index >= 0); assert.equal(operation.processOrdinal, index + 1, 'SAME_SOURCE_OPERATION_SAME_ORDINAL');
    }
    if (resource.category === 'material' && !resource.row_id.startsWith(row('need:'))) {
      assert(operations.some(item => item.operationId === row('operation:mixing_and_transfer')));
      assert(operations.some(item => item.operationId === row('operation:roller_application')));
      const presentation = parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1);
      assert(presentation); assert(!/Sika|Antisol|Purdy/i.test(presentation.nameRu));
    }
  }
  const complete = config.passport.independentCompletenessMap; assert(complete);
  for (const missing of [row('stock:roller-cover'), row('case-period-provision'), row('need:soap_water')]) {
    const failures = validateIndependentCompletenessMapReferences({completenessMap: complete,
      formulaDefinitions: config.formulaDefinitions, resourceDefinitions: config.resourceDefinitions.filter(r => r.row_id !== missing)});
    assert(failures.length > 0, 'WHOLE_MAP_DETECTS_MISSING_PHYSICAL_CONSUMER:' + missing);
  }
  const cover = child.resources.find(r => r.row_id === row('stock:roller-cover')); assert(cover);
  const coverOperation = canonicalEstimateOperationReference(cover.resource_graph.operationCompositionV1); assert(coverOperation);
  const brokenOperation = {...coverOperation, additionalOperations: coverOperation.additionalOperations?.filter(
    item => item.operationId !== row('operation:roller_application'))};
  const brokenLinks = config.resourceDefinitions.map(r => r.row_id !== cover.row_id ? r : ({...r,
    resource_graph: {...r.resource_graph, operationCompositionV1: brokenOperation}}));
  assert(validateIndependentCompletenessMapReferences({completenessMap: complete,
    formulaDefinitions: config.formulaDefinitions, resourceDefinitions: brokenLinks}).length > 0,
  'INDEPENDENT_MAP_DETECTS_MISSING_CONSUMING_OPERATION_LINK');
  save('PURE_BEFORE_CORE', {status: 'PASS_ORDINARY_CONFIG_AND_INDEPENDENT_SOURCE_ROSTER',
    coreEntries: entries, oldRowsPreserved: packet.capture.resources.length, newRows: child.resources.length,
    protectedNeeds: witness.protectedNeeds, operations: witness.operations, FULL: false});
  verifyConcreteCuringRollerRetainedConfigR108(config,path=>resolve(sourceRoot,path));
  if(mode==='CONFIG_ONLY'){
    assert.equal(entries,0);accepted.push({catalogId:target.catalogId,capturedParentSha256:target.capturedParentSha256,ordinaryConfig:true,coreEntries:0});continue;
  }
  const result = await config.verifyCore();
  assert.equal(entries, witness.expectedCoreEntries); assert.equal(results, witness.expectedResults);
  assert.equal(rejects, witness.expectedRejects);
  save('FINAL_FINITE_ACCEPTANCE', {status: 'PASS_FINITE_NORMAL_CONFIG_AND_REAL_CORE_NOT_WHOLE_CARE_ACCEPTANCE',
    entries, results, expectedRejects: rejects, result, existingWholeCareNeedClosures: 0,
    actualApprovedProjectObjects: 0, workerReadbackIntegration: 'UNRUN', DBwrites: 0, publisherRuns: 0,
    fullTechnicalAcceptance: false, newFULL: 0});
  accepted.push({catalogId: target.catalogId, capturedParentSha256: target.capturedParentSha256,
    oldShape: target.expectedParentShape, oldBindings: target.expectedParentBindings, entries, results, rejects});
  }
  assert.equal(totalEntries, mode==='CONFIG_ONLY'?0:8);
  const finalPath = join(rawRoot, mode==='CONFIG_ONLY'?'FINAL_ORDINARY_CONFIG_R273.json':'FINAL_FINITE_CORE_R273.json');
  assert(!existsSync(finalPath));
  writeFileSync(finalPath, JSON.stringify({status: mode==='CONFIG_ONLY'?'PASS_CURRENT_ORDINARY_CONFIG_NO_CORE':'PASS_CURRENT_FINITE_CORE_NOT_WHOLE_FAMILY_OR_DELIVERY',
    accepted, totalEntries, expectedResults: mode==='CONFIG_ONLY'?0:6, expectedRejects: mode==='CONFIG_ONLY'?0:2, actualApprovedProjectObjects: 0,
    oldNeedClosures: 0, fullTechnicalAcceptance: false, newFULL: 0, DBwrites: 0}, null, 2) + '\n', 'utf8');
}, 115000);
