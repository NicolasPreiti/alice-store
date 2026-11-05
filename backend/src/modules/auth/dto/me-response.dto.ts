import { createZodDto } from 'nestjs-zod';
import { meResponseSchema } from '../schemas/auth-response.schema';

/**
 * `GET /api/auth/me` response. Same leak guard as `LoginResponseDto`.
 * `createdAt` is serialized to ISO string by the service before
 * the serializer runs.
 */
export class MeResponseDto extends createZodDto(meResponseSchema) {}
