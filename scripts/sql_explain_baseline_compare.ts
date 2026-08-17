import fs from "node:fs";
import path from "node:path";

import {
  buildSqlCriticalPathRankings,
  renderSqlCriticalPathProof,
  type SqlCriticalPathMatrixEntry,
} from "./_shared/sqlExplainBaselineCore";

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const matrixOutPath = path.join(artifactsDir, "SQL_critical_path_explain_matrix.json");
const rankingsOutPath = path.join(artifactsDir, "SQL_critical_path_rankings.json");
const proofOutPath = path.join(artifactsDir, "SQL_critical_path_explain_proof.md");

const readJson = <T,>(filePath: string): T => {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const writeText = (filePath: string, payload: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payload);
};

const main = () => {
  const matrixEnvelope = readJson<{ matrix: SqlCriticalPathMatrixEntry[] }>(matrixOutPath);
  const matrix = Array.isArray(matrixEnvelope.matrix) ? matrixEnvelope.matrix : [];
  if (!matrix.length) {
    throw new Error("SQL critical path matrix is empty; run sql_explain_baseline_collect first");
  }

  const rankings = buildSqlCriticalPathRankings(matrix);

  writeJson(rankingsOutPath, {
    collectedAt: new Date().toISOString(),
    rankings,
  });
  writeText(proofOutPath, renderSqlCriticalPathProof(matrix, rankings));

  console.log(
    JSON.stringify(
      {
        matrixCount: matrix.length,
        rankingsCount: rankings.length,
        topRankedPath: rankings[0]?.id ?? null,
        rankingsOutPath,
      },
      null,
      2,
    ),
  );
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error ?? "sql explain baseline compare failed");
  console.error(message);
  process.exitCode = 1;
}
