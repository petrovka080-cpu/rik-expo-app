import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';

type Row=Record<string,unknown>;
const object=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const isObject=(v:unknown):v is Row=>v!==null&&typeof v==='object'&&!Array.isArray(v);
/** Source-authoritative price semantics. Process labels and applicability may
 * change without moving a manual rate to another physical/cost owner. */
export function canonicalManualPriceMigrationBindings(input:{resources:readonly Row[];formulas:readonly Row[];parameters:readonly Row[]}):Record<string,string>{
 const formulas=new Map(input.formulas.map(f=>[String(f.formula_id),f]));
 const parameters=new Map(input.parameters.map(p=>[String(p.parameter_id),p]));
 return Object.fromEntries(input.resources.flatMap(r=>{
  const formula=formulas.get(String(r.formula_id));if(!formula||!r.row_id)return [];
  const graph=object(r.resource_graph),source=object(r.source_metadata);
  const priceGraph=Object.fromEntries(Object.entries(graph).filter(([key])=>![
   'operationCompositionV1','publicResourcePresentationV1','priceKeys',
  ].includes(key)));
  const referenced=new Set<string>(Array.isArray(formula.input_parameter_ids)?formula.input_parameter_ids.map(String):[]);
  const collect=(v:unknown):void=>{if(typeof v==='string'&&parameters.has(v))referenced.add(v);else if(Array.isArray(v))v.forEach(collect);else if(isObject(v))Object.values(v).forEach(collect);};
  collect(priceGraph);
  if([...referenced].some(id=>!parameters.has(id)))return [];
  const parameterBindings=[...referenced].sort().map(id=>{const p=parameters.get(id)!;return {id,valueType:p.value_type,unitId:p.unit_id,semanticKey:object(p.truth_metadata).semantic_parameter_key??null};});
  const identity={version:'canonical-manual-price-binding/v1',rowId:r.row_id,unitId:r.unit_id,category:r.category,
   costOwnerId:r.cost_owner_id??null,semanticOwnerId:graph.semanticOwnerId??null,costTreatment:graph.costTreatment??'OWN_COST',
   includedInResourceOwnerRowId:graph.includedInResourceOwnerRowId??null,commercialCostCoverage:graph.commercialCostCoverageV1??null,
   titleSpecificationParameterIds:graph.titleSpecificationParameterIds??graph.titleSpecificationParameterId??null,
   purchaseBalance:graph.purchaseBalanceV1??null,priceGraph,formulaAst:formula.ast,
   formulaInputParameterIds:formula.input_parameter_ids,formulaOutputUnitId:formula.output_unit_id,parameterBindings,sourceMetadata:source};
  return [[String(r.row_id),canonicalEstimateSha256HexText(canonicalEstimateStableJson(identity))]];
 }));
}

/** Only unchanged stored manual unit prices are eligible. Quantities, custom
 * rows, inclusions, new edits and absent price-binding evidence stay blocked. */
export function canonicalStoredManualPricesCanMigrate(input:{
 rowOverrides:unknown;customRows:unknown;fromBindings:unknown;toBindings:unknown;
}):boolean{
 const overrides=object(input.rowOverrides),from=object(input.fromBindings),to=object(input.toBindings);
 if(!isObject(input.rowOverrides)||!Array.isArray(input.customRows)||input.customRows.length)return false;
 return Object.entries(overrides).every(([id,value])=>{
  const override=object(value),provenance=object(override.provenance),price=override.unitPrice;
  return Object.hasOwn(override,'unitPrice')&&Object.keys(override).every(key=>key==='unitPrice'||key==='provenance')
   &&provenance.kind==='manual'&&(price===null||((typeof price==='string'||typeof price==='number')&&String(price).trim()!==''&&Number.isFinite(Number(price))&&Number(price)>=0))
   &&typeof from[id]==='string'&&/^[a-f0-9]{64}$/u.test(from[id] as string)&&from[id]===to[id];
 });
}

export function assertCanonicalStoredManualPriceReleaseMigration(input:{
 parentOverrides:unknown;parentCustomRows:unknown;requestedOverrides:unknown;requestedCustomRows:unknown;
 fromBindings:unknown;toBindings:unknown;parentCurrency:unknown;requestedCurrency:unknown;
}):void{
 if(input.parentCurrency!==input.requestedCurrency
  ||canonicalEstimateStableJson(input.parentOverrides??{})!==canonicalEstimateStableJson(input.requestedOverrides??{})
  ||canonicalEstimateStableJson(input.parentCustomRows??[])!==canonicalEstimateStableJson(input.requestedCustomRows??[])
  ||!canonicalStoredManualPricesCanMigrate({rowOverrides:input.parentOverrides,customRows:input.parentCustomRows??[],fromBindings:input.fromBindings,toBindings:input.toBindings}))
  throw Object.assign(new Error('Переход остановлен: совместимость сохранённых ручных цен или строк не подтверждена. Исходная смета и введённые значения сохранены.'),{code:'RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED'});
}
