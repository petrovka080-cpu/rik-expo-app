import * as Clipboard from "expo-clipboard";
import { Platform, Share } from "react-native";

import { getProfileRoleLabel } from "../profile/profile.helpers";

type OfficeInviteShareParams = {
  companyName: string;
  role: string;
  inviteCode: string;
};

export type OfficeInviteHandoff = {
  companyName: string;
  roleLabel: string;
  inviteCode: string;
  instruction: string;
  message: string;
  whatsappUrl: string;
  telegramUrl: string;
  emailUrl: string;
};

export type OfficeInviteShareResult =
  | { kind: "native-share"; message: string }
  | { kind: "web-handoff"; handoff: OfficeInviteHandoff };

const buildInviteInstruction = (inviteCode: string) =>
  `Установите приложение GOX Build и активируйте код: ${inviteCode}`;

export const buildOfficeInviteShareMessage = (
  params: OfficeInviteShareParams,
) => {
  const roleLabel = getProfileRoleLabel(params.role);
  return [
    `Вас пригласили в компанию ${params.companyName} на роль ${roleLabel}.`,
    `Код активации: ${params.inviteCode}`,
    buildInviteInstruction(params.inviteCode),
  ].join("\n");
};

export const buildOfficeInviteHandoff = (
  params: OfficeInviteShareParams,
): OfficeInviteHandoff => {
  const roleLabel = getProfileRoleLabel(params.role);
  const instruction = buildInviteInstruction(params.inviteCode);
  const message = buildOfficeInviteShareMessage(params);
  const encodedMessage = encodeURIComponent(message);
  const encodedSubject = encodeURIComponent(
    `Приглашение в ${params.companyName}`,
  );

  return {
    companyName: params.companyName,
    roleLabel,
    inviteCode: params.inviteCode,
    instruction,
    message,
    whatsappUrl: `https://wa.me/?text=${encodedMessage}`,
    telegramUrl: `https://t.me/share/url?url=&text=${encodedMessage}`,
    emailUrl: `mailto:?subject=${encodedSubject}&body=${encodedMessage}`,
  };
};

export async function copyOfficeInviteText(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}

export async function shareOfficeInviteCode(
  params: OfficeInviteShareParams,
): Promise<OfficeInviteShareResult> {
  const handoff = buildOfficeInviteHandoff(params);

  if (Platform.OS === "web") {
    return { kind: "web-handoff", handoff };
  }

  await Share.share({ message: handoff.message });
  return { kind: "native-share", message: handoff.message };
}
