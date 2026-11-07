import { z } from "zod";

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sku: z.string().trim().min(1).optional(),
    cost: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    description: z.string().trim().nullable().optional(),
    stock: z.number().int().min(0).optional(),
    categoryId: z.uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => v[k as keyof typeof v] !== undefined), {
    message: "At least one field is required",
  });
