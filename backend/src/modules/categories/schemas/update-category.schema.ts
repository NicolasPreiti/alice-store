import { z } from "zod";

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
