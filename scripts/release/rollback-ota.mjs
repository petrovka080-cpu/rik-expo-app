#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const WAVE = "S-ROLL-3/S-OTA-2";
const ALLOWED_TARGETS = new Set(["development", "preview", "staging", "production"]);
const SECRET_REDACTION = "[REDACTED]";

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json" || token === "--dry-run" || token === "--execute" || token === "--owner-approved") {
      flags.add(token);
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}".`);
    }

    values.set(token, next);
    index += 1;
  }

  return {
    target: values.get("--target") ?? "",
    channel: values.get("--channel") ?? "",
    runtimeVersion: values.get("--runtime-version") ?? "",
    rollbackTo: values.get("--rollback-to") ?? "",
    json: flags.has("--json"),
    dryRun: flags.has("--dry-run") || !flags.has("--execute"),
    execute: flags.has("--execute"),
    ownerApproved: flags.has("--owner-approved"),
  };
}

function readGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function quotePlanArg(value) {
  return `"${redactReleaseText(value).replace(/"/g, '""')}"`;
}

export function redactReleaseText(value) {
  let text = String(value ?? "");
  text = text.replace(
    /\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}\b/g,
    SECRET_REDACTION,
  );
  text = text.replace(
    /\b(?:expo|eas|sentry|sntrys|supabase|service[_-]?role)[A-Za-z0-9_.:-]{12,}\b/gi,
    SECRET_REDACTION,
  );
  text = text.replace(
    /([?&](?:token|access_token|auth|authorization|signature|sig|apikey|api_key|key)=)[^&#\s]+/gi,
    `$1${SECRET_REDACTION}`,
  );
  text = text.replace(
    /\b[A-Za-z0-9_-]{48,}\b/g,
    SECRET_REDACTION,
  );
  return text;
}

function validateArgs(args) {
  const errors = [];

  if (!args.target) errors.push("Missing required --target.");
  if (args.target && !ALLOWED_TARGETS.has(args.target)) {
    errors.push(`Unknown --target "${args.target}". Allowed: development, preview, staging, production.`);
  }
  if (!args.channel) errors.push("Missing required --channel.");
  if (!args.runtimeVersion) errors.push("Missing required --runtime-version.");
  if (!args.rollbackTo) errors.push("Missing required --rollback-to.");
  if (args.target === "production" && args.execute && !args.ownerApproved) {
    errors.push("Production execute requires explicit --owner-approved.");
  }
  if (args.execute && process.env.JEST_WORKER_ID) {
    errors.push("Execute mode is disabled during tests.");
  }

  return errors;
}

function buildPlannedCommands(args, validationErrors = []) {
  if (validationErrors.length > 0) return [];

  const rollbackMessage = `Rollback ${args.target} ${args.channel} to ${args.rollbackTo}`;
  return [
    {
      name: "identify_previous_release_candidate",
      dryRunOnly: true,
      command: `npx eas update:list --branch ${quotePlanArg(args.channel)} --json`,
      purpose:
        "List update groups for the target branch so the owner can confirm the rollback target belongs to the same channel and runtime lineage.",
      executesInThisHelper: false,
    },
    {
      name: "render_owner_rollback_republish_command",
      dryRunOnly: true,
      command:
        `npx eas update:republish --branch ${quotePlanArg(args.channel)}` +
        ` --group ${quotePlanArg(args.rollbackTo)}` +
        ` --message ${quotePlanArg(rollbackMessage)}`,
      purpose:
        "Owner-executed rollback command after confirming the rollback target and release lineage. This helper renders the command only.",
      executesInThisHelper: false,
    },
  ];
}

function buildReport(args, validationErrors = []) {
  const status = validationErrors.length > 0 ? "rejected" : args.dryRun ? "dry_run" : "owner_action_required";
  const productionTouched = false;
  const commandsPlanned = buildPlannedCommands(args, validationErrors);

  return {
    wave: WAVE,
    target: redactReleaseText(args.target),
    status,
    execute: args.execute && validationErrors.length === 0,
    channel: redactReleaseText(args.channel),
    runtimeVersion: redactReleaseText(args.runtimeVersion),
    rollbackTo: redactReleaseText(args.rollbackTo),
    previousReleaseCandidate: validationErrors.length > 0
      ? null
      : {
          source: "owner_supplied_rollback_to",
          channel: redactReleaseText(args.channel),
          runtimeVersion: redactReleaseText(args.runtimeVersion),
          updateGroupOrReleaseRef: redactReleaseText(args.rollbackTo),
          verificationRequired:
            "Confirm this target appears in EAS update history for the same channel and runtimeVersion before any owner execution.",
        },
    gitSha: readGitSha(),
    commandsPlanned,
    commandsExecuted: [],
    otaPublished: false,
    easUpdateTriggered: false,
    deployTriggered: false,
    renderTouched: false,
    dbTouched: false,
    envWritten: false,
    productionBusinessCalls: false,
    productionEndpointsCalled: false,
    networkCalls: false,
    productionTouched,
    secretsPrinted: false,
    errors: validationErrors,
    note:
      status === "owner_action_required"
        ? "Owner-approved execution is intentionally not performed by this helper; use the rendered command and runbook to perform and record the manual release action."
        : "No EAS command was executed.",
  };
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`wave: ${report.wave}`);
  console.log(`target: ${report.target}`);
  console.log(`status: ${report.status}`);
  console.log(`channel: ${report.channel}`);
  console.log(`runtimeVersion: ${report.runtimeVersion}`);
  console.log(`rollbackTo: ${report.rollbackTo}`);
  console.log(`gitSha: ${report.gitSha}`);
  console.log(`otaPublished: ${String(report.otaPublished)}`);
  console.log(`easUpdateTriggered: ${String(report.easUpdateTriggered)}`);
  if (report.errors.length > 0) {
    console.log("errors:");
    for (const error of report.errors) console.log(`- ${redactReleaseText(error)}`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const validationErrors = validateArgs(args);
    const report = buildReport(args, validationErrors);
    printReport(report, args.json);
    if (validationErrors.length > 0) process.exit(2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = buildReport(
      {
        target: "",
        channel: "",
        runtimeVersion: "",
        rollbackTo: "",
        json: process.argv.includes("--json"),
        dryRun: true,
        execute: false,
        ownerApproved: false,
      },
      [redactReleaseText(message)],
    );
    printReport(report, process.argv.includes("--json"));
    process.exit(2);
  }
}

main();
