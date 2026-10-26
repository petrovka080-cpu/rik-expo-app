import {createHash} from 'node:crypto';
import {classifyProfessionalNormSourceAdmission as clientAdmission} from '../../src/lib/estimate/professionalNormSourceClientAdmission';
import {classifyProfessionalNormSourceAdmission as serverAdmission} from '../../src/lib/estimate/professionalNormSourceAdmission';
import {attachCanonicalPhysicalNormEvidenceV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection';
import {readCanonicalNormSourceAdmissionEvidenceV1,canonicalNormResolutionIdentitySha256V1} from '../../src/lib/estimate/backendPlatform/canonicalNormSourceAdmissionEvidenceV1';
import {PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS} from '../../src/lib/ai/estimateTemplate10000/productionProfessionalNormPackRegistry';
import {boundNormSourceFixture} from './fixtures/canonicalNormSourceAdmissionFixture';

describe('backend-owned norm source admission',()=>{
 test('preserves the existing server classifier decision through exact JSON transport without changing saved quantities',()=>{
  const {input,context,source}=boundNormSourceFixture(),before=JSON.stringify({input,context});
  const transported=JSON.parse(JSON.stringify(input));
  expect(clientAdmission(transported)).toEqual(serverAdmission(input));
  expect(clientAdmission(transported)).toEqual({admitted:true,route:'CANONICAL_PHYSICAL_APPLICABILITY',reason:'ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY'});
  expect(readCanonicalNormSourceAdmissionEvidenceV1({...context,row:{...context.row,normSourceAdmissionEvidenceV1:source.canonicalNormSourceAdmissionEvidenceV1}})).toEqual(source.canonicalNormSourceAdmissionEvidenceV1);
  expect(JSON.stringify({input,context})).toBe(before);
 });
 test('holds a bare legacy APPLIED claim until a bound server read while preserving the submitted source record',()=>{
  const {input,source}=boundNormSourceFixture();const {canonicalNormSourceAdmissionEvidenceV1:_evidence,...legacy}=source;
  const before=JSON.stringify(legacy);expect(clientAdmission({...input,sourceParameters:legacy})).toMatchObject({admitted:false,reason:'BACKEND_SOURCE_ADMISSION_REQUIRED'});
  expect(JSON.stringify(legacy)).toBe(before);
 });
 test.each(['canonicalBackendRevisionId','canonicalBackendReleaseId','canonicalBackendCatalogId','canonicalBackendRevisionChecksumSha256','rowCode','rowSha256'] as const)(
  'rejects substituted saved %s without re-running a client classifier',key=>{
   const {input,source}=boundNormSourceFixture();expect(clientAdmission({...input,sourceParameters:{...source,[key]:'SUBSTITUTED'}})).toEqual({admitted:false,route:'NONE',reason:'BACKEND_SOURCE_ADMISSION_IDENTITY_MISMATCH'});
  });
 test.each(['normSourceId','normId','normVersion'] as const)('rejects substituted norm identity %s',key=>{
  const {input}=boundNormSourceFixture();expect(clientAdmission({...input,[key]:'SUBSTITUTED'}).admitted).toBe(false);
 });
 test('binds the exact resolution text including differences below six decimal places',()=>{
  const {input,source}=boundNormSourceFixture();const resolution={...source.professionalPhysicalNormApplicabilityV1,extraTestNumber:1.00000001};
  expect(clientAdmission({...input,sourceParameters:{...source,professionalPhysicalNormApplicabilityV1:resolution}}).admitted).toBe(false);
  expect(canonicalNormResolutionIdentitySha256V1(resolution)).toBe(createHash('sha256').update(JSON.stringify(resolution)).digest('hex'));
  expect(canonicalNormResolutionIdentitySha256V1(resolution)).not.toBe(canonicalNormResolutionIdentitySha256V1({...resolution,extraTestNumber:1.00000002}));
 });
 test('rejects malformed decision coherence and never falls back to a static success',()=>{
  const {input,source}=boundNormSourceFixture();const evidence=source.canonicalNormSourceAdmissionEvidenceV1;
  expect(clientAdmission({...input,sourceParameters:{...source,canonicalNormSourceAdmissionEvidenceV1:{...evidence,decision:{admitted:true,route:'NONE',reason:'PHYSICAL_APPLICABILITY_NOT_APPLIED'}}}}).admitted).toBe(false);
 });
 test('ignores caller-provided admission when the existing rows attachment computes server evidence',()=>{
  const {context,source}=boundNormSourceFixture();const attached=attachCanonicalPhysicalNormEvidenceV1(context.revision,{...context.row,calculationTrace:{...context.row.calculationTrace,resourceGraph:{professionalPhysicalNormBindingV1:{}}},normSourceAdmissionEvidenceV1:source.canonicalNormSourceAdmissionEvidenceV1});
  expect(attached.physicalNormEvidenceV1?.resolution).toBeNull();
  expect(attached.normSourceAdmissionEvidenceV1?.decision).toEqual({admitted:false,route:'NONE',reason:'PHYSICAL_APPLICABILITY_NOT_APPLIED'});
 });
 test('preserves the actual empty static registry and the existing generated-source rejection',()=>{
  expect(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS).toEqual([]);
  const input={normSourceId:'src_professional_norm_pack_catalog_TEST_ONLY_GENERATED',normId:'TEST_ONLY',normVersion:'v1'};
  expect(clientAdmission(input)).toEqual(serverAdmission(input));expect(clientAdmission(input).admitted).toBe(false);
 });
 test('loads the real client readiness path while the server classifier import is forbidden',()=>{
  const server='../../src/lib/estimate/professionalNormSourceAdmission';
  try{jest.isolateModules(()=>{
   jest.doMock(server,()=>{throw Error('FORBIDDEN_CLIENT_SERVER_SOURCE_CLASSIFIER');});
   expect(()=>require(server)).toThrow('FORBIDDEN_CLIENT_SERVER_SOURCE_CLASSIFIER');
   const readiness=require('../../src/lib/consumerRequests/consumerEstimateNormSourceReadiness');
   expect(readiness.consumerEstimateNormSourceAdmissionReport(null).status).toBe('SOURCE_BACKED');
  });}finally{jest.dontMock(server);}
 });
});
