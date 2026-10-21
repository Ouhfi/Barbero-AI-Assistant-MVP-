import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, AlertCircle, X, ChevronRight, MapPin } from "lucide-react-native";
import { useAuthStore } from "@/stores/authStore";
import { getCustomerOrders, cancelOrder, Order, OrderStatus } from "@/services/orderService";
import { getAreas, Area } from "@/services/areaService";
import { getReadableErrorMessage } from "@/services/apiErrors";
import { Colors } from "@/constants/colors";

export default function BookingsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [orders, setOrders] = useState<Order[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<{ id: number; message: string } | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [ordersData, areasData] = await Promise.all([
        getCustomerOrders(),
        getAreas().catch(() => [] as Area[]),
      ]);
      setOrders(ordersData);
      setAreas(areasData);
    } catch (err: unknown) {
      setErrorMessage(getReadableErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleCancelOrder = async (orderId: number) => {
    setCancelError(null);
    setCancellingOrderId(orderId);

    try {
      await cancelOrder(orderId);
      // Refresh the customer's orders so the updated CANCELED status appears
      await fetchOrders(true);
    } catch (err: unknown) {
      setCancelError({
        id: orderId,
        message: getReadableErrorMessage(err),
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Fetch orders initially and whenever the screen gains focus (e.g. after new booking)
  useFocusEffect(
    useCallback(() => {
      if (hasHydrated && user && user.role === "CUSTOMER") {
        fetchOrders();
      }
    }, [hasHydrated, user, fetchOrders])
  );

  // Wait for Zustand authentication hydration before making navigation decisions
  if (!hasHydrated) {
    return null;
  }

  // Redirect unauthenticated users to the existing login route
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Ensure BARBER users cannot access the Bookings screen, including through direct URLs
  if (user.role !== "CUSTOMER") {
    return <Redirect href="/(tabs)" />;
  }

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case "ACCEPTED":
        return { bg: "#EBF1F7", text: Colors.primary, border: Colors.primary };
      case "COMPLETED":
        return { bg: "#ECFDF5", text: Colors.success, border: Colors.success };
      case "PENDING":
        return { bg: "#FFFBEB", text: "#B45309", border: "#F59E0B" };
      case "CANCELED":
        return { bg: "#FEF2F2", text: Colors.error, border: Colors.error };
      default:
        return { bg: Colors.secondary, text: Colors.textSecondary, border: Colors.border };
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getStatusBadgeStyle(item.status);
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recent";

    const isPending = item.status === "PENDING";
    const isCancellingThis = cancellingOrderId === item.id;
    const isAnyCancelling = cancellingOrderId !== null;
    const areaName =
      areas.find((a) => a.id === item.area_id)?.name ?? `Area #${item.area_id}`;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`View details for booking #${item.id}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>Booking #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.serviceDetails}>{item.service_details}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.areaRow}>
            <MapPin size={13} color={Colors.textSecondary} />
            <Text style={styles.areaText} numberOfLines={1}>
              {areaName}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.viewDetailsRow}>
              <Text style={styles.viewDetailsText}>Details</Text>
              <ChevronRight size={13} color={Colors.primary} />
            </View>
          </View>
        </View>

        {isPending && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              isAnyCancelling && styles.cancelButtonDisabled,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              setCancelError(null);
              setOrderToCancel(item);
            }}
            disabled={isAnyCancelling}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Cancel booking #${item.id}`}
          >
            {isCancellingThis ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={Colors.error} />
                <Text style={styles.cancelButtonText}>Canceling...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <X size={15} color={Colors.error} strokeWidth={2.5} />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

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
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Your customer appointment history</Text>
      </View>

      {cancelError ? (
        <View style={styles.actionErrorBanner}>
          <AlertCircle size={18} color={Colors.error} />
          <Text style={styles.actionErrorText}>{cancelError.message}</Text>
          <TouchableOpacity
            style={styles.retryActionButton}
            onPress={() => handleCancelOrder(cancelError.id)}
            accessibilityRole="button"
            accessibilityLabel="Retry cancelling booking"
          >
            <Text style={styles.retryActionText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCancelError(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <X size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={40} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load bookings</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrders()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching bookings"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <CalendarDays size={36} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyDescription}>
            When you book grooming services with a trusted neighborhood barber, your appointment records will appear here.
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchOrders()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Refresh bookings"
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Cancellation Confirmation Dialog */}
      <Modal
        visible={orderToCancel !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOrderToCancel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <AlertCircle size={32} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>Cancel Booking?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to cancel Booking #{orderToCancel?.id}? This action cannot be undone and your appointment request will be withdrawn.
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalKeepButton}
                onPress={() => setOrderToCancel(null)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Keep booking"
              >
                <Text style={styles.modalKeepButtonText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmCancelButton}
                onPress={() => {
                  if (orderToCancel) {
                    const id = orderToCancel.id;
                    setOrderToCancel(null);
                    handleCancelOrder(id);
                  }
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Confirm cancel booking"
              >
                <Text style={styles.modalConfirmCancelButtonText}>Yes, Cancel</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  serviceDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
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
    maxWidth: "55%",
  },
  areaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  cancelButton: {
    marginTop: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
    letterSpacing: 0.3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  actionErrorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    fontWeight: "500",
  },
  retryActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  retryActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
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
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalKeepButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  modalKeepButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  modalConfirmCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 18,
  },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

