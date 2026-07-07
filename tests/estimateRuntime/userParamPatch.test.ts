import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyUserParamPatch } from "../../src/lib/estimate/applyUserParamPatch";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { validateUserParamPatch } from "../../src/lib/estimate/validateUserParamPatch";

describe("user param patch", () => {
  const revision = createEstimateDraftRevision({
    estimateDraftId: "draft-ventfasad",
    rawInput: "вентфасад под ключ 1500 кв метров",
    createdAt: "2026-07-07T00:00:00.000Z",
  });

  it("supports update, add, remove and selected template preservation", () => {
    const update = parseUserParamPatch({
      revision,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "800 м2",
    });
    expect(validateUserParamPatch(revision, update).valid).toBe(true);
    const updated = applyUserParamPatch(revision, update, "2026-07-07T00:02:00.000Z");
    expect(updated.params.area_m2.value).toBe(800);
    expect(updated.params.area_m2.source).toBe("edited_by_user");
    expect(updated.selectedTemplateId).toBe(revision.selectedTemplateId);

    const add = parseUserParamPatch({
      revision,
      operation: "add_param",
      paramKey: "height_m",
      rawValue: "40 м",
    });
    const added = applyUserParamPatch(revision, add, "2026-07-07T00:03:00.000Z");
    expect(added.params.height_m.value).toBe(40);
    expect(added.params.height_m.source).toBe("user_input");

    const remove = parseUserParamPatch({
      revision,
      operation: "remove_param",
      paramKey: "area_m2",
      rawValue: "",
    });
    const removed = applyUserParamPatch(revision, remove, "2026-07-07T00:04:00.000Z");
    expect(removed.params.area_m2).toBeUndefined();
    expect(removed.missingInputs.some((item) => item.key === "area_m2")).toBe(true);
  });

  it("marks assumption replacement and does not double-count old assumption", () => {
    const assumptionRevision = {
      ...revision,
      assumptions: [
        ...revision.assumptions,
        {
          key: "height_m",
          value: 30,
          reason: "Default facade access height.",
          replacedByUserInput: false,
          visibleToUser: true as const,
        },
      ],
    };
    const patch = parseUserParamPatch({
      revision: assumptionRevision,
      operation: "replace_assumption",
      paramKey: "height_m",
      rawValue: "40 м",
    });
    const result = applyUserParamPatch(assumptionRevision, patch, "2026-07-07T00:05:00.000Z");
    expect(result.params.height_m.value).toBe(40);
    expect(result.assumptions.find((item) => item.key === "height_m")?.replacedByUserInput).toBe(true);
    expect(result.assumptions.filter((item) => item.key === "height_m")).toHaveLength(1);
  });
});
