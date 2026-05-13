import {
  getExplicitAiRoleSecretKeys,
  getDeveloperControlSecretKeys,
  resolveExplicitAiRoleAuthEnv,
} from "../../scripts/e2e/resolveExplicitAiRoleAuthEnv";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const REQUIRED_KEYS = [
  "E2E_DIRECTOR_EMAIL",
  "E2E_DIRECTOR_PASSWORD",
  "E2E_FOREMAN_EMAIL",
  "E2E_FOREMAN_PASSWORD",
  "E2E_BUYER_EMAIL",
  "E2E_BUYER_PASSWORD",
  "E2E_ACCOUNTANT_EMAIL",
  "E2E_ACCOUNTANT_PASSWORD",
  "E2E_CONTRACTOR_EMAIL",
  "E2E_CONTRACTOR_PASSWORD",
];

function completeEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    E2E_DIRECTOR_EMAIL: "director@example.test",
    E2E_DIRECTOR_PASSWORD: "director-secret",
    E2E_FOREMAN_EMAIL: "foreman@example.test",
    E2E_FOREMAN_PASSWORD: "foreman-secret",
    E2E_BUYER_EMAIL: "buyer@example.test",
    E2E_BUYER_PASSWORD: "buyer-secret",
    E2E_ACCOUNTANT_EMAIL: "accountant@example.test",
    E2E_ACCOUNTANT_PASSWORD: "accountant-secret",
    E2E_CONTRACTOR_EMAIL: "contractor@example.test",
    E2E_CONTRACTOR_PASSWORD: "contractor-secret",
  };
}

describe("resolveExplicitAiRoleAuthEnv", () => {
  const source = read("scripts/e2e/resolveExplicitAiRoleAuthEnv.ts");

  it("resolves all five roles only from explicit env", () => {
    const result = resolveExplicitAiRoleAuthEnv(completeEnv());

    expect(result.source).toBe("explicit_env");
    expect(result.greenEligible).toBe(true);
    expect(result.allRolesResolved).toBe(true);
    expect(result.blockedStatus).toBeNull();
    expect(result.rolesResolved).toEqual(["director", "foreman", "buyer", "accountant", "contractor"]);
    expect(Object.keys(result.env ?? {}).sort()).toEqual(
      [...new Set([...REQUIRED_KEYS, ...getDeveloperControlSecretKeys()])].sort(),
    );
  });

  it("blocks green if any explicit role secret is missing", () => {
    const env = completeEnv();
    delete env.E2E_CONTRACTOR_PASSWORD;
    const result = resolveExplicitAiRoleAuthEnv(env);

    expect(result.source).toBe("missing");
    expect(result.greenEligible).toBe(false);
    expect(result.allRolesResolved).toBe(false);
    expect(result.blockedStatus).toBe("BLOCKED_NO_E2E_ROLE_SECRETS");
    expect(result.env).toBeNull();
    expect(result.missingKeys).toEqual(["E2E_CONTRACTOR_PASSWORD"]);
  });

  it("does not import Supabase or perform auth discovery", () => {
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toContain("createClient");
    expect(source).not.toContain("auth.admin");
    expect(source).not.toContain("listUsers");
    expect(source).not.toContain("signInWithPassword");
    expect(source).not.toContain("SERVICE_ROLE");
    expect(source).not.toContain("service_role");
  });

  it("declares the exact required explicit secret keys", () => {
    expect([...getExplicitAiRoleSecretKeys()].sort()).toEqual([...REQUIRED_KEYS].sort());
  });
});
