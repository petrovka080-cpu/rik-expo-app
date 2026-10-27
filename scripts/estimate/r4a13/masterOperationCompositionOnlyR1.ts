import reviewedCurrentFinishingOperationsR414 from '../../../data/estimate-benchmarks/fixtures/current-finishing-reviewed-operation-maps-r414.json';
import reviewedCartridgeOperationsR388 from '../../../data/estimate-benchmarks/fixtures/prepared-cartridge-reviewed-operation-maps-r388.json';
// Pure admission and delta guard. The existing Master publisher remains the only writer.
import {createHash} from 'node:crypto';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import type {MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
type Json=Record<string,any>;
export type MasterOperationCompositionOnlyR1=Readonly<{
  contract:'master-operation-composition-only/r1';
  capturedContentPassport:Json; capturedContentPassportSha256:string;
  operationByRowId:Readonly<Record<string,Json|null>>; operationMapSha256:string;
  unchangedAbsentOperationRows?:readonly Readonly<{rowId:string;resourceSpecId:string}>[];
}>;
const anchors:Readonly<Record<string,readonly[string,string]>>={
  "canonical-work:master:ce40_glazed_ceramic_ready_wall_5x5cm_2mm_standard":["5b1432cb983082c9136e0e4cf56b72677abd15283794b1c79f40b199745f7ea9","adc353fa5fa58f3e2ebd9fe1d90422bc2993900fe563b9c76481a72b9b95f81a"],
  "canonical-work:base:plaster_paint_interior_wall_putty_level_high_load":["1f235fc386d0b0078f6acf275caa72414b813f75aed7207aede3afea0ee8e45b","96f1c6aa3029f9286329d1a68094af2dd2856fcc8809c92e5a716c48aaab1e34"],
  "canonical-work:base:plaster_paint_interior_wall_putty_level_repair":["c173cd58c070ac0015a397343c65046e9b94d2ff8e5efb7f3fe0dc89e106c809","e9fd34b983b3af3c1bb9b06d2b7d0880a93efeddd5d0b3f292fb58d60f266c9c"],
  "canonical-work:base:plaster_paint_interior_wall_putty_level_standard":["453a0bd5e82b496281dee943da649e9dd5dd6cf8515ddea8f3b7441df006ca7b","4f8402266e52efe5084737c3ef49fbfddd888d42c566052babac644b71243397"],
  "canonical-work:base:plaster_paint_interior_wall_putty_level_technical_room":["025bf10afd3dbe0bda79badc80fb74b09e949171a3a48c3d6ee0beb17d6e258e","72650c009ecc207e15ff839c5cd5867f920efacafdfc53c5c2952c72dc277260"],
  "canonical-work:base:flooring_interior_baseboard_install_standard":["50ee56f13abd631fad5eace9164efaea3c51ddd5fec4fffced07542e9d1449ac","98e2480059af280fd372e6c4f0b7012b2e12b43df0767b539a91ea57eb0be4a2"],
  "canonical-work:base:flooring_interior_baseboard_install_high_load":["ed006ba2249e34cc962f4199e1efa767b248e1e919f307e42b1840038b0797c1","2448978d308715b11ac773214f200fe30043fe02b51a0019401a78283f4682f6"],
  "canonical-work:base:flooring_interior_baseboard_install_technical_room":["063bd23f909347125deccd609baa803cad8a92496f5cd547e905b53168e361c6","ba8c241511171bf0453e87b2a6ea09d2fa12b5fb61dc513b541f95b95e615c5f"],
  "canonical-work:base:flooring_interior_baseboard_install_wet_zone":["3818e8bb4e7f894e7104308c487c78ca79a783c15c492c3a2886419ccd6725d3","a9c5375bff6214cdb67782769f21e479a85758eee45d15ec04c03925ad6902fc"],
  "canonical-work:base:flooring_interior_baseboard_glue_standard":["97f357312c76e7fca0629052e263c2036665380d54902e9ed4dfcccb0005cfd9","ed5e8326018fb9a7743c7c7fc118873daf1fcb0ccb45d8f939f911840ad1e936"],
  "canonical-work:base:flooring_interior_baseboard_glue_high_load":["4afc04ec2e4dcacb291cea0027b4b1f66a47ea16fcb64f63e48af8b51b5e9604","ead7198a4a69fb1da443d303834d5bb764fc22f7e1fa5303fca685b4ca310262"],
  "canonical-work:base:flooring_interior_baseboard_glue_technical_room":["99f90127e68901f9d8deb51cd6727ae9434a2b2838f6bba773b8ca87bd1744ca","d27de7bd7ae9bb656a175c66b08ceee92b43cfc5e436e195881dd6709660c77d"],
  "canonical-work:base:flooring_interior_baseboard_glue_wet_zone":["3f6a9412c735a633715b85b63fff442e00e0059eda87255dbd80a9373f86b4ea","ac870f4855f7836f0ca9662e4b884b458e52e358054a200540f1c9a84dcab206"],
  "canonical-work:master:cs25_white01_ready_joint_10x5_existing_pe_backing_standard":["92e97a18e84130b0fe71517f0874791e9b96dcabf6f05fa2b90dfc5f60141a28","40e8129a4c5751bbde4831d76c190030282ad151a0cd23f657626d8578371c0a"],
  "canonical-work:master:forbo232_ready_wood_skirting_glue_concrete_standard":["9d0a8043b5d2e7273092fe1558406253b77a3146def6251534f50a163dc99937","ca7ac021f7bd472dd36e0be19e6983807ef6aef0b2a657ae4831044511829109"],
  'canonical-work:base:paving_roads_landscape_interior_asphalt_level_standard':[
    'dc4793f44bbeb7098a6cca4c5e40fac94eb1dd9815a890fd7ae4097f8d35b481','ba6162e806e363867fa38064b40ab1edda26d7c54422f62fbed3d9b49e8eb24d'],
  'canonical-work:base:paving_roads_landscape_interior_asphalt_compact_standard':[
    '72e638685b51fe76eb80fafb0241c30bcb61ec775fb3d14c90978d1af32a81ff','c506f71b14034d18ddf279923efcd4ec5c6c58bcb76bf6e2d319fc74391e5b69'],
  'canonical-work:expanded:bridge_asphalt':[
    'fb1a1131bf9d4305e346e887963639ca7dbf0d0e52a17b830252e9083e478617','e904a0c9902e09bd46bea995a706c906410c34bdf9228a8f7b5a498faab8b3e4'],
};
const encoded=(v:unknown)=>JSON.stringify(stable(JSON.parse(JSON.stringify(v))));
export const masterOperationValueSha256R1=(v:unknown)=>createHash('sha256').update(encoded(v)).digest('hex');
const same=(a:unknown,b:unknown)=>encoded(a)===encoded(b);
const object=(v:unknown):v is Json=>v!=null&&typeof v==='object'&&!Array.isArray(v);
const omit=(v:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(v).filter(([key])=>!keys.includes(key)));
function check(v:unknown,code:string):asserts v {if(!v)throw Error('MASTER_OPERATION_ONLY_'+code);}

const exactCt126UnchangedAbsenceParentsR408:Readonly<Record<string,string>>={
  "canonical-work:base:plaster_paint_interior_wall_putty_level_high_load": "761c8fc8-998d-5be5-9178-8611faaacd25",
  "canonical-work:base:plaster_paint_interior_wall_putty_level_repair": "2ede60c5-ddc9-5f2f-9b18-e2fe9de3e07b",
  "canonical-work:base:plaster_paint_interior_wall_putty_level_standard": "68818363-fad0-5cd6-bbea-9c7941e977f9",
  "canonical-work:base:plaster_paint_interior_wall_putty_level_technical_room": "822463d9-5b4f-5067-857c-048b96334ce1"
};

/** Retain an actual missing field; never manufacture a legacy operation.
 * This seam does not add a catalog to the literal capture/passport anchors. */
export function assertMasterOperationUnchangedAbsentRowsR408(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1):ReadonlySet<string>{
  const has=Object.hasOwn(m,'unchangedAbsentOperationRows'),declared=m.unchangedAbsentOperationRows;
  if(!has){check(Object.values(m.operationByRowId).every(object),'NULL_OPERATION_REQUIRES_EXACT_RETAINED_ABSENCE');return new Set();}
  check(exactCt126UnchangedAbsenceParentsR408[c.definition.catalog_id]===c.definition.id&&c.definition.definition_version===5
    &&c.parameters.length===97&&c.formulas.length===149&&c.resources.length===149,'EXACT_CURRENT_CT126_ABSENCE_PARENT');
  check(Array.isArray(declared)&&declared.length===59&&declared.every(v=>object(v)
    &&same(Object.keys(v).sort(),['resourceSpecId','rowId'])&&typeof v.rowId==='string'&&typeof v.resourceSpecId==='string')
    &&new Set(declared.map(v=>v.rowId)).size===59,'EXACT_ABSENT_ROW_IDENTITIES');
  const actual=c.resources.filter(row=>object(row.resource_graph)&&!Object.hasOwn(row.resource_graph,'operationCompositionV1'))
    .map(row=>({rowId:row.row_id,resourceSpecId:row.id}));
  const ordered=(values:readonly {rowId:string;resourceSpecId:string}[])=>values.slice().sort((a,b)=>a.rowId.localeCompare(b.rowId));
  check(actual.length===59&&same(ordered(actual),ordered(declared!)),'CAPTURED_ABSENCE_IDENTITY');
  check(same(Object.keys(m.operationByRowId).sort(),c.resources.map(row=>row.row_id).sort()),'EXACT_ROW_MAP');
  const ids=new Set(actual.map(v=>v.rowId));
  for(const row of c.resources)check(ids.has(row.row_id)?m.operationByRowId[row.row_id]===null:object(m.operationByRowId[row.row_id]),'ONLY_ACTUAL_UNCHANGED_ABSENCE');
  return ids;
}

export function assertMasterOperationCompositionDeclarationR1(input:Readonly<{
  catalogId:string;capture:MasterRetainedParentCaptureR1;captureSha256:string;mode:MasterOperationCompositionOnlyR1;
  newParameterSources:unknown;
}>):void{
  const {capture:c,mode:m}=input,anchor=anchors[input.catalogId];
  check(object(m)&&same(Object.keys(m).sort(),['contract','capturedContentPassport','capturedContentPassportSha256','operationByRowId','operationMapSha256',...(Object.hasOwn(m,'unchangedAbsentOperationRows')?['unchangedAbsentOperationRows']:[])].sort())
    &&m.contract==='master-operation-composition-only/r1','DECLARATION');
  check(anchor&&anchor[0]===input.captureSha256&&anchor[1]===m.capturedContentPassportSha256
    &&masterOperationValueSha256R1(m.capturedContentPassport)===anchor[1],'REVIEWED_PARENT_AND_PASSPORT');
  check(m.capturedContentPassport.definition_version_id===c.definition.id
    &&m.capturedContentPassport.catalog_id===input.catalogId
    &&m.capturedContentPassport.identity_mode==='WORK'&&m.capturedContentPassport.redirect_catalog_id===null,'PASSPORT_ANCHOR');
  check(same(input.newParameterSources,{})&&!Object.hasOwn(c.definition.source_metadata,'operationCompositionSuccessorV1'),'NO_NEW_QUANTITY_OR_COLLIDING_SLOT');
  const reviewedCartridgeMap=(reviewedCartridgeOperationsR388 as Record<string,Record<string,Json>>)[input.catalogId];
  if(reviewedCartridgeMap)check(same(m.operationByRowId,reviewedCartridgeMap),'EXACT_REVIEWED_CARTRIDGE_OPERATION_MAP');
  const reviewedCurrentMap=(reviewedCurrentFinishingOperationsR414 as Record<string,Record<string,Json|null>>)[input.catalogId];
  if(reviewedCurrentMap)check(same(m.operationByRowId,reviewedCurrentMap),'EXACT_REVIEWED_CURRENT_FINISHING_OPERATION_MAP');
  check(object(m.operationByRowId)&&same(Object.keys(m.operationByRowId).sort(),c.resources.map(r=>r.row_id).sort())
    &&masterOperationValueSha256R1(m.operationByRowId)===m.operationMapSha256,'EXACT_ROW_MAP');
  const unchangedAbsent=assertMasterOperationUnchangedAbsentRowsR408(c,m);
  const ids=new Set(c.resources.map(r=>r.row_id));
  const stageKeys=['operationId','operationTitleRu','completionCriterionRu','processOrdinal','processRole','whenResourcePresent'];
  const stages=new Map<string,string>();
  for(const [rowId,operation] of Object.entries(m.operationByRowId)){
    if(operation===null){check(unchangedAbsent.has(rowId),'ONLY_ACTUAL_UNCHANGED_ABSENCE');continue;}
    check(object(operation)&&Object.keys(operation).every(k=>['contractVersion','groupId','groupTitleRu','additionalOperations',...stageKeys].includes(k)),'OPERATION_KEYS');
    const related=operation.additionalOperations;
    check(related===undefined||(Array.isArray(related)&&related.length<=64&&related.every(v=>object(v)&&Object.keys(v).every(k=>stageKeys.includes(k)))),'RELATED_SHAPE');
    const refs=canonicalEstimateOperationReferences(operation);
    check(refs.length===1+(related?.length??0),'NO_IGNORED_OR_DUPLICATE_REFERENCE');
    for(const ref of refs){
      check(ref.processRole===undefined||['PROCESS','REFERENCE_ONLY','COST_SUMMARY'].includes(ref.processRole),'PROCESS_ROLE');
      check(ref.processOrdinal===undefined||(Number.isInteger(ref.processOrdinal)&&ref.processOrdinal>=0),'PROCESS_ORDINAL');
      check(ref.whenResourcePresent===undefined||ref.whenResourcePresent.every(id=>ids.has(id)),'RESOURCE_GATE_CLOSURE');
      const key=encoded([ref.groupId,ref.operationId]),value=encoded([ref.groupTitleRu,ref.operationTitleRu,ref.processRole,ref.processOrdinal,ref.completionCriterionRu]);
      check(!stages.has(key)||stages.get(key)===value,'CONFLICTING_STAGE');stages.set(key,value);
    }
  }
}
export function assertMasterOperationCompositionComputationR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,
  next:Readonly<{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]}>,phase:'REPRESENTATIVE'|'PLAN'):void{
  assertMasterOperationUnchangedAbsentRowsR408(c,m);
  for(const [kind,idKey]of [['parameters','parameter_id'],['formulas','formula_id'],['resources','row_id']]as const){
    check(next[kind].length===c[kind].length&&new Set(next[kind].map(r=>r[idKey])).size===c[kind].length,'NO_ADDED_OR_REMOVED_'+kind);
    for(const old of c[kind]){
      const actual=next[kind].find(r=>r[idKey]===old[idKey]);check(actual,'MISSING_'+kind);
      if(phase==='REPRESENTATIVE'){
        const expected=kind==='resources'&&m.operationByRowId[old.row_id]!==null?{...old,resource_graph:{...old.resource_graph,operationCompositionV1:m.operationByRowId[old.row_id]}}:old;
        check(same(expected,actual),'REPRESENTATIVE_'+kind+'_DRIFT');
      }else{
        const keys=['definition_version_id','created_at',...(kind==='parameters'?['approved_template_baseline_id']:[]),...(kind==='resources'?['id','row_sha256']:[])];
        const expected=kind==='resources'&&m.operationByRowId[old.row_id]!==null?{...old,resource_graph:{...old.resource_graph,operationCompositionV1:m.operationByRowId[old.row_id]}}:old;
        check(same(omit(expected,keys),omit(actual,keys)),'PLAN_'+kind+'_DRIFT');
      }
    }
  }
}
export function masterOperationCompositionRepresentativeR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,provenance:Json){
  check(provenance.parentDefinitionId===c.definition.id&&provenance.parentBaselineId===c.baseline.id,'SUCCESSOR_PARENT');
  return {bindings:c.bindings.map(b=>({row_id:c.resources.find(r=>r.id===b.resource_spec_id)!.row_id,locator_id:b.locator_id,applicability:b.applicability})),
    normativeSourceIds:c.baseline.normative_source_ids,
    sourceMetadata:{...c.definition.source_metadata,operationCompositionSuccessorV1:{...provenance,contract:m.contract,
      capturedContentPassportSha256:m.capturedContentPassportSha256,operationMapSha256:m.operationMapSha256,quantitySourcesChanged:false}},
    expectedNormativeBindingCount:c.bindings.length,normativeSourceClosure:c.normativeSources.map(s=>s.source_key)};
}
export function assertMasterOperationCompositionPlanR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,
  plan:Readonly<{baseline:Json;definition:Json;passport?:Json}>):void{
  const old=c.baseline;
  const semantic=['input_values','input_classification','uom_by_parameter','formula_consumer_ids','resource_consumer_row_ids','normative_source_ids','guide_provenance_ru','proposal_source_refs','contract_version'];
  check(semantic.every(k=>same(plan.baseline[k],old[k])),'BASELINE_SEMANTICS');
  check(same(plan.definition.passport,c.definition.passport)&&same(plan.definition.applicability,c.definition.applicability),'DEFINITION_SCOPE');
  check(plan.passport&&same(omit(plan.passport,['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at']),
    omit(m.capturedContentPassport,['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at'])),'CONTENT_SCOPE_AND_READINESS');
}
