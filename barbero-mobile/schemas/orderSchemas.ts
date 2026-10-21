import { z } from "zod";

/**
 * Zod validation schema for customer booking/order creation.
 * Matches backend validation rules:
 * - area_id: positive integer
 * - service_details: trimmed non-empty string, max 500 characters
 */
export const createOrderSchema = z.object({
  area_id: z
    .number()
    .int("Area ID must be an integer")
    .positive("Please select a neighborhood area"),

  service_details: z
    .string()
    .trim()
    .min(1, "Service details cannot be empty")
    .max(500, "Service details cannot exceed 500 characters"),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
