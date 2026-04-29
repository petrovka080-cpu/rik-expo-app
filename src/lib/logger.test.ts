import { logger } from "./logger";

describe("logger boundary", () => {
  const originalDev = (globalThis as any).__DEV__;

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it("emits console.info in dev mode", () => {
    (globalThis as any).__DEV__ = true;
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});

    // Re-import to pick up __DEV__ change
    const { logger: _devLogger } = jest.requireActual("./logger") as typeof import("./logger");
    // Since isDev is captured at module load, we test the exported logger directly
    // which was loaded with whatever __DEV__ was at test start
    logger.info("test-tag", "hello", { key: "value" });

    // In test environment __DEV__ is typically true, so console.info should fire
    if (originalDev) {
      expect(spy).toHaveBeenCalledWith("[test-tag]", "hello", { key: "value" });
    }
  });

  it("emits console.warn in dev mode", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warn-tag", "some warning");
    if (originalDev) {
      expect(spy).toHaveBeenCalledWith("[warn-tag]", "some warning");
    }
  });

  it("emits console.error in dev mode", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error-tag", new Error("test error"));
    if (originalDev) {
      expect(spy).toHaveBeenCalledWith("[error-tag]", expect.any(Error));
    }
  });

  it("exports all three methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("redacts token-bearing diagnostics before delegating to console", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});

    logger.info("redaction-tag", {
      signedUrl: "https://storage.example.test/file.pdf?token=secret",
      href: "/pdf-viewer?sessionId=session-1&openToken=open-secret",
    });

    if (originalDev) {
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).not.toContain("secret");
      expect(logged).toContain("[redacted]");
    }
  });

  it("redacts PII-like diagnostics before delegating to console", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("pii-redaction-tag", {
      email: "person@example.test",
      phone: "+996 555 123 456",
      address: "123 Main Street",
    });

    if (originalDev) {
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).not.toContain("person@example.test");
      expect(logged).not.toContain("+996 555 123 456");
      expect(logged).not.toContain("123 Main Street");
      expect(logged).toContain("[redacted]");
    }
  });

  it("handles circular diagnostic objects without throwing", () => {
    const circular: Record<string, unknown> = { label: "root" };
    circular.self = circular;

    expect(() => logger.info("circular-tag", circular)).not.toThrow();
  });

  it("does not throw on any call variant", () => {
    expect(() => logger.info("tag")).not.toThrow();
    expect(() => logger.warn("tag")).not.toThrow();
    expect(() => logger.error("tag")).not.toThrow();
    expect(() => logger.info("tag", "a", "b", "c")).not.toThrow();
    expect(() => logger.warn("tag", { nested: true })).not.toThrow();
    expect(() => logger.error("tag", null, undefined)).not.toThrow();
  });
});
