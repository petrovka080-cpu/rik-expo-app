import {buildMonolithicStrengthDirectWholeCycleR2 as build, strengthDirectParameterR2 as p,
  strengthDirectRowR2 as row, strengthDirectPackR2 as pack} from './monolithicStrengthDirectWholeCycleR2';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

// Independent physical example: three separately deployed, single-drive
// stations. This is not a per-point wear rate, productivity or service price.
const facts = (): Record<string,unknown> => ({
  [p('member_count')]:1,[p('member_kind')]:'FLAT',[p('area_m2')]:100,
  [p('member_ref')]:'TEST_ONLY exact inspected wall and control programme',
  [p('thickness_mm')]:200,[p('aggregate_mm')]:20,[p('spacing_mm')]:240,
  [p('edge_mm')]:150,[p('rebar_clear_mm')]:70,
  [p('device_count')]:1,[p('deployment_ref')]:'TEST_ONLY test instrument inventory',
  [p('provider_ref')]:'TEST_ONLY named instrument/provider/verification',
  [p('drill_post_count')]:3,[p('drill_deployment_ref')]:'TEST_ONLY three deployed stations and approved work place',
  [p('drill_face')]:'VERTICAL_WALL',[p('drill_condition')]:'DRY',[p('drill_access')]:'STABLE_GROUND',
  [p('drill_voltage_v')]:230,[p('drill_holder')]:'SDS_PLUS',
  [p('drill_diameter_mm')]:25,[p('drill_depth_mm')]:75,
  [p('drill_dust_class')]:'H',[p('drill_flow_m3h')]:57.9,
  [p('drill_dust_system_ref')]:'TEST_ONLY exact H filter, selected bag, hood, adapter,35mm hose, flow and inspection records',
});
const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({
  definition:build(),compilerVersion:pack.contract,catalogId:'TEST_ONLY_UNPUBLISHED_STRENGTH_SOURCE_FRAGMENT',
  primaryMeasureParameterId:p('member_count'),submittedParameters,
});

describe('selected dry wall drilling assembly for concrete strength testing',()=>{
  it('counts one drive and one initial25mm bit per actual station, with no new payment or purchase',async()=>{
    const result=await compile(facts());
    for(const key of ['drill','drill-bit']){
      const actual=result.rows.find(x=>x.row_id===row(key));
      expect(actual?.quantity).toBe('3');
      expect(actual?.included_in_estimate).toBe(false);
      expect(actual?.included_in_procurement).toBe(false);
    }
    expect(result.rows.find(x=>x.row_id===row('sites-flat'))?.quantity).toBe('20');
    for(const key of ['dust-control','prepare-labour','repair-mortar','whole-service']){
      expect(result.preliminaryNeeds.some(x=>x.row_id===row(key))).toBe(true);
      expect(result.rows.find(x=>x.row_id===row(key))?.quantity??null).toBeNull();
    }
    expect(pack.newFull).toBe(0);
    expect(pack.closedWholeNeeds).toBe(0);
  });
  it.each(['drill_post_count','drill_deployment_ref','drill_face','drill_condition','drill_access',
    'drill_voltage_v','drill_holder','drill_diameter_mm','drill_depth_mm','drill_dust_class',
    'drill_flow_m3h','drill_dust_system_ref'])(
    'keeps drilling quantities unknown when actual fact %s is absent',async key=>{
      const input=facts();delete input[p(key)];const result=await compile(input);
      for(const resource of ['drill','drill-bit']){
        expect(result.preliminaryNeeds.some(x=>x.row_id===row(resource))).toBe(true);
        expect(result.rows.find(x=>x.row_id===row(resource))?.quantity??null).toBeNull();
      }
    });
  it.each(['member_ref','deployment_ref','provider_ref','thickness_mm','aggregate_mm','spacing_mm','edge_mm','rebar_clear_mm'])(
    'also withholds the selected instrument kit when mandatory source fact %s is absent',async key=>{
      const input=facts();delete input[p(key)];const result=await compile(input);
      for(const resource of ['anchor','spanner','blow-pump','wire-brush','press','micrometer','usb-cable','charger']){
        expect(result.preliminaryNeeds.some(x=>x.row_id===row(resource))).toBe(true);
        expect(result.rows.find(x=>x.row_id===row(resource))?.quantity??null).toBeNull();
      }
    });
  it.each([
    ['drill_post_count',0],['drill_face','CEILING'],['drill_condition','WET'],
    ['drill_access','LADDER'],['drill_voltage_v',110],['drill_holder','SDS_MAX'],
    ['drill_diameter_mm',24],['drill_depth_mm',74.9],['drill_depth_mm',200],
    ['drill_dust_class','M'],['drill_flow_m3h',57.8],
  ] as const)('rejects incompatible supplied fact %s=%s',async(key,value)=>{
    await expect(compile({...facts(),[p(key)]:value})).rejects.toMatchObject({
      code:'PARAMETER_VALIDATION_FAILED',message:expect.stringContaining(p(key)),
    });
  });
  it('retains one-owner information and pending whole-method source needs in its declarations',()=>{
    const owner=build();
    for(const key of ['drill','drill-bit']){
      const actual=owner.resources.find(x=>x.row_id===row(key));
      if(!actual?.source_metadata)throw new Error('SELECTED_DRILLING_SOURCE_METADATA_REQUIRED:'+key);
      expect(actual.source_metadata.sourceRole).toBe('EXACT_SELECTED_DRILLING_ASSEMBLY_INFORMATIONAL_ONLY');
      expect(actual.source_metadata.noNewPaidOwner).toBe(true);
      expect(actual.source_metadata.noNewProcurementOwner).toBe(true);
    }
    for(const key of ['dust_control','prepare_labour','repair_mortar','whole_service']){
      const actual=owner.parameters.find(x=>x.parameter_id===p('application_'+key));
      expect(actual?.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
      expect(actual?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
    }
  });
});
