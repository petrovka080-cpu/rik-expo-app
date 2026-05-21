import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("act signing approval execution", () => {
  it("cannot be called by AI directly", () => {
    expect(getAiExecutionServiceDefinition("act_sign")).toMatchObject({
      serviceName: "field_service",
      canBeCalledByAiDirectly: false,
    });
  });
});
