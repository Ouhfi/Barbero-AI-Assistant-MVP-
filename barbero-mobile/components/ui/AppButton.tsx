import { Colors } from "@/constants/colors";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        variant === "primary"
          ? styles.primary
          : styles.secondary,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? Colors.white : Colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "primary"
              ? styles.primaryText
              : styles.secondaryText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
