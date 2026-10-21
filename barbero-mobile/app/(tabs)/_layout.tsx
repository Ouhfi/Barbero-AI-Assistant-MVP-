
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, CalendarDays, ClipboardList, UserRound } from "lucide-react-native";
import { TabBarColors, TabBarMetrics } from "@/constants/tabBarConfig";
import { useAuthStore } from "@/stores/authStore";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Wait for Zustand authentication hydration before making navigation decisions
  if (!hasHydrated) {
    return null;
  }

  // Redirect unauthenticated users to the existing login route
  if (!user || !token || typeof token !== "string" || token.trim().length === 0) {
    return <Redirect href="/login" />;
  }

  const isBarber = user.role === "BARBER";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TabBarColors.active,
        tabBarInactiveTintColor: TabBarColors.inactive,
        tabBarStyle: {
          backgroundColor: TabBarColors.background,
          borderTopColor: TabBarColors.border,
          borderTopWidth: 1,
          height: TabBarMetrics.baseHeight + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: TabBarMetrics.labelFontSize,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      {/* 1. Home Tab: Shared by both Customer and Barber */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home Tab",
          tabBarIcon: ({ color, focused, size }) => (
            <House
              size={size ?? TabBarMetrics.iconSize}
              color={color}
              strokeWidth={focused ? TabBarMetrics.activeStrokeWidth : TabBarMetrics.strokeWidth}
            />
          ),
        }}
      />

      {/* 2. Bookings Tab: CUSTOMER role only (Hidden for Barbers) */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarAccessibilityLabel: "Bookings Tab",
          href: isBarber ? null : "/(tabs)/bookings",
          tabBarIcon: ({ color, focused, size }) => (
            <CalendarDays
              size={size ?? TabBarMetrics.iconSize}
              color={color}
              strokeWidth={focused ? TabBarMetrics.activeStrokeWidth : TabBarMetrics.strokeWidth}
            />
          ),
        }}
      />

      {/* 3. Orders Tab: BARBER role only (Hidden for Customers) */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarAccessibilityLabel: "Orders Tab",
          href: isBarber ? "/(tabs)/orders" : null,
          tabBarIcon: ({ color, focused, size }) => (
            <ClipboardList
              size={size ?? TabBarMetrics.iconSize}
              color={color}
              strokeWidth={focused ? TabBarMetrics.activeStrokeWidth : TabBarMetrics.strokeWidth}
            />
          ),
        }}
      />

      {/* 4. Profile Tab: Shared by both Customer and Barber */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Profile Tab",
          tabBarIcon: ({ color, focused, size }) => (
            <UserRound
              size={size ?? TabBarMetrics.iconSize}
              color={color}
              strokeWidth={focused ? TabBarMetrics.activeStrokeWidth : TabBarMetrics.strokeWidth}
            />
          ),
        }}
      />
    </Tabs>
  );
}
