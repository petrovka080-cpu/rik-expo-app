import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileDrywallCeilingHighLoadGeometryR1 as compile,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_DEFINITION as definition,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_PACK as pack,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_SHA256 as packHash,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_PREFIX as prefix,
} from '../../src/lib/estimate/v4/drywallCeilingHighLoadGeometryR1';
import {canonicalEstimateWorkProcess, canonicalEstimateResourceOperationSections}
  from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';

const geometry={room_length_m:20,room_width_m:15,ceiling_height_m:3,ceiling_drop_m:0.12};
const id=(key:string)=>prefix+':'+key;
const graph=(row:Record<string,unknown>)=>(row.calculation_trace as {resourceGraph?:Record<string,unknown>})?.resourceGraph??{};
const quantitativeNeeds=(result:Awaited<ReturnType<typeof compile>>)=>result.preliminaryNeeds
  .filter(row=>!graph(row).scopeRequirementDecisionV1);

describe('The existing high-load ceiling ID has an authored P112.1 geometry contract',()=>{
  test('exact manufacturer configuration is distinct from ordinary P113 and includes total load limits',()=>{
    expect(pack.catalogId).toBe('canonical-work:base:drywall_ceiling_interior_drywall_ceiling_install_high_load');
    expect(pack.system).toMatchObject({designation:'П112.1',mainSpacingMaxM:.5,bearingSpacingMaxM:.5,
      hangerSpacingMaxM:.8,loadClassMaxKnM2:.5,engineeringAcceptance:false});
    expect(pack.system.loadMeaningRu).toContain('включая собственный вес');
    expect(pack.system.loadMeaningRu).toContain('>10кг');
    expect(pack.sources[0]!.locatorRu).toContain('32');
    expect(pack.sources[1]!.locatorRu).toContain('500мм/несущие500мм/подвесы800мм');
    expect(packHash).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/drywall-ceiling-high-load-geometry-r1.json')).digest('hex'));
  });

  test('ordinary required answers are geometry only; source-owned norms cannot become user questions',()=>{
    const ordinary=definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT');
    expect(ordinary.map(p=>p.parameter_id)).toEqual(['room_length_m','room_width_m','ceiling_height_m','ceiling_drop_m']);
    expect(definition.runtimeInput).toEqual({});
    expect(definition.parameters.filter(p=>/spacing|productivity|hours|pack|reserve|anchor|profile|adhesive/.test(p.parameter_id))
      .every(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY')).toBe(true);
  });

  test('300m²,20×15m: actual profile runs, intersections, hangers, cutting and TN lines are quantified',async()=>{
    const result=await compile(geometry),quantity=(key:string)=>result.rows.find(r=>r.row_id===id(key))?.quantity;
    // Independently counted:2fields9.99×15m;31main×21bearing lines per field;
    // 14hangers/main;4pieces/main and5pieces/bearing;two one-sided clips/crossing.
    expect(quantity('material:pp-main')).toBe('248');
    expect(quantity('material:pp-bearing')).toBe('210');
    expect(quantity('material:extensions')).toBe('354');
    expect(quantity('material:connectors')).toBe('2604');
    expect(quantity('material:hangers')).toBe('868');
    expect(quantity('material:anchors')).toBe('868');
    expect(quantity('material:ln')).toBe('1736');
    // 7whole-start rows×4sheets+6staggered rows×5sheets=58per field;
    // 116 lining sheets; the 15 m joint uses 5 complete EMAC dry-cover kits.
    expect(quantity('material:board')).toBe('116');
    expect(quantity('material:expansion-profile')).toBe('5');
    expect(quantity('material:expansion-clips')).toBe('25');
    expect(quantity('material:tn')).toBe('5532');
    expect(quantity('stage:clad')).toBe('299.7');
    expect(quantity('stage:expansion')).toBe('15');
    expect(quantity('stage:joint')).toBe('344.16');
    expect(quantity('material:joint-tape')).toBe('7');
    expect(quantity('material:separation-tape')).toBe('2');
    expect(quantity('work:whole')).toBe('300');
    expect(result.rows.filter(r=>r.included_in_procurement).every(r=>Number(r.quantity)>0)).toBe(true);
  });

  test('derived layout intermediates retain their actual transitive resource consumers for publication',()=>{
    const consumers=buildMasterParameterCalculationConsumers(definition);
    expect(definition.parameters.filter(parameter=>!consumers.resourceConsumers[parameter.parameter_id]?.length)
      .map(parameter=>parameter.parameter_id)).toEqual([]);
    const inputs=definition.resources.find(resource=>resource.row_id===id('material:pp-main'))!.resource_graph.inputParameterIds;
    expect(inputs).toEqual(expect.arrayContaining(['p112_bays_x','p112_bay_l_m','p112_bay_w_m','room_length_m','room_width_m']));
    for(const unrelated of ['p112_sheet_rows','p112_tn_count','p112_joint_m'])expect(inputs).not.toContain(unrelated);
  });

  test('equal300m² with30×10m changes perimeter, layout and fastening rather than scaling an area table',async()=>{
    const a=await compile(geometry),b=await compile({...geometry,room_length_m:30,room_width_m:10});
    const qty=(r:typeof a,key:string)=>r.rows.find(row=>row.row_id===id(key))?.quantity;
    expect(qty(a,'work:whole')).toBe(qty(b,'work:whole'));
    expect(qty(b,'material:hangers')).toBe('840');
    expect(qty(b,'material:tn')).toBe('5544');
    expect(qty(b,'stage:joint')).toBe('349.44');
    expect(qty(b,'stage:expansion')).toBe('10');
    expect(qty(b,'material:expansion-profile')).toBe('4');
    expect(qty(b,'material:expansion-clips')).toBe('20');
    expect(qty(b,'material:pp-main')).toBe('210');
    expect(qty(b,'material:pp-bearing')).toBe('248');
    expect(qty(a,'material:hangers')).not.toBe(qty(b,'material:hangers'));
    expect(qty(a,'material:tn')).not.toBe(qty(b,'material:tn'));
  });

  test('the exact dry ceiling joint closes the material scope without invented glue or finishing rates',async()=>{
    const result=await compile(geometry);
    expect(quantitativeNeeds(result).map(row=>row.row_id)).toEqual([id('labor:emac-joint-source-gap')]);
    expect(pack.readiness.selectedMaterialGeometryQuantitiesComplete).toBe(true);
    expect(pack.readiness.baseKnaufNormQuantitiesVerified).toBe(true);
    expect(pack.readiness.selectedScopeQuantitiesComplete).toBe(false);
    expect(pack.readiness.fullTechnicalAcceptance).toBe(false);
    expect(pack.system.completeKnaufFactorySystemClaim).toBe(false);
    expect(pack.system.compatibilityEvidenceRu).toContain('10–35 мм');
    expect(pack.system.compatibilityEvidenceRu).toContain('пересечений');
    expect(pack.products.expansionKit).toMatchObject({model:'NTDPP50BL3',lengthM:3,
      jointWidthMinM:.01,jointWidthMaxM:.035,includedClipsPerStockPiece:5,separateClipPaymentAllowed:false});
    expect(pack.sources[6]!.locatorRu).toContain('PDF стр. 54');
    expect(definition.resources.some(r=>/adhesive/.test(r.row_id))).toBe(false);
    expect(definition.parameters.some(p=>/adhesive/.test(p.parameter_id))).toBe(false);
    const clip=result.rows.find(r=>r.row_id===id('material:expansion-clips'))!;
    expect(clip.quantity).toBe('25');
    expect(clip.included_in_procurement).toBe(false);
    expect(clip.included_in_estimate).toBe(false);
    expect(graph(clip)).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
      includedInResourceOwnerRowId:id('material:expansion-profile')});
    // A 10×10 ceiling has no internal expansion joint in this declared scope.
    const compact=await compile({...geometry,room_length_m:10,room_width_m:10});
    expect(quantitativeNeeds(compact)).toEqual([]);
    expect(compact.rows.some(r=>r.row_id===id('stage:expansion'))).toBe(false);
    expect(compact.rows.some(r=>r.row_id===id('material:expansion-profile'))).toBe(false);
  });

  test('a sub30mm last row is recut and its screws and transverse joints follow both new widths',async()=>{
    const result=await compile({...geometry,room_width_m:12.01});
    const quantity=(key:string)=>result.rows.find(r=>r.row_id===id(key))?.quantity;
    // In each 9.99×12.01m field: 9 rows×1.2m, then 0.60m and 0.61m;
    // 220 full-width screw lines×9 +25×5 +24×5 =2225 TN per field.
    expect(quantity('material:tn')).toBe('4450');
    // Per field transverse joints:18+19.2+2.4+1.83=41.43m;
    // plus 10 longitudinal joints×9.99m, doubled for two fields.
    expect(quantity('stage:joint')).toBe('282.66');
    expect(quantitativeNeeds(result).map(row=>row.row_id)).toEqual([id('labor:emac-joint-source-gap')]);
  });

  test('stages have actual resources and one whole-work cost owner, shared references do not duplicate board purchases',async()=>{
    const result=await compile(geometry);
    const process=canonicalEstimateWorkProcess(result.rows.map(r=>({rowId:r.row_id,operation:graph(r).operationCompositionV1,
      category:String(r.category),costTreatment:String(graph(r).costTreatment),titleRu:String(r.title_ru)})));
    expect(process).toHaveLength(1);
    expect(process[0]!.operations.map(s=>s.operationId)).toEqual([
      'setout','suspend','frame','clad','expansion','joint','prime','accept'].map(key=>id('operation:'+key)));
    const sections=canonicalEstimateResourceOperationSections(result.rows.map(r=>({rowId:r.row_id,
      operation:graph(r).operationCompositionV1,titleRu:String(r.title_ru)})));
    const suspension=sections.find(s=>s.operation?.operationId===id('operation:suspend'))!;
    expect(suspension.resourceIds).toEqual(expect.arrayContaining(['material:hangers','material:anchors','material:ln'].map(id)));
    const expansion=sections.find(s=>s.operation?.operationId===id('operation:expansion'))!;
    expect(expansion.resourceIds).toEqual(expect.arrayContaining(['material:expansion-profile','material:expansion-clips'].map(id)));
    expect(expansion.sharedResources.map(s=>s.rowId)).not.toContain(id('material:board'));
    expect(expansion.sharedResources.map(s=>s.rowId)).not.toContain(id('reference:base-labor'));
    expect(expansion.resourceIds).not.toContain(id('reference:base-labor'));
    expect(result.rows.filter(r=>r.row_id===id('material:board')&&r.included_in_procurement)).toHaveLength(1);
    expect(result.rows.filter(r=>r.category==='work'&&r.included_in_estimate).map(r=>r.row_id)).toEqual([id('work:whole')]);
    for(const row of definition.resources.filter(r=>r.row_id.startsWith(id('stage:')))){
      expect(row.cost_owner_id).toBe(id('work:whole'));
      expect(row.resource_graph.includedInResourceOwnerRowId).toBe(id('work:whole'));
    }
  });

  test('included equipment coverage breaks if its full-work provider is excluded; it is not empty quantitative equipment',async()=>{
    const result=await compile(geometry),scope=result.preliminaryNeeds.find(r=>r.row_id===id('scope:tools-access'))!;
    const declared=definition.resources.find(r=>r.row_id===id('scope:tools-access'))!;
    expect(declared.resource_graph.scopeRequirementV1).toMatchObject({kind:'INCLUDED',
      coveringRowIds:[id('work:whole')],costExclusionBreaksScopeV1:true,
      sourceEvidence:expect.arrayContaining([expect.objectContaining({sha256:pack.sources[0]!.sha256})])});
    expect(pack.commercialScopeRu).toContain('предоставление исполнителем');
    expect(graph(scope).scopeRequirementDecisionV1).toMatchObject({status:'INCLUDED',coveringRowIds:[id('work:whole')],
      numericNormAccepted:false,separatePaymentAccepted:false});
    const raw=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
      parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
      submittedParameters:geometry,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,
      rowOverrides:{[id('work:whole')]:{includedInEstimate:false,provenance:{kind:'manual',reason:'User excludes the whole-work provider'}}},maximumResourceRows:definition.resources.length});
    const removed=raw.preliminaryNeeds.find(r=>r.row_id===id('scope:tools-access'))!;
    expect(graph(removed).scopeRequirementDecisionV1).toMatchObject({status:'REQUIRED_RESOURCE_EXCLUDED'});
    // A financial refusal removes coverage; it cannot silently remove the physical source obligation.
    const jointGap=raw.preliminaryNeeds.find(r=>r.row_id===id('labor:emac-joint-source-gap'))!;
    expect(jointGap).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['p112_emac_joint_labor_hours']});
    expect(graph(jointGap).scopeRequirementDecisionV1).toBeUndefined();
  });

  test('a joint-free100m² ceiling has included publishedP112 base hours up to the actual installation-height boundary',async()=>{
    for(const height of [2,3.88]){
      const result=await compile({...geometry,room_length_m:10,room_width_m:10,ceiling_height_m:height});
      const refs=result.rows.filter(row=>row.row_id.startsWith(id('reference:')));
      expect(refs.map(row=>[row.row_id,row.quantity])).toEqual([
        [id('reference:base-labor'),'92'],[id('reference:electric-snips'),'0.14'],
        [id('reference:perforator'),'0.61'],[id('reference:screwdriver'),'2'],
      ]);
      expect(quantitativeNeeds(result)).toEqual([]);
      expect(result.rows.some(row=>row.row_id===id('labor:emac-joint-source-gap'))).toBe(false);
      for(const row of refs){
        expect(row.included_in_estimate).toBe(false);
        expect(row.included_in_procurement).toBe(false);
        expect(graph(row)).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
          includedInResourceOwnerRowId:id('work:whole')});
        const declared=definition.resources.find(resource=>resource.row_id===row.row_id)!;
        expect(declared.cost_owner_id).toBe(id('work:whole'));
        expect(declared.source_metadata).toMatchObject({baseNormCode:'10-05-011-01',baseNormCoefficient:1,
          baseNormMaximumInstallationHeightM:4,observedToolHoursClaimed:false,separatePaymentAllowed:false,fullMixedSystemHoursVerified:false});
      }
      expect(result.rows.filter(row=>row.included_in_estimate&&['work','labor','equipment'].includes(String(row.category)))
        .map(row=>row.row_id)).toEqual([id('work:whole')]);
    }
  });

  test('above4m anchor height keeps geometry but replaces all four unsupported hour quantities with internal source needs',async()=>{
    const above={...geometry,room_length_m:10,room_width_m:10,ceiling_height_m:3.881};
    // Finished ceiling3.881+drop0.12=anchor height4.001m. Geometry remains inside its original2-4m bounds.
    const result=await compile(above),ids=quantitativeNeeds(result).map(row=>row.row_id).sort();
    const expected=['labor:height-source-gap','equipment:snips-height-source-gap',
      'equipment:perforator-height-source-gap','equipment:screwdriver-height-source-gap'].map(id).sort();
    expect(ids).toEqual(expected);
    expect(result.rows.some(row=>row.row_id.startsWith(id('reference:')))).toBe(false);
    expect(result.rows.find(row=>row.row_id===id('work:whole'))?.quantity).toBe('100');
    expect(result.rows.some(row=>row.row_id===id('material:board')&&Number(row.quantity)>0)).toBe(true);
    for(const gap of quantitativeNeeds(result)){
      expect(gap.quantity).toBeNull();
      expect(gap.need_state).toBe('QUANTITY_REQUIRED');
      expect(graph(gap)).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
        includedInResourceOwnerRowId:id('work:whole')});
      expect(graph(gap).scopeRequirementDecisionV1).toBeUndefined();
      expect(definition.parameters.find(parameter=>parameter.parameter_id===gap.missing_parameter_ids[0])!.truth_metadata)
        .toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
    }
    await expect(compile({...above,p112_above_height_labor_hours:92})).rejects.toThrow('unresolved application norm cannot be supplied');
    // The independent EMAC condition adds only its own fifth need when a real joint exists.
    const withJoint=await compile({...above,room_length_m:20,room_width_m:15});
    expect(quantitativeNeeds(withJoint).map(row=>row.row_id).sort()).toEqual([...expected,id('labor:emac-joint-source-gap')].sort());
    expect(withJoint.rows.some(row=>row.row_id.startsWith(id('reference:')))).toBe(false);
    expect(withJoint.rows.find(row=>row.row_id===id('stage:expansion'))?.quantity).toBe('15');
  });

  test('300m² retains276/.42/1.83/6 base reference quantities and a real conditionalEMAC source need',async()=>{
    const result=await compile(geometry),qty=(key:string)=>result.rows.find(row=>row.row_id===id(key))?.quantity;
    expect([qty('reference:base-labor'),qty('reference:electric-snips'),qty('reference:perforator'),qty('reference:screwdriver')])
      .toEqual(['276','0.42','1.83','6']);
    expect(qty('work:whole')).toBe('300');
    const gap=quantitativeNeeds(result)[0]!;
    expect(gap).toMatchObject({row_id:id('labor:emac-joint-source-gap'),quantity:null,unit_id:'man_hour',
      need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['p112_emac_joint_labor_hours']});
    expect(graph(gap)).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
      includedInResourceOwnerRowId:id('work:whole'),operationCompositionV1:{operationId:id('operation:expansion')}});
    expect(graph(gap).scopeRequirementDecisionV1).toBeUndefined();
    const parameter=definition.parameters.find(p=>p.parameter_id==='p112_emac_joint_labor_hours')!;
    expect(parameter.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
    expect(pack.baseNorm.fullMixedSystemHoursVerified).toBe(false);
    await expect(compile({...geometry,p112_emac_joint_labor_hours:2})).rejects.toThrow('unresolved application norm cannot be supplied');
  });

  test('equal area does not invent a frame-density multiplier and only real joint geometry activates the labor gap',async()=>{
    const square=await compile({...geometry,room_length_m:10,room_width_m:10}),
      long=await compile({...geometry,room_length_m:20,room_width_m:5});
    const qty=(result:typeof square,key:string)=>result.rows.find(row=>row.row_id===id(key))?.quantity;
    expect(qty(square,'reference:base-labor')).toBe('92');
    expect(qty(long,'reference:base-labor')).toBe('92');
    expect(qty(square,'material:hangers')).not.toBe(qty(long,'material:hangers'));
    expect(quantitativeNeeds(square)).toEqual([]);
    expect(quantitativeNeeds(long).map(row=>row.row_id)).toEqual([id('labor:emac-joint-source-gap')]);
    expect(qty(long,'stage:expansion')).toBe('5');
  });

  test('a saved manual joint-hour budget stays source-incomplete and never adds a second payment owner',async()=>{
    const raw=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
      parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
      submittedParameters:geometry,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,
      rowOverrides:{[id('work:whole')]:{unitPrice:'250',provenance:{kind:'manual',reason:'One measured ceiling installation price'}},
        [id('labor:emac-joint-source-gap')]:{quantity:'2',unitPrice:'700',provenance:{kind:'manual',reason:'Saved budget does not establish a source norm'}}},
      maximumResourceRows:definition.resources.length});
    const gap=raw.preliminaryNeeds.find(row=>row.row_id===id('labor:emac-joint-source-gap'))!;
    expect(gap).toMatchObject({quantity:'2',need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['p112_emac_joint_labor_hours']});
    expect(gap.selected).toBe(false); // Included reference has no separate financial selection.
    expect(gap.procurement_eligible).toBe(false);
    expect(graph(gap).scopeRequirementDecisionV1).toBeUndefined();
    expect(raw.rows.filter(row=>row.included_in_estimate&&['work','labor','equipment'].includes(String(row.category)))
      .map(row=>row.row_id)).toEqual([id('work:whole')]);
    expect(raw.rows.find(row=>row.row_id===id('work:whole'))).toMatchObject({quantity:'300',unit_price:'250',amount:'75000'});
  });

  test('new internal reference resources retain source evidence without putting technical rates in public presentation',()=>{
    for(const resource of definition.resources){
      const presentation=resource.resource_graph.publicResourcePresentationV1 as {detailsRu:string[]};
      expect(presentation.detailsRu.join(' ')).not.toMatch(/PDF|92|0\.14|0\.61|0\.25|0\.7|100м²|10-05-011/);
    }
    for(const resource of definition.resources.filter(row=>row.row_id.startsWith(id('reference:'))||row.row_id===id('labor:emac-joint-source-gap')||row.row_id.includes('height-source-gap'))){
      const presentation=resource.resource_graph.publicResourcePresentationV1 as {nameRu:string;detailsRu:string[];rowKind:string};
      expect(presentation.rowKind).toBe('PROCESS_NOTE');
      expect(JSON.stringify(presentation)).not.toMatch(/92|100м|0\.14|0\.61|10-05-011|PDF|табл|машч/);
      expect(resource.cost_owner_id).toBe(id('work:whole'));
      expect(resource.source_metadata?.exact_locator).toBeTruthy();
    }
  });

  test('missing or inapplicable dimensions stay blocking; calculated counts cannot be forged as geometry',async()=>{
    await expect(compile({...geometry,room_width_m:15.01})).rejects.toThrow();
    await expect(compile({...geometry,ceiling_height_m:4.1})).rejects.toThrow();
    await expect(compile({...geometry,ceiling_drop_m:.4})).rejects.toThrow();
    await expect(compile({...geometry,p112_main_lines:1})).rejects.toThrow();
    await expect(compile({...geometry,area_m2:301})).rejects.toThrow();
    const incomplete=await compile({ceiling_height_m:3,ceiling_drop_m:.12});
    expect(incomplete.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes('room_length_m'))).toBe(true);
    expect(incomplete.rows.some(r=>r.row_id===id('material:hangers'))).toBe(false);
  });
});
