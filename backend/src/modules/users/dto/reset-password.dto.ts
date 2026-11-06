import { createZodDto } from "nestjs-zod";
import { resetPasswordSchema } from "../schemas/reset-password.schema";

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
