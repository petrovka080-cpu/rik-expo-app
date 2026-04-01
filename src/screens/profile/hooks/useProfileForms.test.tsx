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
          full_name: "Айбек",
          phone: "+996700000000",
          city: "Бишкек",
          usage_market: true,
          usage_build: false,
          bio: "bio",
          telegram: "@aibek",
          whatsapp: "+996700000000",
          position: "Снабженец",
        },
        "https://cdn/avatar.png",
      );
    });

    expect(hook.profileForm).toMatchObject({
      profileNameInput: "Айбек",
      profilePhoneInput: "+996700000000",
      profileCityInput: "Бишкек",
      profileBioInput: "bio",
      profileTelegramInput: "@aibek",
      profileWhatsappInput: "+996700000000",
      profilePositionInput: "Снабженец",
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
          name: "Цемент",
          uom: "мешок",
          qty: "10",
          price: "420",
          city: "Ош",
          kind: "material",
        },
      ]);
      hook.setEditingItem({
        id: "item-2",
        rik_code: "R2",
        name: "Песок",
        uom: "м3",
        qty: "4",
        price: "1000",
        city: "Бишкек",
        kind: "material",
      });
      hook.setCatalogSearch("цем");
      hook.setCatalogResults([
        {
          rik_code: "R1",
          name_human_ru: "Цемент",
          uom_code: "мешок",
          kind: "material",
        },
      ]);
      hook.prepareListingForm({
        profile: {
          id: "1",
          user_id: "u1",
          full_name: "Айбек",
          phone: "+996700000000",
          city: "Бишкек",
          usage_market: true,
          usage_build: true,
          whatsapp: "+996700000111",
        },
        company: {
          id: "c1",
          owner_user_id: "u1",
          name: "ОсОО GOX",
          city: "Каракол",
          phone_main: "+996555000000",
        },
        activeContext: "office",
      });
    });

    expect(hook.listingForm).toMatchObject({
      listingTitle: "",
      listingCity: "Каракол",
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
    expect(hook.catalogSearch).toBe("");
    expect(hook.catalogResults).toEqual([]);
  });
});
