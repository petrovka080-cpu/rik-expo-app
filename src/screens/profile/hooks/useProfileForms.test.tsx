import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useListingForm } from "./useListingForm";
import { useProfileForm } from "./useProfileForm";

describe("profile form hooks", () => {
  it("hydrates profile form and resets avatar draft without changing owner semantics", () => {
    let hook!: ReturnType<typeof useProfileForm>;

    function Harness() {
      hook = useProfileForm();
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      hook.hydrateProfileForm(
        {
          id: "1",
          user_id: "u1",
          full_name: "\u0410\u0439\u0431\u0435\u043a",
          phone: "+996700000000",
          city: "\u0411\u0438\u0448\u043a\u0435\u043a",
          usage_market: true,
          usage_build: false,
          bio: "bio",
          telegram: "@aibek",
          whatsapp: "+996700000000",
          position: "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
        },
        "https://cdn/avatar.png",
      );
    });

    expect(hook.profileForm).toMatchObject({
      profileNameInput: "\u0410\u0439\u0431\u0435\u043a",
      profilePhoneInput: "+996700000000",
      profileCityInput: "\u0411\u0438\u0448\u043a\u0435\u043a",
      profileBioInput: "bio",
      profileTelegramInput: "@aibek",
      profileWhatsappInput: "+996700000000",
      profilePositionInput: "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
    });
    expect(hook.profileAvatarDraft).toBe("https://cdn/avatar.png");

    act(() => {
      hook.setProfileAvatarDraft("draft://next");
      hook.resetProfileAvatarDraft("https://cdn/avatar.png");
    });
    expect(hook.profileAvatarDraft).toBe("https://cdn/avatar.png");
  });

  it("prepares listing form with active-context defaults and clears listing-local tail", () => {
    let hook!: ReturnType<typeof useListingForm>;

    function Harness() {
      hook = useListingForm();
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      hook.setListingCartItems([
        {
          id: "item-1",
          rik_code: "R1",
          name: "\u0426\u0435\u043c\u0435\u043d\u0442",
          uom: "\u043c\u0435\u0448\u043e\u043a",
          qty: "10",
          price: "420",
          city: "\u041e\u0448",
          kind: "material",
        },
      ]);
      hook.setEditingItem({
        id: "item-2",
        rik_code: "R2",
        name: "\u041f\u0435\u0441\u043e\u043a",
        uom: "\u043c3",
        qty: "4",
        price: "1000",
        city: "\u0411\u0438\u0448\u043a\u0435\u043a",
        kind: "material",
      });
      hook.setCatalogResults([
        {
          rik_code: "R1",
          name_human_ru: "\u0426\u0435\u043c\u0435\u043d\u0442",
          uom_code: "\u043c\u0435\u0448\u043e\u043a",
          kind: "material",
        },
      ]);
      hook.prepareListingForm({
        profile: {
          id: "1",
          user_id: "u1",
          full_name: "\u0410\u0439\u0431\u0435\u043a",
          phone: "+996700000000",
          city: "\u0411\u0438\u0448\u043a\u0435\u043a",
          usage_market: true,
          usage_build: true,
          whatsapp: "+996700000111",
        },
        company: {
          id: "c1",
          owner_user_id: "u1",
          name: "\u041e\u0441\u041e\u041e GOX",
          city: "\u041a\u0430\u0440\u0430\u043a\u043e\u043b",
          phone_main: "+996555000000",
        },
        activeContext: "office",
      });
    });

    expect(hook.listingForm).toMatchObject({
      listingTitle: "",
      listingCity: "\u041a\u0430\u0440\u0430\u043a\u043e\u043b",
      listingPrice: "",
      listingUom: "",
      listingDescription: "",
      listingPhone: "+996555000000",
      listingWhatsapp: "+996700000111",
      listingEmail: "",
      listingKind: null,
      listingRikCode: null,
    });
    expect(hook.listingCartItems).toEqual([]);
    expect(hook.editingItem).toBeNull();
    expect(hook.catalogResults).toEqual([]);
  });
});
