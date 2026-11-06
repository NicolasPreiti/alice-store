import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
