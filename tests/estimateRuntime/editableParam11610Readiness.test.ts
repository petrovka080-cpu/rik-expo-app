import { runEditableParam11610Harness } from "./editableParam11610Readiness.harness";

describe("editable param 11610 readiness", () => {
  it("keeps every work passport editable through bounded isolated recalculation shards", async () => {
    const terminal = await runEditableParam11610Harness();

    expect(terminal).toMatchObject({
      schema: "editable-param-11610-harness-terminal/v1",
      status: "GREEN",
      manifest_total: 11610,
      unique_template_ids: 11610,
      worker_count: 2,
      blockers: [],
    });
    expect(terminal.preflight).toMatchObject({
      status: "GREEN",
      close_observed: true,
      exit_code: 0,
      timed_out: false,
      within_technical_deadline: true,
      orphan_detected: false,
      blockers: [],
    });
    expect(terminal.workers).toHaveLength(2);
    expect(terminal.workers.every((worker) =>
      worker.status === "GREEN" &&
      worker.close_observed &&
      worker.exit_code === 0 &&
      worker.within_technical_deadline &&
      !worker.timed_out &&
      !worker.orphan_detected &&
      worker.blockers.length === 0)).toBe(true);
    expect(terminal.shards).toHaveLength(24);
    expect(terminal.shards.reduce((total, shard) => total + shard.ready, 0)).toBe(11610);
    expect(terminal.shards.every((shard) =>
      shard.status === "GREEN" &&
      shard.ready === shard.assigned &&
      shard.blockers.length === 0 &&
      shard.cache_bounded)).toBe(true);
  }, 300000);
});
