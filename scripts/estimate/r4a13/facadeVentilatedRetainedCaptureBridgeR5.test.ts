import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {facadeVentilatedThermowoodRetainedOptionsR5} from './prepareFacadeVentilatedThermowoodR5';
import {facadeVentilatedThermowoodCapturedParentR5} from '../../../src/lib/estimate/v4/masterFacadeVentilatedThermowoodR5';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,
  type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';

const root=resolve(__dirname,'../../..');
const relative='data/estimate-benchmarks/fixtures/facade-ventilated-current-parent-source-r5.json';
const exactSha='cb1f977624b248f370f8e89266b6a8cc6b01ace44421e56839933a4bdc3b5eb3';

describe('facade typed immutable retained capture bridge R5',()=>{
  test('hash-pinned source remains whole and enters the existing retained opt-in',()=>{
    const bytes=readFileSync(resolve(root,relative));assert.equal(createHash('sha256').update(bytes).digest('hex'),exactSha);
    const result=facadeVentilatedThermowoodRetainedOptionsR5(root),original=facadeVentilatedThermowoodCapturedParentR5();
    assert.deepEqual(result.capturedParent,original.capture);
    assert.equal(result.capturedParentSha256,masterRetainedParentCaptureSha256R1(result.capturedParent));
    const input:MasterRetainedBindingGuardInputR1={config:{stopCode:'TEST_FACADE_TYPED_CAPTURE_R5',
      catalogId:'canonical-work:expanded:ventilated_facade',parentReleaseId:result.capturedParent.definition.release_id,
      binding:{retainParentBindings:result}},
      newSource:{id:'10000000-0000-5000-8000-000000000550',source_key:'gox_facade_ventilated_thermowood_existing_owner_r5',
        title_ru:'TEST_ONLY_SOURCE_PACKET_BRIDGE_NOT_A_NEW_NORM',authority:'TEST_ONLY',official_url:null,artifact_sha256:'a'.repeat(64),
        effective_from:null,effective_to:null,metadata:{testOnly:true}},
      newLocators:[{id:'10000000-0000-5000-8000-000000000551',source_id:'10000000-0000-5000-8000-000000000550',
        locator_key:'TEST_ONLY_CAPTURE_BRIDGE',locator:{testOnly:true},excerpt_sha256:'b'.repeat(64)}]};
    assert.deepEqual(masterRetainParentBindingsOptInR1(input),result);
    assert.equal(createHash('sha256').update(readFileSync(resolve(root,relative))).digest('hex'),exactSha);
    assert.deepEqual(result.capturedParent,original.capture);
  },30000);

  test('even a JSON-preserving whitespace change in an alternate source root is rejected',()=>{
    const temporaryBase=process.env.FACADE_CAPTURE_BRIDGE_TMP_DIR;
    if(!temporaryBase)throw Error('PRIVATE_CAPTURE_BRIDGE_TEMP_ROOT_REQUIRED');
    mkdirSync(temporaryBase,{recursive:true});
    const alternate=mkdtempSync(resolve(temporaryBase,'case-')),target=resolve(alternate,relative);
    mkdirSync(dirname(target),{recursive:true});writeFileSync(target,Buffer.concat([readFileSync(resolve(root,relative)),Buffer.from(' ')]));
    assert.throws(()=>facadeVentilatedThermowoodRetainedOptionsR5(alternate),/VENTILATED_R5_CAPTURE_SOURCE_SHA256/);
    assert.equal(createHash('sha256').update(readFileSync(resolve(root,relative))).digest('hex'),exactSha);
  },30000);
});
