import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./platformObservability";
import { reportAndSwallow } from "./catchDiscipline";

describe("reportAndSwallow", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("warns in dev and records a scoped observability event", () => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = true;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    expect(() =>
      reportAndSwallow({
        screen: "director",
        surface: "lifecycle",
        event: "refresh_scope_failed",
        error: new Error("refresh exploded"),
        kind: "cleanup_only",
      }),
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      "[catch.swallow]",
      expect.objectContaining({
        scope: "director.lifecycle.refresh_scope_failed",
        kind: "cleanup_only",
        errorClass: "Error",
        errorMessage: "refresh exploded",
      }),
    );

    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "director",
        surface: "lifecycle",
        event: "refresh_scope_failed",
        result: "error",
        extra: expect.objectContaining({
          catchKind: "cleanup_only",
          scope: "director.lifecycle.refresh_scope_failed",
        }),
      }),
    ]);

    warnSpy.mockRestore();
    infoSpy.mockRestore();
    runtime.__DEV__ = false;
  });

  it("stays production-safe for unknown errors and respects explicit scopes", () => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      reportAndSwallow({
        screen: "buyer",
        surface: "proposal_pdf",
        event: "fallback_meta_load_failed",
        error: { message: "meta exploded" },
        kind: "degraded_fallback",
        scope: "buyer.proposalPdf.buildFallbackMeta",
      }),
    ).not.toThrow();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "buyer",
        surface: "proposal_pdf",
        event: "fallback_meta_load_failed",
        result: "error",
        fallbackUsed: true,
        errorMessage: "meta exploded",
        extra: expect.objectContaining({
          catchKind: "degraded_fallback",
          scope: "buyer.proposalPdf.buildFallbackMeta",
        }),
      }),
    ]);

    warnSpy.mockRestore();
  });
});
