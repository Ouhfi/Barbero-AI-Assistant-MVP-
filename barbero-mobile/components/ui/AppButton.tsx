
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import AppIcon, { IconName } from "./AppIcon";

export type ButtonVariant = "primary" | "outline" | "success";

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
}: AppButtonProps) {
  const isPrimary = variant === "primary";
  const isSuccess = variant === "success";
  const isSolid = isPrimary || isSuccess;
  const isDisabled = disabled || loading;

  const buttonStyle = isPrimary
    ? styles.primary
    : isSuccess
    ? styles.success
    : styles.outline;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.base,
        buttonStyle,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isSolid ? "#FFFFFF" : Colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <View style={styles.iconContainer}>
              <AppIcon
                name={icon}
                size={18}
                color={isDisabled ? Colors.disabled : isSolid ? "#FFFFFF" : Colors.primary}
              />
            </View>
          ) : null}
          <Text
            style={[
              styles.label,
              isSolid ? styles.labelSolid : styles.labelOutline,
              isDisabled && styles.labelDisabled,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: 8,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  success: {
    backgroundColor: Colors.success,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  disabled: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  labelSolid: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  labelOutline: {
    color: Colors.primary,
    fontWeight: "600",
  },
  labelDisabled: {
    color: Colors.disabled,
  },
});
