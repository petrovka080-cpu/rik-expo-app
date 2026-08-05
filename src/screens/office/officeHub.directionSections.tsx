import React from "react";

import type { OfficeWorkspaceCard } from "./officeAccess.model";
import { DirectionCard } from "./officeHub.cards";

export type OfficeDirectionSectionProps = {
  canInvite: boolean;
  card: OfficeWorkspaceCard;
  onInvite: (card: OfficeWorkspaceCard) => void;
  onOpen: (card: OfficeWorkspaceCard) => void;
};

function OfficeDirectionSectionCard({
  canInvite,
  card,
  onInvite,
  onOpen,
}: OfficeDirectionSectionProps) {
  return (
    <DirectionCard
      card={card}
      canInvite={canInvite}
      onOpen={() => onOpen(card)}
      onInvite={() => onInvite(card)}
    />
  );
}

export const DirectorOfficeSection = React.memo(function DirectorOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

export const ForemanOfficeSection = React.memo(function ForemanOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

export const BuyerOfficeSection = React.memo(function BuyerOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

export const AccountantOfficeSection = React.memo(
  function AccountantOfficeSection(props: OfficeDirectionSectionProps) {
    return <OfficeDirectionSectionCard {...props} />;
  },
);

export const WarehouseOfficeSection = React.memo(
  function WarehouseOfficeSection(props: OfficeDirectionSectionProps) {
    return <OfficeDirectionSectionCard {...props} />;
  },
);

export const ContractorOfficeSection = React.memo(
  function ContractorOfficeSection(props: OfficeDirectionSectionProps) {
    return <OfficeDirectionSectionCard {...props} />;
  },
);

export const SecurityOfficeSection = React.memo(function SecurityOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

export const EngineerOfficeSection = React.memo(function EngineerOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

export const ReportsOfficeSection = React.memo(function ReportsOfficeSection(
  props: OfficeDirectionSectionProps,
) {
  return <OfficeDirectionSectionCard {...props} />;
});

const OFFICE_DIRECTION_SECTION_BY_KEY: Record<
  string,
  React.ElementType<OfficeDirectionSectionProps>
> = {
  accountant: AccountantOfficeSection,
  buyer: BuyerOfficeSection,
  contractor: ContractorOfficeSection,
  director: DirectorOfficeSection,
  engineer: EngineerOfficeSection,
  foreman: ForemanOfficeSection,
  reports: ReportsOfficeSection,
  security: SecurityOfficeSection,
  warehouse: WarehouseOfficeSection,
};

export function renderOfficeDirectionSection(
  props: OfficeDirectionSectionProps,
) {
  const Section =
    OFFICE_DIRECTION_SECTION_BY_KEY[props.card.key] ??
    OfficeDirectionSectionCard;
  return <Section key={props.card.key} {...props} />;
}
