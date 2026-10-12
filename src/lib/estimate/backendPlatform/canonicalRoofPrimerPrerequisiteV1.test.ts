import {resolveRoofPrimerPrerequisiteV1,parseRoofPrimerPrerequisiteCommandV1,readRoofPrimerPrerequisiteDecisionV1,
  ROOF_PRIMER_PREFIX_V1,ROOF_PRIMER_SOURCE_CATALOGS_V1,ROOF_PRIMER_LINK_CATALOGS_V1,roofPrimerPrerequisiteCommandFromDecisionV1} from './canonicalRoofPrimerPrerequisiteV1';
import {admitRoofPrimerPrerequisiteServerV1,listRoofPrimerPrerequisiteCandidatesServerV1} from './canonicalRoofPrimerPrerequisiteServerV1';
import {buildCanonicalRevisionCommitPayload} from './canonicalEstimateRevisionWriter';
import {canonicalEstimateRecalculateIdempotencyKey} from './canonicalEstimateCommandIdentity';
import {canonicalEstimateRevisionDetailFromStorage} from './canonicalEstimateRevisionReadMapper';
import {buildCanonicalProfessionalPdfProjection} from './canonicalProfessionalPdf';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1} from './canonicalRoofPlannedPreparationV1';

const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sha=(n:string)=>n.repeat(64),sourceSha=sha('a');
const fieldParameters={q:'19',roof_torch_system:'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя',roof_torch_conditions:'Условия ещё не проверены'};
function fixture(){return {
  command:{contractVersion:'canonical-roof-primer-prerequisite/v1',sourceRevisionId:uuid(2),sourceChecksumSha256:sourceSha,phase:'planned',sectionLabelRu:'Поле А',sameSectionAndCompatibilityConfirmed:true},
  fieldCatalogId:ROOF_PRIMER_LINK_CATALOGS_V1[0] as string,fieldInstanceId:uuid(1),fieldParameters:{...fieldParameters},sourceInstanceId:uuid(3),
  source:{id:uuid(2),checksum_sha256:sourceSha,status:'ready',catalog_id:ROOF_PRIMER_SOURCE_CATALOGS_V1[0],definition_version_id:uuid(4),release_id:uuid(5),revision_number:2,display_title_ru:'Огрунтовка основания — 37,5 м²',extra_payable_rows:false,
    input_parameters:{q:'37.5',roof_prime_system:'Готовая битумная эмульсия по бетонному или растворному основанию кровли',roof_prime_conditions:'Основание и совместимый ковёр подтверждены; высота до 15 м; огрунтовка отдельно не оплачена',roof_prime_area_scope:'Нормативная площадь этой огрунтовки проверена'}},
  sourceRows:[['workers','man_hour','1.05'],['flatbed_truck','machine_hour','0.015'],['ready_bitumen_emulsion','kg','16.875']].map(([role,unit,quantity],i)=>({row_id:ROOF_PRIMER_PREFIX_V1+':'+role,unit_id:unit,quantity,included_in_estimate:true,cost_owner_id:uuid(10+i),row_sha256:sha(String(i+1)),resource_graph:{costTreatment:'OWN_COST'},source_metadata:{sourceNormQuantityAccepted:true,normativeTrace:[{sourceSnapshotHash:'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8'}]},calculation_trace:{}})),
};}

describe('immutable roof primer dependency and single cost ownership',()=>{
  it('accepts the actual catalog-qualified cost identities of the published generic source owner',()=>{
    const f=fixture();f.sourceRows.forEach(row=>{row.cost_owner_id=f.source.catalog_id+':'+row.row_id;});
    const d=resolveRoofPrimerPrerequisiteV1(f);expect(d.ownerRows.map(row=>row.costOwnerId)).toEqual(f.sourceRows.map(row=>row.cost_owner_id));
    expect(readRoofPrimerPrerequisiteDecisionV1(d)).toEqual(d);
    for(const invalid of ['', '\u0000owner', 'x'.repeat(2001)]){const broken=fixture();broken.sourceRows[0].cost_owner_id=invalid;expect(()=>resolveRoofPrimerPrerequisiteV1(broken)).toThrow();}
  });
  it('links all five existing generic primer operations to either exact torch type without copying costs or equating areas',()=>{
    for(const fieldCatalogId of ROOF_PRIMER_LINK_CATALOGS_V1)for(const catalog_id of ROOF_PRIMER_SOURCE_CATALOGS_V1){
      const f=fixture();f.fieldCatalogId=fieldCatalogId;f.source.catalog_id=catalog_id;const before=JSON.stringify(f),d=resolveRoofPrimerPrerequisiteV1(f);
      expect(JSON.stringify(f)).toBe(before);expect(d.consumerNormAreaM2).toBe('19');expect(d.sourceNormAreaM2).toBe('37.5');
      expect(d.ownerRows.map(r=>r.quantity)).toEqual(['1.05','0.015','16.875']);expect(d).toMatchObject({phase:'planned',setsActualReadiness:false,addsPaidRows:false,quantityAllocationAccepted:false,namedProductQuantityAccepted:false,procurementAccepted:false});
      expect(readRoofPrimerPrerequisiteDecisionV1(d)).toEqual(d);expect(roofPrimerPrerequisiteCommandFromDecisionV1(d)).toEqual(f.command);
    }
  });
  it.each(['completed_accepted','planned','applied_readiness_unknown','partly_completed','unknown'])('keeps execution phase %s independent of normative quantities',phase=>{
    const f=fixture();f.command.phase=phase;const d=resolveRoofPrimerPrerequisiteV1(f);expect(d.phase).toBe(phase);expect(d.setsActualReadiness).toBe(false);expect(d.ownerRows).toHaveLength(3);
  });
  it('reuses the already-primed fact without inferring a product or admitting repeated execution',()=>{
    const f=fixture();f.fieldParameters.roof_torch_conditions='Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства';
    expect(()=>resolveRoofPrimerPrerequisiteV1(f)).toThrow(/повторную работу/);f.command.phase='completed_accepted';expect(resolveRoofPrimerPrerequisiteV1(f).addsPaidRows).toBe(false);
  });
  it('rejects unproved source identity, other technologies, same-instance cycles and compounded payers',()=>{
    const changes:((f:ReturnType<typeof fixture>)=>void)[]=[f=>{f.source.checksum_sha256=sha('b');},f=>{f.source.status='archived';},f=>{f.source.extra_payable_rows=true;},f=>{f.source.catalog_id='canonical-work:base:roofing_interior_flat_roof_install_standard';},f=>{f.sourceInstanceId=f.fieldInstanceId;},f=>{f.fieldParameters.roof_torch_system='Кровельная система или основание ещё не проверены';}];
    for(const change of changes){const f=fixture();change(f);expect(()=>resolveRoofPrimerPrerequisiteV1(f)).toThrow();}
    const f=fixture();expect(()=>resolveRoofPrimerPrerequisiteV1({...f,fieldCatalogId:'canonical-work:base:roofing_interior_flat_roof_install_high_load'})).toThrow();
  });
  it('rejects missing, manually changed, rounded, mismatched or non-payable source owners',()=>{
    const changes:((f:ReturnType<typeof fixture>)=>void)[]=[f=>{f.sourceRows.pop();},f=>{f.sourceRows[0].quantity='1.050000001';},f=>{f.sourceRows[1].unit_id='trip';},f=>{f.sourceRows[1].included_in_estimate=false;},f=>{f.sourceRows[2].source_metadata.normativeTrace[0].sourceSnapshotHash=sha('c');},f=>{f.sourceRows[2].cost_owner_id=f.sourceRows[0].cost_owner_id;},f=>{(f.sourceRows[0].calculation_trace as Record<string,unknown>).manualQuantityOverride=true;}];
    for(const change of changes){const f=fixture();change(f);expect(()=>resolveRoofPrimerPrerequisiteV1(f)).toThrow();}
  });
  it('keeps unsupported professional consumption/price inputs and forged numerical authority out of the command',()=>{
    const f=fixture();expect(()=>parseRoofPrimerPrerequisiteCommandV1({...f.command,consumptionRate:'0.175'})).toThrow();
    expect(()=>parseRoofPrimerPrerequisiteCommandV1({...f.command,sameSectionAndCompatibilityConfirmed:false})).toThrow();
    const d=resolveRoofPrimerPrerequisiteV1(f);expect(readRoofPrimerPrerequisiteDecisionV1({...d,setsActualReadiness:true})).toBeNull();expect(readRoofPrimerPrerequisiteDecisionV1({...d,quantityAllocationAccepted:true})).toBeNull();
  });
  it('distinguishes a changed/cleared dependency in the existing idempotency key and preserves legacy keys',()=>{
    const f=fixture(),base={parentRevisionId:uuid(1),parameters:{q:'19'},rowOverrides:{},customRows:[]};
    const old=canonicalEstimateRecalculateIdempotencyKey(base),linked=canonicalEstimateRecalculateIdempotencyKey({...base,roofPrimerPrerequisiteV1:parseRoofPrimerPrerequisiteCommandV1(f.command)});
    expect(linked).not.toBe(old);expect(canonicalEstimateRecalculateIdempotencyKey({...base,roofPrimerPrerequisiteV1:null})).not.toBe(linked);expect(canonicalEstimateRecalculateIdempotencyKey({...base})).toBe(old);
  });
  it('persists the reference in the existing immutable revision provenance and reads it without changing parameters, rows or totals',()=>{
    const d=resolveRoofPrimerPrerequisiteV1(fixture()),parameters={q:'19'},totals={amount:'0'};
    const payload=buildCanonicalRevisionCommitPayload({rowCount:9,currencyCode:'KGS',totals,checksumSha256:sha('d'),compilerVersion:'test',parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:parameters,parentRevisionId:uuid(1),identityContract:{},roofPrimerPrerequisiteV1:d});
    const storage={id:uuid(6),parent_revision_id:uuid(1),release_id:uuid(7),catalog_id:ROOF_PRIMER_LINK_CATALOGS_V1[0],revision_number:3,status:'ready',currency_code:'KGS',input_parameters:parameters,price_snapshot_ids:[],amendment_contract:{parameterSources:payload.parameterSources},totals,row_count:9,checksum_sha256:sha('d'),compiler_version:'test',created_at:'2026-10-12'};
    const r=canonicalEstimateRevisionDetailFromStorage(storage);expect(r.roofPrimerPrerequisiteV1).toEqual(d);expect(r.parameters).toEqual(parameters);expect(r.totals).toEqual(totals);expect(r.rowCount).toBe(9);
    expect(()=>canonicalEstimateRevisionDetailFromStorage({...storage,amendment_contract:{parameterSources:{roofPrimerPrerequisiteV1:{...d,addsPaidRows:true}}}})).toThrow();
  });
  it('projects the same pinned reference as information in PDF, escapes project text and adds no cost rows',()=>{
    const d=resolveRoofPrimerPrerequisiteV1(fixture());d.sectionLabelRu='<script>Поле А</script>';
    const projection=buildCanonicalProfessionalPdfProjection({revision:{id:uuid(6),release_id:uuid(7),catalog_id:ROOF_PRIMER_LINK_CATALOGS_V1[0],checksum_sha256:sha('d'),row_count:0,totals:{includedRowCount:0},amendment_contract:{parameterSources:{roofPrimerPrerequisiteV1:d}}},rows:[],workTitleRu:'Наплавляемое покрытие'});
    expect(projection.html).toContain('Связанная огрунтовка основания');expect(projection.html).toContain('&lt;script&gt;');expect(projection.html).not.toContain('<script>');expect(projection.html).toContain('План подготовки не подтверждает');expect(projection.html).toContain('Стоимость подготовки учитывается в связанной смете');
  });
});

describe('server authorization and inherited prerequisite evidence',()=>{
  const principal={ownerUserId:uuid(20),organizationId:uuid(21)};
  function reader(f=fixture()){
    const calls:{sql:string;values:unknown[]|undefined}[]=[];
    return {calls,query:async(sql:string,values?:unknown[])=>{calls.push({sql,values});
      if(sql.includes('with recursive owner_history'))return {rows:[{external_owner_seen:false,complete_instance:true}]};
      if(sql.includes('with recursive chain'))return {rows:[{id:values?.[0]===uuid(1)?f.fieldInstanceId:f.sourceInstanceId}]};
      if(sql.includes('join public.estimate_resource_spec'))return {rows:f.sourceRows};
      if(sql.includes('limit 40'))return {rows:[f.source]};
      return {rows:values?.[0]===uuid(1)?[{id:uuid(1),catalog_id:f.fieldCatalogId,input_parameters:f.fieldParameters}]:[f.source]};
    }};
  }
  it('authorizes source and ancestry with the current principal and validates again before commit',async()=>{
    const f=fixture(),db=reader(f);const d=await admitRoofPrimerPrerequisiteServerV1(db,{...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:f.fieldParameters,supplied:true,command:f.command,parentAmendmentContract:{}});
    expect(d?.sourceInstanceId).toBe(uuid(3));expect(db.calls.filter(c=>c.sql.includes('owner_user_id')).every(c=>c.values?.includes(principal.ownerUserId)&&c.values?.includes(principal.organizationId))).toBe(true);
  });
  it('retains the immutable link on ordinary parameter edits, and clears only the link when explicitly requested',async()=>{
    const f=fixture(),db=reader(f),d=resolveRoofPrimerPrerequisiteV1(f),base={...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:f.fieldParameters,parentAmendmentContract:{parameterSources:{roofPrimerPrerequisiteV1:d}}};
    expect(await admitRoofPrimerPrerequisiteServerV1(db,{...base,supplied:false,command:undefined})).toEqual(d);
    db.calls.length=0;expect(await admitRoofPrimerPrerequisiteServerV1(db,{...base,supplied:true,command:null})).toBeNull();expect(db.calls).toHaveLength(0);
  });
  it.each(['planned','completed_accepted','applied_readiness_unknown','partly_completed','unknown'])('blocks an internal whole-area plan alongside inherited external phase %s, including a same-request link clear',async phase=>{
    const f=fixture();f.command.phase=phase;const inherited=resolveRoofPrimerPrerequisiteV1(f),before=JSON.stringify(inherited),db=reader(f);
    const base={...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:{...f.fieldParameters,roof_torch_conditions:ROOF_PLANNED_PRIMER_CONDITIONS_V1},parentAmendmentContract:{parameterSources:{roofPrimerPrerequisiteV1:inherited}}};
    for(const change of [{supplied:false,command:undefined},{supplied:true,command:null},{supplied:true,command:f.command}])
      await expect(admitRoofPrimerPrerequisiteServerV1(db,{...base,...change})).rejects.toMatchObject({code:'ROOF_PRIMER_OWNER_CONFLICT'});
    expect(db.calls).toHaveLength(0);expect(JSON.stringify(inherited)).toBe(before);
  });
  it('allows the whole-area internal plan when there is no existing or newly supplied external owner',async()=>{
    const f=fixture(),db=reader(f);expect(await admitRoofPrimerPrerequisiteServerV1(db,{...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:{...f.fieldParameters,roof_torch_conditions:ROOF_PLANNED_PRIMER_CONDITIONS_V1},supplied:false,command:undefined,parentAmendmentContract:{}})).toBeNull();expect(db.calls).toHaveLength(1);
    expect(db.calls[0]!.values).toEqual([uuid(1),principal.ownerUserId,principal.organizationId]);
  });
  it('keeps a historical external owner unresolved after clearing the link in an earlier revision',async()=>{
    const f=fixture(),base={...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:{...f.fieldParameters,roof_torch_conditions:ROOF_PLANNED_PRIMER_CONDITIONS_V1},supplied:false,command:undefined,parentAmendmentContract:{}};
    await expect(admitRoofPrimerPrerequisiteServerV1({query:async()=>({rows:[{external_owner_seen:true,complete_instance:true}]})},base)).rejects.toMatchObject({code:'ROOF_PRIMER_OWNER_CONFLICT'});
    await expect(admitRoofPrimerPrerequisiteServerV1({query:async()=>({rows:[{external_owner_seen:false,complete_instance:false}]})},base)).rejects.toMatchObject({code:'ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH'});
  });
  it('returns bounded authorized suggestions without auto-selecting a source or establishing object compatibility',async()=>{
    const db=reader(),items=await listRoofPrimerPrerequisiteCandidatesServerV1(db,{...principal,fieldRevisionId:uuid(1)});
    expect(items).toHaveLength(1);expect(items[0]).not.toHaveProperty('sameSectionAndCompatibilityConfirmed');expect(db.calls.some(c=>c.sql.includes('limit 40')&&c.sql.includes('catalog_id=any'))).toBe(true);
  });
  it('rejects an inaccessible source and an unresolved/cyclic instance',async()=>{
    const f=fixture(),base={...principal,fieldRevisionId:uuid(1),fieldCatalogId:f.fieldCatalogId,fieldParameters:f.fieldParameters,supplied:true,command:f.command,parentAmendmentContract:{}};
    await expect(admitRoofPrimerPrerequisiteServerV1({query:async()=>({rows:[]})},base)).rejects.toMatchObject({code:'NOT_FOUND'});
    const db=reader();await expect(admitRoofPrimerPrerequisiteServerV1({query:async(sql,values)=>sql.includes('with recursive chain')?{rows:[]}:db.query(sql,values)},base)).rejects.toMatchObject({code:'ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH'});
  });
});
