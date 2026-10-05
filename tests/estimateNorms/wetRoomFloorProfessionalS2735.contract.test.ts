import { compileWetRoomFloorProfessionalS2735 as compile, WET_ROOM_PROFESSIONAL_DEFINITION_S2735 as definition } from "../../src/lib/estimate/v4/wetRoomFloorProfessionalS2735";
import { WET_ZONE_COMPLETION_DEFINITION_S2735 as waterproofing, WET_ZONE_COMPLETION_ROWS_S2735 as ids } from "../../src/lib/estimate/v4/wetZoneWaterproofingCompletionS2735";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
const trace = (row: Record<string,unknown>) => row.calculation_trace as Record<string,any>;
describe("professional wet-room material constructor from ordinary measured area", ()=>{
  test("reuses the canonical waterproofing ASTs once and fills material orders without a DEMO fixture",async()=>{
    const result=await compile({area_m2:30});
    expect(definition.parameters.filter(p=>p.parameter_id==="area_m2")).toHaveLength(1);
    for(const formula of waterproofing.formulas.filter(f=>definition.formulas.some(g=>g.formula_id===f.formula_id)))
      expect(definition.formulas.find(g=>g.formula_id===formula.formula_id)).toBe(formula);
    expect(Object.keys(definition.runtimeInput).some(id=>/worker_h|machine_h|productivity/.test(id))).toBe(false);
    expect(result.rows.find(r=>r.row_id===ids.membrane)?.quantity).toBe("45");
    expect(result.rows.find(r=>r.row_id==="rc09:porcelain_tile_600x600")?.quantity).toBe("33.12");
    expect(result.rows.find(r=>r.row_id==="rc09:c2te_s1_tile_adhesive")?.quantity).toBe("150");
    expect(result.rows.find(r=>r.row_id==="rc09:cement_grout_2mm_joint")?.quantity).toBe("4");
    expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes("tile_worker_h"))).toBe(true);
    expect(result.rows.some(r=>r.unit_id==="set")).toBe(false);
  });
  test("shares water before rounding and persists separate nonpayable operation consumption",async()=>{
    const result=await compile({area_m2:30});
    const owners=result.rows.filter(r=>r.row_id.startsWith("material:wet-room:shared-clean-water"));
    expect(owners).toHaveLength(1);expect(owners[0].quantity).toBe("65");
    const allocations=result.rows.filter(r=>r.row_id.startsWith("allocation:"));expect(allocations).toHaveLength(2);
    expect(allocations.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
    expect(allocations.every(r=>trace(r).resourceGraph.includedInResourceOwnerRowId===owners[0].row_id)).toBe(true);
    expect(Number(trace(owners[0]).purchaseBalance.consumed)).toBeCloseTo(allocations.reduce((sum,r)=>sum+Number(r.quantity),0),8);
    expect(result.rows.some(r=>r.row_id==="material:wet-zone:method_water_l")).toBe(false);
    const projection=buildCanonicalProcurementProjection({revision:{id:"wet-room",release_id:"release",catalog_id:"catalog",checksum_sha256:"a".repeat(64),row_count:result.rows.length},
      procurementRows:selectCanonicalArtifactRows(result.rows).procurementRows,sourceRows:result.rows});
    expect(projection.rows.find(r=>r.rowId===owners[0].row_id)?.consumptionAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({consumed:"6",separatelyPayable:false}),expect.objectContaining({consumed:"56.792403101",separatelyPayable:false}),
    ]));
  });
  test("stock and reserve apply once to the shared water and recompute remainder",async()=>{
    const result=await compile({area_m2:30,water_stock_l:10,water_reserve_l:2});
    const owner=result.rows.find(r=>r.row_id==="material:wet-room:shared-clean-water")!;
    expect(trace(owner).purchaseBalance).toEqual(expect.objectContaining({effectiveOrder:"55",stock:"10",reserve:"2",procurementReady:true}));
    expect(Number(trace(owner).purchaseBalance.remaining)).toBeCloseTo(2.207596899,8);
  });
  test("already primed excludes primer, priming labor and all dilution dependencies",async()=>{
    const result=await compile({area_m2:30,primer_mode:"ALREADY_PRIMED",ct17_first_pass_water_ratio:null,ct17_selected_total_consumption_l_m2:null,ct17_application_count:null,ct17_container_l:null});
    expect(result.rows.some(r=>r.row_id===ids.primer)).toBe(false);
    const owner=result.rows.find(r=>r.row_id==="material:wet-room:shared-clean-water:ALREADY_PRIMED")!;
    expect(owner.quantity).toBe("65");
    expect(result.preliminaryNeeds.some(r=>r.row_id.startsWith("material:wet-room:shared-clean-water"))).toBe(false);
    const changed=await compile({area_m2:30,primer_mode:"ALREADY_PRIMED",ct17_first_pass_water_ratio:"1"});
    expect(changed.rows.find(r=>r.row_id===owner.row_id)?.quantity).toBe(owner.quantity);
  });
  test("all hydraulic area-dependent resources include wall upturns",async()=>{
    const result=await compile({area_m2:30,wall_upturn_height_m:1,waterproofing_productivity_m2_per_man_hour:5,substrate_preparation_productivity_m2_per_man_hour:10});
    const totalArea=30+Number(result.rows.find(r=>r.row_id==="scope:wet-room:wall-upturn")!.quantity);
    expect(Number(result.rows.find(r=>r.row_id===ids.labor)!.quantity)).toBeCloseTo(totalArea/5,8);
    expect(Number(result.rows.find(r=>r.row_id===ids.preparation)!.quantity)).toBeCloseTo(totalArea/10,8);
    expect(result.rows.find(r=>r.row_id===ids.quality)?.quantity).toBe("6");
  });
  test("conditional repair/formation activates existing resources and includes their water before rounding",async()=>{
    const pending=await compile({area_m2:30});
    expect(pending.rows.some(r=>r.row_id==="rc09:floor_leveling_compound"||r.row_id==="material:concrete:slab-repair-material")).toBe(false);
    const required=await compile({area_m2:30,substrate_repair_mode:"REQUIRED",floor_leveling_mode:"REQUIRED",repair_additional_water_l:7,formation_additional_water_l:8});
    expect(required.preliminaryNeeds.some(r=>r.row_id==="material:concrete:slab-repair-material")).toBe(true);
    expect(required.preliminaryNeeds.some(r=>r.row_id==="rc09:floor_leveling_compound")).toBe(true);
    const owners=required.rows.filter(r=>r.row_id.startsWith("material:wet-room:shared-clean-water"));
    expect(owners).toHaveLength(1);expect(owners[0].quantity).toBe("80");
    expect(required.rows.filter(r=>r.row_id.startsWith("allocation:"))).toHaveLength(4);
    const known=await compile({area_m2:30,floor_leveling_mode:"REQUIRED",formation_additional_water_l:8,formation_material_kg:65,formation_pack_kg:25,
      formation_material_designation:"Проектная смесь по испытанному узлу",formation_method_reference:"Ведомость обследования/уклонов; слой и подготовка выбраны явно",formation_primer_l:0,
      formation_primer_designation:"Отдельный грунт по этому явно заданному способу отсутствует",formation_worker_h:6,formation_machine_h:1});
    expect(known.rows.find(r=>r.row_id==="rc09:floor_leveling_compound")?.quantity).toBe("75");
  });
  test("never fabricates confirmations and rejects actual incompatibility",async()=>{
    expect(Object.keys(definition.runtimeInput).some(id=>id.endsWith("_confirmed")||id.endsWith("_excluded")||id==="under_ceramic_covering")).toBe(false);
    const actual=await compile({area_m2:30,applicability_mode:"CL51_CONFIRMED_FACTS"});
    expect(actual.preliminaryNeeds.find(r=>r.row_id===ids.membrane)?.missing_parameter_ids).toContain("under_ceramic_covering");
    await expect(compile({area_m2:30,permanent_water_contact_excluded:false})).rejects.toThrow();
    await expect(compile({area_m2:30,cl51_delivered_version:"RU_KZ_10_2018"})).rejects.toThrow();
  });
  test("edited joint width rejects the incompatible fixed rod until a larger diameter is selected",async()=>{
    await expect(compile({area_m2:30,silicone_joint_width_mm:30,silicone_joint_depth_mm:15})).rejects.toThrow();
    const result=await compile({area_m2:30,silicone_joint_width_mm:30,silicone_joint_depth_mm:15,backer_rod_diameter_mm:40});
    expect(result.rows.find(r=>r.row_id==="rc09:neutral_silicone_movement_joint")?.quantity).toBe("10.08");
  });
  test("manual shortage remains blocking and allocations cannot introduce a second price",async()=>{
    const result=await compileCanonicalEstimateCore({ operation:"recalculate",compilerVersion:"wet-room-test",catalogId:"wet-room-test",primaryMeasureParameterId:"area_m2",
      parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters:{area_m2:30},confirmedParameters:{...definition.runtimeInput},currencyCode:"KGS",priceItems:[],maximumResourceRows:definition.resources.length,
      hashJson:async value=>estimateDeterministicHash(value), rowOverrides:{
        "material:wet-room:shared-clean-water":{quantity:"60",provenance:{kind:"manual",reason:"supplier reduced water order"}},
        "allocation:wet-room:water:tile:CT17":{unitPrice:"100",includedInEstimate:true,includedInProcurement:true,provenance:{kind:"manual",reason:"attempted duplicate allocation cost"}},
      }});
    expect(trace(result.rows.find(r=>r.row_id==="material:wet-room:shared-clean-water")!).purchaseBalance.procurementReady).toBe(false);
    expect(result.rows.find(r=>r.row_id==="allocation:wet-room:water:tile:CT17")).toEqual(expect.objectContaining({included_in_estimate:false,included_in_procurement:false}));
    expect(result.totals.amount).toBe("0");
  });
});
