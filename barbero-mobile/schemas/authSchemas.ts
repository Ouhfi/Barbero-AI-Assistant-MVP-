import { z } from "zod";

/**
 * Zod validation schema for user login.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Zod validation schema for customer registration.
 * Note: confirmPassword is strictly client-side validation and never sent to the backend.
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please provide a valid email address"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Zod validation schema for barber registration.
 * Extends the customer schema with area_id (required area selection) and
 * invite_key (shared secret validated server-side).
 * confirmPassword is strictly client-side and never sent to the backend.
 */
export const barberRegisterSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please provide a valid email address"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),

    area_id: z
      .number({ message: "Please select your service area" })
      .int()
      .positive("Please select your service area"),

    invite_key: z
      .string()
      .min(1, "Invite key is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type BarberRegisterFormValues = z.infer<typeof barberRegisterSchema>;
