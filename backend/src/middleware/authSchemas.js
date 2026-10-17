import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(1, "Full name cannot be empty")
    .max(100, "Full name is too long"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(254, "Email is too long"),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password is too long"),
});

export const loginSchema = z.object({
email: z
.string()
.trim()
.email("Please provide a valid email address")
.max(254, "Email is too long"),

password: z
.string()
.min(1, "Password is required")
.max(72, "Password is too long"),
});
