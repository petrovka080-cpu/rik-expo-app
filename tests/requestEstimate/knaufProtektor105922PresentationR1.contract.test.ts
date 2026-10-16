// DRAFT / NOT_RUN. Pure projections and JSON replay, not database reopen/UI
// acceptance. UUIDs, project facts and explicit new-SKU prices are synthetic.
import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {stringifyCanonicalEstimateJson} from '../../src/lib/estimate/estimateDeterministicHash';
import {knaufProtektor105922DefinitionR1,knaufProtektor105922PackR1 as pack,
  knaufProtektor105922FactsR1 as f} from '../../src/lib/estimate/v4/knaufProtektor105922ForwardR1';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {canonicalPublicResourceDisplayPresentationV1} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalArtifactPreliminaryNeeds,canonicalArtifactVisibleRowTitle,canonicalArtifactSpecificationParts,
  buildCanonicalProcurementProjection,selectCanonicalArtifactRows} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection} from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';

const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
const owner=pack.ownerRowId;
const facts={q:'24',interior_plaster_material_system:pack.choiceRu.manual,
  knauf_scope_external_corner_scope:pack.choiceRu.hasCorners,[f.count]:'3',[f.length]:'2600',
  [f.product]:pack.choiceRu.product,[f.exposure]:pack.choiceRu.exposure,[f.cutFit]:pack.choiceRu.cutFit,
  [f.stock]:'0',[f.reserve]:'0',[f.multiple]:'1'};
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
async function fixture(quantity:string|null,title?:string) {
  const d=knaufProtektor105922DefinitionR1();
  const overrides={[owner]:{quantity,unitPrice:'91.23',...(title?{titleRu:title}:{}),
    provenance:{kind:'manual',reason:'SYNTHETIC_NEW_SKU_PRICE_AND_ORDER_ONLY'}}};
  const result=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.targetCatalogIds[0]!,
    compilerVersion:pack.contract+':presentation-control',primaryMeasureParameterId:f.count,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:facts,confirmedParameters:{},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',
    maximumResourceRows:d.resources.length,hashJson:hash});
  const revision={id:'80000000-0000-4000-8000-000000105922',release_id:'80000000-0000-4000-8000-000000000002',
    definition_version_id:'80000000-0000-4000-8000-000000000003',catalog_id:pack.targetCatalogIds[0]!,
    checksum_sha256:hash(result.revisionProjection),row_count:result.rows.length,currency_code:'KGS',
    input_parameters:result.parameters,totals:result.totals,
    amendment_contract:{rowOverrides:overrides,parameterSources:{preliminaryNeeds:result.preliminaryNeeds,
      ...(result.purchaseSupplyIndexV1?{purchaseSupplyIndexV1:result.purchaseSupplyIndexV1}:{})}}};
  return {result,revision};
}

test('the selected SKU and distinct details use the common saved-resource/procurement/PDF presentation',async()=>{
  const {result,revision}=await fixture('75');
  const r=result.rows.find(x=>x.row_id===owner)!;
  const mapped=canonicalEstimateRevisionRowFromStorage(r,null,null,revision.amendment_contract);
  const graph=(mapped.calculationTrace as any).resourceGraph;
  const shown=canonicalPublicResourceDisplayPresentationV1({titleRu:mapped.titleRu,
    descriptor:graph.publicResourcePresentationV1,rowId:owner});
  expect(shown?.nameRu).toBe('Угловой профиль для штукатурки');
  expect(shown?.specificationRu).toBe(pack.choiceRu.product);
  expect(mapped.titleRu).toContain('105922');
  const selection=selectCanonicalArtifactRows(result.rows as never[]);
  const procurement=buildCanonicalProcurementProjection({revision,...selection});
  expect(procurement.rows).toHaveLength(1);expect(procurement.rows[0]).toMatchObject({rowId:owner,quantity:'75'});
  expect(procurement.rows[0]!.specifications.flatMap(p=>p.parts)).toContain(pack.choiceRu.product);
  expect(canonicalArtifactVisibleRowTitle(r)).toBe('Угловой профиль для штукатурки');
  for(const info of pack.informationRows) {
    const source=result.rows.find(x=>x.row_id===pack.prefix+':'+info.suffix)!;
    expect(canonicalArtifactVisibleRowTitle(source)).toBe(info.titleRu);
    expect(canonicalArtifactSpecificationParts(source,facts).flatMap(p=>p.parts)).toContain(info.detailRu);
  }
  const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows as never[],
    preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Угловые профили для штукатурки'});
  expect(pdf.html).toContain('105922');expect(pdf.html).toContain('Угловой профиль для штукатурки');
  expect(pdf.html).not.toContain('open-corner');
});

test('raw Q/title/price survive JSON replay, block procurement and remain informative in PDF',async()=>{
  const title='Мой профиль <заказ 105922>';
  const source=await fixture('8',title),before=JSON.stringify(source),cold=clone(source);
  const rows=cold.result.rows,revision=cold.revision;
  const mapped=rows.map(r=>canonicalEstimateRevisionRowFromStorage(r,null,null,revision.amendment_contract));
  expect(mapped.find(r=>r.rowId===owner)).toMatchObject({quantity:'8',unitPrice:'91.23',titleRu:title,
    amount:null,includedInEstimate:false,includedInProcurement:false});
  const transport=projectCanonicalEstimatePreliminaryNeedTransport(revision);
  expect(transport.preliminaryNeeds.find(r=>r.rowId===pack.prefix+':ordered-bars'))
    .toMatchObject({quantity:null,needState:'SUPPLY_CONFIRMATION_REQUIRED'});
  const selection=selectCanonicalArtifactRows(rows as never[]);
  expect(()=>buildCanonicalProcurementProjection({revision,...selection}))
    .toThrow(expect.objectContaining({code:'PROCUREMENT_SUPPLY_QUANTUM_BLOCKED'}));
  const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:rows as never[],
    preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Угловые профили для штукатурки'});
  expect(pdf.html).toContain('&lt;заказ 105922&gt;');expect(pdf.html).not.toContain('<заказ 105922>');
  expect(pdf.html).toContain('заказ не подтверждён');expect(pdf.html).toContain('91,23 сом');
  expect(JSON.stringify(source)).toBe(before);
});

test('a later synthetic correction does not rewrite the earlier source/title/price evidence',async()=>{
  const previous=await fixture('8','Старое ручное название <105922>'),saved=JSON.stringify(previous);
  const next=await fixture('75','Новое ручное название <105922>');
  expect(previous.result.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'8',unit_price:'91.23',included_in_estimate:false});
  expect(next.result.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'75',unit_price:'91.23',included_in_procurement:true});
  expect(previous.revision.amendment_contract.rowOverrides[owner].titleRu).toBe('Старое ручное название <105922>');
  expect(JSON.stringify(previous)).toBe(saved);
  // Two independent immutable input fixtures only: no persisted history,
  // release migration, API save, undo or ordinary UI claim is made.
});
