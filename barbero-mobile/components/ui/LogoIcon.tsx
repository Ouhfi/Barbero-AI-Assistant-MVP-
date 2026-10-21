import React from "react";
import {
  Image,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "@/constants/colors";

export interface LogoIconProps {
  size?: number;
  style?: ViewStyle;
}

export default function LogoIcon({ size = 112, style }: LogoIconProps) {
  const borderRadius = Math.round(size * (24 / 112));
  const imageSize = Math.round(size * 0.68);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      <Image
        source={require("@/assets/logo.png")}
        style={{ width: imageSize, height: imageSize }}
        resizeMode="contain"
        accessibilityLabel="BARBERO logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
