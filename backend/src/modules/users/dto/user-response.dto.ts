import { createZodDto } from "nestjs-zod";
import { userResponseSchema } from "../schemas/user-response.schema";

/**
 * The only user shape the API returns. `passwordHash` is never selected —
 * the serializer strips extras, but services must use an explicit `select`
 * so the hash can never reach the DTO.
 */
export class UserResponseDto extends createZodDto(userResponseSchema) {}
