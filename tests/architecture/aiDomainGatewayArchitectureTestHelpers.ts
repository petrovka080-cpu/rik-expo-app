import fs from "fs";
import path from "path";

export const repoRoot = path.resolve(__dirname, "../..");
export const domainGatewayRoot = path.join(repoRoot, "src", "lib", "ai", "domainDataGateway");

export function listFilesRecursive(root: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

export function readDomainGatewaySource(): string {
  return listFilesRecursive(domainGatewayRoot, (file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

export function readProviderSource(): string {
  return listFilesRecursive(path.join(domainGatewayRoot, "providers"), (file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}
