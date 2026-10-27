import {
  getRpcLatencySnapshot,
  resetRpcLatencyMetrics,
  trackRpcLatency,
} from "./rpcLatencyMetrics";
import { resetPlatformObservabilityEvents } from "./platformObservability";

describe("rpcLatencyMetrics", () => {
  beforeEach(() => {
    resetRpcLatencyMetrics();
    resetPlatformObservabilityEvents();
  });

  it("records p50 p95 and error rate by rpc name", () => {
    trackRpcLatency({
      name: "director_report_transport_scope_v1",
      screen: "director",
      surface: "reports_transport",
      durationMs: 10,
      status: "success",
    });
    trackRpcLatency({
      name: "director_report_transport_scope_v1",
      screen: "director",
      surface: "reports_transport",
      durationMs: 40,
      status: "error",
      error: new Error("timeout"),
    });

    expect(getRpcLatencySnapshot()).toEqual([
      expect.objectContaining({
        name: "director_report_transport_scope_v1",
        count: 2,
        errorCount: 1,
        errorRate: 0.5,
        p50Ms: 10,
        p95Ms: 40,
        maxMs: 40,
      }),
    ]);
  });
});
