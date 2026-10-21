import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import CustomerHomeScreen from "../customer-home";
import BarberHomeScreen from "../barber-home";

/**
 * Tab Home Entry Point:
 * Reuses the existing CustomerHomeScreen or BarberHomeScreen
 * according to the authenticated user's role.
 */
export default function TabHomeScreen() {
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

  if (user.role === "BARBER") {
    return <BarberHomeScreen />;
  }

  return <CustomerHomeScreen />;
}
