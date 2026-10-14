import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
import {ct54ProtectionPackS2770 as pack,ct54ProtectionPrefixS2770 as prefix,ct54RectangularProtectionDefinitionS2770} from './ct54RectangularProtectionS2770';
import {overlayS2770Ct54RectangularProtection} from '../../../../scripts/estimate/r4a13/s2770Ct54RectangularProtectionOverlay';

const facts:Record<string,unknown>={ct54_protection_method:pack.exactChoiceRu,ct54_protection_site:pack.exactSiteRu,
  ct54_protection_rectangle_count:'4',ct54_protection_cut_width_m:'1.2',ct54_protection_cut_height_m:'1.5',
  ct54_protection_film_stock:'0',ct54_protection_film_reserve:'0',ct54_protection_film_supplier_multiple:'1',
  ct54_protection_tape_stock:'0',ct54_protection_tape_reserve:'0',ct54_protection_tape_supplier_multiple:'1'};
const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.targets[0].catalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:'ct54_protection_rectangle_count',definition:ct54RectangularProtectionDefinitionS2770(),submittedParameters});
type Result=Awaited<ReturnType<typeof compile>>;
const quantity=(result:Result,suffix:string)=>result.rows.find(row=>row.row_id===prefix+':'+suffix)?.quantity;

describe('CT54 source-specific rectangular protection',()=>{
  test('binds one method to the eight distinct current parents and retains partial status',()=>{
    expect(pack.targets).toHaveLength(8);expect(new Set(pack.targets.map(t=>t.catalogId)).size).toBe(8);
    expect(pack.targets.every(t=>/^[0-9a-f]{64}$/.test(t.parentInputSha256))).toBe(true);
    expect(pack.fullTechnicalEstimateAccepted).toBe(false);
  });
  test('derives film and three extra tape edges from actual cut envelopes without a second top tape or paid labour',async()=>{
    const r=await compile(facts);
    expect(quantity(r,'covered-area')).toBe('7.2');expect(quantity(r,'film-strip-area')).toBe('8.64');
    expect(quantity(r,'film-order')).toBe('1');expect(quantity(r,'tape-length')).toBe('16.8');expect(quantity(r,'tape-order')).toBe('1');
    expect(r.rows.some(row=>row.category==='labor')).toBe(false);
    expect(r.rows.every(row=>row.unit_price===null)).toBe(true);
  });
  test('equal covered area does not imply equal tape length or film strip length',async()=>{
    const a=await compile({...facts,ct54_protection_rectangle_count:'1'});
    const b=await compile({...facts,ct54_protection_rectangle_count:'1',ct54_protection_cut_width_m:'1',ct54_protection_cut_height_m:'1.8'});
    expect(quantity(a,'covered-area')).toBe(quantity(b,'covered-area'));
    expect(quantity(a,'tape-length')).not.toBe(quantity(b,'tape-length'));
    expect(quantity(a,'film-strip-area')).not.toBe(quantity(b,'film-strip-area'));
  });
  test('continuous eight-metre strips cannot be packed by dividing their total length',async()=>{
    const r=await compile({...facts,ct54_protection_rectangle_count:'3',ct54_protection_cut_width_m:'8',ct54_protection_cut_height_m:'1'});
    expect(quantity(r,'film-opened')).toBe('3');expect(quantity(r,'film-order')).toBe('3');
  });
  test('continuous14m tape bottoms require four25m rolls despite a three-roll aggregate length bound',async()=>{
    const r=await compile({...facts,ct54_protection_cut_width_m:'14',ct54_protection_cut_height_m:'1.8'});
    expect(quantity(r,'film-order')).toBe('4');expect(quantity(r,'tape-order')).toBe('4');
  });
  test('does not order a conservative kit count when a minimum-roll proof is absent',async()=>{
    const r=await compile({...facts,ct54_protection_rectangle_count:'11'});
    expect(quantity(r,'tape-length')).toBe('46.2');expect(quantity(r,'tape-order')).toBeUndefined();
    expect(quantity(r,'film-order')).toBe('1');
  });
  test('actual stock can eliminate the new order while preserving opened rolls and consumed tape',async()=>{
    const r=await compile({...facts,ct54_protection_film_stock:'2',ct54_protection_tape_stock:'2'});
    expect(quantity(r,'film-order')).toBe('0');expect(quantity(r,'film-opened')).toBe('1');
    expect(quantity(r,'tape-order')).toBe('0');expect(quantity(r,'tape-length')).toBe('16.8');
  });
  test('uses explicit reserve and supplier multiple and keeps reusable tails separate from waste',async()=>{
    const r=await compile({...facts,ct54_protection_film_reserve:'1',ct54_protection_film_supplier_multiple:'4'});
    expect(quantity(r,'film-order')).toBe('4');expect(quantity(r,'film-remaining')).toBe('3');expect(quantity(r,'film-free')).toBe('2');
    expect(quantity(r,'film-tail')).toBe('9.2');expect(quantity(r,'film-trim')).toBe('1.44');
    expect(r.rows.some(row=>row.category==='waste')).toBe(false);
  });
  test('unknown stock is not zero and missing geometry cannot become a calculated quantity',async()=>{
    const {ct54_protection_film_stock:_stock,...missingStock}=facts;
    const r=await compile(missingStock);expect(quantity(r,'film-order')).toBeUndefined();
    expect(r.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes('ct54_protection_film_stock'))).toBe(true);
    const {ct54_protection_cut_width_m:_width,...missingWidth}=facts;
    const missing=await compile(missingWidth);expect(quantity(missing,'film-order')).toBeUndefined();
  });
  test.each([{ct54_protection_cut_height_m:'1.801'},{ct54_protection_cut_width_m:'14.001'},{ct54_protection_rectangle_count:'0.5'},{ct54_protection_film_supplier_multiple:'0'},{ct54_protection_site:'Unverified metal or stone'}])('rejects geometry or method outside the declared scope: %o',async change=>{
    await expect(compile({...facts,...change})).rejects.toThrow();
  });
  test('cannot apply a frozen-parent overlay to an arbitrary definition with the right catalogue label',()=>{
    expect(()=>overlayS2770Ct54RectangularProtection({definition:{catalog_id:pack.targets[0].catalogId,id:'unrelated',definition_version:pack.targets[0].predecessorVersion}} as never,'control')).toThrow('EXACT_CURRENT_PARENT');
  });
});
