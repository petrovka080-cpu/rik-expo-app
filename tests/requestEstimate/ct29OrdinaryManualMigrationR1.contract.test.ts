import fixture from '../../data/estimate-benchmarks/fixtures/ct29-ordinary-manual-migration-r1.json';
import {admitCt29OrdinaryManualMigrationR1 as admit,ct29OrdinaryMigrationSemanticSha256R1 as semantic,
 CT29_ORDINARY_MANUAL_MIGRATION_R1 as policy} from '../../src/lib/estimate/backendPlatform/canonicalCt29OrdinaryManualMigrationR1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualQuantityMigrationBindings as quantities,
 canonicalStoredManualPricesCanMigrate as eligible,assertCanonicalStoredManualPriceReleaseMigration as assertMigration}
 from '../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {ct29ExistingMineralGeometryPackR1,ct29ExistingMineralPrefixS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorGeometryDefinitionR1} from '../../src/lib/estimate/v4/ct29IndoorPlasterS2754';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';

const from=fixture.records[0]!,to=fixture.records[1]!;
const input=()=>({fromIdentity:structuredClone(from.identity),toIdentity:structuredClone(to.identity),
 from:structuredClone(from.model),to:structuredClone(to.model)});
const delivery=policy.preservedBudgetRowId,net=policy.resetOnlyRowId;
const rowOverrides={
 [delivery]:{quantity:3.75,unitPrice:1260.5,provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}},
 [net]:{quantity:null,provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}},
};
const args=()=>{const a=admit(input())!;return {rowOverrides,customRows:[],currency:'KGS',
 fromBindings:prices(from.model),toBindings:a.priceBindings,fromQuantityBindings:quantities(from.model),toQuantityBindings:a.quantityBindings};};

describe('saved CT29 numeric edits survive only the exact reviewed ordinary geometry transition',()=>{
 test('both complete persisted semantic models and immutable definition identities match the finite policy',()=>{
  expect(semantic(from.model)).toBe(policy.from.semanticSha256);
  expect(semantic(to.model)).toBe(policy.to.semanticSha256);
  const admitted=admit(input())!;
  expect(admitted.definitionId).toBe(policy.from.id);
  expect(Object.keys(admitted.priceBindings)).toEqual([delivery]);
  expect(Object.keys(admitted.quantityBindings).sort()).toEqual([delivery,net].sort());
  expect(admitted.exclusionBindings).toEqual({});
  expect(policy.missingNormClosed).toBe(false);
 });
 test('retains the exact saved3.75 quantity and1260.5 price; a null net override returns to the target calculation',()=>{
  expect(eligible(args())).toBe(true);
  const value=args();expect(()=>assertMigration({...value,parentOverrides:rowOverrides,requestedOverrides:rowOverrides,
   parentCustomRows:[],requestedCustomRows:[],parentCurrency:'KGS',requestedCurrency:'KGS'})).not.toThrow();
  expect(eligible({...value,toQuantityBindings:quantities(to.model),toBindings:prices(to.model)})).toBe(false);
 });
 test.each(['identity','unit','formula','owner','source','input-authority','scope','procurement'])('rejects altered %s before granting the finite exception',kind=>{
  const v=input();
  if(kind==='identity')v.toIdentity.id=policy.from.id;
  const resource=v.to.resources.find(row=>row.row_id===delivery)!;
  if(kind==='unit')resource.unit_id='kg';
  if(kind==='formula'){
   const formula:Record<string,unknown>=v.to.formulas.find(row=>row.formula_id===resource.formula_id)!;
   formula.ast={kind:'literal',value:'1'};
  }
  if(kind==='owner')resource.cost_owner_id=net;
  if(kind==='source')resource.source_metadata.sourceRole='QUANTIFIED_NORM';
  if(kind==='scope')resource.resource_graph.scopeContextParameterIds=['layer_thickness_mm'];
  if(kind==='procurement')resource.procurement_eligible=true;
  if(kind==='input-authority')v.to.parameters.find(row=>row.parameter_id===policy.newInternalQuantityParameterId)!.truth_metadata.value_source_role='NORMATIVE';
  expect(admit(v)).toBeNull();
 });
 test('new row edits, a fixed net quantity, missing quantity evidence and custom rows stay rejected',()=>{
  const value=args();
  expect(eligible({...value,rowOverrides:{...rowOverrides,[net]:{quantity:3030.5,provenance:{kind:'manual'}}}})).toBe(false);
  expect(eligible({...value,fromQuantityBindings:undefined})).toBe(false);
  expect(eligible({...value,customRows:[{clientRowId:'added'}]})).toBe(false);
  expect(eligible({...value,rowOverrides:{[delivery]:{...rowOverrides[delivery],includedInEstimate:true}}})).toBe(false);
  const request={...value,parentOverrides:rowOverrides,requestedOverrides:rowOverrides,parentCustomRows:[],requestedCustomRows:[],parentCurrency:'KGS',requestedCurrency:'KGS'};
  expect(()=>assertMigration({...request,requestedOverrides:{...rowOverrides,[delivery]:{...rowOverrides[delivery],quantity:4}}})).toThrow();
  expect(()=>assertMigration({...request,requestedCurrency:'USD'})).toThrow();
 });
 test.each([0,'3.75'])('an unchanged physical model can retain an explicit saved quantity%s with exact evidence',quantity=>{
  const q=quantities(to.model),p=prices(to.model);
  expect(eligible({rowOverrides:{[delivery]:{quantity,provenance:{kind:'manual'}}},customRows:[],fromBindings:p,toBindings:p,fromQuantityBindings:q,toQuantityBindings:q})).toBe(true);
  expect(eligible({rowOverrides:{[delivery]:{quantity,provenance:{kind:'catalog'}}},customRows:[],fromBindings:p,toBindings:p,fromQuantityBindings:q,toQuantityBindings:q})).toBe(false);
 });
 test('a carried manual budget leaves the delivery source unresolved and excluded from payable totals',async()=>{
  const geometry={plaster_area_m2:160,layer_thickness_mm:10.5},definition=buildCt29IndoorGeometryDefinitionR1(
   ct29ExistingMineralGeometryPackR1(1),ct29ExistingMineralPrefixS2754(1));
  const result=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'ct29-manual-migration-test',catalogId:policy.catalogId,
   parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],rowOverrides,
   submittedParameters:geometry,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,
   maximumResourceRows:definition.resources.length});
  const need=result.preliminaryNeeds.find(row=>row.row_id===delivery)!;
  expect(need).toMatchObject({quantity:'3.75',unit_price:'1260.5',need_state:'QUANTITY_REQUIRED',selected:true,
   missing_parameter_ids:['ct29_logistics_cleanup_qty']});
  expect(result.rows.some(row=>row.row_id===delivery)).toBe(false);
  expect(result.rows.find(row=>row.row_id===net)?.quantity).toBe('3024');
 });
 test('admission does not mutate either immutable model or the saved manual values',()=>{
  const v=input(),before=JSON.stringify(v),saved=JSON.stringify(rowOverrides);admit(v);eligible(args());
  expect(JSON.stringify(v)).toBe(before);expect(JSON.stringify(rowOverrides)).toBe(saved);
 });
 test('the worker transport price-key projection adds no physical norm and cannot change semantic admission',()=>{
  const v=input();
  const toModel={...v.to,resources:v.to.resources.map(row=>({...row,_binding_price_keys:['existing-price-route']}))};
  expect(semantic(toModel)).toBe(policy.to.semanticSha256);
  expect(admit({...v,to:toModel})).not.toBeNull();
 });
});
