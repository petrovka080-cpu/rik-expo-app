import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("entry/bootstrap contract", () => {
  it("routes every post-auth entry through the profile access hub", () => {
    const rootLayout = readProjectFile("app/_layout.tsx");
    // AUTH-LIFECYCLE: POST_AUTH_ENTRY_ROUTE moved from _layout.tsx to useAuthGuard.ts
    const authGuard = readProjectFile("src/lib/auth/useAuthGuard.ts");
    const indexScreen = readProjectFile("app/index.tsx");
    const loginScreen = readProjectFile("app/auth/login.tsx");
    const registerScreen = readProjectFile("app/auth/register.tsx");

    // Root layout delegates to useAuthGuard which owns POST_AUTH_ENTRY_ROUTE
    expect(rootLayout).toContain("useAuthGuard");
    expect(authGuard).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(authGuard).not.toContain('router.replace("/")');
    expect(rootLayout).not.toContain('router.replace("/")');

    expect(indexScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(indexScreen).not.toContain("resolveCurrentSessionRole");
    expect(indexScreen).not.toContain("postAuthPathForRole");

    expect(loginScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(loginScreen).not.toContain("resolveCurrentSessionRole");
    expect(loginScreen).not.toContain("postAuthPathForRole");

    expect(registerScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(registerScreen).not.toContain("resolveCurrentSessionRole");
    expect(registerScreen).not.toContain("postAuthPathForRole");
  });

  it("keeps root layout bootstrap setup failures observable", () => {
    const rootLayout = readProjectFile("app/_layout.tsx");
    // AUTH-LIFECYCLE: role_profile_warm_failed moved to useAuthLifecycle.ts
    const authLifecycle = readProjectFile("src/lib/auth/useAuthLifecycle.ts");

    expect(rootLayout).toContain("applyRootLayoutWebContainerStyle");
    expect(rootLayout).toContain("web_root_container_style_failed");
    expect(authLifecycle).toContain("role_profile_warm_failed");
    expect(rootLayout).not.toContain("catch {}");
    expect(authLifecycle).not.toContain("catch {}");
  });

  it("keeps entry copy readable and aligned with the unified access hub", () => {
    const indexScreen = readProjectFile("app/index.tsx");
    const loginScreen = readProjectFile("app/auth/login.tsx");
    const registerScreen = readProjectFile("app/auth/register.tsx");
    const profileScreen = readProjectFile(
      "src/screens/profile/ProfileContent.tsx",
    );
    const profileSections = readProjectFile(
      "src/screens/profile/components/ProfileMainSections.tsx",
    );

    expect(indexScreen).toContain("Собираем ваш стартовый экран...");
    expect(indexScreen).toContain("Открываем GOX...");

    expect(loginScreen).toContain("Войти в GOX");
    expect(loginScreen).toContain("Зарегистрироваться");
    expect(loginScreen).toContain("Забыли пароль?");

    expect(registerScreen).toContain("Создать аккаунт");
    expect(registerScreen).toContain(
      "После входа вы попадёте в экран доступов и следующих шагов.",
    );

    expect(profileScreen).toContain("Аккаунт GOX");
    expect(profileScreen).toContain("Загружаем профиль...");

    expect(profileSections).toContain("Что дальше");
    expect(profileSections).toContain("Создать компанию");
    expect(profileSections).toContain("Открыть Office и компанию");
  });
});
