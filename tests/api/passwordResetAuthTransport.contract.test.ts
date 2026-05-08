import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("password reset auth transport boundary", () => {
  it("keeps resetPasswordForEmail behind the auth transport boundary", () => {
    const routeSource = read("app/auth/reset.tsx");
    const transportSource = read("src/lib/auth/passwordReset.transport.ts");

    expect(routeSource).toContain("../../src/lib/auth/passwordReset.transport");
    expect(routeSource).toContain("requestPasswordResetEmail");
    expect(routeSource).not.toContain("supabase.auth.resetPasswordForEmail");
    expect(routeSource).not.toContain("catch (e: any)");
    expect(transportSource).toContain("supabase.auth.resetPasswordForEmail");
    expect(transportSource).toContain("PasswordResetEmailParams");
  });

  it("preserves the route-level redirect option and fallback error ownership", () => {
    const routeSource = read("app/auth/reset.tsx");

    expect(routeSource).toContain("redirectTo: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined");
    expect(routeSource).toContain("if (resetError) throw resetError");
    expect(routeSource).toContain("setMessage(successMessage)");
    expect(routeSource).toContain("catch (error: unknown)");
    expect(routeSource).toContain("error instanceof Error ? error.message : fallbackErrorMessage");
  });
});
