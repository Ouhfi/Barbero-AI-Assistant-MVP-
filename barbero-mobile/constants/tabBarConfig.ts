import { Colors } from "./colors";

/**
 * BARBERO Mobile - Bottom Tab Bar Configuration & Styles
 * Configured for light-theme design system using shared Colors tokens.
 */

export const TabBarColors = {
  background: Colors.card,
  active: Colors.primary,
  inactive: Colors.disabled,
  border: Colors.border,
} as const;

export const TabBarMetrics = {
  iconSize: 22,
  strokeWidth: 2,
  activeStrokeWidth: 2.2,
  labelFontSize: 11,
  baseHeight: 60,
} as const;
