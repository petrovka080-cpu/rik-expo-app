import {
  AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS,
  getAiBffRouteCoverageEntry,
  listAiBffDocumentedMissingRouteEntries,
  listAiBffForbiddenRouteSentinelEntries,
  listAiBffRouteCoverageEntries,
} from "../../src/features/ai/bffCoverage/aiBffRouteCoverageRegistry";
import { verifyAiBffRouteCoverage } from "../../src/features/ai/bffCoverage/aiBffRouteCoverageVerifier";

describe("AI BFF route coverage registry", () => {
  it("classifies every audited action as covered, documented missing, or forbidden", () => {
    const entries = listAiBffRouteCoverageEntries();
    const summary = verifyAiBffRouteCoverage(entries);

    expect(summary).toMatchObject({
      finalStatus: "GREEN_AI_BFF_ROUTE_COVERAGE_MAP_READY",
      actionsAudited: 112,
      safeReadActions: 28,
      draftOnlyActions: 28,
      approvalRequiredActions: 28,
      forbiddenActions: 28,
      documentedMissingRoutes: 10,
      forbiddenRouteSentinels: 28,
      auditedMissingRoutes: 38,
      unmountedExistingRoutes: 0,
      directClientAccessFindings: 0,
      noSecrets: true,
      noRawRows: true,
      noDbWrites: true,
      noProviderCalls: true,
      noUiChanges: true,
      noFakeGreen: true,
    });
    expect(entries.every((entry) => ["covered", "missing_but_documented", "forbidden"].includes(entry.classification))).toBe(true);
    expect(entries.every((entry) => entry.noDirectClientAccess)).toBe(true);
  });

  it("keeps real missing routes documented and forbidden direct mutations out of route creation", () => {
    const documentedMissing = listAiBffDocumentedMissingRouteEntries();
    const forbiddenSentinels = listAiBffForbiddenRouteSentinelEntries();

    expect(documentedMissing).toHaveLength(10);
    expect(forbiddenSentinels).toHaveLength(28);
    expect(documentedMissing.flatMap((entry) => entry.documentedMissingBffRoutes)).toEqual(
      expect.arrayContaining([
        "GET /agent/market/listing-context/:listingId",
        "GET /agent/supplier-showcase/:supplierId/context",
        "POST /agent/finance/payment/submit-for-approval",
        "GET /agent/documents/:documentId/context",
        "POST /agent/security/draft-review",
      ]),
    );
    expect(forbiddenSentinels.every((entry) => entry.classification === "forbidden")).toBe(true);
  });

  it("groups coverage into the production-safe wave domains", () => {
    const summary = verifyAiBffRouteCoverage();
    const domains = summary.coverageByDomain.map((entry) => entry.domain);

    expect(domains).toEqual(AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS);
    expect(summary.coverageByDomain.find((entry) => entry.domain === "procurement")).toMatchObject({
      actions: 16,
      forbidden: 4,
    });
    expect(summary.coverageByDomain.find((entry) => entry.domain === "approval")).toMatchObject({
      documentedMissingRoutes: 4,
      forbiddenRouteSentinels: 5,
    });
  });

  it("exposes focused lookup for downstream approval and security waves", () => {
    expect(getAiBffRouteCoverageEntry("security.screen.approval")).toMatchObject({
      classification: "missing_but_documented",
      coverageDomain: "approval",
      documentedMissingBffRoutes: ["POST /agent/security/submit-for-approval"],
    });
    expect(getAiBffRouteCoverageEntry("buyer.requests.safe_read")).toMatchObject({
      classification: "covered",
      coverageDomain: "procurement",
    });
  });
});
