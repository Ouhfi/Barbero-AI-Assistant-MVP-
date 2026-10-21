import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ClipboardList,
  CalendarCheck,
  MapPin,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import {
  getAvailableBarberOrders,
  getAssignedBarberOrders,
  Order,
} from "@/services/orderService";
import { getAreas, Area } from "@/services/areaService";
import { getReadableErrorMessage } from "@/services/apiErrors";

export default function BarberHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [available, active, areas] = await Promise.all([
        getAvailableBarberOrders(),
        getAssignedBarberOrders(),
        getAreas().catch(() => [] as Area[]),
      ]);

      setAvailableOrders(available);
      setActiveOrders(active);

      if (user?.area_id !== null && user?.area_id !== undefined) {
        const matchedArea = areas.find((a) => a.id === user.area_id);
        if (matchedArea) {
          setAreaName(matchedArea.name);
        } else {
          setAreaName(`Area #${user.area_id}`);
        }
      } else {
        setAreaName(null);
      }
    } catch (err: unknown) {
      setErrorMessage(getReadableErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.area_id]);

  // Initial fetch and whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (hasHydrated && user && user.role === "BARBER") {
        fetchDashboardData();
      }
    }, [hasHydrated, user, fetchDashboardData])
  );

  // Prevent premature redirect before persisted storage hydration completes
  if (!hasHydrated) {
    return null;
  }

  // Redirect unauthenticated users to the login route
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Ensure CUSTOMER users cannot access the Barber home screen
  if (user.role !== "BARBER") {
    return <Redirect href="/(tabs)" />;
  }

  const hasArea = user.area_id !== null && user.area_id !== undefined;
  const topActiveJob = activeOrders.length > 0 ? activeOrders[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={40} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load dashboard</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchDashboardData()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching dashboard"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchDashboardData(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>BARBERO</Text>
              <View style={styles.rolePill}>
                <Sparkles size={11} color={Colors.primary} />
                <Text style={styles.rolePillText}>PRO BARBER</Text>
              </View>
            </View>

            <Text style={styles.welcomeTitle}>
              {user.fullName ? `Hello, ${user.fullName}` : "Barber Dashboard"}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {hasArea
                ? `Operating in ${areaName || `Area #${user.area_id}`}`
                : "No operating area assigned"}
            </Text>
          </View>

          {/* Area Warning Banner if not assigned */}
          {!hasArea && (
            <View style={styles.warningBanner}>
              <MapPin size={20} color={Colors.warning} />
              <View style={styles.warningBannerContent}>
                <Text style={styles.warningBannerTitle}>No Area Assigned</Text>
                <Text style={styles.warningBannerText}>
                  Your account has no neighborhood area configured. Client booking requests are filtered by area.
                </Text>
              </View>
            </View>
          )}

          {/* Metric Cards Grid */}
          <View style={styles.statsGrid}>
            {/* Active Jobs Metric Card */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push("/(tabs)/orders")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Active jobs: ${activeOrders.length}`}
            >
              <View style={styles.statCardTop}>
                <View
                  style={[
                    styles.statIconContainer,
                    activeOrders.length > 0 && styles.statIconContainerActive,
                  ]}
                >
                  <CalendarCheck
                    size={20}
                    color={activeOrders.length > 0 ? Colors.success : Colors.primary}
                  />
                </View>
                <ArrowRight size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.statValue}>{activeOrders.length}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
              <Text style={styles.statHint}>
                {activeOrders.length > 0 ? "Currently in progress" : "No active jobs"}
              </Text>
            </TouchableOpacity>

            {/* Available Requests Metric Card */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push("/(tabs)/orders")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Available requests: ${availableOrders.length}`}
            >
              <View style={styles.statCardTop}>
                <View style={styles.statIconContainer}>
                  <ClipboardList size={20} color={Colors.primary} />
                </View>
                <ArrowRight size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.statValue}>{availableOrders.length}</Text>
              <Text style={styles.statLabel}>Available Requests</Text>
              <Text style={styles.statHint}>
                {availableOrders.length > 0 ? "Open in your area" : "No open requests"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Job Spotlight Card (if any active order) */}
          {topActiveJob && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Current Active Job</Text>
                <View style={styles.activeStatusBadge}>
                  <Text style={styles.activeStatusText}>IN PROGRESS</Text>
                </View>
              </View>

              <View style={styles.activeJobCard}>
                <View style={styles.activeJobHeader}>
                  <Text style={styles.activeJobOrderNumber}>Job #{topActiveJob.id}</Text>
                  <Text style={styles.activeJobDate}>
                    {topActiveJob.createdAt
                      ? new Date(topActiveJob.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "Recent"}
                  </Text>
                </View>

                <Text style={styles.activeJobService}>{topActiveJob.service_details}</Text>

                <View style={styles.activeJobFooter}>
                  <View style={styles.areaRow}>
                    <MapPin size={13} color={Colors.textSecondary} />
                    <Text style={styles.areaRowText}>
                      {areaName || `Area #${topActiveJob.area_id}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.manageJobButton}
                    onPress={() => router.push("/(tabs)/orders")}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Manage active job in orders"
                  >
                    <Text style={styles.manageJobButtonText}>Manage Job</Text>
                    <ArrowRight size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Quick Navigation Action to Orders */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => router.push("/(tabs)/orders")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View all client requests and orders"
          >
            <ClipboardList size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionButtonText}>View All Orders & Requests</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Account & Profile Summary Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Barber Account</Text>
            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Full Name</Text>
                <Text style={styles.accountValue}>{user.fullName || "Not provided"}</Text>
              </View>

              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Email</Text>
                <Text style={styles.accountValue}>{user.email}</Text>
              </View>

              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Role</Text>
                <View style={styles.accountRoleBadge}>
                  <Text style={styles.accountRoleBadgeText}>{user.role}</Text>
                </View>
              </View>

              <View style={[styles.accountRow, styles.accountRowLast]}>
                <Text style={styles.accountLabel}>Assigned Area</Text>
                <Text style={styles.accountValue}>
                  {hasArea ? areaName || `Area #${user.area_id}` : "Unassigned"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brand: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.primary,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningBannerContent: {
    flex: 1,
  },
  warningBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 2,
  },
  warningBannerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  statIconContainerActive: {
    backgroundColor: "#ECFDF5",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
  },
  statHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  activeStatusBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.success,
    letterSpacing: 0.5,
  },
  activeJobCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activeJobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activeJobOrderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  activeJobDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activeJobService: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  activeJobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  areaRowText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  manageJobButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  manageJobButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  accountCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accountRowLast: {
    borderBottomWidth: 0,
  },
  accountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  accountValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  accountRoleBadge: {
    backgroundColor: "#F0F4F8",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountRoleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
