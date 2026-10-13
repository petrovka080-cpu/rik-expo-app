import {
  assertCanonicalEstimateParameterSessionSnapshotIdentity,
  projectCanonicalEstimateParameterSessionSnapshot,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot";
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { consumerRepairCanonicalEstimateBlocksApproval, consumerRepairCanonicalMissingParameterCount } from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";
import {ROOF_SCREED25_STANDALONE_BINDING_V1 as binding,ROOF_SCREED25_STANDALONE_BINDING_SHA_V1 as bindingSha} from '../../src/lib/estimate/backendPlatform/canonicalRoofScreed25StandaloneV1';
import {ROOF_SCREED25_PACK_V1 as screed25} from '../../src/lib/estimate/backendPlatform/canonicalRoofScreed25CompanionV1';

const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "catalog", releaseId: "release", namespace: "global", domain: "test", workKey: "test",
  titleRu: "Тест", definitionVersion: 2, applicability: {}, professionalMetadata: {},
  parameterSchema: [{ parameterId: "actual", ordinal: 0, valueType: "decimal", unitId: "m", titleRu: "Факт",
    required: true, defaultValue: null, constraints: { min: 0 }, visibilityRole: "USER_INPUT",
    valueSourceRole: "CONDITIONAL_PROJECT_FACT", resourceBranchConsumers: ["resource"],
    formulaConsumers: ["formula"], provenance: { source: "TEST" } }],
};
const parent: CanonicalEstimateRevisionView = {
  apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: "parent", parentRevisionId: null,
  releaseId: "prior-release", catalogId: "catalog", revisionNumber: 1, status: "ready", currencyCode: "KGS",
  parameters: { actual: "10" }, amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
  totals: {}, rowCount: 1, checksumSha256: "a".repeat(64), compilerVersion: "compiler", createdAt: "2026-10-03",
};
const child: CanonicalEstimateRevisionView = {
  ...parent, revisionId: "child", parentRevisionId: "parent", releaseId: "release",
  definitionVersionId: "definition", definitionVersion: 2, parameters: { actual: "12" },
};
const input = () => ({ requestedRevisionId: "child", definitionVersionId: "definition", revision: child, parent, catalog });

describe("parameter session transport projection", () => {
  it("carries withdrawal into the editor without inventing another required parameter", () => {
    const reason = "Паспорт не соответствует выбранной технологии.";
    const snapshot = projectCanonicalEstimateParameterSessionSnapshot({ ...input(), revision: { ...child, contentWithdrawalReasonRu: reason } });
    const session = buildConsumerCanonicalParameterSession({ ...snapshot, draftId: "draft" });
    expect(snapshot.revision.contentWithdrawalReasonRu).toBe(reason);
    expect(session.contentWithdrawalReasonRu).toBe(reason);
    expect(consumerRepairCanonicalMissingParameterCount(session)).toBe(0);
    expect(consumerRepairCanonicalEstimateBlocksApproval(session)).toBe(true);
    expect(session.parameters.map(p => p.parameterId)).toEqual(["actual"]);
    expect(child).not.toHaveProperty("contentWithdrawalReasonRu");
  });

  it("preserves all schema ownership/constraints and parent inputs across a legitimate release migration", () => {
    const snapshot = projectCanonicalEstimateParameterSessionSnapshot(input());
    expect(snapshot.catalog).toBe(catalog);
    expect(snapshot.parent).toEqual({ revisionId: "parent", releaseId: "prior-release", catalogId: "catalog", parameters: parent.parameters });
    expect(snapshot.revision.parameters).toBe(child.parameters);
    expect(snapshot.revision).not.toHaveProperty("amendmentContract");
    expect(snapshot.parent).not.toHaveProperty("totals");
    expect(() => assertCanonicalEstimateParameterSessionSnapshotIdentity(snapshot, "child")).not.toThrow();
  });

  it.each([
    ["requested revision", () => ({ ...input(), requestedRevisionId: "other" })],
    ["catalog", () => ({ ...input(), catalog: { ...catalog, catalogId: "other" } })],
    ["release", () => ({ ...input(), catalog: { ...catalog, releaseId: "other" } })],
    ["definition ID", () => ({ ...input(), definitionVersionId: "other" })],
    ["definition version", () => ({ ...input(), catalog: { ...catalog, definitionVersion: 3 } })],
    ["missing parent", () => ({ ...input(), parent: null })],
    ["different parent", () => ({ ...input(), parent: { ...parent, revisionId: "other" } })],
    ["parent catalog", () => ({ ...input(), parent: { ...parent, catalogId: "other" } })],
    ["unexpected parent", () => ({ ...input(), revision: { ...child, parentRevisionId: null } })],
  ] as const)("rejects mismatched %s before exposing editable parameters", (_label, makeInput) => {
    expect(() => projectCanonicalEstimateParameterSessionSnapshot(makeInput()))
      .toThrow(expect.objectContaining({ code: "PARAMETER_SESSION_IDENTITY_MISMATCH" }));
  });
});

it('standalone25 exclusion hides its facts after compact transport and full-revision preview; restore requires only the missing facts',()=>{
  const catalogId=binding.targets[0]!.catalogId,operationKey=JSON.stringify([screed25.prefix,`${screed25.prefix}:installation`]);
  const fields=[screed25.conditionsParameterId,screed25.areaParameterId];
  const roofCatalog:CanonicalEstimateCatalogItem={...catalog,catalogId,domain:'roofing',definitionVersion:5,
    professionalMetadata:{roofScreed25StandaloneBindingV1:bindingSha},parameterSchema:[
      {...catalog.parameterSchema[0]!,parameterId:'q',unitId:'m2',titleRu:'Площадь своего участка стяжки'},
      ...fields.map((parameterId,ordinal)=>({...catalog.parameterSchema[0]!,parameterId,ordinal:ordinal+1,valueType:'enum' as const,unitId:null,
        titleRu:parameterId===screed25.conditionsParameterId?'Проектный способ подачи раствора':'Непосредственное основание участка',
        requiredWhen:{kind:'equals',parameterId:'roof_screed_system',value:binding.systemYesRu},
        constraints:{values:[parameterId===screed25.conditionsParameterId?screed25.conditionsYesRu:screed25.areaYesRu],
          requiredWhen:{kind:'equals',parameterId:'roof_screed_system',value:binding.systemYesRu}}})),
      {...catalog.parameterSchema[0]!,parameterId:'roof_screed_system',valueType:'enum',unitId:null,titleRu:'Вариант стяжки',
        constraints:{values:[binding.systemYesRu]}}]};
  const selectedRevision:CanonicalEstimateRevisionView={...child,catalogId,parentRevisionId:null,definitionVersion:5,
    parameters:{q:'20',roof_screed_system:binding.systemYesRu},userInputSnapshot:{q:'20',roof_screed_system:binding.systemYesRu},
    compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[operationKey],excludedRowIds:[]},
    preliminaryNeeds:fields.map((id,index)=>({rowId:`need${index}`,selected:true,missingParameterIds:[id],quantity:null,needState:'CONDITION_REQUIRED'} as any))};
  const snapshot=projectCanonicalEstimateParameterSessionSnapshot({requestedRevisionId:'child',definitionVersionId:'definition',
    revision:selectedRevision,parent:null,catalog:roofCatalog});
  expect(snapshot.revision.excludedScopeParameterIdsV1).toEqual(fields);
  for(const revision of [snapshot.revision,selectedRevision]){
    const session=buildConsumerCanonicalParameterSession({catalog:roofCatalog,revision,parent:null,draftId:'draft'});
    expect(session.parameters.filter(p=>fields.includes(p.parameterId))).toEqual([]);
    expect(session.blockingMissingParameterIds.filter(id=>fields.includes(id))).toEqual([]);
  }
  const restored=buildConsumerCanonicalParameterSession({catalog:roofCatalog,revision:{...selectedRevision,compositionSelectionV1:null},parent:null,draftId:'draft'});
  expect(restored.blockingMissingParameterIds).toEqual(expect.arrayContaining(fields));
  expect(restored.blockingMissingParameterIds).not.toContain('q');
});
