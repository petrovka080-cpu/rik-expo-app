import fs from "node:fs";
import path from "node:path";

import {
  resolveAiE2eFixtureRegistry,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRegistry";
import {
  redactAiE2eFixtureRecord,
  redactAiE2eFixtureText,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRedaction";

export function resolveAiExplicitFixturesForArtifact(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const resolution = resolveAiE2eFixtureRegistry(env);
  return {
    source: resolution.source,
    status: resolution.status,
    greenEligible: resolution.greenEligible,
    blockedStatus: resolution.blockedStatus,
    missingKeys: resolution.missingKeys,
    fixtureRefs: resolution.fixtures ? redactAiE2eFixtureRecord(resolution.fixtures) : null,
    fixtureValueRedactionRequired: true,
    authAdminUsed: false,
    listUsersUsed: false,
    serviceRoleUsed: false,
    dbSeedUsed: false,
    dbWritesPerformed: false,
    fakeRequestCreated: false,
    fakeActionCreated: false,
    rawFixtureValuesPrinted: false,
    exactReason: resolution.exactReason,
  };
}

function main(): void {
  const artifact = resolveAiExplicitFixturesForArtifact(process.env);
  const outputPath = path.join(
    process.cwd(),
    "artifacts",
    "S_AI_FIXTURE_01_EXPLICIT_E2E_FIXTURE_REGISTRY_matrix.json",
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const json = JSON.stringify(artifact, null, 2);
  fs.writeFileSync(outputPath, `${redactAiE2eFixtureText(json)}\n`);
  process.stdout.write(`${redactAiE2eFixtureText(json)}\n`);
  process.exitCode = artifact.status === "loaded" ? 0 : 2;
}

if (require.main === module) {
  main();
}
