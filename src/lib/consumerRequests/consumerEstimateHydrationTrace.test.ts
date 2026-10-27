import { createConsumerEstimateHydrationTrace, createConsumerEstimatePresentationTrace, type ConsumerEstimateHydrationPhaseEvent,
  type ConsumerEstimatePresentationPhase } from "./consumerEstimateHydrationTrace";

describe("bounded hydration phase diagnostics, not a cold-SLO acceptance", () => {
  it("separates queue wait, async recovery and synchronous projection without recording any content", async () => {
    let time = 0;
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimateHydrationTrace({ clock: () => time, report: event => { events.push(event); } });
    const finishWait = trace.begin("DURABLE_QUEUE_WAIT"); time = 12; finishWait(); finishWait("failed");
    const secretBundle = { draftId: "private-user-draft", accessToken: "private-auth", businessContent: "private-specification" };
    expect(await trace.measureAsync("DURABLE_BUNDLE_RECOVERY", async () => { time = 32; return secretBundle; })).toBe(secretBundle);
    expect(trace.measureSync("DURABLE_LOCAL_PROJECTION", () => { time = 37; return secretBundle; })).toBe(secretBundle);
    expect(events.map(({ phase, status, durationMs, elapsedMs }) => ({ phase, status, durationMs, elapsedMs }))).toEqual([
      { phase: "DURABLE_QUEUE_WAIT", status: "completed", durationMs: 12, elapsedMs: 12 },
      { phase: "DURABLE_BUNDLE_RECOVERY", status: "completed", durationMs: 20, elapsedMs: 32 },
      { phase: "DURABLE_LOCAL_PROJECTION", status: "completed", durationMs: 5, elapsedMs: 37 },
    ]);
    expect(new Set(events.map(event => event.trace)).size).toBe(1);
    for (const event of events) expect(Object.keys(event).sort()).toEqual(["durationMs", "elapsedMs", "phase", "status", "trace"]);
    expect(JSON.stringify(events)).not.toMatch(/private-|accessToken|businessContent|draftId/u);
  });
  it("keeps original thrown errors and records only failed status, never their message", async () => {
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimateHydrationTrace({ clock: () => 0, report: event => { events.push(event); } });
    const error = new Error("private-server-error-token");
    await expect(trace.measureAsync("PARAMETER_SNAPSHOT_FETCH", async () => { throw error; })).rejects.toBe(error);
    expect(() => trace.measureSync("PARAMETER_SESSION_BUILD", () => { throw error; })).toThrow(error);
    expect(events.map(event => event.status)).toEqual(["failed", "failed"]);
    expect(JSON.stringify(events)).not.toContain(error.message);
  });
  it.each([() => NaN, () => { throw new Error("clock unavailable"); }])("cannot fail recovery or emit false timing when a clock fails", async clock => {
    const report = jest.fn();
    const trace = createConsumerEstimateHydrationTrace({ clock, report });
    expect(trace.measureSync("DURABLE_LOCAL_PROJECTION", () => 4)).toBe(4);
    await expect(trace.measureAsync("DURABLE_BUNDLE_RECOVERY", async () => 5)).resolves.toBe(5);
    expect(report).not.toHaveBeenCalled();
  });
  it("cannot fail recovery when a diagnostic sink fails", async () => {
    const trace = createConsumerEstimateHydrationTrace({ clock: () => 0, report: () => { throw new Error("sink unavailable"); } });
    expect(trace.measureSync("DURABLE_LOCAL_PROJECTION", () => 4)).toBe(4);
    await expect(trace.measureAsync("DURABLE_BUNDLE_RECOVERY", async () => 5)).resolves.toBe(5);
  });
  it("limits first presentation diagnostics without reusing a result or skipping later validation", () => {
    let time = 0;
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimatePresentationTrace({ clock: () => time, report: event => { events.push(event); } });
    const first = { privateSpecification: "private-first-value" };
    const next = { privateSpecification: "private-current-value" };
    const work = jest.fn().mockImplementationOnce(() => { time = 12; return first; }).mockReturnValue(next);
    expect(trace.measureSync("PRESENTATION_DRAFT_MODEL", work)).toBe(first);
    for (let index = 0; index < 30; index += 1) expect(trace.measureSync("PRESENTATION_DRAFT_MODEL", work)).toBe(next);
    expect(work).toHaveBeenCalledTimes(31);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ phase: "PRESENTATION_DRAFT_MODEL", durationMs: 12, status: "completed" });
    expect(JSON.stringify(events)).not.toMatch(/private|Specification/u);
  });
  it("bounds distinct phases per owner and keeps failures real on first and later calls", () => {
    const phases: ConsumerEstimatePresentationPhase[] = [
      "PRESENTATION_SCREEN_MODEL", "PRESENTATION_DRAFT_MODEL", "PRESENTATION_PUBLIC_TITLE_ADMISSION",
      "PRESENTATION_PUBLIC_ROW_SECTIONS", "PRESENTATION_VISIBLE_LINES", "PRESENTATION_PREVIEW_SECTIONS",
      "PRESENTATION_CALCULATION_PREVIEW", "PRESENTATION_NORM_SOURCE_PREVIEW", "PRESENTATION_REVISION_DISPLAY",
      "PRESENTATION_HISTORY_SUMMARY", "PRESENTATION_BACKEND_BINDING",
    ];
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimatePresentationTrace({ clock: () => 0, report: event => { events.push(event); } });
    const error = new Error("private-validation-error");
    for (const phase of phases) {
      expect(() => trace.measureSync(phase, () => { throw error; })).toThrow(error);
      expect(() => trace.measureSync(phase, () => { throw error; })).toThrow(error);
    }
    expect(events).toHaveLength(phases.length);
    expect(events.every(event => event.status === "failed")).toBe(true);
    const otherOwner = createConsumerEstimatePresentationTrace({ clock: () => 0, report: event => { events.push(event); } });
    expect(otherOwner.measureSync(phases[0]!, () => 3)).toBe(3);
    expect(events).toHaveLength(phases.length + 1);
    expect(events[0]?.trace).not.toBe(events.at(-1)?.trace);
    expect(JSON.stringify(events)).not.toContain(error.message);
  });
  it("cannot change first or later presentation outcomes when diagnostics fail", () => {
    const trace = createConsumerEstimatePresentationTrace({ clock: () => 0, report: () => { throw new Error("sink"); } });
    expect(trace.measureSync("PRESENTATION_REVISION_DISPLAY", () => 4)).toBe(4);
    expect(trace.measureSync("PRESENTATION_REVISION_DISPLAY", () => 5)).toBe(5);
    const failedClock = createConsumerEstimatePresentationTrace({ clock: () => { throw new Error("clock"); } });
    expect(failedClock.measureSync("PRESENTATION_BACKEND_BINDING", () => 6)).toBe(6);
  });
});
