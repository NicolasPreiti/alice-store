import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  cost: z.number().min(0, "Cost must be 0 or more"),
  price: z.number().min(0, "Price must be 0 or more"),
  description: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stock must be 0 or more").default(0),
  categoryId: z.uuid(),
  isActive: z.boolean().default(true),
});
