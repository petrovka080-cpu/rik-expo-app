import {buildCt29IndoorResourceProvisionDefinitionR3,ct29IndoorResourceProvisionCompletenessMapR3,
  ct29IndoorResourceProvisionPackR3 as pack,assertCt29MixingDriveProfileR3,assertCt29HandToolProfilesR3} from '../../src/lib/estimate/v4/ct29IndoorResourceProvisionR3';
import {ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754,ct29ExistingMineralDefinitionS2754,
 compileCt29ExistingMineralS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {extractPromptOwnedProfessionalParameters} from '../../src/features/consumerRepair/consumerCanonicalBaselineCompile';
import {buildCt29IndoorDeliveryCleanupDefinitionR2} from '../../src/lib/estimate/v4/ct29IndoorDeliveryCleanupR2';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateOperationReferences} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {assertCanonicalPurchaseReadinessV1,canonicalPurchaseShortagesV1} from '../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import fs from 'node:fs';
import {computeReleaseFingerprintPayload} from '../../scripts/release/computeReleaseFingerprints';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {adaptCanonicalRevisionToStructuredEstimate} from '../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {buildStructuredEstimateRequestDraft} from '../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../src/features/consumerRepair/requestEstimateViewModel';
import {consumerRepairRowIsTechnicalDetail,consumerRepairRowProcessNote} from '../../src/features/consumerRepair/consumerRepairRowMetadata';
import type {CanonicalEstimateCatalogItem,CanonicalEstimateRevisionView} from '../../src/lib/estimate/backendPlatform/contracts';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../src/lib/consumerRequests/consumerRequestTypes';

const source=ct29ExistingMineralPackS2754(1),prefix=ct29ExistingMineralPrefixS2754(1),id=(key:string)=>prefix+':'+key;
const definition=buildCt29IndoorResourceProvisionDefinitionR3(source,prefix);
const map=ct29IndoorResourceProvisionCompletenessMapR3(source,prefix);
const input={plaster_area_m2:160,layer_thickness_mm:10.5,ct29_delivery_distance_km:20};
const providedKeys=['mixer-drive','mixer-paddle','metal-float','water-measure'];
const compile=(submittedParameters:Record<string,unknown>=input)=>compileAutomaticConstructionOwnerR1({
  catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters});

describe('CT29 operation-specific physical provision cannot be replaced by an overhead label',()=>{
  test('a changed imported data file changes both product and JavaScript identities without writing source files',()=>{
    const target='data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
    const names=['productSourceHash','jsBundleFingerprint'] as const,before=names.map(name=>computeReleaseFingerprintPayload(name));
    for(const payload of before)expect(payload.files.map(file=>file.path)).toContain(target);
    const original=fs.readFileSync;
    const spy=jest.spyOn(fs,'readFileSync').mockImplementation(((file:fs.PathOrFileDescriptor,...args:unknown[])=>{
      const bytes=Reflect.apply(original,fs,[file,...args]);
      return String(file).replaceAll('\\','/').endsWith(target)?Buffer.concat([Buffer.from(bytes),Buffer.from(' ')]):bytes;
    }) as typeof fs.readFileSync);
    try{names.forEach((name,index)=>expect(computeReleaseFingerprintPayload(name).hash).not.toBe(before[index].hash));}
    finally{spy.mockRestore();}
  });
  test('saved transport and the actual editor distinguish operation counters from supplied physical labor and equipment',async()=>{
    const compiled=await compileCanonicalEstimateCore({operation:'compile',catalogId:pack.catalogId,compilerVersion:pack.contract,
      primaryMeasureParameterId:'plaster_area_m2',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],
      resourceDefinitions:[...definition.resources],submittedParameters:input,confirmedParameters:{...definition.runtimeInput},
      priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,
      hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')}),stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
      catalog_id:pack.catalogId,definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:'a'.repeat(64),
      row_count:compiled.rows.length,input_parameters:compiled.parameters,totals:compiled.totals,currency_code:'KGS',
      amendment_contract:{parameterSources:{preliminaryNeeds:compiled.preliminaryNeeds}}};
    const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
    const catalog={catalogId:pack.catalogId,releaseId:stored.release_id,namespace:'global',workKey:'ct29-editor-role-regression',
      titleRu:pack.titleRu,domain:'plaster_paint',definitionVersion:4,applicability:{},professionalMetadata:{},parameterSchema:[]} as CanonicalEstimateCatalogItem;
    const revision={apiVersion:'2026-08-14.r2',revisionId:stored.id,parentRevisionId:null,releaseId:stored.release_id,catalogId:pack.catalogId,
      revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:compiled.parameters,totals:compiled.totals,rowCount:compiled.rows.length,
      checksumSha256:stored.checksum_sha256,compilerVersion:pack.contract,createdAt:'2026-10-21T00:00:00Z',
      amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds} as CanonicalEstimateRevisionView;
    const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:compiled.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
    const draft=buildStructuredEstimateRequestDraft(payload),items=draft.items.map((item,index)=>({...item,id:'ct29-editor-'+index,requestDraftId:'ct29-editor'})) as ConsumerRepairRequestItem[];
    const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'ct29-editor'},items,
      structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
    const shown=buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items),row=(key:string)=>shown.find(item=>item.sourceParameters?.rowCode===id(key))!;
    for(const key of ['stage-mixing','stage-application'])expect(consumerRepairRowProcessNote(row(key))).toContain('общий труд');
    expect(consumerRepairRowIsTechnicalDetail(row('25kg-minimum-batches'))).toBe(true);
    for(const key of ['labor',...providedKeys,'curing-water','curing-labor']){
      expect(shown.map(item=>item.sourceParameters?.rowCode)).toContain(id(key));expect(consumerRepairRowIsTechnicalDetail(row(key))).toBe(false);expect(consumerRepairRowProcessNote(row(key))).toBeNull();
    }
    expect(row('mixer-paddle').quantity).toBe(1);
    expect(row('curing-water').quantity).toBeNull();
  });
  test('the current series selects R3 and retains explicit short-input and edited delivery through the actual ingress owner',async()=>{
    expect(source.contract).toBe(pack.contract);
    expect(ct29ExistingMineralDefinitionS2754(1)).toEqual(definition);
    const distance=extractPromptOwnedProfessionalParameters([{
      parameterId:'ct29_delivery_distance_km',unitId:'km',titleRu:'Расстояние доставки CT29 от склада до объекта',
      ordinal:0,valueType:'decimal',required:false,defaultValue:null,constraints:{min:0},visibilityRole:'USER_INPUT',valueSourceRole:'USER_INPUT',
      formulaConsumers:['delivery'],provenance:{consumer_input_role_v1:'OBJECT_FACT'},
    }], 'CT29, площадь160м², толщина10,5мм. Доставка 20 км.');
    expect(distance.ct29_delivery_distance_km).toBe('20');
    for(const [route,expected] of [[distance.ct29_delivery_distance_km,'60.5'],['22.5','68.0625']]){
      const r=await compileCt29ExistingMineralS2754(1,{...input,ct29_delivery_distance_km:route});
      expect(r.rows.find(row=>row.row_id===id('delivery'))?.quantity).toBe(expected);
      expect(r.rows.find(row=>row.row_id===id('water-measure'))?.quantity).toBe('1');
    }
  });
  test('reproduces omitted concrete tools in the retained R2 and restores independent expectations',()=>{
    const parent=buildCt29IndoorDeliveryCleanupDefinitionR2(source,prefix);
    for(const key of ['metal-float','sprayer','water-measure','mixer-paddle']){
      expect(parent.resources.some(row=>row.row_id===id(key))).toBe(false);
      expect(definition.resources.some(row=>row.row_id===id(key))).toBe(true);
      expect(map.entries.some(entry=>entry.expectedResourceId===key)).toBe(true);
    }
    expect(pack.readiness.physicalResourceCoverageComplete).toBe(false);
    expect(pack.readiness.numericNormsIntroduced).toBe(0);
  });
  test('preserves accepted CT29 quantities and the closed20/22.5km delivery calculation',async()=>{
    const r=await compile(),edited=await compile({...input,ct29_delivery_distance_km:22.5});
    const qty=(rows:typeof r.rows,key:string)=>rows.find(row=>row.row_id===id(key))?.quantity;
    expect(qty(r.rows,'25kg-order')).toBe('3025');expect(qty(r.rows,'net-mixture')).toBe('3024');
    expect(qty(r.rows,'25kg-mix-water-consumed')).toBe('750.2');
    expect(qty(r.rows,'delivery')).toBe('60.5');expect(qty(edited.rows,'delivery')).toBe('68.0625');
    expect(qty(r.rows,'labor')).toBe('87.1752');expect(qty(r.rows,'mixer')).toBe('2.8056');
    expect(r.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort())
      .toEqual(['curing-water',...pack.needs.filter(need=>!providedKeys.includes(need.id)).map(need=>need.id)].map(id).sort());
    for(const key of ['scope-tools','scope-cleanup']){
      const scope=r.preliminaryNeeds.find(need=>need.row_id===id(key))!;
      expect(scope).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED',missing_parameter_ids:[],unit_id:'',unit_price:null,selected:false,procurement_eligible:false,
        calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementDecisionV1:{status:'INCLUDED',missingObjectFactParameterIds:[],
          coveringRowIds:[id('labor')],numericNormAccepted:false,separatePaymentAccepted:false}}}});
      expect(r.rows.some(row=>row.row_id===id(key))).toBe(false);
    }
    expect(qty(r.rows,'mixer-drive')).toBe('1');expect(qty(r.rows,'mixer-paddle')).toBe('1');
    expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id).sort())
      .toEqual(['25kg-order','25kg-mix-water-consumed','delivery'].map(id).sort());
  });
  test('keeps every undemonstrated physical requirement visible and application-owned with one existing cost owner',()=>{
    for(const need of pack.needs){
      const row=definition.resources.find(row=>row.row_id===id(need.id))!,graph=row.resource_graph;
      expect(graph.costTreatment).toBe(need.costTreatment);
      if(need.costTreatment==='INCLUDED_IN_RESOURCE_ROWS')expect(graph.parentCostOwnerId).toBe(id(need.costOwner));
      else {expect(graph.parentCostOwnerId).toBeUndefined();expect(row.source_metadata?.automaticSecondPaymentForbidden).toBe(true);}
      expect(row.procurement_eligible).toBe(false);
      expect(row.source_metadata?.physicalProvisionAccepted).toBe(providedKeys.includes(need.id));
      const parameter=definition.parameters.find(p=>p.parameter_id==='ct29_provision_r3_'+need.id.replaceAll('-','_'))!;
      expect(parameter).toMatchObject({required:false,default_value:null,truth_metadata:{visibility_role:'INTERNAL_ONLY',
        value_source_role:providedKeys.includes(need.id)?'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE':'UNRESOLVED_APPLICATION_NORM'}});
      expect(canonicalEstimateOperationReferences(graph.operationCompositionV1).map(o=>o.operationId))
        .toEqual(need.operations.map(operation=>id('operation:'+operation)));
      expect(parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)).not.toBeNull();
      expect(canonicalPublicResourceRowKindV1({rowId:row.row_id,titleRu:row.title_ru,category:row.category,graph,
        descriptor:graph.publicResourcePresentationV1,costTreatment:graph.costTreatment})).toBe('RESOURCE');
    }
  });
  test('a user-supplied1 or0 cannot confirm an unavailable physical profile',async()=>{
    for(const value of [0,1])await expect(compile({...input,ct29_provision_r3_sprayer:value}))
      .rejects.toThrow('unresolved application norm cannot be supplied');
  });
  test('the explicit single-post drive assembly has pinned primary specifications and rejects incompatible substitutes',()=>{
    for(const source of pack.mixingDriveProfile.sources)expect(createHash('sha256').update(readFileSync(source.canonicalPath)).digest('hex')).toBe(source.sha256);
    expect(()=>assertCt29MixingDriveProfileR3(pack.mixingDriveProfile)).not.toThrow();
    for(const change of [
      {paddle:{...pack.mixingDriveProfile.paddle,mixingMaxKg:25}},
      {paddle:{...pack.mixingDriveProfile.paddle,diameterMm:160}},
      {drive:{...pack.mixingDriveProfile.drive,powerW:1100}},
      {drive:{...pack.mixingDriveProfile.drive,coupling:'M14'}},
    ])expect(()=>assertCt29MixingDriveProfileR3({...pack.mixingDriveProfile,...change})).toThrow('DRIVE_PROFILE_INCOMPATIBLE');
  });
  test('an included reusable item retains a real sufficiency balance without a purchase or a second price',async()=>{
    const recalculate=(quantity:string)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,
      compilerVersion:pack.contract,primaryMeasureParameterId:'plaster_area_m2',parameterDefinitions:[...definition.parameters],
      formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters:input,
      confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,
      hashJson:estimateDeterministicHash,rowOverrides:{[id('mixer-paddle')]:{quantity,provenance:{kind:'manual',reason:'Physical availability check'}}}});
    const r=await recalculate('1'),paddle=r.rows.find(row=>row.row_id===id('mixer-paddle'))!;
    expect(paddle).toMatchObject({quantity:'1',included_in_estimate:false,included_in_procurement:false,amount:null});
    const missing=await recalculate('0'),missingPaddle=missing.rows.find(row=>row.row_id===id('mixer-paddle'))!;
    expect(missingPaddle.quantity).toBe('0');
    expect(canonicalPurchaseShortagesV1([missingPaddle])).toEqual([expect.objectContaining({rowId:id('mixer-paddle'),consumptionShortage:'1'})]);
    expect(()=>assertCanonicalPurchaseReadinessV1([missingPaddle])).toThrow(expect.objectContaining({code:'PROCUREMENT_MATERIAL_SHORTAGE'}));
    expect(()=>assertCanonicalPurchaseReadinessV1([paddle])).not.toThrow();
    await expect(recalculate('0.5')).rejects.toThrow();
  });
  test('one long metal float and one readable jug cover sequential uses without duplicated stock or purchase',async()=>{
    const r=await compile();
    for(const profile of pack.handToolProfiles){
      for(const source of profile.sources)expect(createHash('sha256').update(readFileSync(source.canonicalPath)).digest('hex')).toBe(source.sha256);
      const row=r.rows.find(row=>row.row_id===id(profile.resourceKey))!;
      expect(row).toMatchObject({quantity:'1',included_in_estimate:false,included_in_procurement:false,amount:null});
      expect(row.calculation_trace).toMatchObject({purchaseBalance:{consumed:'1',effectiveOrder:'1',consumptionShortage:'0',procurementReady:true}});
    }
    expect(()=>assertCt29HandToolProfilesR3(pack.handToolProfiles)).not.toThrow();
    const wrong=structuredClone(pack.handToolProfiles);
    wrong.find(p=>p.resourceKey==='water-measure')!.specification.graduationMl=500;
    expect(()=>assertCt29HandToolProfilesR3(wrong)).toThrow('CT29_HAND_TOOL_PROFILE_INCOMPATIBLE');
  });
  test('short public names preserve authored balance-detail roles without hiding a paid, purchased or manually named resource',()=>{
    for(const key of ['net-mixture','25kg-minimum-batches','25kg-mix-water-min','25kg-mix-water-max']){
      const row=definition.resources.find(row=>row.row_id===id(key))!,graph=row.resource_graph;
      const view={rowId:row.row_id,titleRu:row.title_ru,category:row.category,graph,
        descriptor:graph.publicResourcePresentationV1,costTreatment:graph.costTreatment};
      expect(canonicalPublicResourceRowKindV1(view)).toBe('CALCULATION_DETAIL');
      expect(canonicalPublicResourceRowKindV1({...view,includedInProcurement:true})).toBe('RESOURCE');
      expect(canonicalPublicResourceRowKindV1({...view,unitPrice:'0'})).toBe('RESOURCE');
      expect(canonicalPublicResourceRowKindV1({...view,manualTitleOverride:true})).toBe('RESOURCE');
    }
  });
  test('independent map rejects forgotten inventory and wrong-stage binding',()=>{
    const validate=(resources:typeof definition.resources)=>validateIndependentCompletenessMapReferences({
      completenessMap:map,resourceDefinitions:resources,formulaDefinitions:definition.formulas});
    expect(validate(definition.resources)).toEqual([]);
    expect(validate(definition.resources.filter(row=>row.row_id!==id('sprayer')))).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
    const wrong=definition.resources.map(row=>row.row_id!==id('metal-float')?row:{...row,
      resource_graph:{...row.resource_graph,operationCompositionV1:definition.resources.find(r=>r.row_id===id('mixer-drive'))!.resource_graph.operationCompositionV1}});
    expect(validate(wrong)).toEqual(expect.arrayContaining([expect.stringMatching(/OPERATION_BINDING$/)]));
  });
  test('independent manual audit obligations cannot disappear with uncreated rows or be hidden by a cost label',async()=>{
    const expected:Record<string,string[]>= {
      'hearing-protection':['mixing'],'work-clothing':['mixing'],'dust-protection-profile':['mixing'],
      'drive-dry-cloth':['completion'],'coupling-maintenance':['mixing','completion'],
      'batch-cycle-provision':['mixing','application'],'curing-labor':['curing'],
    },r=await compile();
    for(const [key,ops] of Object.entries(expected)){
      const row=definition.resources.find(row=>row.row_id===id(key))!;
      expect(row).toBeDefined();
      expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId))
        .toEqual(ops.map(op=>id('operation:'+op)));
      expect(r.preliminaryNeeds).toEqual(expect.arrayContaining([expect.objectContaining({row_id:id(key),quantity:null,need_state:'QUANTITY_REQUIRED'})]));
      expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,
        resourceDefinitions:definition.resources.filter(row=>row.row_id!==id(key))})).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
    }
    expect(pack.needs.find(n=>n.id==='power-provision')!.specificationRu).toContain('не более30мА');
    for(const key of ['curing-labor','batch-cycle-provision','dust-protection-profile']){
      // The existing core carries uncalculated needs separately from priced
      // resource rows. They remain explicit needs and cannot become a payment.
      expect(r.rows.some(row=>row.row_id===id(key))).toBe(false);
      expect(r.preliminaryNeeds.find(row=>row.row_id===id(key))).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
    }
  });
});
