describe("officeInviteShare", () => {
  const nativeShare = jest.fn();
  const clipboardSetStringAsync = jest.fn();

  const loadModule = (platform: "ios" | "android" | "web") => {
    jest.resetModules();

    jest.doMock("react-native", () => ({
      Platform: { OS: platform },
      Share: {
        share: (...args: unknown[]) => nativeShare(...args),
      },
    }));

    jest.doMock("expo-clipboard", () => ({
      setStringAsync: (...args: [string]) => clipboardSetStringAsync(...args),
    }));

    return require("./officeInviteShare") as typeof import("./officeInviteShare");
  };

  beforeEach(() => {
    nativeShare.mockReset();
    clipboardSetStringAsync.mockReset();
  });

  it("builds a human message with company, role, code and activation hint", () => {
    const mod = loadModule("ios");
    const message = mod.buildOfficeInviteShareMessage({
      companyName: "ACME Build",
      role: "foreman",
      inviteCode: "GOX-123456",
    });

    expect(message).toContain("ACME Build");
    expect(message).toContain("Прораб");
    expect(message).toContain("GOX-123456");
    expect(message).toContain("GOX Build");
  });

  it("builds a desktop/web handoff payload with explicit action urls", () => {
    const mod = loadModule("web");
    const handoff = mod.buildOfficeInviteHandoff({
      companyName: "ACME Build",
      role: "foreman",
      inviteCode: "GOX-123456",
    });

    expect(handoff.companyName).toBe("ACME Build");
    expect(handoff.roleLabel).toBe("Прораб");
    expect(handoff.inviteCode).toBe("GOX-123456");
    expect(handoff.instruction).toContain("GOX Build");
    expect(decodeURIComponent(handoff.whatsappUrl)).toContain("ACME Build");
    expect(decodeURIComponent(handoff.telegramUrl)).toContain("GOX-123456");
    expect(decodeURIComponent(handoff.emailUrl)).toContain(
      "Приглашение в ACME Build",
    );
  });

  it("uses the native React Native share sheet on iOS/Android", async () => {
    nativeShare.mockResolvedValue(undefined);
    const mod = loadModule("ios");

    await expect(
      mod.shareOfficeInviteCode({
        companyName: "ACME Build",
        role: "foreman",
        inviteCode: "GOX-123456",
      }),
    ).resolves.toEqual({
      kind: "native-share",
      message: expect.stringContaining("GOX-123456"),
    });

    expect(nativeShare).toHaveBeenCalledWith({
      message: expect.stringContaining("Прораб"),
    });
  });

  it("returns an explicit handoff payload on web instead of browser share", async () => {
    const mod = loadModule("web");

    await expect(
      mod.shareOfficeInviteCode({
        companyName: "ACME Build",
        role: "foreman",
        inviteCode: "GOX-123456",
      }),
    ).resolves.toEqual({
      kind: "web-handoff",
      handoff: expect.objectContaining({
        companyName: "ACME Build",
        roleLabel: "Прораб",
        inviteCode: "GOX-123456",
      }),
    });

    expect(nativeShare).not.toHaveBeenCalled();
  });

  it("copies invite text through the clipboard helper", async () => {
    clipboardSetStringAsync.mockResolvedValue(undefined);
    const mod = loadModule("web");

    await mod.copyOfficeInviteText("GOX-123456");

    expect(clipboardSetStringAsync).toHaveBeenCalledWith("GOX-123456");
  });
});
