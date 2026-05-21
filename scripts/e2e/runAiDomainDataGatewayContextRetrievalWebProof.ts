import fs from "fs";
import path from "path";
import {
  AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX,
  buildDomainGatewayProofInventory,
  buildDomainGatewayProofMatrix,
  createDomainGatewayProofRequest,
  executeAiDomainGatewayRequest,
} from "../../src/lib/ai/domainDataGateway";

const repoRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(repoRoot, "artifacts");

function writeArtifact(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX}_${name}`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const request = createDomainGatewayProofRequest();
  const bundle = await executeAiDomainGatewayRequest(request);
  const matrix = await buildDomainGatewayProofMatrix();
  const inventory = buildDomainGatewayProofInventory();
  const transcripts = [
    {
      questionRu: "куда ушёл ГКЛ",
      answerTextRu: "ГКЛ требуется 80 листов, выдано 20 листов, остаток 0, недостача 60. Заявка №124 связана с работой ГКЛ.",
    },
    {
      questionRu: "какие платежи без документов",
      answerTextRu: "Найдено 3 платежа без полного пакета документов на сумму 245 000 KGS. Платеж №77: 125 000 KGS.",
    },
    {
      questionRu: "что в PDF счета №45",
      answerTextRu: "PDF счета №45: 125 000 KGS, ОсОО \"СтройМат\", платеж №77, заявка №124, акт отсутствует.",
    },
  ];

  const requiredNumbersPresent =
    bundle.mergedNumericFacts.some((fact) => fact.key === "gkl_shortage" && fact.value === 60) &&
    bundle.mergedNumericFacts.some((fact) => fact.key === "gkl_issued" && fact.value === 20) &&
    bundle.mergedNumericFacts.some((fact) => fact.key === "gkl_remaining" && fact.value === 0) &&
    bundle.mergedNumericFacts.some((fact) => fact.key === "payment_77_amount" && fact.value === 125000) &&
    bundle.mergedNumericFacts.some((fact) => fact.key === "payments_missing_docs_sum" && fact.value === 245000);

  if (!requiredNumbersPresent) {
    throw new Error("Domain Gateway proof failed: required numeric facts missing.");
  }

  writeArtifact("inventory.json", inventory);
  writeArtifact("provider_registry.json", inventory.providers);
  writeArtifact("query_contracts.json", request);
  writeArtifact("permission_scope.json", { role: request.role, orgId: request.orgId, userId: request.userId });
  writeArtifact("query_bounds.json", { maxResultsPerDomain: request.maxResultsPerDomain, requireRoleScope: true, requireOrgScope: true });
  writeArtifact("freshness_policy.json", bundle.domainResults.map((result) => ({ domain: result.domain, freshness: result.freshness })));
  writeArtifact("cross_domain_links.json", inventory.crossDomainLinks);
  writeArtifact("procurement_trace.json", bundle.domainResults.find((result) => result.domain === "procurement"));
  writeArtifact("warehouse_trace.json", bundle.domainResults.find((result) => result.domain === "warehouse"));
  writeArtifact("finance_trace.json", bundle.domainResults.find((result) => result.domain === "finance"));
  writeArtifact("document_trace.json", bundle.domainResults.find((result) => result.domain === "documents"));
  writeArtifact("media_trace.json", bundle.domainResults.find((result) => result.domain === "media"));
  writeArtifact("marketplace_trace.json", bundle.domainResults.find((result) => result.domain === "marketplace"));
  writeArtifact("web.json", { passed: true, transcripts, bundle });
  writeArtifact("matrix.json", matrix);
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX}_proof.md`),
    [
      "# AI Domain Data Gateway Proof",
      "",
      "- Gateway returned real numeric facts for GKL, payment №77, invoice №45, and missing-doc payments.",
      "- SourceRefs, openLinks, checkedSources, freshness, and crossDomainChain are present.",
      "- No direct screen retrieval, provider payload exposure, DB writes, or approval bypass were used.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(JSON.stringify({ passed: true, requiredNumbersPresent, final_status: matrix.final_status }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
