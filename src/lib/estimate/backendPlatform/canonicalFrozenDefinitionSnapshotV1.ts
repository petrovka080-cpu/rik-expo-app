import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const object=(v:unknown):v is Record<string,unknown>=>v!=null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
/** Read the same frozen JSON through its declared definition contract instead
 * of retaining millions of inferred JSON literal types in each compiler.
 * No projection, cloning, defaulting or normative admission happens here. */
export function readFrozenDefinitionSnapshotV1<K extends 'models'|'reps'|'representatives'>(value:unknown,key:K):Record<K,PurchaseGroupRepresentative[]>{
 const fail=():never=>{throw Object.assign(new Error('Frozen definition snapshot structure invalid'),{code:'FROZEN_DEFINITION_SNAPSHOT_INVALID'});};
 if(!object(value)||!Array.isArray(value[key])||value[key].length===0)return fail();
 for(const model of value[key]){
  if(!object(model)||!object(model.definition)||!text(model.definition.id)||!text(model.definition.catalog_id)
   ||!/^[a-f0-9]{64}$/u.test(String(model.definition.definition_sha256))||!object(model.baseline)||!object(model.passport))return fail();
  for(const name of ['parameters','formulas','resources','bindings'])if(!Array.isArray(model[name])||model[name].some(row=>!object(row)))return fail();
  for(const p of model.parameters as Record<string,unknown>[])if(!text(p.parameter_id)||!text(p.value_type)||typeof p.required!=='boolean'||!object(p.truth_metadata))return fail();
  for(const f of model.formulas as Record<string,unknown>[])if(!text(f.formula_id)||!object(f.ast)||!Array.isArray(f.input_parameter_ids))return fail();
  for(const r of model.resources as Record<string,unknown>[])if(!text(r.row_id)||!text(r.formula_id)||!text(r.unit_id)||!object(r.resource_graph))return fail();
 }
 return value as unknown as Record<K,PurchaseGroupRepresentative[]>;
}
