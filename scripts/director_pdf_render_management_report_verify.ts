import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const functionName = "director-pdf-render";
const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("director-pdf-render-management-report-verify");
const smokePath = path.join(projectRoot, "artifacts/director-pdf-render-management-report-smoke.json");
const proofPath = path.join(projectRoot, "artifacts/director-pdf-render-management-report-proof.md");

type InvokeResult = {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  payload: unknown;
  signedUrl: string | null;
  renderBranch: string | null;
  errorCode: string | null;
};

function writeJson(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(fullPath: string, payload: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeaders(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[String(key || "").toLowerCase()] = String(value ?? "");
  });
  return result;
}

async function signIn(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "director-pdf-render-management-report-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session?.access_token) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session.access_token;
}

function buildSmokeHtml() {
  return [
    "<!doctype html>",
    '<html lang="ru">',
    "<head>",
    '<meta charset="utf-8" />',
    "<style>",
    "@page { size: A4; margin: 14mm; }",
    "body { font-family: Arial, sans-serif; color: #111827; }",
    "h1 { font-size: 24px; margin: 0 0 12px; }",
    "p { font-size: 14px; line-height: 1.45; margin: 0 0 8px; }",
    ".meta { color: #4b5563; font-size: 12px; }",
    "</style>",
    "</head>",
    "<body>",
    "<h1>Director Management Report Runtime Smoke</h1>",
    "<p>Exact deployed director-pdf-render path verification.</p>",
    `<p class="meta">Generated at ${new Date().toISOString()}</p>`,
    "</body>",
    "</html>",
  ].join("");
}

async function invokeManagementReport(accessToken: string): Promise<InvokeResult> {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-client-info": "director-pdf-render-management-report-verify",
    },
    body: JSON.stringify({
      version: "v1",
      documentKind: "management_report",
      documentType: "director_report",
      html: buildSmokeHtml(),
      source: "runtime:director_management_report_smoke",
      fileName: "director_management_report_runtime_smoke.pdf",
      branchDiagnostics: {
        sourceBranch: "runtime_smoke",
        sourceFallbackReason: null,
      },
    }),
  });

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  return {
    status: response.status,
    ok: response.ok,
    headers: normalizeHeaders(response.headers),
    payload,
    signedUrl: text(record?.signedUrl) || null,
    renderBranch: text(record?.renderBranch) || null,
    errorCode: text(record?.errorCode) || null,
  };
}

async function main() {
  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;

  try {
    user = await createTempUser(admin, {
      role: "director",
      fullName: "Director PDF Render Management Report Verify",
      emailPrefix: "director-pdf-render-management-report",
    });

    const accessToken = await signIn(user.email, user.password);
    const result = await invokeManagementReport(accessToken);

    const status =
      result.status === 200 &&
      result.renderBranch === "edge_render_v1" &&
      Boolean(result.signedUrl) &&
      !text((result.payload as Record<string, unknown> | null)?.error).includes("reader is not async iterable")
        ? "GREEN"
        : "NOT_GREEN";

    const smoke = {
      status,
      functionName,
      functionUrl,
      documentKind: "management_report",
      managementReportFunctionPostStatus: result.status,
      managementReportSignedUrlReturned: Boolean(result.signedUrl),
      readerAsyncIterableErrorCleared:
        !text((result.payload as Record<string, unknown> | null)?.error).includes("reader is not async iterable"),
      result,
      tempUser: {
        id: user.id,
        email: user.email,
      },
    };

    writeJson(smokePath, smoke);
    writeText(
      proofPath,
      [
        "# Director PDF Render Management Report Proof",
        "",
        "## Exact blocker baseline",
        "- Current failing function was `director-pdf-render`.",
        "- Current runtime error on the broken path was `reader is not async iterable`.",
        "- This verifier checks only the deployed `management_report` function boundary after the narrow fix.",
        "",
        "## Runtime proof",
        `- Function URL: \`${functionUrl}\``,
        `- HTTP status: ${result.status}`,
        `- renderBranch: ${result.renderBranch ?? "<empty>"}`,
        `- signedUrl returned: ${Boolean(result.signedUrl)}`,
        `- errorCode: ${result.errorCode ?? "<empty>"}`,
        `- reader is not async iterable: ${text((result.payload as Record<string, unknown> | null)?.error).includes("reader is not async iterable")}`,
        "",
        "## Verdict",
        `- managementReportFunctionPostStatus = ${result.status}`,
        `- managementReportSignedUrlReturned = ${Boolean(result.signedUrl)}`,
        `- Final status: ${status}`,
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(smoke, null, 2));
    if (status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    await cleanupTempUser(admin, user);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  const failure = {
    status: "NOT_GREEN",
    functionName,
    functionUrl,
    documentKind: "management_report",
    managementReportFunctionPostStatus: null,
    managementReportSignedUrlReturned: false,
    verifierError: message,
  };
  writeJson(smokePath, failure);
  writeText(
    proofPath,
    `# Director PDF Render Management Report Proof\n\n## Final status\n- NOT_GREEN\n\n## Verifier error\n- ${message}\n`,
  );
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
