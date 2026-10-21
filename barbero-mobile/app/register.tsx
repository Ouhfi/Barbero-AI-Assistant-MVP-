import React, { useState, useEffect, useCallback } from "react";
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
import { useRouter, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import {
  registerSchema,
  RegisterFormValues,
  barberRegisterSchema,
  BarberRegisterFormValues,
} from "@/schemas/authSchemas";
import { useAuthStore } from "@/stores/authStore";
import { getReadableErrorMessage } from "@/services/apiErrors";
import { registerBarber } from "@/services/authService";
import { getAreas, Area } from "@/services/areaService";
import AppInput from "@/components/ui/AppInput";
import AppButton from "@/components/ui/AppButton";
import LogoIcon from "@/components/ui/LogoIcon";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const registerUser = useAuthStore((state) => state.registerUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  const isAuthenticated = Boolean(
    user && token && typeof token === "string" && token.trim().length > 0
  );

  const [selectedRole, setSelectedRole] = useState<"CUSTOMER" | "BARBER">("CUSTOMER");
  const [serverError, setServerError] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [isBarberLoading, setIsBarberLoading] = useState(false);

  // Fetch areas with error handling and retry support for the Barber area picker
  const fetchAreas = useCallback(async () => {
    setIsLoadingAreas(true);
    setAreasError(null);
    try {
      const data = await getAreas();
      setAreas(data);
      if (data.length === 0) {
        setAreasError("No service areas currently available.");
      }
    } catch (err: unknown) {
      setAreasError(getReadableErrorMessage(err));
    } finally {
      setIsLoadingAreas(false);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      fetchAreas();
    }
  }, [fetchAreas, hasHydrated, isAuthenticated]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Separate form instance for barber — keeps validation independent
  const {
    control: barberControl,
    handleSubmit: barberHandleSubmit,
    formState: { errors: barberErrors },
  } = useForm<BarberRegisterFormValues>({
    resolver: zodResolver(barberRegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      area_id: 0,
      invite_key: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      // confirmPassword is frontend-only; backend receives { fullName, email, password }
      await registerUser(values.fullName, values.email, values.password);
      router.replace({
        pathname: "/login",
        params: { registered: "true" },
      });
    } catch (err: unknown) {
      setServerError(getReadableErrorMessage(err));
    }
  };

  const onSubmitBarber = async (values: BarberRegisterFormValues) => {
    setServerError(null);
    setIsBarberLoading(true);
    try {
      // confirmPassword and invite_key are handled here; backend receives the rest
      await registerBarber({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        area_id: values.area_id,
        invite_key: values.invite_key,
      });
      router.replace({
        pathname: "/login",
        params: { registered: "true" },
      });
    } catch (err: unknown) {
      setServerError(getReadableErrorMessage(err));
    } finally {
      setIsBarberLoading(false);
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
                <LogoIcon size={88} />
              </View>

              <Text style={styles.brand}>BARBERO</Text>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join BARBERO today</Text>
            </View>

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionLabel}>Account Type</Text>
              <View style={styles.roleOptionsRow}>
                {/* Customer: Active when selected */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedRole("CUSTOMER");
                    if (serverError) setServerError(null);
                  }}
                  style={[
                    styles.roleCard,
                    selectedRole === "CUSTOMER"
                      ? styles.roleCardActive
                      : styles.roleCardInactive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel="Customer account"
                  accessibilityState={{ selected: selectedRole === "CUSTOMER" }}
                >
                  <View style={styles.roleCardHeader}>
                    <Text
                      style={
                        selectedRole === "CUSTOMER"
                          ? styles.roleTitleActive
                          : styles.roleTitleInactive
                      }
                    >
                      Customer
                    </Text>
                    {selectedRole === "CUSTOMER" ? (
                      <View style={styles.activeDot} />
                    ) : null}
                  </View>
                  <Text
                    style={
                      selectedRole === "CUSTOMER"
                        ? styles.roleDescription
                        : styles.roleDescriptionInactive
                    }
                  >
                    Book appointments & grooming
                  </Text>
                </TouchableOpacity>

                {/* Barber: Active when selected */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedRole("BARBER");
                    if (serverError) setServerError(null);
                  }}
                  style={[
                    styles.roleCard,
                    selectedRole === "BARBER"
                      ? styles.roleCardActive
                      : styles.roleCardInactive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel="Barber account"
                  accessibilityState={{ selected: selectedRole === "BARBER" }}
                >
                  <View style={styles.roleCardHeader}>
                    <Text
                      style={
                        selectedRole === "BARBER"
                          ? styles.roleTitleActive
                          : styles.roleTitleInactive
                      }
                    >
                      Barber
                    </Text>
                    {selectedRole === "BARBER" ? (
                      <View style={styles.activeDot} />
                    ) : null}
                  </View>
                  <Text
                    style={
                      selectedRole === "BARBER"
                        ? styles.roleDescription
                        : styles.roleDescriptionInactive
                    }
                  >
                    Provide grooming services
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedRole === "CUSTOMER" ? (
              /* ── CUSTOMER FORM ── */
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="user"
                      autoCapitalize="words"
                      autoCorrect={false}
                      error={errors.fullName?.message}
                    />
                  )}
                />

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
                      placeholder="Create a password (min 8 characters)"
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

                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="lock"
                      secureTextEntry
                      error={errors.confirmPassword?.message}
                    />
                  )}
                />

                <AppButton
                  title="Create Account"
                  variant="success"
                  onPress={handleSubmit(onSubmit)}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.registerButton}
                />

                <View style={styles.signInContainer}>
                  <Text style={styles.signInText}>Already have an account? </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push("/login")}
                    accessibilityRole="button"
                    accessibilityLabel="Navigate to Login"
                  >
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>

                <AppButton
                  title="Back to Welcome"
                  variant="outline"
                  onPress={() => router.replace("/")}
                  style={styles.backButton}
                />
              </View>
            ) : (
              /* ── BARBER FORM ── */
              <View style={styles.form}>
                <Controller
                  control={barberControl}
                  name="fullName"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="user"
                      autoCapitalize="words"
                      autoCorrect={false}
                      error={barberErrors.fullName?.message}
                    />
                  )}
                />

                <Controller
                  control={barberControl}
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
                      error={barberErrors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={barberControl}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Password"
                      placeholder="Create a password (min 8 characters)"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="lock"
                      secureTextEntry
                      error={barberErrors.password?.message}
                    />
                  )}
                />

                <Controller
                  control={barberControl}
                  name="confirmPassword"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="lock"
                      secureTextEntry
                      error={barberErrors.confirmPassword?.message}
                    />
                  )}
                />

                {/* Area picker — scrollable row of tappable area chips */}
                <Controller
                  control={barberControl}
                  name="area_id"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.areaPickerWrapper}>
                      <Text style={styles.areaPickerLabel}>Service Area</Text>
                      {isLoadingAreas ? (
                        <View style={styles.areaLoadingContainer}>
                          <ActivityIndicator size="small" color={Colors.primary} />
                          <Text style={styles.areaLoadingText}>Loading available service areas…</Text>
                        </View>
                      ) : areasError ? (
                        <View style={styles.areaErrorContainer}>
                          <View style={styles.areaErrorTextWrap}>
                            <AlertCircle size={16} color={Colors.error} />
                            <Text style={styles.areaErrorText}>{areasError}</Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.areaRetryButton,
                              isLoadingAreas && styles.areaRetryButtonDisabled,
                            ]}
                            onPress={fetchAreas}
                            disabled={isLoadingAreas}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Retry loading service areas"
                          >
                            <Text style={styles.areaRetryButtonText}>Retry</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.areaChipsContainer}>
                          {areas.map((area) => (
                            <TouchableOpacity
                              key={area.id}
                              style={[
                                styles.areaChip,
                                value === area.id && styles.areaChipSelected,
                              ]}
                              onPress={() => {
                                onChange(area.id);
                                if (serverError) setServerError(null);
                              }}
                              activeOpacity={0.75}
                              accessibilityRole="radio"
                              accessibilityLabel={area.name}
                              accessibilityState={{ selected: value === area.id }}
                            >
                              <Text
                                style={[
                                  styles.areaChipText,
                                  value === area.id && styles.areaChipTextSelected,
                                ]}
                              >
                                {area.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {barberErrors.area_id ? (
                        <Text style={styles.areaPickerError}>
                          {barberErrors.area_id.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                <Controller
                  control={barberControl}
                  name="invite_key"
                  render={({ field: { onChange, value } }) => (
                    <AppInput
                      label="Barber Invite Key"
                      placeholder="Enter the invite key provided to you"
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        if (serverError) setServerError(null);
                      }}
                      leftIcon="lock"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      error={barberErrors.invite_key?.message}
                    />
                  )}
                />

                <AppButton
                  title="Create Barber Account"
                  variant="success"
                  onPress={barberHandleSubmit(onSubmitBarber)}
                  loading={isBarberLoading}
                  disabled={isBarberLoading}
                  style={styles.registerButton}
                />

                <View style={styles.signInContainer}>
                  <Text style={styles.signInText}>Already have an account? </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push("/login")}
                    accessibilityRole="button"
                    accessibilityLabel="Navigate to Login"
                  >
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>

                <AppButton
                  title="Back to Welcome"
                  variant="outline"
                  onPress={() => router.replace("/")}
                  style={styles.backButton}
                />
              </View>
            )}
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
    paddingVertical: 28,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  roleSection: {
    marginBottom: 18,
  },
  roleSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  roleOptionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  roleCardActive: {
    backgroundColor: "#F0F4F8",
    borderColor: Colors.primary,
  },
  roleCardInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  roleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roleTitleActive: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
  },
  roleTitleInactive: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  roleDescriptionInactive: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  // Area picker
  areaPickerWrapper: {
    marginBottom: 16,
    width: "100%",
  },
  areaPickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  areaChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  areaChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  areaChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500",
  },
  areaChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  areaPickerHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  areaLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  areaLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  areaErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  areaErrorTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  areaErrorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    lineHeight: 16,
  },
  areaRetryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  areaRetryButtonDisabled: {
    opacity: 0.6,
  },
  areaRetryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  areaPickerError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
  form: {
    width: "100%",
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  signInText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signInLink: {
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
