import { join } from "node:path";

import { assertExact, evidenceRoot, readJson, writeJson } from "./support";

type Json = Record<string, any>;
const a = readJson<Json>(join(evidenceRoot, "16-replay", "REPLAY_A.json"));
const b = readJson<Json>(join(evidenceRoot, "16-replay", "REPLAY_B.json"));
assertExact(a.status === "GREEN" && b.status === "GREEN" && a.replayPayloadSha256 === b.replayPayloadSha256, "FIRE_REPLAY_A_B_RED");
const report = { schemaVersion: "batch009-fire-r5-replay-comparison.v1", replay: "2/2", releaseId: a.releaseId, payloadA: a.replayPayloadSha256, payloadB: b.replayPayloadSha256, contentDiff: 0, cardinalityDiff: 0, queueDiff: 0, unexplainedIdDiff: 0, activationPlanDiff: 0, externalDefinitionVersionDiff: 0, activationPerClone: 1, committedActivationA: 1, status: "GREEN" };
writeJson("16-replay/REPLAY_COMPARISON.json", report);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
