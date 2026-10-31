import {buildCt29IndoorResourceProvisionDefinitionR4,ct29IndoorResourceProvisionPackR4 as pack,
  ct29IndoorResourceProvisionCompletenessMapR4,assertCt29PhysicalProfilesR4} from '../../src/lib/estimate/v4/ct29IndoorResourceProvisionR4';
import {buildCt29IndoorResourceProvisionDefinitionR3} from '../../src/lib/estimate/v4/ct29IndoorResourceProvisionR3';
import {ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const source=ct29ExistingMineralPackS2754(1),prefix=ct29ExistingMineralPrefixS2754(1),id=(key:string)=>prefix+':'+key,
  definition=buildCt29IndoorResourceProvisionDefinitionR4(source,prefix),map=ct29IndoorResourceProvisionCompletenessMapR4(source,prefix),
  input={plaster_area_m2:160,layer_thickness_mm:10.5,ct29_delivery_distance_km:20},
  known=['mixer-drive','mixer-paddle','metal-float','water-measure','mixing-vessel','sprayer','paddle-cleaner'],
  open=['curing-water','skin-protection','eye-protection','control-provision','access-provision','handling-provision',
    'cleanup-provision','wash-water','adjacent-protection','power-provision','hearing-protection','work-clothing',
    'dust-protection-profile','drive-dry-cloth','coupling-maintenance','batch-cycle-provision','curing-labor','mixing-rotation-lock'],
  compile=(values:Record<string,unknown>=input)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:values});

describe('CT29 concrete vessel, fine sprayer and complete paddle cleaner with explicit remaining restraint',()=>{
  test('keeps the accepted R3 unchanged while replacing only two unknown profiles and adding two independently required components',async()=>{
    const parent=buildCt29IndoorResourceProvisionDefinitionR3(source,prefix);
    expect([parent.parameters.length,parent.formulas.length,parent.resources.length]).toEqual([34,42,42]);
    expect([definition.parameters.length,definition.formulas.length,definition.resources.length]).toEqual([36,44,44]);
    const changed=new Set(['mixing-vessel','sprayer','power-provision','hearing-protection','work-clothing']);
    for(const row of parent.resources)if(!changed.has(row.row_id.slice(prefix.length+1)))
      expect(definition.resources.find(r=>r.row_id===row.row_id)).toEqual(row);
    const r=await compile();expect(r.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort()).toEqual([...open].map(id).sort());
    for(const key of ['scope-tools','scope-cleanup']){
      expect(r.preliminaryNeeds.find(n=>n.row_id===id(key))).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED',missing_parameter_ids:[],unit_id:'',unit_price:null,selected:false,
        procurement_eligible:false,calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementDecisionV1:{status:'INCLUDED',missingObjectFactParameterIds:[],
          coveringRowIds:[id('labor')],numericNormAccepted:false,separatePaymentAccepted:false}}}});
      expect(r.rows.some(row=>row.row_id===id(key))).toBe(false);
    }
    expect(pack.readiness.fullTechnicalAcceptance).toBe(false);expect(pack.readiness.numericNormsIntroduced).toBe(0);
  });
  test('retains all accepted quantities and delivery inputs while provisioning seven reusable physical items only once',async()=>{
    const expectedCostOwnerByKey:Record<string,string>={
      'mixer-drive':'mixer','mixer-paddle':'mixer','metal-float':'labor','water-measure':'labor',
      'mixing-vessel':'labor','sprayer':'labor','paddle-cleaner':'labor'};
    expect(Object.keys(expectedCostOwnerByKey)).toEqual(known);
    for(const [values,order,delivery] of [[input,'3025','60.5'],[{...input,ct29_delivery_distance_km:22.5},'3025','68.0625'],
      [{...input,ct29_25kg_stock_bags:3},'2950','59']] as const){
      const r=await compile(values),q=(key:string)=>r.rows.find(row=>row.row_id===id(key))?.quantity;
      expect(q('net-mixture')).toBe('3024');expect(q('25kg-order')).toBe(order);expect(q('delivery')).toBe(delivery);
      expect(q('25kg-mix-water-consumed')).toBe('750.2');expect(q('labor')).toBe('87.1752');expect(q('mixer')).toBe('2.8056');
      for(const key of known){
        const row=r.rows.find(row=>row.row_id===id(key))!;
        expect(r.rows.filter(candidate=>candidate.row_id===id(key))).toHaveLength(1);
        expect(row).toMatchObject({quantity:'1',included_in_procurement:false,included_in_estimate:false,amount:null,
          calculation_trace:{resourceGraph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:id(expectedCostOwnerByKey[key]),includedInResourceOwnerRowId:id(expectedCostOwnerByKey[key])}}});
        if(['mixer-drive','mixer-paddle','metal-float','water-measure'].includes(key))
          expect(row.calculation_trace).toMatchObject({purchaseBalance:{consumed:'1',consumptionShortage:'0',procurementReady:true}});
        else {
          // A source-calculated serial-post count is not observed inventory or an order.
          expect(['mixing-vessel','sprayer','paddle-cleaner']).toContain(key);
          expect(row.calculation_trace).not.toHaveProperty('purchaseBalance');
          expect(definition.resources.find(resource=>resource.row_id===id(key))!.resource_graph).not.toHaveProperty('purchaseBalanceV1');
        }
      }
      expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id).sort()).toEqual(['25kg-order','25kg-mix-water-consumed','delivery'].map(id).sort());
    }
    expect(definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id))
      .toEqual(['plaster_area_m2','layer_thickness_mm']);
  });
  test('has exact primary evidence and compatibility rather than assigning container capacities as water norms',()=>{
    for(const s of pack.profiles.flatMap(p=>p.sources))expect(createHash('sha256').update(readFileSync(s.canonicalPath)).digest('hex')).toBe(s.sha256);
    expect(()=>assertCt29PhysicalProfilesR4(pack.profiles)).not.toThrow();
    for(const mutate of [(p:typeof pack.profiles)=>{p[0].specification.usefulL=15;},
      (p:typeof pack.profiles)=>{p[0].specification.rotationBarIncluded=true;},
      (p:typeof pack.profiles)=>{p[1].specification.waterCompatibilityConfirmed=false;},
      (p:typeof pack.profiles)=>{Object.assign(p[1].specification,{careWaterNormL:1});},
      (p:typeof pack.profiles)=>{p[2].specification.maxPaddleDiameterMm=100;},
      (p:typeof pack.profiles)=>{p[2].specification.integralBrushCount=0;}]){
      const changed=structuredClone(pack.profiles);mutate(changed);expect(()=>assertCt29PhysicalProfilesR4(changed)).toThrow('CT29_R4_PHYSICAL_PROFILE_INCOMPATIBLE');
    }
  });
  test('does not accept a vessel without restraint, omit cleaning kit, or bind its resources to an unrelated operation',async()=>{
    const expected={ 'mixing-vessel':['mixing','completion'],sprayer:['curing','completion'],
      'paddle-cleaner':['mixing','completion'],'mixing-rotation-lock':['mixing'],
      'power-provision':['mixing','completion'],'hearing-protection':['mixing','completion'],'work-clothing':['mixing','completion'] };
    const validate=(resources:typeof definition.resources)=>validateIndependentCompletenessMapReferences({
      completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:resources});
    expect(validate(definition.resources)).toEqual([]);
    for(const [key,ops] of Object.entries(expected)){
      const row=definition.resources.find(r=>r.row_id===id(key))!;
      expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(ops.map(o=>id('operation:'+o)));
      expect(row.source_metadata?.physicalProvisionAccepted).toBe(['mixing-vessel','sprayer','paddle-cleaner'].includes(key));
      expect(parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1)).not.toBeNull();
      expect(validate(definition.resources.filter(row=>row.row_id!==id(key)))).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
      expect(canonicalPublicResourceRowKindV1({rowId:row.row_id,titleRu:row.title_ru,category:row.category,graph:row.resource_graph,
        descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment})).toBe('RESOURCE');
    }
    const wrong=definition.resources.map(row=>row.row_id!==id('sprayer')?row:{...row,resource_graph:{...row.resource_graph,
      operationCompositionV1:definition.resources.find(r=>r.row_id===id('mixing-rotation-lock'))!.resource_graph.operationCompositionV1}});
    expect(validate(wrong)).toEqual(expect.arrayContaining([expect.stringMatching(/OPERATION_BINDING$/)]));
    for(const key of ['mixing-rotation-lock','wash-water','curing-water','curing-labor'])
      expect((await compile()).preliminaryNeeds).toEqual(expect.arrayContaining([expect.objectContaining({row_id:id(key),need_state:'QUANTITY_REQUIRED',quantity:null})]));
    await expect(compile({...input,ct29_provision_r4_mixing_rotation_lock:1})).rejects.toThrow('unresolved application norm cannot be supplied');
  });
  test('manual zero, fractional and baseline included counts retain source HOLD without claiming inventory sufficiency or enabling procurement',async()=>{
    for(const key of ['mixing-vessel','sprayer','paddle-cleaner']){
      const profile=pack.profiles.find(profile=>profile.resourceKey===key)!;
      expect(definition.resources.find(resource=>resource.row_id===id(key))!.source_metadata).toMatchObject({
        physicalProvisionProfileId:profile.id,requiredSimultaneousFunctionalCount:1,numericNormAccepted:false,physicalResourceCoverageComplete:false});
      const recalculate=(quantity:string)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,
        primaryMeasureParameterId:'plaster_area_m2',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],
        resourceDefinitions:[...definition.resources],submittedParameters:input,confirmedParameters:definition.runtimeInput,priceItems:[],currencyCode:'KGS',
        maximumResourceRows:100,hashJson:estimateDeterministicHash,rowOverrides:{[id(key)]:{quantity,
          provenance:{kind:'manual',reason:'Physical availability check'}}}});
      for(const quantity of ['0','0.5','1']){
        const r=await recalculate(quantity),row=r.rows.find(row=>row.row_id===id(key))!;
        expect(row).toMatchObject({quantity,unit_id:'pcs',unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,
          calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'1',
            manualAmendment:{kind:'manual',reason:'Physical availability check'},resourceGraph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
              parentCostOwnerId:id('labor'),includedInResourceOwnerRowId:id('labor')}}});
        expect(row.calculation_trace).not.toHaveProperty('purchaseBalance');
        // A count edit is a saved fact, not source authority or a stock/order policy.
        expect(r.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort())
          .toEqual([...open].map(id).sort());
        expect(r.preliminaryNeeds.find(need=>need.row_id===id('scope-tools'))).toMatchObject({quantity:null,unit_id:'',unit_price:null,need_state:'CONDITION_REQUIRED',
          missing_parameter_ids:[],selected:false,procurement_eligible:false,calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',
            scopeRequirementDecisionV1:{status:'INCLUDED',missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false,coveringRowIds:[id('labor')]}}}});
        for(const need of ['mixing-rotation-lock','wash-water','curing-water','curing-labor'])
          expect(r.preliminaryNeeds.find(row=>row.row_id===id(need))).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
        expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id).sort())
          .toEqual(['25kg-order','25kg-mix-water-consumed','delivery'].map(id).sort());
        expect(r.rows.filter(row=>row.category==='labor'&&row.included_in_estimate).map(row=>row.row_id)).toEqual([id('labor')]);
        expect(r.rows.filter(row=>row.row_id===id(key))).toHaveLength(1);
      }
    }
    expect(pack.readiness).toMatchObject({physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,numericNormsIntroduced:0});
    expect(map).toMatchObject({physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false});
  });
});
