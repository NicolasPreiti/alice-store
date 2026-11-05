import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '../schemas/login.schema';

/**
 * Request DTO for `POST /api/auth/login`.
 *
 * The class wrapper is what makes validation (global ZodValidationPipe)
 * and OpenAPI (cleanupOpenApiDoc) infer the schema — zod stays the
 * source of truth, the class is just its runtime handle.
 */
export class CreateLoginDto extends createZodDto(loginSchema) {}
