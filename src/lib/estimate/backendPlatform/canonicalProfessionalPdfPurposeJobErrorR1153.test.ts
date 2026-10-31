import {normalizeCanonicalProfessionalPdfPurposeJobErrorV1} from './canonicalEstimateArtifactContract';
test('exact new SQL purpose conflict becomes a safe409 and never a success or public database code',()=>{
 const source=Object.assign(new Error('ARTIFACT_PURPOSE_CONFLICT'),{code:'55000'});
 const result=normalizeCanonicalProfessionalPdfPurposeJobErrorV1(source) as Error&{code:string;httpStatus:number;retryable:boolean};
 expect(result).not.toBe(source);expect(result).toMatchObject({code:'ARTIFACT_PURPOSE_CONFLICT',httpStatus:409,retryable:false});
 expect(result.message).not.toContain('ARTIFACT_');expect(result.message).not.toContain('55000');
 expect(source.code).toBe('55000');expect(source.message).toBe('ARTIFACT_PURPOSE_CONFLICT');
});
test.each([
 ['55000','ESTIMATE_CONTENT_R3_RUNTIME_PASSPORT_BLOCKED'],['55000','PROCUREMENT_SUPPLY_QUANTUM_BLOCKED'],
 ['42501','ARTIFACT_PURPOSE_CONFLICT'],['23505','ARTIFACT_PURPOSE_CONFLICT'],
 ['55000','another artifact renderer is already building'],
])('does not remap or relax %s / %s',(code,message)=>{
 const source=Object.assign(new Error(message),{code});expect(normalizeCanonicalProfessionalPdfPurposeJobErrorV1(source)).toBe(source);
});