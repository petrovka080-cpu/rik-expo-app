import { GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS } from "../../src/lib/ai/globalEstimate";

describe("any estimate no live web blocking by default", () => {
  it("keeps on-demand source refresh disabled while cached sources are enabled", () => {
    expect(GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS.GLOBAL_ESTIMATE_EXTERNAL_SOURCES_ENABLED).toBe(true);
    expect(GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS.GLOBAL_ESTIMATE_SOURCE_REFRESH_ENABLED).toBe(true);
    expect(GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS.GLOBAL_ESTIMATE_ON_DEMAND_SOURCE_REFRESH_ENABLED).toBe(false);
    expect(GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS.GLOBAL_ESTIMATE_SOURCE_APPROVAL_REQUIRED).toBe(true);
  });
});
