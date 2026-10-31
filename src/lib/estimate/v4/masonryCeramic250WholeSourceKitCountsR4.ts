import whole from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

const contract='gox-build.masonry-ceramic250-whole-source-kit-counts/r4';
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

/** Reuse the saved whole brigade inventory, keeping its source/stock meaning.
 * Known source counts do not depend on a fictional project document. The
 * original project, lifting, actual availability and current PPE needs stay
 * unclosed. No subset is advertised as a complete masonry technology. */
export function applyMasonryCeramic250WholeSourceKitCountsR4(model:Rep):Rep{
 if(model.definition.id!==whole.parent.definitionId||model.definition.definition_version!==whole.parent.version||model.definition.definition_sha256!==whole.parent.definitionSha256)throw Error('MASONRY_SOURCE_KIT_R4_EXACT_PARENT');
 const stock=whole.stock.filter(item=>!('historicalProtectionStockIsNotCurrentCompletePpe' in item&&item.historicalProtectionStockIsNotCurrentCompletePpe===true));
 if(whole.stock.length!==29||stock.length!==26)throw Error('MASONRY_SOURCE_KIT_R4_EXACT_WHOLE_SOURCE');
 const selected=Object.fromEntries(stock.map(item=>[whole.prefix+':'+item.key,item]));
 const legacyRecords=whole.records.map(record=>'mcf2_'+(record.key+'_reference').replaceAll('-','_'));
 const beforeFormulas=hash(model.formulas),beforeBindings=hash(model.bindings),result=structuredClone(model);
 let changed=0;
 result.resources=result.resources.map(row=>{
  const item=selected[row.row_id as keyof typeof selected];if(!item)return row;
  const formula=result.formulas.find(formula=>formula.formula_id===row.formula_id);
  if(!formula||formula.expression_source!==item.quantity||row.unit_id!==item.unitId||!same(row.resource_graph.inputParameterIds,legacyRecords)||row.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'||row.procurement_eligible!==false||row.source_metadata.sourceInventoryNotConsumption!==true)throw Error('MASONRY_SOURCE_KIT_R4_EXACT_ROW_PREIMAGE:'+row.row_id);
  const {row_sha256:_old,...body}=row;changed++;
  const updated={...body,resource_graph:{...row.resource_graph,inputParameterIds:[],masonryWholeSourceKitCountV1:{contract,sourceWholeBrigadeSize:8,capturedObjectDocumentDependencies:legacyRecords,sourceLiteralQuantity:item.quantity,sourceCountIsNotActualAvailability:true,sourceCountIsNotConsumption:true,newPurchase:false,actualProvisionAccepted:false}},source_metadata:{...row.source_metadata,sourceQuantityIndependentFromObjectApproval:true,actualObjectInventoryConfirmed:false,closedParentNeeds:0,newPaidOwner:false,newProcurementOwner:false,full_technical_acceptance:false}};
  return{...updated,row_sha256:hash(updated)};
 });
 if(changed!==26||hash(result.formulas)!==beforeFormulas||hash(result.bindings)!==beforeBindings)throw Error('MASONRY_SOURCE_KIT_R4_UNCHANGED_WHOLE_FORMULAS_BINDINGS');
 result.definition.applicability={...result.definition.applicability,masonryCeramic250WholeSourceKitCountsR4:{contract,sourceWholeBrigadeSize:8,sourceInventoryRows:26,historicalPpeRowsRetainedUnconfirmed:3,actualProjectAndSupplyRequirementsUnclosed:true,newNorms:0,newPaidOwners:0,newProcurementOwners:0,full:false}};
 return result;
}
