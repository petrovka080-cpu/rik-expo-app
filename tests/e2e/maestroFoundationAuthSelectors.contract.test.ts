import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const foundationAndInfraFlows = [
  "maestro/flows/infra-launch.yaml",
  "maestro/flows/foundation/launch-and-login-screen.yaml",
  "maestro/flows/foundation/relaunch-stability.yaml",
  "maestro/flows/foundation/register-public-path.yaml",
  "maestro/flows/foundation/login-form-basic-interaction.yaml",
] as const;

describe("Maestro foundation auth selectors", () => {
  it("uses stable auth testIDs instead of Cyrillic login text selectors", () => {
    for (const flowPath of foundationAndInfraFlows) {
      const source = read(flowPath);
      expect(source).toContain('id: "auth.login.screen"');
      expect(source).not.toContain('visible: "Войти в GOX"');
      expect(source).not.toContain('assertVisible: "Войти в GOX"');
      expect(source).not.toContain('tapOn: "Зарегистрироваться"');
    }
  });

  it("keeps the auth screens exposing the stable selectors used by Maestro", () => {
    const loginSource = read("app/auth/login.tsx");
    const registerSource = read("app/auth/register.tsx");

    for (const testID of [
      "auth.login.screen",
      "auth.login.title",
      "auth.login.register",
      "auth.login.email",
      "auth.login.password",
    ]) {
      expect(loginSource).toContain(testID);
    }

    for (const testID of [
      "auth.register.screen",
      "auth.register.submit",
      "auth.register.login",
    ]) {
      expect(registerSource).toContain(testID);
    }
  });
});
