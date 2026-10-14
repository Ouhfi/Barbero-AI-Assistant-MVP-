
import { Text, StyleSheet, type TextProps } from "react-native";
import { Colors } from "@/constants/colors";

type AppTextProps = TextProps & {
  variant?: "title" | "body" | "caption";
  color?: string;
};

export function AppText({
  variant = "body",
  color,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        color ? { color } : undefined,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
});
