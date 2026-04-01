const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = process.cwd();
const SCAN_ROOTS = ["src", "scripts", "app"];
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dirPath, collected) {
  if (!fs.existsSync(dirPath)) return;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".expo" ||
      entry.name === "dist" ||
      entry.name === "artifacts"
    ) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, collected);
      continue;
    }

    if (!CODE_EXTENSIONS.has(path.extname(entry.name))) continue;
    collected.push(absolutePath);
  }
}

function getImportStatement(sourceText, importNode) {
  return sourceText
    .slice(importNode.getFullStart(), importNode.getEnd())
    .replace(/\s+/g, " ")
    .trim();
}

const files = [];
for (const root of SCAN_ROOTS) {
  walk(path.join(ROOT, root), files);
}

const typeOnlyHits = [];
const violations = [];

for (const filePath of files) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, "/");

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;

    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;
    if (!moduleSpecifier.text.endsWith("database.types")) return;

    const importClause = node.importClause;
    const statement = getImportStatement(sourceText, node);

    if (importClause?.isTypeOnly === true) {
      typeOnlyHits.push({ file: relativePath, statement });
      return;
    }

    violations.push({ file: relativePath, statement });
  });
}

if (violations.length > 0) {
  console.error(
    `[verify:db-types:imports] found ${violations.length} non-type database.types imports:`,
  );
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.statement}`);
  }
  process.exit(1);
}

console.log(
  `[verify:db-types:imports] ok: ${typeOnlyHits.length} type-only database.types imports verified across ${SCAN_ROOTS.join(", ")}`,
);
