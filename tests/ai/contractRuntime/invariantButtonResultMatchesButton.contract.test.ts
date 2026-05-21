import { invariantButtonResultMatchesButton } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant button result matches button", () => {
  it("requires button traces to carry a button id and answer", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantButtonResultMatchesButton(trace).passed).toBe(true);
    expect(
      invariantButtonResultMatchesButton({
        ...trace,
        entrypoint: { mode: "screen_button" },
      }).passed,
    ).toBe(false);
  });
});
