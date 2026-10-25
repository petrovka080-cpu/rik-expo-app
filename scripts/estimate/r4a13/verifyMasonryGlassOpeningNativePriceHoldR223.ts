import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import priced from '../../../data/estimate-benchmarks/fixtures/masonry-glass-opening-native-price-hold-r223.json';
import normalAudit from '../../../data/estimate-benchmarks/fixtures/masonry-glass-opening-native-cost-audit-r223.json';
import {masonryGlassOpeningCapturedR223,masonryGlassOpeningRetainedPureR223,
 type masonryGlassOpeningExistingConfigR223} from './prepareMasonryGlassOpeningExistingOwnerR223';
import {compileCanonicalEstimateCore,canonicalEstimateResourceIncludedByDefault,
 type CanonicalEstimatePriceItem} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {assertCanonicalMachineHourDefinitionV1,parseCanonicalMachineHourPriceCoverageV1,
 resolveCanonicalMachineHourPriceCoverageV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';

type Config=ReturnType<typeof masonryGlassOpeningExistingConfigR223>;
type CoreResult=Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
let calls=0;
export const masonryGlassOpeningPriceHoldActualEntriesR223=()=>calls;
function save(name:string,value:unknown){const root=process.env.MASONRY_R223_PRICE_HOLD_OUTPUT;assert(root);
 mkdirSync(root,{recursive:true});writeFileSync(resolve(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}

/** Prices and manual row selection cannot grant definition-owned payment.
 * This source-only gate deliberately keeps the original model, cost flags,
 * source roles and procurement settings. It is not a new cost admission. */
export async function verifyMasonryGlassOpeningNativePriceHoldR223(config:Config,sourceRoot:string){
 const normal=masonryGlassOpeningRetainedPureR223(config,sourceRoot);
 assert.equal(config.catalogId,priced.catalogId);assert.equal(config.catalogAppend,undefined);
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});
 assert.deepEqual(config.runtimeProfileSourceIds,{});
 let labour=0,operators=0,machines=0,materials=0;
 for(const plan of normalAudit.native){const row=config.resourceDefinitions.find(row=>row.row_id===plan.rowId);assert(row);
  assert.equal(row.cost_owner_id,plan.costOwnerId);assert.equal(row.unit_id,plan.unitId);assert.equal(row.procurement_eligible,false);
  assert.equal(row.resource_graph.costTreatment,plan.beforeCost);assert(record(row.source_metadata));
  assert.equal(row.source_metadata.materialPaymentAdmitted,false);assert.equal(row.source_metadata.machinePaymentAdmitted,false);
  assert.equal(row.source_metadata.purchase_order_admission,false);assert.equal(row.source_metadata.exact_column,plan.column);
  assert.equal(row.source_metadata.source_artifact_sha256,priced.sourceArtifactSha256);
  const formula=config.formulaDefinitions.find(formula=>formula.formula_id===row.formula_id);assert(formula);
  assert.equal(formula.expression_source,`glass97_filled_opening_area_m2*${plan.ratePer100M2}/100`);
  if(plan.role==='WHOLE_LABOUR'){labour++;assert.equal(canonicalEstimateResourceIncludedByDefault(row),true);}
  else{assert.equal(canonicalEstimateResourceIncludedByDefault(row),false);
   if(plan.role==='OPERATOR_INFORMATION')operators++;else if(plan.role==='MACHINE'){machines++;
    assert.equal(assertCanonicalMachineHourDefinitionV1({catalogId:config.catalogId,rowId:row.row_id,unitId:row.unit_id,
      sourceMetadata:row.source_metadata}),null,'EXACT_MACHINE_COST_ADMISSION_IS_STILL_UNRUN');}
   else materials++;}
 }
 assert.deepEqual([labour,operators,machines,materials],[2,2,4,6]);
 for(const plan of normalAudit.included){const row=config.resourceDefinitions.find(row=>row.row_id===plan.rowId);assert(row);
  assert.equal(row.cost_owner_id,plan.costOwnerId);assert.equal(row.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
  assert.equal(canonicalEstimateResourceIncludedByDefault(row),false);assert.equal(row.procurement_eligible,false);}
 save('PURE_BEFORE_PRICE_HOLD_CORE_R223',{normal,native:14,included:4,unchangedNonpayNative:12,
  machineOrMaterialCostHolds:10,noNewCostScope:true,actualDocuments:0,procurement:false,full:false});
 const c=masonryGlassOpeningCapturedR223(sourceRoot);
 const submitted={...{[priced.selector.parameterId]:priced.selector.value},glass97_filled_opening_area_m2:priced.areaM2,
  glass97_storey_height_m:priced.storeyHeightM};
 const confirmed=canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:config.parameterDefinitions,inputParameters:submitted});
 assert.deepEqual(confirmed,{});
 const prices:CanonicalEstimatePriceItem[]=priced.prices.map(price=>{
  const item:CanonicalEstimatePriceItem={price_key:price.rowId,unit_id:price.unitId,currency_code:priced.currencyCode,
   unit_price:price.syntheticUnitPrice,snapshot_id:priced.snapshotId};
  if(price.unitId==='machine_hour'){
   const evidence=parseCanonicalMachineHourPriceCoverageV1({contractVersion:'canonical-machine-hour-price-coverage/v1',
    resourceCode:price.resourceCode,unitId:'machine_hour',currencyCode:priced.currencyCode,unitPrice:price.syntheticUnitPrice,
    billingBasis:'MACHINE_HOUR',operationScope:'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',
    separateNormedInputs:'EXCLUDED_FROM_RATE',source:{kind:'SNAPSHOT',snapshotId:priced.snapshotId,priceKey:price.rowId}});assert(evidence);
   item.machine_hour_price_coverage_v1=evidence;
   assert.equal(resolveCanonicalMachineHourPriceCoverageV1({catalogId:config.catalogId,rowId:price.rowId,unitId:price.unitId,
    currencyCode:priced.currencyCode,unitPrice:price.syntheticUnitPrice,evidence,manual:false,snapshotId:priced.snapshotId,
    priceKey:price.rowId}),null,'PRICE_EVIDENCE_IS_NOT_MACHINE_ADMISSION');
  }
  return item;
 });
 assert.equal(prices.length,6);
 const prefix='masonry:glass-block:krer:'+priced.normId;
 const attemptedIds=[...normalAudit.native.filter(row=>row.column===priced.normId&&row.role!=='WHOLE_LABOUR').map(row=>row.rowId),
  ...normalAudit.included.filter(row=>row.column===priced.normId).map(row=>row.rowId)];
 const rowOverrides=Object.fromEntries(attemptedIds.map(rowId=>[rowId,{includedInEstimate:true,
  provenance:{kind:'manual',reason:'TEST_ONLY attempted nonpay inclusion; no cost/source/project authority'}}]));
 calls++;process.stdout.write('MASONRY_R223_ACTUAL_PRICE_HOLD_CORE_ENTRY='+calls+';case=SOURCE_COST_HOLD03\n');
 let result:CoreResult;
 try{result=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:config.contract,catalogId:config.catalogId,
   primaryMeasureParameterId:'glass97_filled_opening_area_m2',parameterDefinitions:[...config.parameterDefinitions],
   formulaDefinitions:[...config.formulaDefinitions],resourceDefinitions:[...config.resourceDefinitions],submittedParameters:submitted,
   confirmedParameters:confirmed,rowOverrides,priceItems:prices,priceSnapshotIds:[priced.snapshotId],currencyCode:priced.currencyCode,
   maximumResourceRows:config.resourceDefinitions.length,hashJson:hash});
  save('CORE_OUTCOME_01',{case:'SOURCE_COST_HOLD03',kind:'RESULT',actualProjectDocuments:0,prices,
   submittedParameters:submitted,confirmedParameters:confirmed,rowOverrides,result});
 }catch(error:unknown){save('CORE_OUTCOME_01',{case:'SOURCE_COST_HOLD03',kind:'REJECT',code:record(error)?error.code:null,
   message:error instanceof Error?error.message:String(error)});throw error;}
 assert.equal(result.rows.length,9);assert.equal(result.preliminaryNeeds.length,10);
 assert([...result.rows,...result.preliminaryNeeds].every(row=>row.row_id.startsWith(prefix+':')));
 assert.equal(result.parameters.q,undefined);
 for(const expected of priced.prices){const row=result.rows.find(row=>row.row_id===expected.rowId);assert(row);
  assert.equal(row.quantity,expected.expectedQuantity);assert.equal(row.unit_id,expected.unitId);
  assert.equal(row.unit_price,expected.syntheticUnitPrice);assert.equal(row.amount,expected.expectedAmount);
  assert.equal(row.included_in_estimate,expected.rowKey==='whole-labour');assert.equal(row.included_in_procurement,false);}
 for(const rowId of attemptedIds){const row=result.rows.find(row=>row.row_id===rowId);assert(row);assert.equal(row.included_in_estimate,false);
  assert(record(row.calculation_trace)&&record(row.calculation_trace.inclusionDecision));
  assert.equal(row.calculation_trace.inclusionDecision.requestedIncludedInEstimate,true);
  assert.equal(row.calculation_trace.inclusionDecision.effectiveIncludedInEstimate,false);}
 const operator=result.rows.find(row=>row.row_id===prefix+':operator-information');assert(operator);
 assert.equal(operator.quantity,priced.operatorQuantity);assert.equal(operator.included_in_estimate,false);
 assert.equal(operator.unit_price,null);assert.equal(operator.amount,null);
 for(const op of priced.includedOperations){const row=result.rows.find(row=>row.row_id===prefix+':operation:'+op);assert(row);
  assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);assert.equal(row.amount,null);}
 assert(result.rows.every(row=>!row.included_in_procurement));
 assert(result.preliminaryNeeds.every(need=>need.quantity===null&&!need.procurement_eligible));
 assert.equal(result.totals.includedRowCount,1);assert.equal(result.totals.pricedRowCount,1);
 assert.equal(result.totals.amount,priced.expectedCurrentLabourOnlyTotal);
 assert.notEqual(result.totals.amount,priced.referenceOnlyTotalNotAdmitted);
 const final={status:'TEST_ONLY_SOURCE_COST_HOLD_ENFORCED_NOT_FULL_PRICING',actualEntries:calls,results:1,
  referenceOnlyTotalNotAdmitted:priced.referenceOnlyTotalNotAdmitted,currentLabourOnlyTotal:result.totals.amount,
  blockedNativeCostRowsUnion:10,activeBlockedNativeCostRows:5,operatorPaid:false,includedPaid:false,
  realProjectDocuments:0,procurement:false,unknownUnion:20,closedNeeds:0,newCostAdmission:false,
  originalEightQuantityPlan:'UNRUN_UNCHANGED_NOT_SELECTED',normalDb:'UNRUN',LOCKED:'UNRUN',workerSave:'UNRUN',ui:'UNRUN',full:false};
 save('FINAL_NATIVE_PRICE_HOLD_R223',final);return final;
}
