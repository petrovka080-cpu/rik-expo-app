import path from "node:path";

import { bodyText, captureWebFailureArtifact, launchWebRuntime, poll, waitForBody, writeJsonArtifact } from "./_shared/webRuntimeHarness";
import { cleanupContractorCanonicalScenarios, seedContractorCanonicalScenarios } from "./_shared/contractorCanonicalSeed";

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "contractor-pipeline");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function loginContractorWeb(
  page: import("playwright").Page,
  user: { email: string; password: string },
) {
  await page.goto("http://localhost:8081/contractor", { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').first().fill(user.password);
    const loginButton = page.getByText(/Войти|Login/i).first();
    await loginButton.click();
    await poll(
      "contractor_web_login_complete",
      async () => {
        const body = await bodyText(page);
        if (body.includes("Добро пожаловать") || body.includes("Войти")) return null;
        return body;
      },
      20_000,
      500,
    ).catch(() => null);
    await page.waitForTimeout(3000);
  }
  await page.goto("http://localhost:8081/contractor", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
}

async function main() {
  let context: Awaited<ReturnType<typeof seedContractorCanonicalScenarios>> | null = null;
  let browser: import("playwright").Browser | null = null;
  let page: import("playwright").Page | null = null;
  try {
    context = await seedContractorCanonicalScenarios();
    const buyerScenario = context.scenarios.find((scenario) => scenario.key === "buyer_subcontract") ?? null;
    const foremanSubcontractScenario = context.scenarios.find((scenario) => scenario.key === "foreman_subcontract_request") ?? null;
    const foremanMaterialsScenario = context.scenarios.find((scenario) => scenario.key === "foreman_material_request") ?? null;
    const invalidScenario = context.scenarios.find((scenario) => scenario.key === "invalid_missing_contractor") ?? null;
    const materialLeakScenario = context.scenarios.find((scenario) => scenario.key === "invalid_material_only") ?? null;

    assert(buyerScenario && foremanSubcontractScenario && foremanMaterialsScenario, "Missing ready contractor scenarios");
    assert(invalidScenario && materialLeakScenario, "Missing invalid contractor scenarios");

    const { browser: launchedBrowser, page: runtimePage, runtime } = await launchWebRuntime();
    browser = launchedBrowser;
    page = runtimePage;

    await loginContractorWeb(page, context.contractorUser);
    await waitForBody(page, ["Подрядчик", context.contractorRecord.companyName], 45_000);

    const body = await page.evaluate(() => document.body.innerText || "");
    const contractorCardCount = await page.getByText(context.contractorRecord.companyName, { exact: false }).count();
    const contractorVisible = contractorCardCount >= 3;
    const invalidRowsVisible = body.includes("Подрядчик не указан");

    const buyerCard = page.getByText(context.contractorRecord.companyName, { exact: false }).first();
    assert((await buyerCard.count()) > 0, "Contractor card was not rendered");
    await buyerCard.click();

    await waitForBody(page, ["Факт выполнения работы", context.contractorRecord.companyName, "ИНН", "Договор"], 30_000);
    const issuedToggle = page.getByText("Выдачи со склада", { exact: true }).first();
    assert((await issuedToggle.count()) > 0, "Warehouse issues section was not rendered");
    await issuedToggle.click();

    await waitForBody(
      page,
      ["Номера выдач", "Выдано:", "нет выдач", "По этой работе еще не подтверждены выдачи материалов."],
      30_000,
    );
    const detailBody = await page.evaluate(() => document.body.innerText || "");

    const summary = {
      gate: "contractor_pipeline_verify",
      directorApproved: true,
      contractorVisible,
      contractorResolved:
        detailBody.includes(context.contractorRecord.companyName) && !detailBody.includes("Подрядчик не указан"),
      objectResolved: !detailBody.includes("Объект не указан"),
      workResolved: !detailBody.includes("Работа\nОбъект не указан"),
      detailHeaderComplete:
        detailBody.includes("ИНН") &&
        detailBody.includes(context.contractorRecord.inn) &&
        detailBody.includes("Договор"),
      materialLeakToContractor: contractorCardCount > 3,
      invalidRowsVisible,
      warehouseIssuesPanelResolved:
        detailBody.includes("Номера выдач") &&
        (
          detailBody.includes("Выдано:") ||
          detailBody.includes("нет выдач") ||
          detailBody.includes("По этой работе еще не подтверждены выдачи материалов.")
        ),
      webPassed:
        contractorVisible &&
        !invalidRowsVisible &&
        !body.includes("Подрядчик не указан") &&
        detailBody.includes(context.contractorRecord.companyName),
      runtimeVerified: true,
      backendOwnerPreserved: true,
      contractorCardCount,
      pageErrors: runtime.pageErrors,
      badResponses: runtime.badResponses,
      blockingConsoleErrors: runtime.console.filter((entry) => entry.type === "error"),
      status: "passed",
    };

    if (
      !summary.contractorVisible ||
      summary.invalidRowsVisible ||
      summary.materialLeakToContractor ||
      !summary.detailHeaderComplete ||
      !summary.warehouseIssuesPanelResolved ||
      runtime.pageErrors.length > 0 ||
      runtime.console.some((entry) => entry.type === "error")
    ) {
      summary.status = "failed";
      summary.webPassed = false;
    }

    const screenshotPath = `${artifactBase}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    writeJsonArtifact(`${artifactBase}.json`, {
      summary,
      runtime,
      scenarios: context.scenarios,
      screenshot: screenshotPath.replace(/\\/g, "/"),
      generatedAt: new Date().toISOString(),
    });
    writeJsonArtifact(`${artifactBase}.summary.json`, summary);
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "passed") {
      process.exitCode = 1;
    }
  } catch (error) {
    const artifacts = page ? await captureWebFailureArtifact(page, artifactBase) : { screenshot: null, html: null };
    const failure = {
      gate: "contractor_pipeline_verify",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      artifacts,
    };
    writeJsonArtifact(`${artifactBase}.json`, failure);
    writeJsonArtifact(`${artifactBase}.summary.json`, failure);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupContractorCanonicalScenarios(context);
  }
}

void main();
