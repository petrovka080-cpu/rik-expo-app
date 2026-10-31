import oracle from '../../../../data/estimate-benchmarks/fixtures/master36-roof-machine-owner-admission-r1.json';
import {assertCanonicalMachineHourDefinitionV1 as definition,canonicalMachineHourPriceRequirementV1 as requirement,canonicalManualMachineHourPriceCoverageV1 as manual,resolveCanonicalMachineHourPriceCoverageV1 as resolve} from './canonicalMachineHourPriceCoverageV1';

it('retains31 independently reviewed paid owners on37 exact catalog bindings; source kits and held nodes have no price owner',()=>{
 expect(oracle.entries).toHaveLength(31);expect(new Set(oracle.entries.map(e=>e.rowId)).size).toBe(31);expect(oracle.entries.reduce((n,e)=>n+e.catalogIds.length,0)).toBe(37);
 for(const row of ['master212:roof:r1:mastic_junction:airless','master212:roof:r1:mastic_valley:airless','master212:roof:r1:mastic_field:machinists','roof:physical:gas-kit:handle','roof:physical:crew'])expect(requirement(row,'machine_hour')).toBeNull();
});

it.each(oracle.entries)('requires exact source, column, machine, unit and admitted catalog for $rowId',e=>{
 const metadata={normativeResourceCode:e.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',source_artifact_sha256:e.sourceArtifactSha256,[e.columnMetadataKey]:e.exactColumn};
 for(const catalogId of e.catalogIds){const input={catalogId,rowId:e.rowId,unitId:'machine_hour',sourceMetadata:metadata};expect(definition(input)).toEqual({resourceCode:e.resourceCode,operator:e.operator,operationScope:'FULL_SOURCE_OPERATION'});
  for(const patch of [{source_artifact_sha256:'0'.repeat(64)},{[e.columnMetadataKey]:'12-01-033-02'},{normativeResourceCode:'99-9999'},{machinePriceOperationScope:'BARE_RENT'},{machinePriceCoverageRequired:'BARE_RENT'}])expect(()=>definition({...input,sourceMetadata:{...metadata,...patch}})).toThrow('Machine-hour definition identity is not admitted');}
 expect(definition({catalogId:'canonical-work:base:masonry_interior_brick_wall_lay_standard',rowId:e.rowId,unitId:'machine_hour',sourceMetadata:metadata})).toBeNull();expect(requirement(e.rowId,'piece')).toBeNull();
});

it('does not convert source hours or INFO into bare-rental, shift or mismatched commercial evidence',()=>{
 for(const e of oracle.entries){const evidence=manual({rowId:e.rowId,unitPrice:'77',currencyCode:'KGS'});const input={catalogId:e.catalogIds[0]!,rowId:e.rowId,unitId:'machine_hour',unitPrice:'77',currencyCode:'KGS',manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence};expect(resolve(input)?.status).toBe('CONFIRMED_MANUAL');
  for(const patch of [{evidence:null},{unitPrice:'78'},{currencyCode:'USD'},{manualProvenanceReason:'different quote'},{evidence:{...evidence,billingBasis:'SHIFT'}},{evidence:{...evidence,minimumBillableHours:'8'}},{evidence:{...evidence,fixedFees:'1'}}])expect(resolve({...input,...patch})?.status).toBe('UNCONFIRMED');}
});
