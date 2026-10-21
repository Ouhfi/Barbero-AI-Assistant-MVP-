import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, LogOut, MapPin } from "lucide-react-native";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/constants/colors";
import { getAreas, Area } from "@/services/areaService";
import { getReadableErrorMessage } from "@/services/apiErrors";
import AppIcon from "@/components/ui/AppIcon";

export default function ProfileTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const logoutUser = useAuthStore((state) => state.logoutUser);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [areas, setAreas] = useState<Area[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Synchronize profile data with GET /api/auth/me and fetch area names
  const fetchProfileData = useCallback(
    async (isRefresh = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      }
      setSyncError(null);

      try {
        const [, areasData] = await Promise.all([
          refreshUser(),
          getAreas().catch(() => [] as Area[]),
        ]);
        setAreas(areasData);
      } catch (err: unknown) {
        setSyncError(getReadableErrorMessage(err));
      } finally {
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [refreshUser]
  );

  // Sync profile on focus whenever the screen becomes active.
  // Checks current session from Zustand store without subscribing useFocusEffect to user object mutations.
  useFocusEffect(
    useCallback(() => {
      const currentUser = useAuthStore.getState().user;
      if (hasHydrated && currentUser) {
        fetchProfileData();
      }
    }, [hasHydrated, fetchProfileData])
  );

  const handleConfirmLogout = () => {
    setIsLogoutModalVisible(false);
    logoutUser();
    router.replace("/login");
  };

  // Wait for Zustand authentication hydration before making navigation decisions
  if (!hasHydrated) {
    return null;
  }

  // Redirect unauthenticated users to the existing login route
  if (!user) {
    return <Redirect href="/login" />;
  }

  const isBarber = user.role === "BARBER";

  // Compute initials for the avatar if full name exists
  const initials = user.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // Resolve assigned area name if user has an area_id
  const assignedAreaName = user.area_id
    ? areas.find((a) => a.id === user.area_id)?.name
    : null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchProfileData(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Avatar & User Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            {initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <AppIcon name="user" size={38} color={Colors.primary} />
            )}
          </View>
          <Text style={styles.headerName}>
            {user.fullName && user.fullName.trim().length > 0
              ? user.fullName
              : "Grooming Member"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {isBarber ? "PROFESSIONAL BARBER" : "CUSTOMER MEMBER"}
            </Text>
          </View>
          {isBarber && user.area_id ? (
            <View style={styles.headerAreaBadge}>
              <MapPin size={13} color={Colors.textSecondary} />
              <Text style={styles.headerAreaText}>
                {assignedAreaName || `Area #${user.area_id}`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Sync Warning Banner if background fetch failed */}
        {syncError ? (
          <View style={styles.syncErrorBox}>
            <AlertCircle size={16} color="#B45309" />
            <Text style={styles.syncErrorText}>
              Unable to sync latest profile: {syncError}
            </Text>
            <TouchableOpacity
              onPress={() => fetchProfileData(true)}
              style={styles.retryButton}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Account Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account ID</Text>
            <Text style={styles.detailValue}>#{user.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>
              {user.fullName || "Not provided"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email Address</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>

          <View style={[styles.detailRow, !isBarber && styles.lastRow]}>
            <Text style={styles.detailLabel}>Account Role</Text>
            <Text style={styles.detailValue}>
              {isBarber ? "Professional Barber" : "Customer Member"}
            </Text>
          </View>

          {isBarber && (
            <View style={[styles.detailRow, styles.lastRow]}>
              <Text style={styles.detailLabel}>Assigned Neighborhood</Text>
              <View style={styles.areaDetailRow}>
                <MapPin size={15} color={Colors.primary} />
                <Text style={styles.detailValue}>
                  {user.area_id
                    ? assignedAreaName
                      ? `${assignedAreaName} (Area #${user.area_id})`
                      : `Area #${user.area_id}`
                    : "None assigned"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Informational Read-Only Callout */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconWrapper}>
            <AppIcon name="alert-circle" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.infoText}>
            Profile editing is currently not supported by the backend service. All account information is synchronized and read-only.
          </Text>
        </View>

        {/* Sign Out Button - visually distinct */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setIsLogoutModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Sign out of account"
        >
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <LogOut size={28} color={Colors.error} />
            </View>

            <Text style={styles.modalTitle}>Sign Out of BARBERO?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to sign out? You will need your email and password to sign back in.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalDismissButton}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel sign out"
              >
                <Text style={styles.modalDismissButtonText}>Keep Signed In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm sign out"
              >
                <Text style={styles.modalConfirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 16,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F4F8",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  headerName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: "#EBF1F7",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  headerAreaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerAreaText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  syncErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  syncErrorText: {
    flex: 1,
    fontSize: 12,
    color: "#B45309",
    lineHeight: 16,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F59E0B",
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  areaDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 24,
    alignItems: "center",
  },
  infoIconWrapper: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 67, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalDismissButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDismissButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

