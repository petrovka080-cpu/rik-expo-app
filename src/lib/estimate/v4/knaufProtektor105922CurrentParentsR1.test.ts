// DRAFT / NOT_RUN. Full public definitions are actual captured data; all
// project facts/manual amendments below are SYNTHETIC and never registry proof.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {prepareKnaufProtektor105922UnboundOverlayR1,prepareKnaufProtektor105922UnboundSevenR1,
  type KnaufProtektorSevenParentGateR1} from '../../../../scripts/estimate/r4a13/knaufProtektor105922ForwardOverlayR1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {knaufProtektor105922PackR1 as pack,knaufProtektor105922FactsR1 as f} from './knaufProtektor105922ForwardR1';

const bytes = readFileSync(resolve(__dirname,'../../../../data/estimate-benchmarks/fixtures/knauf-protektor105922-current-seven-r1.json'));
const fixture = JSON.parse(bytes.toString('utf8')) as {
  schemaVersion:string;provenance:Record<string,unknown>;gate:KnaufProtektorSevenParentGateR1;
  parents:(KnaufProtektorSevenParentGateR1['targets'][number]&{parent:PurchaseGroupRepresentative;manifest:Record<string,unknown>;searchDocument:Record<string,unknown>})[];
};
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
const without=(v:Record<string,unknown>,keys:string[])=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
const owner=pack.ownerRowId;
const SYNTHETIC_FACTS = {q:'24',interior_plaster_material_system:pack.choiceRu.manual,
  knauf_scope_external_corner_scope:pack.choiceRu.hasCorners,[f.count]:'3',[f.length]:'2600',
  [f.product]:pack.choiceRu.product,[f.exposure]:pack.choiceRu.exposure,[f.cutFit]:pack.choiceRu.cutFit,
  [f.stock]:'0',[f.reserve]:'0',[f.multiple]:'1'};
function compile(parent:PurchaseGroupRepresentative,overrides:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>={}) {
  return compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(parent.definition.catalog_id),
    compilerVersion:pack.contract+':actual-parent-synthetic-facts',primaryMeasureParameterId:'q',
    parameterDefinitions:parent.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
    formulaDefinitions:parent.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
    resourceDefinitions:parent.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
    submittedParameters:SYNTHETIC_FACTS,confirmedParameters:{},rowOverrides:overrides,
    priceItems:[],currencyCode:'KGS',maximumResourceRows:parent.resources.length,hashJson:hash});
}

test('the fixture retains all seven actual payloads, 203 bindings and 16 original defaults',()=>{
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('a740bced7a4872a223cac9bbc9c7e4a9341d96d68fff10590aa6161bbfd9fa0f');
  expect(fixture.schemaVersion).toBe('knauf-protektor-public-seven-parent-fixture/v2');
  expect(fixture.provenance).toMatchObject({snapshotSha256:'fc98317e8ec89b6137d81425ec1114202cb467672bc55ad2942025f42ff96f2e',
    bindingSha256:'f4a7ce763c90967a6abade4713d80f3457198f0ecba2033844abe9746a7fcddc',
    snapshotIdentityIsHistorical:true,privateProjectDataIncluded:false,priceRecordsIncluded:false,productionLocatorId:null});
  expect(fixture.gate).toEqual(pack.currentParentGate);
  expect(fixture.parents.map(p=>p.catalogId)).toEqual(pack.targetCatalogIds);
  expect(fixture.parents.map(p=>p.version)).toEqual([8,8,8,8,8,5,5]);
  expect(fixture.parents.reduce((n,p)=>n+p.parent.bindings.length,0)).toBe(203);
  expect(fixture.parents.reduce((n,p)=>n+p.parent.parameters.filter(x=>x.default_value!=null).length,0)).toBe(16);
  for(const item of fixture.parents) {
    expect(hash(item.parent)).toBe(item.parentInputSha256);
    expect(hash(item.manifest)).toBe(item.manifestSha256);expect(hash(item.searchDocument)).toBe(item.searchDocumentSha256);
    expect(item.parent.passport.payload_sha256).toBe(item.payloadSha256);
  }
  expect(pack.targetCatalogIds).not.toContain(pack.excludedCatalogId);
});

test.each(pack.targetCatalogIds)('actual parent %s preserves unrelated scope/defaults and exact manual Q',async catalogId=>{
  const captured=fixture.parents.find(p=>p.catalogId===catalogId)!;
  const before=structuredClone(captured.parent);
  const draft=prepareKnaufProtektor105922UnboundOverlayR1(captured.parent,fixture.gate),next=draft.previewRepresentative;
  expect(captured.parent).toEqual(before);expect(next.definition).toEqual(before.definition);
  expect(next.bindings).toEqual(before.bindings);expect(next.bindings).toHaveLength(29);
  expect(next.resources).toHaveLength(122);expect(next.formulas).toHaveLength(122);
  expect(next.parameters).toHaveLength(before.parameters.length+10);
  expect(draft.addedRowIds).toEqual(pack.informationRows.map(r=>pack.prefix+':'+r.suffix));
  expect(draft.pendingOwnerBinding.locatorId).toBeNull();expect(draft.pendingPriceCompatibility.reviewedCompatibility).toBeNull();
  expect(draft.pendingPriceCompatibility.automaticInheritanceAllowed).toBe(false);
  expect(draft.publicationReady).toBe(false);expect(draft.newDefinitionId).toBeNull();
  expect(next.passport.decision).toMatchObject({status:'WORK_UNBOUND_NOT_PUBLISHABLE',allowed:false});
  expect(draft.savedRevisionMigrationPerformed).toBe(false);
  expect(next.resources.filter(r=>r.row_id!==owner&&!draft.addedRowIds.includes(r.row_id)))
    .toEqual(before.resources.filter(r=>r.row_id!==owner));
  expect(next.formulas.filter(r=>r.formula_id!==pack.ownerFormulaId&&!String(r.formula_id).startsWith(pack.prefix+':formula:')))
    .toEqual(before.formulas.filter(r=>r.formula_id!==pack.ownerFormulaId));
  for(const old of before.parameters) {
    const p=next.parameters.find(x=>x.parameter_id===old.parameter_id)!;
    expect(without(p,['truth_metadata'])).toEqual(without(old,['truth_metadata']));
    expect(without(p.truth_metadata,['formula_consumers','resource_branch_consumers']))
      .toEqual(without(old.truth_metadata,['formula_consumers','resource_branch_consumers']));
  }
  for(const id of [...pack.installationCoverage.baseOwnerRowIds,...pack.installationCoverage.retainedResidualRowIds]) {
    expect(next.resources.find(r=>r.row_id===id)).toEqual(before.resources.find(r=>r.row_id===id));
  }
  const oldOwner=before.resources.find(r=>r.row_id===owner)!;
  for(const r of next.resources.filter(r=>r.row_id===owner||draft.addedRowIds.includes(r.row_id))) {
    expect(r.inclusion_ast.kind).toBe('and');expect(r.inclusion_ast.operands[0]).toEqual(oldOwner.inclusion_ast);
  }
  const amendments={[owner]:{quantity:'8',unitPrice:'91.23',titleRu:'СИНТЕТИЧЕСКИЙ новый профиль <105922>',
    provenance:{kind:'manual',reason:'SYNTHETIC_NEW_SKU_ONLY_NOT_OLD_PRICE_TRANSFER'}}};
  const amendmentsBefore=structuredClone(amendments);
  const result=await compile(next,amendments),r=result.rows.find(x=>x.row_id===owner)!;
  expect(r).toMatchObject({quantity:'8',unit_price:'91.23',title_ru:amendments[owner].titleRu,
    included_in_estimate:false,included_in_procurement:false,amount:null});
  expect((r.calculation_trace as any).purchaseSupplyBlocksV1[0]).toMatchObject({rawManualQuantity:'8',quantum:'75'});
  for(const suffix of ['ordered-bars','manufacturer-bundles','remaining','free-after-reserve']) {
    expect(result.rows.find(x=>x.row_id===pack.prefix+':'+suffix)).toBeUndefined();
    expect(result.preliminaryNeeds.find(x=>x.row_id===pack.prefix+':'+suffix)?.quantity).toBeNull();
  }
  expect(result.preliminaryNeeds.some(x=>x.row_id==='plaster:knauf-materials:open-main-labour')).toBe(true);
  expect(result.preliminaryNeeds.some(x=>x.row_id==='plaster:knauf-materials:open-preparation')).toBe(true);
  expect(amendments).toEqual(amendmentsBefore);expect(captured.parent).toEqual(before);
});

test('a stale payload, changed no-corners guard or substituted eighth identity cannot enter the bounded packet',()=>{
  const parent=structuredClone(fixture.parents[0]!.parent);
  parent.resources.find(r=>r.row_id===owner)!.inclusion_ast={kind:'literal',value:true};
  expect(()=>prepareKnaufProtektor105922UnboundOverlayR1(parent,fixture.gate)).toThrow('EXACT_CAPTURED_PARENT_PAYLOAD_REQUIRED');
  const parents=fixture.parents.map(p=>p.parent);
  expect(()=>prepareKnaufProtektor105922UnboundSevenR1([...parents,parents[0]!],fixture.gate)).toThrow('EXACT_SEVEN_NO_SUBSTITUTED_GROUP_REQUIRED');
  const draft=prepareKnaufProtektor105922UnboundSevenR1(parents,fixture.gate);
  expect(draft.entries).toHaveLength(7);expect(draft.productionRegistryLocatorId).toBeNull();
  expect(draft.publicationReady).toBe(false);
  expect(draft.entries.every(e=>e.pendingOwnerBinding.locatorId===null)).toBe(true);
});

test('the public-parent packet cannot establish compatibility of a generic historical project price',()=>{
  const oldProject={rowId:owner,quantity:'8',unitPrice:'91.23',titleRu:'Мой прежний общий профиль',
    currency:'KGS',sku:null,unit:'m',taxBasis:null,deliveryBasis:null,provenance:{kind:'manual'}};
  const before=structuredClone(oldProject);
  const draft=prepareKnaufProtektor105922UnboundOverlayR1(fixture.parents[0]!.parent,fixture.gate);
  expect(draft.pendingPriceCompatibility).toMatchObject({ownerRowId:owner,automaticInheritanceAllowed:false,reviewedCompatibility:null});
  expect(draft.pendingPriceCompatibility.required).toEqual(['exact SKU 105922','metre unit','currency','tax basis','delivery basis']);
  expect(oldProject).toEqual(before);
  // This asserts no automatic migration/authorization, not a completed price
  // migration or a publisher-level compatibility check. Those gates stay open.
  expect(draft.savedRevisionMigrationPerformed).toBe(false);expect(draft.publicationReady).toBe(false);
});
