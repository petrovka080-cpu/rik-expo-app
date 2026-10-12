import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {parseCanonicalMachineHourPriceCoverageV1,canonicalMachineHourPriceRequirementV1} from './canonicalMachineHourPriceCoverageV1';
import {compareFormulaGraphDecimals} from './formulaGraph';

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

/** Exclusions require stricter evidence than prices: applicability, procurement
 * eligibility and parameter meaning must also remain the same. */
export function canonicalManualExclusionMigrationBindings(input:{resources:readonly Row[];formulas:readonly Row[];parameters:readonly Row[]}):Record<string,string>{
 const prices=canonicalManualPriceMigrationBindings(input);
 const parameters=input.parameters.map(p=>({id:p.parameter_id,type:p.value_type,unit:p.unit_id,
  meaning:object(p.truth_metadata).semantic_parameter_key??null})).sort((a,b)=>String(a.id).localeCompare(String(b.id),'en'));
 return Object.fromEntries(input.resources.flatMap(r=>{
  const id=String(r.row_id);if(!prices[id]||!isObject(r.inclusion_ast)||typeof r.procurement_eligible!=='boolean')return [];
  return [[id,canonicalEstimateSha256HexText(canonicalEstimateStableJson({version:'canonical-manual-exclusion-binding/v1',
   priceBinding:prices[id],inclusionAst:r.inclusion_ast,procurementEligible:r.procurement_eligible,
   rowType:r.row_type??null,semanticOwner:r.semantic_owner??null,parameters}))]];
 }));
}

/** Stored unit prices and exact stored exclusions can migrate with matching
 * source evidence. Quantities, additions, new inclusions and custom rows cannot. */
export function canonicalStoredManualPricesCanMigrate(input:{
 rowOverrides:unknown;customRows:unknown;fromBindings:unknown;toBindings:unknown;
 fromExclusionBindings?:unknown;toExclusionBindings?:unknown;
 currency?:unknown;
}):boolean{
 const overrides=object(input.rowOverrides),from=object(input.fromBindings),to=object(input.toBindings);
 const fromExclusions=object(input.fromExclusionBindings),toExclusions=object(input.toExclusionBindings);
 if(!isObject(input.rowOverrides)||!Array.isArray(input.customRows)||input.customRows.length)return false;
 return Object.entries(overrides).every(([id,value])=>{
  const override=object(value),provenance=object(override.provenance),price=override.unitPrice;
  const hasPrice=Object.hasOwn(override,'unitPrice');
  const hasExclusion=Object.hasOwn(override,'includedInEstimate')||Object.hasOwn(override,'includedInProcurement');
  const evidence=parseCanonicalMachineHourPriceCoverageV1(override.machineHourPriceCoverageV1);
  const evidenceValid=override.machineHourPriceCoverageV1==null||evidence!=null&&hasPrice&&price!=null
    &&/^\d+(?:\.\d+)?$/.test(String(price))&&compareFormulaGraphDecimals(evidence.unitPrice,String(price))===0
    &&evidence.currencyCode===input.currency&&evidence.resourceCode===canonicalMachineHourPriceRequirementV1(id,'machine_hour')?.resourceCode
    &&evidence.source.kind==='MANUAL'&&evidence.source.rowId===id&&evidence.source.priceProvenanceReason===(provenance.reason??null);
  return evidenceValid&&(hasPrice||hasExclusion)&&Object.keys(override).every(key=>['unitPrice','machineHourPriceCoverageV1','provenance','includedInEstimate','includedInProcurement'].includes(key))
   &&provenance.kind==='manual'
   &&(!hasPrice||((price===null||((typeof price==='string'||typeof price==='number')&&String(price).trim()!==''&&Number.isFinite(Number(price))&&Number(price)>=0))
    &&typeof from[id]==='string'&&/^[a-f0-9]{64}$/u.test(from[id] as string)&&from[id]===to[id]))
   &&(!hasExclusion||(override.includedInEstimate===false&&override.includedInProcurement===false
    &&typeof fromExclusions[id]==='string'&&/^[a-f0-9]{64}$/u.test(fromExclusions[id] as string)&&fromExclusions[id]===toExclusions[id]));
 });
}

export function assertCanonicalStoredManualPriceReleaseMigration(input:{
 parentOverrides:unknown;parentCustomRows:unknown;requestedOverrides:unknown;requestedCustomRows:unknown;
 fromBindings:unknown;toBindings:unknown;parentCurrency:unknown;requestedCurrency:unknown;
 fromExclusionBindings?:unknown;toExclusionBindings?:unknown;
}):void{
 if(input.parentCurrency!==input.requestedCurrency
  ||canonicalEstimateStableJson(input.parentOverrides??{})!==canonicalEstimateStableJson(input.requestedOverrides??{})
  ||canonicalEstimateStableJson(input.parentCustomRows??[])!==canonicalEstimateStableJson(input.requestedCustomRows??[])
  ||!canonicalStoredManualPricesCanMigrate({rowOverrides:input.parentOverrides,customRows:input.parentCustomRows??[],fromBindings:input.fromBindings,toBindings:input.toBindings,
   fromExclusionBindings:input.fromExclusionBindings,toExclusionBindings:input.toExclusionBindings,currency:input.parentCurrency}))
  throw Object.assign(new Error('Переход остановлен: совместимость сохранённых ручных цен или строк не подтверждена. Исходная смета и введённые значения сохранены.'),{code:'RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED'});
}
