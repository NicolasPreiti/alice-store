import { z } from "zod";

// Mirrors the backend loginSchema: trim + lowercase BEFORE email validation
// (a trailing .transform() runs after validation and rejects padded input).
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email().transform((v) => v.toLowerCase())),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
