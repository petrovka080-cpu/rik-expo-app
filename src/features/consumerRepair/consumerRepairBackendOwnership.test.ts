import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { consumerRepairCanonicalMutationSourceMatchesBundle } from "./consumerRepairBackendOwnership";

function bundle(input: {
  draftId: string;
  revisionId: string;
  releaseId: string;
}): ConsumerRepairDraftBundle {
  return {
    draft: { id: input.draftId },
    items: [{
      sourceParameters: {
        canonicalBackendRevisionId: input.revisionId,
        canonicalBackendReleaseId: input.releaseId,
      },
    }],
  } as unknown as ConsumerRepairDraftBundle;
}

describe("consumer canonical mutation response ownership", () => {
  const source = {
    draftId: "draft-current",
    revisionId: "revision-parent",
    releaseId: "release-current",
  };

  it("accepts a response only while its exact source revision remains selected", () => {
    expect(consumerRepairCanonicalMutationSourceMatchesBundle(source, bundle(source))).toBe(true);
    expect(consumerRepairCanonicalMutationSourceMatchesBundle(source, bundle({
      ...source,
      revisionId: "revision-newer",
    }))).toBe(false);
    expect(consumerRepairCanonicalMutationSourceMatchesBundle(source, bundle({
      ...source,
      draftId: "draft-history",
    }))).toBe(false);
    expect(consumerRepairCanonicalMutationSourceMatchesBundle(source, null)).toBe(false);
  });
});
