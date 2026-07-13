import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairRequestDraft,
  saveConsumerRepairProjectExecutionDraft,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import { buildProjectExecutionBindingPayloads } from "../../src/lib/projectExecution";
import { buildProjectExecutionFixture } from "./projectExecutionTestHelpers";

describe("project execution history and foreman binding", () => {
  it("persists the same project execution draft into request history and foreman payloads", () => {
    const { payload, draft } = buildProjectExecutionFixture();
    const selectedWork = payload.selectedWork;
    if (!selectedWork) throw new Error("selected work fixture missing");
    const consumerSelectedWork: ConsumerRepairSelectedWork = {
      selectedWorkKey: selectedWork.selectedWorkKey,
      selectedWorkTitleRu: selectedWork.selectedTitleRu,
      selectedWorkCategoryKey: selectedWork.selectedCategoryKey,
      selectedWorkCategoryTitleRu: selectedWork.selectedCategoryTitleRu,
      selectedWorkRawInput: selectedWork.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    };

    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(payload.sourceEstimate, undefined, consumerSelectedWork);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "project-execution-user",
      problemText: payload.inputText,
      repairType: payload.workCategory,
      city: "Bishkek",
      selectedWork: consumerSelectedWork,
      aiDraft,
    });
    const saved = saveConsumerRepairProjectExecutionDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      projectExecutionDraft: draft,
    });
    const binding = buildProjectExecutionBindingPayloads({
      payload,
      draft,
      requestDraftId: saved.draft.id,
      projectDraftSaved: saved.projectExecutionDrafts.length === 1,
    });

    expect(saved.structuredEstimatePayload?.fingerprint).toBe(payload.fingerprint);
    expect(saved.projectExecutionDrafts[0]).toEqual(draft);
    expect(binding.sameSourceOfTruth).toBe(true);
    expect(binding.history.projectDraftSaved).toBe(true);
    expect(binding.foreman.tasks.map((task) => task.title)).toEqual(draft.tasks.map((task) => task.title));
    expect(binding.foreman.procurementItems.map((item) => item.materialVisibleName)).toEqual(
      draft.procurementItems.map((item) => item.materialVisibleName),
    );
  });
});
