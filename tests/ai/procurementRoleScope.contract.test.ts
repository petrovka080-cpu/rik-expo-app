import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";
import { previewProcurementSupplierMatch } from "../../src/features/ai/procurement/procurementSupplierMatchEngine";

const snapshot = {
  requestId: "req-role",
  projectId: "project-role",
  items: [{ materialLabel: "Cement", quantity: 1, unit: "bag" }],
};

describe("procurement role scope", () => {
  it("allows buyer, director, and control for procurement request context", () => {
    for (const role of ["buyer", "director", "control"] as const) {
      expect(
        resolveProcurementRequestContext({
          auth: { userId: `${role}-user`, role },
          requestId: "req-role",
          screenId: "buyer.main",
          requestSnapshot: snapshot,
        }),
      ).toMatchObject({
        status: "loaded",
        role,
      });
    }
  });

  it("denies contractor and accountant unless they are represented by director/control role context", async () => {
    for (const role of ["contractor", "accountant"] as const) {
      expect(
        resolveProcurementRequestContext({
          auth: { userId: `${role}-user`, role },
          requestId: "req-role",
          screenId: "buyer.main",
          requestSnapshot: snapshot,
        }),
      ).toMatchObject({
        status: "blocked",
        missingFields: ["role_scope_denied"],
      });
      await expect(
        previewProcurementSupplierMatch({
          auth: { userId: `${role}-user`, role },
          input: { items: [{ materialLabel: "Cement", quantity: 1, unit: "bag" }] },
        }),
      ).resolves.toMatchObject({
        output: {
          status: "blocked",
          nextAction: "blocked",
        },
      });
    }
  });
});
