#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  assertJsonDoesNotContainSecrets,
  buildHealthCheckResult,
  parseHealthCheckArgs,
} = require("./checkProductionHealthCore.js");

const args = parseHealthCheckArgs(process.argv);
const { result, exitCode } = buildHealthCheckResult({
  target: args.target,
  dryRun: args.dryRun,
  env: process.env,
});
const output = `${JSON.stringify(result, null, 2)}\n`;

if (!assertJsonDoesNotContainSecrets(output, process.env)) {
  process.stderr.write("checkProductionHealth refused to print secret-bearing output\n");
  process.exitCode = 1;
} else {
  process.stdout.write(output);
  process.exitCode = exitCode;
}
