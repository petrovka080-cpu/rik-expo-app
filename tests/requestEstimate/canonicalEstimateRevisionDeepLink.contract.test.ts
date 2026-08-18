import { readFileSync } from "node:fs";

import { canonicalEstimateRevisionIdFromRoute } from "../../src/lib/navigation/canonicalEstimateRevisionDeepLink";

describe("canonical estimate revision deep link", () => {
  const revisionId = "9CB592E2-1240-45FC-9F1A-E92DACCDB002";

  it("accepts only a canonical UUID and normalizes its identity", () => {
    expect(canonicalEstimateRevisionIdFromRoute(`  ${revisionId}  `)).toBe(
      revisionId.toLowerCase(),
    );
    expect(canonicalEstimateRevisionIdFromRoute("revision-latest")).toBeNull();
    expect(canonicalEstimateRevisionIdFromRoute("../../request")).toBeNull();
    expect(canonicalEstimateRevisionIdFromRoute(undefined)).toBeNull();
  });

  it("makes the exact revision authoritative inside the consumer request workspace", () => {
    const container = readFileSync(
      "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
      "utf8",
    );
    const screen = readFileSync(
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "utf8",
    );
    expect(container).toContain(
      "return canonicalEstimateRevisionIdFromRoute(props.initialCanonicalRevisionId)",
    );
    expect(container).toContain("loadConsumerCanonicalRevisionDraftMapping");
    expect(container).not.toContain("ProfessionalEstimateComposer");
    expect(container).not.toContain("canonicalComposerVisible");
    expect(screen).toContain("openExactCanonicalRevisionInConsumerEditor");
    expect(screen).toContain('router.setParams({ canonicalRevisionId: "", draftId: bundle.draft.id })');
    expect(screen).not.toContain("onOpenCanonicalEstimate");
  });

  it("keeps canonical reopen read-only at route ingress", () => {
    const route = readFileSync("app/(tabs)/request/index.tsx", "utf8");
    expect(route).toContain('launchError = "CANONICAL_ESTIMATE_REVISION_ID_INVALID"');
    expect(route).toContain("initialCanonicalRevisionId={canonicalRevisionId || undefined}");
    expect(route).toContain("autoPrepare={!canonicalRevisionId && (autoPrepare || autoPdf)}");
    expect(route).toContain("autoPdf={!canonicalRevisionId && autoPdf}");
  });
});
