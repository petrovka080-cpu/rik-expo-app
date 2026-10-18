import {
  assertCanonicalMachineHourDefinitionV1,
  canonicalManualMachineHourPriceCoverageV1,
  canonicalMachineHourRowPriceDecisionV1,
  resolveCanonicalMachineHourPriceCoverageV1,
} from './canonicalMachineHourPriceCoverageV1';

const catalogId='canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02';
const prefix='road-upper-base:krer27-04-005-02:equipment:';
const owners=[['loader','03-0020'],['grader','12-0023'],['roller8t','12-0272'],
  ['roller13t','12-0273'],['waterBowser','12-0400'],['spreader','12-0540']] as const;
const input=(rowId=prefix+'loader')=>({catalogId,rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',
  manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence:undefined as unknown});
const quote=(rowId=prefix+'loader')=>canonicalManualMachineHourPriceCoverageV1({rowId,unitPrice:'77',currencyCode:'KGS'});

describe('road owners cannot inherit the legacy roof catalog admission',()=>{
  it.each(owners)('rejects foreign roof definition, manual and snapshot scope for %s',(role,resourceCode)=>{
    const rowId=prefix+role,snapshotId='55555555-5555-5555-8555-555555555555',priceKey='qa-road-exact-owner';
    for(const foreignCatalog of ['canonical-work:base:roofing_interior_flat_roof_install_technical_room',
      'canonical-work:base:roofing_interior_flat_roof_install_wet_zone']){
      expect(assertCanonicalMachineHourDefinitionV1({catalogId:foreignCatalog,rowId,unitId:'machine_hour',
        sourceMetadata:{normativeResourceCode:resourceCode,machinePriceCoverageRequired:'FULL_OPERATED_MACHINE_HOUR'}})).toBeNull();
      expect(resolveCanonicalMachineHourPriceCoverageV1({...input(rowId),catalogId:foreignCatalog,evidence:quote(rowId)})).toBeNull();
      expect(resolveCanonicalMachineHourPriceCoverageV1({...input(rowId),catalogId:foreignCatalog,manual:false,snapshotId,priceKey,
        evidence:{...quote(rowId),source:{kind:'SNAPSHOT',snapshotId,priceKey}}})).toBeNull();
    }
  });
});

describe('exact road upper-layer machine-hour price coverage through existing v1 contract',()=>{
  it.each(owners)('requires an explicit operated quote for %s / %s',(role,resourceCode)=>{
    const rowId=prefix+role;
    expect(assertCanonicalMachineHourDefinitionV1({catalogId,rowId,unitId:'machine_hour',
      sourceMetadata:{normativeResourceCode:resourceCode,machinePriceCoverageRequired:'FULL_OPERATED_MACHINE_HOUR'}}))
      .toMatchObject({resourceCode});
    expect(resolveCanonicalMachineHourPriceCoverageV1(input(rowId))?.status).toBe('UNCONFIRMED');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(rowId),evidence:quote(rowId)})?.status)
      .toBe('CONFIRMED_MANUAL');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(rowId),evidence:quote(rowId),currencyCode:'USD'})?.status)
      .toBe('UNCONFIRMED');
  });
  it('does not apply this quote authority to a different road method or arbitrary owner',()=>{
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(),catalogId:'canonical-work:master:road_platform_crushed_stone_150mm_hot_asphalt_50mm',evidence:quote()})).toBeNull();
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(prefix+'invented'),evidence:quote()})).toBeNull();
  });
  it('rejects a changed published resource code or absent coverage declaration',()=>{
    expect(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:prefix+'loader',unitId:'machine_hour',
      sourceMetadata:{normativeResourceCode:'12-0272',machinePriceCoverageRequired:'FULL_OPERATED_MACHINE_HOUR'}}))
      .toThrow('Machine-hour definition identity is not admitted');
    expect(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:prefix+'loader',unitId:'machine_hour',
      sourceMetadata:{normativeResourceCode:'03-0020'}})).toThrow('Machine-hour definition identity is not admitted');
  });
  it('does not transfer another machine quote or a previous manual price',()=>{
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(),evidence:quote(prefix+'grader')})?.status).toBe('UNCONFIRMED');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(),unitPrice:'78',evidence:quote()})?.status).toBe('UNCONFIRMED');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input(),manualProvenanceReason:'different_saved_override',evidence:quote()})?.status).toBe('UNCONFIRMED');
  });
  it('does not silently include a minimum shift, fixed fee or separately normed materials',()=>{
    const rowId=prefix+'waterBowser';
    for(const change of [{minimumBillableHours:'8'},{fixedFees:'100'},{separateNormedInputs:'INCLUDED_IN_RATE'}])
      expect(resolveCanonicalMachineHourPriceCoverageV1({...input(rowId),evidence:{...quote(rowId),...change}})?.status).toBe('UNCONFIRMED');
    expect(assertCanonicalMachineHourDefinitionV1({catalogId,rowId,unitId:'machine_hour',
      sourceMetadata:{normativeResourceCode:'12-0400',machinePriceCoverageRequired:'FULL_OPERATED_MACHINE_HOUR'}})?.operator).toBe('DRIVER');
  });
  it('ties snapshot coverage to the exact snapshot and price key',()=>{
    const snapshotId='11111111-1111-4111-8111-111111111111';
    const evidence={...quote(),source:{kind:'SNAPSHOT',snapshotId,priceKey:'operated-loader-hour'}};
    const value={...input(),manual:false,snapshotId,priceKey:'operated-loader-hour',evidence};
    expect(resolveCanonicalMachineHourPriceCoverageV1(value)?.status).toBe('CONFIRMED_SOURCE');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...value,priceKey:'bare-loader-rental'})?.status).toBe('UNCONFIRMED');
  });
  it('keeps historical scalar prices unconfirmed and the operator information row outside this authority',()=>{
    expect(canonicalMachineHourRowPriceDecisionV1({row_id:prefix+'loader',unit_id:'machine_hour',unit_price:'77',currency_code:'KGS',
      price_source_kind:'MANUAL',price_resolution_trace:{kind:'manual_override',provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}}},catalogId)?.status)
      .toBe('UNCONFIRMED');
    expect(resolveCanonicalMachineHourPriceCoverageV1({...input('road-upper-base:krer27-04-005-02:operators'),unitId:'man_hour'})).toBeNull();
  });
});
