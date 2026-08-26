process.env.ESTIMATE_BACKEND_PARITY_BATCH = "BATCH-002";

void import("./runBatch001DrywallBackendParityR3").catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
