import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("work closeout approval execution", () => {
  it("requires field service after approval", () => {
    expect(getAiExecutionServiceDefinition("work_closeout")).toMatchObject({
      serviceName: "field_service",
      requiresLedgerEntry: true,
      requiresPreconditionRecheck: true,
    });
  });
});
