import {
  buildS279ProjectSourcePackagesPreflightReceipt,
  parseS279ProjectSourcePackagesPreflightArgs,
  writeProjectSourcePackagePreflightReceipt,
} from "./projectSourcePackagePreflightR1";

function main(): void {
  const options = parseS279ProjectSourcePackagesPreflightArgs(process.argv.slice(2));
  const receipt = buildS279ProjectSourcePackagesPreflightReceipt(options);
  const outputPath = writeProjectSourcePackagePreflightReceipt(options.outputPath, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    outputPath,
    receiptPayloadSha256: receipt.receiptPayloadSha256,
  })}\n`);
}

main();
