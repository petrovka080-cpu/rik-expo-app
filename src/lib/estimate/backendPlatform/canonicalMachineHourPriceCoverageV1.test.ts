import pack from '../../../../data/estimate-benchmarks/source-packs/flat-roof-torch-two-s27-63.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from './canonicalEstimateCompileCore';
import {canonicalManualMachineHourPriceCoverageV1,canonicalMachineHourRowPriceDecisionV1,parseCanonicalMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1} from './canonicalMachineHourPriceCoverageV1';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalStoredManualPricesCanMigrate} from './canonicalManualPriceReleaseMigration';
import {buildCanonicalProfessionalPdfProjection} from './canonicalProfessionalPdf';
import type {CanonicalArtifactRow} from './canonicalEstimateArtifactContract';
import {consumerMachineHourPriceNeedsConfirmation} from '../../consumerRequests/consumerMachineHourPriceCoverage';
import type {ConsumerRepairRequestItem} from '../../consumerRequests/consumerRequestTypes';
import {canonicalArtifactRowsWithPriceRecordsV1} from './canonicalArtifactRowPricesV1';
const catalogs=['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone'];
const rowId=pack.prefix+':tower_crane_8t',reason='consumer_estimate_row_batch_edit';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const confirmation=()=>canonicalManualMachineHourPriceCoverageV1({rowId,unitPrice:'1000',currencyCode:'KGS'});
function input(catalogId=catalogs[0]!):CanonicalEstimateCompileCoreInput{
  const owner=sourcePinnedRoofNormOwnerR1(pack as SourcePinnedRoofNormPackR1);
  return {operation:'recalculate',catalogId,compilerVersion:'TEST_PRICE_COVERAGE',parameterDefinitions:[...owner.parameters],
    formulaDefinitions:[...owner.formulas],resourceDefinitions:[...owner.resources],submittedParameters:{q:'40',[pack.systemParameterId]:pack.systemYesRu,
      [pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu},confirmedParameters:{},currencyCode:'KGS',priceItems:[],
    rowOverrides:{[rowId]:{unitPrice:'1000',provenance:{kind:'manual',reason}}},maximumResourceRows:100,hashJson:hash};
}
const machine=(result:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>)=>result.rows.find(row=>row.row_id===rowId)!;
test.each(catalogs)('scalar rent is retained, but does not establish full operation: %s',async catalog=>{
  const result=await compileCanonicalEstimateCore(input(catalog)),row=machine(result);
  expect(row).toMatchObject({quantity:'0.06',unit_price:'1000',amount:'60',calculation_trace:{machineHourPriceCoverageV1:{status:'UNCONFIRMED'}}});
  expect(result.totals.unconfirmedMachinePriceRowCount).toBe(1);
  expect(result.rows.find(r=>r.row_id.endsWith(':included_machine_operators'))?.included_in_estimate).toBe(false);
});
test('explicit manual composition is saved without claiming supplier verification; exclusions preserve and restore it',async()=>{
  const i=input();i.rowOverrides![rowId]!.machineHourPriceCoverageV1=confirmation();
  const active=await compileCanonicalEstimateCore(i);expect(machine(active).calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'CONFIRMED_MANUAL'}});
  expect(active.totals.unconfirmedMachinePriceRowCount).toBeUndefined();
  const excluded=await compileCanonicalEstimateCore({...i,compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[rowId],excludedOperationKeys:[]}});
  expect(machine(excluded)).toMatchObject({quantity:'0',unit_price:'1000',included_in_estimate:false,calculation_trace:{machineHourPriceCoverageV1:{status:'CONFIRMED_MANUAL'}}});
  const restored=await compileCanonicalEstimateCore(i);expect(machine(restored)).toMatchObject({quantity:'0.06',unit_price:'1000',amount:'60'});
});
test.each(['price','currency','source'])('changed %s invalidates inherited confirmation without erasing the numeric price',async change=>{
  const i=input();i.rowOverrides![rowId]!.machineHourPriceCoverageV1=confirmation();
  if(change==='price')i.rowOverrides![rowId]!.unitPrice='1100';
  if(change==='currency')i.currencyCode='USD';
  if(change==='source')i.rowOverrides![rowId]!.provenance={kind:'manual',reason:'market_catalog:different-offer:different-source'};
  const result=await compileCanonicalEstimateCore(i);expect(machine(result).unit_price).toBe(change==='price'?'1100':'1000');
  expect(machine(result).calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'UNCONFIRMED'}});
});
test('snapshot evidence is bound to its actual immutable snapshot and route key on compile and read',async()=>{
  const i=input(),resource=i.resourceDefinitions.find(r=>r.row_id===rowId)!;
  const snapshotId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',priceKey=resource.cost_owner_id!;
  const evidence={...confirmation(),source:{kind:'SNAPSHOT' as const,snapshotId,priceKey}};
  i.rowOverrides={};i.priceItems=[{price_key:priceKey,unit_id:'machine_hour',currency_code:'KGS',unit_price:'1000',snapshot_id:snapshotId,machine_hour_price_coverage_v1:evidence}];
  const row=machine(await compileCanonicalEstimateCore(i));expect(row.calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'CONFIRMED_SOURCE'}});
  expect(canonicalMachineHourRowPriceDecisionV1(row,i.catalogId)?.status).toBe('CONFIRMED_SOURCE');
  expect(canonicalMachineHourRowPriceDecisionV1({...row,price_snapshot_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},i.catalogId)?.status).toBe('UNCONFIRMED');
  expect(canonicalMachineHourRowPriceDecisionV1({...row,price_snapshot_id:null,price_resolution_trace:{kind:'manual_override',provenance:{kind:'manual',reason}}},i.catalogId)?.status).toBe('UNCONFIRMED');
  i.priceItems[0]!.machine_hour_price_coverage_v1={...evidence,source:{...evidence.source,priceKey:'wrong-owner'}};
  expect(machine(await compileCanonicalEstimateCore(i)).calculation_trace).toMatchObject({machineHourPriceCoverageV1:{status:'UNCONFIRMED'}});
});
test('hourly basis, no minimum and no extra operator norm are not inferred from scalar or false/shift source data',()=>{
  for(const bad of [{...confirmation(),billingBasis:'SHIFT'},{...confirmation(),minimumBillableHours:'8'},{...confirmation(),operationScope:'BARE_RENT'},{...confirmation(),fixedFees:'100'}]){
    expect(parseCanonicalMachineHourPriceCoverageV1(bad)).toBeNull();
    expect(resolveCanonicalMachineHourPriceCoverageV1({catalogId:catalogs[0]!,rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'1000',manual:true,manualProvenanceReason:reason,evidence:bad})?.status).toBe('UNCONFIRMED');
  }
});
test('finite catalog boundary excludes standalone primer/screed and wrong resource identity fails closed',async()=>{
  const outside=input('canonical-work:standalone-roof-primer');
  expect(machine(await compileCanonicalEstimateCore(outside)).calculation_trace).not.toHaveProperty('machineHourPriceCoverageV1');
  expect((await compileCanonicalEstimateCore(outside)).totals.unconfirmedMachinePriceRowCount).toBeUndefined();
  expect(canonicalMachineHourRowPriceDecisionV1(machine(await compileCanonicalEstimateCore(outside)),outside.catalogId)).toBeNull();
  const i=input();i.resourceDefinitions=i.resourceDefinitions.map(row=>row.row_id===rowId?{...row,source_metadata:{...row.source_metadata,normativeResourceCode:'40-0001'}}:row);
  await expect(compileCanonicalEstimateCore(i)).rejects.toMatchObject({code:'DEFINITION_INTEGRITY_FAILED'});
});
test('manual release transfer requires unchanged price binding, amount, currency and source provenance; null reset is allowed',()=>{
  const base={customRows:[],fromBindings:{[rowId]:'a'.repeat(64)},toBindings:{[rowId]:'a'.repeat(64)},currency:'KGS'};
  const override={unitPrice:'1000',provenance:{kind:'manual',reason},machineHourPriceCoverageV1:confirmation()};
  expect(canonicalStoredManualPricesCanMigrate({...base,rowOverrides:{[rowId]:override}})).toBe(true);
  expect(canonicalStoredManualPricesCanMigrate({...base,rowOverrides:{[rowId]:{...override,machineHourPriceCoverageV1:null}}})).toBe(true);
  for(const changed of [{...base,currency:'USD'},{...base,toBindings:{[rowId]:'b'.repeat(64)}}])expect(canonicalStoredManualPricesCanMigrate({...changed,rowOverrides:{[rowId]:override}})).toBe(false);
  expect(canonicalStoredManualPricesCanMigrate({...base,rowOverrides:{[rowId]:{...override,provenance:{kind:'manual',reason:'market_catalog:new'}}}})).toBe(false);
});
test('saved scalar is distinct from missing price in UI and PDF; actual confirmation closes only the price issue',async()=>{
  const i=input(),row=machine(await compileCanonicalEstimateCore(i));
  const item={unit:'machine_hour',unitPrice:1000,currency:'KGS',sourceParameters:{rowCode:rowId,canonicalBackendRevisionId:'saved',canonicalBackendCatalogId:i.catalogId,
    canonicalMachineHourPriceCoverageV1:(row.calculation_trace as Record<string,unknown>).machineHourPriceCoverageV1,canonicalPriceResolutionTrace:row.price_resolution_trace,canonicalPriceSourceKind:'MANUAL'}} as unknown as ConsumerRepairRequestItem;
  expect(consumerMachineHourPriceNeedsConfirmation(item)).toBe(true);
  expect(consumerMachineHourPriceNeedsConfirmation({...item,sourceParameters:{...item.sourceParameters,canonicalBackendCatalogId:'standalone'}})).toBe(false);
  const revision={id:'saved',release_id:'release',catalog_id:i.catalogId,checksum_sha256:'a'.repeat(64),row_count:1,currency_code:'KGS',created_at:'2026-10-13T00:00:00Z',totals:{amount:'60'}};
  const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:[row as CanonicalArtifactRow],workTitleRu:'Кровля'});
  expect(pdf.missingPriceRowCount).toBe(0);expect(pdf.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');expect(pdf.html).toContain('Состав цены эксплуатации не подтверждён; сумма предварительная.');
  expect(pdf.html).not.toContain('Все строки имеют подтверждённую цену.');
  i.rowOverrides![rowId]!.machineHourPriceCoverageV1=confirmation();
  const confirmed=machine(await compileCanonicalEstimateCore(i));
  const {price_resolution_trace:priceTrace,price_snapshot_id:snapshotId,...stored}=confirmed;
  const loaded=canonicalArtifactRowsWithPriceRecordsV1({revisionId:'saved',rows:[{...stored,revision_id:'saved'}],prices:[{revision_id:'saved',row_id:rowId,price_snapshot_id:snapshotId,resolution_trace:priceTrace}]});
  expect(buildCanonicalProfessionalPdfProjection({revision,rows:loaded as CanonicalArtifactRow[],workTitleRu:'Кровля'}).grandTotalStatus).toBe('COMPLETE');
  expect(()=>canonicalArtifactRowsWithPriceRecordsV1({revisionId:'saved',rows:[{...stored,revision_id:'saved'}],prices:[{revision_id:'other',row_id:rowId,resolution_trace:priceTrace}]})).toThrow(expect.objectContaining({code:'ARTIFACT_SOURCE_INVALID'}));
  expect(()=>canonicalArtifactRowsWithPriceRecordsV1({revisionId:'saved',rows:[{...stored,revision_id:'saved'}],prices:[{revision_id:'saved',row_id:rowId},{revision_id:'saved',row_id:rowId}]})).toThrow(expect.objectContaining({code:'ARTIFACT_SOURCE_INVALID'}));
});
