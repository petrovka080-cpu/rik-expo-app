// src/components/ui/index.ts
// Design System 2.0 - Barrel Export

// Core Components
export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';

export { Card, CardHeader, CardContent, CardFooter } from './Card';
export type { CardVariant } from './Card';

export { Input } from './Input';
export type { InputVariant, InputSize } from './Input';

export { Modal } from './Modal';
export type { ModalVariant } from './Modal';

export { Toast, toast } from './Toast';
export type { ToastVariant } from './Toast';

export { Badge, CountBadge } from './Badge';
export type { BadgeVariant, BadgeSize } from './Badge';

export { Stepper, ProgressBar } from './Stepper';
export type { Step } from './Stepper';

export { FilterChip, FilterChipGroup } from './FilterChip';

// New Components
export { Avatar } from './Avatar';
export type { AvatarSize, AvatarStatus } from './Avatar';

export { Rating } from './Rating';

export { FilterPanel } from './FilterPanel';
export type { FilterOption } from './FilterPanel';

// Re-export theme for convenience
export { default as Theme } from '../../styles/theme';

// Dashboard Components
export { StatCard } from './StatCard';
export { QuickAction } from './QuickAction';
