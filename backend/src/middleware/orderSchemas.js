import { z } from "zod";

export const createOrderSchema = z.object({
area_id: z.coerce.number().int().positive(),

service_details: z
.string()
.trim()
.min(1, "Service details are required")
.max(500, "Service details cannot exceed 500 characters"),
});
