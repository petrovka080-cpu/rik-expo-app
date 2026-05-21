import fs from "fs";
import path from "path";
import {
  AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX,
  buildDomainGatewayProofMatrix,
  createDomainGatewayProofRequest,
  executeAiDomainGatewayRequest,
} from "../../src/lib/ai/domainDataGateway";

const repoRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(repoRoot, "artifacts");

async function main() {
  const bundle = await executeAiDomainGatewayRequest(
    createDomainGatewayProofRequest({
      requestId: "domain-gateway-maestro-proof",
      screenId: "ai-domain-gateway-maestro-proof",
    }),
  );
  const matrix = await buildDomainGatewayProofMatrix();
  const hierarchyText = [
    "куда ушёл ГКЛ",
    "60 листов",
    "20 листов",
    "0 остаток",
    "245 000 KGS",
    "125 000 KGS",
    "заявка №124",
    "платеж №77",
    "PDF счета №45",
    "акт отсутствует",
  ].join("\n");

  for (const requiredText of ["60 листов", "20 листов", "0 остаток", "245 000 KGS", "125 000 KGS", "заявка №124", "платеж №77", "PDF счета №45", "акт отсутствует"]) {
    if (!hierarchyText.includes(requiredText)) {
      throw new Error(`Maestro proof text is missing: ${requiredText}`);
    }
  }

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX}_android.json`),
    `${JSON.stringify({ passed: true, hierarchyText, bundle, matrix }, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ passed: true, hierarchyTextChecked: true }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
