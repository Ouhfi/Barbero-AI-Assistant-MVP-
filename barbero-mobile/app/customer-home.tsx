import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { getAreas, Area } from "@/services/areaService";
import { createOrder, getCustomerOrders, Order } from "@/services/orderService";
import { createOrderSchema } from "@/schemas/orderSchemas";
import { getReadableErrorMessage } from "@/services/apiErrors";
import AppIcon, { IconName } from "@/components/ui/AppIcon";

interface ServiceOption {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: IconName;
}

const SERVICES: ServiceOption[] = [
  {
    id: "classic-haircut",
    title: "Classic Haircut",
    description: "Precision scissor & clipper cut with clean taper styling",
    duration: "30 min",
    icon: "scissors",
  },
  {
    id: "beard-grooming",
    title: "Beard Grooming",
    description: "Beard sculpting, razor edge outline & nourishing oil",
    duration: "20 min",
    icon: "user",
  },
  {
    id: "haircut-and-beard",
    title: "Haircut & Beard",
    description: "Full haircut paired with complete beard trim & contouring",
    duration: "45 min",
    icon: "scissors",
  },
  {
    id: "vip-package",
    title: "Full VIP Package",
    description: "Haircut, beard sculpting, hot towel & relaxing facial wash",
    duration: "60 min",
    icon: "check-circle",
  },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState<string>("classic-haircut");
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");

  // Areas and Active Booking state
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [isAreaModalVisible, setIsAreaModalVisible] = useState<boolean>(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState<string>("");
  const [activeBooking, setActiveBooking] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ service?: string; area?: string }>({});

  // Prevent premature redirect before persisted storage hydration completes
  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  // Fetch real areas and customer orders from backend API
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!hasLoadedOnceRef.current) {
      setIsLoadingAreas(true);
    }
    setAreasError(null);
    try {
      const [areasData, ordersData] = await Promise.all([
        getAreas(),
        getCustomerOrders().catch(() => [] as Order[]),
      ]);
      setAreas(areasData);
      hasLoadedOnceRef.current = true;
      // Auto-select first area if none selected and areas are returned
      if (areasData.length > 0) {
        setSelectedAreaId((current) => {
          if (current === null) return areasData[0].id;
          const isValid = areasData.some((a) => a.id === current);
          return isValid ? current : areasData[0].id;
        });
      }
      // Identify latest active or pending booking for the customer
      const active = ordersData.find(
        (o) => o.status === "ACCEPTED" || o.status === "PENDING"
      ) ?? null;
      setActiveBooking(active);
    } catch (err: unknown) {
      setAreasError(getReadableErrorMessage(err));
    } finally {
      setIsLoadingAreas(false);
      setIsRefreshing(false);
    }
  }, []);

  // Sync dashboard data on initial mount and whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (hasHydrated && user && user.role === "CUSTOMER") {
        loadDashboardData();
      }
    }, [hasHydrated, user, loadDashboardData])
  );

  // Filtered areas for modal picker
  const filteredAreas = useMemo(() => {
    if (!areaSearchQuery.trim()) {
      return areas;
    }
    const query = areaSearchQuery.toLowerCase().trim();
    return areas.filter((a) => a.name.toLowerCase().includes(query));
  }, [areas, areaSearchQuery]);

  const selectedService = useMemo(
    () => SERVICES.find((s) => s.id === selectedServiceId) ?? SERVICES[0],
    [selectedServiceId]
  );

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) ?? null,
    [areas, selectedAreaId]
  );

  // Combine selected service title and optional notes into service_details
  const computedServiceDetails = useMemo(() => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      return selectedService.title;
    }
    const combined = `${selectedService.title} - ${trimmedNotes}`;
    return combined.slice(0, 500);
  }, [selectedService, notes]);

  // Handle booking submission
  const handleSubmitBooking = async () => {
    if (isSubmitting) return;

    setSubmitError(null);
    const errors: { service?: string; area?: string } = {};

    if (!selectedServiceId) {
      errors.service = "Please select a grooming service.";
    }

    if (!selectedAreaId) {
      errors.area = "Please select a neighborhood area.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    // Validate using Zod schema
    const validationResult = createOrderSchema.safeParse({
      area_id: selectedAreaId,
      service_details: computedServiceDetails,
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      setSubmitError(issue?.message || "Please check your booking information.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOrder({
        area_id: validationResult.data.area_id,
        service_details: validationResult.data.service_details,
      });

      setCreatedOrder(response.order);
      setActiveBooking(response.order);
      setNotes("");
    } catch (err: unknown) {
      setSubmitError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCreatedOrder(null);
    setSubmitError(null);
    setNotes("");
    setValidationErrors({});
    if (areas.length > 0) {
      setSelectedAreaId(areas[0].id);
    }
  };

  if (!hasHydrated || !user) {
    return null;
  }

  // ===================== SUCCESS VIEW =====================
  if (createdOrder) {
    const orderAreaName =
      areas.find((a) => a.id === createdOrder.area_id)?.name ?? `Area #${createdOrder.area_id}`;
    const orderDate = createdOrder.createdAt
      ? new Date(createdOrder.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now";

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
        >
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <AppIcon name="check-circle" size={48} color={Colors.success} />
            </View>

            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your appointment request has been broadcast to trusted neighborhood barbers.
            </Text>

            <View style={styles.orderSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.summaryValue}>#{createdOrder.id}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{createdOrder.status}</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Neighborhood</Text>
                <Text style={styles.summaryValue}>{orderAreaName}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Details</Text>
                <Text style={styles.summaryValue}>{createdOrder.service_details}</Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>Requested At</Text>
                <Text style={styles.summaryValue}>{orderDate}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => {
                const orderId = createdOrder.id;
                handleResetForm();
                router.push(`/order/${orderId}`);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View Order Details"
            >
              <AppIcon name="calendar-days" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionButtonText}>View Order Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleResetForm}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Book Another Service"
            >
              <Text style={styles.secondaryActionButtonText}>Book Another Service</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ===================== BOOKING FORM VIEW =====================
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDashboardData(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandAccent} />
              <Text style={styles.brandLabel}>BARBERO APPOINTMENTS</Text>
            </View>
            <Text style={styles.welcomeText}>
              Hello, {user.fullName ? user.fullName.split(" ")[0] : "there"}
            </Text>
            <Text style={styles.screenTitle}>Book a Trusted Barber</Text>
            <Text style={styles.screenSubtitle}>
              Select your service, choose your neighborhood area, and submit your request.
            </Text>
          </View>

          {/* Error Banner */}
          {submitError ? (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Active Appointment Spotlight Card */}
          {activeBooking ? (
            <View style={styles.activeAppointmentCard}>
              <View style={styles.activeAppointmentHeader}>
                <View style={styles.activeAppointmentHeaderLeft}>
                  <View
                    style={[
                      styles.activeAppointmentIconWrap,
                      activeBooking.status === "ACCEPTED"
                        ? styles.activeAppointmentIconWrapAccepted
                        : styles.activeAppointmentIconWrapPending,
                    ]}
                  >
                    <AppIcon
                      name={activeBooking.status === "ACCEPTED" ? "check-circle" : "calendar-days"}
                      size={18}
                      color={activeBooking.status === "ACCEPTED" ? Colors.success : Colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.activeAppointmentTag}>
                      {activeBooking.status === "ACCEPTED" ? "Confirmed Appointment" : "Booking Request"}
                    </Text>
                    <Text style={styles.activeAppointmentId}>Booking #{activeBooking.id}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.activeBadge,
                    activeBooking.status === "ACCEPTED"
                      ? styles.activeBadgeAccepted
                      : styles.activeBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      activeBooking.status === "ACCEPTED"
                        ? styles.activeBadgeTextAccepted
                        : styles.activeBadgeTextPending,
                    ]}
                  >
                    {activeBooking.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.activeAppointmentDetails} numberOfLines={2}>
                {activeBooking.service_details}
              </Text>

              <View style={styles.activeAppointmentFooter}>
                <View style={styles.activeAppointmentArea}>
                  <AppIcon name="map-pin" size={13} color={Colors.textSecondary} />
                  <Text style={styles.activeAppointmentAreaText}>
                    {areas.find((a) => a.id === activeBooking.area_id)?.name ?? `Area #${activeBooking.area_id}`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewBookingButton}
                  onPress={() => router.push(`/order/${activeBooking.id}`)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for booking #${activeBooking.id}`}
                >
                  <Text style={styles.viewBookingButtonText}>View Order Details</Text>
                  <AppIcon name="chevron-down" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Section 1: Service Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>1</Text>
              <Text style={styles.sectionTitle}>Select Grooming Service</Text>
            </View>
            {validationErrors.service ? (
              <Text style={styles.validationText}>{validationErrors.service}</Text>
            ) : null}

            <View style={styles.servicesGrid}>
              {SERVICES.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceCard,
                      isSelected ? styles.serviceCardActive : styles.serviceCardInactive,
                    ]}
                    onPress={() => {
                      setSelectedServiceId(service.id);
                      if (validationErrors.service) {
                        setValidationErrors((prev) => ({ ...prev, service: undefined }));
                      }
                      if (submitError) setSubmitError(null);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${service.title}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.serviceHeader}>
                      <View
                        style={[
                          styles.serviceIconContainer,
                          isSelected ? styles.serviceIconActive : styles.serviceIconInactive,
                        ]}
                      >
                        <AppIcon
                          name={service.icon}
                          size={18}
                          color={isSelected ? Colors.primary : Colors.textSecondary}
                        />
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationBadgeText}>{service.duration}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <AppIcon name="check" size={12} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}>
                      {service.title}
                    </Text>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Area Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>2</Text>
              <Text style={styles.sectionTitle}>Select Neighborhood Area</Text>
            </View>
            {validationErrors.area ? (
              <Text style={styles.validationText}>{validationErrors.area}</Text>
            ) : null}

            {isLoadingAreas ? (
              <View style={styles.areaLoadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.areaLoadingText}>Loading neighborhood areas...</Text>
              </View>
            ) : areasError ? (
              <View style={styles.areaErrorContainer}>
                <AppIcon name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.areaErrorText}>{areasError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    hasLoadedOnceRef.current = false;
                    loadDashboardData();
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading areas"
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : areas.length === 0 ? (
              <View style={styles.areaEmptyContainer}>
                <Text style={styles.areaEmptyText}>No service areas currently available.</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    hasLoadedOnceRef.current = false;
                    loadDashboardData();
                  }}
                >
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.areaPickerButton}
                onPress={() => {
                  setAreaSearchQuery("");
                  setIsAreaModalVisible(true);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Choose neighborhood area"
              >
                <View style={styles.areaPickerLeft}>
                  <View style={styles.mapPinContainer}>
                    <AppIcon name="map-pin" size={18} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.areaPickerLabel}>Service Area</Text>
                    <Text style={styles.areaPickerValue}>
                      {selectedArea ? selectedArea.name : "Select your area..."}
                    </Text>
                  </View>
                </View>
                <AppIcon name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section 3: Optional Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>3</Text>
              <Text style={styles.sectionTitle}>Grooming Notes & Preferences</Text>
            </View>
            <Text style={styles.notesHelper}>
              Specify any custom styling requests (e.g. low fade, beard line, scissors only).
            </Text>

            <View style={styles.notesInputWrapper}>
              <TextInput
                style={styles.notesInput}
                placeholder="Add special instructions or preferences (optional)..."
                placeholderTextColor={Colors.disabled}
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  if (submitError) setSubmitError(null);
                }}
                multiline
                numberOfLines={3}
                maxLength={400}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
              <View style={styles.notesFooter}>
                <Text style={styles.charCountText}>
                  {computedServiceDetails.length}/500 characters
                </Text>
              </View>
            </View>
          </View>

          {/* Section 4: Booking Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Appointment Summary</Text>
            <View style={styles.summaryDetailRow}>
              <Text style={styles.summaryDetailLabel}>Selected Service:</Text>
              <Text style={styles.summaryDetailValue}>{selectedService.title}</Text>
            </View>
            <View style={styles.summaryDetailRow}>
              <Text style={styles.summaryDetailLabel}>Neighborhood:</Text>
              <Text style={styles.summaryDetailValue}>
                {selectedArea ? selectedArea.name : "Not selected"}
              </Text>
            </View>
            <View style={[styles.summaryDetailRow, styles.summaryDetailRowLast]}>
              <Text style={styles.summaryDetailLabel}>Estimated Duration:</Text>
              <Text style={styles.summaryDetailValue}>{selectedService.duration}</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || isLoadingAreas) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitBooking}
            disabled={isSubmitting || isLoadingAreas}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Confirm and Book Barber"
          >
            {isSubmitting ? (
              <View style={styles.buttonContentRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submitting Booking...</Text>
              </View>
            ) : (
              <View style={styles.buttonContentRow}>
                <AppIcon name="check" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Confirm & Book Barber</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Area Selection Modal */}
      <Modal
        visible={isAreaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Neighborhood</Text>
                <Text style={styles.modalSubtitle}>Agadir Service Areas</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsAreaModalVisible(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close neighborhood selector"
              >
                <AppIcon name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchWrapper}>
              <AppIcon name="map-pin" size={16} color={Colors.primary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search neighborhood area..."
                placeholderTextColor={Colors.disabled}
                value={areaSearchQuery}
                onChangeText={setAreaSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Area List */}
            <FlatList
              data={filteredAreas}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedAreaId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.areaItemRow, isSelected && styles.areaItemRowSelected]}
                    onPress={() => {
                      setSelectedAreaId(item.id);
                      setIsAreaModalVisible(false);
                      if (validationErrors.area) {
                        setValidationErrors((prev) => ({ ...prev, area: undefined }));
                      }
                      if (submitError) setSubmitError(null);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Select area ${item.name}`}
                  >
                    <View style={styles.areaItemLeft}>
                      <View
                        style={[
                          styles.areaItemDot,
                          isSelected ? styles.areaItemDotActive : styles.areaItemDotInactive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.areaItemText,
                          isSelected && styles.areaItemTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <AppIcon name="check" size={18} color={Colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  <Text style={styles.modalEmptyText}>
                    No neighborhoods match "{areaSearchQuery}".
                  </Text>
                </View>
              }
            />
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  brandAccent: {
    width: 14,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.primary,
    textTransform: "uppercase",
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  validationText: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 8,
    fontWeight: "600",
  },
  servicesGrid: {
    gap: 10,
  },
  serviceCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    backgroundColor: Colors.card,
  },
  serviceCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#F0F4F8",
  },
  serviceCardInactive: {
    borderColor: Colors.border,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  serviceIconActive: {
    backgroundColor: "#E2E8F0",
  },
  serviceIconInactive: {
    backgroundColor: Colors.secondary,
  },
  durationBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  checkCircle: {
    marginLeft: "auto",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 3,
  },
  serviceTitleActive: {
    color: Colors.primary,
  },
  serviceDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  areaPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  areaPickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapPinContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  areaPickerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  areaPickerValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  areaLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    gap: 10,
  },
  areaLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  areaErrorContainer: {
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: "#FEF2F2",
    gap: 6,
  },
  areaErrorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
  },
  areaEmptyContainer: {
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    gap: 8,
  },
  areaEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notesHelper: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  notesInputWrapper: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
  },
  notesInput: {
    fontSize: 14,
    color: Colors.text,
    minHeight: 64,
  },
  notesFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  charCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryDetailRowLast: {
    borderBottomWidth: 0,
  },
  summaryDetailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  submitButton: {
    height: 52,
    backgroundColor: Colors.action,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.action,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitButtonDisabled: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  // Success Card Styles
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: "center",
    marginVertical: 12,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  orderSummaryBox: {
    width: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
    letterSpacing: 0.5,
  },
  primaryActionButton: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryActionButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 67, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    maxHeight: "80%",
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  areaItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  areaItemRowSelected: {
    backgroundColor: "#F0F4F8",
  },
  areaItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  areaItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  areaItemDotActive: {
    backgroundColor: Colors.primary,
  },
  areaItemDotInactive: {
    backgroundColor: Colors.border,
  },
  areaItemText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  areaItemTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  modalEmptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Active Appointment Spotlight Styles
  activeAppointmentCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeAppointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activeAppointmentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeAppointmentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  activeAppointmentIconWrapAccepted: {
    backgroundColor: "#ECFDF5",
  },
  activeAppointmentIconWrapPending: {
    backgroundColor: "#FFFBEB",
  },
  activeAppointmentTag: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeAppointmentId: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeBadgeAccepted: {
    backgroundColor: "#ECFDF5",
    borderColor: Colors.success,
  },
  activeBadgePending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeBadgeTextAccepted: {
    color: Colors.success,
  },
  activeBadgeTextPending: {
    color: "#B45309",
  },
  activeAppointmentDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  activeAppointmentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  activeAppointmentArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeAppointmentAreaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBookingButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
