import {knaufInteriorPlasterPackS2763 as pack,knaufInteriorPlasterMaterialDefinitionS2763,
  compileKnaufInteriorPlasterMaterialS2763 as compile,knaufInteriorPlasterPrefixS2763 as prefix} from './knaufInteriorPlasterMaterialsS2763';
const facts={q:'35.5',interior_plaster_material_system:pack.manualChoiceRu,
  betogrund_primer_state:pack.primerNeededRu,betogrund_actual_area_m2:'30'};
const quantity=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id)?.quantity;
describe('one source-owned interior plaster material series',()=>{
  test('known material demand survives unknown supply and independent primer area',async()=>{
    const r=await compile(false,facts);
    expect(quantity(r,'rotband-consumed')).toBe('301.75');
    expect(quantity(r,'betogrund-consumed')).toBe('7.5');
    expect(quantity(r,'rotband-30kg-order')).toBeUndefined();
    expect(r.preliminaryNeeds.some(x=>x.row_id===prefix+':rotband-30kg-order')).toBe(true);
    expect(r.rows.some(x=>x.row_id.endsWith('betogrund-5kg-order')&&x.quantity!=null)).toBe(false);
  });
  test('known plaster stays calculated while primer need is undetermined',async()=>{
    const r=await compile(false,{...facts,betogrund_primer_state:pack.primerUnknownRu});
    expect(quantity(r,'rotband-consumed')).toBe('301.75');
    expect(quantity(r,'betogrund-consumed')).toBeUndefined();
    expect(quantity(r,'betogrund-undetermined')).toBeUndefined();
    expect(r.preliminaryNeeds.some(x=>x.row_id===prefix+':betogrund-undetermined')).toBe(true);
  });
  test('completed primer has neither repeated material nor repeated application cost',async()=>{
    const r=await compile(false,{...facts,betogrund_primer_state:pack.primerCompleteRu});
    expect(r.rows.some(x=>x.row_id.startsWith(prefix+':betogrund'))).toBe(false);
    expect(quantity(r,'rotband-consumed')).toBe('301.75');
  });
  test.each([['5','10','2','1.125'],['15','15','1','6.125']])('separate%s kg SKU rounds one actual homogeneous supply',async(kg,order,buckets,remaining)=>{
    const r=await compile(false,{...facts,betogrund_actual_area_m2:'35.5',betogrund_package_kg:kg,
      betogrund_usable_stock_kg:'0',betogrund_retained_reserve_kg:'0',betogrund_bucket_multiple:'1'});
    expect(quantity(r,'betogrund-'+kg+'kg-order')).toBe(order);
    expect(quantity(r,'betogrund-'+kg+'kg-buckets')).toBe(buckets);
    expect(quantity(r,'betogrund-'+kg+'kg-remaining')).toBe(remaining);
    expect(r.rows.filter(x=>x.procurement_eligible&&x.row_id.includes('betogrund'))).toHaveLength(1);
  });
  test('purchase uses the supplier multiple without inventing losses',async()=>{
    const r=await compile(false,{...facts,rotband_usable_stock_kg:'0',rotband_retained_reserve_kg:'0',rotband_bag_multiple:'2'});
    expect(quantity(r,'rotband-30kg-order')).toBe('360');
    expect(quantity(r,'rotband-30kg-bags')).toBe('12');
    expect(quantity(r,'rotband-30kg-remaining')).toBe('58.25');
    expect(quantity(r,'rotband-consumed')).toBe('301.75');
  });
  test('empty input confirms no q100, norm or stock default',async()=>{
    const r=await compile(false,{});
    expect(knaufInteriorPlasterMaterialDefinitionS2763(false).parameters.every(p=>p.default_value==null)).toBe(true);
    expect(r.rows.some(x=>x.quantity!=null&&x.included_in_estimate)).toBe(false);
  });
  test('standard mechanized15mm gets primer without a fabricated main-mixture coefficient',async()=>{
    const d=knaufInteriorPlasterMaterialDefinitionS2763(true);
    const r=await compile(true,{interior_plaster_material_system:pack.mechanizedChoiceRu,
      betogrund_primer_state:pack.primerNeededRu,betogrund_actual_area_m2:'35.5'});
    expect(quantity(r,'betogrund-consumed')).toBe('8.875');
    expect(d.resources.some(x=>x.row_id.includes('rotband'))).toBe(false);
    expect(d.formulas.some(f=>/\b8\.5\b|\b13\.5\b/.test(f.expression_source??''))).toBe(false);
  });
  test('unknown applicability cannot be forced through a user numeric override',async()=>{
    await expect(compile(false,{...facts,betogrund_primer_state:pack.primerUnknownRu,betogrund_undetermined_need_kg:'1'})).rejects.toThrow();
  });
  test('measured operation areas have no payable labour owner or repeated primer surcharge',()=>{
    for(const primerOnly of [true,false])for(const row of knaufInteriorPlasterMaterialDefinitionS2763(primerOnly).resources.filter(r=>r.row_id.endsWith('application-area')))
      expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
  });
  test('measurement and selection guides retain the correct product snapshot and actual review date',()=>{
    const d=knaufInteriorPlasterMaterialDefinitionS2763(false);
    for(const [id,sourceIndex,kind,role] of [['q',1,'MEASUREMENT_RULE','USER_MEASURED'],
      ['betogrund_actual_area_m2',0,'MEASUREMENT_RULE','USER_MEASURED'],
      ['interior_plaster_material_system',1,'PROJECT_DEFINED','PROJECT_DOCUMENTATION'],
      ['betogrund_primer_state',0,'PROJECT_DEFINED','PROJECT_DOCUMENTATION']] as const) {
      const p=d.parameters.find(p=>p.parameter_id===id)!;const source=pack.sources[sourceIndex];
      expect(p.truth_metadata.guide).toMatchObject({guide_kind:kind,source_role:role,source_document:source.id,
        source_snapshot_hash:source.sha256,verified_at:source.reviewedAt});
      expect(p.truth_metadata.source_confirmation_required).toBe(false);
    }
    const unknown=d.parameters.find(p=>p.parameter_id==='betogrund_undetermined_need_kg')!;
    expect((unknown.truth_metadata.guide as Record<string,unknown>).guide_short_ru).toContain('Проверьте, нужно ли ещё грунтовать бетон');
    expect(unknown.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
    expect(unknown.truth_metadata.source_confirmation_required).toBe(true);
  });
});
