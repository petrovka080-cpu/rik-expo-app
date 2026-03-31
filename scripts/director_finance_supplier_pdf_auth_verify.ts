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
const functionName = "director-finance-supplier-summary-pdf";
const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("director-finance-supplier-pdf-auth-verify");
const smokePath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-auth-smoke.json");
const proofPath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-auth-proof.md");

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
        "x-client-info": "director-finance-supplier-pdf-auth-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session?.access_token) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session.access_token;
}

async function invokeSupplierPdf(accessToken: string): Promise<InvokeResult> {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-client-info": "director-finance-supplier-pdf-auth-verify",
    },
    body: JSON.stringify({
      version: "v1",
      supplier: "Runtime Smoke Supplier",
      kindName: null,
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      dueDaysDefault: 7,
      criticalDays: 14,
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
  let positiveUser: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let negativeUser: Awaited<ReturnType<typeof createTempUser>> | null = null;

  try {
    positiveUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director Supplier PDF Auth Positive",
      emailPrefix: "director-supplier-pdf-auth-positive",
    });
    negativeUser = await createTempUser(admin, {
      role: "",
      fullName: "Director Supplier PDF Auth Negative",
      emailPrefix: "director-supplier-pdf-auth-negative",
      profile: {
        role: "buyer",
      },
      userMetadata: {
        role: "director",
      },
      appMetadata: {},
    });

    const [positiveToken, negativeToken] = await Promise.all([
      signIn(positiveUser.email, positiveUser.password),
      signIn(negativeUser.email, negativeUser.password),
    ]);

    const [positiveResult, negativeResult] = await Promise.all([
      invokeSupplierPdf(positiveToken),
      invokeSupplierPdf(negativeToken),
    ]);

    const supplierPdfAuthBoundaryFixed =
      positiveResult.status === 200 &&
      positiveResult.renderBranch === "backend_supplier_summary_v1" &&
      Boolean(positiveResult.signedUrl) &&
      negativeResult.status === 403 &&
      negativeResult.errorCode === "auth_failed";

    const smoke = {
      status: supplierPdfAuthBoundaryFixed ? "GREEN" : "NOT_GREEN",
      supplierPdfAuthBoundaryFixed,
      supplierPdfFunctionPostStatus: positiveResult.status,
      supplierPdfSignedUrlReturned: Boolean(positiveResult.signedUrl),
      functionName,
      functionUrl,
      positiveCase: {
        userId: positiveUser.id,
        email: positiveUser.email,
        signedAppRole: "director",
        result: positiveResult,
      },
      negativeCase: {
        userId: negativeUser.id,
        email: negativeUser.email,
        userMetadataRole: "director",
        signedAppRole: null,
        rpcRoleExpectation: "not_director",
        result: negativeResult,
      },
    };

    writeJson(smokePath, smoke);
    writeText(
      proofPath,
      [
        "# Director Finance Supplier PDF Auth Proof",
        "",
        "## What was already fixed",
        "- Exact old 403 root cause lived inside the function auth guard, not in missing JWT and not in CORS.",
        `- Canonical auth boundary remains in \`src/lib/pdf/directorPdfAuth.ts\` and \`supabase/functions/${functionName}/index.ts\`.`,
        "- Auth still requires an authenticated user and still refuses `user_metadata` as a trusted role source.",
        "",
        "## Runtime proof",
        `- Remote function URL: \`${functionUrl}\``,
        `- Positive signed app role case: HTTP ${positiveResult.status}, renderBranch=${positiveResult.renderBranch ?? "<empty>"}, signedUrl=${positiveResult.signedUrl ? "present" : "missing"}`,
        `- Negative user_metadata-only case: HTTP ${negativeResult.status}, errorCode=${negativeResult.errorCode ?? "<empty>"}`,
        "",
        "## Verdict",
        `- supplierPdfAuthBoundaryFixed = ${supplierPdfAuthBoundaryFixed}`,
        `- supplierPdfFunctionPostStatus = ${positiveResult.status}`,
        `- supplierPdfSignedUrlReturned = ${Boolean(positiveResult.signedUrl)}`,
        `- Final status: ${supplierPdfAuthBoundaryFixed ? "GREEN" : "NOT_GREEN"}`,
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(smoke, null, 2));
    if (!supplierPdfAuthBoundaryFixed) {
      process.exitCode = 1;
    }
  } finally {
    await cleanupTempUser(admin, positiveUser);
    await cleanupTempUser(admin, negativeUser);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  const failure = {
    status: "NOT_GREEN",
    supplierPdfAuthBoundaryFixed: false,
    supplierPdfFunctionPostStatus: null,
    supplierPdfSignedUrlReturned: false,
    functionName,
    functionUrl,
    verifierError: message,
  };
  writeJson(smokePath, failure);
  writeText(
    proofPath,
    `# Director Finance Supplier PDF Auth Proof\n\n## Final status\n- NOT_GREEN\n\n## Verifier error\n- ${message}\n`,
  );
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
