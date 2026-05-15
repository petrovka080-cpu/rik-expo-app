import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import {
  AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT,
} from "../../src/features/ai/procurement/aiProcurementEvidenceCard";
import { runAiProcurementDecisionEngine } from "../../src/features/ai/procurement/aiProcurementDecisionEngine";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const catalogItems: CatalogItem[] = [
  { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
];

const suppliers: Supplier[] = [
  {
    id: "supplier-1",
    name: "Alpha Supply",
    specialization: "cement",
    address: "Bishkek",
    website: "https://alpha.example",
  },
];

describe("AI procurement evidence cards", () => {
  it("produces the five required evidence-backed decision cards without unsafe payloads", async () => {
    const result = await runAiProcurementDecisionEngine({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot: {
        requestId: "request-1",
        projectId: "project-1",
        projectTitle: "Tower A",
        location: "Bishkek",
        items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
      },
      searchCatalogItems: async () => catalogItems,
      listSuppliers: async () => suppliers,
    });

    expect(AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT.requiredCards).toEqual([
      "recommended_internal_option",
      "evidence",
      "risk",
      "missing_data",
      "approval_action_candidate",
    ]);
    expect(result.evidenceCards.allCardsHaveEvidence).toBe(true);
    expect(result.evidenceCards.cards).toHaveLength(5);
    expect(result.evidenceCards.cards.every((card) => card.internalFirst)).toBe(true);
    expect(result.evidenceCards.cards.every((card) => card.approvalRequired)).toBe(true);
    expect(result.evidenceCards.cards.every((card) => card.rawRowsReturned === false)).toBe(true);
    expect(result.evidenceCards.cards.every((card) => card.rawPromptReturned === false)).toBe(true);
    expect(result.evidenceCards.cards.every((card) => card.rawProviderPayloadReturned === false)).toBe(true);
    expect(result.evidenceCards.cards.every((card) => card.mutationCount === 0)).toBe(true);
  });
});
