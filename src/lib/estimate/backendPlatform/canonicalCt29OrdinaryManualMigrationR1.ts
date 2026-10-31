import policy from '../../../../data/estimate-benchmarks/source-packs/ct29-ordinary-manual-migration-r1.json';
import {canonicalEstimateStableJson as stable} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as sha} from './canonicalEstimateSha256';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualQuantityMigrationBindings as quantities}
  from './canonicalManualPriceReleaseMigration';

type Row=Record<string,unknown>;
export type Ct29MigrationModelR1={parameters:readonly Row[];formulas:readonly Row[];resources:readonly Row[]};
type Identity={id:string;catalogId:string;sha256:string};
const object=(value:unknown):Row=>value!=null&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
export const CT29_ORDINARY_MANUAL_MIGRATION_R1=policy;
export function ct29OrdinaryMigrationSemanticSha256R1(model:Ct29MigrationModelR1):string {
 const clean=(row:Row)=>Object.fromEntries(Object.entries(row).filter(([key])=>
  !['id','definition_version_id','created_at','row_sha256','_binding_price_keys'].includes(key)));
 return sha(stable(Object.fromEntries((['parameters','formulas','resources']as const).map(key=>
  [key,model[key].map(clean).sort((a,b)=>stable(a).localeCompare(stable(b),'en'))]))));
}

/** One exact ordinary CT29 transition. The delivery row remains unresolved;
 * this preserves a user's budget and supplies no application norm or payment. */
export function admitCt29OrdinaryManualMigrationR1(input:{fromIdentity:Identity;toIdentity:Identity;
 from:Ct29MigrationModelR1;to:Ct29MigrationModelR1}):{
 definitionId:string;priceBindings:Record<string,string>;quantityBindings:Record<string,string>;
 exclusionBindings:Record<string,string>;operationBindings:Record<string,string>;
}|null {
 for(const side of ['from','to']as const){
  const identity=side==='from'?input.fromIdentity:input.toIdentity,expected=policy[side];
  if(identity.id!==expected.id||identity.catalogId!==policy.catalogId||identity.sha256!==expected.sha256
   ||ct29OrdinaryMigrationSemanticSha256R1(input[side])!==expected.semanticSha256)return null;
 }
 const before=input.from.resources.find(row=>row.row_id===policy.preservedBudgetRowId);
 const after=input.to.resources.find(row=>row.row_id===policy.preservedBudgetRowId);
 if(!before||!after)return null;
 for(const key of ['row_id','unit_id','category','cost_owner_id','procurement_eligible','title_ru'])
  if(stable(before[key])!==stable(after[key]))return null;
 const oldFormula=input.from.formulas.find(row=>row.formula_id===before.formula_id);
 const newFormula=input.to.formulas.find(row=>row.formula_id===after.formula_id);
 if(object(oldFormula?.ast).kind!=='parameter'||object(oldFormula?.ast).id!==policy.oldInternalQuantityParameterId
  ||object(newFormula?.ast).kind!=='parameter'||object(newFormula?.ast).id!==policy.newInternalQuantityParameterId)return null;
 for(const [model,id]of [[input.from,policy.oldInternalQuantityParameterId],[input.to,policy.newInternalQuantityParameterId]]as const){
  const p=model.parameters.find(row=>row.parameter_id===id),truth=object(p?.truth_metadata);
  if(!p||p.unit_id!=='item'||p.default_value!=null||truth.visibility_role!=='INTERNAL_ONLY'
   ||truth.value_source_role!=='UNRESOLVED_APPLICATION_NORM')return null;
 }
 const oldPrices=prices(input.from),oldQuantities=quantities(input.from),newQuantities=quantities(input.to);
 if(!oldPrices[policy.preservedBudgetRowId]||!oldQuantities[policy.preservedBudgetRowId]||!newQuantities[policy.resetOnlyRowId])return null;
 return {definitionId:policy.from.id,priceBindings:{[policy.preservedBudgetRowId]:oldPrices[policy.preservedBudgetRowId]},
  quantityBindings:{[policy.preservedBudgetRowId]:oldQuantities[policy.preservedBudgetRowId],
   [policy.resetOnlyRowId]:newQuantities[policy.resetOnlyRowId]},exclusionBindings:{},operationBindings:{}};
}
