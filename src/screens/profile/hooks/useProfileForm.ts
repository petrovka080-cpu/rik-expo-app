import { useState } from "react";

import type { ProfileFormState, UserProfile } from "../profile.types";

const EMPTY_PROFILE_FORM: ProfileFormState = {
  profileNameInput: "",
  profilePhoneInput: "",
  profileCityInput: "",
  profileBioInput: "",
  profileTelegramInput: "",
  profileWhatsappInput: "",
  profilePositionInput: "",
};

export function useProfileForm() {
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [profileAvatarDraft, setProfileAvatarDraft] = useState<string | null>(null);

  const setProfileNameInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profileNameInput: value }));
  };
  const setProfilePhoneInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profilePhoneInput: value }));
  };
  const setProfileCityInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profileCityInput: value }));
  };
  const setProfileBioInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profileBioInput: value }));
  };
  const setProfileTelegramInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profileTelegramInput: value }));
  };
  const setProfileWhatsappInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profileWhatsappInput: value }));
  };
  const setProfilePositionInput = (value: string) => {
    setProfileForm((prev) => ({ ...prev, profilePositionInput: value }));
  };

  const hydrateProfileForm = (profile: UserProfile, avatarUrl: string | null) => {
    setProfileForm({
      profileNameInput: profile.full_name || "",
      profilePhoneInput: profile.phone || "",
      profileCityInput: profile.city || "",
      profileBioInput: profile.bio || "",
      profileTelegramInput: profile.telegram || "",
      profileWhatsappInput: profile.whatsapp || "",
      profilePositionInput: profile.position || "",
    });
    setProfileAvatarDraft(avatarUrl);
  };

  const resetProfileAvatarDraft = (avatarUrl: string | null) => {
    setProfileAvatarDraft(avatarUrl);
  };

  return {
    profileForm,
    profileAvatarDraft,
    setProfileAvatarDraft,
    hydrateProfileForm,
    resetProfileAvatarDraft,
    profileNameInput: profileForm.profileNameInput,
    setProfileNameInput,
    profilePhoneInput: profileForm.profilePhoneInput,
    setProfilePhoneInput,
    profileCityInput: profileForm.profileCityInput,
    setProfileCityInput,
    profileBioInput: profileForm.profileBioInput,
    setProfileBioInput,
    profileTelegramInput: profileForm.profileTelegramInput,
    setProfileTelegramInput,
    profileWhatsappInput: profileForm.profileWhatsappInput,
    setProfileWhatsappInput,
    profilePositionInput: profileForm.profilePositionInput,
    setProfilePositionInput,
  };
}
