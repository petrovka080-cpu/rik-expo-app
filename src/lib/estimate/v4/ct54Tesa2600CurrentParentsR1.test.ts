// DRAFT / NOT_RUN. Public parent payloads come from the actual closed PG8
// snapshot. Project inputs, prices, manual amendments and the locator below
// are explicitly SYNTHETIC TEST DATA, never project/price/registry evidence.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {ct54ReadyFacadeControlFactsS2763} from './ct54ReadyFacadeSeriesS2763';
import {
  ct54ProtectionPackS2770 as legacyPack, ct54ProtectionPrefixS2770 as legacyPrefix,
  ct54Tesa2600PackR1 as pack, ct54Tesa2600PrefixR1 as prefix,
} from './ct54RectangularProtectionS2770';
import {overlayCt54Tesa2600ForwardR1, type Ct54CurrentEightParentGateR1} from '../../../../scripts/estimate/r4a13/ct54Tesa2600ForwardOverlayR1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type CapturedParent = Ct54CurrentEightParentGateR1['targets'][number] & {
  definitionSha256:string;
  parent:PurchaseGroupRepresentative;
};
type PublicFixture = {
  schemaVersion:'ct54-tesa2600-public-current-parent-fixture/v1';
  provenance:{snapshotSha256:string;guardReceiptSha256:string;rootReadbackSha256:string;
    parentGateSha256:string;privateProjectDataIncluded:false;sourceRegistryLocatorId:null};
  currentParentGate:Ct54CurrentEightParentGateR1;
  parents:CapturedParent[];
};
const fixtureBytes = readFileSync(resolve(__dirname,
  '../../../../data/estimate-benchmarks/fixtures/ct54-tesa2600-current-eight-parents-r1.json'));
const fixture = JSON.parse(fixtureBytes.toString('utf8')) as PublicFixture;
const gate = fixture.currentParentGate;
const hash = (value:unknown) => createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
const byteHash = (value:Uint8Array) => createHash('sha256').update(value).digest('hex');
const without = (value:Record<string,unknown>,keys:readonly string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));

// This UUID is a unit-test binding only. No assertion says it is registered.
// The production locator remains null in the fixture and future authoring gate.
const SYNTHETIC_TEST_LOCATOR_NOT_REGISTRY = {
  id:'80000000-0000-4000-8000-000000002600',
  artifactSha256:pack.sources.tesa2026.sha256,
  locatorRu:pack.sources.tesa2026.locator,
} as const;
const oldFilm = legacyPrefix+':film-order',oldTape = legacyPrefix+':tape-order';
const newFilm = prefix+':film-order',newTape = prefix+':tape-order';
const originalFilm = 'paint:ct54-simple-ready-facade:protection-film';
const originalTape = 'paint:ct54-simple-ready-facade:protection-tape';
const suffixes = ['covered-area','film-strip-area','film-tail','film-trim','tape-length',
  'film-opened','film-order','film-remaining','film-free','tape-opened','tape-order','tape-remaining','tape-free'];
const expectedNewRows = suffixes.map(s=>prefix+':'+s);
const otherNeedSuffixes = ['mixer-provision','roller','eye-protection','skin-protection',
  'weather-protection','cleaning-water','quality-completion','extra-logistics','cleanup-waste',
  'inherited-materials_39','inherited-consumables_43','inherited-equipment_51','inherited-equipment_52',
  'inherited-preparation_45','inherited-preparation_46','inherited-preparation_47','inherited-overhead_35','inherited-tax_36'];
const otherNeeds = otherNeedSuffixes.map(s=>'paint:ct54-simple-ready-facade:'+s).sort();
const SYNTHETIC_PROJECT_FACTS = {
  ...ct54ReadyFacadeControlFactsS2763,
  // The inherited baseline q=100 is not a project default. These measurements
  // and zero stock are authored synthetic facts for this control only.
  q:'35.5',facade_norm_area_m2:'40',selected_paint_can_l:'15',
  ct54_15l_stock_cans:'0',ct54_15l_reserve_cans:'0',ct54_15l_supplier_can_multiple:'1',
};
const SYNTHETIC_LEGACY_FACTS = {
  ...SYNTHETIC_PROJECT_FACTS,ct54_protection_method:legacyPack.exactChoiceRu,
  ct54_protection_site:legacyPack.exactSiteRu,ct54_protection_rectangle_count:'4',
  ct54_protection_cut_width_m:'1.2',ct54_protection_cut_height_m:'1.5',
  ct54_protection_film_stock:'0',ct54_protection_film_reserve:'0',ct54_protection_film_supplier_multiple:'1',
  ct54_protection_tape_stock:'0',ct54_protection_tape_reserve:'0',ct54_protection_tape_supplier_multiple:'1',
};
const SYNTHETIC_NEW_FACTS = {
  ...SYNTHETIC_PROJECT_FACTS,ct54_protection_method:pack.exactChoiceRu,
  ct54_tesa2600_site:pack.exactSiteRu,ct54_tesa2600_rectangle_count:'3',
  ct54_tesa2600_cut_width_m:'1.2',ct54_tesa2600_cut_height_m:'2.2',
  ct54_tesa2600_film_stock:'0',ct54_tesa2600_film_reserve:'0',ct54_tesa2600_film_supplier_multiple:'1',
  ct54_tesa2600_tape_stock:'0',ct54_tesa2600_tape_reserve:'0',ct54_tesa2600_tape_supplier_multiple:'1',
};
const SYNTHETIC_MANUAL_AMENDMENTS = {
  [oldFilm]:{quantity:'12',unitPrice:'91.23',titleRu:'СИНТЕТИЧЕСКИЙ ТЕСТ: сохранённая плёнка 14 × 1,8 м',
    provenance:{kind:'manual',reason:'SYNTHETIC_LEGACY_ORDER_NOT_PROJECT_EVIDENCE'}},
  [oldTape]:{unitPrice:'23.45',titleRu:'СИНТЕТИЧЕСКИЙ ТЕСТ: сохранённая лента для укрытия 1,8 м',
    provenance:{kind:'manual',reason:'SYNTHETIC_LEGACY_PRICE_NOT_PRICE_EVIDENCE'}},
  [originalFilm]:{unitPrice:'4.56',titleRu:'СИНТЕТИЧЕСКИЙ ТЕСТ: старая цена плёнки за м²',
    provenance:{kind:'manual',reason:'SYNTHETIC_OLD_AREA_PRICE_MUST_NOT_TRANSFER'}},
  [originalTape]:{unitPrice:'7.89',provenance:{kind:'manual',reason:'SYNTHETIC_OLD_METRE_PRICE_MUST_NOT_TRANSFER'}},
};
function captured(catalogId:string) {
  const found = fixture.parents.find(p=>p.catalogId === catalogId);
  if(!found) throw new Error('ACTUAL_EIGHT_PARENT_FIXTURE_MISSING:'+catalogId);
  return found;
}
function overlay(parent:PurchaseGroupRepresentative) {
  return overlayCt54Tesa2600ForwardR1(parent,gate,SYNTHETIC_TEST_LOCATOR_NOT_REGISTRY);
}
function compile(parent:PurchaseGroupRepresentative,parameters:Record<string,unknown>,
  rowOverrides:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>={}) {
  const input:CanonicalEstimateCompileCoreInput = {
    operation:'recalculate',catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract+':synthetic-current-parent-control',
    primaryMeasureParameterId:'q',
    parameterDefinitions:parent.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
    formulaDefinitions:parent.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
    resourceDefinitions:parent.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
    submittedParameters:parameters,confirmedParameters:{},rowOverrides,
    priceItems:[],currencyCode:'KGS',maximumResourceRows:120,hashJson:hash,
  };
  return compileCanonicalEstimateCore(input);
}
type Result = Awaited<ReturnType<typeof compile>>;
function expectOpenSourceNeeds(result:Result,parent:PurchaseGroupRepresentative,expected:readonly string[]) {
  const unresolved = new Set(parent.resources.filter(row=>row.row_id.startsWith('paint:ct54-simple-ready-facade:')
    && row.source_metadata?.sourceNormQuantityAccepted === false).map(row=>String(row.row_id)));
  const needs = result.preliminaryNeeds.filter(need=>unresolved.has(need.row_id));
  expect(needs.map(need=>need.row_id).sort()).toEqual([...expected].sort());
  for(const need of needs) {
    expect(need.quantity).toBeNull();
    expect(need.unit_price).toBeNull();
    expect(need.missing_parameter_ids.length).toBeGreaterThan(0);
    expect(result.rows.some(row=>row.row_id === need.row_id)).toBe(false);
    const definition = parent.resources.find(row=>row.row_id === need.row_id)!;
    expect(definition.source_metadata.sourceNormQuantityAccepted).toBe(false);
    expect(definition.source_metadata.full_technical_acceptance).toBe(false);
  }
}

test('the fixture is the complete actual eight-parent payload, with a synthetic locator kept separate',()=>{
  expect(byteHash(fixtureBytes)).toBe('9ba852692ce86f60ddaa1c2156d72a79d08a6f6d700e2820e90e4ec0443ae625');
  expect(fixture.schemaVersion).toBe('ct54-tesa2600-public-current-parent-fixture/v1');
  expect(fixture.provenance).toMatchObject({
    snapshotSha256:'39bdbfd3e07b497f538cbf59773d493fd4cbe442e413fa0520bd922d09844784',
    guardReceiptSha256:'f3cb291b7bcb33c6dbadb744a2f0f4a3c4d8b01ef716c6ce26da16aae06e05a6',
    rootReadbackSha256:'591482ef7150c358a0084c9797502bb7ab0794cda6e760c366a5dfdae3643534',
    parentGateSha256:'e4472e2e37440cdf2335e310392158aef77219aae29d71b74c17109a4c7e83a3',
    privateProjectDataIncluded:false,sourceRegistryLocatorId:null,
  });
  expect(gate.status).toBe('PASS_READ_ONLY_CURRENT_CT54_EIGHT_PARENT_SNAPSHOT');
  expect(gate.snapshotSha256).toBe(fixture.provenance.snapshotSha256);
  expect(fixture.parents.map(p=>p.catalogId)).toEqual(pack.targetCatalogIds);
  expect(gate.targets.map(p=>p.catalogId)).toEqual(pack.targetCatalogIds);
  expect(fixture.parents.map(p=>p.definitionVersion)).toEqual([5,5,5,6,5,5,5,6]);
  expect(new Set(fixture.parents.map(p=>p.definitionId)).size).toBe(8);
  expect(new Set(fixture.parents.map(p=>p.parentInputSha256)).size).toBe(8);
  for(const item of fixture.parents) {
    expect(hash(item.parent)).toBe(item.parentInputSha256);
    expect(item.parent.definition).toMatchObject({catalog_id:item.catalogId,id:item.definitionId,
      definition_version:item.definitionVersion,definition_sha256:item.definitionSha256});
    expect(item.parent.baseline.id).toBe(item.baselineId);
    expect(item.parent.passport.payload_sha256).toBe(item.payloadSha256);
    expect(gate.targets.find(p=>p.catalogId === item.catalogId)).toEqual(without(item,['parent','definitionSha256']));
    expect(item.parent.parameters).toHaveLength(57);expect(item.parent.formulas).toHaveLength(107);
    expect(item.parent.resources).toHaveLength(107);expect(item.parent.bindings).toHaveLength(27);
    expect(item.parent.parameters.every(p=>p.default_value === null)).toBe(true);
  }
  const tampered = structuredClone(fixture.parents[0]!.parent);
  tampered.resources[0]!.title_ru += ' SYNTHETIC_PAYLOAD_TAMPER';
  expect(()=>overlay(tampered)).toThrow('EXACT_CURRENT_PARENT_PAYLOAD_REQUIRED');
});

test.each(pack.targetCatalogIds)('actual parent %s preserves inherited data, defaults and authored old prices',async catalogId=>{
  const source = captured(catalogId),before = structuredClone(source.parent);
  const projected = overlay(source.parent),next = projected.representative;
  expect(source.parent).toEqual(before);
  expect(next.definition).toEqual(before.definition);
  expect(next.parameters).toHaveLength(69);expect(next.formulas).toHaveLength(120);
  expect(next.resources).toHaveLength(120);expect(next.bindings).toHaveLength(40);
  expect(projected.addedRowIds).toEqual(expectedNewRows);
  expect(projected.strengthenedLegacyRowIds).toEqual(suffixes.map(s=>legacyPrefix+':'+s));
  expect(projected.conditionallyReplacedRowIds).toEqual([originalFilm,originalTape]);
  expect(projected.savedRevisionMigrationPerformed).toBe(false);
  expect(next.formulas.slice(0,before.formulas.length)).toEqual(before.formulas);
  expect(next.bindings.slice(0,before.bindings.length)).toEqual(before.bindings);
  expect(next.bindings.slice(before.bindings.length).map(b=>[b.row_id,b.locator_id]))
    .toEqual(expectedNewRows.map(id=>[id,SYNTHETIC_TEST_LOCATOR_NOT_REGISTRY.id]));
  expect(next.parameters.every(p=>p.default_value === null)).toBe(true);
  for(const old of before.parameters) {
    const current = next.parameters.find(p=>p.parameter_id === old.parameter_id)!;
    expect(without(current,['truth_metadata','constraints_json'])).toEqual(without(old,['truth_metadata','constraints_json']));
    expect(without(current.truth_metadata,['formula_consumers','resource_branch_consumers']))
      .toEqual(without(old.truth_metadata,['formula_consumers','resource_branch_consumers']));
    expect(current.constraints_json).toEqual(old.parameter_id === 'ct54_protection_method'
      ? {...old.constraints_json,values:[...old.constraints_json.values,pack.exactChoiceRu]} : old.constraints_json);
  }
  const baselineChanged = ['parameter_schema_sha256','formula_consumer_ids','resource_consumer_row_ids',
    'uom_by_parameter','normative_source_ids','guide_provenance_ru'];
  expect(without(next.baseline,baselineChanged)).toEqual(without(before.baseline,baselineChanged));
  // In particular the validation baseline is retained, never promoted to new
  // project geometry, default stock, a source norm or a new product selection.
  expect(next.baseline.input_values).toEqual({q:100,facade_technology_choice:'Исходная проектная технология'});
  for(const key of ['uom_by_parameter','normative_source_ids','guide_provenance_ru']) {
    expect(Object.fromEntries(Object.keys(before.baseline[key]).map(id=>[id,next.baseline[key][id]])))
      .toEqual(before.baseline[key]);
  }
  for(const old of before.resources) {
    const current = next.resources.find(row=>row.row_id === old.row_id)!;
    if(old.row_id.startsWith(legacyPrefix+':')) {
      expect(without(current,['row_sha256','resource_graph','source_metadata']))
        .toEqual(without(old,['row_sha256','resource_graph','source_metadata']));
      expect(without(current.resource_graph,['inputParameterIds'])).toEqual(without(old.resource_graph,['inputParameterIds']));
      expect(new Set(current.resource_graph.inputParameterIds)).toEqual(new Set([
        ...old.resource_graph.inputParameterIds,'ct54_protection_site','ct54_protection_rectangle_count',
        'ct54_protection_cut_width_m','ct54_protection_cut_height_m']));
      expect(without(current.source_metadata,['forwardGeometryApplicabilityGate'])).toEqual(old.source_metadata);
    } else if([originalFilm,originalTape].includes(old.row_id)) {
      expect(without(current,['row_sha256','inclusion_ast','source_metadata']))
        .toEqual(without(old,['row_sha256','inclusion_ast','source_metadata']));
      expect(current.inclusion_ast.kind).toBe('and');
      expect(current.inclusion_ast.operands).toHaveLength(2);
      expect(current.inclusion_ast.operands[0]).toEqual(old.inclusion_ast);
      expect(without(current.source_metadata,['tesa2600ForwardConditionalReplacement'])).toEqual(old.source_metadata);
    } else expect(current).toEqual(old);
  }
  expect(without(next.passport,['decision'])).toEqual(without(before.passport,['decision']));
  expect(without(next.passport.decision,['tesa2600ForwardScope'])).toEqual(before.passport.decision);
  expect(next.passport.decision).toMatchObject({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
    wholeFacadeGroupComplete:false,completeTechnicalEstimateAccepted:false});

  // The snapshot has definitions, not user amendments or price evidence.
  // These authored test overrides are replayed separately through the real core.
  const authored = JSON.parse(JSON.stringify({parameters:SYNTHETIC_LEGACY_FACTS,rowOverrides:SYNTHETIC_MANUAL_AMENDMENTS}));
  const authoredBefore = structuredClone(authored);
  const oldResult = await compile(source.parent,authored.parameters,authored.rowOverrides);
  const forwardOld = await compile(next,authored.parameters,authored.rowOverrides);
  for(const id of [oldFilm,oldTape]) {
    const fields = (result:Result) => {
      const row = result.rows.find(r=>r.row_id === id)!;
      expect(row).toBeDefined();
      return {rowId:row.row_id,title:row.title_ru,quantity:row.quantity,unit:row.unit_id,
        price:row.unit_price,included:row.included_in_procurement};
    };
    expect(fields(forwardOld)).toEqual(fields(oldResult));
  }
  expect(forwardOld.rows.find(r=>r.row_id === oldFilm)).toMatchObject({quantity:'12',unit_price:'91.23',
    title_ru:SYNTHETIC_MANUAL_AMENDMENTS[oldFilm]!.titleRu});
  expect(forwardOld.rows.find(r=>r.row_id === oldTape)?.unit_price).toBe('23.45');
  const switched = await compile(next,{...authored.parameters,...SYNTHETIC_NEW_FACTS},authored.rowOverrides);
  for(const id of [newFilm,newTape]) {
    expect(switched.rows.find(r=>r.row_id === id)).toMatchObject({quantity:'1',unit_price:null});
    expect(switched.rows.filter(r=>r.row_id === id && r.included_in_procurement)).toHaveLength(1);
  }
  expect(switched.rows.some(row=>[oldFilm,oldTape,originalFilm,originalTape].includes(row.row_id))).toBe(false);
  expect(switched.rows.filter(row=>row.row_id.startsWith(prefix+':') && row.included_in_procurement).map(row=>row.row_id).sort())
    .toEqual([newFilm,newTape].sort());
  // Old quantity/title/prices remain authored, while a different SKU receives
  // none of them. This is not a persisted revision or UI reopen assertion.
  expect(authored).toEqual(authoredBefore);
  expect(source.parent).toEqual(before);
  expectOpenSourceNeeds(switched,next,otherNeeds);
});

test.each(pack.targetCatalogIds)('actual parent %s keeps the tape-layout gap and the 18 other source needs',async catalogId=>{
  const source = captured(catalogId),before = structuredClone(source.parent);
  const next = overlay(source.parent).representative;
  const parameters = {...SYNTHETIC_NEW_FACTS,ct54_tesa2600_cut_width_m:'10',ct54_tesa2600_cut_height_m:'2.6'};
  expect(Object.keys(parameters).some(id=>id.startsWith('open_qty_') || id.startsWith('ct54_inherited_open_'))).toBe(false);
  const result = await compile(next,parameters);
  expect(result.rows.find(row=>row.row_id === newFilm)).toMatchObject({quantity:'3',unit_price:null});
  expect(result.rows.filter(row=>row.row_id === newFilm && row.included_in_procurement)).toHaveLength(1);
  for(const suffix of ['tape-opened','tape-order','tape-remaining','tape-free']) {
    expect(result.rows.some(row=>row.row_id === prefix+':'+suffix)).toBe(false);
  }
  expect(result.rows.find(row=>row.row_id === prefix+':tape-length')).toMatchObject({quantity:'45.6',included_in_procurement:false});
  expectOpenSourceNeeds(result,next,[...otherNeeds,originalTape]);
  expect(result.preliminaryNeeds.find(need=>need.row_id === originalTape)?.missing_parameter_ids).toContain('open_qty_protection_tape');
  expect(result.preliminaryNeeds.some(need=>need.row_id === originalFilm)).toBe(false);
  expect(result.rows.filter(row=>row.row_id.startsWith(prefix+':') && row.included_in_procurement).map(row=>row.row_id)).toEqual([newFilm]);
  expect(next.resources.filter(row=>row.row_id.startsWith(prefix+':')).every(row=>row.category === 'material')).toBe(true);
  for(const id of otherNeeds) {
    expect(next.resources.find(row=>row.row_id === id)).toEqual(before.resources.find(row=>row.row_id === id));
  }
  expect(next.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
  expect(next.passport.decision.tesa2600ForwardScope.newPaidLabour).toBe(0);
  expect(source.parent).toEqual(before);
});
