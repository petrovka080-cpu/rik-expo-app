import {
  buildCoreMutationIdempotencyReport,
  writeCoreMutationIdempotencyArtifacts,
} from "./coreMutationIdempotency.shared";

const report = buildCoreMutationIdempotencyReport();
writeCoreMutationIdempotencyArtifacts(report);

console.log(JSON.stringify(report.matrix, null, 2));

if (report.matrix.final_status !== "GREEN_CORE_MUTATION_IDEMPOTENCY_AUDIT_TRAIL_HARDENING_READY") {
  process.exitCode = 1;
}

