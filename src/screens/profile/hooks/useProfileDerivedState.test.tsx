import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useProfileDerivedState } from "./useProfileDerivedState";

type DerivedSnapshot = ReturnType<typeof useProfileDerivedState> | null;

function DerivedHarness(props: { onSnapshot: (value: DerivedSnapshot) => void }) {
  const derived = useProfileDerivedState({
    profile: {
      id: "profile-1",
      user_id: "user-1",
      full_name: "Айбек",
      phone: "+996700000000",
      city: "Бишкек",
      usage_market: true,
      usage_build: true,
      bio: "bio",
      telegram: "@aybek",
      whatsapp: "+996700000000",
      position: "owner",
    },
    company: {
      id: "company-1",
      owner_user_id: "user-1",
      name: "ACME Build",
      city: "Бишкек",
      address: "ул. Токтогула",
      phone_main: "+996700000000",
      inn: "123",
      bank_details: "bank",
    },
    profileRole: "director",
    profileEmail: "aybek@example.com",
    myListings: [
      {
        id: "listing-1",
        title: "Бетон",
        kind: "material",
        city: "Бишкек",
        price: 100,
        status: "active",
      },
    ],
    modeMarket: true,
    modeBuild: true,
  });

  props.onSnapshot(derived);
  return null;
}

describe("useProfileDerivedState", () => {
  it("derives stable profile completion, company labels and assistant prompt", () => {
    let snapshot: DerivedSnapshot = null;

    act(() => {
      TestRenderer.create(<DerivedHarness onSnapshot={(value) => (snapshot = value)} />);
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.profileName).toBe("Айбек");
    expect(snapshot?.roleLabel).toBeTruthy();
    expect(snapshot?.companyCardTitle).toContain("ACME");
    expect(snapshot?.requisitesVisible).toBe(true);
    expect(snapshot?.profileCompletionPercent).toBeGreaterThan(0);
    expect(snapshot?.companyCompletionPercent).toBeGreaterThan(0);
    expect(snapshot?.assistantPrompt).toContain("ACME");
  });
});
