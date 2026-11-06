import { createZodDto } from "nestjs-zod";
import { updateUserSchema } from "../schemas/update-user.schema";

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
