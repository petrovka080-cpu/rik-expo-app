import { createHash } from "node:crypto";

import {
  evaluateEditableParam11610FanIn,
  evaluateEditableParam11610WorkerProcess,
  type EditableParam11610ManifestPreflight,
  type EditableParam11610ManifestTerminal,
  type EditableParam11610ShardTerminal,
  type EditableParam11610WorkerPayloadTerminal,
  type EditableParam11610WorkerProcessTerminal,
  type OwnedChildLifecycle,
} from "./editableParam11610Readiness.harness";

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function lifecycle(overrides: Partial<OwnedChildLifecycle> = {}): OwnedChildLifecycle {
  return {
    pid: 101,
    started_at_ms: 100,
    deadline_at_ms: 1_000,
    close_observed: true,
    close_observed_at_ms: 999,
    exit_code: 0,
    signal: null,
    timed_out: false,
    termination_attempted: false,
    termination_succeeded: false,
    orphan_detected: false,
    stderr_tail: "",
    blockers: [],
    ...overrides,
  };
}

function workerPayload(shardIndexes: number[]): EditableParam11610WorkerPayloadTerminal {
  return {
    schema: "editable-param-11610-worker-terminal/v1",
    status: "GREEN",
    duration_ms: 800,
    shard_indexes: shardIndexes,
    terminal_count: shardIndexes.length,
    blocker: null,
  };
}

function shard(shardIndex: number, templateIds: string[]): EditableParam11610ShardTerminal {
  const start = Math.floor(11610 * shardIndex / 24);
  const end = Math.floor(11610 * (shardIndex + 1) / 24);
  return {
    schema: "editable-param-11610-shard-terminal/v1",
    status: "GREEN",
    shard_index: shardIndex,
    shard_count: 24,
    duration_ms: 100,
    assigned: end - start,
    ready: end - start,
    blockers: [],
    cache_bounded: true,
    first_global_index: start,
    end_global_index_exclusive: end,
    template_ids: templateIds,
  };
}

function fullFanInFixture(): {
  preflight: EditableParam11610ManifestPreflight;
  workers: EditableParam11610WorkerProcessTerminal[];
} {
  const ids = Array.from({ length: 11610 }, (_value, index) => `template-${index}`);
  const shards = Array.from({ length: 24 }, (_value, shardIndex) => {
    const start = Math.floor(ids.length * shardIndex / 24);
    const end = Math.floor(ids.length * (shardIndex + 1) / 24);
    return shard(shardIndex, ids.slice(start, end));
  });
  const assignment = shards.map((entry) => ({
    shard_index: entry.shard_index,
    assigned: entry.assigned,
    first_global_index: entry.first_global_index,
    end_global_index_exclusive: entry.end_global_index_exclusive,
    template_ids_sha256: sha256Json(entry.template_ids),
  }));
  const manifestTerminal: EditableParam11610ManifestTerminal = {
    schema: "editable-param-11610-manifest-terminal/v1",
    status: "GREEN",
    duration_ms: 100,
    manifest_total: ids.length,
    unique_template_ids: ids.length,
    manifest_sha256: sha256Json(ids),
    assignment_sha256: sha256Json(assignment),
    predicate_contract: ["meaningful_per_id_assertions"],
    predicate_contract_sha256: sha256Json(["meaningful_per_id_assertions"]),
    shards: assignment,
    blocker: null,
  };
  const preflight: EditableParam11610ManifestPreflight = {
    schema: "editable-param-11610-manifest-preflight/v1",
    status: "GREEN",
    source_sha256: "a".repeat(64),
    close_observed: true,
    close_observed_at: new Date(999).toISOString(),
    exit_code: 0,
    timed_out: false,
    within_technical_deadline: true,
    orphan_detected: false,
    terminal: manifestTerminal,
    blockers: [],
  };
  const workers = [0, 1].map((workerIndex) => {
    const assigned = Array.from({ length: 24 }, (_value, index) => index)
      .filter((index) => index % 2 === workerIndex);
    return evaluateEditableParam11610WorkerProcess({
      workerIndex,
      assignedShardIndexes: assigned,
      lifecycle: lifecycle({ pid: 200 + workerIndex }),
      payloadTerminals: [workerPayload(assigned)],
      shardTerminals: assigned.map((index) => shards[index]),
    });
  });
  return { preflight, workers };
}

describe("editable param 11610 child lifecycle and fan-in", () => {
  const assigned = [0, 2];
  const shardTerminals = [shard(0, Array.from({ length: 483 }, (_value, index) => `a-${index}`)),
    shard(2, Array.from({ length: 484 }, (_value, index) => `b-${index}`))];

  it("accepts only a closed zero-exit worker with its exact payload and chunks", () => {
    expect(evaluateEditableParam11610WorkerProcess({
      workerIndex: 0,
      assignedShardIndexes: assigned,
      lifecycle: lifecycle(),
      payloadTerminals: [workerPayload(assigned)],
      shardTerminals,
    })).toMatchObject({
      status: "GREEN",
      close_observed: true,
      exit_code: 0,
      within_technical_deadline: true,
      orphan_detected: false,
      blockers: [],
    });
  });

  it.each([
    ["late success", lifecycle({ close_observed_at_ms: 1_001 })],
    ["success JSON with nonzero exit", lifecycle({ exit_code: 1 })],
    ["timeout without observed close", lifecycle({
      close_observed: false,
      close_observed_at_ms: null,
      exit_code: null,
      timed_out: true,
      termination_attempted: true,
    })],
    ["owned descendant/orphan remains", lifecycle({ orphan_detected: true })],
  ])("rejects %s", (_label, workerLifecycle) => {
    expect(evaluateEditableParam11610WorkerProcess({
      workerIndex: 0,
      assignedShardIndexes: assigned,
      lifecycle: workerLifecycle,
      payloadTerminals: [workerPayload(assigned)],
      shardTerminals,
    }).status).not.toBe("GREEN");
  });

  it("rejects a missing coordinator terminal and a lost chunk", () => {
    const terminal = evaluateEditableParam11610WorkerProcess({
      workerIndex: 0,
      assignedShardIndexes: assigned,
      lifecycle: lifecycle(),
      payloadTerminals: [],
      shardTerminals: shardTerminals.slice(0, 1),
    });
    expect(terminal.status).toBe("RED");
    expect(terminal.blockers).toEqual(expect.arrayContaining([
      "WORKER_PAYLOAD_TERMINAL_COUNT:0:1",
      "WORKER_SHARD_MEMBERSHIP_MISMATCH",
    ]));
  });

  it("recomputes exact 11610 membership and hashes from primary chunk results", () => {
    const fixture = fullFanInFixture();
    expect(evaluateEditableParam11610FanIn(fixture)).toMatchObject({
      passed: true,
      manifestTotal: 11610,
      uniqueTemplateIds: 11610,
      blockers: [],
    });
  });

  it.each(["duplicate", "foreign", "lost"] as const)("rejects %s fan-in", (kind) => {
    const fixture = fullFanInFixture();
    const firstShard = fixture.workers[0].shards[0];
    if (kind === "duplicate") firstShard.template_ids[0] = firstShard.template_ids[1];
    if (kind === "foreign") firstShard.template_ids[0] = "foreign-template";
    if (kind === "lost") fixture.workers[0].shards.shift();
    const result = evaluateEditableParam11610FanIn(fixture);
    expect(result.passed).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
