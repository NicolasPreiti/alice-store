import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * The single error shape every route returns (see HttpExceptionFilter).
 * Documented once here and referenced by @ApiAuthErrors() so controllers
 * never repeat it.
 */
const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
});

export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}
