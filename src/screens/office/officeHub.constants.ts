/**
 * Constants, types, and helper functions extracted from OfficeHubScreen.tsx.
 * Behavior-preserving mechanical extraction (Wave F).
 */
import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { OfficePostReturnProbe } from "../../lib/navigation/officeReentryBreadcrumbs";

export type SectionKey = "members" | "invites" | "company";

export type PostReturnSectionKey =
  | "summary"
  | "directions"
  | "company_details"
  | "invites"
  | "members"
  | "company_create"
  | "rules";

export type CompanyPostReturnSectionKey = Extract<
  PostReturnSectionKey,
  "summary" | "directions" | "company_details" | "invites" | "members"
>;

export type InviteFormDraft = {
  name: string;
  phone: string;
  email: string;
  comment: string;
};

export type LoadScreenMode = "initial" | "refresh" | "focus_refresh";

export const SECTION_RENDER_PROBES = [
  "header_meta",
  "summary",
  "directions",
  "company_details",
  "invites",
  "members",
] as const satisfies readonly OfficePostReturnProbe[];

export const EMPTY_DATA: OfficeAccessScreenData = {
  currentUserId: "",
  profile: {
    id: "",
    user_id: "",
    full_name: null,
    phone: null,
    city: null,
    usage_market: true,
    usage_build: false,
  },
  profileEmail: null,
  profileRole: null,
  company: null,
  companyAccessRole: null,
  developerOverride: null,
  accessSourceSnapshot: {
    userId: null,
    authRole: null,
    resolvedRole: null,
    usageMarket: true,
    usageBuild: false,
    ownedCompanyId: null,
    companyMemberships: [],
    listingsCount: 0,
  },
  members: [],
  invites: [],
};

export const COPY_BASE = {
  title: "Office",
  loadingSubtitle: "Готовим director-owned Office flow.",
  loading: "Загружаем Office...",
  loadError: "Не удалось открыть Office.",
  noValue: "Не указано",
  noRole: "Роль не назначена",
  companyCreated:
    "Компания создана. Office открыт в директорском режиме управления.",
  companyError: "Не удалось создать компанию.",
  inviteShared:
    "Код создан и отправлен через окно шаринга. Ожидающее приглашение уже в списке ниже.",
  inviteHandoffReady:
    "Код создан и скопирован. Отправьте его сотруднику вручную из буфера обмена.",
  inviteManual:
    "Код создан. Если отправка не открылась, возьмите код из списка приглашений ниже и отправьте сотруднику вручную.",
  inviteError: "Не удалось создать приглашение.",
  inviteShareError:
    "Код создан, но открыть окно отправки не удалось. Используйте код из списка приглашений ниже.",
  roleAssignError: "Не удалось назначить роль.",
  summaryTitle: "Компания",
  summaryFallback: "Компания не подключена",
  summaryRole: "Моя роль",
  summaryAccess: "Статус доступа",
  accessReady: "Office открыт",
  accessPending: "Ждет рабочую роль",
  accessClosed: "Office не открыт",
  directionsTitle: "Управляемые направления",
  directionsLead:
    "Откройте нужный раздел для работы или добавьте сотрудника сразу через +.",
  noDirections:
    "Рабочие направления появятся после подтвержденной office-роли.",
  companyCreateTitle: "Создать компанию",
  companyCreateLead:
    "После создания вы сразу входите как директор и получаете все управляемые направления.",
  companyLead: "Карточка компании и объекта, заполненная при создании Office.",
  companyDetailsTitle: "Реквизиты компании",
  membersTitle: "Сотрудники",
  membersLead: "Подтвержденные сотрудники и их текущие роли.",
  membersLeadWithInvites:
    "Подтвержденные сотрудники и их текущие роли. Ожидают активации:",
  invitesTitle: "Приглашения",
  invitesLead:
    "Коды, созданные через + в направлениях, появляются здесь до активации сотрудника.",
  invitesManageHint:
    "Создавать приглашения может владелец компании или директор.",
  rulesTitle: "Правила доступа",
  inviteModalTitle: "Добавить сотрудника",
  inviteModalLead:
    "Роль уже зафиксирована контекстом направления. После создания кода сразу откроется окно отправки.",
  companyCta: "Создать компанию",
  inviteCta: "Создать код",
  cancel: "Отмена",
  noMembers: "Подтвержденных сотрудников пока нет.",
  noInvites: "Ожидающих приглашений пока нет.",
  summaryEdit: "Редактировать компанию",
  memberActiveStatus: "active",
} as const;

export const COPY = {
  ...COPY_BASE,
  inviteShared:
    "Код создан и отправлен через системное окно. Ожидающее приглашение уже в списке ниже.",
  inviteHandoffReady:
    "Код создан. Выберите ниже, как отправить приглашение сотруднику.",
  inviteManual:
    "Код создан. Если отправка не открылась, возьмите код из списка приглашений ниже и отправьте сотруднику вручную.",
  inviteError: "Не удалось создать приглашение.",
  inviteShareError:
    "Код создан, но открыть окно отправки не удалось. Используйте код из списка приглашений ниже.",
  inviteCopyCode: "Скопировать код",
  inviteCopyMessage: "Скопировать полное приглашение",
  inviteOpenWhatsapp: "Открыть WhatsApp Web",
  inviteOpenTelegram: "Открыть Telegram Web",
  inviteOpenEmail: "Открыть email compose",
  inviteCodeCopied: "Код скопирован.",
  inviteMessageCopied: "Полное приглашение скопировано.",
  inviteCopyError: "Не удалось скопировать приглашение.",
  inviteOpenError: "Не удалось открыть канал отправки.",
  invitesLead:
    "Коды, созданные через + в направлениях, появляются здесь до активации сотрудника.",
  invitesManageHint:
    "Создавать приглашения может владелец компании или директор.",
  inviteHandoffTitle: "Код создан",
  inviteHandoffLead:
    "На web/desktop invite не прячется в системном share. Скопируйте код или откройте нужный канал отправки.",
  inviteHandoffInstruction: "Инструкция",
  inviteModalLead:
    "Роль уже зафиксирована контекстом направления. После создания кода откроется нужный handoff для отправки.",
} as const;

export const COMPANY_FIELDS = [
  {
    key: "name",
    label: "Наименование компании",
    placeholder: "Например, GOX Build",
  },
  {
    key: "legalAddress",
    label: "Юридический адрес компании",
    placeholder: "Юридический адрес компании",
  },
  {
    key: "industry",
    label: "Сфера деятельности",
    placeholder: "Строительство, снабжение, подряд",
  },
  { key: "inn", label: "ИНН компании", placeholder: "ИНН компании" },
  {
    key: "phoneMain",
    label: "Основной телефон",
    placeholder: "Основной телефон",
  },
  {
    key: "email",
    label: "Email компании",
    placeholder: "office@company.kg",
  },
  {
    key: "constructionObjectName",
    label: "Наименование объекта строительства",
    placeholder: "Название объекта",
  },
  {
    key: "siteAddress",
    label: "Фактический адрес строительства",
    placeholder: "Адрес стройки",
  },
  {
    key: "website",
    label: "Сайт компании",
    placeholder: "https://company.kg",
  },
] as const;

export const COMPANY_DETAILS: readonly {
  label: string;
  pick: (
    company: NonNullable<OfficeAccessScreenData["company"]>,
  ) => string | null | undefined;
}[] = [
  { label: "Наименование компании", pick: (company) => company.name },
  { label: "Юридический адрес компании", pick: (company) => company.address },
  { label: "Сфера деятельности", pick: (company) => company.industry },
  { label: "ИНН компании", pick: (company) => company.inn },
  { label: "Основной телефон", pick: (company) => company.phone_main },
  {
    label: "Дополнительные телефоны",
    pick: (company) => company.phone_whatsapp,
  },
  { label: "Email компании", pick: (company) => company.email },
  { label: "Сайт компании", pick: (company) => company.site },
  {
    label: "Наименование объекта строительства",
    pick: (company) => company.about_short,
  },
  {
    label: "Фактический адрес строительства",
    pick: (company) => company.about_full,
  },
];

export const RULES = [
  "Регистрация сама по себе не выдает office-роли автоматически.",
  "Создание компании открывает Office и назначает только стартовую роль director.",
  "Остальные роли появляются только через приглашение или явное назначение.",
] as const;

export const buildInviteDraft = (): InviteFormDraft => ({
  name: "",
  phone: "",
  email: "",
  comment: "",
});

export function getVisibleCompanyDetails(
  company: NonNullable<OfficeAccessScreenData["company"]> | null,
) {
  if (!company) return [];
  return COMPANY_DETAILS.map((item) => ({
    label: item.label,
    value: String(item.pick(company) || "").trim(),
  })).filter((item) => item.value);
}

export function getPostReturnSections(
  data: OfficeAccessScreenData,
): PostReturnSectionKey[] {
  if (data.company) {
    const sections: PostReturnSectionKey[] = [
      "summary",
      "directions",
      "invites",
      "members",
    ];
    if (getVisibleCompanyDetails(data.company).length > 0) {
      sections.splice(2, 0, "company_details");
    }
    return sections;
  }

  return ["company_create", "rules"];
}

export function shouldRenderCompanySection(
  section: CompanyPostReturnSectionKey,
  probe: readonly OfficePostReturnProbe[],
) {
  if (probe.includes("all")) return true;
  const hasSectionIsolationProbe = SECTION_RENDER_PROBES.some((item) =>
    probe.includes(item),
  );
  if (!hasSectionIsolationProbe) return true;

  switch (section) {
    case "summary":
      return probe.includes("header_meta") || probe.includes("summary");
    case "directions":
      return probe.includes("directions");
    case "company_details":
      return probe.includes("company_details");
    case "invites":
      return probe.includes("invites");
    case "members":
      return probe.includes("members");
    default:
      return true;
  }
}

export function getVisiblePostReturnSections(
  data: OfficeAccessScreenData,
  probe: readonly OfficePostReturnProbe[],
) {
  return getPostReturnSections(data).filter((section) => {
    if (!data.company) return true;
    if (section === "company_create" || section === "rules") return true;
    return shouldRenderCompanySection(section, probe);
  });
}

export const formatDate = (value: string | null): string => {
  if (!value) return COPY.noValue;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("ru-RU");
};
