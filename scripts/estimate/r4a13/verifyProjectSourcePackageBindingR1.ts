import {
  buildProjectSourcePackagePreflightReceipt,
  parseProjectSourcePackagePreflightArgs,
  writeProjectSourcePackagePreflightReceipt,
} from "./projectSourcePackagePreflightR1";

function main(): void {
  const options = parseProjectSourcePackagePreflightArgs(process.argv.slice(2));
  const receipt = buildProjectSourcePackagePreflightReceipt(options);
  const receiptPath = writeProjectSourcePackagePreflightReceipt(options.outputPath, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    receiptPath,
    receiptPayloadSha256: receipt.receiptPayloadSha256,
    databaseWrites: 0,
    mutationPerformed: false,
  })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
