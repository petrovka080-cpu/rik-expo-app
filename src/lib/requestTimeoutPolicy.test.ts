import {
  fetchWithRequestTimeout,
  RequestTimeoutError,
  resolveRequestTimeoutContext,
} from "./requestTimeoutPolicy";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./observability/platformObservability";

describe("requestTimeoutPolicy", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("classifies correctness-critical request paths by timeout class", () => {
    expect(
      resolveRequestTimeoutContext(
        "https://demo.supabase.co/rpc/get_my_role",
        { method: "POST" },
      ).requestClass,
    ).toBe("lightweight_lookup");

    expect(
      resolveRequestTimeoutContext(
        "https://demo.supabase.co/rpc/accountant_inbox_scope_v1",
        { method: "POST" },
      ).requestClass,
    ).toBe("ui_scope_load");

    expect(
      resolveRequestTimeoutContext(
        "https://demo.supabase.co/rpc/pdf_payment_source_v1",
        { method: "POST" },
      ).requestClass,
    ).toBe("heavy_report_or_pdf_or_storage");

    expect(
      resolveRequestTimeoutContext(
        "https://demo.supabase.co/rpc/request_submit",
        { method: "POST" },
      ).requestClass,
    ).toBe("mutation_request");
  });

  it("records timeout observability and does not introduce retry", async () => {
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async (_input, init) => {
      fetchCalls += 1;
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason ?? new Error("aborted")),
          { once: true },
        );
      });
    };

    await expect(
      fetchWithRequestTimeout(
        "https://demo.supabase.co/rpc/get_my_role",
        { method: "POST" },
        {
          fetchImpl,
          timeoutMsOverride: 10,
          screen: "request",
          surface: "request_timeout_test",
          owner: "timeout_test",
          operation: "get_my_role",
        },
      ),
    ).rejects.toBeInstanceOf(RequestTimeoutError);

    expect(fetchCalls).toBe(1);

    const events = getPlatformObservabilityEvents();
    const timeoutEvent = events.find(
      (event) =>
        event.surface === "request_timeout_test" &&
        event.event === "request_timeout_discipline" &&
        event.result === "error",
    );

    expect(timeoutEvent).toBeTruthy();
    expect(timeoutEvent?.errorStage).toBe("timeout");
    expect(timeoutEvent?.extra?.requestClass).toBe("lightweight_lookup");
    expect(timeoutEvent?.extra?.timeoutFired).toBe(true);
  });

  it("records successful requests without timeout firing", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await fetchWithRequestTimeout(
      "https://demo.supabase.co/functions/v1/director-production-report-pdf",
      { method: "POST", body: JSON.stringify({}) },
      {
        fetchImpl: async () => response,
        requestClass: "heavy_report_or_pdf_or_storage",
        timeoutMsOverride: 25,
        screen: "reports",
        surface: "request_timeout_test",
        owner: "pdf_backend",
        operation: "director-production-report-pdf",
      },
    );

    expect(result.status).toBe(200);

    const successEvent = getPlatformObservabilityEvents().find(
      (event) =>
        event.surface === "request_timeout_test" &&
        event.event === "request_timeout_discipline" &&
        event.result === "success",
    );

    expect(successEvent).toBeTruthy();
    expect(successEvent?.extra?.requestClass).toBe("heavy_report_or_pdf_or_storage");
    expect(successEvent?.extra?.timeoutFired).toBe(false);
  });
});
