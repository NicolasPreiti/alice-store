import { z } from "zod";

// Money arrives from the API as strings ("12.34") — never parse to float
// for display. Forms submit numbers (backend rounds to 2dp).
export const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  cost: z.string(),
  price: z.string(),
  description: z.string().nullable(),
  stock: z.number(),
  categoryId: z.string(),
  category: z.object({ id: z.string(), name: z.string() }),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const moneyField = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : Number(v)))
  .refine((v) => Number.isFinite(v), { message: "Enter a number" })
  .refine((v) => v >= 0, { message: "Must be 0 or more" });

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  cost: moneyField,
  price: moneyField,
  description: z.string().trim().nullable().optional(),
  stock: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, { message: "Stock must be 0 or more" }),
  categoryId: z.uuid("Select a category"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
