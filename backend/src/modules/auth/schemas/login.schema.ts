import { z } from 'zod';

export const loginSchema = z.object({
  // Trim BEFORE email validation — a trailing `.transform()` runs after
  // validation, so `z.email().transform(v => v.trim())` would still
  // reject `" admin@x.com "`. The pipe lets input be trimmed and
  // lowercased, then validated as an email, then returned normalized.
  email: z
    .string()
    .trim()
    .pipe(z.email().transform((v) => v.toLowerCase()))
    .meta({ description: 'Email address (trimmed, lowercased)' }),
  password: z.string().min(1, 'Password is required'),
});
