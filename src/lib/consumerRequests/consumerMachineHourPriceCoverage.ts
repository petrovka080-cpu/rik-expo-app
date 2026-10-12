import type {ConsumerRepairRequestItem} from './consumerRequestTypes';
import {canonicalMachineHourRowPriceDecisionV1} from '../estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
export function consumerMachineHourPriceDecision(item:ConsumerRepairRequestItem){
  const source=item.sourceParameters;
  if(typeof source?.canonicalBackendRevisionId!=='string')return null;
  return canonicalMachineHourRowPriceDecisionV1({row_id:source.rowCode,unit_id:item.unit,unit_price:item.unitPrice,currency_code:item.currency,
    price_snapshot_id:source.canonicalPriceSnapshotId,price_source_kind:source.canonicalPriceSourceKind,
    calculation_trace:{machineHourPriceCoverageV1:source.canonicalMachineHourPriceCoverageV1},price_resolution_trace:source.canonicalPriceResolutionTrace},String(source.canonicalBackendCatalogId??''));
}
export function consumerMachineHourPriceNeedsConfirmation(item:ConsumerRepairRequestItem){
  return item.unitPrice!=null&&consumerMachineHourPriceDecision(item)?.status==='UNCONFIRMED';
}
