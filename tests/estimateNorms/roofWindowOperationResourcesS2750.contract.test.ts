import { compileCandidate, parameterDefinitions, formulaDefinitions, resourceDefinitions, sourcePack } from '../../src/lib/estimate/v4/roofWindowOperationResourcesS2750';
import { compileCandidate as compileParent, resourceDefinitions as oldResources } from '../../src/lib/estimate/v4/roofLanternCfp100100LimitedS2748';
import { canonicalEstimateResourceOperationSections, canonicalEstimateWorkProcess } from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import { buildCanonicalProfessionalPdfProjection } from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import { buildCanonicalProcurementProjection, type CanonicalArtifactRow } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import { roofWindowOperationResourcesS2750Config } from '../../scripts/estimate/r4a13/prepareS2750RoofWindowOperationResources';

const input = { lantern_count:14, lantern_model:sourcePack.model, base_stock_units:0, base_reserve_units:0,
  dome_stock_units:0, dome_reserve_units:0 };

test('a versioned operation successor preserves every quantity, formula, owner and unresolved need', async () => {
  expect([parameterDefinitions.length,formulaDefinitions.length,resourceDefinitions.length]).toEqual([26,21,21]);
  const current = await compileCandidate(input), previous = await compileParent(input);
  const values = (rows: typeof current.rows) => rows.map(row => [row.row_id,row.quantity,row.unit_id,row.included_in_estimate,row.included_in_procurement]);
  expect(values(current.rows)).toEqual(values(previous.rows));
  expect(current.rows).toHaveLength(8); expect(current.preliminaryNeeds).toHaveLength(13);
  expect(current.preliminaryNeeds.map(row=>[row.row_id,row.quantity,row.missing_parameter_ids]))
    .toEqual(previous.preliminaryNeeds.map(row=>[row.row_id,row.quantity,row.missing_parameter_ids]));
  for (const row of resourceDefinitions) {
    const old = oldResources.find(before => before.row_id === row.row_id)!;
    const { operationCompositionV1,publicResourcePresentationV1,...graph } = row.resource_graph;
    expect(graph).toEqual(old.resource_graph); expect(operationCompositionV1).toBeDefined();
    expect(publicResourcePresentationV1.sourceTitleRu).toBe(old.title_ru);
    expect(old.resource_graph).not.toHaveProperty('operationCompositionV1');
  }
  await expect(compileCandidate({...input,installation_hours_per_unit:1})).rejects.toThrow('unresolved application norm cannot be supplied');
});

test('the common projection orders seven declared sections with one owner and one display reference', () => {
  const resources = resourceDefinitions.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1}));
  const sections = canonicalEstimateResourceOperationSections(resources.slice().reverse());
  expect(sections.map(section=>section.operation!.processOrdinal)).toEqual([10,20,30,40,50,60,90]);
  expect(new Set(sections.flatMap(section=>section.resourceIds)).size).toBe(21);
  expect(sections.flatMap(section=>section.resourceIds)).toHaveLength(21);
  expect(sections.find(section=>section.operation!.operationId==='roof-window:dome')!.sharedResources)
    .toEqual([{rowId:'roof-cfp100100:installation',titleRu:oldResources.find(row=>row.row_id==='roof-cfp100100:installation')!.title_ru,
      ownerOperationTitleRu:'Установка основания окна'}]);
  expect(sections.at(-1)!.operation!.processRole).toBe('REFERENCE_ONLY');
  const process=canonicalEstimateWorkProcess(resources);
  expect(process[0]!.sequenceUnspecified).toBe(true); // Cost sections do not assert an installation sequence.
  expect(process[0]!.operations).toHaveLength(6);
});

test('independent main works stay contiguous when their local operation ordinals overlap', () => {
  const operation=(groupId:string,operationId:string,processOrdinal:number)=>({contractVersion:'canonical-operation-resource/v1',
    groupId,groupTitleRu:groupId,operationId,operationTitleRu:operationId,completionCriterionRu:'Подтверждённый состав',processOrdinal});
  const sections=canonicalEstimateResourceOperationSections([
    {rowId:'A1',titleRu:'А1',operation:operation('A','A1',10)}, {rowId:'A2',titleRu:'А2',operation:operation('A','A2',20)},
    {rowId:'B1',titleRu:'Б1',operation:operation('B','B1',10)}, {rowId:'B2',titleRu:'Б2',operation:operation('B','B2',20)},
  ]);
  expect(sections.map(section=>section.operation!.operationId)).toEqual(['A1','A2','B1','B2']);
});

test('saved composition gives PDF work headings even for unknown quantities; procurement excludes references and included parts', async () => {
  const result=await compileCandidate(input);
  const revision={id:'S2750_VALIDATION_FIXTURE',release_id:'fixture',catalog_id:sourcePack.catalogId,
    checksum_sha256:'f'.repeat(64),row_count:8,revision_number:1,currency_code:'KGS',totals:{amount:'0'},
    input_parameters:input,primary_measure_value:'14',primary_measure_unit_id:'item',created_at:'2026-10-09T10:00:00.000Z'};
  const rows=result.rows as CanonicalArtifactRow[], needs=result.preliminaryNeeds as CanonicalArtifactRow[];
  const before=JSON.stringify({revision,rows,needs});
  const projection=buildCanonicalProfessionalPdfProjection({revision,rows,preliminaryNeeds:needs,
    workTitleRu:'Установка окон в крыше',parameterTitlesRu:Object.fromEntries(parameterDefinitions.map(p=>[p.parameter_id,p.title_ru]))});
  expect(projection.rowCount).toBe(21); expect(projection.preliminaryNeedCount).toBe(13);
  for (const operation of Object.values(sourcePack.operations)) expect(projection.html).toContain(`<strong>${operation.titleRu}</strong>`);
  expect(projection.html).toContain('общий ресурс, учтён в разделе «Установка основания окна»');
  expect(projection.html).toContain('Справочные характеристики. Не оплачиваются и не закупаются.');
  expect(projection.html).not.toMatch(/VELUX|CFP Q|ISD 100100/u);
  const procurement=buildCanonicalProcurementProjection({revision,procurementRows:rows.filter(row=>row.included_in_procurement),sourceRows:rows,preliminaryNeeds:needs});
  expect(procurement.rows.filter(row=>/roof-cfp100100:(base|dome)$/.test(row.rowId))).toHaveLength(2);
  expect(procurement.rows.some(row=>/included|daylight|net-mass|opening-|installation/.test(row.rowId))).toBe(false);
  expect(JSON.stringify({revision,rows,needs})).toBe(before);
});

test('publication checks primary artifacts and inherited data without giving full-technology acceptance', async () => {
  const receipt=await roofWindowOperationResourcesS2750Config({releaseId:'fixture',searchReleaseId:'fixture'}).verifyCore();
  expect(receipt).toMatchObject({knownRows:8,unresolvedNeeds:13,operationSections:7,singleOwnedResources:21,
    sharedDisplayReferences:1,fullTechnicalAcceptance:false,acceptedNewTypes:0});
});
