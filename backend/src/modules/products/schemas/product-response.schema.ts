import { z } from "zod";

export const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  // Money is sent as strings ("12.34") so the frontend never deals with
  // float imprecision. The service maps Prisma.Decimal -> toFixed(2).
  cost: z.string(),
  price: z.string(),
  description: z.string().nullable(),
  stock: z.number(),
  categoryId: z.string(),
  category: z.object({
    id: z.string(),
    name: z.string(),
  }),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
