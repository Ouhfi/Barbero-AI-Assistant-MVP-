import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardList, AlertCircle, MapPin, Check, CheckCircle, X } from "lucide-react-native";
import { useAuthStore } from "@/stores/authStore";
import {
  getAvailableBarberOrders,
  getAssignedBarberOrders,
  acceptOrder,
  completeOrder,
  cancelOrder,
  Order,
} from "@/services/orderService";
import { getAreas, Area } from "@/services/areaService";
import { getReadableErrorMessage } from "@/services/apiErrors";
import { Colors } from "@/constants/colors";

export default function OrdersTabScreen() {
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<"accept" | "complete" | "cancel" | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "AVAILABLE">("ALL");
  const hasLoadedOnceRef = useRef<boolean>(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [available, active, areasData] = await Promise.all([
        getAvailableBarberOrders(),
        getAssignedBarberOrders(),
        getAreas().catch(() => [] as Area[]),
      ]);
      setAvailableOrders(available);
      setActiveOrders(active);
      setAreas(areasData);
    } catch (err: unknown) {
      setErrorMessage(getReadableErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleAcceptOrder = async (orderId: number) => {
    setActionError(null);
    setProcessingOrderId(orderId);
    setProcessingAction("accept");

    try {
      await acceptOrder(orderId);
      // Refresh both lists to move the order from available to active
      await fetchOrders(true);
    } catch (err: unknown) {
      setActionError(getReadableErrorMessage(err));
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    setActionError(null);
    setProcessingOrderId(orderId);
    setProcessingAction("complete");

    try {
      await completeOrder(orderId);
      // Refresh both lists after completing the job
      await fetchOrders(true);
    } catch (err: unknown) {
      setActionError(getReadableErrorMessage(err));
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setActionError(null);
    setProcessingOrderId(orderId);
    setProcessingAction("cancel");

    try {
      await cancelOrder(orderId);
      // Refresh both lists after canceling the job
      await fetchOrders(true);
    } catch (err: unknown) {
      setActionError(getReadableErrorMessage(err));
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  // Refresh available requests and assigned jobs whenever the Orders tab gains focus.
  // On initial load, performs a standard fetch (showing the initial loading indicator);
  // on subsequent focus events, performs a background refresh to avoid screen disruption.
  useFocusEffect(
    useCallback(() => {
      if (hasHydrated && user && user.role === "BARBER") {
        const isFirstLoad = !hasLoadedOnceRef.current;
        hasLoadedOnceRef.current = true;
        fetchOrders(!isFirstLoad);
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

  // Ensure CUSTOMER users cannot access the Orders screen, including through direct URLs
  if (user.role !== "BARBER") {
    return <Redirect href="/(tabs)" />;
  }

  const hasArea = user.area_id !== null && user.area_id !== undefined;

  const renderActiveCard = (item: Order) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recent";

    const isCompletingThis = processingOrderId === item.id && processingAction === "complete";
    const isCancellingThis = processingOrderId === item.id && processingAction === "cancel";
    const isAnyProcessing = processingOrderId !== null;
    const areaName =
      areas.find((a) => a.id === item.area_id)?.name ?? `Area #${item.area_id}`;

    return (
      <View key={`active-${item.id}`} style={[styles.orderCard, styles.activeOrderCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>Request #{item.id}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACCEPTED</Text>
          </View>
        </View>

        <Text style={styles.serviceDetails}>{item.service_details}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.areaRow}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.areaText}>{areaName}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[
              styles.cancelJobButton,
              isAnyProcessing && styles.actionButtonDisabled,
            ]}
            onPress={() => {
              setActionError(null);
              setOrderToCancel(item);
            }}
            disabled={isAnyProcessing}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Cancel request #${item.id}`}
          >
            {isCancellingThis ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={Colors.error} />
                <Text style={styles.cancelJobButtonText}>Canceling...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <X size={15} color={Colors.error} strokeWidth={2.5} />
                <Text style={styles.cancelJobButtonText}>Cancel Job</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              isAnyProcessing && styles.actionButtonDisabled,
            ]}
            onPress={() => handleCompleteOrder(item.id)}
            disabled={isAnyProcessing}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Complete request #${item.id}`}
          >
            {isCompletingThis ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Completing...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <CheckCircle size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.completeButtonText}>Complete Order</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvailableCard = (item: Order) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recent";

    const isProcessingThis = processingOrderId === item.id && processingAction === "accept";
    const isAnyProcessing = processingOrderId !== null;
    const areaName =
      areas.find((a) => a.id === item.area_id)?.name ?? `Area #${item.area_id}`;

    return (
      <View key={`available-${item.id}`} style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>Request #{item.id}</Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.serviceDetails}>{item.service_details}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.areaRow}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.areaText}>{areaName}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            isAnyProcessing && styles.actionButtonDisabled,
          ]}
          onPress={() => handleAcceptOrder(item.id)}
          disabled={isAnyProcessing}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Accept request #${item.id}`}
        >
          {isProcessingThis ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accepting...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.acceptButtonText}>Accept Request</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
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
        <Text style={styles.title}>Barber Orders</Text>
        <Text style={styles.subtitle}>Manage your active jobs and client requests</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabFilterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterTab === "ALL" && styles.filterChipActive]}
          onPress={() => setFilterTab("ALL")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Show all orders"
          accessibilityState={{ selected: filterTab === "ALL" }}
        >
          <Text style={[styles.filterChipText, filterTab === "ALL" && styles.filterChipTextActive]}>
            All ({activeOrders.length + availableOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterTab === "ACTIVE" && styles.filterChipActive]}
          onPress={() => setFilterTab("ACTIVE")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Show active orders only"
          accessibilityState={{ selected: filterTab === "ACTIVE" }}
        >
          <Text style={[styles.filterChipText, filterTab === "ACTIVE" && styles.filterChipTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterTab === "AVAILABLE" && styles.filterChipActive]}
          onPress={() => setFilterTab("AVAILABLE")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Show available requests only"
          accessibilityState={{ selected: filterTab === "AVAILABLE" }}
        >
          <Text style={[styles.filterChipText, filterTab === "AVAILABLE" && styles.filterChipTextActive]}>
            Available ({availableOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {actionError ? (
        <View style={styles.actionErrorBanner}>
          <AlertCircle size={18} color={Colors.error} />
          <Text style={styles.actionErrorText}>{actionError}</Text>
          <TouchableOpacity
            onPress={() => setActionError(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <X size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {!hasArea ? (
        <View style={styles.centerContainer}>
          <View style={styles.warningIconCircle}>
            <MapPin size={36} color={Colors.warning} />
          </View>
          <Text style={styles.warningTitle}>No Area Assigned</Text>
          <Text style={styles.warningDescription}>
            Your barber account is not currently assigned to a neighborhood area. Available client requests are filtered by area.
          </Text>
        </View>
      ) : isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching orders...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={40} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load orders</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrders()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching orders"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
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
        >
          {/* Section 1: My Active Orders */}
          {(filterTab === "ALL" || filterTab === "ACTIVE") && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Active Orders</Text>
                <View style={styles.activeCountBadge}>
                  <Text style={styles.activeCountText}>{activeOrders.length}</Text>
                </View>
              </View>

              {activeOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>
                    {filterTab === "ACTIVE"
                      ? "You do not have any active orders in progress."
                      : "No active orders. Accept a client request below to start."}
                  </Text>
                  {filterTab === "ACTIVE" && (
                    <TouchableOpacity
                      style={styles.switchTabButton}
                      onPress={() => setFilterTab("AVAILABLE")}
                    >
                      <Text style={styles.switchTabButtonText}>Browse Available Orders</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                activeOrders.map(renderActiveCard)
              )}
            </View>
          )}

          {/* Section 2: Available Orders */}
          {(filterTab === "ALL" || filterTab === "AVAILABLE") && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Available Orders</Text>
                <View style={styles.availableCountBadge}>
                  <Text style={styles.availableCountText}>{availableOrders.length}</Text>
                </View>
              </View>

              {availableOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>
                    There are currently no open booking requests in your assigned area.
                  </Text>
                </View>
              ) : (
                availableOrders.map(renderAvailableCard)
              )}
            </View>
          )}
        </ScrollView>
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
            <Text style={styles.modalTitle}>Cancel Accepted Job?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to cancel Job #{orderToCancel?.id}? This action will release the client appointment and mark the job as canceled.
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalKeepButton}
                onPress={() => setOrderToCancel(null)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Keep job"
              >
                <Text style={styles.modalKeepButtonText}>Keep Job</Text>
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
                accessibilityLabel="Confirm cancel job"
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
  tabFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: "#F0F4F8",
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.3,
  },
  activeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: Colors.success,
  },
  activeCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.success,
  },
  availableCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availableCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
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
  activeOrderCard: {
    borderColor: Colors.border,
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
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#ECFDF5",
    borderColor: Colors.success,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
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
  },
  areaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  acceptButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.action,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelJobButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelJobButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.error,
    letterSpacing: 0.3,
  },
  completeButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  emptyCardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  switchTabButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchTabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
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
  warningIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  warningDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 67, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    marginBottom: 24,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalKeepButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalKeepButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  modalConfirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

