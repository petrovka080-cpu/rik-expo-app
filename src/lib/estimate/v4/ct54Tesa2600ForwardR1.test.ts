// DRAFT / NOT_RUN. Only new width, branch isolation and forward-parent gates.
// The 26 previously accepted arithmetic controls are not repeated here.
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {
  ct54ProtectionPackS2770 as legacyPack,ct54ProtectionPrefixS2770 as legacyPrefix,
  ct54RectangularProtectionDefinitionS2770,ct54RectangularProtectionForwardDefinitionS2770,ct54Tesa2600DefinitionR1,
  ct54Tesa2600PackR1 as pack,ct54Tesa2600PrefixR1 as prefix,
} from './ct54RectangularProtectionS2770';
import {overlayCt54Tesa2600ForwardR1} from '../../../../scripts/estimate/r4a13/ct54Tesa2600ForwardOverlayR1';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {serialize,deserialize} from 'node:v8';
// Expo installs a clone polyfill that materializes sparse array holes.
// Normalize only this test's captured data through Node's lossless host clone.
const cloneLegacyFactoryData=<T,>(value:T):T=>deserialize(serialize(value)) as T;
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';

const facts:Record<string,unknown> = {
  ct54_protection_method:pack.exactChoiceRu,ct54_tesa2600_site:pack.exactSiteRu,
  ct54_tesa2600_rectangle_count:'3',ct54_tesa2600_cut_width_m:'1.2',ct54_tesa2600_cut_height_m:'2.2',
  ct54_tesa2600_film_stock:'0',ct54_tesa2600_film_reserve:'0',ct54_tesa2600_film_supplier_multiple:'1',
  ct54_tesa2600_tape_stock:'0',ct54_tesa2600_tape_reserve:'0',ct54_tesa2600_tape_supplier_multiple:'1',
};
const compile = (input:Record<string,unknown>) => compileAutomaticConstructionOwnerR1({
  catalogId:pack.targetCatalogIds[0],compilerVersion:pack.contract,
  primaryMeasureParameterId:'ct54_tesa2600_rectangle_count',definition:ct54Tesa2600DefinitionR1(),submittedParameters:input,
});
type Result = Awaited<ReturnType<typeof compile>>;
const quantity = (r:Result,id:string) => r.rows.find(row=>row.row_id === prefix+':'+id)?.quantity;

test('the 2.6 m profile derives its own admissible geometry and one included top tape',async()=>{
  const r = await compile(facts);
  expect(Object.fromEntries(['film-opened','covered-area','film-strip-area','film-trim','film-tail','tape-length','film-order','tape-order']
    .map(id=>[id,quantity(r,id)]))).toEqual({'film-opened':'1','covered-area':'7.92','film-strip-area':'9.36',
    'film-trim':'1.44','film-tail':'10.4','tape-length':'16.8','film-order':'1','tape-order':'1'});
  expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id).sort())
    .toEqual([prefix+':film-order',prefix+':tape-order'].sort());
  expect(r.rows.some(row=>row.category === 'labor' || row.category === 'waste')).toBe(false);
});

test('3 rectangles of 10 × 2.6 m preserve the tape-layout gap',async()=>{
  const r = await compile({...facts,ct54_tesa2600_cut_width_m:'10',ct54_tesa2600_cut_height_m:'2.6'});
  expect(quantity(r,'film-opened')).toBe('3');
  expect(quantity(r,'film-strip-area')).toBe('78');
  expect(quantity(r,'film-trim')).toBe('0');
  expect(quantity(r,'tape-length')).toBe('45.6');
  expect(quantity(r,'tape-order')).toBeUndefined();
  expect(quantity(r,'tape-remaining')).toBeUndefined();
  // The selected parent's original unresolved tape row is retained by the
  // forward overlay; its actual 8-parent compile requires the pending snapshot.
});

test.each([
  {ct54_tesa2600_cut_height_m:'2.601'}, {ct54_tesa2600_cut_width_m:'14.001'},
  {ct54_tesa2600_rectangle_count:'1001'}, {ct54_tesa2600_rectangle_count:'1.5'},
  {ct54_tesa2600_cut_width_m:'0'}, {ct54_tesa2600_cut_height_m:'0'},
  {ct54_tesa2600_site:'Непроверенный металл; повернуть полотно или соединить полосы'},
])('rejects an unadmitted new-width fact: %o',async patch=>{
  await expect(compile({...facts,...patch})).rejects.toThrow();
});

test('film and tape use independent stock, reserve and supply multiples',async()=>{
  const r = await compile({...facts,ct54_tesa2600_film_reserve:'1',ct54_tesa2600_film_supplier_multiple:'4',
    ct54_tesa2600_tape_stock:'2'});
  expect(quantity(r,'film-order')).toBe('4');expect(quantity(r,'film-remaining')).toBe('3');
  expect(quantity(r,'film-free')).toBe('2');expect(quantity(r,'tape-order')).toBe('0');
  expect(quantity(r,'tape-remaining')).toBe('1');
});

test('the old stock/geometry inputs never fill missing facts of the selected new SKU',async()=>{
  const {ct54_tesa2600_film_stock:_stock,...withoutStock} = facts;
  const r = await compile(withoutStock);
  expect(quantity(r,'film-order')).toBeUndefined();
  expect(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes('ct54_tesa2600_film_stock'))).toBe(true);
  const newIds = new Set(ct54Tesa2600DefinitionR1().parameters.map(p=>p.parameter_id));
  const oldIds = ct54RectangularProtectionDefinitionS2770().parameters.map(p=>p.parameter_id);
  expect(oldIds.filter(id=>newIds.has(id))).toEqual(['ct54_protection_method']);
});

test('the old function retains its 1.8 m enum, row identities, bounds and no new defaults',()=>{
  const old = ct54RectangularProtectionDefinitionS2770(),next = ct54Tesa2600DefinitionR1();
  expect(old.parameters.find(p=>p.parameter_id === 'ct54_protection_method')?.constraints_json?.values)
    .toEqual([legacyPack.otherChoiceRu,legacyPack.exactChoiceRu]);
  expect(old.parameters.find(p=>p.parameter_id === 'ct54_protection_cut_height_m')?.constraints_json?.max).toBe(1.8);
  expect(old.resources.every(r=>r.row_id.startsWith(legacyPrefix+':') && !r.row_id.includes(':tesa2600:'))).toBe(true);
  expect(next.resources.every(r=>r.row_id.startsWith(prefix+':'))).toBe(true);
  expect(next.parameters.every(p=>p.default_value == null)).toBe(true);
  expect(next.runtimeInput).toEqual({});
});

test('source-bound public names identify 2.6 m without borrowing the historical 1.8 m alias',()=>{
  const d = ct54Tesa2600DefinitionR1();
  for(const row of d.resources) {
    const p = parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1);
    expect(p).not.toBeNull();expect(p?.sourceTitleRu).toBe(row.title_ru);
    expect(p?.specificationRu).toContain('14 × 2,6 м');
    expect(p?.nameRu).not.toMatch(/1,8|1\.8|paint:|ct54_tesa2600/);
  }
});

test('all 13 new public details describe their own SKU, measurement and payment role',()=>{
  const d = ct54Tesa2600DefinitionR1();
  const contracts = [
  [
    "covered-area",
    "m2",
    "Площадь одинаковых укрытий по фактической ширине и высоте с припусками, м²."
  ],
  [
    "film-strip-area",
    "m2",
    "Площадь полос плёнки tesa 4369 полной ширины 2,6 м до обрезки по высоте, м²."
  ],
  [
    "film-tail",
    "m",
    "Суммарная длина концевых отрезков открытых рулонов tesa 4369 шириной 2,6 м, м."
  ],
  [
    "film-trim",
    "m2",
    "Площадь обрезков по высоте полос плёнки tesa 4369 шириной 2,6 м, м²."
  ],
  [
    "tape-length",
    "m",
    "Справочная длина ленты tesa 4363 на две боковые и нижнюю стороны укрытий, м."
  ],
  [
    "film-opened",
    "item",
    "Справочное число открываемых рулонов плёнки tesa 4369 размером 14 × 2,6 м по карте раскроя."
  ],
  [
    "film-order",
    "item",
    "Заказ плёнки tesa 4369 размером 14 × 2,6 м учитывается в целых рулонах; верхняя лента входит в изделие."
  ],
  [
    "film-remaining",
    "item",
    "Справочное число целых нераспечатанных рулонов плёнки tesa 4369 размером 14 × 2,6 м после раскроя."
  ],
  [
    "film-free",
    "item",
    "Справочное число целых нераспечатанных рулонов плёнки tesa 4369 размером 14 × 2,6 м сверх сохраняемого резерва."
  ],
  [
    "tape-opened",
    "item",
    "Справочное число открываемых рулонов ленты tesa 4363 размером 25 м × 50 мм по раскрою целых комплектов на укрытие."
  ],
  [
    "tape-order",
    "item",
    "Заказ ленты tesa 4363 размером 25 м × 50 мм учитывается в целых рулонах."
  ],
  [
    "tape-remaining",
    "item",
    "Справочное число целых нераспечатанных рулонов ленты tesa 4363 размером 25 м × 50 мм после раскроя."
  ],
  [
    "tape-free",
    "item",
    "Справочное число целых нераспечатанных рулонов ленты tesa 4363 размером 25 м × 50 мм сверх сохраняемого резерва."
  ]
] as const;
  expect(d.resources.map(row=>row.row_id.slice(prefix.length+1)).sort()).toEqual(contracts.map(row=>row[0]).sort());
  for(const [suffix,unit,firstDetail] of contracts) {
    const row = d.resources.find(candidate=>candidate.row_id === prefix+':'+suffix)!;
    const descriptor = parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1);
    expect(row.unit_id).toBe(unit);expect(descriptor).not.toBeNull();
    expect(descriptor!.detailsRu[0]).toBe(firstDetail);
    const paid = suffix === 'film-order' || suffix === 'tape-order';
    expect(row.procurement_eligible).toBe(paid);
    expect((row.resource_graph as typeof row.resource_graph & {costTreatment: unknown}).costTreatment).toBe(paid?'OWN_COST':'INFORMATIONAL_SCOPE');
    if(!paid) expect(descriptor!.detailsRu.join(' ')).not.toMatch(/цен[аыуе]/iu);
  }
  const description = (suffix:string) => parseCanonicalPublicResourcePresentationV1(
    d.resources.find(row=>row.row_id === prefix+':'+suffix)!.resource_graph.publicResourcePresentationV1)!.detailsRu;
  expect(description('film-order')).toContain("Цена задаётся за один целый рулон tesa 4369 размером 14 × 2,6 м и не переносится из цены плёнки за м².");
  expect(description('tape-order')).toContain("Цена задаётся за один целый рулон tesa 4363 размером 25 м × 50 мм и не переносится из цены ленты за метр.");
  expect(description('tape-order')).not.toContain("Цена задаётся за один целый рулон tesa 4369 размером 14 × 2,6 м и не переносится из цены плёнки за м².");
  expect(description('film-order')).not.toContain("Цена задаётся за один целый рулон tesa 4363 размером 25 м × 50 мм и не переносится из цены ленты за метр.");
});

test('new geometry labels are plain while legacy labels keep their exact data',()=>{
  const next = ct54Tesa2600DefinitionR1(),old = ct54RectangularProtectionDefinitionS2770();
  expect(next.parameters.find(p=>p.parameter_id === 'ct54_tesa2600_cut_width_m')?.title_ru)
    .toBe('Ширина одного укрытия с припусками, м');
  expect(next.parameters.find(p=>p.parameter_id === 'ct54_tesa2600_cut_height_m')?.title_ru)
    .toBe('Высота одного укрытия с припусками, м');
  expect(old.parameters.find(p=>p.parameter_id === 'ct54_protection_cut_width_m')?.title_ru)
    .toBe('Ширина одного конверта раскроя с фактическими припусками, м');
  expect(old.parameters.find(p=>p.parameter_id === 'ct54_protection_cut_height_m')?.title_ru)
    .toBe('Высота одного конверта раскроя с фактическими припусками, м');
});

test('manual new-SKU quantity, title and price use the normal core and survive an authored JSON replay',async()=>{
  const d = ct54Tesa2600DefinitionR1();
  const input = JSON.parse(JSON.stringify({parameters:facts,overrides:{[prefix+':film-order']:{
    quantity:'12',titleRu:'Моя плёнка tesa 4369, 14 × 2,6 м',unitPrice:'91.23',provenance:{kind:'manual',reason:'NEW_SKU_ONLY'},
  }}}));
  const r = await compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.targetCatalogIds[0],compilerVersion:pack.contract,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:input.parameters,confirmedParameters:{},rowOverrides:input.overrides,
    currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
  expect(r.rows.find(row=>row.row_id === prefix+':film-order')).toMatchObject({
    quantity:'12',unit_price:'91.23',title_ru:'Моя плёнка tesa 4369, 14 × 2,6 м',
  });
  expect(r.rows.find(row=>row.row_id === prefix+':tape-order')?.unit_price).toBeNull();
  // Authored JSON replay only: this is not a persisted DB/UI reopen proof.
});

test('manual film order cannot bypass the missing height applicability fact',async()=>{
  const d = ct54Tesa2600DefinitionR1();
  const {ct54_tesa2600_cut_height_m:_height,...withoutHeight} = facts;
  const r = await compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.targetCatalogIds[0],compilerVersion:pack.contract,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:withoutHeight,confirmedParameters:{},rowOverrides:{[prefix+':film-order']:{quantity:'12',unitPrice:'91.23',
      titleRu:'Мой ручной заказ плёнки 2,6 м',provenance:{kind:'manual',reason:'APPLICABILITY_CONTROL'}}},
    currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
  expect(r.rows.some(row=>row.row_id === prefix+':film-order')).toBe(false);
  expect(r.preliminaryNeeds.find(need=>need.row_id === prefix+':film-order')?.missing_parameter_ids)
    .toContain('ct54_tesa2600_cut_height_m');
});

test.each([undefined,'12'])('fresh 1.8 m successors require height for film order, manual=%s',async manual=>{
  const parameters = {ct54_protection_method:legacyPack.exactChoiceRu,ct54_protection_site:legacyPack.exactSiteRu,
    ct54_protection_rectangle_count:'4',ct54_protection_cut_width_m:'1.2',
    ct54_protection_film_stock:'0',ct54_protection_film_reserve:'0',ct54_protection_film_supplier_multiple:'1',
    ct54_protection_tape_stock:'0',ct54_protection_tape_reserve:'0',ct54_protection_tape_supplier_multiple:'1'};
  const run = (d:ReturnType<typeof ct54RectangularProtectionDefinitionS2770>) => compileCanonicalEstimateCore({
    operation:'recalculate',catalogId:pack.targetCatalogIds[0],compilerVersion:'ct54-forward-height-control',
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:parameters,confirmedParameters:{},rowOverrides:manual == null ? {} : {
      [legacyPrefix+':film-order']:{quantity:manual,unitPrice:'91.23',provenance:{kind:'manual',reason:'LEGACY_HEIGHT_GAP_CONTROL'}},
    },currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
  const historical = await run(ct54RectangularProtectionDefinitionS2770());
  expect(historical.rows.find(row=>row.row_id === legacyPrefix+':film-order')?.quantity).toBe(manual??'1');
  const forward = await run(ct54RectangularProtectionForwardDefinitionS2770());
  expect(forward.rows.some(row=>row.row_id === legacyPrefix+':film-order')).toBe(false);
  const need = forward.preliminaryNeeds.find(row=>row.row_id === legacyPrefix+':film-order');
  expect(need?.missing_parameter_ids).toContain('ct54_protection_cut_height_m');
  if(manual != null) expect(need).toMatchObject({quantity:manual,unit_price:'91.23'});
});

test('fresh 1.8 m geometry gate changes only resource inputs, retaining formulas and defaults',()=>{
  const old = ct54RectangularProtectionDefinitionS2770(),forward = ct54RectangularProtectionForwardDefinitionS2770();
  expect(forward.parameters).toEqual(old.parameters);expect(forward.formulas).toEqual(old.formulas);
  expect(forward.runtimeInput).toEqual(old.runtimeInput);
  expect(forward.resources.map(({row_sha256,resource_graph,...rest})=>({...rest,
    resource_graph:{...resource_graph,inputParameterIds:undefined}})))
    .toEqual(old.resources.map(({row_sha256,resource_graph,...rest})=>({...rest,
      resource_graph:{...resource_graph,inputParameterIds:undefined}})));
  expect(forward.resources.every(r=>((r.resource_graph as typeof r.resource_graph & {inputParameterIds: string[]}).inputParameterIds as string[]).includes('ct54_protection_cut_height_m'))).toBe(true);
});

test('no forward overlay accepts a historic label without the fresh eight-parent gate',()=>{
  expect(()=>overlayCt54Tesa2600ForwardR1({definition:{catalog_id:pack.targetCatalogIds[0]}} as never,
    undefined as never,undefined as never)).toThrow('FRESH_CURRENT_EIGHT_PARENT_SNAPSHOT_REQUIRED');
  expect(pack.targetCatalogIds).toHaveLength(8);expect(new Set(pack.targetCatalogIds).size).toBe(8);
  expect(pack.currentParentBinding.targets).toBeNull();
  expect(pack.remainingCt54Needs).toBe(18);expect(pack.newClosedNeedsAccepted).toBe(0);
});

// The two actual-eight-parent controls now live in ct54Tesa2600CurrentParentsR1.test.ts.
// Their public fixture is derived from the closed PG8 snapshot; all controls remain NOT_RUN.
// Observed BEFORE data from the independently executed legacy equality control.
// This durable regression control remains NOT_RUN until the integrated suite executes.
// The two files are byte-exact copies, not values regenerated by the new factory.
type LegacyPortableNode =
  | {kind:'array';length:number;properties:unknown[]}
  | {kind:'object';prototype:'plain'|'null';properties:unknown[]};
type LegacyPortableGraph = {schemaVersion:string;root:unknown;nodes:LegacyPortableNode[]};
type LegacyFactoryData = ReturnType<typeof ct54RectangularProtectionDefinitionS2770>;
const PORTABLE_FORMAT = 'ct54-actual-factory-lossless-graph/v1';

// Test-data decoder ported from the actual, reviewed runner (4e2eb249...).
// Only type annotations/casts are added; no calculation or WORK runtime dependency.
function decodePortable(encoded:LegacyPortableGraph):unknown {
  assert.equal(encoded.schemaVersion,PORTABLE_FORMAT);assert(Array.isArray(encoded.nodes));
  const values=encoded.nodes.map(node=>{
    if(node.kind==='array'){
      assert(Number.isSafeInteger(node.length)&&node.length>=0&&node.length<=0xffffffff);
      return new Array<unknown>(node.length);
    }
    assert.equal(node.kind,'object');assert(['plain','null'].includes(node.prototype));
    return Object.create(node.prototype==='null'?null:Object.prototype) as Record<string,unknown>;
  });
  function atom(tag:unknown):unknown {
    assert(Array.isArray(tag));
    switch(tag[0]) {
      case 'null':assert.equal(tag.length,1);return null;
      case 'undefined':assert.equal(tag.length,1);return undefined;
      case 'string':assert.equal(tag.length,2);assert.equal(typeof tag[1],'string');return tag[1];
      case 'boolean':assert.equal(tag.length,2);assert.equal(typeof tag[1],'boolean');return tag[1];
      case 'number':{
        assert.equal(tag.length,2);assert.equal(typeof tag[1],'string');
        const number=tag[1]==='-0'?-0:Number(tag[1]);
        assert.equal(Object.is(number,-0)?'-0':String(number),tag[1]);return number;
      }
      case 'bigint':assert.equal(tag.length,2);assert.equal(typeof tag[1],'string');return BigInt(tag[1]);
      case 'ref':assert.equal(tag.length,2);assert(Number.isSafeInteger(tag[1])&&tag[1]>=0&&tag[1]<values.length);return values[tag[1]];
      default:assert.fail('UNKNOWN_PORTABLE_TAG');
    }
  }
  encoded.nodes.forEach((node,id)=>{
    assert(Array.isArray(node.properties));const seen=new Set<string>();
    for(const pair of node.properties){
      assert(Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&!seen.has(pair[0]));
      seen.add(pair[0]);assert(node.kind!=='array'||pair[0]!=='length');
      Object.defineProperty(values[id],pair[0],{value:atom(pair[1]),enumerable:true,writable:true,configurable:true});
    }
    if(node.kind==='array')assert.equal((values[id] as unknown[]).length,node.length);
  });
  return atom(encoded.root);
}
function compareLegacyFactoryData(left:unknown,right:unknown) {
  const stableTextEqual=canonicalEstimateStableJson(left)===canonicalEstimateStableJson(right);
  const deepStrictStructuredCloneEqual=isDeepStrictEqual(cloneLegacyFactoryData(left),cloneLegacyFactoryData(right));
  return {stableTextEqual,deepStrictStructuredCloneEqual,equal:stableTextEqual&&deepStrictStructuredCloneEqual};
}

test('the old 1.8 m factory matches the complete observed baseline and rejects nine shape mutations',()=>{
  const fixtureRoot=resolve(__dirname,'../../../../data/estimate-benchmarks/fixtures');
  const graphBytes=readFileSync(resolve(fixtureRoot,'ct54-tesa1800-legacy-factory-before-r1.structural.json'));
  const stableBytes=readFileSync(resolve(fixtureRoot,'ct54-tesa1800-legacy-factory-before-r1.stable.txt'));
  const digest=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
  expect(graphBytes.length).toBe(175989);expect(stableBytes.length).toBe(135520);
  expect(digest(graphBytes)).toBe('48309cba51fb6d432fad57374e59b1a4aabb9765de1735b1ec9d8f75a57cd864');
  expect(digest(stableBytes)).toBe('5cfefc0a0aba6cc586231da7d19c8bcb3ca041bc413bf8eb9356a7d0225d4e93');
  const expected=decodePortable(JSON.parse(graphBytes.toString('utf8')) as LegacyPortableGraph) as LegacyFactoryData;
  const observedStableText=stableBytes.toString('utf8'); // Raw captured text; never JSON.parse this file.
  const actual=cloneLegacyFactoryData(ct54RectangularProtectionDefinitionS2770()); // Exactly one factory call in this case.
  expect(canonicalEstimateStableJson(expected)).toBe(observedStableText);
  expect(canonicalEstimateStableJson(actual)).toBe(observedStableText);
  expect(compareLegacyFactoryData(expected,actual)).toEqual({
    stableTextEqual:true,deepStrictStructuredCloneEqual:true,equal:true,
  });
  const topKeys=['formulas','ordinaryParameterIds','parameters','resources','runtimeClassification','runtimeInput','runtimeSourceIds'];
  expect(Object.keys(expected).sort()).toEqual(topKeys);expect(Object.keys(actual).sort()).toEqual(topKeys);
  for(const key of ['parameters','formulas','resources'] as const) {
    expect(expected[key]).toHaveLength(13);expect(actual[key]).toHaveLength(expected[key].length);
  }

  const witnessed:string[]=[];
  const mutation=(id:string,change:(value:LegacyFactoryData)=>void)=>{
    const next=cloneLegacyFactoryData(expected);change(next);
    expect(compareLegacyFactoryData(expected,next)).toEqual({
      stableTextEqual:false,deepStrictStructuredCloneEqual:false,equal:false,
    });
    witnessed.push(id);
  };
  mutation('parameter-title',value=>{
    const row=value.parameters[0]!;assert.equal(typeof row.title_ru,'string');row.title_ru+=' [comparison witness]';
  });
  mutation('parameter-default',value=>{
    const row=value.parameters[0]!;assert(Object.hasOwn(row,'default_value'));row.default_value='__comparison_default__';
  });
  mutation('formula-expression',value=>{
    const row=value.formulas[0]!;assert.equal(typeof row.expression_source,'string');row.expression_source+=' + 0';
  });
  mutation('nested-public-presentation',value=>{
    const presentation=value.resources[0]!.resource_graph.publicResourcePresentationV1 as unknown as {detailsRu:string[]};
    assert(Array.isArray(presentation.detailsRu)&&typeof presentation.detailsRu[0]==='string');
    presentation.detailsRu[0]+=' [comparison witness]';
  });
  mutation('resource-row-hash',value=>{
    const row=value.resources[0]!;assert.equal(typeof row.row_sha256,'string');row.row_sha256+='-witness';
  });
  const witnessKey='__exact_shape_witness__';assert(!Object.hasOwn(expected,witnessKey));
  type ShapeValue={present:false}|{present:true;value:unknown};
  const shape=(id:string,leftValue:ShapeValue,rightValue:ShapeValue,serializerCollisionExpected:boolean)=>{
    const left=cloneLegacyFactoryData(expected) as LegacyFactoryData & Record<string,unknown>;
    const right=cloneLegacyFactoryData(expected) as LegacyFactoryData & Record<string,unknown>;
    if(leftValue.present)left[witnessKey]=leftValue.value;
    if(rightValue.present)right[witnessKey]=rightValue.value;
    expect(compareLegacyFactoryData(left,right)).toEqual({
      stableTextEqual:serializerCollisionExpected,deepStrictStructuredCloneEqual:false,equal:false,
    });
    witnessed.push(id);
  };
  shape('undefined-property-versus-absence',{present:true,value:undefined},{present:false},false);
  shape('empty-array-versus-undefined-element',{present:true,value:[]},{present:true,value:[undefined]},true);
  shape('array-hole-versus-undefined-element',{present:true,value:new Array(1)},{present:true,value:[undefined]},true);
  shape('array-hole-length-versus-empty',{present:true,value:new Array(1)},{present:true,value:[]},true);
  expect(witnessed).toEqual([
    'parameter-title','parameter-default','formula-expression','nested-public-presentation','resource-row-hash',
    'undefined-property-versus-absence','empty-array-versus-undefined-element',
    'array-hole-versus-undefined-element','array-hole-length-versus-empty',
  ]);
  // No witness mutated the baseline or replaced the complete positive comparison.
  expect(canonicalEstimateStableJson(expected)).toBe(observedStableText);
  expect(compareLegacyFactoryData(expected,actual).equal).toBe(true);
});
