import { z } from 'zod';

/**
 * Documented response shapes for the auth endpoints.
 *
 * These are transform-free on purpose: @nestjs/swagger converts
 * `standardSchema` in `output` mode, which cannot represent zod transforms.
 * They must stay in sync with what AuthService actually returns
 * (explicit Prisma `select` — never `passwordHash`).
 */
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

export const meResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  isActive: z.boolean(),
  createdAt: z.string(),
});
