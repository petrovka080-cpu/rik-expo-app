import {auditCanonicalEstimateOperationResourcesV1 as auditCommon} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import type {Client} from 'pg';
import {auditCanonicalPublisherSuccessorOperationResourcesR1 as audit,assertCanonicalPublisherSuccessorOperationResourcesR1 as admit,
 preflightCanonicalDefinitionPublishPlans as preflight,publishCanonicalDefinitionDraft as publish,
 canonicalPublisherQuantityScopeIsConsistent as quantityScope,type CanonicalDefinitionPublishPlan} from './canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences as references} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));

it('requires independently declared operation/resource/name/kind evidence at both new write entries while retaining an honest UNKNOWN template',async()=>{
 // Independently authored TEST_ONLY source fixture, not a source/quantity receipt.
 const operation={contractVersion:'canonical-operation-resource/v1' as const,groupId:'TEST_ONLY:installation',groupTitleRu:'Крепление элемента',
  operationId:'TEST_ONLY:fix-element',operationTitleRu:'Закрепить элемент на готовом основании',processOrdinal:10,
  completionCriterionRu:'Крепление выполнено по совместимому узлу; фактическое количество и приёмка проверяются отдельно.'};
 const source={contract:'TEST_ONLY_INDEPENDENT_COMPOSITION',operationRoster:[operation],expected:[
  {rowId:'TEST_ONLY:fixing',nameRu:'Крепёжный зажим',kind:'MATERIAL',unit:'pcs'},
  {rowId:'TEST_ONLY:labour',nameRu:'Работа по креплению элемента',kind:'LABOR',unit:null}]};
 // The TEST_ONLY source expressly specifies hand fixing on a ready base. These
 // source reasons are fixture evidence, never claims about a production family.
 const reviewedClasses={
  MATERIAL:{status:'REQUIRED',rowIds:['TEST_ONLY:fixing']},
  LABOR:{status:'UNRESOLVED',rowIds:['TEST_ONLY:labour'],reasonRu:'Исполнитель необходим; норма труда в источнике не установлена.'},
  CONSUMABLE:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: сухое ручное крепление без расходного состава.'},
  TOOL:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: зажим закрывается рукой без инструмента.'},
  ACCESSORY:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: ручной зажим не требует оснастки.'},
  EQUIPMENT:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: доступ с готового пола без оборудования.'},
  MECHANISM:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: ручное крепление без механизированных операций.'},
  SERVICE:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: отдельная внешняя услуга не предусмотрена.'},
  TRANSPORT:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: зажим уже находится у готового основания.'},
  PPE:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: учебный безопасный ручной зажим; опасные воздействия отсутствуют.'}};
 const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  evidenceSha256:hash({...source,reviewedClasses}),operationResourceBindingRequired:true,operationRoster:[operation],operationRequirements:[{operationId:operation.operationId,sourceId:'TEST_ONLY_SOURCE',requirements:reviewedClasses}],entries:[
   {expectedResourceId:'fixing',operationId:operation.operationId,requiredOperationIds:[operation.operationId],publicNameRu:'Крепёжный зажим',resourceKind:'MATERIAL',category:'material',unitId:'pcs',sourceId:'TEST_ONLY_SOURCE',condition:'Exact test fixture compatible fixing',formulaId:'TEST_ONLY:fixing-formula',resolution:{kind:'ROW',rowId:'TEST_ONLY:fixing'}},
   {expectedResourceId:'labour',operationId:operation.operationId,requiredOperationIds:[operation.operationId],publicNameRu:'Работа по креплению элемента',resourceKind:'LABOR',category:'labor',unitId:null,quantityUnitUnconfirmed:true,sourceId:'TEST_ONLY_SOURCE',condition:'Test fixture labour quantity norm remains unresolved',formulaId:'TEST_ONLY:labour-formula',resolution:{kind:'ROW',rowId:'TEST_ONLY:labour'}}]};
 const resources=[{row_id:'TEST_ONLY:fixing',title_ru:'Крепёжный зажим',category:'material',unit_id:'pcs',formula_id:'TEST_ONLY:fixing-formula',cost_owner_id:'TEST_ONLY:fixing',resource_graph:{costTreatment:'OWN_COST',operationCompositionV1:operation,
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Крепёжный зажим',nameRu:'Крепёжный зажим',resourceKind:'MATERIAL',brandAndModelRu:null,specificationRu:null,detailsRu:[]}}},
 {row_id:'TEST_ONLY:labour',title_ru:'Работа по креплению элемента',category:'labor',unit_id:'',formula_id:'TEST_ONLY:labour-formula',cost_owner_id:'TEST_ONLY:labour',resource_graph:{costTreatment:'INFORMATIONAL_SCOPE',operationCompositionV1:operation,
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Работа по креплению элемента',nameRu:'Работа по креплению элемента',resourceKind:'LABOR',brandAndModelRu:null,specificationRu:null,detailsRu:[]}}}];
 const formulas=[{formula_id:'TEST_ONLY:fixing-formula',output_unit_id:'pcs',input_parameter_ids:['actual_fixing_count']},
  {formula_id:'TEST_ONLY:labour-formula',output_unit_id:'',input_parameter_ids:['unresolved_labour_norm']}];
 const stored=JSON.stringify({source,map,resources,formulas});
 expect(references({completenessMap:map,formulaDefinitions:formulas,resourceDefinitions:resources,requireOperationBindings:true})).toEqual([]);
 const partialAdmission=admit({resourceDefinitions:resources,independentComposition:map});
 expect(partialAdmission.definitionAdmissionAllowed).toBe(true);expect(partialAdmission.completeClaimAllowed).toBe(false);
 expect(partialAdmission.status).toBe('COMPOSITION_UNVERIFIED');
 // Visible source-reviewed but unresolved composition can be authored, never issued as a PDF.
 expect(partialAdmission.pdfAllowed).toBe(false);
 const noReview={...map,operationRequirements:undefined};expect(()=>admit({resourceDefinitions:resources,independentComposition:noReview})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 const incompleteClasses={...reviewedClasses,PPE:undefined};
 expect(()=>admit({resourceDefinitions:resources,independentComposition:{...map,operationRequirements:[{operationId:operation.operationId,sourceId:'TEST_ONLY_SOURCE',requirements:incompleteClasses}]}})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 const noMap=audit({resourceDefinitions:resources});expect(noMap.completeClaimAllowed).toBe(false);
 expect(()=>admit({resourceDefinitions:resources})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 const noRoster={...map,operationRoster:undefined};expect(()=>admit({resourceDefinitions:resources,independentComposition:noRoster})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 // The shared saved classifier excludes a source-proven balance counter,
 // but cannot erase an independent required row or a real preliminary need.
 const counter={...resources[0],row_id:'TEST_ONLY:balance-counter',title_ru:'Расход крепёжных зажимов',
  resource_graph:{...resources[0].resource_graph,costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:'TEST_ONLY:fixing',
   publicResourcePresentationV1:{...resources[0].resource_graph.publicResourcePresentationV1,
    sourceTitleRu:'Расход крепёжных зажимов',nameRu:'Расход крепёжных зажимов',rowKind:'CALCULATION_DETAIL'}}};
 const withCounter=[...resources,counter],counterBytes=JSON.stringify(withCounter);
 expect(admit({resourceDefinitions:withCounter,independentComposition:map}).definitionAdmissionAllowed).toBe(true);
 const counterEntry={...map.entries[0],expectedResourceId:'balance-counter',publicNameRu:counter.title_ru,
  resolution:{kind:'ROW',rowId:counter.row_id}};
 const counterMap={...map,entries:[...map.entries,counterEntry],operationRequirements:[{...map.operationRequirements[0],
  requirements:{...reviewedClasses,MATERIAL:{status:'REQUIRED',rowIds:['TEST_ONLY:fixing',counter.row_id]}}}]};
 expect(()=>admit({resourceDefinitions:withCounter,independentComposition:counterMap})).toThrow('REQUIRED_RESOURCE_MISSING');
 const realUnknown={...counter,ownership_status:'PRELIMINARY_NEED',need_state:'QUANTITY_REQUIRED'};
 expect(admit({resourceDefinitions:[...resources,realUnknown],independentComposition:counterMap}).definitionAdmissionAllowed).toBe(true);
 expect(JSON.stringify(withCounter)).toBe(counterBytes);
 // R597: a source exclusion cannot contradict an actual linked resource.
 const conflictingNA={...map,operationRequirements:[{...map.operationRequirements[0],requirements:{...reviewedClasses,
  MATERIAL:{status:'NOT_APPLICABLE',reasonRu:'TEST_ONLY: deliberately false exclusion for the negative control.'}}}]};
 expect(audit({resourceDefinitions:resources,independentComposition:conflictingNA}).issues).toEqual(expect.arrayContaining([
  expect.objectContaining({code:'RESOURCE_CLASS_NOT_APPLICABLE_CONFLICT',operationId:operation.operationId})]));
 expect(()=>admit({resourceDefinitions:resources,independentComposition:conflictingNA})).toThrow('RESOURCE_CLASS_NOT_APPLICABLE_CONFLICT');
 const foreignEntry={...map,entries:map.entries.map((entry,index)=>index===0?{...entry,operationId:'TEST_ONLY:not-in-roster'}:entry)};
 expect(()=>admit({resourceDefinitions:resources,independentComposition:foreignEntry})).toThrow('INDEPENDENT_RESOURCE_OPERATION_UNKNOWN');
 const secondary={...operation,operationId:'TEST_ONLY:reference-only',operationTitleRu:'Сведения о креплении',processRole:'REFERENCE_ONLY' as const};
 const missingPrimary={...map,operationRoster:[operation,secondary],entries:map.entries.map((entry,index)=>index===0?{...entry,
  operationId:secondary.operationId,requiredOperationIds:[operation.operationId]}:entry)};
 expect(()=>admit({resourceDefinitions:resources,independentComposition:missingPrimary})).toThrow('INDEPENDENT_RESOURCE_PRIMARY_USE_MISSING');
 // Manual naming is permitted, while independent membership and kind stay mandatory.
 const manualRows=resources.map((row,index)=>({rowId:row.row_id,sourceNameRu:row.title_ru,
  nameRu:index===0?'Моё название зажима':row.title_ru,resourceKind:row.resource_graph.publicResourcePresentationV1.resourceKind,
  operation,manualTitleOverride:true,publicNameVerified:false}));
 const manualAccepted=auditCommon({resources:manualRows,independentComposition:map,requireIndependentComposition:true});
 expect(manualAccepted.definitionAdmissionAllowed).toBe(true);expect(manualAccepted.completeClaimAllowed).toBe(false);
 const undeclaredManual=auditCommon({resources:manualRows,independentComposition:{...map,entries:[map.entries[1]]},requireIndependentComposition:true});
 expect(undeclaredManual.definitionAdmissionAllowed).toBe(false);
 expect(undeclaredManual.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_NOT_IN_INDEPENDENT_COMPOSITION',rowId:'TEST_ONLY:fixing'})]));
 const changedManualKind=auditCommon({resources:manualRows.map((row,index)=>index===0?{...row,resourceKind:'TOOL'}:row),
  independentComposition:map,requireIndependentComposition:true});
 expect(changedManualKind.definitionAdmissionAllowed).toBe(false);
 expect(changedManualKind.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_PRESENTATION_SOURCE_MISMATCH',rowId:'TEST_ONLY:fixing'})]));
 // R596: a parsed but inactive or non-process reference cannot prove coverage.
 const inactive={...operation,whenResourcePresent:['TEST_ONLY:absent-condition-row']};
 const referenceOnly={...operation,processRole:'REFERENCE_ONLY' as const};
 const costSummary={...operation,processRole:'COST_SUMMARY' as const};
 for(const excludedOperation of [inactive,referenceOnly,costSummary]){
  const excludedRows=resources.map(row=>({...row,resource_graph:{...row.resource_graph,operationCompositionV1:excludedOperation}}));
  const excludedMap={...map,operationRoster:[excludedOperation]};
  const excluded=audit({resourceDefinitions:excludedRows,independentComposition:excludedMap});
  expect(excluded.definitionAdmissionAllowed).toBe(false);expect(excluded.completeClaimAllowed).toBe(false);
  expect(excluded.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_OPERATION_MISSING'})]));
 }
 // Direct generic admission has the same independent-entry authority boundary.
 for(const invalidEntry of [{...map.entries[0],sourceId:undefined},{...map.entries[0],operationId:undefined},
  {...map.entries[0],resolution:{kind:'UNKNOWN_KIND',rowId:'TEST_ONLY:fixing'}}]){
  const invalidMap={...map,entries:[invalidEntry,map.entries[1]]};
  expect(()=>admit({resourceDefinitions:resources,independentComposition:invalidMap})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 }
 const oldHeading=resources.map(row=>row.row_id!=='TEST_ONLY:labour'?row:{...row,resource_graph:{...row.resource_graph,operationCompositionV1:{...operation,operationId:row.row_id,operationTitleRu:row.title_ru}}});
 expect(()=>admit({resourceDefinitions:oldHeading,independentComposition:map})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 // A valid source-bound public alias must not conceal a resource heading.
 const alias='Зажим для крепления элемента',resourceHeading={...operation,operationTitleRu:'Крепёжный зажим'};
 const aliasedRows=resources.map(row=>({...row,resource_graph:{...row.resource_graph,operationCompositionV1:resourceHeading,
  publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1,
   nameRu:row.row_id==='TEST_ONLY:fixing'?alias:row.title_ru}}}));
 const aliasMap={...map,operationRoster:[resourceHeading],entries:map.entries.map(entry=>entry.expectedResourceId==='fixing'?{...entry,publicNameRu:alias}:entry)};
 const aliasMask=audit({resourceDefinitions:aliasedRows,independentComposition:aliasMap});
 expect(aliasMask.definitionAdmissionAllowed).toBe(false);
 expect(aliasMask.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_USED_AS_OPERATION',rowId:'TEST_ONLY:fixing',operationId:operation.operationId})]));
 expect(()=>admit({resourceDefinitions:aliasedRows,independentComposition:aliasMap})).toThrow('RESOURCE_USED_AS_OPERATION');
 const staleName=resources.map(row=>({...row,title_ru:'Заменённый пользователем ресурс'}));
 expect(()=>admit({resourceDefinitions:staleName,independentComposition:map})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 const wrongKind=resources.map(row=>({...row,resource_graph:{...row.resource_graph,publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1,resourceKind:'SERVICE'}}}));
 expect(()=>admit({resourceDefinitions:wrongKind,independentComposition:map})).toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 // Both entry points reject an incomplete new plan before touching the connection.
 const query=jest.fn(async()=>{throw Error('UNEXPECTED_DATABASE_QUERY');}),client={query} as unknown as Client;
 const missingPlan={definition:{catalog_id:'canonical-work:TEST_ONLY:element'},resources,passport:{decision:{}}} as unknown as CanonicalDefinitionPublishPlan;
 await expect(preflight(client,[missingPlan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 await expect(publish(client,missingPlan)).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 const noPassportPlan={...missingPlan,passport:undefined} as unknown as CanonicalDefinitionPublishPlan;
 await expect(preflight(client,[noPassportPlan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 await expect(publish(client,noPassportPlan)).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 // B is the actual validated content map. Raw A is optional, never silently
 // copied from B, and every explicit top-level/nested A must stable-equal B.
 const rawB=Object.fromEntries(Object.entries(map).reverse());
 expect(admit({resourceDefinitions:resources,independentComposition:map,definitionPassport:{}}).definitionAdmissionAllowed).toBe(true);
 expect(admit({resourceDefinitions:resources,independentComposition:map,definitionPassport:{independentCompletenessMap:rawB,
  decision:{independentCompletenessMap:map}}}).definitionAdmissionAllowed).toBe(true);
 const rawA={...map,evidenceSha256:'c'.repeat(64)},mapsBefore=JSON.stringify({rawA,rawB,map});
 for(const definitionPassport of [{independentCompletenessMap:rawA},{decision:{independentCompletenessMap:rawA}},
  {independentCompletenessMap:rawB,decision:{independentCompletenessMap:rawA}}]){
  const conflictingPlan={...missingPlan,definition:{...missingPlan.definition,passport:definitionPassport},
   passport:{decision:{independentCompletenessMap:map}}} as unknown as CanonicalDefinitionPublishPlan;
  const originalPlan=JSON.stringify(conflictingPlan);
  await expect(preflight(client,[conflictingPlan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_RAW_DEFINITION_COMPOSITION_MISMATCH');
  await expect(publish(client,conflictingPlan)).rejects.toThrow('STOP_CANONICAL_PUBLISHER_RAW_DEFINITION_COMPOSITION_MISMATCH');
  expect(JSON.stringify(conflictingPlan)).toBe(originalPlan);
 }
 expect(JSON.stringify({rawA,rawB,map})).toBe(mapsBefore);expect(query).not.toHaveBeenCalled();
 const capturedLegacyMap={...map,operationRoster:undefined},capturedBytes=JSON.stringify(capturedLegacyMap);
 const metadataOnlyNewPlan={...missingPlan,passport:{decision:{quantityScope:'PARTIAL',independentCompletenessMap:capturedLegacyMap}}} as unknown as CanonicalDefinitionPublishPlan;
 await expect(preflight(client,[metadataOnlyNewPlan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 await expect(publish(client,metadataOnlyNewPlan)).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES');
 expect(JSON.stringify(capturedLegacyMap)).toBe(capturedBytes);expect(query).not.toHaveBeenCalled();
 // Admission evidence does not manufacture a norm or overwrite partial readiness.
 const partial={decision:{quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:['TEST_ONLY:labour']},
  capability_matrix:[{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:['TEST_ONLY:labour']}]};
 const parameters=[{parameter_id:'unresolved_labour_norm',default_value:null,required:false,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}}];
 expect(quantityScope({passport:partial,parameters,formulas,resources,baseline:{input_values:{}}})).toBe(true);
 expect(quantityScope({passport:{...partial,decision:{quantityScope:'FULL'}},parameters,formulas,resources,baseline:{input_values:{}}})).toBe(false);
 expect(JSON.stringify({source,map,resources,formulas})).toBe(stored);
});
