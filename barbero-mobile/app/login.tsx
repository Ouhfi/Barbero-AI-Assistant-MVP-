import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Colors } from "@/constants/colors";
import { loginSchema, LoginFormValues } from "@/schemas/authSchemas";
import { useAuthStore } from "@/stores/authStore";
import { getReadableErrorMessage } from "@/services/apiErrors";
import AppInput from "@/components/ui/AppInput";
import AppButton from "@/components/ui/AppButton";
import LogoIcon from "@/components/ui/LogoIcon";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ registered?: string }>();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const loginUser = useAuthStore((state) => state.loginUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [serverError, setServerError] = useState<string | null>(null);

  const isSuccessBannerVisible = params.registered === "true";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const user = await loginUser(values.email, values.password);

      // Navigate into the tab shell; /(tabs)/index.tsx resolves the correct home screen by role
      router.replace("/(tabs)");
    } catch (err: unknown) {
      setServerError(getReadableErrorMessage(err));
    }
  };

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
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingLeft: Math.max(insets.left, 16) + 8,
              paddingRight: Math.max(insets.right, 16) + 8,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoCardContainer}>
                <LogoIcon />
              </View>

              <Text style={styles.brand}>BARBERO</Text>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {isSuccessBannerVisible ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>
                  Registration successful! Please sign in with your credentials.
                </Text>
              </View>
            ) : null}

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Email"
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (serverError) setServerError(null);
                    }}
                    leftIcon="mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Password"
                    placeholder="Enter your password"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (serverError) setServerError(null);
                    }}
                    leftIcon="lock"
                    secureTextEntry
                    error={errors.password?.message}
                  />
                )}
              />

              <AppButton
                title="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                style={styles.signInButton}
              />

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/register")}
                  accessibilityRole="button"
                  accessibilityLabel="Navigate to Register"
                >
                  <Text style={styles.registerLink}>Register</Text>
                </TouchableOpacity>
              </View>

              <AppButton
                title="Back to Welcome"
                variant="outline"
                onPress={() => router.replace("/")}
                style={styles.backButton}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  brand: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.primary,
    marginBottom: 8,
  },
  accentLine: {
    width: 32,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  successBanner: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successBannerText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  signInButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  backButton: {
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
