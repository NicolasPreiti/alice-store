import { createZodDto } from 'nestjs-zod';
import { loginResponseSchema } from '../schemas/auth-response.schema';

/**
 * `POST /api/auth/login` response. `@ZodSerializerDto` validates the
 * service return value against this schema, so `passwordHash` can never
 * leak even if the Prisma `select` changes.
 */
export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
