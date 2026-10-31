import fixture from '../../../../data/estimate-benchmarks/fixtures/monolithic-remaining-root-machine-admissions-r1.json';
import {assertCanonicalMachineHourDefinitionV1 as definition,canonicalMachineHourPriceRequirementV1 as requirement,canonicalManualMachineHourPriceCoverageV1 as manual,parseCanonicalMachineHourPriceCoverageV1 as parse,resolveCanonicalMachineHourPriceCoverageV1 as resolve} from './canonicalMachineHourPriceCoverageV1';
const metadata=(c:typeof fixture.owners[number])=>({normativeResourceCode:c.code,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',source_artifact_sha256:fixture.sourceSha256,exact_column:c.column});
it('admits42 source owners and leaves unproved profiles and consumed physical resources outside the paid registry',()=>{
 expect(fixture.owners).toHaveLength(42);expect(new Set(fixture.owners.map(c=>c.rowId)).size).toBe(42);
 for(const profile of ['column-107-01','beam-109-02','stair-111-02'])for(const key of ['operators','vibrator-consumed','physical-kit','initial-form-kit'])expect(requirement('monolithic-remaining:krer06:r1:'+profile+':'+key,'machine_hour')).toBeNull();
 for(const key of ['vibrator-own','tower-crane8t-hired'])expect(requirement('monolithic-remaining:krer06:r1:beam-109-01:'+key,'machine_hour')).toBeNull();
});
it.each(fixture.owners)('binds exact catalog,source,column,unit and code for $rowId',c=>{
 const input={catalogId:c.catalog,rowId:c.rowId,unitId:c.unitId,sourceMetadata:metadata(c)};
 expect(definition(input)).toEqual({resourceCode:c.code,operator:c.operator,operationScope:'FULL_SOURCE_OPERATION'});
 expect(definition({...input,catalogId:fixture.owners.find(x=>x.catalog!==c.catalog)!.catalog})).toBeNull();
 expect(requirement(c.rowId,'man_hour')).toBeNull();
 for(const patch of [{source_artifact_sha256:'0'.repeat(64)},{exact_column:'06-01-109-01'},{normativeResourceCode:'99-9999'},{machinePriceOperationScope:'BARE_RENT'},{machinePriceCoverageRequired:'BARE_RENT'}])expect(()=>definition({...input,sourceMetadata:{...metadata(c),...patch}})).toThrow('Machine-hour definition identity is not admitted');
});
it.each(fixture.owners)('retains full-operation commercial evidence without extra operator payment for $rowId',c=>{
 const evidence=manual({rowId:c.rowId,unitPrice:'77',currencyCode:'KGS'}),input={catalogId:c.catalog,rowId:c.rowId,unitId:c.unitId,unitPrice:'77',currencyCode:'KGS',manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence};
 expect(resolve(input)?.status).toBe('CONFIRMED_MANUAL');
 for(const patch of [{evidence:null},{unitPrice:'78'},{currencyCode:'USD'},{manualProvenanceReason:'different quote'}])expect(resolve({...input,...patch})?.status).toBe('UNCONFIRMED');
 for(const patch of [{billingBasis:'SHIFT'},{minimumBillableHours:'8'},{fixedFees:'1'}])expect(parse({...evidence,...patch})).toBeNull();
 const source={kind:'SNAPSHOT',snapshotId:'00000000-0000-4000-8000-000000000037',priceKey:'whole-operation-hour'},snapshot={...input,manual:false,evidence:{...evidence,source},snapshotId:source.snapshotId,priceKey:source.priceKey};
 expect(resolve(snapshot)?.status).toBe('CONFIRMED_SOURCE');expect(resolve({...snapshot,priceKey:'bare-machine-rent'})?.status).toBe('UNCONFIRMED');
});
