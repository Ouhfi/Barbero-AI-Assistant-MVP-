import React from "react";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle,
  AlertCircle,
  Scissors,
  Check,
  House,
  CalendarDays,
  ClipboardList,
  UserRound,
  MapPin,
  ChevronDown,
  X,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";

export type IconName =
  | "mail"
  | "lock"
  | "user"
  | "eye"
  | "eye-off"
  | "log-out"
  | "check-circle"
  | "alert-circle"
  | "scissors"
  | "check"
  | "house"
  | "calendar-days"
  | "clipboard-list"
  | "user-round"
  | "map-pin"
  | "chevron-down"
  | "x";

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const ICON_MAP = {
  mail: Mail,
  lock: Lock,
  user: UserIcon,
  eye: Eye,
  "eye-off": EyeOff,
  "log-out": LogOut,
  "check-circle": CheckCircle,
  "alert-circle": AlertCircle,
  scissors: Scissors,
  check: Check,
  house: House,
  "calendar-days": CalendarDays,
  "clipboard-list": ClipboardList,
  "user-round": UserRound,
  "map-pin": MapPin,
  "chevron-down": ChevronDown,
  x: X,
};

/**
 * Lightweight icon component wrapping lucide-react-native icons.
 * Provides sensible defaults for size, color, and stroke width.
 */
export default function AppIcon({
  name,
  size = 20,
  color = Colors.primary,
  strokeWidth = 2,
}: AppIconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}
