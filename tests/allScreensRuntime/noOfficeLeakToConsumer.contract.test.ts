import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("consumer data isolation runtime contract", () => {
  it("does not leak Office/B2B data into the consumer Смета flow", () => {
    expect(getAllScreensReport().matrix.consumer_office_leak_found).toBe(false);
  });
});
