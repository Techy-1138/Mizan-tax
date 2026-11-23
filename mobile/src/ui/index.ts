// ============================================================================
// Mizan (ميزان) - UI & Motion Primitives Barrel Export
// ============================================================================

export { Screen, type ScreenProps } from './Screen';
export { AppText, type AppTextProps, type TextVariant, type TextTone } from './AppText';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, type CardProps, type CardVariant } from './Card';
export { TextField, type TextFieldProps } from './TextField';
export { Badge, type BadgeProps, type BadgeVariant } from './Badge';
export { ModalSheet, type ModalSheetProps } from './ModalSheet';
export {
  SkeletonBlock,
  type SkeletonBlockProps,
  DashboardSkeleton,
  LedgerSkeleton,
  TaxCenterSkeleton,
  ReadinessSkeleton,
  ReportsSkeleton,
} from './Skeleton';

// Re-export motion primitives for convenient single-import usage across screens
export {
  FadeIn,
  type FadeInProps,
  SlideIn,
  type SlideInProps,
  type SlideDirection,
  AnimatedPressable,
  type AnimatedPressableProps,
  motionDurations,
  motionEasings,
  motionSprings,
} from '../motion';
