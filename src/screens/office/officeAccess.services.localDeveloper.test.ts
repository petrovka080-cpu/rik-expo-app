import { loadDeveloperOverrideContext } from "../../lib/developerOverride";
import {
  loadCurrentAuthUser,
  loadProfileScreenData,
} from "../profile/profile.services";
import { loadOfficeAccessScreenData } from "./officeAccess.services";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {},
}));

jest.mock("../../lib/developerOverride", () => ({
  loadDeveloperOverrideContext: jest.fn(),
}));

jest.mock("../profile/profile.services", () => ({
  loadCurrentAuthUser: jest.fn(),
  loadProfileScreenData: jest.fn(),
}));

describe("loadOfficeAccessScreenData local developer UI flag", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("does not bypass the authenticated profile boundary", async () => {
    jest
      .mocked(loadCurrentAuthUser)
      .mockRejectedValue(new Error("authenticated session required"));
    jest
      .mocked(loadProfileScreenData)
      .mockRejectedValue(new Error("authenticated profile required"));

    await expect(loadOfficeAccessScreenData()).rejects.toThrow(
      "authenticated session required",
    );
    expect(loadCurrentAuthUser).toHaveBeenCalledTimes(1);
    expect(loadProfileScreenData).toHaveBeenCalledTimes(1);
    expect(loadDeveloperOverrideContext).not.toHaveBeenCalled();
  });
});
