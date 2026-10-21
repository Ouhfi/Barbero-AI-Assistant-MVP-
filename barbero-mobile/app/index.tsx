import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/constants/colors";
import LogoIcon from "@/components/ui/LogoIcon";
import AppButton from "@/components/ui/AppButton";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // 1. Wait until storage hydration completes before making routing decisions,
  // showing the light loading state to prevent flash of content.
  if (!hasHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // 2. If a valid authenticated user and session token exist, redirect to the main app
  const isAuthenticated = Boolean(
    user && token && typeof token === "string" && token.trim().length > 0
  );
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 16,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
          paddingLeft: Math.max(insets.left, 16) + 16,
          paddingRight: Math.max(insets.right, 16) + 16,
        },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <LogoIcon size={120} />
          </View>

          <Text style={styles.brand}>BARBERO</Text>

          <View style={styles.accentLine} />

          <Text style={styles.title}>
            Your style,{"\n"}your neighborhood.
          </Text>

          <Text style={styles.description}>
            Book a trusted barber near you.
            {"\n"}
            Quality grooming, made simple.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <AppButton
            title="Get Started"
            onPress={() => router.push("/login")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    justifyContent: "space-between",
  },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  brand: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 5,
    color: Colors.primary,
    marginBottom: 12,
  },
  accentLine: {
    width: 36,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  actionSection: {
    width: "100%",
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
