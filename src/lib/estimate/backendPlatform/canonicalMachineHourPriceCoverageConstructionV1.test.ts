import admissions from '../../../../data/estimate-benchmarks/fixtures/master33-machine-owner-admissions-r1.json';
import {
 assertCanonicalMachineHourDefinitionV1,
 canonicalMachineHourPriceRequirementV1,
 canonicalManualMachineHourPriceCoverageV1,
 parseCanonicalMachineHourPriceCoverageV1,
 resolveCanonicalMachineHourPriceCoverageV1,
} from './canonicalMachineHourPriceCoverageV1';

const rows=admissions.rows;
const metadata=(r:typeof rows[number])=>({
 normativeResourceCode:r.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',
 machinePriceOperationScope:r.operationScope,source_artifact_sha256:r.sourceArtifactSha256,
 [r.columnMetadataKey]:r.normId,
});

it('contains only distinct, bounded machine operation owners with independent source identities',()=>{
 expect(new Set(rows.map(r=>r.rowId)).size).toBe(rows.length);
 expect(rows.every(r=>r.catalogIds.length===2&&r.operationScope==='FULL_SOURCE_OPERATION')).toBe(true);
 expect(rows.filter(r=>r.rowId.startsWith('masonry:wall:')).length).toBe(36);
 expect(rows.filter(r=>r.rowId.startsWith('master212:concrete-preparation:')).length).toBe(3);
});

it.each(rows)('admits the exact source column, unit and catalog owners for $rowId',r=>{
 for(const catalogId of r.catalogIds)expect(assertCanonicalMachineHourDefinitionV1({
  catalogId,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:metadata(r),
 })).toEqual({resourceCode:r.resourceCode,operator:r.operator,operationScope:r.operationScope});
 expect(canonicalMachineHourPriceRequirementV1(r.rowId,'man_hour')).toBeNull();
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:'canonical-work:base:masonry_interior_brick_wall_lay_wet_zone',
  rowId:r.rowId,unitId:'machine_hour',sourceMetadata:metadata(r)})).toBeNull();
 expect(canonicalMachineHourPriceRequirementV1(r.informationalRowId,'machine_hour')).toBeNull();
});

it.each(rows)('rejects altered source, column, resource and operation scope for $rowId',r=>{
 const correct=metadata(r),catalogId=r.catalogIds[0]!;
 for(const changed of [
  {...correct,source_artifact_sha256:'0'.repeat(64)},
  {...correct,[r.columnMetadataKey]:'06-01-001-09'},
  {...correct,normativeResourceCode:'99-9999'},
  {...correct,machinePriceOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'},
 ])expect(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:changed})).toThrow('Machine-hour definition identity is not admitted');
});

it.each(rows)('keeps manual and snapshot full-hour evidence exact for $rowId',r=>{
 const evidence=canonicalManualMachineHourPriceCoverageV1({rowId:r.rowId,unitPrice:'77',currencyCode:'KGS'});
 const common={catalogId:r.catalogIds[0]!,rowId:r.rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77'};
 expect(resolveCanonicalMachineHourPriceCoverageV1({...common,evidence,manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit'})?.status).toBe('CONFIRMED_MANUAL');
 expect(resolveCanonicalMachineHourPriceCoverageV1({...common,evidence,unitPrice:'78',manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit'})?.status).toBe('UNCONFIRMED');
 expect(parseCanonicalMachineHourPriceCoverageV1({...evidence,fixedFees:'1'})).toBeNull();
 expect(parseCanonicalMachineHourPriceCoverageV1({...evidence,minimumBillableHours:'8'})).toBeNull();
 const snapshotId='00000000-0000-4000-8000-000000000033',priceKey='source-operation-hour';
 const snapshot={...evidence,source:{kind:'SNAPSHOT',snapshotId,priceKey}};
 expect(resolveCanonicalMachineHourPriceCoverageV1({...common,evidence:snapshot,manual:false,snapshotId,priceKey})?.status).toBe('CONFIRMED_SOURCE');
 expect(resolveCanonicalMachineHourPriceCoverageV1({...common,evidence:snapshot,manual:false,snapshotId,priceKey:'another-scope'})?.status).toBe('UNCONFIRMED');
});

it('does not turn vibrator or perforator operation time into an additional operator norm',()=>{
 const withoutAdditional=rows.filter(r=>r.resourceCode==='11-0180'||r.resourceCode==='33-0462');
 expect(withoutAdditional.length).toBe(9);
 for(const r of withoutAdditional)expect(canonicalMachineHourPriceRequirementV1(r.rowId,'machine_hour')?.operator).toBe('NO_ADDITIONAL_OPERATOR_NORM');
});
