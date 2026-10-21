import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  User,
  AlertCircle,
  X,
  CheckCircle,
  RefreshCw,
} from "lucide-react-native";
import { useAuthStore } from "@/stores/authStore";
import { getOrderById, cancelOrder, Order, OrderStatus } from "@/services/orderService";
import { getAreas, Area } from "@/services/areaService";
import { getReadableErrorMessage } from "@/services/apiErrors";
import { Colors } from "@/constants/colors";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [order, setOrder] = useState<Order | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancellation state
  const [isCancelModalVisible, setIsCancelModalVisible] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const parsedOrderId = id ? Number(id) : NaN;
  const isOrderIdValid = !isNaN(parsedOrderId) && parsedOrderId > 0;

  const fetchOrderDetails = useCallback(
    async (isRefresh = false) => {
      if (!isOrderIdValid) {
        setErrorMessage("Invalid order identifier.");
        setIsLoading(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const [orderData, areasData] = await Promise.all([
          getOrderById(parsedOrderId),
          getAreas().catch(() => [] as Area[]),
        ]);
        setOrder(orderData);
        setAreas(areasData);
      } catch (err: unknown) {
        const readable = getReadableErrorMessage(err);
        if (readable.toLowerCase().includes("not found")) {
          setErrorMessage(
            `Booking #${parsedOrderId} was not found or you do not have permission to view it.`
          );
        } else {
          setErrorMessage(readable);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [parsedOrderId, isOrderIdValid]
  );

  useEffect(() => {
    if (hasHydrated && user && user.role === "CUSTOMER") {
      fetchOrderDetails();
    }
  }, [hasHydrated, user, fetchOrderDetails]);

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelOrder(order.id);
      // Update local order status to reflect server cancellation
      setOrder((prev) => (prev ? { ...prev, status: "CANCELED" } : null));
      setIsCancelModalVisible(false);
    } catch (err: unknown) {
      setCancelError(getReadableErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  // Wait for Zustand authentication hydration
  if (!hasHydrated) {
    return null;
  }

  // Redirect unauthenticated users
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Backend GET /api/orders/:id enforces customer_id: req.user.id.
  // Barbers cannot query this endpoint and must be redirected to their orders tab.
  if (user.role !== "CUSTOMER") {
    return <Redirect href="/(tabs)" />;
  }

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case "ACCEPTED":
        return {
          bg: "#EBF1F7",
          text: Colors.primary,
          border: Colors.primary,
          title: "Barber Assigned",
          description:
            "A neighborhood barber has accepted your booking and is assigned to fulfill your service.",
        };
      case "COMPLETED":
        return {
          bg: "#ECFDF5",
          text: Colors.success,
          border: Colors.success,
          title: "Service Completed",
          description: "This grooming appointment has been successfully completed.",
        };
      case "PENDING":
        return {
          bg: "#FFFBEB",
          text: "#B45309",
          border: "#F59E0B",
          title: "Awaiting Barber",
          description:
            "Your appointment request is broadcast to barbers in your neighborhood. You will be notified once accepted.",
        };
      case "CANCELED":
        return {
          bg: "#FEF2F2",
          text: Colors.error,
          border: "#FCA5A5",
          title: "Booking Canceled",
          description: "This booking request was canceled.",
        };
      default:
        return {
          bg: Colors.secondary,
          text: Colors.textSecondary,
          border: Colors.border,
          title: status,
          description: "",
        };
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const areaName = order
    ? areas.find((a) => a.id === order.area_id)?.name ?? `Area #${order.area_id}`
    : "N/A";

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

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>
            {isOrderIdValid ? `Booking #${parsedOrderId}` : "Booking"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshHeaderButton}
          onPress={() => fetchOrderDetails(true)}
          disabled={isLoading || isRefreshing}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Refresh order"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <RefreshCw size={18} color={Colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Loading View */}
      {isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      ) : errorMessage ? (
        /* Error View */
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <AlertCircle size={36} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Order</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchOrderDetails()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.returnButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Return to previous screen"
              >
                <Text style={styles.returnButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : order ? (
        /* Main Order Content */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrderDetails(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Status Banner Card */}
          {(() => {
            const statusConfig = getStatusConfig(order.status);
            return (
              <View style={styles.statusCard}>
                <View style={styles.statusCardHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusConfig.bg,
                        borderColor: statusConfig.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {order.status}
                    </Text>
                  </View>
                  <Text style={styles.statusTitle}>{statusConfig.title}</Text>
                </View>
                <Text style={styles.statusDescription}>{statusConfig.description}</Text>
              </View>
            );
          })()}

          {/* Service Details Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Requested Service</Text>
            <View style={styles.serviceBox}>
              <Text style={styles.serviceText}>{order.service_details}</Text>
            </View>
          </View>

          {/* Appointment Metadata Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Appointment Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <MapPin size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Neighborhood Area</Text>
                <Text style={styles.infoValue}>{areaName}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <User size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Assigned Barber</Text>
                <Text style={styles.infoValue}>
                  {order.barber_id ? `Barber #${order.barber_id}` : "Awaiting assignment"}
                </Text>
              </View>
              {order.barber_id ? (
                <View style={styles.assignedPill}>
                  <CheckCircle size={12} color={Colors.success} />
                  <Text style={styles.assignedPillText}>Confirmed</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <CalendarDays size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Requested At</Text>
                <Text style={styles.infoValue}>{formatDateTime(order.createdAt)}</Text>
              </View>
            </View>

            {order.updatedAt ? (
              <>
                <View style={styles.rowDivider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Clock size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Last Status Update</Text>
                    <Text style={styles.infoValue}>{formatDateTime(order.updatedAt)}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Action: Cancel if PENDING */}
          {order.status === "PENDING" ? (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.cancelOrderButton}
                onPress={() => {
                  setCancelError(null);
                  setIsCancelModalVisible(true);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel booking request"
              >
                <X size={16} color={Colors.error} strokeWidth={2.5} />
                <Text style={styles.cancelOrderButtonText}>Cancel Booking Request</Text>
              </TouchableOpacity>
              <Text style={styles.cancelHelperText}>
                You may cancel your booking request at any time prior to barber acceptance.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancelling) setIsCancelModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <AlertCircle size={32} color={Colors.error} />
            </View>

            <Text style={styles.modalTitle}>Cancel Booking Request?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to cancel booking #{order?.id}? This request will be removed
              from available barbers and cannot be undone.
            </Text>

            {cancelError ? (
              <View style={styles.modalErrorBox}>
                <AlertCircle size={14} color={Colors.error} />
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalDismissButton}
                onPress={() => setIsCancelModalVisible(false)}
                disabled={isCancelling}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Keep booking"
              >
                <Text style={styles.modalDismissButtonText}>Keep Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, isCancelling && styles.modalConfirmDisabled]}
                onPress={handleCancelOrder}
                disabled={isCancelling}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm booking cancellation"
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Yes, Cancel</Text>
                )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  retryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  returnButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  returnButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  statusDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  serviceBox: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  serviceText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  assignedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 8,
  },
  cancelOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 14,
  },
  cancelOrderButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: "700",
  },
  cancelHelperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 67, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: "100%",
    maxWidth: 380,
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
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    width: "100%",
  },
  modalErrorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalDismissButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDismissButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.error,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
