import {canonicalProfessionalPdfReviewAcknowledgmentV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalPublicEstimateRowNameRu as name,canonicalPublicEstimateRowDetailsRu as details} from './canonicalPublicEstimateLanguageRu';
import {canonicalArtifactVisibleRowTitle} from './canonicalEstimateArtifactContract';
import {canonicalPublicResourceDisplayPresentationV1} from './canonicalPublicResourcePresentationV1';
import {canonicalArtifactSpecificationParts,buildCanonicalProcurementProjection} from './canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection} from './canonicalProfessionalPdf';

const sheet={rowId:'equipment:formwork:dokaflex-3so-sheets-rental',
  titleRu:'Опалубочные листы Doka 3-SO — Doka 3-SO 21 мм по ведомости ACCEPTANCE-FW-DOKAFLEX-LAYOUT-STANDARD-001-REV-A'};
const beam={rowId:'equipment:formwork:dokaflex-primary-beams-rental',
  titleRu:'Главные балки Doka H20 — Doka H20 top 3,90 м, главная балка по ведомости ACCEPTANCE-FW-DOKAFLEX-LAYOUT-STANDARD-001-REV-A'};

test.each([[sheet,'Опалубочные листы, 21 мм'],[beam,'Главные балки опалубки, 3,90 м']] as const)(
  'a saved source row has one functional name with its actual dimensions in every common presentation', (source,expected)=>{
    const before=JSON.stringify(source),row={row_id:source.rowId,title_ru:source.titleRu,
      calculation_trace:{resourceGraph:{titleSpecificationMode:'APPEND',titleSpecificationParameterIds:['spec'],titleSpecificationSeparator:' — '}}};
    const spec=source.titleRu.split(' — ')[1]!;
    expect(name(source)).toBe(expected);
    expect(canonicalArtifactVisibleRowTitle(row)).toBe(expected);
    expect(canonicalArtifactVisibleRowTitle(row,{spec})).toBe(expected);
    expect(canonicalPublicResourceDisplayPresentationV1({...source,descriptor:null})?.nameRu).toBe(expected);
    expect(details(source)).toContain(spec);
    expect(JSON.stringify(source)).toBe(before);
  });

test('a different physical specification keeps its dimension instead of inheriting the validation example',()=>{
  expect(name({...sheet,titleRu:sheet.titleRu.replace('21 мм','27 мм')})).toBe('Опалубочные листы, 27 мм');
});

test('the common PDF does not append source-only commercial selections after the functional row name',()=>{
  const spec=sheet.titleRu.split(' — ')[1]!;
  const rowBody={row_id:sheet.rowId,title_ru:sheet.titleRu,ordinal:1,category:'equipment',section:'Опалубка',unit_id:'piece',
    quantity:'5',unit_price:'10',amount:'50',currency_code:'KGS',included_in_estimate:true,included_in_procurement:true,procurement_eligible:true,ownership_status:'OWNED',
    calculation_trace:{resourceGraph:{titleSpecificationMode:'APPEND',titleSpecificationParameterIds:['spec'],titleSpecificationSeparator:' — '}}};
  const row={...rowBody,row_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(rowBody))};
  const revision={id:'saved-formwork',release_id:'saved-release',catalog_id:'saved-catalog',definition_version_id:'test-formwork-definition',checksum_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(row)),row_count:1,
    currency_code:'KGS',created_at:'2026-10-23T00:00:00Z',input_parameters:{spec}};
  const before=JSON.stringify({revision,row});
  expect(()=>buildCanonicalProfessionalPdfProjection({revision,rows:[row],workTitleRu:'Опалубка перекрытия'})).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID'}));
  const ack=canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources:[row],
    request:{revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,
      checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true},actorUserId:'test-reader',acknowledgedAt:'2026-10-23T00:00:00Z'});
  const render={revision,rows:[row],workTitleRu:'Опалубка перекрытия',issuancePurpose:'PRELIMINARY_REVIEW' as const,reviewAcknowledgmentV1:ack};
  expect(()=>buildCanonicalProfessionalPdfProjection({...render,reviewAcknowledgmentV1:{...ack,revisionId:'different'}})).toThrow(expect.objectContaining({code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'}));
  const pdf=buildCanonicalProfessionalPdfProjection(render);
  expect(pdf.html).toContain('Предварительная для проверки');
  expect(row).toMatchObject({quantity:'5',unit_price:'10',amount:'50'});
  expect(pdf.html).toContain('<strong>Опалубочные листы, 21 мм</strong>');
  expect(pdf.html).not.toMatch(/Doka|ACCEPTANCE-|по ведомости/u);
  const internal=canonicalArtifactSpecificationParts(row,{spec});
  expect(internal.flatMap(p=>p.parts)).toContain(spec);
  const procurement=buildCanonicalProcurementProjection({revision,procurementRows:[row],sourceRows:[row]});
  expect(procurement.rows[0]?.titleRu).toBe('Опалубочные листы, 21 мм');
  expect(procurement.rows[0]?.quantity).toBe('5');
  expect(JSON.stringify({revision,row})).toBe(before);
});

test('manual names and an unregistered resource sharing a source-title prefix are not rewritten',()=>{
  expect(name({...sheet,manualTitleOverride:true})).toContain('Doka 3-SO 21 мм');
  expect(canonicalPublicResourceDisplayPresentationV1({...sheet,descriptor:null,manualTitleOverride:true})).toBeNull();
  expect(name({...sheet,rowId:'unrelated-source'})).toContain('Doka 3-SO 21 мм');
  expect(name({...sheet,titleRu:'Заказные листы другой системы, 24 мм'})).toBe('Заказные листы другой системы, 24 мм');
});

test.each([
  ['equipment:formwork:dokaflex-lowering-heads-rental','Опускные головки Doka H20, артикул 586174000','Опускные головки для балок опалубки'],
  ['delivery:formwork:dokaflex-outbound-kit','Доставка комплекта Dokaflex на объект','Доставка комплекта опалубки на объект'],
  ['delivery:formwork:dokaflex-return-kit','Возврат арендного комплекта Dokaflex поставщику','Возврат арендного комплекта опалубки поставщику'],
])('static source wording uses the same public projection: %s',(rowId,titleRu,expected)=>{
  expect(name({rowId,titleRu})).toBe(expected);
  expect(name({rowId,titleRu,manualTitleOverride:true})).toBe(titleRu);
});
