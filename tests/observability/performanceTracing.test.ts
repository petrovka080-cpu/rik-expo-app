const originalEnabled = process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING;
const originalSampleRate = process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;

const restoreEnv = (key: string, value: string | undefined) => {
  if (typeof value === "string") {
    process.env[key] = value;
    return;
  }
  delete process.env[key];
};

const loadTracing = () =>
  require("../../src/lib/observability/sentry") as typeof import("../../src/lib/observability/sentry");

describe("performanceTracing", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("@sentry/react-native");
    jest.restoreAllMocks();
    restoreEnv("EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING", originalEnabled);
    restoreEnv("EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", originalSampleRate);
  });

  it("keeps tracing disabled by default", async () => {
    delete process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING;
    delete process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
    const startSpan = jest.fn();
    jest.doMock("@sentry/react-native", () => ({ startSpan }));

    const { isPerformanceTracingEnabled, traceAsync } = loadTracing();
    const result = await traceAsync("proposal.submit", { flow: "proposal_submit" }, async () => "ok");

    expect(isPerformanceTracingEnabled()).toBe(false);
    expect(result).toBe("ok");
    expect(startSpan).not.toHaveBeenCalled();
  });

  it("clamps sample rate to a conservative maximum", () => {
    process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING = "1";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "1";

    const { getPerformanceTracingSampleRate, isPerformanceTracingEnabled } = loadTracing();

    expect(getPerformanceTracingSampleRate()).toBe(0.05);
    expect(isPerformanceTracingEnabled()).toBe(true);
  });

  it("runs as a no-op when Sentry performance API is unavailable", async () => {
    process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING = "1";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.01";
    jest.doMock("@sentry/react-native", () => ({}));

    const { traceAsync } = loadTracing();
    const result = await traceAsync("proposal.submit", { flow: "proposal_submit" }, async () => 42);

    expect(result).toBe(42);
  });

  it("calls Sentry startSpan with sanitized low-cardinality tags when enabled", async () => {
    process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING = "1";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.01";
    const span = { setAttribute: jest.fn() };
    const startSpan = jest.fn((_options, callback) => callback(span));
    jest.doMock("@sentry/react-native", () => ({ startSpan }));

    const { traceAsync } = loadTracing();
    const result = await traceAsync(
      "warehouse.receive.apply",
      {
        flow: "warehouse_receive_apply",
        role: "warehouse",
        page_size: 250,
        userId: "user-123",
        email: "person@example.test",
        signedUrl: "https://storage.example.test/file.pdf?token=secret",
      } as Record<string, string | number>,
      async () => "done",
    );

    expect(result).toBe("done");
    expect(startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "warehouse.receive.apply",
        op: "app.flow",
        attributes: {
          flow: "warehouse_receive_apply",
          role: "warehouse",
          page_size: 100,
        },
      }),
      expect.any(Function),
    );
    expect(span.setAttribute).toHaveBeenCalledWith("result", "success");
    expect(JSON.stringify(startSpan.mock.calls)).not.toContain("person@example.test");
    expect(JSON.stringify(startSpan.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(startSpan.mock.calls)).not.toContain("user-123");
  });

  it("strips unsafe tags and raw payload-like values", () => {
    const { sanitizeTraceTags } = loadTracing();

    expect(
      sanitizeTraceTags({
        flow: "proposal_submit",
        role: "buyer",
        result: "success",
        request_id: "req-123",
        proposalId: "proposal-123",
        invoice_id: "invoice-123",
        phone: "+996 555 123 456",
        address: "Some private street",
        signedUrl: "https://storage.example.test/file.pdf?token=secret",
        payload: { raw: true } as unknown as string,
      }),
    ).toEqual({
      flow: "proposal_submit",
      role: "buyer",
      result: "success",
    });
  });

  it("rethrows async function errors after safe tracing cleanup", async () => {
    process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING = "1";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.01";
    const span = { setAttribute: jest.fn() };
    const startSpan = jest.fn((_options, callback) => callback(span));
    jest.doMock("@sentry/react-native", () => ({ startSpan }));

    const { traceAsync } = loadTracing();

    await expect(
      traceAsync("proposal.submit", { flow: "proposal_submit" }, async () => {
        throw new Error("network timeout");
      }),
    ).rejects.toThrow("network timeout");
    expect(span.setAttribute).toHaveBeenCalledWith("result", "error");
    expect(span.setAttribute).toHaveBeenCalledWith("error_class", "network");
  });

  it("does not break the app when Sentry throws before starting the callback", async () => {
    process.env.EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING = "1";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.01";
    const startSpan = jest.fn(() => {
      throw new Error("sentry unavailable");
    });
    jest.doMock("@sentry/react-native", () => ({ startSpan }));

    const { traceAsync } = loadTracing();
    const result = await traceAsync("pdf.viewer.open", { flow: "pdf_viewer_open" }, async () => "visible");

    expect(result).toBe("visible");
  });
});
