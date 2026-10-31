import assert from 'node:assert/strict';
import concrete from '../../../data/estimate-benchmarks/source-packs/concrete-krer46-whole-hole-fill-r61.json';
import concreteRoute from '../../../data/estimate-benchmarks/source-packs/concrete-whole-hole-normal-route-r61.json';
import column from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-whole-r117.json';
import columnOwner from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-existing-owner-r161.json';
import steel from '../../../data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json';
import nvfOwner from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-existing-owner-independent-r214.json';
import roof from '../../../data/estimate-benchmarks/source-packs/roof-single539-cost-boundary-r24.json';
import {assertCanonicalMachineHourDefinitionV1 as definition,
  canonicalMachineHourPriceRequirementV1 as requirement,
  canonicalManualMachineHourPriceCoverageV1 as manual,
  resolveCanonicalMachineHourPriceCoverageV1 as resolve,
} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

type Fixture=Readonly<{family:string;catalogId:string;rowId:string;unitId:string;resourceCode:string;
  operator:string;artifactSha256:string;columnKey:string;exactColumn:string;
  nonMachine:Readonly<{rowId:string;unitId:string}>}>;

// Four independent existing source fixtures, never the merged admission table.
// This is only machine identity/price evidence. Synthetic77 is not a quotation.
it('cross-family machine owner dispatch keeps exact source columns, units and row-bound payment evidence',()=>{
  const hole=concrete.columns.find(value=>value.normId==='46-03-017-01');assert(hole);
  const winch=hole.nativeRows.find(value=>value.key==='winch');assert(winch);
  const holeLabour=hole.nativeRows.find(value=>value.key==='labour24');assert(holeLabour);
  const brick=column.profiles.find(value=>value.normId==='08-02-003-01');assert(brick);
  const crane=brick.rows.find(value=>value.id==='tower-crane8t-reference');assert(crane);
  assert(typeof crane.resourceCode==='string');
  const operator=brick.rows.find(value=>value.id==='operator-information');assert(operator);
  expect(operator.costTreatment).toBe('INFORMATIONAL_SCOPE');
  const truck=steel.rows.find(value=>value.key==='flatbed');assert(truck);
  const steelLabour=steel.rows.find(value=>value.key==='labour');assert(steelLabour);
  const roofCrane=roof.machines.find(value=>value.rowId==='roof:protected-flat:missing002:r24:01:tower_crane_8t');assert(roofCrane);
  assert(roofCrane.columnMetadataKey==='machinePriceExactSourceColumnsR24','EXACT_ROOF_SOURCE_COLUMN_METADATA_KEY_REQUIRED');
  const roofOperator=roof.informationalOperatorRowIds.find(value=>value==='roof:protected-flat:missing002:r24:01:included_machine_operators');assert(roofOperator);
  const fixtures:readonly Fixture[]=[
    {family:'concrete',catalogId:concreteRoute.catalogId,rowId:winch.nativeRowId,unitId:winch.unitId,
      resourceCode:winch.sourceCode,operator:'NO_ADDITIONAL_OPERATOR_NORM',artifactSha256:concrete.source.sha256,
      columnKey:'exact_column',exactColumn:hole.normId,nonMachine:{rowId:holeLabour.nativeRowId,unitId:holeLabour.unitId}},
    {family:'column',catalogId:columnOwner.parent.catalogId,rowId:brick.prefix+':'+crane.id,unitId:crane.unitId,
      resourceCode:crane.resourceCode,operator:'OPERATOR',artifactSha256:column.source.sha256,
      columnKey:'exact_column',exactColumn:brick.normId,nonMachine:{rowId:brick.prefix+':'+operator.id,unitId:operator.unitId}},
    {family:'facade',catalogId:nvfOwner.currentOwner.catalogId,rowId:steel.prefix+':'+truck.key+'-hired',unitId:truck.unitId,
      resourceCode:truck.resourceCode,operator:'DRIVER',artifactSha256:steel.source.sha256,
      columnKey:'exact_column',exactColumn:steel.normId,nonMachine:{rowId:steel.prefix+':'+steelLabour.key,unitId:steelLabour.unitId}},
    {family:'roof',catalogId:roofCrane.catalogId,rowId:roofCrane.rowId,unitId:'machine_hour',resourceCode:roofCrane.resourceCode,
      operator:roofCrane.operator,artifactSha256:roofCrane.sourceArtifactSha256,columnKey:roofCrane.columnMetadataKey,
      exactColumn:roofCrane.exactPriceScopeColumn,nonMachine:{rowId:roofOperator,unitId:'man_hour'}},
  ];
  expect(new Set(fixtures.map(value=>value.catalogId)).size).toBe(4);
  const metadata=(value:Fixture):Record<string,unknown>=>({normativeResourceCode:value.resourceCode,
    machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',
    source_artifact_sha256:value.artifactSha256,[value.columnKey]:value.exactColumn});
  for(const[index,value]of fixtures.entries()){
    const other=fixtures[(index+1)%fixtures.length];assert(other);
    const sourceMetadata=metadata(value);
    const input={catalogId:value.catalogId,rowId:value.rowId,unitId:value.unitId,sourceMetadata};
    expect(value.unitId).toBe('machine_hour');
    expect(definition(input)).toMatchObject({resourceCode:value.resourceCode,operator:value.operator});
    expect(requirement(value.rowId,value.unitId)).toMatchObject({resourceCode:value.resourceCode,operator:value.operator});
    // An unchanged machine cannot borrow another family's public/source owner.
    expect(definition({...input,catalogId:other.catalogId})).toBeNull();
    for(const patch of [{source_artifact_sha256:other.artifactSha256},
      {[value.columnKey]:other.exactColumn},{normativeResourceCode:other.resourceCode},
      {machinePriceCoverageRequired:'BARE_RENT'},{machinePriceOperationScope:'BARE_RENT'}]){
      expect(()=>definition({...input,sourceMetadata:{...sourceMetadata,...patch}})).toThrow('Machine-hour definition identity is not admitted');
    }
    expect(()=>definition({...input,sourceMetadata:null})).toThrow('Machine-hour definition identity is not admitted');
    expect(definition({...input,unitId:'man_hour'})).toBeNull();
    expect(definition({...input,unitId:'piece'})).toBeNull();
    expect(requirement(value.nonMachine.rowId,value.nonMachine.unitId)).toBeNull();
    expect(requirement(value.nonMachine.rowId,'machine_hour')).toBeNull();
    const evidence=manual({rowId:value.rowId,unitPrice:'77',currencyCode:'KGS'});
    const priced={catalogId:value.catalogId,rowId:value.rowId,unitId:value.unitId,unitPrice:'77',currencyCode:'KGS',manual:true,
      manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence};
    expect(resolve(priced)?.status).toBe('CONFIRMED_MANUAL');
    expect(resolve({...priced,catalogId:other.catalogId})).toBeNull();
    expect(resolve({...priced,rowId:value.nonMachine.rowId,unitId:value.nonMachine.unitId})).toBeNull();
    expect(resolve({...priced,evidence:manual({rowId:other.rowId,unitPrice:'77',currencyCode:'KGS'})})?.status).toBe('UNCONFIRMED');
    expect(resolve({...priced,evidence:{...evidence,unitId:'man_hour'}})?.status).toBe('UNCONFIRMED');
    expect(resolve({...priced,evidence:{...evidence,separateNormedInputs:'INCLUDED_IN_RATE'}})?.status).toBe('UNCONFIRMED');
    expect(resolve({...priced,evidence:{...evidence,minimumBillableHours:'8'}})?.status).toBe('UNCONFIRMED');
  }
  // The44B NVF consumer addition preserves the exact historical scope too.
  // Its public standalone route remains HOLD; this creates no catalog/card.
  const facade=fixtures.find(value=>value.family==='facade');assert(facade);
  expect(definition({catalogId:steel.catalogId,rowId:facade.rowId,unitId:facade.unitId,sourceMetadata:metadata(facade)}))
    .toMatchObject({resourceCode:facade.resourceCode,operator:'DRIVER'});
});
