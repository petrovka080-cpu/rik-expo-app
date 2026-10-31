import fixture from '../../../../data/estimate-benchmarks/source-packs/roof-single539-cost-boundary-r24.json';
import {assertCanonicalMachineHourDefinitionV1 as definition,canonicalMachineHourPriceRequirementV1 as requirement,
 canonicalManualMachineHourPriceCoverageV1 as manual,resolveCanonicalMachineHourPriceCoverageV1 as resolve} from './canonicalMachineHourPriceCoverageV1';

// Synthetic77KGS is a contract-test value, never a quote or an actual object fact.
it('bounds113whole539 machine price admissions to exact row/catalog/code/artifact/columns without operator double-pay or stock pieces',()=>{
 expect(fixture.machines).toHaveLength(113);expect(fixture.informationalOperatorRowIds).toHaveLength(29);
 for(const e of fixture.machines){const metadata={normativeResourceCode:e.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',
  machinePriceOperationScope:'FULL_SOURCE_OPERATION',source_artifact_sha256:e.sourceArtifactSha256,machinePriceExactSourceColumnsR24:e.exactPriceScopeColumn};
  const input={catalogId:e.catalogId,rowId:e.rowId,unitId:'machine_hour',sourceMetadata:metadata};
  expect(definition(input)).toEqual({resourceCode:e.resourceCode,operator:e.operator,operationScope:'FULL_SOURCE_OPERATION'});
  for(const patch of [{normativeResourceCode:'99-9999'},{source_artifact_sha256:'0'.repeat(64)},{machinePriceExactSourceColumnsR24:'12-01-002-09'},
   {machinePriceOperationScope:'BARE_RENT'},{machinePriceCoverageRequired:'BARE_RENT'}])expect(()=>definition({...input,sourceMetadata:{...metadata,...patch}})).toThrow('Machine-hour definition identity is not admitted');
  if(e.exactColumns.length>1)expect(()=>definition({...input,sourceMetadata:{...metadata,machinePriceExactSourceColumnsR24:e.exactColumns[0]}})).toThrow('Machine-hour definition identity is not admitted');
  expect(definition({...input,catalogId:'canonical-work:base:roofing_interior_flat_roof_install_wet_zone'})).toBeNull();
  expect(requirement(e.rowId,'piece')).toBeNull();
 }
 for(const row of fixture.informationalOperatorRowIds)expect(requirement(row,'man_hour')).toBeNull();
 expect(fixture.rows.every(r=>r.procurementEligible===false)).toBe(true);
});

it('uses the existing manual full-source price evidence contract; no bare rent/shift/fixedfee or mismatched price is accepted',()=>{
 for(const e of fixture.machines){const evidence=manual({rowId:e.rowId,unitPrice:'77',currencyCode:'KGS'});
  const input={catalogId:e.catalogId,rowId:e.rowId,unitId:'machine_hour',unitPrice:'77',currencyCode:'KGS',manual:true,
   manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence};
  expect(resolve(input)?.status).toBe('CONFIRMED_MANUAL');
  for(const patch of [{evidence:null},{unitPrice:'78'},{currencyCode:'USD'},{manualProvenanceReason:'different quote'},
   {evidence:{...evidence,billingBasis:'SHIFT'}},{evidence:{...evidence,minimumBillableHours:'8'}},{evidence:{...evidence,fixedFees:'1'}}])expect(resolve({...input,...patch})?.status).toBe('UNCONFIRMED');
 }
});
